import { test, expect, request, type APIRequestContext } from "@playwright/test";

/**
 * JSON-LD build validation across every public (sitemap-listed) route.
 *
 * Asserts, per page:
 *  - every ld+json block parses;
 *  - no duplicate @id (the same entity emitted twice on one page);
 *  - every url/@id/image/sameAs value is an absolute http(s) URL — never a
 *    relative path, a bundler placeholder, or an empty string;
 *  - essential fields are present per entity type (Organization/TravelAgency,
 *    WebSite, BreadcrumbList, FAQPage, Product, Service, ItemList).
 *
 * Complements e2e/jsonld-rendered.spec.ts, which asserts that specific
 * entity *types* exist on the key landing templates.
 */

const CANONICAL_ORIGIN = "https://yesexperiencesportugal.com";

type Node = Record<string, unknown>;

const REQUIRED_FIELDS: Record<string, string[]> = {
  Organization: ["name", "url"],
  TravelAgency: ["name", "url"],
  LocalBusiness: ["name", "url"],
  WebSite: ["name", "url"],
  BreadcrumbList: ["itemListElement"],
  FAQPage: ["mainEntity"],
  Product: ["name", "description", "offers"],
  Service: ["name", "provider"],
  ItemList: ["itemListElement"],
  Article: ["headline"],
};

/** Fields whose values must be absolute URLs when present. */
const URL_FIELDS = new Set(["url", "@id", "sameAs", "image", "logo", "contentUrl", "target"]);

function typesOf(node: Node): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

/**
 * Visit every node. `topLevel` is true for the block root and for the
 * members of its `@graph` — i.e. the entities the page actually publishes.
 * Nested nodes (an Offer's seller, a Review's publisher, …) are descriptors
 * and are not held to the same required-field contract.
 */
function walk(value: unknown, visit: (node: Node, topLevel: boolean) => void, topLevel = true) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, visit, topLevel));
    return;
  }
  const node = value as Node;
  visit(node, topLevel);
  for (const [key, v] of Object.entries(node)) walk(v, visit, topLevel && key === "@graph");
}

/**
 * A node *defines* an entity when it carries substantive properties. A node
 * with only @id/@type (optionally with a human-readable name/url label) is a
 * cross-reference to an entity defined elsewhere and is never a duplicate.
 */
const REFERENCE_KEYS = new Set(["@context", "@id", "@type", "name", "url"]);
function isDefinition(node: Node): boolean {
  if (typesOf(node).length === 0) return false;
  return Object.keys(node).some((k) => !REFERENCE_KEYS.has(k));
}


function urlProblems(node: Node, path: string): string[] {
  const out: string[] = [];
  for (const [key, raw] of Object.entries(node)) {
    if (!URL_FIELDS.has(key)) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const v of values) {
      if (typeof v !== "string") continue; // nested objects handled by walk()
      if (!v.trim()) {
        out.push(`${path}: empty ${key}`);
        continue;
      }
      // Schema.org allows non-URL @id tokens only in edge cases; we require
      // absolute URLs so entities stay globally unique and de-duplicable.
      if (!/^https?:\/\//i.test(v)) out.push(`${path}: ${key} is not absolute ("${v}")`);
      else if (/localhost|127\.0\.0\.1|\/@fs\/|\[object /i.test(v))
        out.push(`${path}: ${key} points at a non-production URL ("${v}")`);
    }
  }
  return out;
}

function extractBlocks(html: string): string[] {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  return Array.from(html.matchAll(re))
    .map((m) => m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, ""))
    .filter(Boolean);
}

test.describe("JSON-LD validity on public routes", () => {
  let ctx: APIRequestContext;
  let paths: string[] = [];

  test.beforeAll(async ({ baseURL }) => {
    ctx = await request.newContext({ baseURL });
    const res = await ctx.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    paths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
      .map((m) => m[1].trim().slice(CANONICAL_ORIGIN.length) || "/")
      .filter((p, i, a) => a.indexOf(p) === i);
    expect(paths.length).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("no parse errors, no duplicate @id, no invalid URLs, no missing essentials", async () => {
    const problems: string[] = [];

    for (const path of paths) {
      const res = await ctx.get(path);
      if (res.status() !== 200) {
        problems.push(`${path}: HTTP ${res.status()}`);
        continue;
      }
      const html = await res.text();
      const blocks = extractBlocks(html);
      if (blocks.length === 0) {
        problems.push(`${path}: no JSON-LD blocks`);
        continue;
      }

      const ids = new Map<string, number>();
      for (const [i, raw] of blocks.entries()) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          problems.push(`${path} block#${i}: JSON parse error — ${(e as Error).message}`);
          continue;
        }

        walk(parsed, (node, topLevel) => {
          const where = `${path} block#${i}`;
          problems.push(...urlProblems(node, where));

          const id = node["@id"];
          if (typeof id === "string" && id && isDefinition(node)) {
            ids.set(id, (ids.get(id) ?? 0) + 1);
          }

          if (!topLevel) return;
          for (const type of typesOf(node)) {
            const required = REQUIRED_FIELDS[type];
            if (!required) continue;
            for (const field of required) {
              const v = node[field];
              const missing =
                v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
              if (missing) problems.push(`${where}: ${type} missing required "${field}"`);
            }
          }
        });

      }

      for (const [id, count] of ids) {
        if (count > 1) problems.push(`${path}: duplicate @id "${id}" (${count}×)`);
      }
    }

    expect(problems, `\n${problems.join("\n")}\n`).toEqual([]);
  });
});
