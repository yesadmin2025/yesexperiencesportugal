/**
 * composerAdapter — bridges Studio V3 traveller state to composeStudioJourney.
 *
 * Phase B scope: this adapter lets a NEW reveal surface read from the
 * Phase A composition engine while the existing Signature-based flow
 * (pricing, checkout, map, editing) keeps using `resolveStudioV3Route`.
 *
 * Guarded by the `STUDIO_V3_COMPOSER_REVEAL` flag — off in production,
 * on in dev, and QA-toggleable via
 *   localStorage.setItem("studio-v3-composer-reveal", "1")
 *
 * Returns null (never throws, never fabricates) when:
 *   - required state fields are missing,
 *   - pickup maps to no composer region,
 *   - the composed pool for that region is too thin to produce a journey.
 * Callers fall back to the current Signature-based reveal.
 */

import type { StudioV3State } from "@/components/studio-v3/types";
import type { Pickup, Interest, Rhythm, Companions, InvestmentTier } from "@/components/studio-v3/types";
import {
  composeStudioJourney,
  type ComposeInput,
  type ComposedJourney,
  type StudioInterest,
  type StudioWho,
  type StudioRhythm,
  type StudioBudgetTier,
} from "./composeStudioJourney";
import type { RegionKey } from "@/data/regionStops";

export const STUDIO_V3_COMPOSER_REVEAL: boolean = (() => {
  try {
    if (import.meta.env?.DEV) return true;
    if (typeof window !== "undefined") {
      return window.localStorage?.getItem("studio-v3-composer-reveal") === "1";
    }
  } catch {
    /* no-op */
  }
  return false;
})();

export function pickupToComposerRegion(pickup: Pickup | null | undefined): RegionKey | null {
  switch (pickup) {
    case "lisbon":
    case "lisbon-airport":
    case "lisbon-cruise":
    case "cascais-estoril":
    case "sintra":
      return "lisbon-coast";
    case "sesimbra-setubal-arrabida":
      return "arrabida";
    case "comporta-troia":
      return "alentejo";
    default:
      return null;
  }
}

/** Studio interest vocabulary → composer's StudioInterest enum. */
function mapInterests(interests: ReadonlyArray<Interest>): StudioInterest[] {
  const out = new Set<StudioInterest>();
  for (const i of interests) {
    switch (i) {
      case "wine":
        out.add("wine");
        break;
      case "gastronomy":
        out.add("gastronomy");
        break;
      case "coast":
      case "nature":
        out.add("coast");
        break;
      case "heritage":
        out.add("culture");
        break;
      case "wellness":
        out.add("wellness");
        break;
      case "local-life":
      case "photography":
        out.add("hidden");
        break;
    }
  }
  return Array.from(out);
}

function mapRhythm(r: Rhythm | null | undefined): StudioRhythm {
  if (r === "slow") return "slow";
  if (r === "full" || r === "immersive") return "full";
  return "balanced";
}

function mapWho(c: Companions | null | undefined): StudioWho {
  switch (c) {
    case "solo":
      return "solo";
    case "family":
      return "family";
    case "friends":
    case "corporate":
      return "friends";
    case "couple":
    case "celebration":
    case "proposal":
    default:
      return "couple";
  }
}

function mapBudget(inv: InvestmentTier | null | undefined): StudioBudgetTier {
  if (inv === "bespoke") return "rare";
  if (inv === "considered") return "essential";
  return "signature"; // elevated / open / null → mid tier
}

export function adaptStateToComposeInput(
  state: StudioV3State,
  now: Date = new Date(),
): ComposeInput | null {
  const region = pickupToComposerRegion(state.pickup);
  if (!region) return null;
  if (!state.rhythm) return null;

  const minorAges = Array.isArray(state.minorAges) ? state.minorAges : [];

  return {
    region,
    rhythm: mapRhythm(state.rhythm),
    interests: mapInterests(state.interests ?? []),
    who: mapWho(state.companions),
    minorAges,
    budgetTier: mapBudget(state.investment),
    weekday: ((now.getDay() + 6) % 7) + 1, // JS 0=Sun → ISO 1=Mon…7=Sun
    month: now.getMonth() + 1,
  };
}

/**
 * Convenience: adapt + compose. Returns null when adapter returns null,
 * or when the composer produced fewer than 2 stops (thin pool guard).
 */
export function composeFromState(
  state: StudioV3State,
  now?: Date,
): ComposedJourney | null {
  const input = adaptStateToComposeInput(state, now);
  if (!input) return null;
  const journey = composeStudioJourney(input);
  if (journey.stops.length < 2) return null;
  return journey;
}
