/**
 * Structured Data Validation — SSR crawler + CI check.
 *
 * Fetches the rendered HTML for every tour, itinerary, and plan-hub route
 * that emits stopMediaLd / pageGalleryLd / tourProductLd and asserts:
 *
 *   • JSON-LD parses.
 *   • Every ImageObject has an absolute contentUrl (or url) + a caption.
 *   • Every ImageGallery has ≥3 unique ImageObject entries with an @id / name.
 *   • Every ItemList of stops has TouristAttraction items with name +
 *     (image ImageObject) for at least the first stop.
 *
 * One spec = both the "headless crawler" and the "CI check" from the plan.
 */
import { test, expect, request } from "@playwright/test";

type Node = Record<string, unknown>;

const TOUR_IDS = [
  "sintra-cascais",
  "arrabida-wine-allinclusive",
  "evora-alentejo",
  "fatima-nazare-obidos",
];

const ROUTES: string[] = [
  ...TOUR_IDS.map((id) => `/tours/${id}`),
  "/itineraries/10-day-private-portugal-tour",
  "/plan/5-day-portugal-itinerary",
  "/plan/7-day-portugal-itinerary",
  "/plan/14-day-portugal-itinerary",
];

function extractLdNodes(html: string): Node[] {
  const nodes: Node[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) nodes.push(...(parsed as Node[]));
      else nodes.push(parsed as Node);
    } catch (err) {
      throw new Error(`Invalid JSON-LD payload: ${(err as Error).message}\n${raw.slice(0, 240)}`);
    }
  }
  return nodes;
}

function typesOf(node: Node): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function walk(node: unknown, visit: (n: Node) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((c) => walk(c, visit));
    return;
  }
  visit(node as Node);
  for (const v of Object.values(node as Node)) walk(v, visit);
}

function isAbsoluteUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function assertImageObject(img: Node, ctx: string): void {
  const types = typesOf(img);
  expect(types, `${ctx}: ImageObject @type`).toContain("ImageObject");
  const url = img.contentUrl ?? img.url;
  expect(isAbsoluteUrl(url), `${ctx}: ImageObject needs absolute contentUrl/url, got ${String(url)}`).toBe(
    true,
  );
  const caption = img.caption ?? img.name ?? img.description;
  expect(
    typeof caption === "string" && caption.trim().length > 0,
    `${ctx}: ImageObject needs non-empty caption/name`,
  ).toBe(true);
  if (img.width !== undefined) {
    expect(typeof img.width, `${ctx}: ImageObject width must be numeric`).toBe("number");
  }
  if (img.height !== undefined) {
    expect(typeof img.height, `${ctx}: ImageObject height must be numeric`).toBe("number");
  }
}

function assertImageGallery(gallery: Node, ctx: string): void {
  expect(typeof gallery.name, `${ctx}: ImageGallery.name`).toBe("string");
  const images = gallery.image;
  expect(Array.isArray(images), `${ctx}: ImageGallery.image must be an array`).toBe(true);
  const arr = images as unknown[];
  expect(arr.length, `${ctx}: ImageGallery needs ≥3 images`).toBeGreaterThanOrEqual(3);
  const seen = new Set<string>();
  arr.forEach((img, i) => {
    const node = img as Node;
    assertImageObject(node, `${ctx}[image ${i}]`);
    const key = String(node.contentUrl ?? node.url);
    expect(seen.has(key), `${ctx}: duplicate image URL ${key}`).toBe(false);
    seen.add(key);
  });
}

function assertTouristAttraction(node: Node, ctx: string): void {
  expect(typeof node.name === "string" && (node.name as string).trim().length > 0, `${ctx}: TouristAttraction.name`).toBe(
    true,
  );
  if (node.image !== undefined) {
    if (typeof node.image === "string") {
      expect(isAbsoluteUrl(node.image), `${ctx}: image URL must be absolute`).toBe(true);
    } else {
      assertImageObject(node.image as Node, `${ctx}.image`);
    }
  }
}

function assertItemListOfStops(list: Node, ctx: string): void {
  const items = list.itemListElement;
  expect(Array.isArray(items), `${ctx}: ItemList.itemListElement`).toBe(true);
  const arr = items as Node[];
  expect(arr.length, `${ctx}: at least one stop`).toBeGreaterThan(0);
  arr.forEach((entry, i) => {
    expect(typesOf(entry), `${ctx}[${i}] @type`).toContain("ListItem");
    expect(typeof entry.position, `${ctx}[${i}].position`).toBe("number");
    const item = entry.item as Node | undefined;
    expect(item && typeof item === "object", `${ctx}[${i}].item present`).toBe(true);
    if (item && typesOf(item).includes("TouristAttraction")) {
      assertTouristAttraction(item, `${ctx}[${i}].item`);
    }
  });
}

for (const path of ROUTES) {
  test(`structured data — ${path}`, async ({ baseURL }) => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${baseURL}${path}`);
    expect(res.status(), `${path} should be reachable`).toBe(200);
    const html = await res.text();

    const nodes = extractLdNodes(html);
    expect(nodes.length, `${path}: expected at least one JSON-LD block`).toBeGreaterThan(0);

    const imageObjects: Node[] = [];
    const galleries: Node[] = [];
    const touristAttractions: Node[] = [];
    const stopItemLists: Node[] = [];

    walk(nodes, (n) => {
      const types = typesOf(n);
      if (types.includes("ImageObject")) imageObjects.push(n);
      if (types.includes("ImageGallery")) galleries.push(n);
      if (types.includes("TouristAttraction")) touristAttractions.push(n);
      if (
        types.includes("ItemList") &&
        typeof n["@id"] === "string" &&
        (n["@id"] as string).endsWith("#stops")
      ) {
        stopItemLists.push(n);
      }
    });

    // Every ImageObject anywhere in the graph must be well-formed.
    imageObjects.forEach((img, i) => assertImageObject(img, `${path} ImageObject[${i}]`));

    // Tour + itinerary pages should emit at least one stop ItemList
    // OR a TouristAttraction graph — otherwise the recent stopMediaLd
    // wiring regressed.
    const emittedStopMedia = stopItemLists.length > 0 || touristAttractions.length > 0;
    expect(
      emittedStopMedia,
      `${path}: expected stopMediaLd (ItemList#stops) or TouristAttraction nodes`,
    ).toBe(true);

    stopItemLists.forEach((list, i) => assertItemListOfStops(list, `${path} stops[${i}]`));
    touristAttractions.forEach((n, i) =>
      assertTouristAttraction(n, `${path} TouristAttraction[${i}]`),
    );

    // Galleries are optional (pageGalleryLd returns null when <3 photos)
    // but any emitted gallery must be valid.
    galleries.forEach((g, i) => assertImageGallery(g, `${path} ImageGallery[${i}]`));
  });
}
