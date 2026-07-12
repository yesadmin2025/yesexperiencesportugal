// Bókun-authoritative live-quote token.
//
// Distinct from `quoteToken.ts` (which is Studio's v:1 payload). This v:2
// payload binds one signed quote to an exact Bókun (product, option, rate,
// availability, date, startTime) + guest mix + resolved category-level unit
// prices, so the checkout server can revalidate before Stripe.
//
// HMAC-SHA256 signed with STUDIO_QUOTE_SIGNING_SECRET (same secret is fine —
// version prefix keeps payload shapes disjoint).

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
async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}
async function hmacVerify(secret: string, data: string, sig: Uint8Array): Promise<boolean> {
  const key = await importKey(secret);
  const sigBuf = sig.buffer.slice(sig.byteOffset, sig.byteOffset + sig.byteLength) as ArrayBuffer;
  return crypto.subtle.verify("HMAC", key, sigBuf, enc.encode(data));
}

export type BokunQuoteSource = "bokun-live" | "bokun-with-approved-override" | "pending-review";

export interface BokunQuoteLine {
  uiBand: "adult" | "youth" | "child" | "infant" | "other";
  bokunCategoryId: string;
  label: string;
  ageRange?: string;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  countsTowardCapacity: boolean;
}

export interface BokunQuoteAddOn {
  id: string;
  label: string;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  source: "bokun" | "external-server";
}

export interface BokunQuoteTokenPayload {
  v: 2;
  source: BokunQuoteSource;
  currency: "EUR";
  internalProductKey: string;
  bokunProductId: string;
  bokunOptionId?: string;
  bokunRateId?: string;
  availabilityId?: string;
  date: string;
  startTime?: string;
  guestMix: { adults: number; youths: number; children: number; infants: number };
  pricingPartySize: number;
  totalParticipants: number;
  lines: BokunQuoteLine[];
  addOnLines: BokunQuoteAddOn[];
  finalTotalEur: number;
  revision: string;
  iat: number;
  exp: number;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export async function signBokunQuoteToken(
  payload: BokunQuoteTokenPayload,
  secret: string,
): Promise<string> {
  const body = b64urlEncode(enc.encode(canonicalJson(payload)));
  const sig = await hmacSign(secret, body);
  return `bq2.${body}.${b64urlEncode(sig)}`;
}

export async function verifyBokunQuoteToken(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<BokunQuoteTokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "bq2") {
    throw new Error("bokun quote token malformed");
  }
  const [, body, sig] = parts;
  const ok = await hmacVerify(secret, body, b64urlDecode(sig));
  if (!ok) throw new Error("bokun quote token signature invalid");
  const payload = JSON.parse(dec.decode(b64urlDecode(body))) as BokunQuoteTokenPayload;
  if (payload.v !== 2) throw new Error("bokun quote token version unsupported");
  if (payload.exp < now) throw new Error("bokun quote token expired");
  return payload;
}
