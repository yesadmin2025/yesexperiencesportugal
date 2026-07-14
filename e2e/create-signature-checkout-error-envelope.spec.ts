/**
 * Envelope contract test for `create-signature-checkout`.
 *
 * Hits the deployed edge function with inputs designed to trigger the
 * validation / method rejection paths, then asserts the response body
 * conforms to the standardised shape parseCheckoutError expects:
 *
 *   { error: <string>, code: <string>, message: <string>,
 *     retryable: <boolean>, requestId: <string> }
 *
 * If a future edit drops one of those fields, Studio checkout would
 * fall back to generic copy — this spec catches that at CI time.
 */
import { expect, test } from "@playwright/test";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://kqygnqetygcvkaauwbji.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeWducWV0eWdjdmthYXV3YmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzc1NzUsImV4cCI6MjA5Mjg1MzU3NX0.1ilgY0HVPZUntxjNke4Ii3BXOSu1DJ_AlhE2zaHR_Tg";

const ENDPOINTS = [
  "create-signature-checkout",
  "create-builder-checkout",
] as const;

type Envelope = {
  error?: unknown;
  code?: unknown;
  message?: unknown;
  retryable?: unknown;
  requestId?: unknown;
};

async function post(endpoint: string, body: unknown, method: "POST" | "GET" = "POST") {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Envelope = {};
  try {
    json = text ? (JSON.parse(text) as Envelope) : {};
  } catch {
    /* leave empty — assertion below flags it */
  }
  return { status: res.status, json, raw: text };
}

function assertEnvelope(json: Envelope, ctx: string) {
  expect(typeof json.code === "string" && (json.code as string).length > 0, `${ctx}: envelope.code`).toBe(true);
  expect(typeof json.message === "string" && (json.message as string).length > 0, `${ctx}: envelope.message`).toBe(
    true,
  );
  expect(typeof json.retryable === "boolean", `${ctx}: envelope.retryable`).toBe(true);
  expect(typeof json.requestId === "string" && (json.requestId as string).length > 0, `${ctx}: envelope.requestId`).toBe(
    true,
  );
  // Legacy `error` string is still expected for one release.
  expect(typeof json.error === "string" || (json.error && typeof json.error === "object"), `${ctx}: envelope.error legacy field`).toBeTruthy();
}

for (const endpoint of ENDPOINTS) {
  test(`${endpoint} — validation failure returns standardised envelope`, async () => {
    const { status, json } = await post(endpoint, { bogus: true });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    assertEnvelope(json, `${endpoint} validation`);
    expect(json.retryable).toBe(true);
  });

  test(`${endpoint} — method not allowed returns standardised envelope`, async () => {
    const { status, json } = await post(endpoint, null, "GET");
    // Some functions return 405, some 400 for unknown method. Any 4xx is fine as long as the envelope holds.
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    assertEnvelope(json, `${endpoint} method`);
  });
}
