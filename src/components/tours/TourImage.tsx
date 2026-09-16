/**
 * TourImage — unified 3:2 frame for every Signature tour image.
 *
 * One consistent aspect ratio + object-cover + subtle editorial placeholder
 * so today's Viator (media.tacdn.com) URLs and tomorrow's locally-uploaded
 * `public/tours/<id>/*.webp` photos render inside the exact same frame.
 *
 * Uses brand tokens only (--sand, --ivory, --teal). No color choices here.
 * Motion respects the site contract: ≤220ms fade + soft blur out on load.
 */
import { useEffect, useRef, useState } from "react";

type Ratio = "3/2" | "16/9" | "4/5";

interface Props {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  /** Ratio of the outer frame. Defaults to 3:2 — the Signature standard. */
  ratio?: Ratio;
  /** Eager-load + fetchpriority=high for above-the-fold hero images. */
  priority?: boolean;
  /** object-position value (e.g. "50% 30%") — mirrors <img style>. */
  focal?: string;
  className?: string;
  imgClassName?: string;
  /** Optional overlay children (badges, captions, gradient scrims). */
  children?: React.ReactNode;
}

const ratioClass: Record<Ratio, string> = {
  "3/2": "aspect-[3/2]",
  "16/9": "aspect-[16/9]",
  "4/5": "aspect-[4/5]",
};

export function TourImage({
  src,
  srcSet,
  sizes,
  alt,
  ratio = "3/2",
  priority = false,
  focal,
  className = "",
  imgClassName = "",
  children,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    const image = imageRef.current;
    // Cached eager images can finish before React attaches onLoad during
    // hydration. Read the native state so a real image never stays hidden.
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <div
      className={[
        "relative overflow-hidden",
        ratioClass[ratio],
        // Intentional editorial placeholder so lazy-loading never reads as a blank ivory hole.
        "bg-[linear-gradient(135deg,var(--sand)_0%,var(--ivory)_52%,color-mix(in_oklab,var(--teal)_12%,var(--sand))_100%)]",
        className,
      ].join(" ")}
    >
      {!loaded && !errored && (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,color-mix(in_oklab,var(--ivory)_78%,transparent)_0%,transparent_62%)]"
        />
      )}

      <img
        ref={imageRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        style={focal ? { objectPosition: focal } : undefined}
        className={[
          "absolute inset-0 h-full w-full object-cover object-center",
          "transition-[opacity,filter,transform] duration-[220ms] ease-out motion-reduce:transition-none",
          loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-[6px] scale-[1.02]",
          imgClassName,
        ].join(" ")}
      />

      {children}
    </div>
  );
}
