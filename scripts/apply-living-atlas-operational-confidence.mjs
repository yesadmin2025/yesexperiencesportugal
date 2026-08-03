import { readFile, writeFile } from "node:fs/promises";

const path = "src/components/studio-v3/LivingAtlasShapeStep.tsx";
let source = await readFile(path, "utf8");

function replaceOnce(anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first === -1) throw new Error(`Could not find patch anchor: ${label}`);
  if (source.indexOf(anchor, first + anchor.length) !== -1) {
    throw new Error(`Patch anchor is not unique: ${label}`);
  }
  source = source.replace(anchor, replacement);
}

replaceOnce(
  'import type { LivingAtlasRoutePlan } from "@/components/studio-v3/livingAtlasRoutePlanner";',
  'import { deriveLivingAtlasPaceSummary } from "@/components/studio-v3/livingAtlasOperationalConfidence";\nimport type { LivingAtlasRoutePlan } from "@/components/studio-v3/livingAtlasRoutePlanner";',
  "operational confidence model import",
);

replaceOnce(
  'import {\n  incomingLivingAtlasRouteLeg,\n  LivingAtlasRouteSummary,\n} from "@/components/studio-v3/LivingAtlasRouteSummary";',
  'import {\n  LivingAtlasOperationalBadges,\n  LivingAtlasPaceCard,\n} from "@/components/studio-v3/LivingAtlasOperationalConfidence";\nimport {\n  incomingLivingAtlasRouteLeg,\n  LivingAtlasRouteSummary,\n} from "@/components/studio-v3/LivingAtlasRouteSummary";',
  "operational confidence UI import",
);

replaceOnce(
  '  const title = livingAtlasPreviewDayTitle({ moments: orderedMoments });',
  '  const title = livingAtlasPreviewDayTitle({ moments: orderedMoments });\n  const paceSummary = deriveLivingAtlasPaceSummary({\n    density: preferences.density,\n    stopMinutes: composition.totalDurationMin,\n    transferMinutes: routePlan.totalEstimatedDrivingMin,\n    routeStatus: routePlan.status,\n  });',
  "pace summary derivation",
);

replaceOnce(
  '          <LivingAtlasRouteSummary routePlan={routePlan} />',
  '          <LivingAtlasRouteSummary routePlan={routePlan} />\n          <LivingAtlasPaceCard summary={paceSummary} />',
  "pace card placement",
);

replaceOnce(
  '                            ))}\n                        </div>\n                      </div>\n                      <span',
  '                            ))}\n                        </div>\n                        <div className="mt-3">\n                          <LivingAtlasOperationalBadges type={moment.type} />\n                        </div>\n                      </div>\n                      <span',
  "moment operational badges",
);

replaceOnce(
  '                              {alternative.explanation}\n                            </p>\n                            <button',
  '                              {alternative.explanation}\n                            </p>\n                            <div className="mt-3">\n                              <LivingAtlasOperationalBadges\n                                type={alternative.moment.type}\n                                compact\n                              />\n                            </div>\n                            <button',
  "alternative operational badges",
);

await writeFile(path, source);
console.log("Applied Living Atlas operational confidence UI.");
