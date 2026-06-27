/**
 * DNS Watch — shared probe logic.
 *
 * Checks A records via Cloudflare DoH and HTTPS reachability to determine
 * whether a host is "ready in Lovable" — i.e. its A record points to the
 * Lovable load balancer IP and the site answers over HTTPS.
 *
 * Used by:
 *  - /api/public/hooks/dns-watch (cron)
 *  - dns-watch.functions.ts     (admin manual check)
 */

export const LOVABLE_IP = "185.158.133.1";

export const DNS_WATCH_HOSTS = [
  "yesexperiences.pt",
  "www.yesexperiences.pt",
  "yesexperiencesportugal.com",
  "www.yesexperiencesportugal.com",
] as const;

export type DnsWatchProbe = {
  host: string;
  checkedAt: string;
  aRecords: string[];
  pointsToLovable: boolean;
  httpStatus: number | null;
  httpOk: boolean;
  ready: boolean;
  notes: string;
};

const DOH = "https://cloudflare-dns.com/dns-query";

async function resolveA(host: string): Promise<string[]> {
  const url = `${DOH}?name=${encodeURIComponent(host)}&type=A`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH A ${res.status}`);
  const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
  return (json.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
}

async function probeHttps(host: string): Promise<{ status: number | null; ok: boolean }> {
  try {
    const res = await fetch(`https://${host}/`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { "user-agent": "YESExperiences-DnsWatch/1.0" },
    });
    return { status: res.status, ok: res.status > 0 && res.status < 500 };
  } catch {
    return { status: null, ok: false };
  }
}

export async function probeHost(host: string): Promise<DnsWatchProbe> {
  const checkedAt = new Date().toISOString();
  let aRecords: string[] = [];
  let dnsErr: string | null = null;
  try {
    aRecords = await resolveA(host);
  } catch (e) {
    dnsErr = e instanceof Error ? e.message : String(e);
  }
  const pointsToLovable = aRecords.includes(LOVABLE_IP);
  const { status, ok } = await probeHttps(host);
  const ready = pointsToLovable && ok;

  let notes: string;
  if (dnsErr) notes = `DNS error: ${dnsErr}`;
  else if (aRecords.length === 0) notes = "Sem registo A — DNS ainda não propagou";
  else if (!pointsToLovable) notes = `A aponta para ${aRecords.join(", ")} (não Lovable)`;
  else if (!ok) notes = "DNS OK mas HTTPS ainda sem resposta válida";
  else notes = "✓ Pronto — DNS Lovable + HTTPS ativo";

  return {
    host,
    checkedAt,
    aRecords,
    pointsToLovable,
    httpStatus: status,
    httpOk: ok,
    ready,
    notes,
  };
}

export async function probeAllHosts(
  hosts: readonly string[] = DNS_WATCH_HOSTS,
): Promise<DnsWatchProbe[]> {
  return Promise.all(hosts.map(probeHost));
}
