import { test, expect, request } from "@playwright/test";

/**
 * Integration guard: fetch the actual rendered HTML for the homepage,
 * /studio-v3, and /multi-day and confirm every JSON-LD node the Rich
 * Results contract depends on is present in the SSR output.
 *
 * The unit-tier guard (src/__tests__/jsonld-per-template.test.ts) checks
 * the route source. This spec is the runtime companion — it catches
 * regressions in the head() pipeline, script serialization, or SSR
 * transforms that the source-level check cannot see.
 */

type Case = {
  path: string;
  requiredTypes: string[];
};

const CASES: Case[] = [
  {
    path: "/",
    // Root emits WebSite + TravelAgency (Organization subtype).
    // Home leaf adds FAQPage, ItemList, and the Service node.
    requiredTypes: ["WebSite", "TravelAgency", "FAQPage", "ItemList", "Service"],
  },
  {
    path: "/studio-v3",
    requiredTypes: ["WebSite", "TravelAgency", "BreadcrumbList", "FAQPage", "Service"],
  },
  {
    path: "/multi-day",
    requiredTypes: ["WebSite", "TravelAgency", "BreadcrumbList", "FAQPage", "Service"],
  },
];

function collectTypes(html: string): Set<string> {
  const types = new Set<string>();
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const obj = v as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") types.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
    for (const val of Object.values(obj)) walk(val);
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    if (!raw) continue;
    try {
      walk(JSON.parse(raw));
    } catch {
      /* surfaced by assertion below */
    }
  }
  return types;
}

for (const { path, requiredTypes } of CASES) {
  test(`JSON-LD rendered contract — ${path}`, async ({ baseURL }) => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${baseURL}${path}`);
    expect(res.status(), `${path} should return 200`).toBe(200);
    const html = await res.text();
    expect(html, `${path} should contain at least one JSON-LD script`).toMatch(
      /application\/ld\+json/,
    );
    const types = collectTypes(html);
    for (const required of requiredTypes) {
      expect(
        types.has(required),
        `${path} should emit @type='${required}'. Found: ${[...types].sort().join(", ")}`,
      ).toBe(true);
    }
  });
}
