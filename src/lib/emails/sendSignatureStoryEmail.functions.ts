/**
 * sendSignatureStoryEmail — public server fn triggered from Guest Details
 * email blur. Silent (returns { ok: true } even when suppressed), idempotent
 * via a stable key derived from email + tourId + dateExact so repeated
 * blurs of the same field deduplicate at the email_send_log layer.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Free-text coming from the browser is rendered inside a branded email, so it
 * must never be able to carry links, markup or injected headers. We strip URLs,
 * angle brackets and control characters before anything reaches a template.
 */
const URL_LIKE =
  /((https?:\/\/|www\.)\S+|\b[\w.-]+\.(com|net|org|io|co|pt|es|ru|xyz|info|biz|link|top|cn)\b\S*)/gi;

function sanitizeText(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(URL_LIKE, "")
    .replace(/[<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const safeText = (max: number) =>
  z
    .string()
    .max(max)
    .transform(sanitizeText)
    .refine((v) => v.length > 0, "Required");

const chapterSchema = z.object({
  title: safeText(200),
  body: safeText(600),
});

const snapshotSchema = z.object({
  title: safeText(200),
  dateLabel: z
    .string()
    .max(80)
    .nullable()
    .transform((v) => (v === null ? null : sanitizeText(v) || null)),
  guests: z.number().int().min(1).max(24),
  pickupLabel: safeText(200),
  chapters: z.array(chapterSchema).max(6),
  inclusions: z.array(safeText(200)).max(10),
});

const inputSchema = z.object({
  email: z.string().email().max(200),
  tourId: z.string().max(120).nullable().optional(),
  dateIso: z.string().max(20).nullable().optional(),
  /**
   * Stable hash of the full journey composition (tour + ordered stops +
   * add-ons + date + pickup + adults + minor ages). Included in the
   * idempotency key so:
   *   - repeated submissions of the SAME journey never re-send;
   *   - a genuinely refined journey (different revision) sends once more.
   * Optional for backward compatibility with older call sites.
   */
  journeyRevision: z.string().min(1).max(80).nullable().optional(),
  snapshot: snapshotSchema,
});

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(): string {
  try {
    const h = getRequest().headers;
    const raw =
      h.get("cf-connecting-ip") ??
      h.get("x-real-ip") ??
      (h.get("x-forwarded-for") ?? "").split(",")[0] ??
      "";
    return raw.trim();
  } catch {
    return "";
  }
}

export const sendSignatureStoryEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const [{ sendTransactionalInternal }, { TEAM_NOTIFICATION_RECIPIENTS }, { rateLimit }] =
        await Promise.all([
          import("@/lib/email/send-internal.server"),
          import("@/lib/email/team-recipients"),
          import("@/lib/rateLimit.server"),
        ]);

      // Abuse cap: this endpoint is intentionally unauthenticated (it fires on
      // email blur during Studio), so cap sends per caller network and per
      // recipient address. Exceeding the cap is silent — the guest flow must
      // never break, and an abuser gets no signal.
      const ip = clientIp();
      const recipientKey = await sha1Hex(`recipient:${data.email.toLowerCase()}`);
      const limits = [
        ip
          ? rateLimit({
              sessionId: await sha1Hex(`ip:${ip}`),
              bucket: "signature-story-ip",
              limit: 5,
              windowSec: 3600,
            })
          : Promise.resolve({ ok: true }),
        rateLimit({
          sessionId: recipientKey,
          bucket: "signature-story-recipient",
          limit: 3,
          windowSec: 86_400,
        }),
      ];
      const results = await Promise.all(limits);
      if (results.some((r) => !r.ok)) {
        console.warn("[sendSignatureStoryEmail] rate limited");
        return { ok: true } as const;
      }
      // Revision-scoped idempotency: repeated submits of the same journey
      // dedupe at the email_send_log layer; a refined journey (new revision)
      // sends a fresh copy.
      const revision = data.journeyRevision ?? data.dateIso ?? "";
      const key = await sha1Hex(`${data.email.toLowerCase()}|${data.tourId ?? ""}|${revision}`);
      await sendTransactionalInternal({
        templateName: "signature-story",
        recipientEmail: data.email,
        idempotencyKey: `signature-story-${key}`,
        templateData: data.snapshot as unknown as Record<string, unknown>,
      });

      // Team copy — the YES team must see every designed day, even when the
      // traveller never books. Same revision key so refining sends once more
      // and re-typing the email never spams the inbox. Non-fatal.
      try {
        const s = data.snapshot;
        const message = [
          `Journey: ${s.title}`,
          `Date: ${s.dateLabel ?? "not chosen yet"}`,
          `Guests: ${s.guests}`,
          `Pickup: ${s.pickupLabel}`,
          data.tourId ? `Base tour: ${data.tourId}` : null,
          "",
          "Chapters:",
          ...s.chapters.map((c, i) => `${i + 1}. ${c.title} — ${c.body}`),
          "",
          s.inclusions.length ? `Included: ${s.inclusions.join(", ")}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n");
        await Promise.all(
          TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
            sendTransactionalInternal({
              templateName: "internal-lead",
              recipientEmail: recipient,
              idempotencyKey: `studio-design-${key}-${recipient}`,
              templateData: {
                firstName: "Studio",
                lastName: "design (not booked yet)",
                email: data.email,
                message,
                source: "studio-v3-design",
                submittedAt: new Date().toISOString(),
              },
            }),
          ),
        );
      } catch (teamErr) {
        console.error("[sendSignatureStoryEmail] team copy failed", teamErr);
      }

      return { ok: true } as const;
    } catch (err) {
      console.error("[sendSignatureStoryEmail] failed", err);
      // Never surface provider errors to guest — the reserve flow must
      // continue regardless of email dispatch health.
      return { ok: true } as const;
    }
  });

