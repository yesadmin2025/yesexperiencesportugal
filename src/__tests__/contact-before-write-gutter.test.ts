import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

// Mobile gutters: the "Before you write" block sits under the contact form and
// must share the same 20px edge padding as every other section, otherwise its
// links land flush against the phone screen edge.
describe("contact page mobile gutters", () => {
  it("gives the before-you-write block the shared side padding", () => {
    const src = read("src/routes/contact.tsx");
    const anchor = src.indexOf("Before you write");
    expect(anchor, "before-you-write block must exist").toBeGreaterThan(-1);

    const blockStart = src.lastIndexOf("<div", anchor);
    const block = src.slice(blockStart, src.indexOf(">", blockStart));
    expect(block, "before-you-write container must use container-x").toContain("container-x");
  });

  it("keeps the block one shared container instead of a raw max-width", () => {
    const src = read("src/routes/contact.tsx");
    const anchor = src.indexOf("Before you write");
    const blockStart = src.lastIndexOf("<div", anchor);
    const block = src.slice(blockStart, src.indexOf(">", blockStart));
    expect(block).not.toMatch(/className="mx-auto/);
  });
});
