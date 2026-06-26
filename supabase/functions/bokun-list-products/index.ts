// Lists all activities/experiences from Bokun so we can map them to Signature tours.
// Bokun REST API uses HMAC-SHA1 auth: signature = base64(HMAC-SHA1(secret, date + accessKey + method + path))
// Docs: https://bokun.dev/api/

import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOKUN_HOST = "https://api.bokun.io";

async function bokunSignature(
  secretKey: string,
  date: string,
  accessKey: string,
  method: string,
  path: string,
): Promise<string> {
  const message = `${date}${accessKey}${method.toUpperCase()}${path}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return encodeBase64(new Uint8Array(sig));
}

function bokunDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

async function bokunFetch(path: string, method = "GET", body?: unknown) {
  const accessKey = Deno.env.get("BOKUN_ACCESS_KEY");
  const secretKey = Deno.env.get("BOKUN_SECRET_KEY");
  if (!accessKey || !secretKey) throw new Error("Bokun keys not configured");

  const date = bokunDate();
  const signature = await bokunSignature(secretKey, date, accessKey, method, path);

  const headers: Record<string, string> = {
    "X-Bokun-Date": date,
    "X-Bokun-AccessKey": accessKey,
    "X-Bokun-Signature": signature,
  };
  let bodyStr: string | undefined;
  if (body !== undefined) {
    bodyStr = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BOKUN_HOST}${path}`, { method, headers, body: bodyStr });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bokun ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require admin caller — protects credentialed Bókun calls from anonymous abuse.
  const authz = await requireAdmin(req);
  if (!authz.ok) {
    return new Response(
      JSON.stringify({ error: authz.error ?? "Unauthorized" }),
      { status: authz.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // Page through all activities (Bokun returns ~20/page).
    const all: Array<Record<string, unknown>> = [];
    let pageNum = 1;
    const maxPages = 20;
    while (pageNum <= maxPages) {
      const data = await bokunFetch(
        `/activity.json/search?lang=EN&currency=EUR`,
        "POST",
        { pageSize: 50, page: pageNum },
      );
      const items = (data?.items ?? []) as Array<Record<string, unknown>>;
      if (!items.length) break;
      all.push(...items);
      const totalHits = Number(data?.totalHits ?? 0);
      if (all.length >= totalHits) break;
      pageNum++;
    }

    const items = all.map((it) => ({
      id: it.id,
      title: it.title,
      productCode: it.productCode ?? null,
      durationText: it.durationText ?? null,
      currency: it.currency ?? null,
      nextDefaultPrice: it.nextDefaultPrice ?? null,
    }));

    return new Response(
      JSON.stringify({ count: items.length, items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("bokun-list-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
