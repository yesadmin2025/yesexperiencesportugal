import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("service search copy", () => {
  for (const [route, descriptionName] of [
    ["proposal-in-portugal", "DESCRIPTION"],
    ["portugal-travel-designer", "DESC"],
  ]) {
    it(`${route} keeps factual, brand-specific search metadata`, () => {
      const source = readFileSync(`src/routes/${route}.tsx`, "utf8");
      const title = source.match(/const TITLE = "([^"]+)"/)?.[1];
      const description = source.match(new RegExp(`const ${descriptionName} =\\s*"([^"]+)"`))?.[1];
      expect(title?.trim().length).toBeGreaterThan(20);
      expect(title?.length).toBeLessThanOrEqual(60);
      expect(description).toBeTruthy();
      expect(description?.length).toBeLessThanOrEqual(155);
      expect(source).toContain('{ property: "og:title", content: TITLE }');
      expect(source).toContain(`{ property: "og:description", content: ${descriptionName} }`);
      expect(description).not.toMatch(/instant|guaranteed|best|exclusive/i);
    });
  }
});