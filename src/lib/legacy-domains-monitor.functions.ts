import { createServerFn } from "@tanstack/react-start";
import { LEGACY_HOSTS } from "@/lib/legacy-domain-redirect";

/**
 * Server fn that probes the legacy domains in real time:
 *  - DNS resolution via DNS-over-HTTPS (Cloudflare 1.1.1.1)
 *  - HTTP GET against https:// and http:// (no redirect follow)
 *  - Extracts status, location, x-robots-tag, server, content-type
 *  - Computes 410 Gone compliance flag
 *
 * Used by /admin/legacy-domains-monitor. DoH avoids needing Node `dns`
 * which isn't reliable on Cloudflare Workers.
 */

export type DnsRecord = { type: string; data: string; TTL?: number };

export type HttpProbe = {
  scheme: "http" | "https";
  url: string;
  status?: number;
  ok?: boolean;
  location?: string | null;
  xRobotsTag?: string | null;
  server?: string | null;
  contentType?: string | null;
  elapsedMs?: number;
  error?: string;
};

export type LegacyHostReport = {
  host: string;
  checkedAt: string;
  dns: {
    a: DnsRecord[];
    aaaa: DnsRecord[];
    cname: DnsRecord[];
    ns: DnsRecord[];
    error?: string;
  };
  http: HttpProbe[];
  /** True iff at least one scheme returned 410 and NO Location header. */
  compliant410: boolean;
  /** Short human-readable verdict. */
  verdict: string;
};

const DOH = "https://cloudflare-dns.com/dns-query";

async function dohQuery(name: string, type: string): Promise<DnsRecord[]> {
  const url = `${DOH}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH ${type} ${res.status}`);
  const json = (await res.json()) as { Answer?: { type: number; data: string; TTL: number }[] };
  const typeMap: Record<number, string> = { 1: "A", 2: "NS", 5: "CNAME", 28: "AAAA" };
  return (json.Answer ?? [])
    .filter((a) => typeMap[a.type] === type)
    .map((a) => ({ type, data: a.data, TTL: a.TTL }));
}

async function probeHttp(scheme: "http" | "https", host: string): Promise<HttpProbe> {
  const url = `${scheme}://${host}/`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { "user-agent": "YESExperiences-LegacyMonitor/1.0" },
    });
    return {
      scheme,
      url,
      status: res.status,
      ok: res.ok,
      location: res.headers.get("location"),
      xRobotsTag: res.headers.get("x-robots-tag"),
      server: res.headers.get("server"),
      contentType: res.headers.get("content-type"),
      elapsedMs: Date.now() - t0,
    };
  } catch (e) {
    return {
      scheme,
      url,
      elapsedMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export const probeLegacyDomains = createServerFn({ method: "GET" }).handler(
  async (): Promise<LegacyHostReport[]> => {
    const hosts = Array.from(LEGACY_HOSTS);
    return await Promise.all(
      hosts.map(async (host) => {
        const checkedAt = new Date().toISOString();
        const [aRes, aaaaRes, cnameRes, nsRes] = await Promise.allSettled([
          dohQuery(host, "A"),
          dohQuery(host, "AAAA"),
          dohQuery(host, "CNAME"),
          dohQuery(host, "NS"),
        ]);
        const unwrap = (r: PromiseSettledResult<DnsRecord[]>) =>
          r.status === "fulfilled" ? r.value : [];
        const dnsError = [aRes, aaaaRes, cnameRes, nsRes]
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r) => String(r.reason))
          .join("; ");

        const [https, http] = await Promise.all([probeHttp("https", host), probeHttp("http", host)]);
        const probes = [https, http];
        const compliant410 = probes.some((p) => p.status === 410 && !p.location);
        const anySuccess = probes.some((p) => typeof p.status === "number");

        let verdict: string;
        if (!anySuccess) verdict = "Sem resposta HTTP (DNS pode não apontar para nós)";
        else if (compliant410) verdict = "✓ 410 Gone conforme — sem Location";
        else if (probes.some((p) => p.status === 410 && p.location))
          verdict = "⚠ 410 mas com Location — não conforme";
        else if (probes.some((p) => p.status && p.status >= 300 && p.status < 400))
          verdict = "⚠ Redirect ativo (esperado 410)";
        else if (probes.some((p) => p.status === 200))
          verdict = "⚠ HTTP 200 — domínio ainda serve conteúdo legacy";
        else verdict = "⚠ Resposta inesperada — verificar manualmente";

        return {
          host,
          checkedAt,
          dns: {
            a: unwrap(aRes),
            aaaa: unwrap(aaaaRes),
            cname: unwrap(cnameRes),
            ns: unwrap(nsRes),
            error: dnsError || undefined,
          },
          http: probes,
          compliant410,
          verdict,
        };
      }),
    );
  },
);
