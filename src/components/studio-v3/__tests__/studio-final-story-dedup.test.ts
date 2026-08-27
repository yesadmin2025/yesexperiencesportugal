import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const studio = readFileSync(resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"), "utf8");
const mobileCss = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/studioMobileA11y.css"),
  "utf8",
);

describe("Studio final storyboard story dedup", () => {
  it("keeps stop story data in the editor source rather than deleting downstream truth", () => {
    expect(studio).toContain("{s.story}");
    expect(studio).toContain('data-testid="studio-v3-stop-rationale"');
  });

  it("suppresses only the duplicate visual story paragraph inside editable stop rows", () => {
    expect(mobileCss).toContain('[data-testid="studio-v3-stop-row"]');
    expect(mobileCss).toContain('p[class~="mt-0.5"][class~="text-[12px]"]');
    expect(mobileCss).toMatch(/p\[class~="mt-0\.5"\]\[class~="text-\[12px\]"\][^{]*\{\s*display:\s*none;/s);
  });

  it("does not hide the genuinely new composer rationale", () => {
    expect(mobileCss).not.toMatch(/studio-v3-stop-rationale[^}]*display:\s*none/s);
  });
});
