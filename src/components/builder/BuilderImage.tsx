/**
 * BuilderImage — polished, gallery-ready <img> for the Experience Builder.
 *
 * Provides:
 *  - Reserved aspect-ratio box (no layout shift on slow networks)
 *  - Sand/teal gradient placeholder + soft blur until load
 *  - Fade-in on load (≤220ms, brand-allowed)
 *  - Graceful empty state when src missing or load fails
 *
 * Uses brand tokens only — no custom colors.
 */

import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

export type BuilderImageRatio = "16/9" | "4/5" | "3/2" | "1/1" | "18/10";

interface Props {
  src?: string | null;
  alt?: string | null;
  ratio?: BuilderImageRatio;
  className?: string;
  imgClassName?: string;
  /** Show a subtle dark gradient overlay (e.g. when text sits on top). */
  overlay?: boolean;
  priority?: boolean;
  rounded?: boolean;
  /** Optional content rendered above the image (badges, captions). */
  children?: React.ReactNode;
}

const ratioClass: Record<BuilderImageRatio, string> = {
  "16/9": "aspect-[16/9]",
  "4/5": "aspect-[4/5]",
  "3/2": "aspect-[3/2]",
  "1/1": "aspect-square",
  "18/10": "aspect-[18/10]",
};

export function BuilderImage({
  src,
  alt,
  ratio = "4/5",
  className = "",
  imgClassName = "",
  overlay = false,
  priority = false,
  rounded = true,
  children,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Reset state if src changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const showImage = !!src && !errored;

  return (
    <figure
      className={[
        "relative block overflow-hidden",
        rounded ? "rounded-[2px]" : "",
        ratioClass[ratio],
        // Brand-toned placeholder gradient — sand → soft charcoal
        "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sand)_85%,transparent)_0%,color-mix(in_oklab,var(--charcoal)_15%,transparent)_100%)]",
        className,
      ].join(" ")}
    >
      {/* Animated shimmer veil (very subtle) until loaded */}
      {showImage && !loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-[color:var(--sand)]/40"
        />
      )}

      {showImage && (
        <img
          src={src}
          alt={alt ?? ""}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={[
            "absolute inset-0 h-full w-full object-cover",
            "transition-[opacity,filter,transform] duration-[220ms] ease-out",
            loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-[6px] scale-[1.02]",
            imgClassName,
          ].join(" ")}
        />
      )}

      {!showImage && (
        <span className="absolute inset-0 flex items-center justify-center text-[color:var(--charcoal)]/40">
          <ImageOff size={18} strokeWidth={1.5} />
        </span>
      )}

      {overlay && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal)]/45 via-[color:var(--charcoal)]/10 to-transparent"
        />
      )}

      {children}
    </figure>
  );
}
