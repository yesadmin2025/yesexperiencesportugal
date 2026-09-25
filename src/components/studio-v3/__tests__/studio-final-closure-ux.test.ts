/**
 * P0-6 / P0-7 — reveal presentation and private-group hand-off contract.
 *
 * P0-6: the first reveal is the reward. Editing exists but starts collapsed,
 * and there is exactly ONE visible price authority (no indicative "from €…"
 * composer preview competing with the exact bookable total).
 *
 * P0-7: 13–14 travellers open the explicit premium private-group hand-off,
 * never the generic book lead sheet, and are never silently clamped to 12.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (file: string) =>
  fs.readFileSync(path.join(ROOT, "src/components/studio-v3", file), "utf8");

describe("P0-6 Your Day first reveal", () => {
  const studio = read("StudioV3.tsx");

  it("opens with editing collapsed", () => {
    expect(studio).toContain("const [refineOpen, setRefineOpen] = useState<boolean>(false)");
    expect(studio).not.toContain("const [refineOpen, setRefineOpen] = useState<boolean>(true)");
  });

  it("keeps editing reachable as a secondary action", () => {
    expect(studio).toContain("studio-v3-your-day-edit");
    expect(studio).toContain("setRefineOpen(true)");
  });

  it("shows no second, indicative price surface", () => {
    expect(studio).not.toContain("studio-v3-composer-price-preview");
    expect(studio).not.toContain("Composer preview");
    expect(studio).not.toContain("booking price shown above");
  });
});

/**
 * INSTANT-BOOKABLE PRODUCT TRUTH — the Studio never ends at a curator or
 * lead sheet. An unsellable fact (party above self-service, unsupported
 * pickup, stale availability) returns the traveller to the preflight, where
 * that fact can be changed, with an honest reason.
 */
describe("Instant-bookable closure", () => {
  const studio = read("StudioV3.tsx");

  it("never opens a lead sheet from the Studio flow", () => {
    expect(studio).not.toContain("openLeadSheet(");
  });

  it("keeps an oversized party on the reviewed summary instead of Stripe", () => {
    expect(studio).toContain("requiresCuratorParty(partyTotal)");
    const at = studio.indexOf("if (requiresCuratorParty(partyTotal))");
    const guard = studio.slice(at, at + 300);
    expect(guard).toContain("setCheckoutBlock(");
    expect(guard).toContain("return;");
  });

  it("never ejects a completed checkout summary when final validation blocks", () => {
    const start = studio.indexOf("const handleStripeCheckout = useCallback");
    const end = studio.indexOf("// Phase 7D", start);
    const checkoutSeam = studio.slice(start, end);
    expect(checkoutSeam).not.toContain("returnToPreflight(");
    expect(checkoutSeam).toContain("setCheckoutBlock(");
  });

  it("keeps a single in-Studio recovery path", () => {
    expect(studio).toContain("const returnToPreflight = useCallback");
    expect(studio).toContain('phase: "logistics"');
  });
});

/**
 * SURGICAL RELEASE FIX — no customer-visible curator hand-off in the normal
 * 1–12 Studio path. A non-certifiable composition routes back INSIDE Studio
 * (`onRefine` → logistics/preflight), never to a curator or lead sheet.
 */
describe("Your Day has no customer-visible curator CTA", () => {
  const studio = read("StudioV3.tsx");

  it("removes the curator copy from the reveal fallback", () => {
    expect(studio).not.toContain("Your Signature needs a human touch.");
    expect(studio).not.toContain("Continue with a curator");
    expect(studio).not.toContain("Have a curator confirm this day");
  });

  it("keeps the fail-closed fallback but routes it back into Studio", () => {
    expect(studio).toContain('data-testid="studio-v3-reveal-fallback"');
    expect(studio).toContain("This day needs one more adjustment.");
    expect(studio).not.toContain("remove or swap a moment");
  });

  it("never asks the traveller to repair a designed day", () => {
    expect(studio).not.toContain('data-testid="studio-v3-reserve-review-path"');
    expect(studio).not.toContain("remove or swap a moment");
    expect(studio).not.toContain("remove/swap a moment");
  });

  it("does not weaken the final checkout gates", () => {
    expect(studio).toContain("judgeFinalDayTime");
    expect(studio).toContain("frozenDayAllowsCheckout");
    expect(studio).toContain("certifyFrozenDayFromPickup");
  });
});
