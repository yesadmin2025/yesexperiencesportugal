import { describe, it } from "vitest";
import { resolveStudioV3Route, applyReplacementCandidates } from "@/components/studio-v3/curation";
import { REGION_STOP_POOL } from "@/data/regionStopPool";

const scenarios = [
  { name: "Couple / wine / slow",   input: { feeling: "wine-food" as const, companions: "couple" as const,  rhythm: "slow" as const,     interests: ["wine","gastronomy"] as const, pickup: "lisbon" as const } },
  { name: "Solo / culture / balanced", input: { feeling: "culture" as const,   companions: "solo" as const,    rhythm: "balanced" as const, interests: ["heritage"] as const,         pickup: "lisbon" as const } },
  { name: "Friends / coast / full",    input: { feeling: "coastal" as const,   companions: "friends" as const, rhythm: "full" as const,     interests: ["coast","nature"] as const,   pickup: "lisbon" as const } },
];

describe("Phase 5E flag-ON dry run", () => {
  for (const s of scenarios) {
    it(s.name, () => {
      const route = resolveStudioV3Route(s.input);
      const original = route.routePoints.map(p => p.label);
      const composed = applyReplacementCandidates(route.routePoints, {
        skeletonTourId: route.skeletonTourKey!,
        interests: s.input.interests as any,
        rhythm: s.input.rhythm,
        companions: s.input.companions,
        investment: "elevated" as const,
        considerations: [],
      });
      const finalLabels = composed.map(p => p.label);
      const changes: string[] = [];
      for (let i = 0; i < original.length; i++) {
        if (original[i] !== finalLabels[i]) {
          const pool = REGION_STOP_POOL.find(x => x.name === finalLabels[i]);
          changes.push(`  [${i}] "${original[i]}" → "${finalLabels[i]}" (type=${pool?.type ?? "?"}, group=${pool?.oneOfGroup ?? "-"})`);
        }
      }
      console.log(`\n=== ${s.name} ===`);
      console.log(`skeleton: ${route.skeletonTourKey}`);
      console.log(`original: ${JSON.stringify(original)}`);
      console.log(`final:    ${JSON.stringify(finalLabels)}`);
      console.log(`replaced ${changes.length} stop(s):${changes.length ? "\n" + changes.join("\n") : " (none)"}`);
    });
  }
});
