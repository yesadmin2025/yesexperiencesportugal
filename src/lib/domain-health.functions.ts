import { createServerFn } from "@tanstack/react-start";
import { LEGACY_HOSTS, CANONICAL_ORIGIN } from "@/lib/legacy-domain-redirect";

/**
 * Unified domain health monitor.
 *
 * Probes both canonical and legacy hosts:
 *  - DNS (A records via DNS-over-HTTPS)
 *  - HTTP status per path (no redirect follow)
 *  - noindex signals (x-robots-tag header + <meta name=robots> in HTML)
 *  - 410 Gone compliance (legacy hosts only)
 *
 * Used by /admin/domains-health.
 */

const DOH = "https://cloudflare-dns.com/dns-query";
const EXPECTED_IP = "185.158.133.1";

const CANONICAL_HOSTS = ["yesexperiencesportugal.com", "www.yesexperiencesportugal.com"] as const;

/** Paths sampled on every host. Legacy paths must 410; canonical must 200 + indexable. */
const CANONICAL_PATHS = ["/", "/signature", "/studio", "/travel-designer", "/reviews", "/sitemap.xml", "/robots.txt"];
const LEGACY_PATHS = ["/", "/tours", "/contact", "/sitemap.xml"];

export type PathProbe = {
  path: string;
  url: string;
  status?: number;
  location?: string | null;
  xRobotsTag?: string | null;
  metaRobots?: string | null;
  noindex: boolean;
  contentType?: string | null;
  elapsedMs?: number;
  error?: string;
};

export type DomainHealth = {
  host: string;
  role: "canonical" | "legacy";
  checkedAt: string;
  dns: { a: string[]; dnsOk: boolean; error?: string };
  /** Connect status: active = answers HTTP, verifying = DNS resolves but no HTTP, offline = neither. */
  connectStatus: "active" | "verifying" | "offline";
  paths: PathProbe[];
  /** For canonical: % of paths returning 200 and NOT noindex. For legacy: % returning 410. */
  healthPct: number;
  verdict: string;
};

async function dohA(name: string): Promise<string[]> {
  const url = `${DOH}?name=${encodeURIComponent(name)}&type=A`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH A ${res.status}`);
  const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
  return (json.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
}

async function probePath(host: string, path: string): Promise<PathProbe> {
  const url = `https://${host}${path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { "user-agent": "YESExperiences-DomainHealth/1.0" },
    });
    const xRobotsTag = res.headers.get("x-robots-tag");
    const contentType = res.headers.get("content-type") ?? "";
    let metaRobots: string | null = null;
    if (contentType.includes("text/html")) {
      try {
        const html = await res.text();
        const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
        metaRobots = m ? m[1] : null;
      } catch {
        /* ignore body read errors */
      }
    }
    const noindex =
      (xRobotsTag ?? "").toLowerCase().includes("noindex") ||
      (metaRobots ?? "").toLowerCase().includes("noindex");
    return {
      path,
      url,
      status: res.status,
      location: res.headers.get("location"),
      xRobotsTag,
      metaRobots,
      noindex,
      contentType,
      elapsedMs: Date.now() - t0,
    };
  } catch (e) {
    return {
      path,
      url,
      noindex: false,
      elapsedMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probeHost(host: string, role: "canonical" | "legacy"): Promise<DomainHealth> {
  const checkedAt = new Date().toISOString();
  let a: string[] = [];
  let dnsError: string | undefined;
  try {
    a = await dohA(host);
  } catch (e) {
    dnsError = e instanceof Error ? e.message : String(e);
  }
  const dnsOk = a.includes(EXPECTED_IP);

  const paths = role === "canonical" ? CANONICAL_PATHS : LEGACY_PATHS;
  const probes = await Promise.all(paths.map((p) => probePath(host, p)));

  const anyHttp = probes.some((p) => typeof p.status === "number");
  const connectStatus: DomainHealth["connectStatus"] = anyHttp
    ? "active"
    : a.length > 0
      ? "verifying"
      : "offline";

  let healthPct = 0;
  let verdict = "";
  if (role === "canonical") {
    const good = probes.filter((p) => p.status === 200 && !p.noindex).length;
    healthPct = Math.round((good / probes.length) * 100);
    const noindexed = probes.filter((p) => p.noindex && p.path !== "/robots.txt");
    if (connectStatus !== "active") verdict = "Domínio sem resposta HTTP";
    else if (noindexed.length > 0)
      verdict = `⚠ ${noindexed.length} caminho(s) com noindex — esperado indexável`;
    else if (good === probes.length) verdict = "✓ Todos os caminhos 200 e indexáveis";
    else verdict = `⚠ ${probes.length - good} caminho(s) com problemas`;
  } else {
    const gone = probes.filter((p) => p.status === 410 && !p.location).length;
    const redirects = probes.filter((p) => p.status && p.status >= 300 && p.status < 400).length;
    const ok200 = probes.filter((p) => p.status === 200).length;
    healthPct = Math.round((gone / probes.length) * 100);
    if (connectStatus === "offline") verdict = "DNS não resolve — pode estar OK se domínio expirou";
    else if (connectStatus === "verifying") verdict = "DNS resolve mas sem HTTP — propagação?";
    else if (gone === probes.length) verdict = "✓ Todos os caminhos servem 410 Gone";
    else if (redirects > 0) verdict = `⚠ ${redirects} redirect(s) — Google manterá associação`;
    else if (ok200 > 0) verdict = `⚠ ${ok200} caminho(s) com 200 — legacy ainda serve conteúdo`;
    else verdict = "⚠ Resposta inesperada";
  }

  return {
    host,
    role,
    checkedAt,
    dns: { a, dnsOk, error: dnsError },
    connectStatus,
    paths: probes,
    healthPct,
    verdict,
  };
}

export const probeDomainHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ checkedAt: string; canonicalOrigin: string; hosts: DomainHealth[] }> => {
    const hosts = [
      ...CANONICAL_HOSTS.map((h) => probeHost(h, "canonical")),
      ...Array.from(LEGACY_HOSTS).map((h) => probeHost(h, "legacy")),
    ];
    const results = await Promise.all(hosts);
    return {
      checkedAt: new Date().toISOString(),
      canonicalOrigin: CANONICAL_ORIGIN,
      hosts: results,
    };
  },
);
