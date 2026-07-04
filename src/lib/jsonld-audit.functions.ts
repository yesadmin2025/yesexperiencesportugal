import { createServerFn } from "@tanstack/react-start";
import { SITE_URL } from "@/lib/seo";

/**
 * SEO JSON-LD audit.
 *
 * Fetches each affected landing route, extracts every
 * `<script type="application/ld+json">` block, and validates each Product
 * node against the Rich Results / Merchant listings rules we just fixed:
 *  - `isVariantOf` must be a `ProductGroup` with `productGroupID`
 *  - `audience` must be a `PeopleAudience`
 *  - Product required fields present (name, description, image, offers)
 *
 * Powers `/admin/seo-jsonld`.
 */

/** Landing routes whose JSON-LD was tightened for Search Console. */
export const AFFECTED_PATHS = [
  "/private-wine-tour-lisbon",
  "/wine-tours-lisbon",
  "/arrabida-wine-tour",
  "/arrabida-day-trip-from-lisbon",
  "/sintra-day-tour-from-lisbon",
  "/evora-private-tour-from-lisbon",
  "/evora-alentejo-wine-tour",
  "/alentejo-wine-tour-from-lisbon",
] as const;

export type JsonLdCheck = {
  rule: string;
  ok: boolean;
  detail?: string;
};

export type ProductAudit = {
  productName: string;
  checks: JsonLdCheck[];
};

export type PageAudit = {
  path: string;
  url: string;
  status?: number;
  fetchedAt: string;
  jsonLdBlocks: number;
  products: ProductAudit[];
  pass: boolean;
  error?: string;
};

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function isProduct(node: Record<string, unknown>): boolean {
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.includes("Product");
}

/** Recursively yield every Product-typed node inside a JSON-LD payload. */
function collectProducts(root: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    const obj = v as Record<string, unknown>;
    if (isProduct(obj)) out.push(obj);
    // Also walk @graph and nested fields (some pages wrap products in a graph)
    for (const val of Object.values(obj)) visit(val);
  };
  visit(root);
  return out;
}

function validateProduct(product: Record<string, unknown>): ProductAudit {
  const checks: JsonLdCheck[] = [];
  const name = (product.name as string) ?? "(unnamed product)";

  // Required Product fields
  for (const field of ["name", "description", "image", "offers"] as const) {
    checks.push({
      rule: `Product.${field} present`,
      ok: product[field] !== undefined && product[field] !== null && product[field] !== "",
    });
  }

  // isVariantOf must be ProductGroup with productGroupID
  const iv = product.isVariantOf as Record<string, unknown> | undefined;
  if (iv !== undefined) {
    const ivType = asArray(iv["@type"] as string | string[] | undefined);
    checks.push({
      rule: "isVariantOf.@type === 'ProductGroup'",
      ok: ivType.includes("ProductGroup"),
      detail: ivType.length ? `Found @type: ${ivType.join(", ")}` : "Missing @type",
    });
    checks.push({
      rule: "isVariantOf.productGroupID present",
      ok: typeof iv.productGroupID === "string" && iv.productGroupID.length > 0,
    });
  }

  // audience must be PeopleAudience (Merchant listings rule)
  const aud = product.audience as Record<string, unknown> | undefined;
  if (aud !== undefined) {
    const audType = asArray(aud["@type"] as string | string[] | undefined);
    checks.push({
      rule: "audience.@type === 'PeopleAudience'",
      ok: audType.includes("PeopleAudience"),
      detail: audType.length ? `Found @type: ${audType.join(", ")}` : "Missing @type",
    });
  }

  // Offer sanity
  const offers = product.offers as Record<string, unknown> | undefined;
  if (offers !== undefined) {
    checks.push({
      rule: "offers.priceCurrency present",
      ok: typeof offers.priceCurrency === "string" && offers.priceCurrency.length > 0,
    });
    checks.push({
      rule: "offers.availability present",
      ok: typeof offers.availability === "string" && offers.availability.length > 0,
    });
  }

  return { productName: name, checks };
}

/** Extract every JSON-LD payload from an HTML string. Tolerates whitespace and CDATA. */
function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      out.push({ __parseError: true, raw: raw.slice(0, 120) });
    }
  }
  return out;
}

async function auditPath(path: string, origin: string): Promise<PageAudit> {
  const url = `${origin}${path}`;
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": "YESExperiences-JsonLdAudit/1.0" },
    });
    const html = await res.text();
    const blocks = extractJsonLd(html);
    const products: ProductAudit[] = [];
    for (const block of blocks) {
      // Parse errors surface as a synthetic failing product
      if (block && typeof block === "object" && (block as { __parseError?: boolean }).__parseError) {
        products.push({
          productName: "(unparseable JSON-LD)",
          checks: [{ rule: "JSON.parse succeeds", ok: false }],
        });
        continue;
      }
      for (const p of collectProducts(block)) products.push(validateProduct(p));
    }
    const pass =
      res.status === 200 &&
      products.length > 0 &&
      products.every((p) => p.checks.every((c) => c.ok));
    return {
      path,
      url,
      status: res.status,
      fetchedAt,
      jsonLdBlocks: blocks.length,
      products,
      pass,
    };
  } catch (e) {
    return {
      path,
      url,
      fetchedAt,
      jsonLdBlocks: 0,
      products: [],
      pass: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export const auditJsonLd = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ checkedAt: string; origin: string; pages: PageAudit[] }> => {
    const origin = SITE_URL;
    const pages = await Promise.all(AFFECTED_PATHS.map((p) => auditPath(p, origin)));
    return { checkedAt: new Date().toISOString(), origin, pages };
  },
);
