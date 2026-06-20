import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours } from "@/data/signatureTours";
import { useImageQuality, type ImageQuality } from "@/hooks/use-image-quality";

type Row = { id: string; image_url: string | null; source_url: string };

/**
 * Card-size presets used by tour preview cards across the site. The hook
 * picks an appropriate width per breakpoint and emits a `srcSet` so the
 * browser downloads the smallest useful variant for the current viewport
 * and DPR.
 *
 * Widths are quantised (see `quantizeWidth`) so we don't generate hundreds
 * of cache-key permutations for marginally different viewports.
 */
export type CardSize = "sm" | "md" | "lg" | "hero";

const CARD_WIDTHS: Record<CardSize, number> = {
  sm: 320, // small thumbnails (admin list, dense grids)
  md: 480, // default tour cards on mobile
  lg: 800, // tour cards at lg breakpoint and above
  hero: 1280, // featured / hero imagery
};

// Candidate widths emitted in `srcSet`. Browsers pick the closest >= CSS px * DPR.
const SRCSET_WIDTHS: Record<CardSize, number[]> = {
  sm: [240, 320, 480],
  md: [320, 480, 640, 800],
  lg: [480, 800, 1200, 1600],
  hero: [800, 1280, 1600, 1920],
};

const SIZES: Record<CardSize, string> = {
  sm: "(min-width: 1024px) 240px, 320px",
  md: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  lg: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  hero: "100vw",
};

/**
 * Fetches imported tour image URLs from Lovable Cloud and exposes a resolver
 * that returns the live image for a SignatureTour when available, otherwise
 * the curated fallback `tour.img`. Matching is done by `source_url` →
 * `bookingUrl`, since signature ids and scraped slugs differ.
 */
export function useImportedTourImages() {
  const [rows, setRows] = useState<Row[]>([]);
  const { quality } = useImageQuality();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("imported_tours")
        .select("id, image_url, source_url")
        .not("image_url", "is", null);
      if (cancelled || error || !data) return;
      setRows(data as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byUrl = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.image_url) m.set(normalize(r.source_url), r.image_url);
    return m;
  }, [rows]);

  const resolve = useMemo(() => {
    return (
      tour: (typeof signatureTours)[number],
      opts?: { width?: number; size?: CardSize; raw?: boolean },
    ): string => {
      const live = byUrl.get(normalize(tour.bookingUrl));
      if (!live) return tour.img;
      if (opts?.raw) return live;
      const baseWidth = opts?.width ?? (opts?.size ? CARD_WIDTHS[opts.size] : CARD_WIDTHS.md);
      return proxied(live, scaleForQuality(baseWidth, quality));
    };
  }, [byUrl, quality]);

  /**
   * Returns props (`src`, `srcSet`, `sizes`) suitable for spreading onto an
   * `<img>` so the browser can pick the smallest useful variant for the
   * current breakpoint and DPR.
   *
   * The `sizes` attribute and the layout never change between quality modes —
   * only the candidate widths shift up (crisp) or down (fast), so toggling
   * never causes layout shift.
   */
  const resolveImg = useMemo(() => {
    return (
      tour: (typeof signatureTours)[number],
      size: CardSize = "md",
    ): { src: string; srcSet?: string; sizes?: string } => {
      const live = byUrl.get(normalize(tour.bookingUrl));
      if (!live) return { src: tour.img };
      const widths = SRCSET_WIDTHS[size].map((w) => scaleForQuality(w, quality));
      const srcSet = widths.map((w) => `${proxied(live, w)} ${w}w`).join(", ");
      return {
        src: proxied(live, scaleForQuality(CARD_WIDTHS[size], quality)),
        srcSet,
        sizes: SIZES[size],
      };
    };
  }, [byUrl, quality]);

  return { resolve, resolveImg, hasLive: rows.length > 0, quality };
}

/**
 * Scales a candidate width by the active quality preference and snaps to the
 * proxy's bucket grid so cache keys still converge across viewports.
 *
 * - `fast`  → ~70% of base (smaller bytes, faster cards)
 * - `crisp` → ~150% of base (sharper on retina)
 */
export function scaleForQuality(width: number, quality: ImageQuality): number {
  const factor = quality === "crisp" ? 1.5 : 0.7;
  return quantizeWidth(Math.round(width * factor));
}

function normalize(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

/**
 * Quantise widths to a small set of buckets so `srcSet` candidates and ad-hoc
 * `width` hints converge on the same cache keys. Without this a 401px and a
 * 412px request would each produce a distinct edge-cache entry.
 */
export function quantizeWidth(w: number): number {
  const buckets = [240, 320, 480, 640, 800, 1024, 1200, 1600, 1920];
  for (const b of buckets) if (w <= b) return b;
  return buckets[buckets.length - 1]!;
}

/**
 * Routes a remote image URL through our /api/img proxy so it benefits from
 * edge caching, modern format negotiation and a single warm origin per page.
 * Falls back to the raw URL if the input doesn't look like an http(s) URL.
 *
 * Width is quantised so callers asking for similar sizes share a cache entry.
 */
function proxied(rawUrl: string, width?: number): string {
  if (!/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const params = new URLSearchParams({ u: rawUrl });
  if (width && Number.isFinite(width)) {
    params.set("w", String(quantizeWidth(Math.round(width))));
  }
  return `/api/img?${params.toString()}`;
}
