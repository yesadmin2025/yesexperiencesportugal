import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/studioMobileA11y.css"),
  "utf8",
);
const studio = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

describe("Studio V3 price handoff", () => {
  it("keeps the public Your Day price card on the refine surface", () => {
    expect(studio).toContain("<SignaturePriceCard");
    expect(studio).toContain('variant="refine"');
  });

  it("shows the lower resolved total only after additions exist", () => {
    expect(css).toContain(
      '[data-testid="studio-v3-signature-card"]:not(:has([data-testid="studio-v3-add-on-lines-refine"]))',
    );
    expect(css).toContain('[data-testid="studio-v3-final-total"]');
    expect(css).toContain("display: none");
  });

  it("yields the top party total to the final total after additions", () => {
    expect(css).toContain(
      '[data-testid="studio-v3-signature-card"]:has([data-testid="studio-v3-add-on-lines-refine"])',
    );
    expect(css).toContain('[data-testid="studio-v3-party-total"]');
  });

  it("keeps the ledger breakdown without repeating the final total", () => {
    const ledgerRule = css.slice(
      css.indexOf(
        '[data-testid="studio-v3-final-total"]\n  [data-testid="studio-v3-investment-ledger"]',
      ),
    );
    expect(ledgerRule).toContain('div:has([data-testid="studio-v3-ledger-total"])');
    expect(ledgerRule).toContain("display: none");
  });

  it("keeps the intermediate add-on total accessible but not visually repetitive", () => {
    expect(css).toContain('[data-testid="studio-v3-add-ons-total"]');
    expect(css).toContain("position: absolute !important");
    expect(css).toContain("clip: rect(0, 0, 0, 0) !important");
  });

  it("does not hide the base per-adult anchor", () => {
    const priceRules = css.slice(css.indexOf("/* Price handoff"));
    expect(priceRules).not.toContain('[data-testid="studio-v3-base-price"]');
  });
});
