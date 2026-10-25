/**
 * Studio V3 — taste-signal bridge.
 *
 * Maps V3 concepts (interest ids, stop names) onto the V2 predictive
 * engine's PriorityKey vocabulary so the live Studio can record guest
 * gestures (swap / remove / reorder) and re-sort alternatives for a
 * returning visitor — reusing the signed-session protections verified in
 * `src/lib/studio-v2/predictions.functions.ts`.
 *
 * Mappings are deliberately conservative: an interest only maps to a
 * priority when the match is truthful. Unmapped interests simply carry no
 * signal — the engine never invents preference data.
 */

import { REGION_STOP_POOL } from "@/data/regionStopPool";
import type { PriorityKey } from "@/lib/studio-v2/profile";

const INTEREST_TO_PRIORITIES: Record<string, readonly PriorityKey[]> = {
  wine: ["wine_cellar", "vineyard_lunch"],
  gastronomy: ["local_gastronomy"],
  coast: ["coastal_scenery", "boat"],
  heritage: ["heritage", "architecture"],
  photography: ["photography"],
  wellness: ["wellness", "quiet_luxury"],
  "local-life": ["hidden_villages", "local_gastronomy"],
};

/** Priority keys carried by a set of V3 interest ids (deduped, truthful only). */
export function prioritiesForInterests(interests: readonly string[]): PriorityKey[] {
  const out = new Set<PriorityKey>();
  for (const id of interests) {
    for (const p of INTEREST_TO_PRIORITIES[id] ?? []) out.add(p);
  }
  return [...out];
}

/**
 * Priority keys for a stop by its display name, via the approved region
 * stop pool's `suitsInterests`. Returns undefined when the stop isn't in
 * the pool — no priorities is better than guessed priorities.
 */
export function prioritiesForStopName(name: string): PriorityKey[] | undefined {
  const key = name.trim().toLowerCase();
  const stop = REGION_STOP_POOL.find((s) => s.name.trim().toLowerCase() === key);
  if (!stop) return undefined;
  const priorities = prioritiesForInterests(stop.suitsInterests);
  return priorities.length > 0 ? priorities : undefined;
}
