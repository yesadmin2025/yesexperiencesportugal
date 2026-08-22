import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface EmailLogRow {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface SuppressionRow {
  email: string;
  reason: string;
  created_at: string;
}

export interface DeferredRow {
  id: string;
  template_name: string;
  recipient_email: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

export interface EmailAdminOverview {
  since: string;
  templates: string[];
  logs: EmailLogRow[];
  suppressions: SuppressionRow[];
  deferred: DeferredRow[];
  senderDomain: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
}

/** Latest row per message_id — one email = one entry. */
function dedupeByMessageId(rows: EmailLogRow[]): EmailLogRow[] {
  const seen = new Map<string, EmailLogRow>();
  for (const row of rows) {
    const key = row.message_id ?? `${row.template_name}:${row.recipient_email}:${row.created_at}`;
    const prev = seen.get(key);
    if (!prev || new Date(row.created_at) > new Date(prev.created_at)) seen.set(key, row);
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export const getEmailAdminOverview = createServerFn({ method: "GET" })
  .inputValidator((data: { days?: number } | undefined) => ({
    days: Math.min(Math.max(Number(data?.days ?? 7), 1), 90),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }): Promise<EmailAdminOverview> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

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
      senderDomain: "notify.yesexperiences.pt",
    };
  });

export const retryDeferredEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ attempted: number; sent: number }> => {
    await assertAdmin(context);
    const { flushDeferredSends } = await import("@/lib/email/send-internal.server");
    return flushDeferredSends(25);
  });
