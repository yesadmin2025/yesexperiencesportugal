import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/studio-v3/LivingAtlasJourneyPreview.tsx";
let source = readFileSync(path, "utf8");

const opening = `            routePlan ? (\n              <ShapeStep`;
const openingReplacement = `            routePlan ? (\n              <>\n                <ShapeStep`;
if (!source.includes(opening)) throw new Error("Missing Living Atlas shape fragment opening");
source = source.replace(opening, openingReplacement);

const closing = `                  opens Stripe sandbox only.\n                </p>\n              </div>\n            ) : null}`;
const closingReplacement = `                  opens Stripe sandbox only.\n                </p>\n              </div>\n              </>\n            ) : null}`;
if (!source.includes(closing)) throw new Error("Missing Living Atlas shape fragment closing");
source = source.replace(closing, closingReplacement);

writeFileSync(path, source);
console.log("Living Atlas checkout JSX wrapped.");
