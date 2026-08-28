import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Guardrail: no code outside the approved migration/tooling list may read the
 * legacy `overview` / `highlights` / `included` / `itinerary` fields directly
 * from a SignatureTour object.
 *
 * This scanner uses the TypeScript AST. It ignores comments, prose strings,
 * unrelated objects that happen to use the same property names, and content
 * returned by the canonical `getTourContent()` helper. It still catches real
 * `tour.included` / `selectedTour.highlights` style reads.
 */

const APPROVED = new Set<string>([
  "src/lib/tourContent.ts",
  "src/lib/checkout/inclusions.ts",
  "src/lib/viatorValidation.ts",
  "src/i18n/tour-i18n.ts",
  "src/server/tourImporter.server.ts",
  "src/routes/tours.$tourId.tsx",
  "src/components/SimpleBookingForm.tsx",
  "src/components/studio-v3/FinalRevealStory.tsx",
  "src/components/studio-v3/StudioV3.tsx",
  "src/components/studio-v3/signatureStorySnapshot.ts",
  "src/__tests__/sot-geo-coverage.test.ts",
  "src/__tests__/sot-viator-parity.test.ts",
  "src/lib/stop-parity.ts",
  "src/routes/api/public/hooks/viator-drift-check.ts",
  "src/__tests__/tour-content-direct-reads.test.ts",
  "src/lib/publicItineraryProjection.ts",
  "src/__tests__/public-itinerary-winery-pool.test.ts",
]);

const APPROVED_PREFIXES = [
  "src/data/",
  "src/routes/admin.",
  "src/lib/checkout/__tests__/",
  "src/lib/__tests__/tourContent",
];

const LEGACY_FIELDS = new Set(["overview", "highlights", "included", "itinerary"]);
const REPOSITORY_ROOT = path.resolve(__dirname, "../..");
const SOURCE_ROOT = path.join(REPOSITORY_ROOT, "src");

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(absolute));
      continue;
    }
    if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

function isApproved(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  if (APPROVED.has(normalized)) return true;
  return APPROVED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isGetTourContentCall(node: ts.Node | undefined): boolean {
  if (!node || !ts.isCallExpression(node)) return false;
  return ts.isIdentifier(node.expression) && node.expression.text === "getTourContent";
}

function collectCanonicalContentVariables(sourceFile: ts.SourceFile): Set<string> {
  const canonical = new Set<string>();

  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      isGetTourContentCall(node.initializer)
    ) {
      canonical.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return canonical;
}

function receiverIsCanonical(receiver: ts.Expression, canonicalVariables: Set<string>): boolean {
  if (isGetTourContentCall(receiver)) return true;
  if (ts.isParenthesizedExpression(receiver)) {
    return receiverIsCanonical(receiver.expression, canonicalVariables);
  }
  return ts.isIdentifier(receiver) && canonicalVariables.has(receiver.text);
}

/**
 * The four guarded property names are common in other domains too: a route
 * handoff has an itinerary, an extraction has highlights, and winery rules
 * have included counts. Only receivers whose identifier path explicitly
 * denotes a tour/signature are candidates for this legacy-content rule.
 */
function receiverLooksLikeTour(receiver: ts.Expression, sourceFile: ts.SourceFile): boolean {
  const text = receiver.getText(sourceFile);
  const identifiers = text.match(/[A-Za-z_$][\w$]*/g) ?? [];
  return identifiers.some((identifier) => /tour|signature/i.test(identifier));
}

function propertyName(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
): string | null {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  const argument = node.argumentExpression;
  if (
    !argument ||
    (!ts.isStringLiteral(argument) && !ts.isNoSubstitutionTemplateLiteral(argument))
  ) {
    return null;
  }
  return argument.text;
}

function directLegacyReads(absolute: string): string[] {
  const relative = path.relative(REPOSITORY_ROOT, absolute).replace(/\\/g, "/");
  if (isApproved(relative)) return [];

  const source = fs.readFileSync(absolute, "utf8");
  const scriptKind = absolute.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    relative,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const canonicalVariables = collectCanonicalContentVariables(sourceFile);
  const violations: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const field = propertyName(node);
      if (
        field &&
        LEGACY_FIELDS.has(field) &&
        receiverLooksLikeTour(node.expression, sourceFile) &&
        !receiverIsCanonical(node.expression, canonicalVariables)
      ) {
        const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const receiver = node.expression.getText(sourceFile);
        violations.push(
          `${relative}:${location.line + 1}:${location.character + 1} ${receiver}.${field}`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

describe("tour content — no unapproved direct legacy reads", () => {
  it("routes Signature content reads through getTourContent", () => {
    const violations = sourceFiles(SOURCE_ROOT).flatMap(directLegacyReads);

    if (violations.length) {
      throw new Error(
        "Direct legacy Signature content reads found outside approved migration/tooling files. " +
          "Use getTourContent(tourId) from @/lib/tourContent instead.\n\n" +
          violations.map((violation) => `  ${violation}`).join("\n"),
      );
    }

    expect(violations).toEqual([]);
  });
});
