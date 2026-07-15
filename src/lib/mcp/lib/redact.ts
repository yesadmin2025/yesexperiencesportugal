/**
 * Pure redaction helpers for the owner-only diagnostic MCP.
 * No I/O, no imports beyond std types. Safe to import anywhere.
 */

export function maskUid(uid: string | null | undefined): string {
  if (!uid) return "unknown";
  const stripped = uid.replace(/-/g, "");
  if (stripped.length < 10) return "***";
  return `${stripped.slice(0, 5)}…${stripped.slice(-5)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "unknown";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "unknown";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-3)}`;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const HEX24_RE = /\b[a-f0-9]{24,}\b/gi;

export function scrubText(text: string, maxLen = 140): string {
  if (!text) return "";
  const clipped = text.length > maxLen ? text.slice(0, maxLen) : text;
  return clipped
    .replace(EMAIL_RE, "[email]")
    .replace(PHONE_RE, "[phone]")
    .replace(HEX24_RE, "[token]");
}

export function safeError(err: unknown): { code: string; message: string } {
  const raw = err instanceof Error ? err.message : String(err ?? "unknown");
  return { code: "tool_error", message: scrubText(raw, 200) };
}
