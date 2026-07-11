// HMAC-SHA256 signed quote token for Studio V3.
//
// Payload is a compact JSON blob binding the normalised snapshot hash + total
// to a revision + expiry. Verification enforces expiry and returns the parsed
// payload; the caller must additionally re-resolve pricing and compare.

import { canonicalJson } from "./quoteSnapshotSchema.ts";

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
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
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
  return crypto.subtle.verify("HMAC", key, sig, enc.encode(data));
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

export interface QuoteTokenPayload {
  v: 1;
  revision: string;
  snapshotHash: string;
  commercialProductKey: string;
  guests: number;
  unitEur: number;
  totalEur: number;
  currency: "EUR";
  routeStatus: "validated" | "pending-review" | "unavailable";
  availabilityStatus: "validated" | "pending-review" | "unavailable";
  iat: number; // epoch seconds
  exp: number; // epoch seconds
}

export async function signQuoteToken(
  payload: QuoteTokenPayload,
  secret: string,
): Promise<string> {
  const body = b64urlEncode(enc.encode(canonicalJson(payload)));
  const sig = await hmacSign(secret, body);
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifyQuoteToken(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<QuoteTokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("quote token malformed");
  const [body, sig] = parts;
  const ok = await hmacVerify(secret, body, b64urlDecode(sig));
  if (!ok) throw new Error("quote token signature invalid");
  const payload = JSON.parse(dec.decode(b64urlDecode(body))) as QuoteTokenPayload;
  if (payload.v !== 1) throw new Error("quote token version unsupported");
  if (payload.exp < now) throw new Error("quote token expired");
  return payload;
}
