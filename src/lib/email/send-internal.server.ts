/**
 * Internal transactional email dispatch — server-only.
 *
 * For server-to-server triggers (server functions, webhooks) that do not have
 * an end-user JWT and therefore cannot call /lovable/email/transactional/send.
 *
 * Mirrors the same pipeline: suppression check, unsubscribe token, render,
 * enqueue into pgmq `transactional_emails`. The shared queue dispatcher
 * (process-email-queue) handles the actual send, retries, and rate limits.
 */
import * as React from "react";
import { render } from "react-email";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { TEAM_NOTIFICATION_RECIPIENTS } from "@/lib/email/team-recipients";

const SITE_NAME = "yesexperiences";
const SENDER_DOMAIN = "notify.yesexperiences.pt";
const FROM_DOMAIN = "notify.yesexperiences.pt";
/**
 * The only address the sandbox Resend sender is allowed to deliver to while
 * the branded domain is unverified. Undeliverable guest mail is mirrored here
 * so nothing is silently lost.
 */
const SANDBOX_SAFE_RECIPIENT = "yesexperiences@gmail.com";
/**
 * Public brand address. Mail is *sent* through the technical sender domain
 * (notify.yesexperiences.pt) but every reply must land in the inbox guests
 * already know: info@yesexperiencesportugal.com.
 */
const REPLY_TO_ADDRESS = "info@yesexperiencesportugal.com";

async function mirrorToSafeRecipient(args: {
  supabase: typeof supabaseAdmin;
  templateName: string;
  intendedRecipient: string;
  subject: string;
  html: string;
  plainText: string;
  idemKey: string;
}): Promise<void> {
  const { supabase, templateName, intendedRecipient, subject, html, plainText, idemKey } = args;
  const mirrorId = crypto.randomUUID();
  const forwardHref = `mailto:${encodeURIComponent(intendedRecipient)}?subject=${encodeURIComponent(subject)}`;
  const notice =
    `<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#2E2E2E;background:#F4EEE2;padding:14px 16px;margin-bottom:16px;border-left:3px solid #C9A96A;">` +
    `<strong>Action needed — forward this to the guest.</strong><br />` +
    `Intended recipient: <strong>${intendedRecipient}</strong><br />` +
    `Email type: ${templateName}<br />` +
    `The branded sender domain is not verified yet, so this copy came to the team instead.` +
    `<br /><a href="${forwardHref}" style="display:inline-block;margin-top:10px;padding:10px 16px;background:#295B61;color:#FAF8F3;text-decoration:none;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Write to ${intendedRecipient}</a>` +
    `</div>`;
  try {
    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": process.env.RESEND_API_KEY!,
      },
      body: JSON.stringify({
        from: "YES Experiences <onboarding@resend.dev>",
        to: [SANDBOX_SAFE_RECIPIENT],
        reply_to: intendedRecipient,
        subject: `[Forward to ${intendedRecipient}] ${subject}`,
        html: `${notice}${html}`,
        text: `Action needed — forward to the guest.\nIntended recipient: ${intendedRecipient}\nEmail type: ${templateName}\n\n${plainText}`,
        headers: { "X-Entity-Ref-ID": `mirror-${idemKey}` },
      }),
    });
    await supabase.from("email_send_log").insert({
      message_id: mirrorId,
      template_name: `${templateName}-mirror`,
      recipient_email: SANDBOX_SAFE_RECIPIENT,
      status: resp.ok ? "sent" : "failed",
      error_message: resp.ok ? null : `mirror resend ${resp.status}`,
    });
  } catch (e: unknown) {
    console.error("[email/internal] mirror failed", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Raw Resend connector call. Used both by the live fallback path and by the
 * deferred-mail flusher.
 */
export interface EmailAttachment {
  filename: string;
  /** base64-encoded file content. */
  content: string;
  contentType?: string;
}

async function resendSend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idemKey: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": process.env.RESEND_API_KEY!,
      },
      body: JSON.stringify({
        from: "YES Experiences <onboarding@resend.dev>",
        to: [args.to],
        reply_to: REPLY_TO_ADDRESS,
        subject: args.subject,
        html: args.html,
        text: args.text,
        ...(args.attachments && args.attachments.length > 0
          ? {
              attachments: args.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
        headers: { "X-Entity-Ref-ID": args.idemKey },
      }),
    });
    return { ok: resp.ok, status: resp.status, body: resp.ok ? "" : await resp.text() };
  } catch (e: unknown) {
    return { ok: false, status: 0, body: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Retry policy for parked mail. Only *transient* provider failures are worth
 * retrying; a malformed address or a rejected payload will fail identically
 * forever, so it is marked permanent and surfaced for human action instead.
 */
export const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360, 720] as const;
export const MAX_RETRY_ATTEMPTS = RETRY_BACKOFF_MINUTES.length;
/** After this long a parked message is abandoned, whatever the failure kind. */
export const RETRY_TTL_HOURS = 48;

export type FailureKind = "transient" | "permanent";

/** Classify a provider rejection so only recoverable failures are retried. */
export function classifyFailure(status: number, body: string): FailureKind {
  const text = (body || "").toLowerCase();
  // Network error / timeout — always worth another go.
  if (status === 0) return "transient";
  if (status === 429 || status >= 500) return "transient";
  if (status === 403 && (text.includes("verify") || text.includes("domain"))) return "transient";
  if (status >= 400 && status < 500) {
    // Domain still verifying is reported as a 4xx by the provider.
    if (text.includes("not verified") || text.includes("domain is not") || text.includes("verify a domain")) {
      return "transient";
    }
    return "permanent";
  }
  return "transient";
}

function nextAttemptAt(attempts: number): string {
  const minutes = RETRY_BACKOFF_MINUTES[Math.min(attempts, MAX_RETRY_ATTEMPTS - 1)] ?? 720;
  // Jitter ±20% so parallel workers never stampede the provider together.
  const jittered = minutes * (0.8 + Math.random() * 0.4);
  return new Date(Date.now() + jittered * 60_000).toISOString();
}

/**
 * Park an undeliverable guest email so it is sent automatically as soon as
 * the sender domain works again. Keyed by idempotency key so a retry of the
 * same trigger never parks (or later sends) a duplicate.
 */
async function deferSend(args: {
  supabase: typeof supabaseAdmin;
  messageId: string;
  templateName: string;
  recipientEmail: string;
  subject: string;
  html: string;
  plainText: string;
  idemKey: string;
  lastError: string;
  failureKind?: FailureKind;
}): Promise<void> {
  const kind = args.failureKind ?? "transient";
  const { error } = await args.supabase.from("email_deferred_sends").upsert(
    {
      message_id: args.messageId,
      template_name: args.templateName,
      recipient_email: args.recipientEmail,
      subject: args.subject,
      html: args.html,
      body_text: args.plainText,
      idempotency_key: args.idemKey,
      last_error: args.lastError.slice(0, 300),
      failure_kind: kind,
      state: kind === "permanent" ? "failed" : "pending",
      next_attempt_at: nextAttemptAt(0),
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );
  if (error) console.error("[email/internal] defer failed", { error: error.message });
}

let flushInFlight = false;

/**
 * Retry parked guest emails that are due. Called opportunistically after any
 * successful send (a success proves the provider is accepting mail again) and
 * driven every few minutes by the scheduler through the internal flush route.
 */
export async function flushDeferredSends(
  limit = 10,
  options: { force?: boolean } = {},
): Promise<{ attempted: number; sent: number; abandoned: number }> {
  if (flushInFlight) return { attempted: 0, sent: 0, abandoned: 0 };
  flushInFlight = true;
  const supabase = supabaseAdmin;
  let sent = 0;
  let attempted = 0;
  let abandoned = 0;
  try {
    let query = supabase
      .from("email_deferred_sends")
      .select(
        "id, message_id, template_name, recipient_email, subject, html, body_text, idempotency_key, attempts, created_at",
      )
      .is("delivered_at", null)
      .eq("state", "pending")
      .lt("attempts", MAX_RETRY_ATTEMPTS);
    if (!options.force) query = query.lte("next_attempt_at", new Date().toISOString());
    const { data: rows } = await query.order("created_at", { ascending: true }).limit(limit);

    for (const row of rows ?? []) {
      const ageHours = (Date.now() - new Date(row.created_at).getTime()) / 3_600_000;
      // A forced (operator-initiated) replay overrides the TTL: the whole point
      // is recovering mail that was parked while the sender was unverified.
      if (!options.force && ageHours > RETRY_TTL_HOURS) {
        abandoned += 1;
        await supabase
          .from("email_deferred_sends")
          .update({ state: "abandoned", last_attempt_at: new Date().toISOString() })
          .eq("id", row.id);
        continue;
      }

      attempted += 1;
      // Re-send through the verified branded queue (notify.yesexperiences.pt) —
      // the same path live sends use. The old direct-Resend flush was stuck in
      // sandbox mode and rejected every guest address.
      const { error: enqErr } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: row.message_id,
          to: row.recipient_email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          reply_to: REPLY_TO_ADDRESS,
          subject: row.subject,
          html: row.html,
          text: row.body_text,
          attachments: [],
          purpose: "transactional",
          label: row.template_name,
          // Fresh key per replay: the provider permanently poisons keys whose
          // first attempt failed, so reusing the original key gets a 409.
          // Dedupe is still guaranteed by email_deferred_sends.delivered_at.
          idempotency_key: `${row.idempotency_key}-r${row.attempts + 1}`,
          queued_at: new Date().toISOString(),
        },
      });
      const now = new Date().toISOString();
      if (!enqErr) {
        sent += 1;
        // Handed off to the queue dispatcher, which logs the final
        // sent/failed outcome against this message_id.
        await supabase
          .from("email_deferred_sends")
          .update({
            delivered_at: now,
            last_attempt_at: now,
            attempts: row.attempts + 1,
            state: "delivered",
          })
          .eq("id", row.id);
        await supabase.from("email_send_log").insert({
          message_id: row.message_id,
          template_name: row.template_name,
          recipient_email: row.recipient_email,
          status: "pending",
        });
      } else {
        const attempts = row.attempts + 1;
        const exhausted = attempts >= MAX_RETRY_ATTEMPTS;
        await supabase
          .from("email_deferred_sends")
          .update({
            attempts,
            last_attempt_at: now,
            last_error: `enqueue_failed: ${enqErr.message}`.slice(0, 300),
            failure_kind: "transient",
            state: exhausted ? "abandoned" : "pending",
            next_attempt_at: nextAttemptAt(attempts),
          })
          .eq("id", row.id);
        if (exhausted) {
          abandoned += 1;
          continue;
        }
        // Queue unavailable — stop early, the rest will fail the same way.
        break;
      }
    }
  } catch (e: unknown) {
    console.error("[email/internal] flush failed", {
      error: e instanceof Error ? e.message : String(e),
    });
  } finally {
    flushInFlight = false;
  }
  return { attempted, sent, abandoned };
}



function redact(email: string): string {
  const [l, d] = email.split("@");
  if (!l || !d) return "***";
  return `${l[0]}***@${d}`;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SendInternalArgs {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
  /** Files attached to the outgoing message (e.g. the itinerary PDF). */
  attachments?: EmailAttachment[];
  /**
   * Pre-rendered content. Used by the admin template studio to test-send
   * templates that live outside the transactional registry (auth emails).
   * When present the registry lookup and render step are skipped.
   */
  rendered?: { subject: string; html: string; text: string };
}

export async function sendTransactionalInternal(
  args: SendInternalArgs,
): Promise<{ ok: boolean; reason?: string }> {
  const { templateName, recipientEmail, templateData = {}, idempotencyKey, attachments } = args;
  const supabase = supabaseAdmin;
  const messageId = crypto.randomUUID();
  const idemKey = idempotencyKey || messageId;

  const template = TEMPLATES[templateName];
  if (!template && !args.rendered) {
    console.error("[email/internal] template not found", { templateName });
    return { ok: false, reason: "template_not_found" };
  }

  const effectiveRecipient = template?.to || recipientEmail;
  if (!effectiveRecipient) return { ok: false, reason: "no_recipient" };

  const normalizedEmail = effectiveRecipient.toLowerCase();

  // Suppression check (fail-closed).
  const { data: suppressed, error: supErr } = await supabase
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (supErr) {
    console.error("[email/internal] suppression check failed", { error: supErr });
    return { ok: false, reason: "suppression_check_failed" };
  }
  if (suppressed) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: "suppressed",
    });
    return { ok: false, reason: "email_suppressed" };
  }

  // Unsubscribe token (one per address).
  let unsubscribeToken: string | undefined;
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token;
  } else if (!existing) {
    const t = generateToken();
    await supabase
      .from("email_unsubscribe_tokens")
      .upsert(
        { token: t, email: normalizedEmail },
        { onConflict: "email", ignoreDuplicates: true },
      );
    const { data: stored } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalizedEmail)
      .maybeSingle();
    unsubscribeToken = stored?.token;
  } else {
    return { ok: false, reason: "email_suppressed" };
  }

  // Render template (or use pre-rendered content supplied by the caller).
  let html: string;
  let plainText: string;
  let subject: string;
  if (args.rendered) {
    html = args.rendered.html;
    plainText = args.rendered.text;
    subject = args.rendered.subject;
  } else {
    const element = React.createElement(
      template!.component,
      templateData as Record<string, unknown>,
    );
    html = await render(element);
    plainText = await render(element, { plainText: true });
    subject =
      typeof template!.subject === "function"
        ? template!.subject(templateData as Record<string, unknown>)
        : template!.subject;
  }


  // ─── TEMPORARY RESEND FALLBACK ───────────────────────────────────────────
  // While notify.yesexperiences.pt DNS is not verified, send directly
  // through the Resend connector gateway using their onboarding sender domain.
  // Disable by unsetting EMAIL_USE_RESEND_FALLBACK once notify. is verified.
  const useResendFallback =
    process.env.EMAIL_USE_RESEND_FALLBACK === "1" &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.LOVABLE_API_KEY;
  if (useResendFallback) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: "pending",
    });
    const res = await resendSend({
      to: effectiveRecipient,
      subject,
      html,
      text: plainText,
      idemKey,
      attachments,
    });
    if (!res.ok) {
      console.error("[email/internal] resend fallback failed", {
        status: res.status,
        recipient: redact(effectiveRecipient),
        body: res.body.slice(0, 500),
      });
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: "failed",
        error_message: `resend ${res.status}: ${res.body.slice(0, 300)}`,
      });

      const isTeamAddress = (TEAM_NOTIFICATION_RECIPIENTS as readonly string[])
        .map((r) => r.toLowerCase())
        .includes(normalizedEmail);

      // Automatic fallback #1 — park the guest's message so it is delivered
      // for real the moment the provider/domain starts accepting mail again.
      if (!isTeamAddress) {
        await deferSend({
          supabase,
          messageId,
          templateName,
          recipientEmail: effectiveRecipient,
          subject,
          html,
          plainText,
          idemKey,
          lastError: `resend ${res.status}: ${res.body}`,
          failureKind: classifyFailure(res.status, res.body),

        });
      }

      // Automatic fallback #2 — mirror the undeliverable message to the safe
      // inbox so the team can forward it immediately, whatever the reason for
      // the rejection (sandbox restriction, unverified domain, provider 4xx).
      if (res.status !== 429 && normalizedEmail !== SANDBOX_SAFE_RECIPIENT.toLowerCase()) {
        await mirrorToSafeRecipient({
          supabase,
          templateName,
          intendedRecipient: effectiveRecipient,
          subject,
          html,
          plainText,
          idemKey,
        });
      }
      return { ok: false, reason: "resend_failed" };
    }

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: "sent",
    });
    // A successful send proves the provider is accepting mail — drain any
    // guest confirmations that were parked while it was refusing.
    await flushDeferredSends();
    return { ok: true };
  }
  // ─── /RESEND FALLBACK ────────────────────────────────────────────────────

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: "pending",
  });

  const { error: enqErr } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      reply_to: REPLY_TO_ADDRESS,
      subject,
      html,
      text: plainText,
      attachments: (attachments ?? []).map((a) => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType ?? "application/octet-stream",
      })),
      purpose: "transactional",
      label: templateName,
      idempotency_key: idemKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });
  if (enqErr) {
    console.error("[email/internal] enqueue failed", {
      error: enqErr,
      recipient: redact(effectiveRecipient),
    });
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    // Branded queue unavailable — try the direct provider immediately, and
    // park the message if that fails too, so the guest still gets it later.
    if (process.env.RESEND_API_KEY && process.env.LOVABLE_API_KEY) {
      const res = await resendSend({
        to: effectiveRecipient,
        subject,
        html,
        text: plainText,
        idemKey,
      });
      if (res.ok) {
        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: "sent",
        });
        return { ok: true };
      }
      await deferSend({
        supabase,
        messageId,
        templateName,
        recipientEmail: effectiveRecipient,
        subject,
        html,
        plainText,
        idemKey,
        lastError: `enqueue_failed; resend ${res.status}: ${res.body}`,
      });
    }
    return { ok: false, reason: "enqueue_failed" };

  }

  return { ok: true };
}
