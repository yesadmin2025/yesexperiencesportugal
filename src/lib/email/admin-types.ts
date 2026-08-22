/** Client-safe shapes shared between the email admin server code and the UI. */

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

export interface TemplateSummary {
  name: string;
  displayName: string;
  /** Templates without previewData cannot be rendered or test-sent. */
  previewable: boolean;
  group: "guest" | "internal" | "auth";
}

export interface TemplatePreview {
  name: string;
  displayName: string;
  subject: string;
  html: string;
}

export interface TestSendResult {
  ok: boolean;
  reason?: string;
  recipient: string;
}

/** Latest row per message_id — one email should read as one entry. */
export function dedupeByMessageId(rows: EmailLogRow[]): EmailLogRow[] {
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

export const EMAIL_SENDER_DOMAIN = "notify.yesexperiences.pt";
