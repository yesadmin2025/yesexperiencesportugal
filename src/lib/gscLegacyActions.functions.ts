import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LEGACY_HOSTS } from "@/lib/legacy-domain-redirect";

/**
 * Legacy-domain GSC actions.
 *
 * What this CAN do programmatically:
 *   - URL Inspection (`/v1/urlInspection/index:inspect`) per legacy URL.
 *     Inspecting via API forces Google to fetch live state for that URL
 *     and records a fresh signal. It's the only API-accessible nudge
 *     toward re-crawling/de-indexing legacy URLs.
 *
 * What GSC does NOT expose via API:
 *   - The "Removals" tool (temporary URL removal). It is UI-only. We
 *     return deep links per legacy property so the operator can submit
 *     bulk removals with one click each.
 *   - "Request Indexing" button on URL Inspection. Also UI-only. We
 *     return deep links for the canonical replacements.
 *
 * This server fn does the real API calls and assembles the deep links.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: roleRow, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !roleRow) throw new Error("Forbidden");
}

function gscHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) {
    throw new Error(
      "Missing LOVABLE_API_KEY or GOOGLE_SEARCH_CONSOLE_API_KEY — connect Google Search Console in Connectors.",
    );
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gscKey,
    "Content-Type": "application/json",
  };
}

/** Paths we want gone from the legacy host's Google index. */
const LEGACY_PATHS = [
  "/",
  "/tours",
  "/about",
  "/contact",
  "/experiencias",
  "/experiences",
  "/blog",
];

/** Canonical replacements on the live site. */
const CANONICAL_URLS = [
  "https://yesexperiencesportugal.com/",
  "https://yesexperiencesportugal.com/signature",
  "https://yesexperiencesportugal.com/studio",
  "https://yesexperiencesportugal.com/travel-designer",
  "https://yesexperiencesportugal.com/about",
];

export type LegacyActionResult = {
  url: string;
  inspectedSite: string;
  ok: boolean;
  status?: string;
  verdict?: string;
  coverageState?: string;
  lastCrawlTime?: string;
  error?: string;
};

async function inspect(url: string, siteUrl: string): Promise<LegacyActionResult> {
  try {
    const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: gscHeaders(),
      body: JSON.stringify({ inspectionUrl: url, siteUrl }),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        url,
        inspectedSite: siteUrl,
        ok: false,
        error: `HTTP ${res.status}: ${text.slice(0, 240)}`,
      };
    }
    const json = (await res.json()) as {
      inspectionResult?: {
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
          lastCrawlTime?: string;
        };
      };
    };
    const r = json.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      inspectedSite: siteUrl,
      ok: true,
      verdict: r.verdict,
      coverageState: r.coverageState,
      lastCrawlTime: r.lastCrawlTime,
    };
  } catch (e) {
    return {
      url,
      inspectedSite: siteUrl,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type LegacyActionsReport = {
  ranAt: string;
  legacyInspections: LegacyActionResult[];
  canonicalInspections: LegacyActionResult[];
  removalsDeepLinks: { host: string; gscRemovalsUrl: string; gscPropertyUrl: string }[];
  reindexDeepLinks: { url: string; gscInspectUrl: string }[];
  notes: string[];
};

export const submitLegacyGscActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LegacyActionsReport> => {
    await assertAdmin(context);

    const legacyHosts = Array.from(LEGACY_HOSTS);
    const legacyUrls = legacyHosts.flatMap((h) =>
      LEGACY_PATHS.map((p) => `https://${h}${p}`),
    );

    const legacyInspections: LegacyActionResult[] = [];
    for (const u of legacyUrls) {
      const host = new URL(u).host;
      const siteUrl = `sc-domain:${host.replace(/^www\./, "")}`;
      // sequential to stay under GSC quota
      // eslint-disable-next-line no-await-in-loop
      legacyInspections.push(await inspect(u, siteUrl));
    }

    const canonicalInspections: LegacyActionResult[] = [];
    for (const u of CANONICAL_URLS) {
      // eslint-disable-next-line no-await-in-loop
      canonicalInspections.push(await inspect(u, "https://yesexperiencesportugal.com/"));
    }

    const removalsDeepLinks = legacyHosts.map((host) => {
      const resourceId = encodeURIComponent(`sc-domain:${host.replace(/^www\./, "")}`);
      return {
        host,
        gscRemovalsUrl: `https://search.google.com/search-console/removals?resource_id=${resourceId}`,
        gscPropertyUrl: `https://search.google.com/search-console?resource_id=${resourceId}`,
      };
    });

    const reindexDeepLinks = CANONICAL_URLS.map((url) => ({
      url,
      gscInspectUrl: `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(
        "https://yesexperiencesportugal.com/",
      )}&id=${encodeURIComponent(url)}`,
    }));

    return {
      ranAt: new Date().toISOString(),
      legacyInspections,
      canonicalInspections,
      removalsDeepLinks,
      reindexDeepLinks,
      notes: [
        "URL Inspection foi chamada via API para cada URL legacy e canónico — força o Google a registar o estado atual.",
        "A ferramenta 'Removals' do GSC não tem API pública. Usa os botões 'Abrir Removals' para submeter remoção temporária (válida ~6 meses, suficiente para o 410 consolidar de-indexação).",
        "'Request Indexing' também é UI-only. Os botões abrem o URL Inspection do canónico — basta clicar em 'Solicitar indexação'.",
      ],
    };
  });
