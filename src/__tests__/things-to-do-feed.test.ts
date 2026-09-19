import { describe, expect, it } from "vitest";

import {
  buildThingsToDoProducts,
  isoDuration,
  minDurationHours,
  thingsToDoRss,
  validateThingsToDoFeed,
} from "@/lib/seo/things-to-do-feed";
import { signatureTours } from "@/data/signatureTours";

describe("Google Things to do product feed", () => {
  const products = buildThingsToDoProducts();

  it("covers every Signature experience once", () => {
    expect(products).toHaveLength(signatureTours.length);
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  });

  it("passes feed validation with no issues", () => {
    expect(validateThingsToDoFeed(products)).toEqual([]);
  });

  it("parses published duration ranges without inventing values", () => {
    expect(minDurationHours("7–9h")).toBe(7);
    expect(minDurationHours("7h30")).toBe(7.5);
    expect(isoDuration("7–9h")).toBe("PT7H");
    expect(isoDuration("7h30")).toBe("PT7H30M");
    expect(isoDuration("Full Day")).toBeNull();
  });

  it("points every product at our own canonical tour page", () => {
    for (const p of products) {
      expect(p.url).toBe(`https://yesexperiencesportugal.com/tours/${p.id}`);
    }
  });

  it("never exports ratings or review counts", () => {
    const xml = thingsToDoRss(products);
    expect(xml).not.toMatch(/rating|review/i);
    expect(JSON.stringify(products)).not.toMatch(/"rating"|"reviewCount"/);
  });

  it("emits valid Google RSS fields", () => {
    const xml = thingsToDoRss(products);
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    for (const p of products) {
      expect(xml).toContain(`<g:id>${p.id}</g:id>`);
      expect(xml).toContain(`<g:price>${p.priceFromEur.toFixed(2)} EUR</g:price>`);
    }
  });
});
