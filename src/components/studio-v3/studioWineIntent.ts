/**
 * Studio V3 — single source of truth for "does this traveller actually want wine?".
 *
 * OWNER RULE (non-negotiable):
 *   Wine intent is EXPLICIT only. Geography, gastronomy, romance and
 *   slow-luxury are NOT wine signals. A region that happens to grow wine
 *   does not mean the traveller asked for a cellar.
 *
 * Explicit wine intent is:
 *   - `wine` selected as an interest, OR
 *   - `wine-food` chosen as the feeling, OR
 *   - a destination intent whose own traveller-visible label names the wine
 *     tradition (`alentejo-evora-wine`, `alentejo-roman-talha`).
 *
 * Everything else is non-wine. Baseline wine that already exists inside the
 * authoritative resolved Signature may remain (it is real product truth),
 * but nothing may be *injected*, *swapped in* or *offered* on top of it.
 */

import type { DestinationIntent, Feeling, Interest } from "./types";

export interface WineIntentInput {
  readonly feeling?: Feeling | null;
  readonly interests?: ReadonlyArray<Interest> | null;
  readonly destinationIntent?: DestinationIntent | null;
}

/** Destination intents whose traveller-visible label literally names wine. */
const WINE_NAMED_DESTINATIONS: ReadonlySet<string> = new Set([
  "alentejo-evora-wine",
  "alentejo-roman-talha",
]);

/**
 * Interests that were previously (wrongly) treated as wine proxies.
 * Kept here purely as documentation of the fix — they are NEVER wine intent.
 */
export const NON_WINE_PROXY_INTERESTS: ReadonlyArray<Interest> = ["gastronomy"];

/** Feelings that were previously (wrongly) treated as wine proxies. */
export const NON_WINE_PROXY_FEELINGS: ReadonlyArray<Feeling> = ["romance", "slow-luxury"];

export function hasExplicitWineIntent(input: WineIntentInput): boolean {
  if (input.feeling === "wine-food") return true;
  if ((input.interests ?? []).includes("wine")) return true;
  if (input.destinationIntent && WINE_NAMED_DESTINATIONS.has(input.destinationIntent)) return true;
  return false;
}

/**
 * Convenience for call sites that only carry `interests` (the replacement
 * engine). Conservative by design: without a feeling or destination, only an
 * explicit `wine` interest counts.
 */
export function interestsImplyWine(interests: ReadonlyArray<Interest>): boolean {
  return interests.includes("wine");
}
