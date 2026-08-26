import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = fs.readFileSync(
  path.join(process.cwd(), "src/routes/admin.studio-v3-funnel.tsx"),
  "utf8",
);

describe("P14 · experiment dashboard", () => {
  it("surfaces the primary Your Day handoff metric and downstream validation", () => {
    expect(dashboardSource).toContain("P14 Your Day CTA");
    expect(dashboardSource).toContain("Handoff / Your Day");
    expect(dashboardSource).toContain("Guest details / Your Day");
    expect(dashboardSource).toContain("variant.handoffClicked");
    expect(dashboardSource).toContain("variant.handoffRate");
    expect(dashboardSource).toContain("variant.guestDetailsReached");
    expect(dashboardSource).toContain("variant.guestDetailsRate");
  });

  it("explains the experiment denominator instead of presenting raw click counts as conversion", () => {
    expect(dashboardSource).toContain("handoff rate uses Your Day reach as its denominator");
    expect(dashboardSource).toContain("repeated clicks do not inflate");
  });
});
