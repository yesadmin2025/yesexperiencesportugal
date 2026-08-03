import { readFile, writeFile } from "node:fs/promises";

const path = "scripts/apply-living-atlas-product-layer.mjs";
let source = await readFile(path, "utf8");

const replacements = [
  [
    "                                `${moment.label} was removed and the original moment was restored.`,",
    '                                moment.label + " was removed and the original moment was restored.",',
  ],
  [
    "                            aria-controls={`living-atlas-alternatives-${moment.slotId}`}",
    '                            aria-controls={"living-atlas-alternatives-" + moment.slotId}',
  ],
  [
    '                            {expanded ? "Hide alternatives" : `${alternatives.length} alternatives`}',
    '                            {expanded ? "Hide alternatives" : alternatives.length + " alternatives"}',
  ],
  [
    "                        id={`living-atlas-alternatives-${moment.slotId}`}",
    '                        id={"living-atlas-alternatives-" + moment.slotId}',
  ],
  [
    "                        aria-label={`Alternatives to ${moment.label}`}",
    '                        aria-label={"Alternatives to " + moment.label}',
  ],
  [
    "                              aria-label={`Replace ${moment.label} with ${alternative.moment.label}`}",
    '                              aria-label={"Replace " + moment.label + " with " + alternative.moment.label}',
  ],
  [
    "                                  `${moment.label} was replaced by ${alternative.moment.label}. The title, duration and coverage were recalculated.`,",
    '                                  moment.label + " was replaced by " + alternative.moment.label + ". The title, duration and coverage were recalculated.",',
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Missing nested-template anchor: ${before}`);
  }
  source = source.replace(before, after);
}

await writeFile(path, source);
console.log("Sanitized nested template strings in Living Atlas product-layer patch.");
