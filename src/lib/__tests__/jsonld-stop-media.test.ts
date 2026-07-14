import { describe, it, expect } from "vitest";
import { stopMediaLd, pageGalleryLd, SITE_URL } from "../jsonld";

describe("stopMediaLd", () => {
  const pageUrl = `${SITE_URL}/tours/sample`;

  it("returns null for empty stops", () => {
    expect(stopMediaLd({ pageUrl, name: "n", stops: [] })).toBeNull();
  });

  it("emits an ItemList with per-stop TouristAttraction + ImageObject", () => {
    const ld = stopMediaLd({
      pageUrl,
      name: "Sample — stops",
      stops: [
        { label: "Cabo da Roca", story: "Where the mainland ends.", image: "/img/cabo.jpg" },
        { label: "Sintra", story: "Palaces above the mist." },
      ],
    })!;
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.numberOfItems).toBe(2);
    expect(ld.itemListElement).toHaveLength(2);
    const first = ld.itemListElement[0] as { item: Record<string, unknown> };
    expect(first.item["@type"]).toBe("TouristAttraction");
    expect(first.item.name).toBe("Cabo da Roca");
    const image = first.item.image as { url: string; contentUrl: string; caption: string };
    expect(image.url).toBe(`${SITE_URL}/img/cabo.jpg`);
    expect(image.contentUrl).toBe(image.url);
    expect(image.caption).toContain("Cabo da Roca");
    // Stops with no image omit the image field but stay listed.
    expect((ld.itemListElement[1] as { item: Record<string, unknown> }).item.image).toBeUndefined();
  });

  it("truncates long stories to 300 chars", () => {
    const long = "x".repeat(500);
    const ld = stopMediaLd({
      pageUrl,
      name: "n",
      stops: [{ label: "A", story: long }],
    })!;
    const item = (ld.itemListElement[0] as unknown as { item: { description: string } }).item;
    expect(item.description.length).toBe(300);
  });
});

describe("pageGalleryLd", () => {
  const pageUrl = `${SITE_URL}/plan/arrabida`;

  it("returns null below the 3-photo threshold", () => {
    expect(
      pageGalleryLd({
        pageUrl,
        name: "n",
        photos: [
          { src: "/a.jpg", alt: "a" },
          { src: "/b.jpg", alt: "b" },
        ],
      }),
    ).toBeNull();
  });

  it("dedupes photos by absolute URL", () => {
    const ld = pageGalleryLd({
      pageUrl,
      name: "Arrábida photos",
      photos: [
        { src: "/a.jpg", alt: "a" },
        { src: "/a.jpg", alt: "dup" },
        { src: "/b.jpg", alt: "b" },
        { src: "/c.jpg", alt: "c" },
      ],
    })!;
    expect(ld.numberOfItems).toBe(3);
    const urls = ld.image.map((i) => i.url);
    expect(new Set(urls).size).toBe(3);
    expect(urls[0]).toMatch(/^https?:\/\//);
  });
});
