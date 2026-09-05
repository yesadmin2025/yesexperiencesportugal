/**
 * Build-time responsive variants for bundled tour photos.
 *
 * The source JPEGs under `src/assets/tours/**` are 250–330 KB each — far more
 * than a phone card needs. `vite-imagetools` emits WebP variants at three
 * widths at build time; this module maps the *plain* asset URL (the one a
 * static `import img from "@/assets/tours/.../hero.jpg"` yields) to that
 * srcset so any card can upgrade without changing its imports.
 *
 * Falls back to `undefined` for images we have no variants for — callers then
 * keep the original single-URL behaviour.
 */

const CARD_WIDTHS = "480;800;1200";

const plain = import.meta.glob<string>("/src/assets/tours/**/*.jpg", {
  eager: true,
  import: "default",
  query: "?url",
});

const webpSets = import.meta.glob<string>("/src/assets/tours/**/*.jpg", {
  eager: true,
  import: "default",
  query: `?w=${CARD_WIDTHS}&format=webp&as=srcset`,
});

const byUrl = new Map<string, string>();
for (const [path, url] of Object.entries(plain)) {
  const set = webpSets[path];
  if (typeof url === "string" && typeof set === "string") byUrl.set(url, set);
}

/** Default `sizes` for a 3-up tour card grid (1-up on phones). */
export const TOUR_CARD_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Returns `{ src, srcSet, sizes }` for a bundled tour image URL.
 * Unknown URLs (remote/Viator/CDN) pass straight through unchanged.
 */
export function bundledTourCardImage(
  src: string,
  sizes: string = TOUR_CARD_SIZES,
): { src: string; srcSet?: string; sizes?: string } {
  const srcSet = byUrl.get(src);
  return srcSet ? { src, srcSet, sizes } : { src };
}

/** Test/diagnostic helper — how many bundled tour photos have variants. */
export function bundledTourCardImageCount(): number {
  return byUrl.size;
}
