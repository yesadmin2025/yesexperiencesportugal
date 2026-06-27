import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { probeAllHosts, DNS_WATCH_HOSTS, type DnsWatchProbe } from "@/lib/dns-watch-core";

export type DnsWatchStatus = {
  allReady: boolean;
  readySince: string | null;
  lastNotifiedAt: string | null;
  hosts: DnsWatchProbe[];
  history: {
    host: string;
    checked_at: string;
    ready: boolean;
    points_to_lovable: boolean;
    http_status: number | null;
    notes: string | null;
  }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
}

export const getDnsWatchStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DnsWatchStatus> => {
    await assertAdmin(context);

    // Live probe so admin always sees fresh data.
    const probes = await probeAllHosts(DNS_WATCH_HOSTS);

    const { data: state } = await context.supabase
      .from("dns_watch_state")
      .select("all_ready, ready_since, last_notified_at")
      .eq("key", "default")
      .maybeSingle();

    const { data: history } = await context.supabase
      .from("dns_watch_log")
      .select("host, checked_at, ready, points_to_lovable, http_status, notes")
      .order("checked_at", { ascending: false })
      .limit(40);

    return {
      allReady: probes.every((p) => p.ready),
      readySince: state?.ready_since ?? null,
      lastNotifiedAt: state?.last_notified_at ?? null,
      hosts: probes,
      history: (history ?? []) as DnsWatchStatus["history"],
    };
  });

/** Manual "check now" — also writes a log row + updates state. */
export const runDnsWatchNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DnsWatchStatus> => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const probes = await probeAllHosts(DNS_WATCH_HOSTS);

    await supabaseAdmin.from("dns_watch_log").insert(
      probes.map((p) => ({
        host: p.host,
        checked_at: p.checkedAt,
        a_records: p.aRecords,
        points_to_lovable: p.pointsToLovable,
        http_status: p.httpStatus,
        http_ok: p.httpOk,
        ready: p.ready,
        notes: p.notes,
        raw: p as unknown as Record<string, unknown>,
      })),
    );

    const allReady = probes.every((p) => p.ready);
    const { data: prev } = await supabaseAdmin
      .from("dns_watch_state")
      .select("all_ready, ready_since, last_notified_at")
      .eq("key", "default")
      .maybeSingle();
    const wasReady = prev?.all_ready === true;
    const justBecameReady = allReady && !wasReady;

    await supabaseAdmin.from("dns_watch_state").upsert({
      key: "default",
      all_ready: allReady,
      ready_since: allReady ? (prev?.ready_since ?? new Date().toISOString()) : null,
      last_notified_at: justBecameReady
        ? new Date().toISOString()
        : (prev?.last_notified_at ?? null),
      last_summary: {
        hosts: probes.map((p) => ({ host: p.host, ready: p.ready, notes: p.notes })),
        checkedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });

    const { data: history } = await supabaseAdmin
      .from("dns_watch_log")
      .select("host, checked_at, ready, points_to_lovable, http_status, notes")
      .order("checked_at", { ascending: false })
      .limit(40);

    return {
      allReady,
      readySince: allReady ? (prev?.ready_since ?? new Date().toISOString()) : null,
      lastNotifiedAt: justBecameReady ? new Date().toISOString() : (prev?.last_notified_at ?? null),
      hosts: probes,
      history: (history ?? []) as DnsWatchStatus["history"],
    };
  });
