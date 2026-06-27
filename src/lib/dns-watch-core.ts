/**
 * DNS Watch — shared probe logic.
 *
 * Detailed per-host probe:
 *  - DNS A / TXT / CNAME via Cloudflare DoH
 *  - HTTPS GET with status + selected response headers
 *  - Synthesises a "ready / not ready" verdict and human-readable reasons
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
  /** A records (IPv4) */
  aRecords: string[];
  /** TXT records (joined chunks per record) */
  txtRecords: string[];
  /** CNAME chain (target hostnames) */
  cnameRecords: string[];
  pointsToLovable: boolean;
  /** TXT _lovable verification value if present */
  lovableVerifyTxt: string | null;
  httpStatus: number | null;
  httpOk: boolean;
  /** Final URL after redirects (manual mode — first hop's Location) */
  httpLocation: string | null;
  httpServer: string | null;
  httpContentType: string | null;
  /** Whether the body looks like a YES Experiences page (heuristic) */
  servedByLovable: boolean;
  ready: boolean;
  /** Short verdict label for UI badges */
  verdict: "ready" | "dns-missing" | "dns-wrong" | "http-down" | "http-error" | "wrong-content";
  notes: string;
  /** Per-check breakdown for the detailed indicator */
  checks: {
    label: string;
    ok: boolean;
    detail: string;
  }[];
};

const DOH = "https://cloudflare-dns.com/dns-query";

type DohAnswer = { type: number; data: string };

async function dohQuery(host: string, type: "A" | "TXT" | "CNAME"): Promise<DohAnswer[]> {
  const url = `${DOH}?name=${encodeURIComponent(host)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH ${type} ${res.status}`);
  const json = (await res.json()) as { Answer?: DohAnswer[] };
  return json.Answer ?? [];
}

const TYPE_A = 1;
const TYPE_CNAME = 5;
const TYPE_TXT = 16;

function unquoteTxt(raw: string): string {
  // DoH returns TXT as a quoted string, sometimes split into multiple "chunks" "joined"
  return raw
    .split(/"\s+"/)
    .map((s) => s.replace(/^"|"$/g, ""))
    .join("");
}

type HttpProbe = {
  status: number | null;
  ok: boolean;
  location: string | null;
  server: string | null;
  contentType: string | null;
  bodySample: string;
};

async function probeHttps(host: string): Promise<HttpProbe> {
  try {
    const res = await fetch(`https://${host}/`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": "YESExperiences-DnsWatch/1.0" },
    });
    let bodySample = "";
    try {
      const text = await res.text();
      bodySample = text.slice(0, 2000);
    } catch {
      /* ignore */
    }
    return {
      status: res.status,
      ok: res.status > 0 && res.status < 500,
      location: res.headers.get("location"),
      server: res.headers.get("server"),
      contentType: res.headers.get("content-type"),
      bodySample,
    };
  } catch {
    return { status: null, ok: false, location: null, server: null, contentType: null, bodySample: "" };
  }
}

export async function probeHost(host: string): Promise<DnsWatchProbe> {
  const checkedAt = new Date().toISOString();

  let aRecords: string[] = [];
  let txtRecords: string[] = [];
  let cnameRecords: string[] = [];
  let dnsErr: string | null = null;

  try {
    const [aAns, txtAns, cnameAns] = await Promise.all([
      dohQuery(host, "A"),
      dohQuery(host, "TXT"),
      dohQuery(host, "CNAME"),
    ]);
    aRecords = aAns.filter((a) => a.type === TYPE_A).map((a) => a.data);
    txtRecords = txtAns.filter((a) => a.type === TYPE_TXT).map((a) => unquoteTxt(a.data));
    cnameRecords = cnameAns.filter((a) => a.type === TYPE_CNAME).map((a) => a.data.replace(/\.$/, ""));
  } catch (e) {
    dnsErr = e instanceof Error ? e.message : String(e);
  }

  const pointsToLovable = aRecords.includes(LOVABLE_IP);
  const lovableVerifyTxt =
    txtRecords.find((t) => t.toLowerCase().startsWith("lovable_verify=")) ?? null;

  const http = await probeHttps(host);

  // Heuristic: served by our app if the HTML contains a YES brand marker.
  const body = http.bodySample.toLowerCase();
  const servedByLovable =
    body.includes("yes experiences") ||
    body.includes("yesexperiencesportugal") ||
    body.includes("data-lovable") ||
    body.includes('id="root"');

  const ready = pointsToLovable && http.ok && servedByLovable;

  let verdict: DnsWatchProbe["verdict"];
  let notes: string;
  if (dnsErr) {
    verdict = "dns-missing";
    notes = `Erro DNS: ${dnsErr}`;
  } else if (aRecords.length === 0) {
    verdict = "dns-missing";
    notes = "Sem registo A — DNS ainda não propagou";
  } else if (!pointsToLovable) {
    verdict = "dns-wrong";
    notes = `A aponta para ${aRecords.join(", ")} (não Lovable ${LOVABLE_IP})`;
  } else if (http.status === null) {
    verdict = "http-down";
    notes = "DNS OK mas HTTPS sem resposta (timeout/SSL)";
  } else if (!http.ok) {
    verdict = "http-error";
    notes = `HTTPS respondeu ${http.status}`;
  } else if (!servedByLovable) {
    verdict = "wrong-content";
    notes = "HTTPS OK mas conteúdo não parece do site YES (verificar host header / proxy)";
  } else {
    verdict = "ready";
    notes = "✓ Pronto — DNS Lovable + HTTPS + conteúdo YES";
  }

  const checks: DnsWatchProbe["checks"] = [
    {
      label: "DNS A",
      ok: pointsToLovable,
      detail: aRecords.length
        ? `${aRecords.join(", ")}${pointsToLovable ? " ✓ Lovable" : ""}`
        : "—",
    },
    {
      label: "DNS CNAME",
      ok: true, // informational only
      detail: cnameRecords.length ? cnameRecords.join(" → ") : "—",
    },
    {
      label: "DNS TXT (_lovable)",
      ok: lovableVerifyTxt !== null || txtRecords.length > 0,
      detail: lovableVerifyTxt
        ? lovableVerifyTxt
        : txtRecords.length
          ? `${txtRecords.length} TXT (sem _lovable)`
          : "—",
    },
    {
      label: "HTTPS",
      ok: http.ok,
      detail: http.status !== null ? `${http.status}${http.server ? ` · ${http.server}` : ""}` : "sem resposta",
    },
    {
      label: "Conteúdo YES",
      ok: servedByLovable,
      detail: servedByLovable
        ? (http.contentType ?? "ok")
        : http.location
          ? `redirect → ${http.location}`
          : "marcador YES não encontrado",
    },
  ];

  return {
    host,
    checkedAt,
    aRecords,
    txtRecords,
    cnameRecords,
    pointsToLovable,
    lovableVerifyTxt,
    httpStatus: http.status,
    httpOk: http.ok,
    httpLocation: http.location,
    httpServer: http.server,
    httpContentType: http.contentType,
    servedByLovable,
    ready,
    verdict,
    notes,
    checks,
  };
}

export async function probeAllHosts(
  hosts: readonly string[] = DNS_WATCH_HOSTS,
): Promise<DnsWatchProbe[]> {
  return Promise.all(hosts.map(probeHost));
}
