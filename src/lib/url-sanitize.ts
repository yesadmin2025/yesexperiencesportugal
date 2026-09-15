/**
 * URL sanitizer for logging (P0 privacy).
 *
 * We never persist a raw href or raw query string: they carry Stripe session
 * ids, resume/preview tokens, emails and ad click ids. Only the pathname plus
 * an allowlisted, value-redacted query object is stored.
 */

/** Query keys whose presence is useful; values kept only when safe. */
const ALLOWED_QUERY_KEYS = new Set([
  "tour",
  "flow",
  "phase",
  "step",
  "region",
  "locale",
  "lang",
  "variant",
  "heroVariant",
  "hero",
  "page",
]);

/** Keys that must be recorded as present-but-redacted, never with a value. */
const REDACT_KEYS = [
  "session_id",
  "sessionid",
  "token",
  "resume",
  "resume_token",
  "secret",
  "client_secret",
  "key",
  "apikey",
  "api_key",
  "password",
  "email",
  "e_mail",
  "phone",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "code",
  "access_token",
  "refresh_token",
];

const SAFE_VALUE = /^[A-Za-z0-9_.:-]{0,64}$/;

export interface SanitizedLocation {
  path: string;
  query: Record<string, string>;
}

export function sanitizeLocation(href: string | null | undefined): SanitizedLocation {
  if (!href) return { path: "", query: {} };
  let path = "";
  let params: URLSearchParams;
  try {
    const u = new URL(href, "https://placeholder.invalid");
    path = u.pathname;
    params = u.searchParams;
  } catch {
    const [p] = String(href).split("?");
    return { path: p ?? "", query: {} };
  }

  const query: Record<string, string> = {};
  for (const [rawKey, value] of params.entries()) {
    const key = rawKey.toLowerCase();
    if (REDACT_KEYS.includes(key)) {
      query[key] = "[redacted]";
      continue;
    }
    if (!ALLOWED_QUERY_KEYS.has(rawKey) && !ALLOWED_QUERY_KEYS.has(key)) {
      query[key] = "[redacted]";
      continue;
    }
    query[key] = SAFE_VALUE.test(value) ? value : "[redacted]";
  }
  return { path, query };
}

/** Path-only string safe to store in a text column. */
export function sanitizedPath(href: string | null | undefined): string {
  return sanitizeLocation(href).path;
}
