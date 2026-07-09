import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CtaPair } from "@/components/ui/CtaPair";

describe("CtaPair separator", () => {
  it("inserts an aria-hidden separator between adjacent CTA children", () => {
    const html = renderToStaticMarkup(
      <CtaPair>
        <a href="#a">Reserve this day</a>
        <a href="#b">Tailor this Signature</a>
      </CtaPair>,
    );

    // Both labels present
    expect(html).toContain("Reserve this day");
    expect(html).toContain("Tailor this Signature");

    // Separator span injected between them so text scrapers don't
    // flatten to "Reserve this dayTailor this Signature".
    const idxA = html.indexOf("Reserve this day");
    const idxB = html.indexOf("Tailor this Signature");
    const between = html.slice(idxA, idxB);
    expect(between).toMatch(/aria-hidden/);
    expect(between).toMatch(/·|,/);
  });

  it("does not append a trailing separator after the last child", () => {
    const html = renderToStaticMarkup(
      <CtaPair>
        <a href="#a">One</a>
        <a href="#b">Two</a>
      </CtaPair>,
    );
    // Exactly one separator span
    const matches = html.match(/aria-hidden="true"/g) ?? [];
    expect(matches.length).toBe(1);
  });
});
