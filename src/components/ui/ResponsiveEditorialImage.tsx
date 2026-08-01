import { useEffect, useRef, useState } from "react";

export type EditorialImageSource = {
  src: string;
  alt: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  width?: number;
  height?: number;
  objectPosition?: string;
  alternate?: EditorialImageSource;
};

type Props = {
  image: EditorialImageSource;
  priority?: boolean;
  sizes?: string;
  className?: string;
  pictureClassName?: string;
  decorative?: boolean;
};

export function ResponsiveEditorialImage({
  image,
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
  pictureClassName = "block h-full w-full",
  decorative = false,
}: Props) {
  // Batch 4: reserve layout space before the bytes arrive. When intrinsic
  // dimensions are known we hand the browser an aspect-ratio so no CLS is
  // possible even inside a flexible editorial frame; crops/focal points are
  // untouched (object-fit/object-position still drive the visual).
  const reserve =
    image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined;

  return (
    <picture className={pictureClassName} aria-hidden={decorative ? "true" : undefined}>
      {image.avifSrcSet ? (
        <source type="image/avif" srcSet={image.avifSrcSet} sizes={sizes} />
      ) : null}
      {image.webpSrcSet ? (
        <source type="image/webp" srcSet={image.webpSrcSet} sizes={sizes} />
      ) : null}
      <img
        src={image.src}
        alt={decorative ? "" : image.alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        width={image.width}
        height={image.height}
        sizes={sizes}
        className={className}
        style={
          image.objectPosition || reserve
            ? {
                ...(reserve ?? {}),
                ...(image.objectPosition ? { objectPosition: image.objectPosition } : {}),
              }
            : undefined
        }
      />
    </picture>
  );
}

export function CinematicEditorialImage({
  image,
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className = "",
  imageClassName = "h-full w-full object-cover",
  phase = "a",
}: {
  image: EditorialImageSource;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  phase?: "a" | "b" | "c";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = rootRef.current;
    if (!node || !image.alternate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.16,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [image.alternate]);
  useEffect(() => {
    // Ensure animation only starts after the primary image has decoded so the
    // first frame is sharp on high-DPR iPhone and the Ken Burns/crossfade
    // sequence is actually visible instead of racing with the decode.
    const node = rootRef.current;
    if (!node) return;
    const img = node.querySelector<HTMLImageElement>(".cinematic-editorial__frame--primary img");
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setReady(true);
      return;
    }
    const done = () => setReady(true);
    img.addEventListener("load", done, { once: true });
    return () => img.removeEventListener("load", done);
  }, [image.src]);
  if (!image.alternate)
    return (
      <ResponsiveEditorialImage
        image={image}
        priority={priority}
        sizes={sizes}
        className={imageClassName}
      />
    );
  const playing = visible && ready;
  return (
    <div
      ref={rootRef}
      className={`cinematic-editorial cinematic-editorial--${phase}${playing ? " is-playing" : ""}${ready ? " is-ready" : ""} ${className}`}
      data-cinematic-editorial="true"
      data-cinematic-playing={playing ? "true" : "false"}
      data-cinematic-ready={ready ? "true" : "false"}
    >
      <ResponsiveEditorialImage
        image={image}
        priority={priority}
        sizes={sizes}
        className={imageClassName}
        pictureClassName="cinematic-editorial__frame cinematic-editorial__frame--primary"
      />
      <ResponsiveEditorialImage
        image={image.alternate}
        priority={priority}
        sizes={sizes}
        className={imageClassName}
        pictureClassName="cinematic-editorial__frame cinematic-editorial__frame--secondary"
        decorative
      />
    </div>
  );
}
