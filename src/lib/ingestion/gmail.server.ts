/**
 * Server-only Gmail reader for booking ingestion.
 *
 * All calls go through the Lovable connector gateway: no OAuth tokens or client
 * secrets exist in this codebase, and nothing here is reachable from the
 * browser. When the Google Mail connection is not linked yet, every function
 * reports `configured: false` so the admin surface can show a setup state
 * instead of failing.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail";

export type GmailMessage = {
  id: string;
  threadId: string | null;
  subject: string;
  from: string;
  body: string;
  receivedAt: string | null;
  mailbox: "INBOX" | "SENT";
};

function credentials(): { lovableKey: string; connectionKey: string } | null {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !connectionKey) return null;
  return { lovableKey, connectionKey };
}

export function gmailConfigured(): boolean {
  return credentials() !== null;
}

async function gmailFetch(path: string): Promise<unknown> {
  const creds = credentials();
  if (!creds) throw new Error("gmail_not_configured");
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${creds.lovableKey}`,
      "X-Connection-Api-Key": creds.connectionKey,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`gmail_request_failed [${response.status}]: ${detail.slice(0, 500)}`);
  }
  return response.json();
}

type RawPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: RawPart[];
};

function decodeBase64Url(value: string): string {
  const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(normalised, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<td[^>]*>/gi, "\t")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/** Prefers text/plain; falls back to a flattened HTML part. */
export function extractBody(payload: RawPart | undefined): string {
  if (!payload) return "";
  const plain: string[] = [];
  const html: string[] = [];
  const walk = (part: RawPart) => {
    const data = part.body?.data;
    if (data) {
      if (part.mimeType === "text/plain") plain.push(decodeBase64Url(data));
      else if (part.mimeType === "text/html") html.push(decodeBase64Url(data));
    }
    (part.parts ?? []).forEach(walk);
  };
  walk(payload);
  if (plain.join("\n").trim()) return plain.join("\n");
  return htmlToText(html.join("\n"));
}

type ListResponse = { messages?: Array<{ id: string; threadId?: string }>; nextPageToken?: string };

export async function listMessageIds(query: string, max = 50): Promise<Array<{ id: string; threadId: string | null }>> {
  const out: Array<{ id: string; threadId: string | null }> = [];
  let pageToken: string | undefined;
  while (out.length < max) {
    const search = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(100, max - out.length)),
    });
    if (pageToken) search.set("pageToken", pageToken);
    const page = (await gmailFetch(`/gmail/v1/users/me/messages?${search.toString()}`)) as ListResponse;
    for (const message of page.messages ?? []) {
      out.push({ id: message.id, threadId: message.threadId ?? null });
    }
    if (!page.nextPageToken || (page.messages ?? []).length === 0) break;
    pageToken = page.nextPageToken;
  }
  return out;
}

export async function getMessage(id: string, mailbox: "INBOX" | "SENT"): Promise<GmailMessage> {
  const raw = (await gmailFetch(`/gmail/v1/users/me/messages/${id}?format=full`)) as {
    id: string;
    threadId?: string;
    internalDate?: string;
    payload?: RawPart & { headers?: Array<{ name: string; value: string }> };
  };
  const headers = raw.payload?.headers ?? [];
  const header = (name: string) =>
    headers.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value ?? "";
  return {
    id: raw.id,
    threadId: raw.threadId ?? null,
    subject: header("Subject"),
    from: header("From"),
    body: extractBody(raw.payload),
    receivedAt: raw.internalDate ? new Date(Number(raw.internalDate)).toISOString() : null,
    mailbox,
  };
}

/** Gmail search strings for the two mailboxes we watch. */
export function buildQueries(days: number): Array<{ query: string; mailbox: "INBOX" | "SENT" }> {
  const window = `newer_than:${Math.max(1, Math.min(365, days))}d`;
  return [
    { query: `in:inbox from:bokun.io ${window}`, mailbox: "INBOX" },
    {
      query: `in:sent ${window} (subject:("Booking Confirmed" OR "Pre-Confirmation" OR "Confirmed & Fully Paid") OR "Confirmed & Fully Paid" OR "Pre-Confirmation Voucher")`,
      mailbox: "SENT",
    },
  ];
}
