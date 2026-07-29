import { describe, expect, it } from "vitest";
import { findDuplicateGroups } from "@/lib/image-swap/duplicates";
import type { PoolPhoto } from "@/lib/image-swap/pool";
import type { EditorialModuleKey, EditorialSlot } from "@/lib/editorial-overrides";

const slot = (src: string, i = 0): EditorialSlot => ({
  src,
  alt: `alt-${src}-${i}`,
  caption: `cap-${src}-${i}`,
});

describe("findDuplicateGroups", () => {
  it("flags exact src duplicates across modules", () => {
    const eff = new Map<EditorialModuleKey, EditorialSlot[]>([
      ["homepage_moments", [slot("A", 0), slot("B", 1)]],
      ["about_moments", [slot("A", 0)]],
    ]);
    const labels = new Map<EditorialModuleKey, string>([
      ["homepage_moments", "Homepage"],
      ["about_moments", "About"],
    ]);
    const groups = findDuplicateGroups(eff, labels, []);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("exact");
    expect(groups[0].usedIn).toHaveLength(2);
  });

  it("flags name-stem duplicates across modules for static assets", () => {
    const eff = new Map<EditorialModuleKey, EditorialSlot[]>([
      ["homepage_moments", [slot("url-1")]],
      ["about_moments", [slot("url-2")]],
    ]);
    const labels = new Map<EditorialModuleKey, string>([
      ["homepage_moments", "Homepage"],
      ["about_moments", "About"],
    ]);
    const pool: PoolPhoto[] = [
      {
        id: "1",
        src: "url-1",
        source: "owner-photo",
        name: "arrabida-viewpoint-women.jpeg",
        tags: [],
      },
      {
        id: "2",
        src: "url-2",
        source: "owner-photo",
        name: "arrabida-viewpoint-group.jpeg",
        tags: [],
      },
    ];
    const groups = findDuplicateGroups(eff, labels, pool);
    expect(groups.some((g) => g.kind === "name")).toBe(true);
  });

  it("does not flag stem duplicates that live inside the same module", () => {
    const eff = new Map<EditorialModuleKey, EditorialSlot[]>([
      ["homepage_moments", [slot("url-1"), slot("url-2")]],
    ]);
    const labels = new Map<EditorialModuleKey, string>([["homepage_moments", "Homepage"]]);
    const pool: PoolPhoto[] = [
      {
        id: "1",
        src: "url-1",
        source: "owner-photo",
        name: "arrabida-viewpoint-women.jpeg",
        tags: [],
      },
      {
        id: "2",
        src: "url-2",
        source: "owner-photo",
        name: "arrabida-viewpoint-group.jpeg",
        tags: [],
      },
    ];
    const groups = findDuplicateGroups(eff, labels, pool);
    expect(groups).toHaveLength(0);
  });
});
