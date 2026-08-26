import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}
function write(path, text) {
  fs.writeFileSync(path, text);
}
function replaceOnce(path, before, after, label) {
  const src = read(path);
  const first = src.indexOf(before);
  const last = src.lastIndexOf(before);
  if (first < 0) throw new Error(`${label}: marker not found in ${path}`);
  if (first !== last) throw new Error(`${label}: marker occurs more than once in ${path}`);
  write(path, src.slice(0, first) + after + src.slice(first + before.length));
}
function regexOnce(path, pattern, replacement, label) {
  const src = read(path);
  const matches = [...src.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))];
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match in ${path}, got ${matches.length}`);
  write(path, src.replace(pattern, replacement));
}

const studio = "src/components/studio-v3/StudioV3.tsx";
const composer = "src/components/studio-v3/ComposerMap.tsx";
const living = "src/components/studio-v3/LivingJourneyPanel.tsx";
const price = "src/components/studio-v3/SignaturePriceCard.tsx";

// 1) Public pre-value flow no longer mounts the investment ribbon.
replaceOnce(
  studio,
  'import { RunningInvestmentRibbon } from "./RunningInvestmentRibbon";\n',
  "",
  "remove ribbon import",
);
regexOnce(
  studio,
  /\n\s*<RunningInvestmentRibbon\n\s*state=\{state\}\n\s*hidden=\{composerHidden\}\n\s*totalEur=\{resolvedJourney\.totalEur\}\n\s*adultUnitEur=\{resolvedJourney\.adultUnitEur\}\n\s*guests=\{resolvedJourney\.guests\}\n\s*\/>/,
  "",
  "remove ribbon mount",
);

// 2) Why-this-fits belongs after the traveller has seen AND refined the day,
// immediately before the investment reveal.
const whyBlock = `        {/* Living Atlas intelligence — the same grounded reasoning that biased\n            the Signature choice, shown after the traveller has seen and refined\n            the day, immediately before the investment reveal. */}\n        <WhyRouteWorks\n          reasons={resolved.livingAtlasReasons ?? []}\n          testId="studio-v3-travel-file-reasons"\n          className="mx-auto mt-8 max-w-[520px]"\n        />\n\n`;
regexOnce(
  studio,
  /        \{\/\* Living Atlas intelligence — the same grounded reasoning that biased\n            the Signature choice, shown in the Travel File before the stops so\n            the traveller understands the day they are about to shape\. \*\/\}\n        <WhyRouteWorks\n          reasons=\{resolved\.livingAtlasReasons \?\? \[\]\}\n          testId="studio-v3-travel-file-reasons"\n          className="mx-auto mt-8 max-w-\[520px\]"\n        \/>\n\n/,
  "",
  "remove early why block",
);
replaceOnce(
  studio,
  `        {/* Signature DNA + Shaping direction removed on Refine — decorative\n            content belongs to the final reveal, not the decision page. */}\n\n        {/* ---------- Add-ons + Total (SignaturePriceCard refine variant) ---------- */}`,
  `${whyBlock}        {/* Signature DNA + Shaping direction removed on Refine — decorative\n            content belongs to the final reveal, not the decision page. */}\n\n        {/* ---------- Investment reveal (SignaturePriceCard refine variant) ---------- */}`,
  "insert why before investment",
);

// 3) ComposerMap: preserve value/progress, remove all pre-value money framing.
replaceOnce(composer, "  INVESTMENT_TIERS,\n", "", "composer unused investment tiers import");
replaceOnce(
  composer,
  "  const scopePriceFromEur = tour?.priceFrom ?? null;\n",
  "",
  "composer price source",
);
replaceOnce(
  composer,
  `  const investmentLabel = state.investment\n    ? getOptionLabel(INVESTMENT_TIERS, state.investment)\n    : null;\n  const statusLabel = state.rhythm\n    ? "Draft ready"\n    : investmentLabel\n      ? \`Investment direction: \${investmentLabel}\`\n      : "Composing your day";\n`,
  `  const statusLabel = state.rhythm ? "Draft ready" : "Composing your day";\n`,
  "composer investment status",
);
regexOnce(
  composer,
  /\n\s*\{scopePriceFromEur != null \? \(\n\s*<span[\s\S]*?From €\{scopePriceFromEur\} \/ guest[\s\S]*?<\/span>\n\s*\) : null\}/,
  "",
  "composer desktop price chip",
);
let composerText = read(composer)
  .replace("(region · stops · duration · From €N/guest).", "(region · stops · duration).")
  .replace("full editorial treatment.", "full editorial treatment, still value-first.");
write(composer, composerText);

// 4) LivingJourneyPanel: no price, approximate total, investment tier or
// budget signal before the canonical Your Day investment surface.
replaceOnce(living, "  INVESTMENT_TIERS,\n", "", "living unused investment tiers import");
replaceOnce(
  living,
  `  const investmentLabel = state.investment\n    ? getOptionLabel(INVESTMENT_TIERS, state.investment)\n    : null;\n`,
  "",
  "living investment label",
);
replaceOnce(
  living,
  `  const scopePriceFromEur =\n    resolvedTour?.priceFrom && resolvedTour.priceFrom > 0 ? resolvedTour.priceFrom : null;\n  const partyCount = state.guests && state.guests >= 2 ? state.guests : null;\n  const scopePartyTotalEur =\n    scopePriceFromEur && partyCount ? scopePriceFromEur * partyCount : null;\n`,
  "",
  "living price math",
);
replaceOnce(
  living,
  `  const scopeTrailing = scopePriceFromEur\n    ? \`\${scopeRegion ?? "Your day"} · from €\${scopePriceFromEur} / guest\`\n    : null;\n`,
  `  const scopeTrailing =\n    scopeRegion || scopeDuration || scopeStops > 0\n      ? [scopeRegion, scopeStops > 0 ? \`\${scopeStops} moments\` : null, scopeDuration]\n          .filter(Boolean)\n          .join(" · ")\n      : null;\n`,
  "living collapsed scope",
);
// Do not let the pre-value AI whisper receive an investment/budget signal.
replaceOnce(living, "      state.investment ?? \"\",\n", "", "living story key investment");
replaceOnce(living, "    state.investment,\n", "", "living story key dependency investment");
replaceOnce(living, "          investment: state.investment,\n", "", "living AI input investment");
// Remove drawer props/call-site price and investment fields.
for (const [needle, label] of [
  ["              investmentLabel={investmentLabel}\n", "living call investment prop"],
  ["              scopePriceFromEur={scopePriceFromEur}\n", "living call price prop"],
  ["              scopePartyCount={partyCount}\n", "living call party count prop"],
  ["              scopePartyTotalEur={scopePartyTotalEur}\n", "living call approximate total prop"],
  ["  investmentLabel: string | null;\n", "living interface investment prop"],
  ["  scopePriceFromEur: number | null;\n", "living interface price prop"],
  ["  scopePartyCount: number | null;\n", "living interface party count prop"],
  ["  scopePartyTotalEur: number | null;\n", "living interface total prop"],
  ["  investmentLabel,\n", "living destructure investment"],
  ["  scopePriceFromEur,\n", "living destructure price"],
  ["  scopePartyCount,\n", "living destructure party count"],
  ["  scopePartyTotalEur,\n", "living destructure total"],
]) replaceOnce(living, needle, "", label);
replaceOnce(
  living,
  "          {scopeRegion || scopeDuration || scopeStops > 0 || scopePriceFromEur ? (\n",
  "          {scopeRegion || scopeDuration || scopeStops > 0 ? (\n",
  "living scope condition",
);
// Remove the entire monetary disclosure inside Scope so far.
regexOnce(
  living,
  /\n\s*\{scopePriceFromEur \? \([\s\S]*?Experience Investment — shaped with you\.[\s\S]*?\)\}\n/,
  "\n",
  "living scope investment disclosure",
);
// Remove the separate visible investment tier line near the drawer CTA.
regexOnce(
  living,
  /\n\s*\{\/\* Investment — label only, only after selection \*\/\}\n\s*\{investmentLabel \? \([\s\S]*?\) : null\}\n/,
  "\n",
  "living visible investment tier",
);
let livingText = read(living)
  .replace(
    "investment tier (only once selected), and a stylised",
    "region and duration context, and a stylised",
  )
  .replace(
    "region · stops · duration · \"from €N / guest\" — never invented.",
    "region · stops · duration — never invented.",
  )
  .replace(
    "// Investment — label only, only after selection",
    "// Value-first: investment is intentionally withheld until Your Day",
  );
write(living, livingText);

// 5) Price card disclosure copy only. Numbers and math are untouched.
replaceOnce(
  price,
  `              {formatGuestComposition(adults, minorAges, partyCount) ??\n                (partyCount != null\n                  ? \`For \${partyCount} \${partyCount === 1 ? "guest" : "guests"}\`\n                  : "Per guest")}\n`,
  `              {(() => {\n                const composition = formatGuestComposition(adults, minorAges, partyCount);\n                if (composition) return \`Estimated for \${composition}\`;\n                return partyCount != null\n                  ? \`Estimated for \${partyCount} \${partyCount === 1 ? "guest" : "guests"}\`\n                  : "Estimated per guest";\n              })()}\n`,
  "price context copy",
);

console.log("P9 Price After Value patch applied successfully.");
