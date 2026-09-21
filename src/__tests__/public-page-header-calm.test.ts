import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const HEADER_ROUTES = [
  "src/routes/about.tsx",
  "src/routes/reviews.tsx",
  "src/routes/contact.tsx",
  "src/routes/corporate.tsx",
  "src/routes/proposal-in-portugal.tsx",
  "src/routes/portugal-travel-designer.tsx",
];

describe("public page header grammar (editorial calm pass)", () => {
  it("keeps decorative route threads out of ordinary public headers", () => {
    for (const route of HEADER_ROUTES) {
      expect(read(route), route).not.toContain("RouteThread");
    }
  });

  it("gives About a single header support paragraph", () => {
    const about = read("src/routes/about.tsx");
    expect(about).not.toContain("page-header-secondary");
    expect(about.match(/page-header-support/g)?.length ?? 0).toBe(1);
  });

  it("keeps the multi-day hero free of the tertiary all-caps line", () => {
    const multiDay = read("src/routes/multi-day.tsx");
    const heroEnd = multiDay.indexOf("public-page-header");
    const firstSection = multiDay.indexOf("section-y", heroEnd);
    expect(multiDay.slice(heroEnd, firstSection)).not.toContain("Delivered as a travel file");
    expect(multiDay).toContain("Delivered as a travel file");
  });

  it("defines the shared calm spacing and motion tokens once", () => {
    const css = read("src/styles.css");
    expect(css).toContain("--section-y-major");
    expect(css).toContain(".section-y-major");
    expect(css).toContain(".header-seq");
    expect(css).toContain(".section-seq");
    expect(css).toContain(".alt-chapters");
    expect(css).toContain(".cinematic-editorial--single");
    expect(css).toContain(".page-header-thread");
  });

  it("drives the single-image editorial reveal through the existing component", () => {
    const component = read("src/components/ui/ResponsiveEditorialImage.tsx");
    expect(component).toContain("cinematic-editorial--single");
    expect(component).toContain('data-cinematic-editorial="single"');
  });
});
