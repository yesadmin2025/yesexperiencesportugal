import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract: every landing template MUST emit exactly the JSON-LD nodes
 * Rich Results needs, and the Service node must NEVER be omitted from
 * the marketing surfaces (home, Studio, Travel Designer).
 *
 * We assert against the route source (helper calls in `head().scripts`)
 * rather than rendered HTML so the guard runs in the fast unit tier and
 * fails the build the moment a helper is deleted.
 *
 * WebSite + Organization are emitted globally by src/routes/__root.tsx —
 * asserted once here so a root-level regression is also caught.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const ROOT = read("src/routes/__root.tsx");
const HOME = read("src/routes/index.tsx");
const STUDIO = read("src/routes/experience-studio.tsx");
const MULTI = read("src/routes/multi-day.tsx");

/** Match helper call inside a jsonLdScript(...) wrapper anywhere in the file. */
const emits = (source: string, helper: string) =>
  new RegExp(`jsonLdScript\\(\\s*(?:[\\w.]+\\()*${helper}\\b`).test(source);

describe("JSON-LD per-template contract", () => {
  describe("__root.tsx (global)", () => {
    it("emits WebSite", () => expect(emits(ROOT, "websiteLd")).toBe(true));
    it("emits Organization", () => expect(emits(ROOT, "organizationLd")).toBe(true));
  });

  describe("/ (homepage)", () => {
    it("emits FAQPage", () => expect(emits(HOME, "faqPageLd")).toBe(true));
    it("emits ItemList", () => expect(emits(HOME, "itemListLd")).toBe(true));
    it("emits Service (never omitted)", () => expect(emits(HOME, "studioServiceLd")).toBe(true));
  });

  describe("/experience-studio", () => {
    it("emits BreadcrumbList", () => expect(emits(STUDIO, "breadcrumbLd")).toBe(true));
    it("emits FAQPage", () => expect(emits(STUDIO, "faqPageLd")).toBe(true));
    it("emits Service (never omitted)", () => expect(emits(STUDIO, "studioServiceLd")).toBe(true));
  });

  describe("/multi-day", () => {
    it("emits BreadcrumbList", () => expect(emits(MULTI, "breadcrumbLd")).toBe(true));
    it("emits FAQPage", () => expect(emits(MULTI, "faqPageLd")).toBe(true));
    it("emits Service (never omitted)", () =>
      expect(emits(MULTI, "travelDesignerServiceLd")).toBe(true));
  });
});
