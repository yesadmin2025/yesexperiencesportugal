import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function source(file: string): string {
  return fs.readFileSync(path.join(ROOT, "src/components/studio-v3", file), "utf8");
}

describe("P13 Studio mobile presentation contract", () => {
  it("uses one editorial choice column on phones and restores two columns on wider screens", () => {
    const choiceGrid = source("ChoiceGrid.tsx");

    expect(choiceGrid).toContain('columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"');
    expect(choiceGrid).toContain("min-h-[68px] sm:min-h-[64px]");
    expect(choiceGrid).toContain("text-[13px]");
  });

  it("keeps the mobile Back control clear of the safe area and makes Continue a full-width decision", () => {
    const chrome = source("PhaseChrome.tsx");

    expect(chrome).toContain("top-[max(10px,env(safe-area-inset-top))]");
    expect(chrome).toContain("w-full max-w-[520px]");
    expect(chrome).toContain("min-h-[52px]");
    expect(chrome).toContain("sm:w-auto");
  });

  it("gives mobile phases vertical breathing room without clipping vertical content", () => {
    const shell = source("PhaseShell.tsx");

    expect(shell).toContain("overflow-x-hidden");
    expect(shell).not.toContain("w-full overflow-hidden transition-opacity");
    expect(shell).toContain("env(safe-area-inset-top)");
    expect(shell).toContain("env(safe-area-inset-bottom)");
    expect(shell).toContain("hidden h-px w-12");
  });

  it("does not double-pad the Director's Read inside the already padded mobile shell", () => {
    const directorsRead = source("DirectorsRead.tsx");

    expect(directorsRead).toContain("px-0 py-6 sm:px-5 sm:py-14");
    expect(directorsRead).toContain("min-h-[56px] sm:min-h-[52px]");
    expect(directorsRead).toContain("text-balance text-[28px]");
  });

  it("strengthens the Your Day hierarchy specifically on the narrow surface", () => {
    const yourDay = source("YourDayFrame.tsx");
    const timeline = source("YourDayTimeline.tsx");

    expect(yourDay).toContain("text-[27px] sm:text-[30px]");
    expect(yourDay).toContain("text-[14px] sm:text-[13px]");
    expect(yourDay).toContain("max-w-[440px]");

    expect(timeline).toContain("pl-10 sm:pl-8");
    expect(timeline).toContain("h-[30px] w-[30px] sm:h-[26px] sm:w-[26px]");
    expect(timeline).toContain("text-[13.5px] sm:text-[13px]");
  });
});
