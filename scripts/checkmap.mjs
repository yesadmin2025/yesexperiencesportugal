// Extract only labels from raw files - avoid importing tour blueprint which pulls .jpg
import fs from "fs";
const sotFile = fs.readFileSync("src/data/signatureToursSourceOfTruth.ts", "utf8");
const geoFile = fs.readFileSync("src/data/stopGeo.ts", "utf8");

const geoKeys = [...geoFile.matchAll(/^\s*"?([a-zA-Z0-9\u00C0-\u017F&\-\s']+?)"?:\s*\{ lat/gm)].map(
  (m) => m[1].toLowerCase(),
);
// crude - just check SoT labels vs geo aliases
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u017f\s]/gi, "")
    .trim();
const geoSet = new Set(geoKeys.map(norm));

// SoT tour blocks
const blocks = [
  ...sotFile.matchAll(
    /"([a-z\-]+)":\s*\{[\s\S]*?itinerary:\s*\[([\s\S]*?)\]\s*,\s*\n\s*durationMinutes/g,
  ),
];
for (const [, id, itin] of blocks) {
  const labels = [...itin.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const miss = labels.filter((l) => {
    const n = norm(l);
    return ![...geoSet].some((k) => n.includes(k) || k.includes(n));
  });
  console.log(id, `stops=${labels.length} unresolved=${miss.length}`);
  if (miss.length) console.log("  MISS:", miss);
}
