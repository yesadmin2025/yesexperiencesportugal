// Signed token for the launch-spec BookingQuote contract (v:3).
// HMAC-SHA256 over canonical JSON of the payload. Distinct from the legacy
// bq2 tokens produced by bokunQuoteToken.ts so payload shapes never collide.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false,
    ["sign", "verify"],
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export interface BookingQuoteTokenPayload {
  v: 3;
  quoteId: string;
  flow: "signature" | "tailor" | "studio";
  commercialProductKey: string;
  commercialMappingId: string;
  bokunProductId: string;
  bokunOptionId?: string;
  bokunRateId?: string;
  availabilityId: string;
  date: string;
  startTime: string;
  pricingRevision: string;
  itineraryRevision?: string;
  finalTotalEur: number;
  iat: number;
  exp: number;
}

export async function signBookingQuoteToken(
  payload: BookingQuoteTokenPayload,
  secret: string,
): Promise<string> {
  const body = b64urlEncode(enc.encode(canonicalJson(payload)));
  const key = await importKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `bq3.${body}.${b64urlEncode(sig)}`;
}

export async function verifyBookingQuoteToken(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<BookingQuoteTokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "bq3") {
    throw new Error("booking quote token malformed");
  }
  const [, body, sig] = parts;
  const key = await importKey(secret);
  const sigBytes = b64urlDecode(sig);
  const sigBuf = sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer;
  const ok = await crypto.subtle.verify("HMAC", key, sigBuf, enc.encode(body));
  if (!ok) throw new Error("booking quote token signature invalid");
  const payload = JSON.parse(dec.decode(b64urlDecode(body))) as BookingQuoteTokenPayload;
  if (payload.v !== 3) throw new Error("booking quote token version unsupported");
  if (payload.exp < now) throw new Error("booking quote token expired");
  return payload;
}
