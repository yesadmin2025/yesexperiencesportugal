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

async function handleDnsWatch() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { ok: false, error: "Supabase env not configured" },
      { status: 500 },
    );
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

  await admin
    .from("dns_watch_state")
    .upsert({
      key: "default",
      all_ready: allReady,
      ready_since: allReady ? (prev?.ready_since ?? new Date().toISOString()) : null,
      last_notified_at: justBecameReady
        ? new Date().toISOString()
        : (prev?.last_notified_at ?? null),
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
    console.log(
      "[dns-watch] 🎉 ALL HOSTS READY:",
      probes.map((p) => p.host).join(", "),
    );
  }

  return Response.json({
    ok: true,
    allReady,
    justBecameReady,
    probes,
  });
}
