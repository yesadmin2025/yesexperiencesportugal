import type { EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";

type AssetPointer = { url: string };
type Variant = { width: number; url: string };
type Group = { avif: Variant[]; webp: Variant[] };

const modules = import.meta.glob<AssetPointer>("/src/assets/editorial-premium/*.asset.json", {
  eager: true,
  import: "default",
});
const variants = new Map<string, Group>();

for (const [path, pointer] of Object.entries(modules)) {
  const match = path
    .split("/")
    .pop()
    ?.replace(/\.asset\.json$/, "")
    .match(/^(.*)-(\d+)\.(avif|webp)$/);
  if (!match) continue;
  const [, name, width, format] = match;
  const group = variants.get(name) ?? { avif: [], webp: [] };
  group[format as "avif" | "webp"].push({ width: Number(width), url: pointer.url });
  variants.set(name, group);
}

const srcSet = (items: Variant[]) =>
  items
    .slice()
    .sort((a, b) => a.width - b.width)
    .map((v) => `${v.url} ${v.width}w`)
    .join(", ");

export function premiumEditorialImage(
  name: string,
  details: Omit<EditorialImageSource, "src" | "avifSrcSet" | "webpSrcSet">,
): EditorialImageSource {
  const group = variants.get(name);
  const fallback = group?.webp
    .slice()
    .sort((a, b) => a.width - b.width)
    .at(-1);
  if (!group || !fallback) throw new Error(`Missing premium editorial variants for ${name}`);
  return {
    ...details,
    src: fallback.url,
    avifSrcSet: srcSet(group.avif),
    webpSrcSet: srcSet(group.webp),
  };
}
