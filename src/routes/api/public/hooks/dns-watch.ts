import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { probeAllHosts, DNS_WATCH_HOSTS } from "@/lib/dns-watch-core";

/**
 * Periodic DNS watch hook.
 *
 * Called by pg_cron every ~15 min. Probes the configured hosts, writes a row
 * per host to `dns_watch_log`, and updates the singleton `dns_watch_state` so
 * the admin dashboard can show a banner the moment all hosts go ready.
 *
 * Auth: the route lives under /api/public/* so it bypasses the edge auth gate.
 * The apikey header is the Supabase anon key — see schedule-jobs-options.
 */
export const Route = createFileRoute("/api/public/hooks/dns-watch")({
  server: {
    handlers: {
      POST: handleDnsWatch,
      GET: handleDnsWatch,
    },
  },
});

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function handleDnsWatch({ request }: { request: Request }) {
  // Server-only secret gate — this hook writes to the database and issues
  // outbound probes, so it must not be callable by the public.
  const secret = process.env.EMAIL_INTERNAL_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!provided || !timingSafeEqualStr(provided, secret)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ ok: false, error: "Supabase env not configured" }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const probes = await probeAllHosts(DNS_WATCH_HOSTS);

  const rows = probes.map((p) => ({
    host: p.host,
    checked_at: p.checkedAt,
    a_records: p.aRecords,
    points_to_lovable: p.pointsToLovable,
    http_status: p.httpStatus,
    http_ok: p.httpOk,
    ready: p.ready,
    notes: p.notes,
    raw: p as unknown as Record<string, unknown>,
  }));

  const { error: insErr } = await admin.from("dns_watch_log").insert(rows);
  if (insErr) {
    console.error("[dns-watch] insert error", insErr);
  }

  const allReady = probes.every((p) => p.ready);

  const { data: prev } = await admin
    .from("dns_watch_state")
    .select("all_ready, ready_since, last_notified_at")
    .eq("key", "default")
    .maybeSingle();

  const wasReady = prev?.all_ready === true;
  const justBecameReady = allReady && !wasReady;

  await admin.from("dns_watch_state").upsert({
    key: "default",
    all_ready: allReady,
    ready_since: allReady ? (prev?.ready_since ?? new Date().toISOString()) : null,
    last_notified_at: justBecameReady ? new Date().toISOString() : (prev?.last_notified_at ?? null),
    last_summary: {
      hosts: probes.map((p) => ({
        host: p.host,
        ready: p.ready,
        notes: p.notes,
      })),
      checkedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  });

  if (justBecameReady) {
    console.log("[dns-watch] 🎉 ALL HOSTS READY:", probes.map((p) => p.host).join(", "));
  }

  return Response.json({
    ok: true,
    allReady,
    justBecameReady,
    probes,
  });
}
