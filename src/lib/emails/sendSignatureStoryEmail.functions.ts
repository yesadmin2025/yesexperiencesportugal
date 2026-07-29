/**
 * sendSignatureStoryEmail — public server fn triggered from Guest Details
 * email blur. Silent (returns { ok: true } even when suppressed), idempotent
 * via a stable key derived from email + tourId + dateExact so repeated
 * blurs of the same field deduplicate at the email_send_log layer.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const chapterSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(600),
});

const snapshotSchema = z.object({
  title: z.string().min(1).max(200),
  dateLabel: z.string().max(80).nullable(),
  guests: z.number().int().min(1).max(24),
  pickupLabel: z.string().min(1).max(200),
  chapters: z.array(chapterSchema).max(6),
  inclusions: z.array(z.string().min(1).max(200)).max(10),
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

export const sendSignatureStoryEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
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
      return { ok: true } as const;
    } catch (err) {
      console.error("[sendSignatureStoryEmail] failed", err);
      // Never surface provider errors to guest — the reserve flow must
      // continue regardless of email dispatch health.
      return { ok: true } as const;
    }
  });
