import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { getConversionReport, type ConversionReport } from "../conversions.functions";

const tour = "/tours/arrabida-wine-allinclusive";
const storedVisits = [
  { visitor_id: "one", path: tour, product_path: null, event: "view" },
  { visitor_id: "two", path: `${tour}/tailor`, product_path: "studio", event: "view" },
  { visitor_id: "three", path: "/studio", product_path: "studio", event: "view" },
  { visitor_id: "four", path: "/experiences", product_path: "signature", event: "view" },
  { visitor_id: "one", path: tour, product_path: "tailor", event: "cta_click" },
];

async function report() {
  const from = vi.fn((table: string) => {
    const query = {
      select: () => query,
      gte: () => query,
      eq: () => query,
      like: () => query,
      or: () => query,
      range: async () => ({ data: storedVisits, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: table === "bookings" ? [] : null, count: 0, error: null,
      }).then(resolve),
    };
    return query;
  });
  const handler = getConversionReport as unknown as (input: unknown) => Promise<ConversionReport>;
  const result = await handler({ data: { days: 30 }, context: {
    userId: "admin", supabase: { from, rpc: async () => ({ data: true }) },
  } });
  return result;
}

describe("read-only historical measurement", () => {
  it("moves old null tour views into Signature and old Studio Tailor views into Tailor", async () => {
    const result = await report();
    expect(result.byPath.find((row) => row.path === "signature")?.visitors).toBe(2);
    expect(result.byPath.find((row) => row.path === "tailor")?.visitors).toBe(1);
    expect(result.byPath.find((row) => row.path === "studio")?.visitors).toBe(1);
    expect(result.pageViews).toBe(4);
  });

  it("keeps CTA destination Tailor even when clicked on a Signature source page", async () => {
    const result = await report();
    expect(result.ctaClicks.find((row) => row.cta === "tailor")?.clicks).toBe(1);
    expect(result.ctaClicks.find((row) => row.cta === "signature")?.clicks).toBe(0);
  });

  it("never mutates historical rows or requires a write operation", async () => {
    const before = structuredClone(storedVisits);
    await report();
    expect(storedVisits).toEqual(before);
    expect(storedVisits[0]?.product_path).toBeNull();
    expect(storedVisits[1]?.product_path).toBe("studio");
  });
});