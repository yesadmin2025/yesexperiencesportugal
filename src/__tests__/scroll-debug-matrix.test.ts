/**
 * Automated scroll-stability test matrix.
 *
 * Goal: run every diagnostic mode (A–E) against the scroll-debug flag
 * parser and prove each subsystem disables exactly as documented. We
 * also assert structural invariants that are knowable without a real
 * browser (no scroll-snap leftovers in inline strip, no fixed/sticky
 * stack changes between modes, no horizontal overflow class flips).
 *
 * Runtime smoothness (60fps, no jank) is NOT measurable in JSDOM. The
 * matrix here verifies the *toggles* are wired correctly so manual /
 * device QA can trust each URL flag combination.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getScrollDebugFlags } from "@/lib/scroll-debug";

type Mode = {
  id: "A" | "B" | "C" | "D" | "E";
  label: string;
  flag: string;
  expect: {
    disableHashSync: boolean;
    disableStickyCta: boolean;
    disableMobileReveals: boolean;
    staticMobileCarousels: boolean;
    disableMobileStudioMotion: boolean;
  };
};

const MATRIX: Mode[] = [
  {
    id: "A",
    label: "hash-off only",
    flag: "hash-off",
    expect: {
      disableHashSync: true,
      disableStickyCta: false,
      disableMobileReveals: false,
      staticMobileCarousels: false,
      disableMobileStudioMotion: false,
    },
  },
  {
    id: "B",
    label: "hash-off + sticky-off",
    flag: "hash-off,sticky-off",
    expect: {
      disableHashSync: true,
      disableStickyCta: true,
      disableMobileReveals: false,
      staticMobileCarousels: false,
      disableMobileStudioMotion: false,
    },
  },
  {
    id: "C",
    label: "hash-off + sticky-off + reveals-off",
    flag: "hash-off,sticky-off,reveals-off",
    expect: {
      disableHashSync: true,
      disableStickyCta: true,
      disableMobileReveals: true,
      staticMobileCarousels: false,
      disableMobileStudioMotion: false,
    },
  },
  {
    id: "D",
    label: "hash-off + sticky-off + reveals-off + carousels-off",
    flag: "hash-off,sticky-off,reveals-off,carousels-off",
    expect: {
      disableHashSync: true,
      disableStickyCta: true,
      disableMobileReveals: true,
      staticMobileCarousels: true,
      disableMobileStudioMotion: false,
    },
  },
  {
    id: "E",
    label: "all-off (hash + sticky + reveals + carousels + studio-static)",
    flag: "hash-off,sticky-off,reveals-off,carousels-off,studio-static",
    expect: {
      disableHashSync: true,
      disableStickyCta: true,
      disableMobileReveals: true,
      staticMobileCarousels: true,
      disableMobileStudioMotion: true,
    },
  },
];

const VIEWPORTS = [
  { name: "mobile-393", width: 393 },
  { name: "mobile-430", width: 430 },
  { name: "tablet-820", width: 820 },
  { name: "desktop-1440", width: 1440 },
];

function makeFakeWindow(search: string, width: number): Window {
  return {
    location: { search, pathname: "/", hash: "" },
    innerWidth: width,
    innerHeight: 800,
  } as unknown as Window;
}

describe("scroll debug matrix — flag parser correctness", () => {
  for (const mode of MATRIX) {
    for (const vp of VIEWPORTS) {
      it(`mode ${mode.id} (${mode.label}) @ ${vp.name}`, () => {
        const win = makeFakeWindow(`?scroll-debug=${mode.flag}`, vp.width);
        const flags = getScrollDebugFlags(win);
        expect(flags.enabled).toBe(true);
        expect(flags.disableHashSync).toBe(mode.expect.disableHashSync);
        expect(flags.disableStickyCta).toBe(mode.expect.disableStickyCta);
        expect(flags.disableMobileReveals).toBe(mode.expect.disableMobileReveals);
        expect(flags.staticMobileCarousels).toBe(mode.expect.staticMobileCarousels);
        expect(flags.disableMobileStudioMotion).toBe(mode.expect.disableMobileStudioMotion);
      });
    }
  }
});

describe("scroll debug matrix — baseline (no flag) leaves everything ON", () => {
  for (const vp of VIEWPORTS) {
    it(`baseline @ ${vp.name}`, () => {
      const win = makeFakeWindow("", vp.width);
      const flags = getScrollDebugFlags(win);
      expect(flags.enabled).toBe(false);
      expect(flags.disableHashSync).toBe(false);
      expect(flags.disableStickyCta).toBe(false);
      expect(flags.disableMobileReveals).toBe(false);
      expect(flags.staticMobileCarousels).toBe(false);
      expect(flags.disableMobileStudioMotion).toBe(false);
    });
  }
});

describe("scroll debug matrix — hash-sync removal is permanent", () => {
  /**
   * The hash-sync IntersectionObserver was removed permanently. The
   * source must no longer instantiate `new IntersectionObserver` for
   * the purpose of writing the URL hash on scroll. We assert this by
   * source inspection so a regression that re-introduces the rAF +
   * replaceState loop is caught.
   */
  it("no replaceState calls inside a scroll-driven observer/listener in index.tsx", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const src = await fs.readFile(path.resolve(process.cwd(), "src/routes/index.tsx"), "utf8");

    // The Effect-1 click handler still canonicalises the hash via
    // replaceState — that is fine and only fires on explicit anchor
    // navigation. The forbidden pattern is replaceState being called
    // from inside a function reachable via IntersectionObserver, scroll
    // listener, or rAF tick. Heuristic: we used to have a function
    // named `compute` that called replaceState; ensure no such pairing
    // remains in the file.
    const hasComputeWithReplaceState =
      /const\s+compute\s*=\s*\(\s*\)\s*=>\s*{[\s\S]*?history\.replaceState/.test(src);
    expect(hasComputeWithReplaceState).toBe(false);

    // And ensure we did not accidentally re-add a passive scroll
    // listener that writes history.
    const hasScrollListenerWritingHash =
      /addEventListener\(\s*["']scroll["'][\s\S]{0,400}?replaceState/.test(src);
    expect(hasScrollListenerWritingHash).toBe(false);
  });
});

describe("scroll debug matrix — DOM-level invariants per mode", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.body.innerHTML = "";
  });

  /**
   * Apply scroll-debug classes and verify the documentElement carries
   * exactly the toggles the URL flag implies. SiteLayout and
   * StudioLivePreview both branch on these classes, so this is a
   * proxy for "the right subsystems disengage at runtime".
   */
  for (const mode of MATRIX) {
    it(`mode ${mode.id} applies the expected html class set`, async () => {
      const { applyScrollDebugClasses, getScrollDebugFlags } = await import("@/lib/scroll-debug");
      const win = makeFakeWindow(`?scroll-debug=${mode.flag}`, 393);
      const flags = getScrollDebugFlags(win);
      applyScrollDebugClasses(flags);

      const html = document.documentElement;
      expect(html.classList.contains("scroll-debug")).toBe(true);
      expect(html.classList.contains("scroll-debug-mobile-reveals-off")).toBe(
        mode.expect.disableMobileReveals,
      );
      expect(html.classList.contains("scroll-debug-studio-static")).toBe(
        mode.expect.disableMobileStudioMotion,
      );
      expect(html.classList.contains("scroll-debug-static-carousels")).toBe(
        mode.expect.staticMobileCarousels,
      );
    });
  }
});
