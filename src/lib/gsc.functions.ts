import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Google Search Console — general server functions for the admin panel.
 *
 * Uses the workspace-connected GSC connector via Lovable's connector gateway.
 * All calls are admin-gated (has_role admin).
 *
 * Programmatic:
 *   - listSites            → GET  /webmasters/v3/sites
 *   - inspectUrl           → POST /v1/urlInspection/index:inspect
 *   - listSitemaps         → GET  /webmasters/v3/sites/{siteUrl}/sitemaps
 *   - submitSitemap        → PUT  /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}
 *   - deleteSitemap        → DEL  /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}
 *
 * NOT available via API (return deep-links instead):
 *   - "Request Indexing" (UI-only)
 *   - "Removals" (UI-only)
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function gscHeaders(): Record<string, string> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!lovableKey || !gscKey) {
    throw new Error(
      "Missing LOVABLE_API_KEY or GOOGLE_SEARCH_CONSOLE_API_KEY — connect Google Search Console em Connectors.",
    );
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gscKey,
    "Content-Type": "application/json",
  };
}

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// ── listSites ─────────────────────────────────────────────────────────────

export type GscSite = {
  siteUrl: string;
  permissionLevel: string;
};

export const listGscSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GscSite[]> => {
    await assertAdmin(context.userId);
    const res = await fetch(`${GATEWAY}/webmasters/v3/sites`, {
      method: "GET",
      headers: gscHeaders(),
    });
    if (!res.ok) throw new Error(`GSC listSites HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { siteEntry?: GscSite[] };
    return json.siteEntry ?? [];
  });

// ── inspectUrl ────────────────────────────────────────────────────────────

export type UrlInspectionResult = {
  ok: boolean;
  error?: string;
  gscInspectUrl: string;
  indexStatus?: {
    verdict?: string;
    coverageState?: string;
    robotsTxtState?: string;
    indexingState?: string;
    lastCrawlTime?: string;
    pageFetchState?: string;
    googleCanonical?: string;
    userCanonical?: string;
    referringUrls?: string[];
    crawledAs?: string;
  };
  mobileUsability?: {
    verdict?: string;
    issues?: { issueType?: string; severity?: string; message?: string }[];
  };
  richResults?: {
    verdict?: string;
    detectedItems?: { richResultType?: string; items?: { name?: string }[] }[];
  };
};

export const inspectGscUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string; siteUrl: string }) => {
    if (!input?.url || !input?.siteUrl) throw new Error("url and siteUrl are required");
    return input;
  })
  .handler(async ({ context, data }): Promise<UrlInspectionResult> => {
    await assertAdmin(context.userId);
    const gscInspectUrl = `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(
      data.siteUrl,
    )}&id=${encodeURIComponent(data.url)}`;
    try {
      const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
        method: "POST",
        headers: gscHeaders(),
        body: JSON.stringify({ inspectionUrl: data.url, siteUrl: data.siteUrl }),
      });
      if (!res.ok) {
        return {
          ok: false,
          gscInspectUrl,
          error: `HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`,
        };
      }
      const json = (await res.json()) as {
        inspectionResult?: {
          indexStatusResult?: UrlInspectionResult["indexStatus"];
          mobileUsabilityResult?: UrlInspectionResult["mobileUsability"];
          richResultsResult?: UrlInspectionResult["richResults"];
        };
      };
      const r = json.inspectionResult ?? {};
      return {
        ok: true,
        gscInspectUrl,
        indexStatus: r.indexStatusResult,
        mobileUsability: r.mobileUsabilityResult,
        richResults: r.richResultsResult,
      };
    } catch (e) {
      return {
        ok: false,
        gscInspectUrl,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

// ── Sitemaps ──────────────────────────────────────────────────────────────

export type GscSitemap = {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  errors?: string;
  warnings?: string;
  contents?: { type?: string; submitted?: string; indexed?: string }[];
};

export const listGscSitemaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string }) => {
    if (!input?.siteUrl) throw new Error("siteUrl is required");
    return input;
  })
  .handler(async ({ context, data }): Promise<GscSitemap[]> => {
    await assertAdmin(context.userId);
    const res = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps`,
      { method: "GET", headers: gscHeaders() },
    );
    if (!res.ok) throw new Error(`GSC listSitemaps HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      sitemap?: {
        path: string;
        lastSubmitted?: string;
        lastDownloaded?: string;
        isPending?: boolean;
        isSitemapsIndex?: boolean;
        errors?: string;
        warnings?: string;
        contents?: { type?: string; submitted?: string; indexed?: string }[];
      }[];
    };
    return (json.sitemap ?? []).map((s) => ({ ...s }));
  });

export const submitGscSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string; feedpath: string }) => {
    if (!input?.siteUrl || !input?.feedpath) throw new Error("siteUrl and feedpath are required");
    return input;
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context.userId);
    const res = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(data.feedpath)}`,
      { method: "PUT", headers: gscHeaders() },
    );
    if (!res.ok) throw new Error(`GSC submitSitemap HTTP ${res.status}: ${await res.text()}`);
    return { ok: true };
  });

export const deleteGscSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { siteUrl: string; feedpath: string }) => {
    if (!input?.siteUrl || !input?.feedpath) throw new Error("siteUrl and feedpath are required");
    return input;
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context.userId);
    const res = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(data.feedpath)}`,
      { method: "DELETE", headers: gscHeaders() },
    );
    if (!res.ok && res.status !== 204)
      throw new Error(`GSC deleteSitemap HTTP ${res.status}: ${await res.text()}`);
    return { ok: true };
  });
