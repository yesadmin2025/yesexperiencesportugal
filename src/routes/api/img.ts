/**
 * Optional image proxy for imported tour images.
 *
 * - Restricts upstream to an allowlist (yesexperiences.pt) so the route can't
 *   be used as an open relay.
 * - Forwards modern Accept formats (AVIF/WebP) so upstream returns the
 *   smallest variant the browser supports.
 * - Sets long-lived `Cache-Control` + `CDN-Cache-Control` so the Worker edge
 *   caches aggressively after the first hit, dramatically speeding up
 *   repeat loads of preview cards.
 * - Accepts `?w=` and `?q=` hints that are folded into the cache key today
 *   and can drive a real resizer later (e.g. Cloudflare Image Resizing) without
 *   changing any callers.
 *
 * Usage:  /api/img?u=<encoded https URL>&w=800
 */
import { createFileRoute } from "@tanstack/react-router";

export const ALLOWED_HOSTS = new Set(["yesexperiences.pt", "www.yesexperiences.pt"]);
export const ALLOWED_EXT = /\.(avif|webp|jpe?g|png)$/i;
// 30 days at the edge, 7 days in the browser. Imported tour images are
// content-addressed by WordPress filename so safe to cache for a long time.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=604800, immutable",
  "CDN-Cache-Control": "public, max-age=2592000",
} as const;

// Allowed buckets for `?w=` and `?q=`. Keeping the set tiny prevents callers
// from polluting the edge cache with arbitrary keys (e.g. ?w=401 vs ?w=402).
const W_BUCKETS = [240, 320, 480, 640, 800, 1024, 1200, 1600, 1920] as const;
const Q_BUCKETS = [60, 75, 85] as const;

/**
 * Pick the chosen Accept variant — `avif`, `webp` or `jpeg` — from the request's
 * `Accept` header. This is folded into the cache key so AVIF/WebP/JPEG
 * responses for the same URL never collide in the edge or browser cache.
 */
export function pickAcceptVariant(accept: string | null | undefined): "avif" | "webp" | "jpeg" {
  const a = (accept ?? "").toLowerCase();
  if (a.includes("image/avif")) return "avif";
  if (a.includes("image/webp")) return "webp";
  return "jpeg";
}

function quantize<T extends number>(value: number, buckets: readonly T[]): T {
  for (const b of buckets) if (value <= b) return b;
  return buckets[buckets.length - 1]!;
}

/**
 * Builds a stable, normalised cache key for a proxy request.
 *
 * - Lower-cases the upstream URL host so case-only differences don't split.
 * - Quantises `w` and `q` to a fixed bucket set.
 * - Includes the negotiated Accept variant so different formats for the same
 *   source URL produce distinct keys (defence-in-depth alongside `Vary`).
 */
export function buildCacheKey(input: {
  upstream: URL;
  width?: number | null;
  quality?: number | null;
  accept?: string | null;
}): string {
  const u = new URL(input.upstream.toString());
  u.hostname = u.hostname.toLowerCase();
  const w =
    input.width && Number.isFinite(input.width) ? quantize(Math.round(input.width), W_BUCKETS) : 0;
  const q =
    input.quality && Number.isFinite(input.quality)
      ? quantize(Math.round(input.quality), Q_BUCKETS)
      : 0;
  const v = pickAcceptVariant(input.accept);
  return `img|${u.toString()}|w=${w}|q=${q}|v=${v}`;
}

function badRequest(msg: string): Response {
  return new Response(msg, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("u");
        if (!target) return badRequest("Missing ?u=");

        let upstream: URL;
        try {
          upstream = new URL(target);
        } catch {
          return badRequest("Invalid URL");
        }
        if (upstream.protocol !== "https:") return badRequest("HTTPS only");
        if (!ALLOWED_HOSTS.has(upstream.hostname)) return badRequest("Host not allowed");
        if (!ALLOWED_EXT.test(upstream.pathname)) return badRequest("Extension not allowed");

        // Forward the browser's modern format preferences so upstream/Cloudflare
        // can serve AVIF or WebP when available.
        const accept = request.headers.get("Accept") ?? "image/avif,image/webp,image/*,*/*;q=0.8";

        const widthParam = url.searchParams.get("w");
        const qualityParam = url.searchParams.get("q");
        const cacheKey = buildCacheKey({
          upstream,
          width: widthParam ? Number(widthParam) : null,
          quality: qualityParam ? Number(qualityParam) : null,
          accept,
        });

        const upstreamRes = await fetch(upstream.toString(), {
          headers: {
            Accept: accept,
            "User-Agent":
              "Mozilla/5.0 (compatible; YesExperiencesImageProxy/1.0; +https://yesexperiences.pt)",
            Referer: "https://yesexperiences.pt/",
          },
          // Let the platform cache this response. The cache key folds in the
          // negotiated Accept variant + quantised w/q so AVIF/WebP/JPEG and
          // different sizes never collide.
          cf: { cacheEverything: true, cacheTtl: 2592000, cacheKey },
        } as RequestInit);

        if (!upstreamRes.ok || !upstreamRes.body) {
          return new Response("Upstream error", {
            status: upstreamRes.status || 502,
            headers: { "Cache-Control": "no-store" },
          });
        }

        const headers = new Headers();
        const contentType = upstreamRes.headers.get("Content-Type") ?? "image/jpeg";
        headers.set("Content-Type", contentType);
        const len = upstreamRes.headers.get("Content-Length");
        if (len) headers.set("Content-Length", len);
        for (const [k, v] of Object.entries(CACHE_HEADERS)) headers.set(k, v);
        // Vary on Accept so AVIF/WebP/JPEG variants don't collide in caches
        // even when an intermediate cache ignores our explicit cacheKey.
        headers.set("Vary", "Accept");
        // Surface the negotiated variant for debugging / log inspection.
        headers.set("X-Img-Variant", pickAcceptVariant(accept));

        return new Response(upstreamRes.body, { status: 200, headers });
      },
    },
  },
});
