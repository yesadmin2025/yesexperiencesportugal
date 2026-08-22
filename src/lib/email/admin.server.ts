import * as React from "react";
import { render } from "react-email";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TEMPLATES, type TemplateEntry } from "@/lib/email-templates/registry";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { sendTransactionalInternal } from "@/lib/email/send-internal.server";
import {
  dedupeByMessageId,
  EMAIL_SENDER_DOMAIN,
  type DeferredRow,
  type EmailAdminOverview,
  type EmailLogRow,
  type SuppressionRow,
  type TemplatePreview,
  type TemplateSummary,
  type TestSendResult,
} from "@/lib/email/admin-types";

const SITE_URL = "https://yesexperiencesportugal.com";
const SAMPLE_LINK = `${SITE_URL}/auth`;

/** Auth templates live outside the transactional registry but are still ours to brand. */
const AUTH_TEMPLATES: Record<string, TemplateEntry> = {
  "auth:signup": {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: SignupEmail as any,
    subject: "Confirm your email · YES Experiences",
    displayName: "Auth · Confirm your email",
    previewData: {
      siteName: "YES Experiences",
      siteUrl: SITE_URL,
      recipient: "guest@example.com",
      confirmationUrl: SAMPLE_LINK,
    },
  },
  "auth:magiclink": {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: MagicLinkEmail as any,
    subject: "Your sign-in link · YES Experiences",
    displayName: "Auth · Magic link",
    previewData: { siteName: "YES Experiences", confirmationUrl: SAMPLE_LINK },
  },
  "auth:recovery": {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: RecoveryEmail as any,
    subject: "Reset your password · YES Experiences",
    displayName: "Auth · Password reset",
    previewData: { siteName: "YES Experiences", confirmationUrl: SAMPLE_LINK },
  },
  "auth:invite": {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: InviteEmail as any,
    subject: "You've been invited · YES Experiences",
    displayName: "Auth · Invitation",
    previewData: { siteName: "YES Experiences", siteUrl: SITE_URL, confirmationUrl: SAMPLE_LINK },
  },
  "auth:email_change": {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: EmailChangeEmail as any,
    subject: "Confirm your new email · YES Experiences",
    displayName: "Auth · Email change",
    previewData: {
      siteName: "YES Experiences",
      oldEmail: "old@example.com",
      email: "new@example.com",
      newEmail: "new@example.com",
      confirmationUrl: SAMPLE_LINK,
    },
  },
  "auth:reauthentication": {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: ReauthenticationEmail as any,
    subject: "Your verification code · YES Experiences",
    displayName: "Auth · Verification code",
    previewData: { token: "482913" },
  },
};

const INTERNAL_PREFIXES = ["internal-", "stripe-", "viator-", "legacy-"];

function groupFor(name: string): TemplateSummary["group"] {
  if (name.startsWith("auth:")) return "auth";
  if (INTERNAL_PREFIXES.some((p) => name.startsWith(p))) return "internal";
  return "guest";
}

function entryFor(name: string): TemplateEntry | undefined {
  return name.startsWith("auth:") ? AUTH_TEMPLATES[name] : TEMPLATES[name];
}

export function listTemplateSummaries(): TemplateSummary[] {
  const names = [...Object.keys(TEMPLATES), ...Object.keys(AUTH_TEMPLATES)];
  return names
    .map((name) => {
      const entry = entryFor(name)!;
      return {
        name,
        displayName: entry.displayName || name,
        previewable: !!entry.previewData,
        group: groupFor(name),
      };
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.displayName.localeCompare(b.displayName));
}

function resolveSubject(entry: TemplateEntry, data: Record<string, unknown>): string {
  return typeof entry.subject === "function" ? entry.subject(data) : entry.subject;
}

export async function renderTemplate(name: string): Promise<TemplatePreview> {
  const entry = entryFor(name);
  if (!entry) throw new Error("Unknown template");
  const data = entry.previewData ?? {};
  const html = await render(React.createElement(entry.component, data));
  return {
    name,
    displayName: entry.displayName || name,
    subject: resolveSubject(entry, data),
    html,
  };
}

export async function sendTestEmail(name: string, recipient: string): Promise<TestSendResult> {
  const entry = entryFor(name);
  if (!entry) return { ok: false, reason: "unknown_template", recipient };
  const data = { ...(entry.previewData ?? {}) };
  const stamp = Date.now();

  if (name.startsWith("auth:")) {
    const element = React.createElement(entry.component, data);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const res = await sendTransactionalInternal({
      templateName: name,
      recipientEmail: recipient,
      idempotencyKey: `test-${name}-${stamp}`,
      rendered: { subject: `[TEST] ${resolveSubject(entry, data)}`, html, text },
    });
    return { ...res, recipient };
  }

  // Registry templates with a fixed `to` would ignore the tester's address,
  // so render them here and send explicitly to the requested recipient.
  const element = React.createElement(entry.component, data);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const res = await sendTransactionalInternal({
    templateName: name,
    recipientEmail: recipient,
    idempotencyKey: `test-${name}-${stamp}`,
    rendered: { subject: `[TEST] ${resolveSubject(entry, data)}`, html, text },
  });
  return { ...res, recipient };
}

export async function assertAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
}

export async function loadOverview(days: number): Promise<EmailAdminOverview> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [logsRes, suppRes, defRes] = await Promise.all([
    supabaseAdmin
      .from("email_send_log")
      .select("message_id, template_name, recipient_email, status, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabaseAdmin
      .from("suppressed_emails")
      .select("email, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("email_deferred_sends")
      .select("id, template_name, recipient_email, attempts, last_error, created_at")
      .is("delivered_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const logs = dedupeByMessageId((logsRes.data ?? []) as EmailLogRow[]);

  return {
    since,
    templates: Array.from(new Set(logs.map((l) => l.template_name))).sort(),
    logs,
    suppressions: (suppRes.data ?? []) as SuppressionRow[],
    deferred: (defRes.data ?? []) as DeferredRow[],
    senderDomain: EMAIL_SENDER_DOMAIN,
  };
}
