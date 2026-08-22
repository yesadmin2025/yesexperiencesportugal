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
  buildSnapshotEmailPreview,
  normalizeSnapshotItinerary,
} from "@/lib/booking-snapshot-contract";
import {
  dedupeByMessageId,
  EMAIL_SENDER_DOMAIN,
  type BookingOption,
  type DeferredRow,
  type EmailAccess,
  type EmailAdminOverview,
  type EmailLogRow,
  type EmailRole,
  type LinkCheck,
  type RoleMember,
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

// ─── Preview data: sample values or a real booking ──────────────────────────

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Pull a real booking (plus its frozen snapshot) and shape it into the same
 * variables the transactional templates receive at send time, so the preview
 * is literally what the guest would have received.
 */
async function buildBookingData(ref: string): Promise<{
  data: Record<string, unknown>;
  bookingRef: string;
} | null> {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, stripe_session_id, customer_name, customer_email, guests, preferred_date, notes, amount_total, currency, booking_details, metadata",
    )
    .or(`stripe_session_id.eq.${ref},id.eq.${ref}`)
    .maybeSingle();

  const sessionId = booking?.stripe_session_id ?? ref;
  const { data: snapRow } = await supabaseAdmin
    .from("booking_snapshots")
    .select("payload")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (!booking && !snapRow) return null;

  const snap = (snapRow?.payload ?? {}) as Record<string, unknown>;
  const preview = buildSnapshotEmailPreview(snap);
  const encoded = encodeURIComponent(sessionId);
  const amountCents = Number(booking?.amount_total ?? 0);

  const data: Record<string, unknown> = {
    customerName: (snap.customerName as string) ?? booking?.customer_name ?? null,
    recipient: booking?.customer_email ?? null,
    firstName:
      String((snap.customerName as string) ?? booking?.customer_name ?? "").split(" ")[0] || null,
    tourTitle: (snap.tourTitle as string) ?? (snap.experienceName as string) ?? null,
    experienceName: (snap.experienceName as string) ?? (snap.tourTitle as string) ?? null,
    bookingType: (snap.flow as string) ?? null,
    dateExact: (snap.dateExact as string) ?? booking?.preferred_date ?? null,
    startTime: (snap.startTime as string) ?? null,
    durationLabel: (snap.durationLabel as string) ?? null,
    pickup: (snap.pickup as string) ?? null,
    guests: booking?.guests ?? null,
    amountFormatted: amountCents ? `€${(amountCents / 100).toFixed(0)}` : null,
    bookingRef: sessionId,
    itinerary: normalizeSnapshotItinerary(snap.itinerary),
    includedItems: preview.includedItems,
    addOnLabels: preview.addOnLabels,
    removedOptions: preview.removedOptions,
    customerNotes: preview.customerNotes,
    itineraryUrl: `${SITE_URL}/itinerary?session_id=${encoded}`,
    pdfUrl: `${SITE_URL}/api/public/booking-itinerary?session_id=${encoded}`,
    manageUrl: `${SITE_URL}/booking-confirmed?session_id=${encoded}`,
    bookingStatusUrl: `${SITE_URL}/booking-confirmed?session_id=${encoded}`,
    receiptUrl: `${SITE_URL}/booking-confirmed?session_id=${encoded}`,
    experienceUrl: `${SITE_URL}/experiences`,
    exploreUrl: `${SITE_URL}/experiences`,
  };

  return { data, bookingRef: sessionId };
}

/** Most recent bookings that can back a real-data preview. */
export async function listBookingOptions(): Promise<BookingOption[]> {
  const { data } = await supabaseAdmin
    .from("bookings")
    .select("stripe_session_id, customer_name, preferred_date, created_at")
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);
  return (data ?? []).map((b) => ({
    ref: b.stripe_session_id as string,
    label: `${b.customer_name ?? "Guest"} · ${b.preferred_date ?? String(b.created_at).slice(0, 10)}`,
    createdAt: String(b.created_at),
  }));
}

async function resolvePreviewData(
  entry: TemplateEntry,
  source: "sample" | "booking",
  bookingRef?: string | null,
): Promise<{ data: Record<string, unknown>; missing: string[]; usedRef: string | null }> {
  const base = { ...(entry.previewData ?? {}) } as Record<string, unknown>;
  if (source !== "booking" || !bookingRef) {
    return { data: base, missing: [], usedRef: null };
  }
  const real = await buildBookingData(bookingRef);
  if (!real) {
    return { data: base, missing: ["booking not found — showing sample values"], usedRef: null };
  }
  const merged: Record<string, unknown> = { ...base };
  const missing: string[] = [];
  for (const key of Object.keys(base)) {
    if (key in real.data) {
      merged[key] = real.data[key];
      if (isEmptyValue(real.data[key])) missing.push(key);
    }
  }
  return { data: merged, missing, usedRef: real.bookingRef };
}

export async function renderTemplate(
  name: string,
  options: { source?: "sample" | "booking"; bookingRef?: string | null } = {},
): Promise<TemplatePreview> {
  const entry = entryFor(name);
  if (!entry) throw new Error("Unknown template");
  const source = options.source === "booking" ? "booking" : "sample";
  const { data, missing, usedRef } = await resolvePreviewData(entry, source, options.bookingRef);
  const html = await render(React.createElement(entry.component, data));
  return {
    name,
    displayName: entry.displayName || name,
    subject: resolveSubject(entry, data),
    html,
    dataSource: usedRef ? "booking" : "sample",
    bookingRef: usedRef,
    missingFields: missing,
  };
}

// ─── Link validation ────────────────────────────────────────────────────────

const LINK_TIMEOUT_MS = 5000;

function extractLinks(html: string): Array<{ url: string; label: string }> {
  const out: Array<{ url: string; label: string }> = [];
  const re = /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = (m[1] ?? "").trim();
    const label = (m[2] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (!out.some((l) => l.url === url && l.label === label)) {
      out.push({ url, label: label || url });
    }
  }
  return out.slice(0, 40);
}

async function probe(url: string): Promise<{ status: number | null; finalUrl: string | null; timedOut: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_TIMEOUT_MS);
  try {
    let resp = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (resp.status === 405 || resp.status === 501) {
      resp = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    return { status: resp.status, finalUrl: resp.url || url, timedOut: false };
  } catch (e: unknown) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { status: null, finalUrl: null, timedOut: aborted };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check every CTA in a rendered template before an operator sends it. Runs on
 * the server so there is no CORS wall, with a hard timeout per link.
 */
export async function validateTemplateLinks(
  name: string,
  options: { source?: "sample" | "booking"; bookingRef?: string | null } = {},
): Promise<LinkCheck[]> {
  const preview = await renderTemplate(name, options);
  const links = extractLinks(preview.html);

  const results = await Promise.all(
    links.map(async ({ url, label }): Promise<LinkCheck> => {
      if (!url || url === "#" || url.startsWith("#")) {
        return { label, url, kind: "anchor", status: null, state: "skipped" };
      }
      if (url.startsWith("mailto:") || url.startsWith("tel:")) {
        return { label, url, kind: "mailto", status: null, state: "ok" };
      }
      if (!/^https?:\/\//i.test(url) || /\{\{|\}\}|undefined|null$/i.test(url)) {
        return {
          label,
          url,
          kind: "invalid",
          status: null,
          state: "invalid",
          note: "Not an absolute https URL — a mail client cannot open this.",
        };
      }
      const internal = url.startsWith(SITE_URL);
      const { status, finalUrl, timedOut } = await probe(url);
      if (timedOut) {
        return { label, url, kind: internal ? "internal" : "external", status: null, state: "timeout" };
      }
      if (status === null) {
        return {
          label,
          url,
          kind: internal ? "internal" : "external",
          status: null,
          state: "broken",
          note: "Request failed",
        };
      }
      const state: LinkCheck["state"] =
        status >= 400 ? "broken" : finalUrl && finalUrl !== url ? "redirect" : "ok";
      return { label, url, kind: internal ? "internal" : "external", status, state, finalUrl };
    }),
  );

  return results;
}

export async function sendTestEmail(
  name: string,
  recipient: string,
  options: { source?: "sample" | "booking"; bookingRef?: string | null } = {},
): Promise<TestSendResult> {
  const entry = entryFor(name);
  if (!entry) return { ok: false, reason: "unknown_template", recipient };
  const source = options.source === "booking" ? "booking" : "sample";
  const { data } = await resolvePreviewData(entry, source, options.bookingRef);
  const stamp = Date.now();

  // Registry templates with a fixed `to` would ignore the tester's address,
  // so render here and send explicitly to the requested recipient. Auth
  // templates live outside the registry and take the same path.
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

// ─── Role-based access ──────────────────────────────────────────────────────

const NO_ACCESS: EmailAccess = {
  role: "email_viewer",
  canView: false,
  canSendTests: false,
  canRetryQueue: false,
  canManageRoles: false,
  maskRecipients: true,
};

/**
 * Server-side capability resolution. The UI hides what a role cannot do, but
 * every server function calls this — the browser never decides access.
 */
export async function resolveEmailAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<EmailAccess> {
  const check = async (role: EmailRole): Promise<boolean> => {
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    return !error && !!data;
  };
  if (await check("admin")) {
    return {
      role: "admin",
      canView: true,
      canSendTests: true,
      canRetryQueue: true,
      canManageRoles: true,
      maskRecipients: false,
    };
  }
  if (await check("email_operator")) {
    return {
      role: "email_operator",
      canView: true,
      canSendTests: true,
      canRetryQueue: true,
      canManageRoles: false,
      maskRecipients: false,
    };
  }
  if (await check("email_viewer")) {
    return {
      role: "email_viewer",
      canView: true,
      canSendTests: false,
      canRetryQueue: false,
      canManageRoles: false,
      maskRecipients: true,
    };
  }
  return NO_ACCESS;
}

/** Throws unless the caller holds the capability. */
export async function requireEmailCapability(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  capability: "view" | "send" | "retry" | "roles",
): Promise<EmailAccess> {
  const access = await resolveEmailAccess(supabase, userId);
  const allowed =
    capability === "view"
      ? access.canView
      : capability === "send"
        ? access.canSendTests
        : capability === "retry"
          ? access.canRetryQueue
          : access.canManageRoles;
  if (!allowed) throw new Error("Forbidden");
  return access;
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

export async function listEmailRoleMembers(): Promise<RoleMember[]> {
  const { data: rows } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "email_operator", "email_viewer"]);
  if (!rows?.length) return [];
  const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  return rows.map((r) => ({
    userId: r.user_id as string,
    email: emailById.get(r.user_id as string) ?? "(unknown)",
    role: r.role as EmailRole,
  }));
}

/** Grant or revoke an email console role by the member's email address. */
export async function setEmailRole(
  email: string,
  role: "email_operator" | "email_viewer",
  grant: boolean,
): Promise<{ ok: boolean; reason?: string }> {
  const normalized = email.trim().toLowerCase();
  const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const user = (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === normalized);
  if (!user) return { ok: false, reason: "no_such_user" };

  if (grant) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) return { ok: false, reason: error.message };
  } else {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .eq("role", role);
    if (error) return { ok: false, reason: error.message };
  }
  return { ok: true };
}

// ─── Overview ───────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local[0]}***@${domain}`;
}

export async function loadOverview(days: number, access: EmailAccess): Promise<EmailAdminOverview> {
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
      .select(
        "id, template_name, recipient_email, attempts, last_error, created_at, state, failure_kind, next_attempt_at, last_attempt_at",
      )
      .is("delivered_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const mask = access.maskRecipients;
  const logs = dedupeByMessageId((logsRes.data ?? []) as EmailLogRow[]).map((l) =>
    mask ? { ...l, recipient_email: maskEmail(l.recipient_email) } : l,
  );

  return {
    since,
    templates: Array.from(new Set(logs.map((l) => l.template_name))).sort(),
    logs,
    suppressions: ((suppRes.data ?? []) as SuppressionRow[]).map((s) =>
      mask ? { ...s, email: maskEmail(s.email) } : s,
    ),
    deferred: ((defRes.data ?? []) as DeferredRow[]).map((d) =>
      mask ? { ...d, recipient_email: maskEmail(d.recipient_email) } : d,
    ),
    senderDomain: EMAIL_SENDER_DOMAIN,
    access,
  };
}

