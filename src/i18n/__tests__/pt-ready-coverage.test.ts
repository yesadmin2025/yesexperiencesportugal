/**
 * Verifies the language switcher's PT-ready registry stays in sync with
 * the actual `/pt/*` route files on disk.
 *
 * The switcher (src/components/LanguageSwitcher.tsx) offers PT when
 * `isPtReady(localeNeutralPath)` is true and hides it (muted "coming
 * soon") otherwise. That contract only holds if every `pt.*.tsx` route
 * — translated page OR redirect stub — is listed in READY_PATHS, and if
 * nothing else is falsely listed.
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { isPtReady, PT_READY_PATHS } from "@/i18n/pt-ready";

const ROUTES_DIR = join(process.cwd(), "src/routes");

/** Filenames that live under /pt but are NOT user-facing pages. */
const NON_PAGE_PT_FILES = new Set<string>([
  "pt.tsx", // /pt layout wrapper
  "pt.$.tsx", // /pt/* splat catch-all → redirects unknown paths
]);

/**
 * Convert a TanStack flat-route filename like `pt.day-tours.tsx` into
 * its locale-neutral path (`/day-tours`). `pt.index.tsx` → `/`.
 */
function ptFileToNeutralPath(filename: string): string | null {
  if (!filename.startsWith("pt.") || !filename.endsWith(".tsx")) return null;
  if (NON_PAGE_PT_FILES.has(filename)) return null;
  const stem = filename.slice(3, -".tsx".length); // strip `pt.` and `.tsx`
  if (stem === "index") return "/";
  // Flat routes: dots → slashes. e.g. `tours.$tourId` → `/tours/$tourId`.
  return "/" + stem.split(".").join("/");
}

function listPtPageFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => f.startsWith("pt.") && f.endsWith(".tsx"))
    .filter((f) => !NON_PAGE_PT_FILES.has(f));
}

describe("LanguageSwitcher / pt-ready coverage", () => {
  it("every /pt/* route file has a matching entry in READY_PATHS", () => {
    const files = listPtPageFiles();
    expect(files.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const file of files) {
      const path = ptFileToNeutralPath(file);
      if (!path) continue;
      if (!isPtReady(path)) missing.push(`${file} → ${path}`);
    }

    expect(
      missing,
      `These /pt/* routes exist on disk but are NOT in READY_PATHS, so the ` +
        `language switcher will hide PT on their EN counterparts:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every READY_PATHS entry has a matching /pt/* route file", () => {
    const files = listPtPageFiles();
    const neutralPathsOnDisk = new Set(
      files.map(ptFileToNeutralPath).filter((p): p is string => p !== null),
    );

    const stale: string[] = [];
    for (const path of PT_READY_PATHS) {
      if (!neutralPathsOnDisk.has(path)) stale.push(path);
    }

    expect(
      stale,
      `READY_PATHS lists these paths but no matching pt.*.tsx exists — the ` +
        `switcher would link to a 404:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("hides PT on routes with no Portuguese version", () => {
    // Sample of EN-only pages that should NOT surface PT until translated.
    const englishOnly = [
      "/multi-day",
      "/press",
      "/local-stories",
      "/experience-studio",
      "/builder",
      "/portugal-tours",
      "/luxury-tours-portugal",
      "/wine-tours-lisbon",
    ];
    for (const path of englishOnly) {
      expect(isPtReady(path), `expected ${path} to be NOT pt-ready`).toBe(false);
    }
  });

  it("treats empty path as `/` (home)", () => {
    expect(isPtReady("")).toBe(true);
    expect(isPtReady("/")).toBe(true);
  });
});
