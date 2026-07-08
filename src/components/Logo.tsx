import logoTealAsset from "@/assets/yes-logo-approved.webp";
import logoGoldAsset from "@/assets/yes-logo-approved-gold-silk.webp";
import { assertBrandLogoTheme, type BrandLogoTheme } from "@/lib/brand-tokens";

const SOURCES: Record<BrandLogoTheme, string> = {
  "teal-on-ivory": logoTealAsset,
  "gold-on-charcoal": logoGoldAsset,
};

// Re-exported so existing call sites keep working unchanged.
export type LogoTheme = BrandLogoTheme;

/**
 * Logo — shared brand wordmark.
 *
 * Theme drives both the artwork and the matching .logo-mark--* utility
 * class, so consumers can never accidentally pair (e.g.) the teal artwork
 * with the gold-on-charcoal filter recipe. Sizing is controlled by the
 * parent via `className`.
 *
 * The `theme` prop is validated at runtime by `assertBrandLogoTheme`:
 * TypeScript catches bad literals at build time, but anything coming
 * from a database/URL/CMS at runtime would otherwise silently render a
 * blank `<img>`. The guard throws in dev (so the offending component
 * surfaces in the React error overlay) and falls back to the default
 * theme in production while logging a console.error.
 */
export function Logo({
  theme,
  className = "block h-[60px] md:h-[64px] lg:h-[68px] w-auto select-none",
  alt = "YES experiences PORTUGAL",
  loading,
  fetchPriority,
}: {
  theme?: BrandLogoTheme;
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}) {
  // `theme` is typed but defended at runtime — `theme as unknown` lets
  // the guard see runtime values that escaped the type system (e.g. a
  // `theme={someString}` where `someString` is `string`, not the
  // narrower union).
  const safeTheme: BrandLogoTheme = assertBrandLogoTheme(theme ?? "teal-on-ivory", "Logo");
  return (
    <img
      src={SOURCES[safeTheme]}
      width={909}
      height={579}
      alt={alt}
      className={`logo-mark logo-mark--${safeTheme} ${className}`}
      draggable={false}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
    />
  );
}

export default Logo;
