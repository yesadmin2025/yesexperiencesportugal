import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");

const MODULES = [
  "questionOptionCatalog.ts",
  "directorContext.ts",
  "questionUncertainty.ts",
  "studioQuestionDirector.ts",
] as const;

const FORBIDDEN_FOR_ALL = [
  "capabilityMatrix",
  "publicRefinementPaths",
  "reachabilitySimulator",
  "adaptiveQuestions",
];

const FORBIDDEN_FOR_CATALOG = [
  "studioQuestionDirector",
  "directorContext",
  "questionUncertainty",
];

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const re = /(?:import|export)[\s\S]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    specifiers.push(match[1] ?? match[2]);
  }
  return specifiers;
}

describe("Pass 2 — Z. static architecture boundaries", () => {
  for (const file of MODULES) {
    it(`${file} does not import forbidden upward modules`, () => {
      const source = readFileSync(resolve(ROOT, file), "utf8");
      const specifiers = importSpecifiers(source);
      expect(specifiers.length).toBeGreaterThan(0);
      for (const specifier of specifiers) {
        for (const forbidden of FORBIDDEN_FOR_ALL) {
          expect(
            specifier.includes(forbidden),
            `${file} must not import ${forbidden} (${specifier})`,
          ).toBe(false);
        }
      }
    });
  }

  it("questionOptionCatalog stays a leaf module", () => {
    const source = readFileSync(resolve(ROOT, "questionOptionCatalog.ts"), "utf8");
    for (const specifier of importSpecifiers(source)) {
      for (const forbidden of FORBIDDEN_FOR_CATALOG) {
        expect(specifier.includes(forbidden), `catalog must not import ${forbidden}`).toBe(false);
      }
    }
  });

  it("director does not import a context resolver upward", () => {
    const source = readFileSync(resolve(ROOT, "studioQuestionDirector.ts"), "utf8");
    expect(source.includes("buildDirectorContext")).toBe(false);
  });

  it("the four modules perform no I/O or state writes", () => {
    for (const file of MODULES) {
      const source = readFileSync(resolve(ROOT, file), "utf8");
      for (const banned of ["fetch(", "localStorage", "Date.now", "Math.random", "supabase"]) {
        expect(source.includes(banned), `${file} must not use ${banned}`).toBe(false);
      }
    }
  });
});
