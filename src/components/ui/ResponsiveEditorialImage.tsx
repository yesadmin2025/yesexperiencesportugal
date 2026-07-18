export type EditorialImageSource = {
  src: string;
  alt: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  width?: number;
  height?: number;
  objectPosition?: string;
};

type Props = {
  image: EditorialImageSource;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function ResponsiveEditorialImage({
  image,
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
}: Props) {
  return (
    <picture className="block h-full w-full">
      {image.avifSrcSet ? (
        <source type="image/avif" srcSet={image.avifSrcSet} sizes={sizes} />
      ) : null}
      {image.webpSrcSet ? (
        <source type="image/webp" srcSet={image.webpSrcSet} sizes={sizes} />
      ) : null}
      <img
        src={image.src}
        alt={image.alt}
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