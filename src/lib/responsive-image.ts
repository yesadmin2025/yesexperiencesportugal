/**
 * Single source of truth for turning any image URL into a
 * `{ src, srcSet, sizes }` triple that browsers can pick the smallest
 * useful variant from.
 *
 * Recognises three origins:
 *  - Viator CDN (`media.tacdn.com/*`): routed through `/api/img` with
 *    quantised `w=` variants so the edge Worker caches AVIF/WebP for us.
 *  - Lovable Assets CDN (`/__l5e/assets-v1/*`): passthrough — the CDN
 *    already negotiates format from Accept and cache-controls immutably.
 *  - Anything else (Supabase transforms, `public/*`, absolute URLs):
 *    passthrough — callers that have their own srcSet keep it.
 *
 * Widths are the same 5-bucket ramp used by `useImportedTourImages` and
 * `useAdminTourPhotos` so all caches stay unified.
 */

const DEFAULT_WIDTHS = [480, 800, 1200, 1600] as const;

export const SIZES = {
  /** 3-up grid at lg, 2-up at sm, 1-up mobile. */
  card: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  /** Full-bleed hero. */
  hero: "100vw",
  /** 2-up gallery at lg, 1-up mobile. */
  gallery: "(min-width: 1024px) 50vw, 100vw",
  /** Editorial portrait split (image side of a 2-col row). */
  portrait: "(min-width: 1024px) 50vw, 100vw",
} as const;

export type SizesPreset = keyof typeof SIZES;

export interface ResponsiveSrc {
  src: string;
  srcSet?: string;
  sizes?: string;
}

function isViator(url: string): boolean {
  return /^https?:\/\/media\.tacdn\.com\//i.test(url);
}

function proxied(url: string, width: number): string {
  return `/api/img?u=${encodeURIComponent(url)}&w=${width}`;
}

/**
 * Build a responsive triple for any image URL. Safe passthrough for
 * origins we don't recognise — callers can layer their own `srcSet`
 * afterwards if they already build one (see `useAdminTourPhotos`).
 */
export function buildResponsiveSrc(
  url: string,
  opts: { sizes?: SizesPreset | string; widths?: readonly number[] } = {},
): ResponsiveSrc {
  const sizes =
    opts.sizes && opts.sizes in SIZES
      ? SIZES[opts.sizes as SizesPreset]
      : (opts.sizes as string | undefined);

  if (!url) return { src: url, sizes };

  if (isViator(url)) {
    const widths = opts.widths ?? DEFAULT_WIDTHS;
    const srcSet = widths.map((w) => `${proxied(url, w)} ${w}w`).join(", ");
    // Anchor `src` at 800w — a good default for mid-range mobile.
    const src = proxied(url, 800);
    return { src, srcSet, sizes };
  }

  return { src: url, sizes };
}
