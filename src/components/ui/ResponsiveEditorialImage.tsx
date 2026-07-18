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
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        width={image.width}
        height={image.height}
        sizes={sizes}
        className={className}
        style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
      />
    </picture>
  );
}

export function CinematicEditorialImage({ image, priority = false, sizes = "(min-width: 1024px) 50vw, 100vw", className = "", imageClassName = "h-full w-full object-cover", phase = "a" }: {
  image: EditorialImageSource; priority?: boolean; sizes?: string; className?: string; imageClassName?: string; phase?: "a" | "b" | "c";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const node = rootRef.current;
    if (!node || !image.alternate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), { threshold: 0.16 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [image.alternate]);
  if (!image.alternate) return <ResponsiveEditorialImage image={image} priority={priority} sizes={sizes} className={imageClassName} />;
  return (
    <div ref={rootRef} className={`cinematic-editorial cinematic-editorial--${phase}${playing ? " is-playing" : ""} ${className}`} data-cinematic-editorial="true" data-cinematic-playing={playing ? "true" : "false"}>
      <ResponsiveEditorialImage image={image} priority={priority} sizes={sizes} className={imageClassName} pictureClassName="cinematic-editorial__frame cinematic-editorial__frame--primary" />
      <ResponsiveEditorialImage image={image.alternate} sizes={sizes} className={imageClassName} pictureClassName="cinematic-editorial__frame cinematic-editorial__frame--secondary" decorative />
    </div>
  );
}