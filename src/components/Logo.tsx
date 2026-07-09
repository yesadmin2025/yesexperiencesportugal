import logoTealAsset from "@/assets/yes-logo-teal.svg";
import logoGoldAsset from "@/assets/yes-logo-gold.svg";
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
 * One consistent asset format (SVG) used in both header and footer, with
 * two color variants required by the locked palette (teal-on-ivory for
 * light surfaces, gold-on-charcoal for dark). The SVGs are already
 * colored with the exact locked hex values, so no CSS filter recipes
 * are applied. Sizing is controlled by the parent via `className`.
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
  const safeTheme: BrandLogoTheme = assertBrandLogoTheme(theme ?? "teal-on-ivory", "Logo");
  return (
    <img
      src={SOURCES[safeTheme]}
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
