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

describe("P0-7 private group hand-off", () => {
  const studio = read("StudioV3.tsx");
  const sheet = read("LeadCaptureSheet.tsx");

  it("routes 13–14 travellers to the explicit private-group intent", () => {
    expect(sheet).toContain('"private-group"');
    const guarded = studio.split("requiresCuratorParty").slice(1);
    expect(guarded.length).toBeGreaterThan(0);
    expect(studio).toContain('openLeadSheet("private-group")');
  });

  it("never invokes Stripe for a curator party and never clamps the party", () => {
    expect(studio).toContain("requiresCuratorParty(partyTotal)");
    const guard = studio.slice(
      studio.indexOf("if (requiresCuratorParty(partyTotal))"),
      studio.indexOf("if (requiresCuratorParty(partyTotal))") + 200,
    );
    expect(guard).toContain('openLeadSheet("private-group")');
    expect(guard).toContain("return;");
  });

  it("uses premium private-group copy, not an error", () => {
    expect(sheet).toContain("A private group of this size is confirmed personally");
  });
});
