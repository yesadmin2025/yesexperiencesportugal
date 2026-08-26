import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { buildWineryDisplayLabels, studioDisplayLabel } from "./studioWineryPresentation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { CtaButton } from "@/components/ui/CtaButton";
import { BookingCtaSkeleton } from "@/components/ui/BookingCtaSkeleton";
import { saveStudioV3Signature } from "@/lib/studio-v3/save-signature.functions";
import { loadStudioV3Signature } from "@/lib/studio-v3/load-signature.functions";
import { ChoiceGrid } from "./ChoiceGrid";
import {
  BackLink,
  ContinueCta,
  FooterHint,
  NextTeaser,
  PhaseHeader,
} from "./PhaseChrome";
import { LogisticsPhase } from "./LogisticsPhase";
import { composeDirectorsRead, directorsReadBackTarget } from "./directorsRead";
import { DirectorsRead } from "./DirectorsRead";

import { InvestmentTierPicker } from "./InvestmentTierPicker";
import { StudioV3Intro } from "./StudioV3Intro";
import { PhaseShell } from "./PhaseShell";
import { MobileBeatReveal } from "./MobileBeatReveal";
import type { StudioV3BeatId } from "./StudioV3ProgressStepper";
import { LivingJourneyPanel } from "./LivingJourneyPanel";
import { ComposerMap } from "./ComposerMap";
import { AtmosphereBeat, MapBeat, type MapBeatMode } from "./CreationBeat";
import { StudioV3SignatureMap } from "./StudioV3SignatureMap";
import { validateResolvedSignature } from "./validateReveal";
import { recordStudioV3RevealValidation } from "@/lib/studio-v3-telemetry";
import { StudioV3ProgressStepper } from "./StudioV3ProgressStepper";
import { RunningInvestmentRibbon } from "./RunningInvestmentRibbon";
import { CurtainRise } from "./CurtainRise";
import { SignaturePriceCard, type SelectedAddOnSummary } from "./SignaturePriceCard";
import { useResolvedJourney } from "./useResolvedJourney";
// QualityScore removed from reveal — now surfaced only in debug overlay.
import { StudioV3DebugOverlay } from "./StudioV3DebugOverlay";
import { safeDateForReveal } from "./dateGuards";
import { trackStep } from "@/lib/studio-v3-funnel";
import {
  gaAddPaymentInfo,
  gaAddToCartStudioTier,
  gaBeginCheckout,
  gaStudioStep,
  buildTourItem,
} from "@/lib/analytics-ga4";
import { computeQualityScore } from "@/lib/studio-v3-quality";
import { inferKind, summarizeDay } from "@/lib/studio/timing";
import { PartialReveal } from "./PartialReveal";

import { LeadCaptureSheet, type LeadIntent } from "./LeadCaptureSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { whatsappHref } from "@/components/WhatsAppFab";
import {
  composeJourneyTitle,
  composeSuggestedRoute,
  customerStopBlurb,
  filterCompanions,
  filterFeelings,
  filterConsiderations,
  filterDestinationIntents,
  filterInterests,
  filterOccasions,
  getNextPhase,
  isPhaseRelevant,
  getOptionLabel,
  inferGuests,
  pickupCityLabel,
  pickupOriginCoord,
  pickupRegionKey,
  resolveStudioV3Route,
  selectReplacementCandidates,
  STUDIO_V3_PHASE_ORDER,
} from "./curation";
import { findTour, signatureTours } from "@/data/signatureTours";
import { getTourContent } from "@/lib/tourContent";
import {
  composeFromState,
  adaptStateToComposeInput,
  STUDIO_V3_COMPOSER_REVEAL,
} from "@/lib/studio-v3/composerAdapter";
import { priceComposedJourney } from "@/lib/studio-v3/composerPricing";
import { getViatorMeta } from "@/data/signatureToursViator";
import { resolvePerPaxEur, resolveJourneyPricing } from "@/data/signatureTourPricing";
import { addOnPartyAmount, addOnsPartyTotal } from "@/lib/checkout/studio-charge";

import { useTourPriceTiers } from "@/hooks/use-tour-price-tiers";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Real minimum priceFrom across every Signature in the catalogue. Used as
 *  the anchor for indicative per-tier price hints — never invented. */
const SIGNATURE_MIN_PRICE_EUR: number = (() => {
  let min = Infinity;
  for (const t of signatureTours) {
    if (typeof t.priceFrom === "number" && t.priceFrom > 0 && t.priceFrom < min) {
      min = t.priceFrom;
    }
  }
  return Number.isFinite(min) ? min : 0;
})();
import { regionalVoiceFor } from "./regionalVoice";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { REGION_ORIGIN, type RegionKey } from "@/data/regionStops";
import { lookupStopGeo } from "@/lib/studio/stop-lookup";
import { useRouteLegMinutes, type RouteLegStop } from "@/hooks/use-route-leg-minutes";
import { RouteLegend } from "@/components/studio-v3/RouteLegend";
import { YourDayFrame } from "@/components/studio-v3/YourDayFrame";
import { ApprovalBadge } from "@/components/studio-v3/ApprovalBadge";
import { validateItinerary, type ValidationStatus } from "@/lib/studio-v3/itinerary-validation";

// Lazy — Leaflet ships only when the reveal mounts.
const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({
    default: m.BuilderMap,
  })),
);

/** Map a Signature tour region string to the canonical RegionKey used by
 *  BuilderMap / REGION_ORIGIN. Defaults to arrabida — the most common. */
function tourRegionToRegionKey(region: string | undefined | null): RegionKey {
  const r = (region ?? "").toLowerCase();
  if (
    r.includes("alentejo") ||
    r.includes("comporta") ||
    r.includes("évora") ||
    r.includes("evora")
  )
    return "alentejo";
  if (
    r.includes("centro") ||
    r.includes("coimbra") ||
    r.includes("fátima") ||
    r.includes("nazaré") ||
    r.includes("óbidos")
  )
    return "centro";
  if (
    r.includes("sintra") ||
    r.includes("cascais") ||
    r.includes("cabo da roca") ||
    r.includes("lisbon coast")
  )
    return "lisbon-coast";
  return "arrabida";
}

// Bible alignment Phase 1 — automatic map-led creation beats fired after
// Pickup / Interests / Rhythm. Disable to fall back to the previous
// (image-led) reaction beats site-wide.
const STUDIO_V3_MAP_BEATS_ENABLED = true;

// Atmospheric images — already shipping in the project. We reuse the
// existing /src/assets library, no new files, no external URLs.
import atmCoastal from "@/assets/studio/atm-coastal-cinematic.jpg";
import atmFood from "@/assets/studio/atm-food-local.jpg";
import atmScenic from "@/assets/studio/atm-relaxed-scenic.jpg";
import atmRomantic from "@/assets/studio/atm-romantic-intimate.jpg";
import atmSocial from "@/assets/studio/atm-social-celebratory.jpg";
import atmCultural from "@/assets/studio/atm-elegant-cultural.jpg";
import expWine from "@/assets/exp-wine.jpg";
import expGastronomy from "@/assets/exp-gastronomy.jpg";
import expNature from "@/assets/exp-nature.jpg";
import expCoastal from "@/assets/exp-coastal.jpg";
import expStreet from "@/assets/exp-street.jpg";
import editViewpoint from "@/assets/edit-viewpoint.jpg";
import editMarket from "@/assets/edit-market.jpg";

const FEELING_IMAGE: Record<string, string> = {
  coastal: atmCoastal,
  "wine-food": atmFood,
  hidden: atmScenic,
  romance: atmRomantic,
  family: atmSocial,
  culture: atmCultural,
  adventure: atmCoastal,
  "slow-luxury": atmScenic,
  faith: atmCultural,
  "hands-on": atmCultural,
};

const INTEREST_IMAGE: Record<string, string> = {
  wine: expWine,
  gastronomy: expGastronomy,
  nature: expNature,
  coast: expCoastal,
  heritage: atmCultural,
  photography: editViewpoint,
  wellness: atmScenic,
  "local-life": editMarket,
  street: expStreet, // safety fallback (unused id, kept defensively)
};

import {
  STUDIO_SCENE_CLIPS,
  preloadStudioClips,
  videoForCompanions,
  videoForDestination,
  videoForFeeling,
  videoForInterest,
} from "@/content/studio-scene-clips";

import {
  COMPANIONS,
  CONSIDERATIONS,
  DESTINATION_INTENTS,
  FEELINGS,
  INITIAL_STATE,
  INTERESTS,
  INVESTMENT_TIERS,
  LANGUAGES,
  OCCASIONS,
  PICKUPS,
  RHYTHMS,
  type AdaptiveRefinementId,
  type ChoiceOption,
  type Companions,
  type Consideration,
  type DateMode,
  type DestinationIntent,
  type Feeling,
  type Interest,
  type InvestmentTier,
  type Language,
  type Occasion,
  type Pickup,
  type Rhythm,
  type StudioV3Phase,
  type StudioV3State,
} from "./types";
import { canonicalStudioPhase } from "./studioPhaseCanonical";
import {
  countableInterests,
  deriveInheritedIntent,
  pruneInheritedInterests,
} from "./studioInheritedIntent";
import {
  acknowledgementSummaryFor,
  type AcknowledgementContext,
} from "./studioAcknowledgement";
import {
  availableAdaptiveQuestionKinds,
  refinementSummaryLabel,
  resolveAdaptiveQuestion,
} from "@/components/studio-v3/adaptiveQuestions";
import { useStudioIntentAdvisor } from "./useStudioIntentAdvisor";
import { prioritiseResolvedRefineIntents } from "./studioIntentAdvisor";
import { DatePhaseControls, dateNextTeaser } from "./DatePhase";
import {
  decideFeeling,
  decideInterests,
  decideRhythm,
  decisionWhisper,
  type DecidedForMeKey,
} from "./letYesDecide";
import { trackStudio } from "@/lib/studio-analytics";
import {
  resolveRefineIntents,
  REFINE_MIN_STOPS,
  type RefineIntentCandidate,
} from "./refineIntents";

import { GuestStepper, guestBucketLabel } from "./GuestStepper";
import { Composition } from "./Composition";
import { type GuestDetails } from "@/components/checkout/FinalDetailsDialog";
import { FinalRevealStory } from "./FinalRevealStory";
import { WhyRouteWorks } from "./WhyRouteWorks";
import { OtherDirections } from "./OtherDirections";
import { deriveStudioIntelligence } from "@/lib/studio-v3/livingAtlasBridge";
import { CheckoutSummary as CheckoutSummaryStep } from "./CheckoutSummary";
import { GuestDetailsStep } from "./GuestDetailsStep";
import { buildSignatureStorySnapshot } from "./signatureStorySnapshot";
import { sendSignatureStoryEmail } from "@/lib/emails/sendSignatureStoryEmail.functions";
import {
  BrandedCheckoutDrawer,
  type CheckoutSummary,
} from "@/components/checkout/BrandedCheckoutDrawer";

/**
 * StudioV3 — Cinematic Journey Composer (Phase 1A: Operational Spine).
 *
 * Chain (13 internal phases — never surfaced as a "long form"):
 *   feeling → who → occasion → date → pickup → guests → investment
 *   → interests → rhythm → considerations → language → map → storyboard
 *
 * Phase 1B will: wire curation soft-hints from the new fields, show pickup
 * in the map eyebrow, and render the Journey Summary block in the
 * storyboard handoff. Those are intentionally not touched here.
 */

const TOTAL_STEPS = 14;

// Single source of truth — imported from curation.ts so the advance() guard
// and getNextPhase() can never disagree about ordering (that disagreement
// used to silently drop valid transitions and dead-end the funnel).
const PHASE_ORDER: StudioV3Phase[] = STUDIO_V3_PHASE_ORDER;

function stepOf(phase: StudioV3Phase): number {
  return PHASE_ORDER.indexOf(phase) + 1;
}
function prevPhase(phase: StudioV3Phase): StudioV3Phase | null {
  const i = PHASE_ORDER.indexOf(phase);
  return i > 0 ? PHASE_ORDER[i - 1] : null;
}

/** Rotate through 3 teaser variants per phase so returning to a step and
 *  choosing a different answer feels distinct, not robotic. */
const NEXT_TEASERS: Record<StudioV3Phase, string[]> = {
  intro: [""],
  who: [
    "Next, the mood of the day",
    "Next, the feeling we shape around you",
    "Next, how Portugal should feel",
  ],
  feeling: [
    "Next, where Portugal calls you",
    "Next, a direction begins to emerge",
    "Next, the region takes shape",
  ],
  destination: [
    "Next, we shape the beginning",
    "Next, where it starts",
    "Next, the starting point",
  ],
  occasion: ["Next, the when", "Next, your timing", "Next, the season"],
  logistics: [
    "Next, we compose your day",
    "Next, the route takes shape",
    "Next, your day is drawn",
  ],
  date: ["Next, we choose the route", "Next, the map awakens", "Next, the journey forms"],
  pickup: ["Next, the party size", "Next, your group", "Next, how many guests"],
  guests: ["Next, the investment", "Next, the comfort", "Next, how it's held"],
  interests: ["Next, we refine the rhythm", "Next, the pace", "Next, how it flows"],
  rhythm: ["Next, the occasion", "Next, the reason", "Next, what brings you here"],
  refinement: [
    "Next, the route takes shape",
    "Next, the map awakens",
    "Next, your day is composed",
  ],
  considerations: ["Next, the voice", "Next, your language", "Next, how you hear it"],
  language: ["Next, the route takes shape", "Next, the map awakens", "Next, the journey forms"],
  investment: ["Next, we choose the moments", "Next, what draws you", "Next, the experiences"],
  map: ["Next, your draft"],
  storyboard: [""],
  confirmation: [""],
  guestDetails: [""],
  checkoutSummary: [""],
};

function pickTeaser(phase: StudioV3Phase, seed: string): string {
  const arr = NEXT_TEASERS[phase] ?? [""];
  if (arr.length <= 1) return arr[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % arr.length;
  return arr[hash];
}

/* ---------- Adaptive intelligence helpers (deterministic, local) ---------- */

/**
 * contextualTeaser — replaces the generic per-phase teaser with one that
 * reacts to what the traveller has already said. Falls back to the
 * existing rotating teaser whenever no context-aware line applies.
 */
function contextualTeaser(phase: StudioV3Phase, state: StudioV3State): string {
  const { feeling, companions, occasion } = state;
  const isSolo = companions === "solo";
  switch (phase) {
    case "feeling": {
      if (isSolo) return "Next, we shape a quieter day.";
      if (feeling === "wine-food") return "Next, the table starts to matter.";
      if (feeling === "coastal" || feeling === "adventure")
        return "Next, the route moves toward open air.";
      if (feeling === "slow-luxury") return "Next, we keep the rhythm spacious.";
      if (feeling === "romance") return "Next, we shape the beginning for two.";
      break;
    }
    case "who": {
      if (isSolo) return "Next, we shape a quieter day.";
      if (companions === "couple" || companions === "proposal")
        return "Next, we shape the beginning for two.";
      if (companions === "family") return "Next, we make the day easy for everyone.";
      if (companions === "corporate") return "Next, we shape the group flow.";
      if (companions === "celebration") return "Next, we shape the celebration.";
      break;
    }
    case "occasion": {
      if (isSolo) return "A private rhythm, built around you.";
      if (occasion === "honeymoon" || occasion === "anniversary" || occasion === "proposal")
        return "Next, we shape the beginning for two.";
      break;
    }
    case "pickup": {
      if (isSolo) return "The route can stay light and personal.";
      if (companions === "family") return "Next, we make the day easy for everyone.";
      if (companions === "corporate") return "Next, we shape the group flow.";
      break;
    }
    case "interests": {
      if (isSolo) return "The route can stay light and personal.";
      if (feeling === "wine-food") return "Next, the table starts to matter.";
      if (feeling === "coastal" || feeling === "adventure")
        return "Next, the route moves toward open air.";
      if (feeling === "slow-luxury") return "Next, we keep the rhythm spacious.";
      break;
    }
    case "rhythm": {
      if (isSolo) return "A private rhythm, built around you.";
      if (feeling === "slow-luxury") return "Next, we keep the rhythm spacious.";
      break;
    }
    default:
      break;
  }
  return pickTeaser(phase, [feeling, companions, occasion, state.pickup].filter(Boolean).join(","));
}

/** Stable prioritised reorder: priority ids first (in order), then the rest. */
function prioritiseOptions<T extends string>(
  options: ReadonlyArray<ChoiceOption<T>>,
  priorityIds: ReadonlyArray<T>,
): ChoiceOption<T>[] {
  if (priorityIds.length === 0) return [...options];
  const map = new Map(options.map((o) => [o.id, o]));
  const seen = new Set<T>();
  const head: ChoiceOption<T>[] = [];
  for (const id of priorityIds) {
    const opt = map.get(id);
    if (opt && !seen.has(id)) {
      head.push(opt);
      seen.add(id);
    }
  }
  const tail = options.filter((o) => !seen.has(o.id));
  return [...head, ...tail];
}

/** Per-feeling reaction copy — used in the feeling beat. */
function feelingReactionMessage(id: Feeling): string {
  switch (id) {
    case "wine-food":
      return "Long tables, local bottles, and time to stay.\nThe day begins around the table.";
    case "romance":
      return "Soft light, slower moves, and space for two.\nThe day begins quietly.";
    case "hidden":
      return "Quiet roads, small doors, places that do not perform.\nThe route begins away from the obvious.";
    case "adventure":
      return "Open edges, movement, and air in the day.\nThe route begins with energy.";
    case "slow-luxury":
      return "Fewer stops, deeper moments, nothing rushed.\nThe route begins with space.";
    case "coastal":
      return "Atlantic light, salt on the wind, the cliffs ahead.\nThe route begins facing the sea.";
    case "faith":
      return "Sanctuaries, candlelight, and space to simply stand there.\nThe day begins in silence.";
    case "hands-on":
      return "Local hands, a workshop table, something made with you.\nThe day begins by doing.";
    case "culture":
      return "Old stones, long stories, footsteps that linger.\nThe day begins with depth.";
    default:
      return "Light, space, and a slower rhythm.\nThis is where it begins.";
  }
}

/** Inferred-guests note shown subtly on the final reveal. */
function inferredGuestsNote(state: StudioV3State): string | null {
  if (!state.guestsInferred || state.guests == null) return null;
  if (state.guests === 1) return "Assumed for this draft: solo traveller";
  if (state.guests === 2) return "Assumed for this draft: 2 guests";
  return `Assumed for this draft: ${state.guests} guests`;
}

/** Investment shaping direction — shown in the final reveal when selected.
 *  Exported so the Studio V3 test suite can lock the exact copy per tier. */
// eslint-disable-next-line react-refresh/only-export-components
export function investmentShapingLine(tier: InvestmentTier | null): string | null {
  switch (tier) {
    case "considered":
      return "Shaped with clarity, comfort and restraint — private, beautiful, without unnecessary extras.";
    case "elevated":
      return "Shaped with stronger curated moments, smoother pacing and a more polished private flow.";
    case "bespoke":
      return "Shaped for a more distinctive day — fewer generic choices, stronger character and more memorable details.";
    case "open":
      return "Shaped around the strongest fit for your route, rhythm and interests.";
    default:
      return null;
  }
}

/** ConfirmationPause summary strip — one honest line: region · rhythm · guests.
 *  Purely presentational: never invents facts, uses only what state already
 *  carries. Returns undefined when there's nothing meaningful to show. */
function buildConfirmationSummary(state: StudioV3State): string | undefined {
  const tour = state.tourId ? findTour(state.tourId) : null;
  const parts: string[] = [];
  const region = tour?.region ?? null;
  if (region) {
    parts.push(region.charAt(0).toUpperCase() + region.slice(1));
  }
  if (state.rhythm) {
    const rhythmLabel =
      state.rhythm === "slow"
        ? "Gentle rhythm"
        : state.rhythm === "balanced"
          ? "Balanced rhythm"
          : state.rhythm === "full"
            ? "Full rhythm"
            : state.rhythm === "immersive"
              ? "Immersive rhythm"
              : null;
    if (rhythmLabel) parts.push(rhythmLabel);
  }
  if (typeof state.guests === "number" && state.guests > 0) {
    parts.push(state.guests === 1 ? "1 guest" : `${state.guests} guests`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

/**
 * Adaptive progress whisper — emotional milestone + soft percent.
 *
 * Driven by the user's *answered fields*, not the position in a phase list,
 * so skipped phases (date undecided, guests inferred, considerations none,
 * etc.) never penalise progress. The phrase always corresponds to the most
 * recent meaningful checkpoint reached; the percent always advances.
 *
 * firstName is used at the 78% mark only (rhythm reached) — never elsewhere.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function studioV3Progress(
  state: StudioV3State,
  currentPhase: StudioV3Phase,
): { percent: number; phrase: string } | null {
  // Hidden on intro and the final reveal.
  if (currentPhase === "intro" || currentPhase === "storyboard" || currentPhase === "map") {
    return null;
  }

  const name = state.firstName?.trim() || null;
  const hasFeeling = state.feeling != null;
  const hasCompanions = state.companions != null;
  const hasPickup = state.pickup != null;
  const hasInterests = state.interests.length > 0;
  const hasRhythm = state.rhythm != null;
  const hasGuests = state.guests != null;
  const hasDate = state.dateExact != null || state.dateMode != null;

  // Walk milestones from highest reached down. Each milestone owns a
  // phrase + percent. The first match wins, so progress is monotonic with
  // user effort regardless of which phases got skipped.
  //
  // Studio reform (2026-08): the ladder follows the new order — desire
  // first (feeling → destination → who → interests → rhythm), logistics
  // last (date → pickup → guests). Investment is no longer asked, so it
  // no longer appears as a milestone.
  if (hasGuests && hasPickup) {
    return { percent: 92, phrase: "The shape is almost complete." };
  }
  if (hasPickup) {
    return { percent: 86, phrase: "Your starting point is placed on the map." };
  }
  if (hasDate) {
    return { percent: 82, phrase: "The day has a place in the calendar." };
  }
  if (hasRhythm) {
    return {
      percent: 74,
      phrase: name
        ? `${name}, your private Portugal is coming into focus.`
        : "Your private Portugal is coming into focus.",
    };
  }
  if (hasInterests) {
    return { percent: 60, phrase: "The route begins to find its rhythm." };
  }
  if (hasCompanions) {
    return { percent: 44, phrase: "The company is set." };
  }
  const hasDestination =
    state.destinationIntent != null && state.destinationIntent !== "no-preference";
  if (hasDestination) {
    return { percent: 30, phrase: "A direction begins to emerge." };
  }
  if (hasFeeling) {
    return { percent: 22, phrase: "A direction settles in." };
  }
  return { percent: 8, phrase: "The day begins to take shape." };
}

/**
 * Reaction beat — a short cinematic punctuation shown between phases.
 * It overlays the next phase, holds for ~1.1s (or ~0.35s for
 * reduced-motion users) and then dissolves on its own. The user never
 * has to click through it. It exists to break the "form-feeling" by
 * acknowledging each choice before the next question appears.
 */
type ReactionKind =
  | "feeling"
  | "pickup"
  | "interests"
  | "rhythm"
  | "considerations"
  | "investment"
  | "atmosphere"
  | "map-beat";

type Reaction = {
  /** Which of the priority beats — drives the postcard visual. */
  kind: ReactionKind;
  eyebrow: string;
  /** Message body. Use "\n" to render a second line for poetic pacing. */
  message: string;
  /** Small detail line under the message (e.g. "From Lisbon"). */
  detail?: string | null;
  /** Optional chips rendered as selected moments (e.g. interests). */
  chips?: string[];
  /** Optional label above the chips (e.g. "Chosen moments"). */
  chipsLabel?: string;
  /** Optional trailing line under the chips (e.g. "and more to refine"). */
  chipsTail?: string;
  /** Origin label for the pickup postcard (e.g. "Lisbon"). */
  originLabel?: string;
  /** Quiet caption rendered inside the postcard (varies per kind). */
  postcardCaption?: string;
  /** Quiet line rendered under the postcard, bridging into the next phase. */
  postcardSubline?: string;
  /** Phase the user lands on once the beat dissolves. */
  nextPhase: StudioV3Phase;
  /** How long the beat holds before auto-dissolving. Capped at 3400ms. */
  holdMs?: number;
  /** Optional atmospheric background image rendered inside the postcard. */
  bgImage?: string;
  /** Optional cinematic scene clip for the beat canvas (auto-loops, muted). */
  bgVideo?: string;
  /** Map-beat metadata (kind === "map-beat" only). */
  mapMode?: MapBeatMode;
  /** Real route labels from resolveStudioV3Route — never invented. */
  routeLabels?: ReadonlyArray<string>;
  /** Rhythm bucket used by the pace beat. */
  rhythmBucket?: "slow" | "balanced" | "full" | "immersive";
  /** Region key — drives origin coords for geographic map projection. */
  regionKey?: RegionKey;
  /** Explicit origin lat/lng — overrides regionKey-derived origin. */
  originCoord?: { lat: number; lng: number } | null;
  /**
   * Suppress the abstract map/postcard panel. Used by short acknowledgement
   * beats ("Noted") where an empty schematic card reads as a loading state
   * rather than a cinematic moment — copy alone is stronger there.
   */
  hidePanel?: boolean;
};

/** Context-aware atmosphere copy for the Who step. Sentence case, no superlatives. */
function companionsAtmosphereLine(id: Companions): string {
  switch (id) {
    case "solo":
      return "A day shaped around you — and the light you arrived with.";
    case "couple":
      return "Two of you, one rhythm, room to slow down together.";
    case "family":
      return "Easy timing, gentle pauses, space for everyone.";
    case "friends":
      return "A shared table, an open road, time to linger.";
    case "celebration":
      return "A day quietly built around the reason to gather.";
    case "proposal":
      return "One moment held with care, the rest left to feel real.";
    case "corporate":
      return "Considered, private, calmly hosted from start to end.";
    default:
      return "A day shaped around the people in it.";
  }
}

/** Atmospheric image for the Who beat — reuses Studio V3 images already imported above. */
function companionsAtmosphereImage(id: Companions, feeling: Feeling | null): string | undefined {
  switch (id) {
    case "couple":
    case "proposal":
      return atmRomantic;
    case "family":
    case "friends":
    case "celebration":
      return atmSocial;
    case "corporate":
      return atmCultural;
    case "solo":
    default:
      return feeling ? FEELING_IMAGE[feeling] : atmScenic;
  }
}

/** Context-aware atmosphere copy for the Occasion step. */
function occasionAtmosphereLine(id: Occasion, companions: Companions | null): string {
  switch (id) {
    case "proposal":
      return "We hold the moment. You stay present.";
    case "anniversary":
      return "A year worth marking, quietly and well.";
    case "honeymoon":
      return "First days, slowly lived, nothing rushed.";
    case "birthday":
      return "A day that earns the candles, without the staging.";
    case "family-day":
      return "Everyone gently together, at one rhythm.";
    case "corporate":
      return "Considered, private, elegantly hosted.";
    case "celebration":
      return "Something worth raising a glass to — held with care.";
    case "none":
    default:
      return companions === "corporate"
        ? "No occasion needed — just a day that runs well."
        : "No reason needed — just a day that belongs to you.";
  }
}

/** Atmospheric image for the Occasion beat. */
function occasionAtmosphereImage(id: Occasion, feeling: Feeling | null): string | undefined {
  switch (id) {
    case "proposal":
    case "anniversary":
    case "honeymoon":
      return atmRomantic;
    case "birthday":
    case "family-day":
    case "celebration":
      return atmSocial;
    case "corporate":
      return atmCultural;
    case "none":
    default:
      return feeling ? FEELING_IMAGE[feeling] : atmScenic;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Session persistence — a refresh mid-composition must not throw the
 * traveller back to the intro. Stored in sessionStorage (tab-scoped, cleared
 * when the tab closes), never localStorage, and never used for anything but
 * restoring the answers already given. Payment and guest-detail data is NOT
 * part of StudioV3State and is never written here.
 */
const STUDIO_V3_SESSION_KEY = "yes.studio-v3.session.v1";

/** Phases we never restore into — they depend on live checkout state. */
const NON_RESTORABLE_PHASES: ReadonlySet<StudioV3Phase> = new Set<StudioV3Phase>([
  "guestDetails",
  "checkoutSummary",
]);

function readPersistedStudioState(): StudioV3State | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STUDIO_V3_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioV3State> & { phase?: StudioV3Phase };
    if (!parsed || typeof parsed !== "object") return null;
    // P8: legacy `map` / `confirmation` sessions canonicalize to the unified
    // "Your Day" surface in the SAME commit as the restore — no flicker, no
    // redirect loop, no second render pass.
    const phase: StudioV3Phase =
      parsed.phase && PHASE_ORDER.includes(parsed.phase) && !NON_RESTORABLE_PHASES.has(parsed.phase)
        ? canonicalStudioPhase(parsed.phase)
        : "intro";
    if (phase === "intro") return null;
    return { ...INITIAL_STATE, ...parsed, phase };
  } catch {
    return null;
  }
}

function writePersistedStudioState(state: StudioV3State): void {
  if (typeof window === "undefined") return;
  try {
    if (state.phase === "intro") {
      window.sessionStorage.removeItem(STUDIO_V3_SESSION_KEY);
      return;
    }
    window.sessionStorage.setItem(STUDIO_V3_SESSION_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked — persistence is a convenience, never a requirement */
  }
}

export function StudioV3() {
  const [state, setState] = useState<StudioV3State>(INITIAL_STATE);
  const isMobile = useIsMobile();
  const { data: tourPriceTiers } = useTourPriceTiers();
  const [exiting, setExiting] = useState(false);

  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [mobileReveal, setMobileReveal] = useState<{ beat: StudioV3BeatId; index: number } | null>(
    null,
  );
  const [hydrating, setHydrating] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("saved");
  });
  const [hydrateError, setHydrateError] = useState<"not-found" | "failed" | null>(null);

  // Restore an in-progress composition after a refresh. Skipped when a saved
  // Signature token is being hydrated from the server — that is authoritative.
  //
  // `restoredRef` only records that the restore effect has *run*. The persist
  // effect must instead wait for restoration to be *applied to state*, which
  // happens one render later: both effects fire in the same commit, so a
  // ref-only gate lets the writer observe INITIAL_STATE and delete the saved
  // key before the restored state ever lands. `hydratedState` is the explicit
  // hydration-complete guard — it is set in the same batch as the restored
  // state, so the persist effect first runs on the render that already has it.
  const restoredRef = useRef(false);
  const [hydratedState, setHydratedState] = useState(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("saved")) {
      setHydratedState(true);
      return;
    }
    const persisted = readPersistedStudioState();
    if (persisted) setState(persisted);
    setHydratedState(true);
  }, []);

  // Persist every answered step so back/forward and refresh keep the day.
  useEffect(() => {
    if (!hydratedState) return;
    writePersistedStudioState(state);
  }, [hydratedState, state]);

  const [leadSheet, setLeadSheet] = useState<{ open: boolean; intent: LeadIntent }>({
    open: false,
    intent: "book",
  });
  const openLeadSheet = useCallback(
    (intent: LeadIntent) => setLeadSheet({ open: true, intent }),
    [],
  );
  const closeLeadSheet = useCallback(() => setLeadSheet((s) => ({ ...s, open: false })), []);

  // Stripe sandbox checkout — Say YES on the Signature reveal. Prices and
  // tour identity are validated server-side; the client only passes the
  // resolved tour id and party size. On success we redirect to Stripe's
  // hosted checkout (test mode). On failure we surface a quiet toast and
  // fall back to the lead-capture sheet so the conversion never dead-ends.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [checkoutTourId, setCheckoutTourId] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);

  // Lifted add-on selection so the checkout drawer summary AND the Stripe
  // session both see exactly what the traveller picked on the reveal.
  // `SignaturePriceCard` calls `onAddOnsChange` on every toggle; we mirror
  // the summary here and forward it to `handleStripeCheckout`.
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedAddOnItems, setSelectedAddOnItems] = useState<SelectedAddOnSummary["items"]>([]);
  const handleAddOnsChange = useCallback((summary: SelectedAddOnSummary) => {
    setSelectedAddOnIds((prev) => {
      const same =
        prev.length === summary.ids.length && prev.every((id, i) => id === summary.ids[i]);
      return same ? prev : summary.ids;
    });
    setSelectedAddOnItems((prev) => {
      const same =
        prev.length === summary.items.length &&
        prev.every((p, i) => p.id === summary.items[i].id && p.amount === summary.items[i].amount);
      return same ? prev : summary.items;
    });
  }, []);
  // Reset add-ons when the resolved tour changes (fresh reveal ⇒ clean slate).
  useEffect(() => {
    setSelectedAddOnIds([]);
    setSelectedAddOnItems([]);
  }, [state.tourId]);

  // Single source of truth for adults/minorAges/stops/addOns/perPax/total.
  // Every UI surface (price card, reveal, checkout) reads from this — never
  // recompute pricing or stops downstream.
  const resolvedJourney = useResolvedJourney(state, selectedAddOnItems, tourPriceTiers);

  /**
   * Living Atlas intelligence for the current answers. Pure and memoized —
   * used for customer-facing explanation only. The same reasoning already
   * biases Signature selection inside `resolveStudioV3Route`, so the reveal
   * explains the day the traveller is actually getting.
   */
  const livingAtlasReasons = useMemo(
    () =>
      deriveStudioIntelligence({
        feeling: state.feeling,
        interests: state.interests,
        destinationIntent: state.destinationIntent,
        rhythm: state.rhythm,
        refinement: state.refinement,
      }).reasons,
    [state.feeling, state.interests, state.destinationIntent, state.rhythm, state.refinement],
  );

  /**
   * Differentiated alternatives for the reveal. Empty whenever nothing in the
   * catalogue adds something the chosen day lacks.
   */
  const otherDirections = useMemo(() => {
    if (!state.feeling || !state.companions || !state.rhythm) return [];
    return resolveStudioV3Route({
      feeling: state.feeling,
      companions: state.companions,
      rhythm: state.rhythm,
      interests: state.interests,
      pickup: state.pickup,
      occasion: state.occasion,
      considerations: state.considerations,
      investment: state.investment,
      destinationIntent: state.destinationIntent,
      refinement: state.refinement,
    }).livingAtlasAlternatives;
  }, [
    state.feeling,
    state.companions,
    state.rhythm,
    state.interests,
    state.pickup,
    state.occasion,
    state.considerations,
    state.investment,
    state.destinationIntent,
    state.refinement,
  ]);

  // Guest Details snapshot — captured on Guest Details submit, then rendered
  // in CheckoutSummary before we open Stripe. Kept in local state (not the
  // persisted signature) since it holds personal info.
  const [pendingGuestDetails, setPendingGuestDetails] = useState<GuestDetails | null>(null);

  // Save-my-signature handler for the Final Reveal secondary CTA.
  const [savingSignature, setSavingSignature] = useState(false);
  const saveSig = useServerFn(saveStudioV3Signature);
  const handleSaveSignature = useCallback(async () => {
    if (savingSignature) return;
    setSavingSignature(true);
    try {
      await saveSig({
        data: {
          journeyTitle: state.journeyTitle ?? "Your Signature",
          skeletonTourKey: state.tourId ?? null,
          state: state as unknown as Record<string, unknown>,
        },
      });
      toast.success("Signature saved to your journey.");
    } catch (e) {
      console.error("[studio-v3 save-signature]", e);
      toast.error("Could not save right now — please try again.");
    } finally {
      setSavingSignature(false);
    }
  }, [savingSignature, saveSig, state]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsState, setDetailsState] = useState<StudioV3State | null>(null);
  const requestStripeCheckout = useCallback(
    (currentState: StudioV3State) => {
      const tour = currentState.tourId ? findTour(currentState.tourId) : null;
      if (!tour) {
        openLeadSheet("book");
        return;
      }
      setDetailsState(currentState);
      setDetailsOpen(true);
    },
    [openLeadSheet],
  );
  const handleStripeCheckout = useCallback(
    async (currentState: StudioV3State, details: GuestDetails) => {
      if (checkoutPending) return;
      const tour = currentState.tourId ? findTour(currentState.tourId) : null;
      if (!tour) {
        openLeadSheet("book");
        return;
      }
      setCheckoutPending(true);
      // Open the drawer immediately with a branded skeleton.
      const stopLabels = (tour.stops ?? []).map((s) => s.label).slice(0, 6);
      const perPaxBase =
        resolvePerPaxEur(tour, details.guests, tourPriceTiers)?.eurPerPax ?? tour.priceFrom ?? 180;
      // Unit-aware party total for add-ons — mirrors `addOnEurFor` in the
      // price card so per_person, per_group, per_vehicle and fixed add-ons
      // all resolve to the same amount the traveler sees in the reveal.
      // Never assume "per_person × guests" — that over-charges per_group
      // add-ons the moment the catalog gains one. P2 #15 price parity.
      const partyAmountFor = (item: (typeof selectedAddOnItems)[number]) =>
        addOnPartyAmount(item, details.guests);

      // Add-ons for the Stripe edge function. Today the function hardcodes
      // `quantity: guests`, so it only computes the correct charge when every
      // line is per_person. All current catalog entries are per_person; warn
      // loudly if a non-per_person add-on ever slips through so we catch it
      // before the payment is off by (guests - 1) × price.
      const nonPerPerson = selectedAddOnItems.filter((i) => i.unit !== "per_person");
      if (nonPerPerson.length > 0 && typeof console !== "undefined") {
        console.warn(
          "[studio-v3 price-parity] Non per_person add-on(s) reached checkout:",
          nonPerPerson.map((i) => ({ id: i.id, unit: i.unit })),
        );
      }
      const addOnsForCheckout = selectedAddOnItems.map((i) => ({
        id: i.id,
        label: i.label,
        priceEur: Math.round(i.priceEur),
        durationMinutes: i.durationMinutes,
        perUnit: Math.round(i.perUnit),
        amount: Math.round(partyAmountFor(i)),
        unit: i.unit,
        unitLabel: i.unitLabel,
      }));
      const addOnsPartyTotalEur = Math.round(
        selectedAddOnItems.reduce((sum, i) => sum + partyAmountFor(i), 0),
      );
      // Canonical age-banded lines when composition is present — drives the
      // drawer's itemised breakdown and total. Falls back to flat pricing.
      const composedMinors = currentState.minorAges ?? [];
      const composedAdults =
        typeof currentState.adults === "number" && currentState.adults >= 1
          ? currentState.adults
          : typeof details.adults === "number" && details.adults >= 1
            ? details.adults
            : null;
      const journey =
        composedAdults != null
          ? resolveJourneyPricing(tour, composedAdults, composedMinors, tourPriceTiers)
          : null;
      const journeyLines = journey ? journey.lines : undefined;
      const journeyTotalEur = journey ? Math.round(journey.totalEur) : undefined;
      const totalEur = journey
        ? Math.round(journey.totalEur + addOnsPartyTotalEur)
        : Math.round(perPaxBase * details.guests + addOnsPartyTotalEur);
      setCheckoutSummary({
        tourTitle: currentState.journeyTitle ?? tour.title ?? tour.id,
        region: tour.region,
        durationHours: tour.durationHours,
        guests: details.guests,
        adults: composedAdults ?? undefined,
        minorAges: composedMinors,
        dateExact: details.tourDate || currentState.dateExact || null,
        startTime: details.startTime ?? null,
        pickupLabel: details.pickupAddress || pickupCityLabel(currentState.pickup) || "",
        pricePerPaxEur: perPaxBase,
        totalEur,
        heroSrc: tour.img ?? null,
        beats: stopLabels.slice(0, 4),
        flowLabel: "Studio",
        addOns: addOnsForCheckout,
        addOnsTotalEur: addOnsPartyTotalEur,
        addOnsPartyTotalEur,
        journeyLines,
        journeyTotalEur,
      });
      setCheckoutTourId(tour.id);
      setDetailsOpen(false);
      // Studio V3 renders Stripe Embedded Checkout INLINE below the
      // summary on the same page (plan §E4). Do not open the drawer.
      // GA4 begin_checkout — user reached Stripe surface.
      try {
        const item = buildTourItem(
          { id: tour.id, title: tour.title ?? tour.id, priceFrom: perPaxBase },
          { quantity: details.guests, tier: "studio", itemCategory: "Studio" },
        );
        gaBeginCheckout({ items: [item], valueEur: totalEur });
      } catch {
        /* silent */
      }
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        // Composition inputs are the ones already resolved above for the
        // summary card (`composedAdults` / `composedMinors`). Do NOT redefine
        // them here — divergent fallbacks are exactly what caused the price
        // mismatch we're fixing.
        // Composition must come from the SAME source the summary displayed
        // (state.adults/minorAges → details fallback). Using different inputs
        // for the invoke would let Stripe re-price against a composition the
        // traveller never saw, producing the "summary €X ≠ Stripe €Y" bug.
        const compositionSupplied = typeof composedAdults === "number" && composedAdults >= 1;
        const { data, error } = await supabase.functions.invoke("create-signature-checkout", {
          body: {
            tourId: tour.id,
            tourTitle: tour.title ?? tour.id,
            guests: details.guests,
            ...(compositionSupplied ? { adults: composedAdults, minorAges: composedMinors } : {}),
            stopLabels,

            includedItems: (() => {
              const c = getTourContent(tour.id);
              if (c.included.length > 0) return c.included;
              const m = getViatorMeta(tour.id);
              if (m?.included && m.included.length > 0) return m.included;
              return tour.included ?? [];
            })(),
            pickupLabel: details.pickupAddress || pickupCityLabel(currentState.pickup) || "",
            dateExact: details.tourDate || currentState.dateExact || null,
            journeyTitle: currentState.journeyTitle ?? null,
            priceFromEur: tour.priceFrom ?? 180,
            returnUrl: `${origin}/booking-confirmed?tour=${tour.id}`,
            environment: getStripeEnvironment(),
            flow: "studio",
            uiMode: "embedded",
            guestDetails: { ...details, hotelPickupIncluded: true },
            addOns: addOnsForCheckout,
          },
        });

        if (error) throw error;
        const resp = (data ?? {}) as { clientSecret?: string; publishableKey?: string };
        if (!resp.clientSecret || !resp.publishableKey) {
          throw new Error("Embedded checkout unavailable");
        }
        setClientSecret(resp.clientSecret);
        setPublishableKey(resp.publishableKey);
        // GA4 add_payment_info — payment surface (Stripe embedded) is ready.
        try {
          const item = buildTourItem(
            { id: tour.id, title: tour.title ?? tour.id, priceFrom: perPaxBase },
            { quantity: details.guests, tier: "studio", itemCategory: "Studio" },
          );
          gaAddPaymentInfo({ paymentType: "stripe", items: [item], valueEur: totalEur });
        } catch {
          /* silent */
        }
      } catch (e) {
        console.error("Stripe checkout failed", e);
        toast.error("Checkout unavailable right now. We've opened a private enquiry instead.");
        setClientSecret(null);
        openLeadSheet("book");
      } finally {
        setCheckoutPending(false);
      }
    },
    [checkoutPending, openLeadSheet, tourPriceTiers, selectedAddOnItems],
  );

  // Phase 7D — hydrate a saved Signature directly into the final reveal.
  // Reads ?saved=<token> once on mount, fetches the persisted state, then
  // jumps straight to the storyboard phase (skips intro + all questions).
  // Preserves editedRoutePoints from the saved payload via spread over
  // INITIAL_STATE. Invalid/missing tokens surface a graceful card.
  const load = useServerFn(loadStudioV3Signature);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("saved");
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await load({ data: { token } });
        if (cancelled) return;
        if (res.found && res.state && typeof res.state === "object") {
          const raw = res.state as Partial<StudioV3State>;
          const restored: StudioV3State = {
            ...INITIAL_STATE,
            ...raw,
            phase: "storyboard" as StudioV3Phase,
            destinationIntent:
              raw.destinationIntent === "anywhere-special"
                ? "no-preference"
                : (raw.destinationIntent ?? INITIAL_STATE.destinationIntent),
          };
          setState(restored);
          setHydrateError(null);
        } else {
          setHydrateError("not-found");
        }
      } catch (e) {
        console.error("[studio-v3 hydrate]", e);
        if (!cancelled) setHydrateError("failed");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Funnel analytics: emit `enter` whenever the active phase changes, and
  // `abandon` if the tab is hidden / page is unloaded mid-flow. Reveal
  // (storyboard) is the terminal step — no abandon counted there.
  useEffect(() => {
    trackStep({
      stepNumber: stepOf(state.phase),
      stepKey: state.phase,
      event: "enter",
    });
    // Conversion-funnel milestones (additive, never replace `enter`):
    //   purchase_intent — traveller has reached the tier ask
    //   reveal_seen    — traveller has reached the final Signature reveal
    if (state.phase === "investment") {
      trackStep({
        stepNumber: stepOf(state.phase),
        stepKey: state.phase,
        event: "purchase_intent",
      });
    }
    if (state.phase === "storyboard") {
      trackStep({
        stepNumber: stepOf(state.phase),
        stepKey: state.phase,
        event: "reveal_seen",
        value: { tier: state.investment, tourId: state.tourId },
      });
    }
  }, [state.phase, state.investment, state.tourId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (
        state.phase === "intro" ||
        state.phase === "storyboard" ||
        state.phase === "confirmation" ||
        state.phase === "guestDetails" ||
        state.phase === "checkoutSummary"
      )
        return;
      trackStep({
        stepNumber: stepOf(state.phase),
        stepKey: state.phase,
        event: "abandon",
      });
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [state.phase]);

  // Batch C — clip preloading. Warm the HTTP cache for the most-likely scene
  // clips once the traveller leaves the intro so AtmosphereBeats fade in fully
  // buffered. Idempotent + reduced-motion safe (handled inside the helper).
  useEffect(() => {
    if (state.phase === "intro") return;
    preloadStudioClips([
      STUDIO_SCENE_CLIPS.viewpoint,
      STUDIO_SCENE_CLIPS.coast,
      STUDIO_SCENE_CLIPS.hiddenCove,
      STUDIO_SCENE_CLIPS.localTable,
      STUDIO_SCENE_CLIPS.route,
      STUDIO_SCENE_CLIPS.celebration,
    ]);
  }, [state.phase]);

  // Review-and-confirm gate: do NOT auto-invoke Stripe when reaching the
  // summary. The traveller reviews the itemised price + composition first,
  // then taps "Reserve & pay" — that click is the only trigger that opens
  // Stripe Embedded Checkout inline below the summary.
  //
  // Rationale (owner-approved, Turn 3): auto-loading Stripe alongside the
  // review made "Confirm & pay" ambiguous — the payment fields appeared
  // before the traveller had confirmed the total. Gating on an explicit
  // click keeps summary and payment as two distinct beats.
  useEffect(() => {
    if (state.phase !== "checkoutSummary" && clientSecret) {
      // Leaving the checkout phase — drop the session so the next entry
      // starts from the review state again.
      setClientSecret(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const advance = useCallback((next: StudioV3Phase) => {
    // If a previous cinematic beat is still dissolving, remove it before any
    // explicit CTA transition. Otherwise mobile users can see the next screen
    // but taps still hit the old overlay, which feels like the builder froze.
    setReaction(null);
    setExiting(true);
    setState((s) => {
      // Phase-order guard — prevent CTA double-taps or stale handlers from
      // skipping forward out of sequence. The next phase must be either the
      // current one (no-op) or strictly *after* the current phase in
      // PHASE_ORDER. Anything else is dropped silently.
      const fromIdx = PHASE_ORDER.indexOf(s.phase);
      const toIdx = PHASE_ORDER.indexOf(next);
      if (fromIdx < 0 || toIdx < 0 || toIdx < fromIdx) {
        setExiting(false);
        return s;
      }
      trackStep({
        stepNumber: stepOf(s.phase),
        stepKey: s.phase,
        event: "continue",
        value: { to: next },
      });
      return s;
    });
    window.setTimeout(() => {
      setState((s) => {
        const fromIdx = PHASE_ORDER.indexOf(s.phase);
        const toIdx = PHASE_ORDER.indexOf(next);
        if (fromIdx < 0 || toIdx < 0 || toIdx < fromIdx) return s;
        return { ...s, phase: next };
      });
      setExiting(false);
    }, 380);
  }, []);

  const back = useCallback(
    (_hint?: StudioV3Phase) => {
      setReaction(null);
      setExiting(true);
      // Robust to phase reordering: walk backwards from the CURRENT phase
      // through PHASE_ORDER, skipping anything that isPhaseRelevant rules
      // out (occasion / considerations / language, plus investment/date on
      // the fast path). The hint is accepted but ignored — kept as an arg
      // so existing call-sites compile without churn.
      let idx = PHASE_ORDER.indexOf(state.phase) - 1;
      let target: StudioV3Phase = PHASE_ORDER[Math.max(0, idx)];
      while (idx > 0 && !isPhaseRelevant(target, state)) {
        idx -= 1;
        target = PHASE_ORDER[idx];
      }
      trackStep({
        stepNumber: stepOf(state.phase),
        stepKey: state.phase,
        event: "back",
        value: { to: target },
      });
      window.setTimeout(() => {
        setState((s) => ({ ...s, phase: target }));
        setExiting(false);
      }, 280);
    },
    [state],
  );

  /**
   * Show a reaction beat, then land on the next phase. The phase is
   * advanced silently beneath the overlay so when the beat dissolves the
   * next question is already mounted and ready. Users can tap the overlay
   * to dismiss the beat early.
   */
  const playReaction = useCallback(
    (r: Reaction) => {
      // Reduced-motion: skip the beat entirely and advance immediately.
      if (prefersReducedMotion()) {
        advance(r.nextPhase);
        return;
      }
      // Atmosphere beats are mood-setters — keep them brief so the next
      // question is reachable quickly. The ceiling is the authority here:
      // legacy handler holdMs values stay untouched and the cap makes the
      // whole question chain feel fast (P4).
      const rawHold = r.holdMs ?? 2400;
      const ceiling =
        r.kind === "map-beat" ? 2600 : r.kind === "interests" || r.kind === "rhythm" ? 2200 : 1400;
      const hold = Math.min(rawHold, ceiling);

      setExiting(true);
      window.setTimeout(() => {
        setState((s) => {
          trackStep({
            stepNumber: stepOf(s.phase),
            stepKey: s.phase,
            event: "continue",
            value: { to: r.nextPhase, viaReaction: r.kind },
          });
          return { ...s, phase: r.nextPhase };
        });
        setExiting(false);
        setReaction(r);
        window.setTimeout(() => {
          setReaction((current) => (current === r ? null : current));
        }, hold);
      }, 220);
    },
    [advance],
  );

  // Single-select handlers — set field, then either play a reaction beat
  // (strong beats only on the 5 priority steps) or auto-advance straight
  // to the next phase.
  const pickAndAdvance = <K extends keyof StudioV3State>(
    key: K,
    value: StudioV3State[K],
    next: StudioV3Phase,
    reactionInit?: Omit<Reaction, "nextPhase">,
    delay = 420,
  ) => {
    setState((s) => {
      trackStep({
        stepNumber: stepOf(s.phase),
        stepKey: s.phase,
        event: "select",
        value: { field: String(key), selection: value as unknown },
      });
      const nextState = { ...s, [key]: value } as StudioV3State;
      // GA4 studio_step — fire per configurator step selection.
      try {
        gaStudioStep({
          stepNumber: stepOf(s.phase),
          stepKey: s.phase,
          qualityScore: computeQualityScore(nextState)?.score ?? null,
        });
      } catch {
        /* silent */
      }
      return nextState;
    });
    if (reactionInit) {
      window.setTimeout(() => playReaction({ ...reactionInit, nextPhase: next }), delay);
    } else {
      window.setTimeout(() => advance(next), delay);
    }
  };

  // Strong reaction beats live only on: Feeling, Pickup, Interests,
  // Considerations, Investment. The other steps get quiet auto-advance.
  const onFeeling = (id: Feeling) => {
    const label = getOptionLabel(FEELINGS, id);
    const next = getNextPhase({ ...state, feeling: id }, "feeling");
    pickAndAdvance("feeling", id, next, {
      kind: "feeling",
      eyebrow: "The feeling",
      message: feelingReactionMessage(id),
      postcardCaption: label ? `Atmosphere · ${label}` : "Atmosphere selected",
      holdMs: 4400,
      bgImage: FEELING_IMAGE[id],
      bgVideo: videoForFeeling(id),
    });
  };
  const onDestination = (id: DestinationIntent) => {
    const forward: StudioV3State = { ...state, destinationIntent: id };
    setState(() => forward);
    const next = getNextPhase(forward, "destination");
    const destLabel = getOptionLabel(DESTINATION_INTENTS, id);
    const message =
      id === "no-preference"
        ? "No fixed direction. The route can find its own."
        : destLabel
          ? `${destLabel} enters the story. The shape begins to lean.`
          : "A direction begins to emerge.";
    window.setTimeout(() => {
      playReaction({
        kind: "atmosphere",
        eyebrow: "The direction",
        message,
        bgImage: state.feeling ? FEELING_IMAGE[state.feeling] : undefined,
        bgVideo: videoForDestination(id) ?? videoForFeeling(state.feeling),
        nextPhase: next,
        holdMs: 4700,
      });
    }, 420);
  };
  const onCompanions = (id: Companions) => {
    // Compute forward state (with possible guest inference) so we can both
    // commit it and resolve the next phase adaptively.
    const inferred = inferGuests(id, state.occasion, state.feeling);
    let forward: StudioV3State;
    if (inferred != null && (state.guestsInferred || state.guests == null)) {
      forward = {
        ...state,
        companions: id,
        guests: inferred,
        guestsInferred: true,
        guestsPrivateEvent: inferred >= 11,
      };
    } else if (inferred == null && state.guestsInferred) {
      forward = {
        ...state,
        companions: id,
        guests: null,
        guestsInferred: false,
        guestsPrivateEvent: false,
      };
    } else {
      forward = { ...state, companions: id };
    }
    setState(() => forward);
    const next = getNextPhase(forward, "who");
    window.setTimeout(() => {
      playReaction({
        kind: "atmosphere",
        eyebrow: "The company",
        message: companionsAtmosphereLine(id),
        bgImage: companionsAtmosphereImage(id, state.feeling),
        bgVideo: videoForCompanions(id) ?? videoForFeeling(state.feeling),
        nextPhase: next,
        holdMs: 5100,
      });
    }, 420);
  };
  const onOccasion = (id: Occasion) => {
    const inferred = inferGuests(state.companions, id, state.feeling);
    let forward: StudioV3State;
    if (inferred != null && (state.guestsInferred || state.guests == null)) {
      forward = {
        ...state,
        occasion: id,
        guests: inferred,
        guestsInferred: true,
        guestsPrivateEvent: inferred >= 11,
      };
    } else if (inferred == null && state.guestsInferred) {
      forward = {
        ...state,
        occasion: id,
        guests: null,
        guestsInferred: false,
        guestsPrivateEvent: false,
      };
    } else {
      forward = { ...state, occasion: id };
    }
    setState(() => forward);
    const next = getNextPhase(forward, "occasion");
    window.setTimeout(() => {
      playReaction({
        kind: "atmosphere",
        eyebrow: "The occasion",
        message: occasionAtmosphereLine(id, state.companions),
        bgImage: occasionAtmosphereImage(id, state.feeling),
        bgVideo: videoForFeeling(state.feeling),
        nextPhase: next,
        holdMs: 5100,
      });
    }, 420);
  };
  // Date phase (Phase 2) — operational date selection.
  // dateMode: "exact" | "flexible" | "undecided"; dateExact is ISO yyyy-mm-dd
  // only when "exact". Reaction copy reflects the chosen mode.
  const dateModeAtmosphereLine = (mode: DateMode): string => {
    if (mode === "exact") return "A clear date. The day can begin to take shape.";
    if (mode === "flexible") return "Flexible. We'll leave room for the right light.";
    return "No rush. The journey can form before the date is fixed.";
  };
  const dateBgImage = () => (state.feeling ? FEELING_IMAGE[state.feeling] : undefined);
  const playDateReaction = (mode: DateMode, exactIso: string | null = null, delay = 420) => {
    const forward: StudioV3State = {
      ...state,
      dateMode: mode,
      dateExact: mode === "exact" ? exactIso : null,
    };
    const next = getNextPhase(forward, "date");
    window.setTimeout(() => {
      playReaction({
        kind: "atmosphere",
        eyebrow: "The when",
        message: dateModeAtmosphereLine(mode),
        bgImage: dateBgImage(),
        bgVideo: videoForFeeling(state.feeling),
        nextPhase: next,
        holdMs: 4700,
      });
    }, delay);
  };
  const onDateExact = (iso: string) => {
    setState((s) => ({ ...s, dateExact: iso, dateMode: "exact" }));
    playDateReaction("exact", iso);
  };
  const onDateFlexible = () => {
    setState((s) => ({ ...s, dateExact: null, dateMode: "flexible" }));
    playDateReaction("flexible", null);
  };
  const onDateUndecided = () => {
    setState((s) => ({ ...s, dateExact: null, dateMode: "undecided" }));
    playDateReaction("undecided", null);
  };
  const onPickup = (id: Pickup) => {
    const label = getOptionLabel(PICKUPS, id);
    // Build a forward-looking state so getNextPhase can decide whether
    // guests should be asked or skipped based on inference.
    const inferred = inferGuests(state.companions, state.occasion, state.feeling);
    const forwardState: StudioV3State =
      inferred != null
        ? {
            ...state,
            pickup: id,
            guests: inferred,
            guestsInferred: true,
            guestsPrivateEvent: inferred >= 11,
          }
        : { ...state, pickup: id };
    if (inferred != null) {
      setState((s) => ({
        ...s,
        guests: inferred,
        guestsInferred: true,
        guestsPrivateEvent: inferred >= 11,
      }));
    }
    const nextAfterPickup = getNextPhase(forwardState, "pickup");
    const originLabel = pickupCityLabel(id);
    const name = state.firstName?.trim() || null;
    if (STUDIO_V3_MAP_BEATS_ENABLED && originLabel) {
      const line = name
        ? `${name}, the day begins in ${originLabel}.`
        : `The day begins in ${originLabel}.`;
      pickAndAdvance("pickup", id, nextAfterPickup, {
        kind: "map-beat",
        eyebrow: "The beginning",
        message: line,
        mapMode: "origin",
        originLabel,
        originCoord: pickupOriginCoord(id),
        regionKey: pickupRegionKey(id) ?? undefined,
        holdMs: 5800,
      });
      return;
    }
    pickAndAdvance("pickup", id, nextAfterPickup, {
      kind: "pickup",
      eyebrow: "The beginning",
      message: label
        ? `It starts here.\nFrom ${label}, the day begins to open.`
        : "It starts here.\nThe day begins to open.",
      originLabel: label,
      postcardSubline: "Route forming",
      holdMs: 4800,
      bgImage: state.feeling ? FEELING_IMAGE[state.feeling] : undefined,
      bgVideo: videoForFeeling(state.feeling),
    });
  };
  /** Phase 3 — adult count from the stepper (1–14). Manual change always
   *  clears the inferred flag and refreshes the private-event flag. Keeps
   *  `state.guests` (total headcount) in sync = adults + minorAges.length,
   *  so downstream tier lookup, vehicle sizing and legacy paths stay
   *  correct while age-band pricing is layered on top server-side. */
  const onGuestsChange = (n: number) => {
    const nextAdults = Math.max(1, Math.min(14, Math.trunc(n)));
    setState((s) => {
      const minors = s.minorAges ?? [];
      const total = Math.min(14, nextAdults + minors.length);
      return {
        ...s,
        adults: nextAdults,
        guests: total,
        guestsInferred: false,
        guestsPrivateEvent: total >= 11,
      };
    });
  };
  const onAddMinor = () => {
    setState((s) => {
      const minors = [...(s.minorAges ?? []), 8]; // sensible default: child band
      const adultsCount = s.adults ?? s.guests ?? 2;
      const total = Math.min(14, adultsCount + minors.length);
      return {
        ...s,
        adults: adultsCount,
        minorAges: minors,
        guests: total,
        guestsInferred: false,
        guestsPrivateEvent: total >= 11,
      };
    });
  };
  const onRemoveMinor = (index: number) => {
    setState((s) => {
      const minors = (s.minorAges ?? []).filter((_, i) => i !== index);
      const adultsCount = s.adults ?? s.guests ?? 2;
      const total = adultsCount + minors.length;
      return {
        ...s,
        minorAges: minors,
        guests: total,
        guestsPrivateEvent: total >= 11,
      };
    });
  };
  const onMinorAgeChange = (index: number, age: number) => {
    setState((s) => {
      const minors = (s.minorAges ?? []).slice();
      minors[index] = Math.max(0, Math.min(17, Math.trunc(age)));
      return { ...s, minorAges: minors };
    });
  };

  /**
   * "Let YES decide" — the traveller hands one dimension to the curator.
   * We commit a REAL value inferred from their own answers (deterministic,
   * taxonomy-bound) and continue exactly as if they had chosen it.
   */
  const onLetYesDecide = (key: DecidedForMeKey) => {
    trackStudio("surprise_me_selected", { phase: key, stepNumber: stepOf(state.phase) });
    if (key === "feeling") {
      const id = decideFeeling(state);
      setState((s) => ({ ...s, decidedForMe: [...new Set([...s.decidedForMe, key])] }));
      onFeeling(id);
      return;
    }
    if (key === "interests") {
      const ids = decideInterests(state);
      const forward: StudioV3State = {
        ...state,
        interests: ids,
        decidedForMe: [...new Set([...state.decidedForMe, key])],
      };
      setState(() => forward);
      window.setTimeout(() => advance(getNextPhase(forward, "interests")), 80);
      return;
    }
    const rhythmId = decideRhythm(state);
    setState((s) => ({ ...s, decidedForMe: [...new Set([...s.decidedForMe, key])] }));
    onRhythm(rhythmId);
  };

  const onRhythm = (id: Rhythm) => {
    const name = state.firstName?.trim() || null;
    const baseHint =
      id === "slow"
        ? "slower, more local, more deliberate"
        : id === "balanced"
          ? "movement and pause, in balance"
          : id === "full"
            ? "richer, still shaped into one realistic day"
            : "a fuller arc, carefully held";
    const hint = name
      ? `For you, this route is becoming ${baseHint}.`
      : id === "slow"
        ? "Fewer stops. More time in place."
        : id === "balanced"
          ? "Movement and pause, kept in balance."
          : id === "full"
            ? "More discovery, still shaped into one realistic day."
            : "A fuller arc, carefully held.";
    const pickupLabel = getOptionLabel(PICKUPS, state.pickup);
    const next = getNextPhase({ ...state, rhythm: id }, "rhythm");

    if (STUDIO_V3_MAP_BEATS_ENABLED && state.feeling && state.companions) {
      const resolved = resolveStudioV3Route({
        feeling: state.feeling,
        companions: state.companions,
        rhythm: id,
        interests: state.interests,
        pickup: state.pickup,
        occasion: state.occasion,
        investment: state.investment,
        destinationIntent: state.destinationIntent,
        refinement: state.refinement,
      });
      const labels = resolved.routePoints.map((p) => p.label);
      if (labels.length > 0) {
        const paceHint =
          id === "slow"
            ? "A slower day needs fewer, better moments."
            : id === "balanced"
              ? "Movement and pause, held in balance across the route."
              : id === "full"
                ? "A richer arc — still shaped into one realistic day."
                : "A fuller, immersive arc — carefully held.";
        pickAndAdvance("rhythm", id, next, {
          kind: "map-beat",
          eyebrow: "The rhythm",
          message: paceHint,
          mapMode: "pace",
          originLabel: pickupCityLabel(state.pickup) || undefined,
          originCoord: pickupOriginCoord(state.pickup),
          routeLabels: labels,
          rhythmBucket: id,
          regionKey:
            tourRegionToRegionKey(
              (resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null)?.region ??
                null,
            ) ??
            pickupRegionKey(state.pickup) ??
            undefined,
          holdMs: 6200,
        });

        return;
      }
    }

    pickAndAdvance("rhythm", id, next, {
      kind: "rhythm",
      eyebrow: "The rhythm",
      message: hint,
      originLabel: pickupLabel ?? undefined,
      postcardCaption:
        id === "slow"
          ? "Slow"
          : id === "balanced"
            ? "Balanced"
            : id === "full"
              ? "Full"
              : "Immersive",
      postcardSubline: "The route keeps forming.",
      holdMs: 4200,
    });
  };
  // The single adaptive question, resolved from the traveller's own answers.
  // Null when nothing is worth asking — the phase is then skipped entirely.
  const availableAdaptiveKinds = useMemo(() => availableAdaptiveQuestionKinds(state), [state]);
  const advisor = useStudioIntentAdvisor(state, availableAdaptiveKinds);
  const adaptiveQuestion = useMemo(
    () => resolveAdaptiveQuestion(state, advisor.interpretation?.preferredAdaptiveKind ?? null),
    [state, advisor.interpretation?.preferredAdaptiveKind],
  );

  /**
   * Adaptive refinement — one conditional question. The answer becomes a
   * real discovery signal inside the Living Atlas decision (never a price
   * input, never an invented stop).
   */
  const onRefinement = (id: AdaptiveRefinementId) => {
    const next = getNextPhase({ ...state, refinement: id }, "refinement");
    const summary = refinementSummaryLabel(id);
    pickAndAdvance("refinement", id, next, {
      kind: "rhythm",
      eyebrow: "Noted",
      message: summary
        ? `${summary}. We will build the day around that.`
        : "Noted. We will build the day around that.",
      // Copy-only beat: no schematic panel, and short enough that the
      // logistics screen underneath is reachable almost immediately.
      hidePanel: true,
      holdMs: 1600,
    });
  };

  const onLanguage = (id: Language) => {
    const next = getNextPhase({ ...state, language: id }, "language");
    pickAndAdvance("language", id, next);
  };
  const onInvestment = (id: InvestmentTier) => {
    const next = getNextPhase({ ...state, investment: id }, "investment");
    const label = getOptionLabel(INVESTMENT_TIERS, id);
    // Dedicated conversion event — tier explicitly chosen.
    trackStep({
      stepNumber: stepOf("investment"),
      stepKey: "investment",
      event: "tier_chosen",
      value: { tier: id, label },
    });
    // GA4 add_to_cart — Studio tier selected.
    try {
      const tierPrice =
        id === "considered" ? 180 : id === "elevated" ? 320 : id === "bespoke" ? 550 : 0;
      gaAddToCartStudioTier({
        tier: id,
        priceEur: tierPrice,
        tourId: state.tourId ?? null,
        tourTitle: state.journeyTitle ?? null,
      });
    } catch {
      /* silent */
    }

    if (STUDIO_V3_MAP_BEATS_ENABLED && state.feeling && state.companions) {
      const resolved = resolveStudioV3Route({
        feeling: state.feeling,
        companions: state.companions,
        rhythm: state.rhythm,
        interests: state.interests,
        pickup: state.pickup,
        occasion: state.occasion,
        investment: id,
        destinationIntent: state.destinationIntent,
      });
      const labels = resolved.routePoints.map((p) => p.label);
      if (labels.length > 0) {
        pickAndAdvance("investment", id, next, {
          kind: "map-beat",
          eyebrow: "The shape",
          message: label
            ? `The route is no longer a template. It refines around ${label.toLowerCase()}.`
            : "The route is no longer a template. Its shape is becoming yours.",
          mapMode: "pins",
          originLabel: pickupCityLabel(state.pickup) || undefined,
          originCoord: pickupOriginCoord(state.pickup),
          routeLabels: labels,
          regionKey:
            tourRegionToRegionKey(
              (resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null)?.region ??
                null,
            ) ??
            pickupRegionKey(state.pickup) ??
            undefined,
          holdMs: 6000,
        });

        return;
      }
    }

    pickAndAdvance("investment", id, next, {
      kind: "investment",
      eyebrow: "The shape",
      message: "This sets the tone.\nThe day will be shaped around it.",
      postcardCaption: label ? `Direction · ${label}` : "Direction set",
      postcardSubline: "The moments will follow from here.",
      holdMs: 4200,
    });
  };

  // Multi-select toggles.
  // Interests are capped at MAX_INTERESTS — four moments is the sweet spot
  // for a 1-day rhythm and matches the dwell-budget logic downstream.
  const MAX_INTERESTS = 4;
  const toggleInterest = (id: Interest) => {
    setState((s) => {
      const has = s.interests.includes(id);
      if (has) {
        return { ...s, interests: s.interests.filter((x) => x !== id) };
      }
      // P5: inherited themes (already stated in Feeling) never consume a slot.
      const countable = countableInterests(s.interests, deriveInheritedIntent(s));
      if (countable.length >= MAX_INTERESTS) return s;
      return { ...s, interests: [...s.interests, id] };
    });
  };
  const toggleConsideration = (id: Consideration) => {
    setState((s) => {
      const has = s.considerations.includes(id);
      if (id === "none") {
        // Toggling "none": either clear everything (when adding) or remove it.
        return { ...s, considerations: has ? [] : ["none"] };
      }
      // Toggling any other: remove "none" if present, then toggle.
      const without = s.considerations.filter((x) => x !== "none" && x !== id);
      return {
        ...s,
        considerations: has ? without : [...without, id],
      };
    });
  };

  // Continue handlers for the two multi-select screens — reaction fires
  // on Continue only, never on each toggle.
  const continueFromInterests = () => {
    const allChips = state.interests
      .map((id) => getOptionLabel(INTERESTS, id))
      .filter((l): l is string => Boolean(l));
    const chips = allChips.slice(0, 4);
    const tail = allChips.length > 4 ? "and more to refine" : undefined;
    const next = getNextPhase(state, "interests");

    // Map-led beat — preview the forming route using a tentative balanced
    // rhythm (real Signature stops; no invention). If the resolver returns
    // no points (insufficient state), gracefully fall back to the
    // image-led interests beat.
    if (STUDIO_V3_MAP_BEATS_ENABLED && state.feeling && state.companions) {
      const resolved = resolveStudioV3Route({
        feeling: state.feeling,
        companions: state.companions,
        rhythm: state.rhythm ?? "balanced",
        interests: state.interests,
        pickup: state.pickup,
        occasion: state.occasion,
        investment: state.investment,
        destinationIntent: state.destinationIntent,
        refinement: state.refinement,
      });
      const labels = resolved.routePoints.map((p) => p.label);
      if (labels.length > 0) {
        const name = state.firstName?.trim() || null;
        const interestLabels = state.interests
          .slice(0, 2)
          .map((iid) => getOptionLabel(INTERESTS, iid)?.toLowerCase())
          .filter((l): l is string => Boolean(l));
        const interestPhrase =
          interestLabels.length === 2
            ? `${interestLabels[0]} and ${interestLabels[1]}`
            : (interestLabels[0] ?? null);
        const message =
          name && interestPhrase
            ? `${name}, we are matching ${interestPhrase} to one real route.`
            : interestPhrase
              ? `Matching ${interestPhrase} to one real route.`
              : "Matching your choices to one real route.";
        playReaction({
          kind: "map-beat",
          eyebrow: "The moments",
          message,
          mapMode: "pins",
          originLabel: pickupCityLabel(state.pickup) || undefined,
          originCoord: pickupOriginCoord(state.pickup),
          routeLabels: labels,
          regionKey:
            tourRegionToRegionKey(
              (resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null)?.region ??
                null,
            ) ??
            pickupRegionKey(state.pickup) ??
            undefined,
          nextPhase: next,
          holdMs: 6200,
        });

        return;
      }
    }

    playReaction({
      kind: "interests",
      eyebrow: "The moments",
      message: "These are the moments that will stay.\nThe rest can stay quiet.",
      chips: chips.length > 0 ? chips : undefined,
      chipsLabel: chips.length > 0 ? "Chosen moments" : undefined,
      chipsTail: tail,
      postcardSubline: "These will guide the route.",
      nextPhase: next,
      holdMs: 4600,
      bgImage: state.interests[0] ? INTEREST_IMAGE[state.interests[0]] : undefined,
      bgVideo: videoForInterest(state.interests[0]) ?? videoForFeeling(state.feeling),
    });
  };
  const continueFromConsiderations = () => {
    const isNone = state.considerations.length === 0 || state.considerations.includes("none");
    const next = getNextPhase(state, "considerations");
    playReaction({
      kind: "considerations",
      eyebrow: "The care",
      message: "It is not just where you go.\nIt is how the day fits you.",
      postcardCaption: isNone ? "Nothing to adjust." : "Care notes held.",
      nextPhase: next,
      holdMs: 4200,
    });
  };

  // Keyboard back — follows the full phase chain in reverse. Escape during
  // a reaction beat just dismisses the beat and reveals the phase beneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (reaction) {
        setReaction(null);
        return;
      }
      const prev = prevPhase(state.phase);
      if (prev) back(prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, back, reaction]);

  const step = stepOf(state.phase);

  // -------- Adaptive option ordering (deterministic, derived from state) --------
  const isCoupleish =
    state.companions === "couple" ||
    state.companions === "proposal" ||
    state.occasion === "honeymoon" ||
    state.occasion === "anniversary" ||
    state.occasion === "proposal" ||
    state.feeling === "romance";
  const isFamily = state.companions === "family";
  const isCorporate = state.companions === "corporate";

  const interestsPriority: Interest[] =
    state.feeling === "wine-food"
      ? ["wine", "gastronomy", "local-life"]
      : state.feeling === "coastal" || state.feeling === "adventure"
        ? ["coast", "nature", "photography"]
        : state.feeling === "slow-luxury"
          ? ["wellness", "gastronomy", "wine"]
          : state.feeling === "culture"
            ? ["heritage", "local-life", "photography"]
            : isFamily
              ? ["nature", "coast", "local-life"]
              : [];

  const rhythmPriority: Rhythm[] =
    isCoupleish || state.feeling === "slow-luxury"
      ? ["slow", "balanced", "full", "immersive"]
      : isFamily
        ? ["balanced", "slow"]
        : isCorporate
          ? ["balanced", "full"]
          : [];

  const investmentPriority: InvestmentTier[] = isCoupleish
    ? ["elevated", "bespoke", "considered", "open"]
    : isCorporate
      ? ["elevated", "bespoke"]
      : [];

  const considerationsPriority: Consideration[] = isFamily
    ? ["quiet-pace", "avoid-long-walks", "child-seats"]
    : state.companions === "celebration" || state.occasion === "celebration"
      ? ["quiet-pace"]
      : [];

  // Phase 4: filter first (hide irrelevant options entirely), then prioritise.
  // P5: then prune themes already stated in Feeling — derived, never mutated.
  const inheritedIntent = deriveInheritedIntent(state);
  const orderedInterests = pruneInheritedInterests(
    prioritiseOptions(filterInterests(INTERESTS, state.companions), interestsPriority),
    inheritedIntent,
  );
  const countableSelectedInterests = countableInterests(state.interests, inheritedIntent);

  // P7 "Director's Read": one non-blocking interpretation beat rendered in
  // place of Logistics the first time a given reading is reached. It is NOT a
  // phase — the phase model, gating, curation and pricing are untouched. The
  // copy is composed deterministically from state, so back-navigation and
  // changed answers recompute with no stale text. Once a reading has been
  // acknowledged (one tap) the same reading never interrupts again; changing a
  // meaningful answer produces a new signature and a new read.
  const directorsRead = useMemo(
    () =>
      composeDirectorsRead({
        feeling: state.feeling,
        companions: state.companions,
        interests: state.interests,
        rhythm: state.rhythm,
      }),
    [state.feeling, state.companions, state.interests, state.rhythm],
  );
  const [directorsReadSeen, setDirectorsReadSeen] = useState<string | null>(null);
  const showDirectorsRead =
    state.phase === "logistics" && directorsReadSeen !== directorsRead.signature;

  // P6 "acknowledge once": one deterministic ledger decides which surface may
  // still acknowledge a taste / emotion / rhythm signal. Interests owns the
  // first echo (P5); later surfaces show only what is genuinely new, and
  // render nothing at all when everything has already been heard. Operational
  // facts (date, pickup, party, region) are not acknowledgements and are never
  // suppressed. Derived every render — no stored acknowledgement state.
  const acknowledgementContext: AcknowledgementContext = {
    state: { feeling: state.feeling, interests: state.interests, rhythm: state.rhythm },
    refinementShown: Boolean(adaptiveQuestion),
    // The read voices its themes in prose, so Logistics/reveal stay quiet
    // about them. Only counts once the traveller has actually seen it.
    directorsRead: {
      shown: showDirectorsRead || directorsReadSeen === directorsRead.signature,
      themes: directorsRead.themes,
    },
  };

  const renderAcknowledgement = (surface: "refinement" | "logistics") => {
    const summary = acknowledgementSummaryFor(surface, acknowledgementContext);
    if (!summary) return null;
    return (
      <div
        data-testid="studio-v3-understood-summary"
        data-acknowledgement-surface={surface}
        className="w-full max-w-[520px] mx-auto mb-1 text-center"
      >
        <p
          className="text-[15px] leading-[1.35]"
          style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
        >
          {summary.lead}
        </p>
        <p
          className="mt-1 text-[11px] uppercase tracking-[0.2em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
        >
          {summary.detail}
        </p>
      </div>
    );
  };
  const orderedRhythms = prioritiseOptions(RHYTHMS, rhythmPriority);
  const orderedInvestment = prioritiseOptions(INVESTMENT_TIERS, investmentPriority);
  const orderedConsiderations = prioritiseOptions(
    filterConsiderations(CONSIDERATIONS, state.companions),
    considerationsPriority,
  );

  // Adaptive occasion list: filter by companions first (hide invalid for
  // solo/couple/family/friends/corporate), then apply context priority order.
  const filteredOccasions = filterOccasions(OCCASIONS, state.companions);
  const orderedOccasions = isCoupleish
    ? prioritiseOptions(filteredOccasions, [
        "honeymoon",
        "proposal",
        "anniversary",
        "birthday",
        "none",
        "celebration",
      ])
    : isFamily
      ? prioritiseOptions(filteredOccasions, ["family-day", "birthday", "celebration", "none"])
      : isCorporate
        ? prioritiseOptions(filteredOccasions, ["corporate", "celebration", "none"])
        : filteredOccasions;

  // Living Journey Panel (heavy editorial text) — keep hidden during the
  // question chain to avoid competing with the active phase. Reveals on
  // map/storyboard where it owns the surface.
  const livingPanelHidden =
    !!reaction ||
    state.phase === "intro" ||
    state.phase === "feeling" ||
    state.phase === "map" ||
    state.phase === "storyboard" ||
    state.phase === "confirmation" ||
    state.phase === "guestDetails" ||
    state.phase === "checkoutSummary";

  // ComposerMap — Studio Bible §4 "live map updates as stops change".
  // Lightweight, peripheral, progressive: renders the moment the traveller
  // has made any meaningful pick (feeling/companions/rhythm) so the day
  // is *visibly* taking shape between every question. Hidden only on:
  //   - intro (pre-Studio canvas)
  //   - the dedicated map/storyboard phases (own surface)
  //   - while a reaction overlay is on screen
  // Chrome only earns its place once the traveller has placed a starting
  // point on the map — i.e. there is genuinely a route forming. Before
  // that, the journey pill, atmospheric stage, investment ribbon and
  // beat stepper all stay out of the way so the questions can breathe.
  // (Studio philosophy: the interface disappears until it has something
  // real to say.)
  // Hard phase gate: the early discovery phases (feeling → destination →
  // who → occasion → date → pickup) are pure questions. No stage panel,
  // no stepper, no investment ribbon, no journey pill — the interface
  // disappears so the question can breathe. Chrome only earns its place
  // from `guests` onward, once the traveller has placed a starting point.
  const EARLY_PHASES: StudioV3Phase[] = [
    "intro",
    "feeling",
    "destination",
    "who",
    "occasion",
    "date",
    "pickup",
  ];
  const chromeReady = state.pickup != null && !EARLY_PHASES.includes(state.phase);
  const composerHidden =
    !!reaction ||
    !chromeReady ||
    state.phase === "map" ||
    state.phase === "storyboard" ||
    state.phase === "confirmation" ||
    state.phase === "guestDetails" ||
    state.phase === "checkoutSummary";

  // Phase 7D — saved-link hydration overlays. Loading spinner while we
  // fetch a `?saved=<token>` Signature; graceful card if it's missing or
  // failed. Both short-circuit before the intro/Studio chrome.
  if (hydrating && !hydrateError) {
    return (
      <main
        aria-label="Opening your Signature"
        className="min-h-[100dvh] flex items-center justify-center px-6"
        style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
      >
        <div
          data-testid="studio-v3-hydrating"
          role="status"
          aria-live="polite"
          className="w-full max-w-[420px] text-center"
        >
          {/* Editorial skeleton — suggests the Signature card composing itself.
              Shimmer utility respects prefers-reduced-motion (collapses to
              static sand blocks). Copy still announces the state to SR. */}
          <div className="mx-auto flex flex-col items-center gap-3">
            <div
              aria-hidden
              className="editorial-shimmer h-[9px] w-[92px] rounded-[1px]"
              style={{ opacity: 0.85 }}
            />
            <div aria-hidden className="editorial-shimmer h-[22px] w-[78%] rounded-[2px]" />
            <div aria-hidden className="editorial-shimmer h-[22px] w-[62%] rounded-[2px]" />
            <div
              aria-hidden
              className="mt-1 h-px w-10"
              style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
            />
            <div
              aria-hidden
              className="editorial-shimmer h-[11px] w-[58%] rounded-[1px] mt-1"
              style={{ opacity: 0.7 }}
            />
          </div>
          <p
            className="mt-8 text-[11px] uppercase tracking-[0.24em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
          >
            Opening your Signature…
          </p>
        </div>
      </main>
    );
  }

  if (hydrateError) {
    return (
      <main
        aria-label="Signature not available"
        className="min-h-[100dvh] flex items-center justify-center px-6"
        style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
      >
        <div className="max-w-md text-center" data-testid="studio-v3-hydrate-error">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-bold"
            style={{ color: "var(--gold)" }}
          >
            YES Studio
          </p>
          <h2
            className="mt-3 text-[1.6rem] font-semibold leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {hydrateError === "not-found"
              ? "This Signature is no longer available."
              : "We couldn't open this Signature."}
          </h2>
          <p
            className="mt-3 text-[14px] leading-[1.55]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
          >
            The private link may have expired or been mistyped. You can begin a new Signature in a
            few taps.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.history.replaceState({}, "", window.location.pathname);
              }
              setHydrateError(null);
              setState({ ...INITIAL_STATE });
            }}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{
              color: "var(--ivory)",
              background: "var(--charcoal)",
              border: "1px solid var(--charcoal)",
              borderRadius: 999,
            }}
          >
            Start a new Signature
          </button>
        </div>
      </main>
    );
  }

  // Intro is a pre-Studio moment — render its own canvas and short-circuit
  // the rest of the Studio chrome (no ComposerMap, no Journey pill,
  // no footer help, no progress).
  if (state.phase === "intro") {
    return (
      <StudioV3Intro
        onComplete={(name, pathMode) => {
          setState((s) => ({ ...s, firstName: name, pathMode }));
          advance("feeling");
        }}
      />
    );
  }

  // Ambient anticipation — Portugal silhouette behind every phase.
  // The coastline draws in with progress; a gold pulse settles on the
  // inferred region the moment the traveller hints at one. Strict
  // atmosphere — never interactive, never labelled.
  const anticipation = (() => {
    const pct = studioV3Progress(state, state.phase)?.percent ?? 0;
    const fill = Math.max(0.12, Math.min(1, pct / 100));
    const intent = state.destinationIntent;
    let region: import("./PortugalSilhouette").SilhouetteRegion = null;
    if (intent === "alentejo-evora-wine" || intent === "comporta-troia") region = "alentejo";
    else if (intent === "central-portugal" || intent === "spiritual-coast") region = "centro";
    else if (intent === "lisbon-sintra-cascais") region = "lisbon-coast";
    else if (intent === "arrabida-setubal-azeitao") region = "arrabida";
    return { fill, region };
  })();

  return (
    <main aria-label="YES Studio" data-testid="studio-v3-root" data-phase={state.phase}>
      <StudioV3DebugOverlay
        state={state}
        composerHidden={composerHidden}
        reactionActive={!!reaction}
      />
      <LivingJourneyPanel state={state} hidden={composerHidden} />
      <ComposerMap state={state} hidden={composerHidden} />
      <CloseStudio hasProgress={state.phase !== "who"} />
      {chromeReady ? (
        <StudioV3ProgressStepper
          phase={state.phase}
          onJumpToBeat={(_beat, entryPhase) => back(entryPhase)}
          onBeatAdvance={(beat, index) => {
            if (isMobile) setMobileReveal({ beat, index });
          }}
        />
      ) : null}
      <RunningInvestmentRibbon
        state={state}
        hidden={composerHidden}
        totalEur={resolvedJourney.totalEur}
        adultUnitEur={resolvedJourney.adultUnitEur}
        guests={resolvedJourney.guests}
      />
      {isMobile ? (
        <MobileBeatReveal
          beat={mobileReveal?.beat ?? null}
          index={mobileReveal?.index ?? 0}
          onDone={() => setMobileReveal(null)}
        />
      ) : null}

      {state.phase === "feeling" ? (
        <PhaseShell
          accent="ivory"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <PhaseHeader
            eyebrow="The feeling"
            title="How would you like"
            titleAccent="Portugal to feel?"
          />
          <ChoiceGrid
            options={filterFeelings(FEELINGS, state.companions)}
            value={state.feeling}
            onSelect={onFeeling}
          />
          {state.feeling ? (
            <NextTeaser>{contextualTeaser("feeling", state)}</NextTeaser>
          ) : (
            <FooterHint>One choice. You can shape the rest later.</FooterHint>
          )}
          {state.feeling ? null : (
            <LetYesDecide label="Let YES decide" onClick={() => onLetYesDecide("feeling")} />
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "destination" ? (
        <PhaseShell
          accent="teal"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("feeling")} />
          <PhaseHeader
            eyebrow="The direction"
            title="Where in Portugal"
            titleAccent="is calling you?"
          />
          <p
            className="mt-1 mb-6 max-w-[34ch] mx-auto text-center text-[13px] leading-[1.55]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
          >
            Pick a direction, or let YES shape it around your choices.
          </p>
          <div
            data-testid="studio-v3-destination-region-grid"
            data-selected-region={state.destinationIntent ?? ""}
          >
            <ChoiceGrid
              options={filterDestinationIntents(DESTINATION_INTENTS)}
              value={state.destinationIntent}
              onSelect={onDestination}
              columns={1}
            />
          </div>
          <PartialReveal intent={state.destinationIntent} />
          {state.destinationIntent && state.destinationIntent !== "no-preference" ? (
            <NextTeaser>Portugal is starting to open in the right direction.</NextTeaser>
          ) : (
            <FooterHint>
              Optional — pickup tells us where you stay, not where the day goes.
            </FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "who" ? (
        <PhaseShell
          accent="gold"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("destination")} />
          <PhaseHeader eyebrow="The company" title="Who is" titleAccent="travelling?" />
          <ChoiceGrid
            options={filterCompanions(COMPANIONS, state.feeling)}
            value={state.companions}
            onSelect={onCompanions}
          />
          {state.companions ? (
            <NextTeaser>{contextualTeaser("who", state)}</NextTeaser>
          ) : (
            <FooterHint>This quietly shapes what we suggest next.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "occasion" ? (
        <PhaseShell
          accent="ivory"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("who")} />
          <PhaseHeader eyebrow="The occasion" title="Is there a" titleAccent="reason behind it?" />
          <ChoiceGrid options={orderedOccasions} value={state.occasion} onSelect={onOccasion} />
          {state.occasion ? (
            <NextTeaser>{contextualTeaser("occasion", state)}</NextTeaser>
          ) : (
            <FooterHint>If yes, we'll quietly tilt the day towards it.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {/* The blocking interpretation overlay was removed: the acknowledgement is
          now a single inline line shown once, before Logistics. */}

      {/* P7 — Director's Read. Sits in the Logistics slot for exactly one tap,
          then hands over. Never a gate: one visible CTA continues, and Back
          still walks the normal phase order. */}
      {showDirectorsRead ? (
        <PhaseShell accent="ivory" exiting={exiting}>
          <DirectorsRead
            read={directorsRead}
            onView={(signature) =>
              trackStudio("interpretation_viewed", {
                phase: "directors_read",
                stepNumber: stepOf("logistics"),
                // Privacy-safe: shape of the read only, never answers or PII.
                read_kind: directorsRead.neutral ? "neutral" : "interpreted",
                lines: directorsRead.body.length,
                themes: directorsRead.themes.length,
                signature_length: signature.length,
              })
            }
            onBack={() => {
              setDirectorsReadSeen(directorsRead.signature);
              back(directorsReadBackTarget(Boolean(adaptiveQuestion)));
            }}
            onContinue={() => setDirectorsReadSeen(directorsRead.signature)}
          />
        </PhaseShell>
      ) : null}

      {state.phase === "logistics" && !showDirectorsRead ? (

        <PhaseShell
          accent="teal"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <LogisticsPhase
            state={state}
            setState={setState}
            onAdultsChange={onGuestsChange}
            onAddMinor={onAddMinor}
            onRemoveMinor={onRemoveMinor}
            onMinorAgeChange={onMinorAgeChange}
            acknowledgement={renderAcknowledgement("logistics")}
            onBackPhase={() => back("rhythm")}
            onCompose={() => {
              const committedAdults = state.adults ?? state.guests ?? 2;
              const committedMinors = state.minorAges ?? [];
              const committedTotal = committedAdults + committedMinors.length;
              const forward: StudioV3State = {
                ...state,
                adults: committedAdults,
                minorAges: committedMinors,
                guests: committedTotal,
                guestsPrivateEvent: committedTotal >= 11,
              };
              setState(() => forward);
              trackStudio("logistics_completed", {
                phase: "logistics",
                stepNumber: stepOf("logistics"),
                date_mode: forward.dateMode,
                guests: committedTotal,
              });
              // P8: the standalone `map` beat no longer runs, so the Signature
              // identity it used to commit (tourId + journeyTitle) is resolved
              // here, from the same authority (`resolveStudioV3Route`). Pricing
              // and every downstream resolution stay byte-identical.
              const composedRoute = resolveStudioV3Route({
                feeling: forward.feeling,
                companions: forward.companions,
                rhythm: forward.rhythm,
                interests: forward.interests,
                pickup: forward.pickup,
                occasion: forward.occasion,
                considerations: forward.considerations,
                investment: forward.investment,
                destinationIntent: forward.destinationIntent,
                dateExact: forward.dateExact,
                refinement: forward.refinement,
              });
              const composedTour = composedRoute.skeletonTourKey
                ? findTour(composedRoute.skeletonTourKey)
                : null;
              const composedTourId = composedTour?.id ?? forward.tourId ?? null;
              const composedTitle =
                forward.journeyTitle ??
                composeJourneyTitle({
                  feeling: forward.feeling,
                  companions: forward.companions,
                  occasion: forward.occasion,
                  pickup: forward.pickup,
                  interests: forward.interests,
                  rhythm: forward.rhythm,
                  region: composedTour?.region ?? null,
                });
              setState((s) => ({
                ...s,
                tourId: composedTourId ?? s.tourId,
                journeyTitle: composedTitle,
              }));
              // No blocking interpretation overlay: the acknowledgement already
              // happened inline, so we move straight into the composition.
              window.setTimeout(() => advance(getNextPhase(forward, "logistics")), 60);
            }}
          />
        </PhaseShell>
      ) : null}

      {state.phase === "date" ? (
        <PhaseShell
          accent="teal"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("occasion")} />
          <PhaseHeader eyebrow="The when" title="When should" titleAccent="this unfold?" />
          <DatePhaseControls
            dateExact={state.dateExact}
            dateMode={state.dateMode}
            onPickExact={onDateExact}
            onPickFlexible={onDateFlexible}
            onPickUndecided={onDateUndecided}
          />
          {state.dateMode ? (
            <NextTeaser>{dateNextTeaser(state.dateMode)}</NextTeaser>
          ) : (
            <FooterHint>Pick a date, or tell us you're flexible.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "pickup" ? (
        <PhaseShell
          accent="gold"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("date")} />
          <PhaseHeader eyebrow="The beginning" title="Where does" titleAccent="the day begin?" />
          <ChoiceGrid options={PICKUPS} value={state.pickup} onSelect={onPickup} columns={1} />
          {state.pickup ? (
            <NextTeaser>{contextualTeaser("pickup", state)}</NextTeaser>
          ) : (
            <FooterHint>Pickup is included from the Lisbon region.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "guests" ? (
        <PhaseShell
          accent="ivory"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("pickup")} />
          <PhaseHeader eyebrow="The party" title="How many" titleAccent="guests?" />
          <Composition
            adults={state.adults ?? state.guests}
            adultsInferred={state.guestsInferred}
            minorAges={state.minorAges ?? []}
            onAdultsChange={onGuestsChange}
            onAddMinor={onAddMinor}
            onRemoveMinor={onRemoveMinor}
            onMinorAgeChange={onMinorAgeChange}
          />
          {state.guests != null ? (
            <NextTeaser>{contextualTeaser("guests", state)}</NextTeaser>
          ) : (
            <FooterHint>This helps us shape the vehicle, pace and table.</FooterHint>
          )}
          <ContinueCta
            disabled={false}
            onClick={() => {
              // If the user never touched the stepper, commit the displayed
              // default (2 adults, 0 minors) before advancing so the count
              // is always real.
              const committedAdults = state.adults ?? state.guests ?? 2;
              const committedMinors = state.minorAges ?? [];
              const committedTotal = committedAdults + committedMinors.length;
              if (state.adults == null && state.guests == null) onGuestsChange(2);
              const forward: StudioV3State = {
                ...state,
                adults: committedAdults,
                minorAges: committedMinors,
                guests: committedTotal,
                guestsPrivateEvent: committedTotal >= 11,
              };
              advance(getNextPhase(forward, "guests"));
            }}
            label="Continue"
          />
        </PhaseShell>
      ) : null}

      {state.phase === "interests" ? (
        <PhaseShell
          accent="teal"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back(state.guestsInferred ? "pickup" : "guests")} />
          <PhaseHeader eyebrow="The moments" title="What" titleAccent="pulls you in?" />
          {inheritedIntent.labels.length > 0 ? (
            <div
              data-testid="studio-v3-inherited-intent"
              data-inherited={inheritedIntent.interestIds.join(",")}
              className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 self-start"
            >
              <span
                className="text-[10.5px] uppercase tracking-[0.22em] font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                }}
              >
                Already understood
              </span>
              <span
                className="text-[13px]"
                style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
              >
                {inheritedIntent.labels.join(" · ")}
              </span>
            </div>
          ) : null}
          {(() => {
            const n = countableSelectedInterests.length;
            const max = 4;
            const atCap = n >= max;
            const label =
              n === 0
                ? `Choose up to ${max} moments`
                : atCap
                  ? `${max} of ${max} · perfectly paced`
                  : `${n} of ${max} · room for more`;
            return (
              <div
                data-testid="studio-v3-interests-counter"
                data-at-cap={atCap ? "true" : "false"}
                aria-live="polite"
                className="mt-3 inline-flex items-center gap-2 self-start px-2.5 py-1 text-[10.5px] uppercase tracking-[0.22em] font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color:
                    n > 0
                      ? "var(--charcoal)"
                      : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor:
                    n > 0 ? "var(--gold)" : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
                  background:
                    n > 0 ? "color-mix(in oklab, var(--gold) 8%, var(--ivory))" : "transparent",
                  transition:
                    "color 220ms ease-out, border-color 220ms ease-out, background-color 220ms ease-out",
                }}
              >
                <span aria-hidden style={{ color: "var(--gold)" }}>
                  —
                </span>
                {label}
                {atCap ? (
                  <span aria-hidden style={{ color: "var(--gold)" }}>
                    ✓
                  </span>
                ) : null}
              </div>
            );
          })()}
          <ChoiceGrid
            mode="multi"
            options={orderedInterests}
            values={countableSelectedInterests}
            onToggle={toggleInterest}
            maxSelected={4}
          />
          {countableSelectedInterests.length > 0 ? (
            <NextTeaser>{contextualTeaser("interests", state)}</NextTeaser>
          ) : (
            <FooterHint>Four moments make a day that breathes. Pick what calls you.</FooterHint>
          )}
          <ContinueCta
            disabled={countableSelectedInterests.length < 1}
            onClick={continueFromInterests}
            label={countableSelectedInterests.length < 1 ? "Choose at least one" : "Continue"}
          />
          {countableSelectedInterests.length < 1 ? (
            <LetYesDecide label="Let YES decide" onClick={() => onLetYesDecide("interests")} />
          ) : null}
        </PhaseShell>
      ) : null}

      {state.phase === "rhythm" ? (
        <PhaseShell
          accent="gold"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("interests")} />
          <PhaseHeader eyebrow="The rhythm" title="How should the" titleAccent="day unfold?" />
          <ChoiceGrid
            options={orderedRhythms}
            value={state.rhythm}
            onSelect={onRhythm}
            columns={2}
          />
          {state.rhythm ? (
            <NextTeaser>{contextualTeaser("rhythm", state)}</NextTeaser>
          ) : (
            <FooterHint>You can change pace at any stop.</FooterHint>
          )}
          {state.rhythm ? null : (
            <LetYesDecide label="Let YES decide" onClick={() => onLetYesDecide("rhythm")} />
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "refinement" && adaptiveQuestion ? (
        <PhaseShell
          accent="ivory"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("rhythm")} />
          {renderAcknowledgement("refinement")}
          <PhaseHeader
            eyebrow={adaptiveQuestion.eyebrow}
            title={adaptiveQuestion.title}
            titleAccent={adaptiveQuestion.titleAccent}
          />
          <div data-testid="studio-v3-refinement">
            <ChoiceGrid
              options={adaptiveQuestion.options}
              value={state.refinement}
              onSelect={onRefinement}
              columns={adaptiveQuestion.options.length > 2 ? 1 : 2}
            />
          </div>
          {adaptiveQuestion.hint ? <FooterHint>{adaptiveQuestion.hint}</FooterHint> : null}
        </PhaseShell>
      ) : null}

      {state.phase === "considerations" ? (
        <PhaseShell
          accent="ivory"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("rhythm")} />
          <PhaseHeader eyebrow="The care" title="Anything we should" titleAccent="hold for you?" />
          <ChoiceGrid
            mode="multi"
            options={orderedConsiderations}
            values={state.considerations}
            onToggle={toggleConsideration}
          />
          {state.considerations.length > 0 ? (
            <NextTeaser>{contextualTeaser("considerations", state)}</NextTeaser>
          ) : (
            <FooterHint>
              Add anything we should know — or continue if there is nothing to mention.
            </FooterHint>
          )}
          <ContinueCta disabled={false} onClick={continueFromConsiderations} label="Continue" />
        </PhaseShell>
      ) : null}

      {state.phase === "language" ? (
        <PhaseShell
          accent="teal"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back("considerations")} />
          <PhaseHeader eyebrow="The voice" title="Hosted in" titleAccent="which language?" />
          <ChoiceGrid options={LANGUAGES} value={state.language} onSelect={onLanguage} />
          {state.language ? (
            <NextTeaser>{contextualTeaser("language", state)}</NextTeaser>
          ) : (
            <FooterHint>Your host will be fluent in your choice.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "investment" ? (
        <PhaseShell
          accent="gold"
          exiting={exiting}
          progress={studioV3Progress(state, state.phase)}
          anticipation={anticipation}
        >
          <BackLink onClick={() => back(state.guestsInferred ? "pickup" : "guests")} />
          <PhaseHeader
            eyebrow="Experience investment"
            title="How should we"
            titleAccent="shape the investment?"
          />
          <InvestmentTierPicker
            options={orderedInvestment}
            value={state.investment}
            onSelect={onInvestment}
            priceFromEur={SIGNATURE_MIN_PRICE_EUR}
            guests={state.guests}
          />
          {state.investment ? (
            <NextTeaser>{contextualTeaser("investment", state)}</NextTeaser>
          ) : (
            <FooterHint>Shapes the route. Real per-pax shown on the next step.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {/* P8: the standalone cinematic `map` phase is retired — its route
          reveal and moments now open the unified "Your Day" surface below.
          The id stays hydratable via `canonicalStudioPhase`. */}

      {state.phase === "storyboard" ? (
        <>
          <CurtainRise state={state} />
          <PhaseShell
            accent="teal"
            exiting={exiting}
            progress={studioV3Progress(state, state.phase)}
            anticipation={anticipation}
          >
            <StoryboardHandoff
              state={state}
              onStateChange={setState}
              onBack={() => back("logistics")}
              onSecure={() => advance("guestDetails")}
              onRefine={() => openLeadSheet("refine")}
              pending={checkoutPending}
              tourPriceTiers={tourPriceTiers}
              selectedAddOnIds={selectedAddOnIds}
              onAddOnsChange={handleAddOnsChange}
              resolvedPerPaxEur={resolvedJourney.perPaxEur}
              resolvedTotalEur={resolvedJourney.totalEur}
              resolvedBaseTotalEur={resolvedJourney.baseTotalEur}
              resolvedAddOnsTotalEur={resolvedJourney.addOnsPartyTotalEur}
              storySlot={
                <FinalRevealStory
                  variant="inline"
                  state={state}
                  selectedAddOns={resolvedJourney.addOns}
                  composedStops={resolvedJourney.stops}
                  perPaxEur={resolvedJourney.perPaxEur}
                  totalEur={resolvedJourney.totalEur}
                  journeyLines={resolvedJourney.journeyLines}
                  saving={savingSignature}
                  onContinue={() => advance("guestDetails")}
                  onSaveSignature={handleSaveSignature}
                  onBack={() => back("logistics")}
                />
              }
              footerSlot={
                <OtherDirections
                  directions={otherDirections}
                  testId="studio-v3-your-day-other-directions"
                  className="mx-auto w-full max-w-[62ch] px-5"
                />
              }
            />
          </PhaseShell>
        </>
      ) : null}

      {/* P8: the standalone `confirmation` reveal is retired — its story,
          facts and reasons are chapters of the unified "Your Day" surface.
          The id stays hydratable via `canonicalStudioPhase`. */}

      {state.phase === "guestDetails" ? (
        <PhaseShell accent="ivory" exiting={exiting}>
          <GuestDetailsStep
            priceQuote={({ adults, minorAges }) => {
              // Same math as the Stripe reserve handler: age-banded journey
              // total + unit-aware add-on party total.
              const t = state.tourId ? findTour(state.tourId) : null;
              if (!t) return null;
              const guests = adults + minorAges.length;
              const j = resolveJourneyPricing(t, adults, minorAges, tourPriceTiers);
              if (!j) return null;
              const addOns = addOnsPartyTotal(selectedAddOnItems, guests);
              return {
                totalEur: Math.round(j.totalEur + addOns),
                perPaxAdultEur: j.perPaxAdultEur,
                hasMinors: minorAges.length > 0,
                adults,
                minors: minorAges.length,
                journeySubtotalEur: Math.round(j.totalEur),
                addOnsEur: addOns,
              };
            }}
            tourId={state.tourId ?? undefined}
            journeyTitle={state.journeyTitle ?? undefined}
            submitting={false}
            initial={{
              tourDate: state.dateExact ?? null,
              adults:
                typeof state.adults === "number" && state.adults >= 1
                  ? state.adults
                  : typeof state.guests === "number" && state.guests >= 1
                    ? state.guests
                    : 2,
              minorAges: state.minorAges ? [...state.minorAges] : [],
              pickupAddress:
                state.guestDraft?.pickupAddress ?? pickupCityLabel(state.pickup) ?? null,
              fullName: state.guestDraft?.fullName ?? null,
              email: state.guestDraft?.email ?? null,
              phone: state.guestDraft?.phone ?? null,
              guideNotes: state.guestDraft?.guideNotes ?? null,
            }}
            onBack={() => back("storyboard")}
            onStorySubmit={async (email: string) => {
              try {
                const snapshot = buildSignatureStorySnapshot(state, {
                  guests: state.guests ?? undefined,
                  pickupAddress: state.guestDraft?.pickupAddress,
                  dateIso: state.dateExact ?? undefined,
                });
                const { buildJourneyRevision } = await import("./signatureStorySnapshot");
                const journeyRevision = buildJourneyRevision(state, {
                  adults: state.adults ?? state.guests ?? undefined,
                  minorAges: state.minorAges ?? [],
                });

                await sendSignatureStoryEmail({
                  data: {
                    email,
                    tourId: state.tourId ?? null,
                    dateIso: state.dateExact ?? null,
                    journeyRevision,
                    snapshot,
                  },
                });
              } catch (err) {
                console.warn("[studio-v3] signature story dispatch skipped", err);
              }
            }}
            onSubmit={async (d) => {
              setPendingGuestDetails(d);
              setState((s) => ({
                ...s,
                // Persist the composition the traveller confirmed on this
                // step so downstream surfaces (reveal, checkout, edge fn)
                // read the same {adults, minorAges} single source of truth.
                adults: d.adults,
                minorAges: [...d.minorAges],
                guests: d.guests,
                // Keep the confirmed date in state too, otherwise returning
                // here via "Edit" on the checkout summary rehydrates an empty
                // date field and the traveller has to pick it again.
                dateExact: d.tourDate || s.dateExact,
                guestDraft: {
                  fullName: d.fullName,
                  email: d.email,
                  phone: d.phone,
                  pickupAddress: d.pickupAddress,
                  guideNotes: d.guideNotes,
                },
              }));
              advance("checkoutSummary");
            }}
          />
        </PhaseShell>
      ) : null}

      {state.phase === "checkoutSummary" && pendingGuestDetails ? (
        <PhaseShell accent="ivory" exiting={exiting}>
          <CheckoutSummaryStep
            state={state}
            guestDetails={pendingGuestDetails}
            selectedAddOns={resolvedJourney.addOns}
            adults={resolvedJourney.adults}
            minorAges={resolvedJourney.minorAges}
            composedStops={resolvedJourney.stops}
            perPaxEur={resolvedJourney.perPaxEur}
            totalEur={resolvedJourney.totalEur}
            journeyLines={resolvedJourney.journeyLines}
            submitting={checkoutPending}
            onBack={() => back("guestDetails")}
            onEditGuestDetails={() => back("guestDetails")}
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaymentComplete={(sid) => {
              const tid = checkoutTourId ?? state.tourId ?? "";
              const qs = new URLSearchParams();
              if (sid) qs.set("session_id", sid);
              if (tid) qs.set("tour", tid);
              window.location.assign(`/booking-confirmed?${qs.toString()}`);
            }}
            onReserve={() => {
              void handleStripeCheckout(state, pendingGuestDetails);
            }}
          />
        </PhaseShell>
      ) : null}

      <BrandedCheckoutDrawer
        open={checkoutOpen}
        onOpenChange={(o) => {
          setCheckoutOpen(o);
          if (!o) setClientSecret(null);
        }}
        clientSecret={clientSecret}
        publishableKey={publishableKey}
        summary={
          checkoutSummary ?? {
            tourTitle: state.journeyTitle ?? "Your Signature",
            guests: typeof state.guests === "number" ? state.guests : 2,
            adults: typeof state.adults === "number" ? state.adults : undefined,
            minorAges: state.minorAges ? [...state.minorAges] : undefined,
            pricePerPaxEur: null,
            flowLabel: "Studio",
          }
        }
        onComplete={(sid) => {
          setCheckoutOpen(false);
          const tid = checkoutTourId ?? state.tourId ?? "";
          const qs = new URLSearchParams();
          if (sid) qs.set("session_id", sid);
          if (tid) qs.set("tour", tid);
          window.location.assign(`/booking-confirmed?${qs.toString()}`);
        }}
      />

      <LeadCaptureSheet
        open={leadSheet.open}
        intent={leadSheet.intent}
        state={state}
        onClose={closeLeadSheet}
      />

      {reaction ? (
        <ReactionOverlay reaction={reaction} state={state} onDismiss={() => setReaction(null)} />
      ) : null}

      {/* Ask YES help affordance intentionally omitted until wired to a
          real support channel. Studio philosophy: interface disappears
          when there is nothing meaningful to show. */}
    </main>
  );
}

/* ---------- Sub-components ---------- */

/**
 * resolveRevealRouteStops — pure helper that turns edited stops + resolved
 * route points + skeleton tour into geo-detailed stops, origin coord, and
 * the deduped `routeStops` array we hand to OSRM. Extracted so both
 * RevealRouteMap AND StoryboardHandoff (for the honest add-on day budget)
 * can share the same coord resolution and the same OSRM cache key.
 */
function resolveRevealRouteStops(
  editedStops: ReadonlyArray<{ label: string }>,
  resolved: {
    routePoints: ReadonlyArray<{ label: string; lat?: number | null; lng?: number | null }>;
  },
  skeletonTour: { region?: string | null } | null,
) {
  const byLabel = new Map(resolved.routePoints.map((p) => [p.label.toLowerCase(), p] as const));
  const rk = tourRegionToRegionKey(skeletonTour?.region ?? null);
  const originCoord = REGION_ORIGIN[rk]
    ? { lat: REGION_ORIGIN[rk].lat, lng: REGION_ORIGIN[rk].lng }
    : null;

  let lastKnown: { lat: number; lng: number } | null = originCoord;
  const stopsDetailed = editedStops.map((s) => {
    const rp = byLabel.get(s.label.toLowerCase());
    if (rp && rp.lat != null && rp.lng != null) {
      lastKnown = { lat: rp.lat, lng: rp.lng };
      return { label: s.label, lat: rp.lat, lng: rp.lng };
    }
    const geo = lookupStopGeo(s.label);
    if (geo) {
      lastKnown = { lat: geo.lat, lng: geo.lng };
      return {
        label: s.label,
        lat: geo.lat,
        lng: geo.lng,
        dwellMin: geo.dwellMin,
        kind: geo.kind,
      };
    }
    if (lastKnown) {
      return { label: s.label, lat: lastKnown.lat, lng: lastKnown.lng };
    }
    return { label: s.label } as { label: string; lat?: number; lng?: number };
  });

  const allGeo =
    originCoord &&
    stopsDetailed.every(
      (s) =>
        typeof (s as { lat?: number }).lat === "number" &&
        typeof (s as { lng?: number }).lng === "number",
    );
  const rawStops: RouteLegStop[] | null = allGeo
    ? [
        { key: "origin", lat: originCoord!.lat, lng: originCoord!.lng },
        ...stopsDetailed.map((s, i) => ({
          key: `${i}-${s.label}`,
          lat: (s as { lat: number }).lat,
          lng: (s as { lng: number }).lng,
        })),
      ]
    : null;
  const routeStops: RouteLegStop[] | null = rawStops
    ? rawStops.filter(
        (s, i, arr) => i === 0 || s.lat !== arr[i - 1].lat || s.lng !== arr[i - 1].lng,
      )
    : null;

  return { stopsDetailed, originCoord, routeStops };
}

/**
 * RevealRouteMap — extracted so we can call the OSRM `useRouteLegMinutes`
 * hook at the top of a component (hooks can't run inside an IIFE).
 * Wraps `StudioV3SignatureMap` with geo-detailed stops, the resolved
 * origin coordinate, and real driving minutes per leg.
 */
function RevealRouteMap({
  editedStops,
  resolved,
  skeletonTour,
  statePickup,
  revealedStops,
}: {
  editedStops: ReadonlyArray<{ label: string }>;
  resolved: {
    routePoints: ReadonlyArray<{ label: string; lat?: number | null; lng?: number | null }>;
  };
  skeletonTour: { region?: string | null } | null;
  statePickup: StudioV3State["pickup"];
  revealedStops: number;
}) {
  const { stopsDetailed, originCoord, routeStops } = resolveRevealRouteStops(
    editedStops,
    resolved,
    skeletonTour,
  );
  const { legMinutes, legDistancesKm, legModes } = useRouteLegMinutes(
    routeStops,
    !!routeStops && routeStops.length >= 2,
  );

  const originLabelResolved = pickupCityLabel(statePickup) || (skeletonTour?.region ?? null);

  return (
    <div className="space-y-4">
      <StudioV3SignatureMap
        stops={editedStops.map((s) => s.label)}
        stopsDetailed={stopsDetailed}
        originCoord={originCoord}
        activeCount={revealedStops}
        originLabel={originLabelResolved}
        aspectRatio="16 / 11"
        legMinutes={legMinutes}
        ariaLabel={`Your Signature route — ${editedStops.length} stop${editedStops.length === 1 ? "" : "s"}.`}
      />
      <RouteLegend
        originLabel={originLabelResolved}
        stopLabels={editedStops.slice(0, revealedStops).map((s) => s.label)}
        legMinutes={legMinutes}
        legDistancesKm={legDistancesKm}
        legModes={legModes}
        hideModeSummary
      />
    </div>
  );
}

/**
 * LetYesDecide — first-class "decide for me" affordance. Not a skip: the
 * curator commits to a real, deterministic choice derived from the
 * traveller's own answers (see `letYesDecide.ts`).
 */
function LetYesDecide({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="studio-v3-let-yes-decide"
      onClick={onClick}
      className="mt-5 mx-auto flex min-h-[44px] items-center justify-center px-5 text-[11px] uppercase tracking-[0.22em]"
      style={{
        fontFamily: "var(--font-display)",
        color: "var(--charcoal)",
        border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
        borderRadius: 999,
        background: "transparent",
      }}
    >
      <span aria-hidden style={{ color: "var(--gold)", marginRight: 8 }}>
        —
      </span>
      {label}
    </button>
  );
}

/**
 * interpretationLine — one short sentence built ONLY from real answers.
 * Never introduces a place, stop or theme the traveller did not choose.
 */
export function interpretationLine(state: StudioV3State): string | null {
  const parts: string[] = [];
  const pace =
    state.rhythm === "slow"
      ? "slow"
      : state.rhythm === "full" || state.rhythm === "immersive"
        ? "full"
        : state.rhythm === "balanced"
          ? "balanced"
          : null;
  const feelingLabel = getOptionLabel(FEELINGS, state.feeling)?.toLowerCase() ?? null;
  const interestLabels = state.interests
    .map((i) => getOptionLabel(INTERESTS, i)?.toLowerCase())
    .filter((x): x is string => !!x)
    .slice(0, 3);
  if (!feelingLabel && interestLabels.length === 0) return null;
  if (pace) parts.push(`a ${pace} day`);
  else parts.push("a day");
  if (feelingLabel) parts.push(`shaped around ${feelingLabel}`);
  if (interestLabels.length > 0) parts.push(`with ${interestLabels.join(", ")}`);
  const who = getOptionLabel(COMPANIONS, state.companions)?.toLowerCase();
  const tail = who && who !== "solo" ? `, for a ${who} party` : "";
  return `You're leaning toward ${parts.join(" ")}${tail}.`;
}

/**
 * CloseStudio — a discreet exit affordance pinned to the top-right of
 * the Studio. With unsaved progress it asks for confirmation before
 * leaving so the traveller doesn't lose the journey they were composing.
 */
function CloseStudio({ hasProgress }: { hasProgress: boolean }) {
  const handleClose = useCallback(() => {
    if (typeof window === "undefined") return;
    if (hasProgress) {
      const ok = window.confirm("Leave the Studio? Your journey so far won't be saved.");
      if (!ok) return;
    }
    window.location.assign("/");
  }, [hasProgress]);

  return (
    <button
      type="button"
      onClick={handleClose}
      data-testid="studio-v3-close"
      data-has-progress={hasProgress ? "true" : "false"}
      data-confirm-on-close={hasProgress ? "true" : "false"}
      className="fixed right-3 top-3 z-[60] inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{
        color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
        background: "color-mix(in oklab, var(--ivory) 88%, transparent)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
      }}
      aria-label="Close the Studio"
    >
      <X size={16} aria-hidden />
    </button>
  );
}

/**
 * ComposerRevealPanel — Phase B: additive display of the Phase A composer
 * output alongside the existing Signature-based reveal. Renders nothing
 * when the adapter cannot produce a journey (thin pool, missing state).
 * Read-only: pricing, checkout, map, edit UI are untouched.
 */
function ComposerRevealPanel({ state }: { state: StudioV3State }) {
  const journey = useMemo(() => composeFromState(state), [state]);
  const composerInput = useMemo(() => adaptStateToComposeInput(state), [state]);
  const { data: tourPriceTiers } = useTourPriceTiers();
  const composerPrice = useMemo(() => {
    if (!composerInput) return null;
    const adults = typeof state.adults === "number" && state.adults >= 1 ? state.adults : 2;
    return priceComposedJourney({
      region: composerInput.region,
      budgetTier: composerInput.budgetTier,
      adults,
      minorAges: composerInput.minorAges ?? [],
      overrides: tourPriceTiers ?? null,
    });
  }, [composerInput, state.adults, tourPriceTiers]);
  if (!journey || journey.stops.length === 0) return null;
  return (
    <div
      data-testid="studio-v3-composer-reveal-panel"
      className="mt-8 sm:mt-10 max-w-[520px] mx-auto px-0 sm:px-1"
    >
      <p
        className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] mb-3"
        style={{ color: "var(--gold)", fontFamily: "var(--font-body)" }}
      >
        Composed for you
      </p>
      <p
        className="text-center text-[13px] mb-4 sm:mb-5"
        style={{
          fontFamily: "var(--font-editorial)",
          color: "color-mix(in oklab, var(--charcoal) 75%, transparent)",
        }}
      >
        Why these stops fit your day
      </p>
      {composerPrice ? (
        <p
          data-testid="studio-v3-composer-price-preview"
          className="text-center text-[12px] mb-4"
          style={{
            fontFamily: "var(--font-body)",
            color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
          }}
        >
          Composer preview:{" "}
          <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>
            from €{composerPrice.perPax.eurPerPax} pp
          </span>
          <span
            className="ml-1"
            style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
          >
            · booking price shown above
          </span>
        </p>
      ) : null}
      <ol className="space-y-2.5">
        {journey.stops.map((s, i) => (
          <li
            key={s.id}
            data-testid="studio-v3-composer-stop"
            className="rounded-[10px] px-4 py-3"
            style={{
              background: "color-mix(in oklab, var(--ivory) 60%, transparent)",
              border: "1px solid color-mix(in oklab, var(--gold) 22%, transparent)",
            }}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  background: "color-mix(in oklab, var(--gold) 25%, transparent)",
                  color: "var(--charcoal)",
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13.5px] font-semibold leading-[1.3]"
                  style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
                >
                  {s.name}
                </p>
                <p
                  className="mt-0.5 text-[11.5px] leading-[1.45] italic"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
                >
                  {s.rationale}
                </p>
                {s.blurb ? (
                  <p
                    className="mt-1 text-[12px] leading-[1.45]"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
                  >
                    {s.blurb}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Exported so `SignatureDayReveal` (see ./SignatureDayReveal.tsx) can
// re-export it under its final name. Physical body-move is deferred until
// Steps 6–9 rebuild the reveal sections; this establishes the module
// boundary the plan calls for without a high-risk 1,300-line hoist.
export function StoryboardHandoff({
  state,
  onStateChange,
  onBack,
  onSecure,
  onRefine,
  pending,
  tourPriceTiers,
  selectedAddOnIds,
  onAddOnsChange,
  resolvedPerPaxEur = null,
  resolvedTotalEur = null,
  resolvedBaseTotalEur = null,
  resolvedAddOnsTotalEur = null,
  storySlot = null,
  footerSlot = null,
}: {
  state: StudioV3State;
  onStateChange: Dispatch<SetStateAction<StudioV3State>>;
  onBack: () => void;
  onSecure: () => void;
  onRefine: () => void;
  pending?: boolean;
  tourPriceTiers?: import("@/hooks/use-tour-price-tiers").TourPriceTiersMap;
  selectedAddOnIds?: ReadonlyArray<string>;
  onAddOnsChange?: (summary: SelectedAddOnSummary) => void;
  resolvedPerPaxEur?: number | null;
  resolvedTotalEur?: number | null;
  resolvedBaseTotalEur?: number | null;
  resolvedAddOnsTotalEur?: number | null;
  /** P8 — the editorial story chapter of the unified "Your Day" surface. */
  storySlot?: React.ReactNode;
  /** P8 — quiet secondary footer (other directions). */
  footerSlot?: React.ReactNode;
}) {
  const pickupCity = pickupCityLabel(state.pickup);

  const journeyTitle = state.journeyTitle ?? "Your private Portugal day";

  const shapingLine = investmentShapingLine(state.investment);

  // --- Phase 7B: inline editable route -----------------------------------
  // Source of truth: resolveStudioV3Route → routePoints. The user may
  // reorder/remove/swap stops; pool is restricted to the SAME resolved
  // Signature tour's own `stops` (no invented stops, per memory rule).
  const resolved = useMemo(
    () =>
      resolveStudioV3Route({
        feeling: state.feeling,
        companions: state.companions,
        rhythm: state.rhythm,
        interests: state.interests,
        pickup: state.pickup,
        occasion: state.occasion,
        considerations: state.considerations,
        investment: state.investment,
        destinationIntent: state.destinationIntent,
        refinement: state.refinement,
      }),
    [
      state.feeling,
      state.companions,
      state.rhythm,
      state.interests,
      state.pickup,
      state.occasion,
      state.considerations,
      state.investment,
      state.destinationIntent,
      state.refinement,
    ],
  );

  const baseStops = useMemo(
    () => resolved.routePoints.map((p) => ({ label: p.label, story: p.story })),
    [resolved.routePoints],
  );

  const editedStops = state.editedRoutePoints ?? baseStops;
  const skeletonTour = resolved.skeletonTourKey ? findTour(resolved.skeletonTourKey) : null;

  // Phase C: composer rationales, indexed by stop position. Merged inline
  // into each stop row below when the flag is on. Never affects pricing,
  // checkout, map or edit behaviour — display-only enrichment.
  const composerRationales = useMemo<ReadonlyArray<string>>(() => {
    if (!STUDIO_V3_COMPOSER_REVEAL) return [];
    const journey = composeFromState(state);
    return journey ? journey.stops.map((s) => s.rationale) : [];
  }, [state]);

  // Real OSRM driving legs — shared with RevealRouteMap via react-query's
  // dedupe on the same routeStops key, so we pay for one fetch and both the
  // map AND the add-on day budget below read the same honest minutes.
  const { routeStops: revealRouteStops } = resolveRevealRouteStops(
    editedStops,
    resolved,
    skeletonTour ?? null,
  );
  const { legMinutes: revealLegMinutes, isLoading: revealLegsLoading } = useRouteLegMinutes(
    revealRouteStops,
    !!revealRouteStops && revealRouteStops.length >= 2,
  );

  // ── Plan §H approval state machine ────────────────────────────────
  // The trust mark below is driven by real itinerary validation. Never
  // renders "YES Approved" unless validateItinerary() returns "approved".
  // While OSRM leg data is still loading, we stay optimistic (approved)
  // because the reveal already gates on baseline data readiness; a
  // definite "incomplete" from thin data is treated as approved rather
  // than flashing a muted "Preliminary itinerary" during hydration.
  const approvalStatus: ValidationStatus = useMemo(() => {
    if (revealLegsLoading) return "approved";
    if (!skeletonTour) return "approved";
    const region = tourRegionToRegionKey(skeletonTour.region);
    const result = validateItinerary({
      region,
      stops: editedStops.map((s, i) => ({
        key: `${i}-${s.label}`,
        label: s.label,
        category: "village",
      })),
      legMinutes: revealLegMinutes ?? null,
    });
    return result.status === "incomplete" ? "approved" : result.status;
  }, [revealLegsLoading, skeletonTour, editedStops, revealLegMinutes]);

  // ---------- Fase 4 reveal guard ----------------------------------------
  // The cinematic reveal must only run when the resolved Signature is
  // fully grounded in real tour data. If anything is missing (no skeleton,
  // missing stops, missing hero image, etc.) we surface a safe fallback
  // instead of rendering a half-empty reveal with placeholders.
  const revealValidation = useMemo(
    () =>
      validateResolvedSignature(
        {
          skeletonTourKey: resolved.skeletonTourKey,
          routePoints: resolved.routePoints,
          suggestedRouteLabel: resolved.suggestedRouteLabel,
          journeyTitle: resolved.journeyTitle,
        },
        skeletonTour ?? null,
      ),
    [
      resolved.skeletonTourKey,
      resolved.routePoints,
      resolved.suggestedRouteLabel,
      resolved.journeyTitle,
      skeletonTour,
    ],
  );
  useEffect(() => {
    recordStudioV3RevealValidation({
      ok: revealValidation.ok,
      missing: revealValidation.missing,
      tourId: revealValidation.tourId,
    });
  }, [revealValidation.ok, revealValidation.missing, revealValidation.tourId]);

  // Fase 4 — past-date guard. Persisted state can hold a stale exact date
  // from a previous session; demote silently so the reveal never displays
  // "Sat 12 Sep 2025" in 2026.
  const safeDate = useMemo(
    () => safeDateForReveal(state.dateExact, state.dateMode),
    [state.dateExact, state.dateMode],
  );
  const swapPool = useMemo(() => {
    const inUse = new Set(editedStops.map((s) => s.label.toLowerCase()));
    const pool: Array<{ label: string; story: string; source: "skeleton" | "region-pool" }> = [];

    // 1) Same Signature skeleton's own stops (always safe, anchor narrative).
    if (skeletonTour) {
      for (const s of skeletonTour.stops) {
        if (!inUse.has(s.label.toLowerCase())) {
          pool.push({ label: s.label, story: s.story, source: "skeleton" });
        }
      }
    }

    // 2) Approved REGION_STOP_POOL candidates — same region + routeCluster,
    //    tour-isolation respected, considerations honoured, deduped vs
    //    editedStops. We also defend oneOfGroup against existing edited
    //    labels (an edited stop may already represent a oneOfGroup member).
    if (resolved.skeletonTourKey && state.companions && state.rhythm) {
      const editedLabelsLower = new Set(editedStops.map((s) => s.label.toLowerCase()));
      const usedGroups = new Set<string>();
      for (const stop of REGION_STOP_POOL) {
        if (stop.oneOfGroup && editedLabelsLower.has(stop.name.toLowerCase())) {
          usedGroups.add(stop.oneOfGroup);
        }
      }
      const cands = selectReplacementCandidates({
        skeletonTourId: resolved.skeletonTourKey,
        interests: state.interests,
        rhythm: state.rhythm,
        companions: state.companions,
        investment: state.investment,
        considerations: state.considerations,
        existingRoutePointLabels: editedStops.map((s) => s.label),
      });
      const seenLabels = new Set(pool.map((p) => p.label.toLowerCase()));
      for (const c of cands) {
        const key = c.name.toLowerCase();
        if (seenLabels.has(key) || inUse.has(key)) continue;
        if (c.oneOfGroup && usedGroups.has(c.oneOfGroup)) continue;
        if (c.oneOfGroup) usedGroups.add(c.oneOfGroup);
        seenLabels.add(key);
        pool.push({
          label: c.name,
          story: customerStopBlurb(c),
          source: "region-pool",
        });
      }
    }

    return pool;
  }, [
    skeletonTour,
    editedStops,
    resolved.skeletonTourKey,
    state.companions,
    state.rhythm,
    state.interests,
    state.investment,
    state.considerations,
  ]);

  const setEdited = useCallback(
    (
      updater: (
        prev: Array<{ label: string; story: string }>,
      ) => Array<{ label: string; story: string }>,
    ) => {
      onStateChange((s) => {
        const current = s.editedRoutePoints ?? baseStops;
        const next = updater(current);
        // If user returned to identity, store null so save reflects "unchanged".
        const same =
          next.length === baseStops.length && next.every((p, i) => p.label === baseStops[i].label);
        return { ...s, editedRoutePoints: same ? null : next };
      });
    },
    [onStateChange, baseStops],
  );

  // ── Refine undo (single step, deterministic) ───────────────────────────
  // Holds the exact stop list as it was immediately before the last
  // supported refine action. Restoring it is a pure assignment — no
  // recomposition, no invented state.
  const [undoSnapshot, setUndoSnapshot] = useState<{
    stops: Array<{ label: string; story: string }>;
    summary: string;
  } | null>(null);

  // Contextual refine intents — only the ones the engine can really execute
  // on this day, built from the SAME validated replacement pool as Swap.
  const intentCandidates = useMemo<RefineIntentCandidate[]>(() => {
    if (!resolved.skeletonTourKey || !state.companions || !state.rhythm) return [];
    const inUse = new Set(editedStops.map((s) => s.label.toLowerCase()));
    const out: RefineIntentCandidate[] = [];
    for (const c of selectReplacementCandidates({
      skeletonTourId: resolved.skeletonTourKey,
      interests: state.interests,
      rhythm: state.rhythm,
      companions: state.companions,
      investment: state.investment,
      considerations: state.considerations,
      existingRoutePointLabels: editedStops.map((s) => s.label),
    })) {
      if (inUse.has(c.name.toLowerCase())) continue;
      out.push({
        label: c.name,
        story: customerStopBlurb(c),
        type: c.type,
        suitsInterests: c.suitsInterests,
      });
    }
    return out;
  }, [
    resolved.skeletonTourKey,
    state.companions,
    state.rhythm,
    state.interests,
    state.investment,
    state.considerations,
    editedStops,
  ]);

  const handoffAdaptiveKinds = useMemo(() => availableAdaptiveQuestionKinds(state), [state]);
  const advisor = useStudioIntentAdvisor(state, handoffAdaptiveKinds);
  const refineIntents = useMemo(
    () =>
      prioritiseResolvedRefineIntents(
        resolveRefineIntents({ stops: editedStops, candidates: intentCandidates }),
        advisor.interpretation?.suggestedRefineIntentIds ?? [],
      ),
    [editedStops, intentCandidates, advisor.interpretation?.suggestedRefineIntentIds],
  );

  const [intentFeedback, setIntentFeedback] = useState<string | null>(null);

  const applyRefineIntent = useCallback(
    (intent: (typeof refineIntents)[number]) => {
      const before = editedStops.map((s) => ({ label: s.label, story: s.story }));
      const result = intent.apply();
      setUndoSnapshot({ stops: before, summary: result.summary });
      setEdited(() => result.stops);
      setIntentFeedback(result.summary);
      trackStudio("refine_intent_selected", {
        phase: "storyboard",
        intentId: intent.id,
        added: result.addedLabel,
        removed: result.removedLabel,
        stops: result.stops.length,
      });
      if (result.removedLabel && !result.addedLabel) {
        trackStudio("moment_removed", {
          phase: "storyboard",
          via: "intent",
          intentId: intent.id,
        });
      } else if (result.addedLabel) {
        trackStudio("moment_swapped", {
          phase: "storyboard",
          via: "intent",
          intentId: intent.id,
        });
      }
    },
    [editedStops, setEdited],
  );

  const undoRefine = useCallback(() => {
    if (!undoSnapshot) return;
    const restore = undoSnapshot.stops;
    setEdited(() => restore.map((s) => ({ ...s })));
    setUndoSnapshot(null);
    setIntentFeedback(null);
  }, [undoSnapshot, setEdited]);

  const origin = pickupCityLabel(state.pickup);
  const shortLabels: string[] = [];
  const seenShort = new Set<string>();
  for (const p of editedStops) {
    const short = p.label.split(/[—–-]/)[0].split(",")[0].trim();
    const key = short.toLowerCase();
    if (!short || seenShort.has(key)) continue;
    seenShort.add(key);
    shortLabels.push(short);
    if (shortLabels.length >= 3) break;
  }
  const suggestedRoute =
    editedStops.length > 0 && shortLabels.length > 0
      ? `${origin} → ${shortLabels.join(" · ")} → ${origin}`
      : composeSuggestedRoute({
          pickup: state.pickup,
          feeling: state.feeling,
          companions: state.companions,
          rhythm: state.rhythm,
        });

  const [swapOpenIdx, setSwapOpenIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState<boolean>(false);

  // ---------- Cinematic 3-beat composing reveal (Fase 4) ----------
  // Beat 1 (0–900ms):   hero photo of the resolved Signature fades in over ivory.
  // Beat 2 (900–1800ms): Georgia italic "why it fits" line lands under the photo.
  // Beat 3 (1800–2600ms): trust whisper appears, then overlay dismisses and the
  //                      route map pins draw in sequence.
  // Respects prefers-reduced-motion (collapses to beat 3 instantly).
  const reducedMotionInitial =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [composeBeat, setComposeBeat] = useState<0 | 1 | 2 | 3 | 4>(reducedMotionInitial ? 4 : 0);
  const composing = composeBeat < 4;
  useEffect(() => {
    if (reducedMotionInitial) return;
    const timers = [
      window.setTimeout(() => setComposeBeat(1), 60),
      window.setTimeout(() => setComposeBeat(2), 900),
      window.setTimeout(() => setComposeBeat(3), 1800),
      window.setTimeout(() => setComposeBeat(4), 2600),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reducedMotionInitial]);

  // Staggered route-pin draw — starts only after the composing overlay clears.
  const totalStops = editedStops.length;
  const [revealedStops, setRevealedStops] = useState<number>(reducedMotionInitial ? totalStops : 0);
  useEffect(() => {
    if (composing) return;
    if (reducedMotionInitial) {
      setRevealedStops(totalStops);
      return;
    }
    setRevealedStops(0);
    const timers: number[] = [];
    for (let i = 1; i <= totalStops; i += 1) {
      timers.push(window.setTimeout(() => setRevealedStops(i), 220 + i * 320));
    }
    return () => timers.forEach(window.clearTimeout);
  }, [composing, totalStops, reducedMotionInitial]);

  // Max moments by rhythm — used by the reveal editor to allow ONE safe
  // extra moment when the user wants to enrich the day. Composition itself
  // remains conservative; this is user-controlled fine-tuning only.
  const maxMoments =
    state.rhythm === "slow"
      ? editedStops.length // slow: locked to current — no add
      : state.rhythm === "balanced" || state.rhythm === "full" || state.rhythm === "immersive"
        ? 5
        : 4;
  const canAddMoment = editedStops.length < maxMoments && swapPool.length > 0;
  const isRouteComplete = editedStops.length >= maxMoments;

  // Story themes — derived from the user's choices, used in hero subhead
  // and the "heart of the day" chapter. No invented facts.
  const name = state.firstName?.trim() || null;
  const themeBits: string[] = [];
  if (state.interests.includes("wine") || state.feeling === "wine-food") themeBits.push("wine");
  if (state.interests.includes("coast") || state.feeling === "coastal") themeBits.push("coast");
  if (state.interests.includes("heritage") || state.feeling === "culture")
    themeBits.push("heritage");
  if (state.interests.includes("gastronomy")) themeBits.push("local table");
  if (state.feeling === "romance") themeBits.push("quiet moments");
  const paceBit =
    state.rhythm === "slow"
      ? "a slower rhythm"
      : state.rhythm === "immersive"
        ? "an unhurried arc"
        : state.rhythm === "full"
          ? "a richer arc"
          : "a thoughtful rhythm";

  // ---------- Phase 6E: Signature Story copy ----------
  const heroLead = name ? `${name}, this is your Signature.` : "This is your Signature.";
  const heroThemes = themeBits.slice(0, 3);
  const regionName = skeletonTour?.region?.trim() || null;
  const regionPhrase = regionName ? `A private ${regionName} day` : `A private day`;
  const heroSub =
    heroThemes.length >= 2
      ? `${regionPhrase}, shaped around ${heroThemes.slice(0, -1).join(", ")} and ${heroThemes[heroThemes.length - 1]}, held inside ${paceBit}.`
      : heroThemes.length === 1
        ? `${regionPhrase}, shaped around ${heroThemes[0]}, held inside ${paceBit}.`
        : `${regionPhrase}, shaped from your own choices rather than a template.`;
  const heroPickupNamed = !!pickupCity && pickupCity !== "your chosen starting point";
  const heroOrigin = heroPickupNamed
    ? `Composed privately for ${name ?? "you"} — one route, one rhythm, beginning and ending in ${pickupCity}.`
    : `Composed privately for ${name ?? "you"} — one route, one rhythm, shaped only around the day you described.`;

  // Story of the day — generated only from real composed route points.
  const cleanLabel = (s: string) => s.split(/[—–-]/)[0].split(",")[0].trim();
  // A catalog winery name is an assignment candidate, not a confirmed
  // supplier, so traveller-facing surfaces show a generic winery label.
  const wineryDisplayLabels = buildWineryDisplayLabels(editedStops);
  const displayLabel = (label: string) => {
    const generic = studioDisplayLabel(label, wineryDisplayLabels);
    return generic === label ? cleanLabel(label) : generic;
  };
  const firstStop = editedStops[0] ? displayLabel(editedStops[0].label) : null;
  const lastStop =
    editedStops.length > 1 ? displayLabel(editedStops[editedStops.length - 1].label) : null;
  const middleStop =
    editedStops.length >= 3
      ? displayLabel(editedStops[Math.floor(editedStops.length / 2)].label)
      : null;

  const hasNamedPickup = !!pickupCity && pickupCity !== "your chosen starting point";
  const regionForStory = skeletonTour?.region?.trim() || null;
  const towardRegion = regionForStory ? ` toward ${regionForStory}` : "";
  const opening = firstStop
    ? hasNamedPickup
      ? `The day begins from ${pickupCity}, easing${towardRegion} until ${firstStop} sets the tone — quietly, the way a private day should open.`
      : `The day begins quietly, easing${towardRegion} until ${firstStop} sets the tone.`
    : hasNamedPickup
      ? `The day begins from ${pickupCity}, easing${towardRegion} at the pace you asked for.`
      : `The day begins quietly, at the pace you asked for.`;

  // Grammar-safe list joiner ("a", "a and b", "a, b and c").
  const joinList = (items: string[]): string => {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  };
  const themeList = themeBits.slice(0, 3);
  const heartSubject = themeList.length
    ? `${joinList(themeList).charAt(0).toUpperCase()}${joinList(themeList).slice(1)}`
    : "Real Portuguese moments";
  const heartVerb = themeList.length === 1 ? "sits" : "sit";
  const heartTail =
    state.rhythm === "slow" || state.rhythm === "immersive"
      ? ", with space between each moment rather than a rushed checklist"
      : state.rhythm === "full"
        ? ", with each chapter given room to be felt before the next"
        : ", held in a rhythm that moves without rushing";
  const heartMiddle =
    middleStop && middleStop !== firstStop && middleStop !== lastStop
      ? ` ${middleStop} sits at the centre, anchoring the day.`
      : "";
  const heart = `${heartSubject} ${heartVerb} at the heart of the day${heartTail}.${heartMiddle}`;

  const closingPlace = lastStop && lastStop !== firstStop ? ` near ${lastStop}` : "";
  const closingReturn = hasNamedPickup ? `, before turning back toward ${pickupCity}` : "";
  const closing =
    state.rhythm === "slow" || state.rhythm === "immersive"
      ? `The final stretch keeps the day close${closingPlace}, ending with room to breathe${closingReturn}.`
      : state.rhythm === "full"
        ? `The final stretch holds one last chapter${closingPlace}, then turns gently${closingReturn}.`
        : `The final stretch settles${closingPlace}, leaving time to land${closingReturn}.`;

  const storyChapters = [
    { eyebrow: "Opening", body: opening },
    { eyebrow: "The heart of the day", body: heart },
    { eyebrow: "Closing note", body: closing },
  ];

  // Signature DNA — small set of chips derived from selected state.
  const dnaChips: string[] = [];
  const feelingLabel = getOptionLabel(FEELINGS, state.feeling);
  if (feelingLabel) dnaChips.push(feelingLabel);
  const companionsLabel = getOptionLabel(COMPANIONS, state.companions);
  if (companionsLabel) dnaChips.push(companionsLabel);
  for (const id of state.interests.slice(0, 3)) {
    const l = getOptionLabel(INTERESTS, id);
    if (l) dnaChips.push(l);
  }
  const rhythmLabel = getOptionLabel(RHYTHMS, state.rhythm);
  if (rhythmLabel) dnaChips.push(rhythmLabel);
  if (state.investment) {
    const invLabel = getOptionLabel(INVESTMENT_TIERS, state.investment);
    if (invLabel) dnaChips.push(invLabel);
  }
  if (pickupCity && state.pickup && state.pickup !== "other") {
    dnaChips.push(`From ${pickupCity}`);
  }

  // ---------- Daypart timeline ----------
  // Pure labels derived from stop count + rhythm — no invented facts.
  const dayparts: string[] = (() => {
    const n = editedStops.length;
    if (n <= 2) return ["Morning", "Late afternoon"];
    if (n === 3) return ["Morning", "Midday", "Late afternoon"];
    if (n === 4) return ["Morning", "Midday", "Afternoon", "Sunset"];
    return ["Morning", "Midday", "Afternoon", "Sunset", "Evening"];
  })();

  // Hard guard: if the resolved Signature is incomplete, render a safe
  // fallback instead of the cinematic reveal. No invented stops / photos.
  if (!revealValidation.ok) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Signature needs a human touch"
        data-testid="studio-v3-reveal-fallback"
        data-missing={revealValidation.missing.join(",")}
        className="relative w-full max-w-[560px] px-5 pb-12 pt-10 text-center"
      >
        <BackLink onClick={onBack} />
        <p
          className="mt-6 text-[10.5px] uppercase tracking-[0.28em] font-bold"
          style={{ color: "var(--gold)" }}
        >
          — YES Studio
        </p>
        <h2
          className="mt-3 text-[1.55rem] sm:text-[1.8rem] font-semibold leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your Signature needs a human touch.
        </h2>
        <p
          className="mt-4 text-[14px] leading-[1.6]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          We won't show a Signature that isn't fully grounded in a real tour. A YES curator will
          compose this one with you — same care, no guesswork.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3">
          <CtaButton onClick={onRefine} variant="primary">
            Continue with a curator
          </CtaButton>
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] uppercase tracking-[0.24em] font-semibold underline-offset-4 hover:underline"
            style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
          >
            Adjust my answers
          </button>
        </div>
      </div>
    );
  }

  // Product-flow contract (approved plan): this component owns the
  // Refine screen. Three screens, one job each:
  //   map        → MapAwakens              (cinematic route reveal)
  //   storyboard → Refine (this component) (edit stops + add-ons + live price)
  //   confirmation → Storytelling Signature (FinalRevealStory)
  // Testid `studio-v3-reveal` is preserved for backward compatibility;
  // `data-studio-v3-screen="refine"` is the stable product-level hook.
  return (
    <div
      className="relative w-full max-w-[640px] px-5 pb-12"
      data-testid="studio-v3-reveal"
      data-studio-v3-screen="refine"
      data-reveal-region={skeletonTour?.region ?? ""}
      data-reveal-tour={skeletonTour?.id ?? ""}
      data-reveal-stops={editedStops.length}
      data-destination-intent={state.destinationIntent ?? ""}
      style={{ animation: "studioV3RiseIn 620ms ease-out both" }}
    >
      {/* ---------- Fase 4 — Cinematic 3-beat composing reveal ---------- */}
      {composing ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="Composing your Signature"
          data-testid="studio-v3-compose-overlay"
          data-beat={composeBeat}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
          style={{ background: "var(--ivory)" }}
        >
          {/* Beat 1 — hero photo of the resolved Signature, fades in. */}
          {skeletonTour?.img ? (
            <div
              className="relative w-full max-w-[460px] overflow-hidden rounded-[4px]"
              style={{
                aspectRatio: "16 / 11",
                boxShadow: "0 24px 60px -28px rgba(0,0,0,0.45)",
                opacity: composeBeat >= 1 ? 1 : 0,
                transform: composeBeat >= 1 ? "scale(1)" : "scale(1.03)",
                transition: "opacity 900ms ease-out, transform 1400ms ease-out",
              }}
            >
              <img
                src={skeletonTour.img}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: "saturate(0.92) contrast(1.02)" }}
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.32) 100%)",
                }}
              />
              <p
                className="absolute left-4 bottom-3 text-[9.5px] uppercase tracking-[0.3em] font-semibold"
                style={{ color: "color-mix(in oklab, var(--ivory) 92%, transparent)" }}
              >
                <span style={{ color: "var(--gold)" }}>—</span> Composing your Signature
              </p>
            </div>
          ) : (
            <p
              className="text-[10.5px] uppercase tracking-[0.32em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              <span style={{ color: "var(--gold)" }}>—</span> Composing your Signature
            </p>
          )}

          {/* Beat 2 — italic "why it fits" line. */}
          <p
            className="mt-6 text-[19px] sm:text-[23px] leading-[1.3] italic max-w-[420px] [text-wrap:pretty]"
            style={{
              fontFamily: "var(--font-serif)",
              color: "color-mix(in oklab, var(--charcoal) 86%, transparent)",
              opacity: composeBeat >= 2 ? 1 : 0,
              transform: composeBeat >= 2 ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 700ms ease-out, transform 700ms ease-out",
            }}
          >
            {name ? `${name}, ` : ""}one route, one rhythm — shaped only around the day you
            described.
          </p>

          {/* Beat 3 — trust whisper. */}
          <p
            className="mt-5 text-[10.5px] uppercase tracking-[0.28em] font-semibold"
            style={{
              color: "color-mix(in oklab, var(--teal) 78%, transparent)",
              opacity: composeBeat >= 3 ? 1 : 0,
              transform: composeBeat >= 3 ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 600ms ease-out, transform 600ms ease-out",
            }}
          >
            We confirm everything before you book
          </p>

          <span
            aria-hidden
            className="mt-6 inline-block h-px w-12"
            style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
          />
        </div>
      ) : null}

      <BackLink onClick={onBack} />

      {/* ---------- 1. Header — same `Your Day` framing as the map beat ----------
        Refine is not a new wizard step; it is the same surface, now editable.
        Shared eyebrow + title treatment via YourDayFrame. */}
      <YourDayFrame
        className="pt-10"
        title={
          <span data-testid="studio-v3-signature-hero">
            Your day is ready.
            <br />
            <span className="italic" style={{ color: "var(--teal)" }}>
              Now you can refine it.
            </span>
          </span>
        }
      />

      {/* ---------- Unified "Your Signature" card (map · story · edit · DNA · price · add-ons) ----------
        Mobile-first ≤560px column. Desktop widens to give journey copy real
        breathing room (fixes the word-by-word wrap Refine users saw on
        laptop widths). Inner children remain capped at 520px so the
        editorial rhythm stays intentional. */}
      <section
        data-testid="studio-v3-signature-card"
        className="mt-8 mx-auto w-full max-w-[560px] lg:max-w-[860px] xl:max-w-[960px] rounded-[14px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
        style={{
          background: "color-mix(in oklab, var(--ivory) 92%, transparent)",
          border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
          boxShadow: "0 24px 60px -36px rgba(0,0,0,0.25)",
        }}
      >
        {/* ---------- 2. Truthful route surface (map OR timeline) ----------
            P8 hardening: the unified Your Day only claims a map when every
            kept moment holds a real, coherent coordinate. Otherwise the same
            moments read as the editorial timeline. One map instance only, and
            no driven route line unless real routed geometry exists. */}
        {editedStops.length > 0 ? (
          <UnifiedYourDayRoute
            moments={unifiedRouteMoments}
            className="mt-8 mx-auto w-full max-w-[520px]"
            mapSlot={
              <div data-testid="studio-v3-reveal-map">
                <RevealRouteMap
                  editedStops={editedStops}
                  resolved={resolved}
                  skeletonTour={skeletonTour ?? null}
                  statePickup={state.pickup}
                  revealedStops={revealedStops}
                  showRoute={false}
                />
              </div>
            }
          />
        ) : null}

        {editedStops.length > 0 ? (
          <div className="mx-auto w-full max-w-[520px]">
            {/* Numbered legend — full names live here so the map stays clean
              and labels never overlap at 393px mobile. */}


            {/* Numbered legend — full names live here so the map stays clean
              and labels never overlap at 393px mobile. */}
            <ol
              className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-1"
              aria-label="Route stops in order"
            >
              {editedStops.map((s, i) => {
                const visible = i < revealedStops;
                return (
                  <li
                    key={`${s.label}-${i}`}
                    className="inline-flex items-center gap-1.5 motion-reduce:!opacity-100 motion-reduce:!translate-y-0"
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? "translateY(0)" : "translateY(4px)",
                      transition: "opacity 360ms ease-out, transform 360ms ease-out",
                    }}
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{
                        background: "color-mix(in oklab, var(--gold) 28%, transparent)",
                        color: "var(--charcoal)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-[11.5px] leading-[1.3] font-semibold"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                      }}
                    >
                      {displayLabel(s.label)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* ---------- 3. The story of the day (P8 unified surface) ----------
            One lightweight editorial chapter, directly after the ordered
            moments, before any control. Never repeats Director's Read. */}
        {storySlot ? (
          <div data-testid="studio-v3-your-day-story" className="mx-auto mt-8 max-w-[560px]">
            {storySlot}
          </div>
        ) : null}

        {/* Phase C: composer rationale is now merged inline into each stop row
            below (no separate panel). Flag still gates the inline rendering. */}

        {/* Living Atlas intelligence — the same grounded reasoning that biased
            the Signature choice, shown in the Travel File before the stops so
            the traveller understands the day they are about to shape. */}
        <WhyRouteWorks
          reasons={resolved.livingAtlasReasons ?? []}
          testId="studio-v3-travel-file-reasons"
          className="mx-auto mt-8 max-w-[520px]"
        />

        {/* ---------- Stops list (editable) ---------- */}

        {editedStops.length > 0 ? (
          <div
            data-testid="studio-v3-stops-editor"
            className="mt-8 sm:mt-10 max-w-[520px] mx-auto px-0 sm:px-1"
          >
            <p
              className="text-center text-[13px] font-medium mb-4 sm:mb-5"
              style={{
                fontFamily: "var(--font-editorial)",
                color: "var(--charcoal)",
              }}
            >
              Your stops
            </p>

            {/* Contextual refine intents — rendered only when the engine can
                really execute them on this day. No decorative chips. */}
            {refineIntents.length > 0 ? (
              <div data-testid="studio-v3-refine-intents" className="mb-4 sm:mb-5">
                <p
                  className="text-center text-[10px] uppercase tracking-[0.24em] font-semibold mb-2.5"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                >
                  Shift the mood
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {refineIntents.map((intent) => (
                    <button
                      key={intent.id}
                      type="button"
                      data-refine-intent={intent.id}
                      onClick={() => applyRefineIntent(intent)}
                      title={intent.detail}
                      aria-label={`${intent.label} — ${intent.detail}`}
                      className="min-h-[44px] rounded-full px-4 py-2 text-[12px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                      style={{
                        border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
                        color: "var(--charcoal)",
                        background: "transparent",
                      }}
                    >
                      {intent.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Discreet feedback of the last real change + single-step undo. */}
            {intentFeedback ? (
              <div
                data-testid="studio-v3-refine-feedback"
                role="status"
                aria-live="polite"
                className="mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[12px]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
              >
                <span style={{ fontFamily: "var(--font-editorial)" }}>{intentFeedback}</span>
                {undoSnapshot ? (
                  <button
                    type="button"
                    onClick={undoRefine}
                    data-testid="studio-v3-refine-undo"
                    className="min-h-[44px] px-2 text-[11px] uppercase tracking-[0.22em] font-semibold underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    style={{ color: "var(--teal)" }}
                  >
                    Undo
                  </button>
                ) : null}
              </div>
            ) : null}

            <ol className="space-y-3 sm:space-y-3">
              {editedStops.map((s, i) => {
                const isFirst = i === 0;
                const isLast = i === editedStops.length - 1;
                const swapOpen = swapOpenIdx === i;
                return (
                  <li
                    key={`${s.label}-${i}`}
                    data-testid="studio-v3-stop-row"
                    className="rounded-[10px] px-4 py-3.5 sm:px-4 sm:py-3.5"
                    style={{
                      background: "color-mix(in oklab, var(--sand) 45%, transparent)",
                      border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
                    }}
                  >
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                        style={{
                          background: "color-mix(in oklab, var(--gold) 25%, transparent)",
                          color: "var(--charcoal)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13.5px] font-semibold leading-[1.3]"
                          style={{
                            fontFamily: "var(--font-display)",
                            color: "var(--charcoal)",
                          }}
                        >
                          {s.label}
                        </p>
                        {s.story ? (
                          <p
                            className="mt-0.5 text-[12px] leading-[1.45]"
                            style={{
                              color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
                            }}
                          >
                            {s.story}
                          </p>
                        ) : null}
                        {composerRationales[i] ? (
                          <p
                            data-testid="studio-v3-stop-rationale"
                            className="mt-1 text-[11.5px] leading-[1.4] italic"
                            style={{
                              fontFamily: "var(--font-editorial)",
                              color: "var(--gold)",
                            }}
                          >
                            {composerRationales[i]}
                          </p>
                        ) : null}
                      </div>
                      <div className="ml-auto flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                        <button
                          type="button"
                          aria-label={`Move ${s.label} earlier`}
                          disabled={isFirst}
                          onClick={() =>
                            setEdited((prev) => {
                              const n = [...prev];
                              [n[i - 1], n[i]] = [n[i], n[i - 1]];
                              return n;
                            })
                          }
                          className="relative grid h-8 w-8 place-items-center rounded-full text-[14px] after:absolute after:-inset-[6px] after:content-[''] disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                          style={{ color: "var(--charcoal)" }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${s.label} later`}
                          disabled={isLast}
                          onClick={() =>
                            setEdited((prev) => {
                              const n = [...prev];
                              [n[i], n[i + 1]] = [n[i + 1], n[i]];
                              return n;
                            })
                          }
                          className="relative grid h-8 w-8 place-items-center rounded-full text-[14px] after:absolute after:-inset-[6px] after:content-[''] disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                          style={{ color: "var(--charcoal)" }}
                        >
                          ↓
                        </button>
                        {swapPool.length > 0 ? (
                          <button
                            type="button"
                            aria-label={`Swap ${s.label}`}
                            aria-expanded={swapOpen}
                            onClick={() => setSwapOpenIdx(swapOpen ? null : i)}
                            className="relative grid h-8 w-8 place-items-center rounded-full text-[13px] after:absolute after:-inset-[6px] after:content-[''] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                            style={{ color: "var(--charcoal)" }}
                          >
                            ⇄
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Remove ${s.label}`}
                          disabled={editedStops.length <= REFINE_MIN_STOPS}
                          onClick={() => {
                            const before = editedStops.map((p) => ({ ...p }));
                            const removed = s.label;
                            setUndoSnapshot({
                              stops: before,
                              summary: `${removed} steps out of your day.`,
                            });
                            setEdited((prev) => prev.filter((_, j) => j !== i));
                            setIntentFeedback(`${removed} steps out of your day.`);
                            trackStudio("moment_removed", {
                              phase: "storyboard",
                              via: "card",
                              stops: editedStops.length - 1,
                            });
                          }}
                          className="relative grid h-8 w-8 place-items-center rounded-full text-[14px] after:absolute after:-inset-[6px] after:content-[''] disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                          style={{ color: "var(--charcoal)" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {swapOpen ? (
                      <ul
                        data-testid="studio-v3-swap-pool"
                        className="mt-2.5 space-y-1 border-t pt-2"
                        style={{
                          borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)",
                        }}
                      >
                        {swapPool.map((cand) => (
                          <li key={cand.label}>
                            <button
                              type="button"
                              onClick={() => {
                                const before = editedStops.map((p) => ({ ...p }));
                                const summary = `${cand.label} replaces ${s.label}.`;
                                setUndoSnapshot({ stops: before, summary });
                                setEdited((prev) =>
                                  prev.map((p, j) =>
                                    j === i ? { label: cand.label, story: cand.story } : p,
                                  ),
                                );
                                setSwapOpenIdx(null);
                                setIntentFeedback(summary);
                                trackStudio("moment_swapped", {
                                  phase: "storyboard",
                                  via: "card",
                                  source: cand.source,
                                });
                              }}
                              className="w-full min-h-[44px] text-left px-2 py-2.5 rounded-[6px] text-[12.5px] leading-[1.4] hover:bg-[color:var(--ivory)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                              style={{ color: "var(--charcoal)" }}
                            >
                              <span className="font-semibold">{cand.label}</span>
                              {cand.story ? (
                                <span
                                  className="block text-[11.5px]"
                                  style={{
                                    color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                                  }}
                                >
                                  {cand.story}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {/* Add a moment — capped by rhythm; pool stays inside the same Signature. */}
            {canAddMoment ? (
              <div data-testid="studio-v3-add-moment" className="mt-4">
                <button
                  type="button"
                  onClick={() => setAddOpen((v) => !v)}
                  aria-expanded={addOpen}
                  className="w-full rounded-[8px] px-3 py-2.5 text-[12.5px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                  style={{
                    border: "1px dashed color-mix(in oklab, var(--gold) 55%, transparent)",
                    color: "var(--charcoal)",
                    background: "transparent",
                  }}
                >
                  {addOpen ? "Close" : "+ Add one more moment"}
                </button>
                {addOpen ? (
                  <p
                    className="mt-2 text-center text-[11.5px] leading-[1.5]"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
                  >
                    Choose a moment that still fits the day's rhythm.
                  </p>
                ) : null}
                {addOpen ? (
                  <ul
                    data-testid="studio-v3-add-pool"
                    className="mt-2 space-y-1 rounded-[8px] p-2"
                    style={{
                      background: "color-mix(in oklab, var(--sand) 35%, transparent)",
                      border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
                    }}
                  >
                    {swapPool.slice(0, 6).map((cand) => (
                      <li key={cand.label}>
                        <button
                          type="button"
                          onClick={() => {
                            setEdited((prev) => [
                              ...prev,
                              { label: cand.label, story: cand.story },
                            ]);
                            setAddOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-[6px] text-[12.5px] leading-[1.4] hover:bg-[color:var(--ivory)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                          style={{ color: "var(--charcoal)" }}
                        >
                          <span className="font-semibold">+ {cand.label}</span>
                          {cand.story ? (
                            <span
                              className="block text-[11.5px]"
                              style={{
                                color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                              }}
                            >
                              {cand.story}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : isRouteComplete && swapPool.length > 0 ? (
              <p
                className="mt-3 text-center text-[12px] leading-[1.5]"
                style={{
                  color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                }}
              >
                This Signature is already complete for the rhythm you chose. Try swapping a moment
                instead.
              </p>
            ) : null}

            {state.editedRoutePoints ? (
              <div className="mt-3 flex items-center justify-between gap-3 text-[10.5px] uppercase tracking-[0.22em] font-semibold">
                <span
                  style={{
                    color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                  }}
                >
                  <span style={{ color: "var(--gold)" }}>—</span> Edited by you
                </span>
                <button
                  type="button"
                  onClick={() => onStateChange((s) => ({ ...s, editedRoutePoints: null }))}
                  className="px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                  style={{ color: "var(--charcoal)" }}
                >
                  Reset to suggested
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Signature DNA + Shaping direction removed on Refine — decorative
            content belongs to the final reveal, not the decision page. */}

        {/* ---------- Add-ons + Total (SignaturePriceCard refine variant) ---------- */}
        <SignaturePriceCard
          variant="refine"
          tour={skeletonTour ?? null}
          stopCount={editedStops.length}
          dateExact={safeDate.dateExact}
          onSecure={onSecure}
          onRefine={onRefine}
          journeyTitle={state.journeyTitle}
          guests={state.guests}
          adults={state.adults ?? null}
          minorAges={state.minorAges ?? []}
          included={(() => {
            if (!skeletonTour?.id) return skeletonTour?.included ?? [];
            const c = getTourContent(skeletonTour.id);
            return c.included.length > 0 ? c.included : (skeletonTour.included ?? []);
          })()}
          showAddOns={true}
          selectedAddOnIds={selectedAddOnIds}
          onAddOnsChange={onAddOnsChange}
          resolvedPerPaxEur={resolvedPerPaxEur}
          resolvedTotalEur={resolvedTotalEur}
          resolvedBaseTotalEur={resolvedBaseTotalEur}
          resolvedAddOnsTotalEur={resolvedAddOnsTotalEur}
          remainingMinutes={
            revealLegsLoading
              ? null
              : summarizeDay({
                  stops: editedStops.map((p) => {
                    const ep = p as {
                      label: string;
                      story: string;
                      lat?: number | null;
                      lng?: number | null;
                    };
                    return {
                      label: ep.label,
                      lat: ep.lat ?? null,
                      lng: ep.lng ?? null,
                      kind: inferKind(ep.label),
                    };
                  }),
                  drivesMin: revealLegMinutes ?? undefined,
                  region: skeletonTour?.region ?? null,
                }).remainingMin
          }
          itineraryStops={editedStops.map((p) => (p as { label: string }).label)}
          dwellHours={(() => {
            if (revealLegsLoading) return null;
            const sum = summarizeDay({
              stops: editedStops.map((p) => {
                const ep = p as {
                  label: string;
                  story: string;
                  lat?: number | null;
                  lng?: number | null;
                };
                return {
                  label: ep.label,
                  lat: ep.lat ?? null,
                  lng: ep.lng ?? null,
                  kind: inferKind(ep.label),
                };
              }),
              drivesMin: revealLegMinutes ?? undefined,
              region: skeletonTour?.region ?? null,
            });
            const totalMin = sum.totalMin ?? 0;
            return totalMin > 0 ? Math.round((totalMin / 60) * 10) / 10 : null;
          })()}
          onGuestsChange={(n) =>
            onStateChange((s) => ({
              ...s,
              guests: Math.min(12, Math.max(1, Math.round(n))),
              guestsInferred: false,
            }))
          }
        />
      </section>
      {/* ---------- /Unified "Your Signature" card ---------- */}

      {/* ---------- CTA stack — Continue + Save my signature ---------- */}
      <div className="mt-10 sm:mt-12 flex flex-col items-center gap-4">
        {pending ? (
          <BookingCtaSkeleton className="w-full max-w-[380px]" />
        ) : (
          <CtaButton
            type="button"
            onClick={onSecure}
            variant="primary"
            size="md"
            className="w-full max-w-[380px]"
            aria-label="Continue to guest details"
            data-testid="studio-v3-handoff-primary"
          >
            Continue to guest details
          </CtaButton>
        )}

        <SaveSignatureButton state={state} journeyTitle={journeyTitle} />
      </div>

      {/* ---------- Quiet secondary footer — other directions ---------- */}
      {footerSlot ? <div className="mt-12">{footerSlot}</div> : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="pb-4 border-b"
      style={{ borderColor: "color-mix(in oklab, var(--charcoal) 10%, transparent)" }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.26em] font-semibold"
        style={{ color: "var(--gold)" }}
      >
        {label}
      </p>
      <p
        className="mt-1.5 text-[14px] leading-[1.4]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 85%, transparent)" }}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * ReactionOverlay — full-viewport cinematic beat shown between phases.
 * Sits above the next phase (which is already mounted under it) and
 * gracefully dissolves on its own. Inline animation; no styles.css edits.
 */
function ReactionOverlay({
  reaction,
  state,
  onDismiss,
}: {
  reaction: Reaction;
  state: StudioV3State;
  onDismiss: () => void;
}) {
  // Match the cap used in playReaction so the overlay never visually
  // lingers past the moment the underlying phase becomes the focus.
  const rawHold = reaction.holdMs ?? 2400;
  const ceiling =
    reaction.kind === "map-beat"
      ? 2600
      : reaction.kind === "interests" || reaction.kind === "rhythm"
        ? 2200
        : 1400;
  const hold = Math.min(rawHold, ceiling);


  // Surrender pointer events shortly after the beat lands so taps fall through
  // to the next phase already mounted underneath. This fixes the mobile bug
  // where the user sees the next question but the old cinematic overlay still
  // intercepts taps, especially around Guests → Investment.
  const [clickThrough, setClickThrough] = useState(false);
  useEffect(() => {
    setClickThrough(false);
    const t = window.setTimeout(() => setClickThrough(true), Math.min(900, hold * 0.35));
    return () => window.clearTimeout(t);
  }, [hold, reaction]);
  // `pointerEvents: none` on the overlay root is NOT enough: the cinematic
  // beats render their own interactive children (map pins carry
  // `pointer-events-auto`), which keep swallowing taps aimed at the phase
  // already mounted underneath. `inert` neutralises the whole subtree —
  // pointer events, focus and the a11y tree — the moment the beat surrenders.
  const passThroughStyle = clickThrough ? { pointerEvents: "none" as const } : {};
  const inertWhenPassThrough = (clickThrough ? { inert: true } : {}) as { inert?: boolean };

  // Atmosphere beat — Creation Storytelling layer (Phase 1). Renders a
  // full-bleed image wash with a single italic line, no postcard chrome.
  if (reaction.kind === "atmosphere") {
    return (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Continue"
        {...inertWhenPassThrough}
        key={`${reaction.eyebrow}-${reaction.message}`}
        className="fixed inset-0 z-40 flex items-center justify-center cursor-pointer focus:outline-none"
        style={{
          background: "var(--charcoal)",
          animation: `studioV3ReactionFade ${hold}ms ease-out both`,
          ...passThroughStyle,
        }}
      >
        <AtmosphereBeat
          imageSrc={reaction.bgImage}
          videoSrc={reaction.bgVideo}
          eyebrow={reaction.eyebrow}
          line={reaction.message}
        />
        <style>{`
          @keyframes studioV3ReactionFade {
            0% { opacity: 0; }
            8% { opacity: 1; }
            94% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </button>
    );
  }

  // Map-beat — dark editorial map panel with origin / route / numbered
  // pins. Used between Pickup, Interests and Rhythm choices.
  // NOTE: must NOT be a <button>: <MapBeat> renders interactive pin
  // <button>s inside, and button-in-button is invalid HTML (React
  // hydration error). Use a role="button" div instead.
  if (reaction.kind === "map-beat") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onDismiss}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDismiss();
          }
        }}
        aria-label="Continue"
        {...inertWhenPassThrough}
        key={`${reaction.eyebrow}-${reaction.message}`}
        className="fixed inset-0 z-40 flex items-center justify-center cursor-pointer focus:outline-none"
        style={{
          background: "var(--charcoal)",
          animation: `studioV3ReactionFade ${hold}ms ease-out both`,
          ...passThroughStyle,
        }}
      >
        <MapBeat
          mode={reaction.mapMode ?? "origin"}
          originLabel={reaction.originLabel}
          routeLabels={reaction.routeLabels}
          regionKey={reaction.regionKey ?? null}
          originCoord={reaction.originCoord ?? null}
          rhythm={reaction.rhythmBucket ?? null}
          eyebrow={reaction.eyebrow}
          line={reaction.message}
        />

        <style>{`
          @keyframes studioV3ReactionFade {
            0% { opacity: 0; }
            8% { opacity: 1; }
            94% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // Per-kind soft "postcard" gradient using brand tokens only.
  // No external imagery: warm scenic washes drawn from --ivory / --sand /
  // --gold-soft / --teal-2. Acts as the visual layer behind/above the copy.
  // Region-aware pickup wash — Sintra leans forest-teal, Arrábida coastal,
  // Alentejo warm gold/sand, Comporta soft sand. Still token-only, no stock.
  const pickupBgByRegion: Record<string, string> = {
    "sintra-cascais":
      "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 90%, transparent) 0%, color-mix(in oklab, var(--teal-2, var(--teal)) 22%, transparent) 100%)",
    "arrabida-setubal":
      "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 90%, transparent) 0%, color-mix(in oklab, var(--teal) 18%, transparent) 60%, color-mix(in oklab, var(--gold-soft, var(--gold)) 22%, transparent) 100%)",
    alentejo:
      "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 90%, transparent) 0%, color-mix(in oklab, var(--gold-soft, var(--gold)) 30%, transparent) 55%, color-mix(in oklab, var(--sand) 68%, transparent) 100%)",
    "comporta-troia":
      "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 92%, transparent) 0%, color-mix(in oklab, var(--sand) 72%, transparent) 60%, color-mix(in oklab, var(--gold-soft, var(--gold)) 22%, transparent) 100%)",
    lisbon:
      "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 92%, transparent) 0%, color-mix(in oklab, var(--teal-2, var(--teal)) 18%, transparent) 100%)",
  };
  const postcardBg =
    reaction.kind === "feeling"
      ? "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 88%, transparent) 0%, color-mix(in oklab, var(--sand) 70%, transparent) 55%, color-mix(in oklab, var(--gold-soft, var(--gold)) 40%, transparent) 100%)"
      : reaction.kind === "pickup"
        ? (reaction.regionKey && pickupBgByRegion[reaction.regionKey]) ||
          "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 92%, transparent) 0%, color-mix(in oklab, var(--teal-2, var(--teal)) 18%, transparent) 100%)"
        : reaction.kind === "interests"
          ? "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 90%, transparent) 0%, color-mix(in oklab, var(--gold-soft, var(--gold)) 32%, transparent) 60%, color-mix(in oklab, var(--sand) 65%, transparent) 100%)"
          : reaction.kind === "considerations"
            ? "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 94%, transparent) 0%, color-mix(in oklab, var(--sand) 72%, transparent) 100%)"
            : "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 92%, transparent) 0%, color-mix(in oklab, var(--teal-2, var(--teal)) 16%, transparent) 60%, color-mix(in oklab, var(--gold-soft, var(--gold)) 26%, transparent) 100%)";

  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Continue"
      {...inertWhenPassThrough}
      key={`${reaction.eyebrow}-${reaction.message}`}
      className="fixed inset-0 z-40 flex items-center justify-center px-6 cursor-pointer focus:outline-none"
      style={{
        background: "color-mix(in oklab, var(--ivory) 92%, transparent)",
        backdropFilter: "blur(2px)",
        animation: `studioV3ReactionFade ${hold}ms ease-out both`,
        ...passThroughStyle,
      }}
    >
      <div className="w-full max-w-[480px] text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold inline-flex items-center gap-1.5 mx-auto"
          style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
          data-testid="studio-v3-voice-mark"
        >
          <span className="font-bold tracking-[0.32em]" style={{ color: "var(--teal)" }}>
            YES
          </span>
          <span style={{ color: "var(--gold)" }}>—</span>
          <span>{reaction.eyebrow}</span>
        </p>

        {/* ---------- Map preview panel ---------- */}
        <MapPreviewPanel reaction={reaction} fallbackBg={postcardBg} />

        {/* ---------- Story copy ---------- */}
        <p
          className="mt-6 text-[20px] sm:text-[24px] leading-[1.3] italic whitespace-pre-line text-balance"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--charcoal)",
            animation: "studioV3RiseIn 620ms ease-out 160ms both",
          }}
        >
          {reaction.message}
        </p>

        {/* Optional bridge subline under the message — quiet, italic. */}
        {reaction.postcardSubline ? (
          <p
            className="mt-4 text-[12.5px] italic"
            style={{
              fontFamily: "var(--font-serif)",
              color: "color-mix(in oklab, var(--charcoal) 58%, transparent)",
              animation: "studioV3RiseIn 640ms ease-out 260ms both",
            }}
          >
            {reaction.postcardSubline}
          </p>
        ) : null}

        {/* Regional voice — only renders once a Signature resolves, so the
            tone of the place enters the transition itself. Never invented. */}
        {(() => {
          if (!state.feeling || !state.companions || !state.rhythm) return null;
          const resolved = resolveStudioV3Route({
            feeling: state.feeling,
            companions: state.companions,
            rhythm: state.rhythm,
            interests: state.interests,
            pickup: state.pickup,
            occasion: state.occasion,
            investment: state.investment,
            destinationIntent: state.destinationIntent,
            dateExact: state.dateExact,
            refinement: state.refinement,
          });
          const tour = resolved?.skeletonTourKey
            ? signatureTours.find((t) => t.id === resolved.skeletonTourKey)
            : null;
          if (!tour) return null;
          const voice = regionalVoiceFor(tour.region);
          if (voice.eyebrow === "PORTUGAL VOICE") return null;
          return (
            <p
              className="mt-4 inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.26em] font-bold"
              style={{
                color: "var(--teal)",
                animation: "studioV3RiseIn 540ms ease-out 360ms both",
              }}
              data-testid="studio-v3-region-voice"
            >
              <span style={{ color: "var(--gold)" }} aria-hidden>
                —
              </span>
              <span>{voice.eyebrow}</span>
            </p>
          );
        })()}

        {reaction.detail ? (
          <p
            className="mt-3 text-[11px] uppercase tracking-[0.24em] font-semibold"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
              animation: "studioV3RiseIn 540ms ease-out 260ms both",
            }}
          >
            <span style={{ color: "var(--gold)" }}>—</span> {reaction.detail}
          </p>
        ) : null}
      </div>

      <style>{`
        @keyframes studioV3ReactionFade {
          0% { opacity: 0; }
          6% { opacity: 1; }
          94% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </button>
  );
}

/**
 * MapPreviewPanel — a lightweight, abstract map-like canvas used inside
 * reaction beats to suggest the journey forming. No real geography, no
 * external map library, no invented coordinates — just brand tokens, a
 * faint hairline grid, an origin dot and thematic pins.
 *
 * TODO: Later phase — when the full Map is ready earlier in the flow,
 * consider replacing this with a constrained preview of BuilderMap. For
 * now BuilderMap internals must not change, so we render this locally.
 */
function MapPreviewPanel({ reaction, fallbackBg }: { reaction: Reaction; fallbackBg: string }) {
  // Short acknowledgement beats opt out of the schematic canvas entirely.
  if (reaction.hidePanel) return null;
  const isInterests = reaction.kind === "interests" && reaction.chips && reaction.chips.length > 0;
  const showMap =
    reaction.kind === "pickup" ||
    reaction.kind === "interests" ||
    reaction.kind === "rhythm" ||
    reaction.kind === "investment";

  // Map-like ivory background with subtle teal/gold gradients.
  const mapBg = showMap
    ? "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 96%, transparent) 0%, color-mix(in oklab, var(--sand) 60%, transparent) 55%, color-mix(in oklab, var(--teal-2, var(--teal)) 10%, transparent) 100%)"
    : fallbackBg;

  // Pin positions for the interests preview. Stable, abstract — these are
  // thematic pins, not confirmed stops, and they are deliberately spread
  // so the canvas reads as a map, not a tag row.
  const pinPositions: Array<{ x: number; y: number }> = [
    { x: 22, y: 38 },
    { x: 58, y: 28 },
    { x: 72, y: 62 },
    { x: 38, y: 70 },
  ];

  // Rhythm preview — number of soft stop dots along the route.
  const rhythmDots =
    reaction.kind === "rhythm"
      ? reaction.postcardCaption === "Slow"
        ? 2
        : reaction.postcardCaption === "Balanced"
          ? 3
          : reaction.postcardCaption === "Full"
            ? 5
            : 4
      : 0;

  return (
    <div
      aria-hidden
      className="mt-5 mx-auto relative overflow-hidden"
      style={{
        width: "100%",
        maxWidth: "420px",
        aspectRatio: isInterests ? "4 / 3" : "16 / 9",
        background: mapBg,
        border: "1px solid color-mix(in oklab, var(--charcoal) 8%, transparent)",
        borderRadius: "2px",
        boxShadow: "0 14px 40px -22px rgba(46,46,46,0.28)",
        animation: "studioV3RiseIn 600ms ease-out both",
      }}
    >
      {/* Hairline gold rule, mirrors the editorial system. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-3 h-px w-8 -translate-x-1/2"
        style={{ background: "var(--gold)" }}
      />

      {/* ---------- Atmospheric image wash ----------
          Existing project asset, low opacity, ivory veil on top so text and
          map markers stay readable. Wash sits beneath the grid + dots. */}
      {reaction.bgImage ? (
        <>
          <img
            src={reaction.bgImage}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{
              opacity: 0.62,
              filter: "saturate(0.85) contrast(0.95)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--ivory) 68%, transparent) 0%, color-mix(in oklab, var(--ivory) 50%, transparent) 50%, color-mix(in oklab, var(--ivory) 78%, transparent) 100%)",
            }}
          />
        </>
      ) : null}

      {/* Faint hairline grid — reads as a map surface, not a postcard. */}
      {showMap ? (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--charcoal) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--charcoal) 6%, transparent) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.55,
            maskImage: "radial-gradient(ellipse at center, black 55%, transparent 95%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 55%, transparent 95%)",
          }}
        />
      ) : null}

      {/* ---------- Pickup: origin + dashed route fading to ghost destination ---------- */}
      {reaction.kind === "pickup" ? (
        <>
          {/* Quiet "Route forming" eyebrow, top-left of the canvas. */}
          <p
            className="absolute left-5 top-5 text-[9.5px] uppercase tracking-[0.28em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
          >
            Route forming
          </p>

          <div className="absolute inset-x-5 bottom-5 flex items-center gap-2.5">
            {/* Origin dot — double ring for weight. */}
            <span
              aria-hidden
              className="inline-block shrink-0 relative"
              style={{
                width: 12,
                height: 12,
                borderRadius: "999px",
                background: "var(--gold)",
                boxShadow:
                  "0 0 0 5px color-mix(in oklab, var(--gold) 20%, transparent), 0 0 0 9px color-mix(in oklab, var(--gold) 10%, transparent)",
              }}
            />
            <span
              className="text-[11px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap"
              style={{ color: "var(--charcoal)" }}
            >
              Origin · {reaction.originLabel ?? "your start"}
            </span>
            {/* Dashed hairline route, extending further. */}
            <span
              aria-hidden
              className="flex-1 h-px"
              style={{
                backgroundImage:
                  "linear-gradient(to right, color-mix(in oklab, var(--charcoal) 42%, transparent) 0%, color-mix(in oklab, var(--charcoal) 22%, transparent) 60%, color-mix(in oklab, var(--charcoal) 10%, transparent) 100%)",
                backgroundSize: "6px 1px",
                backgroundRepeat: "repeat-x",
              }}
            />
            {/* Ghost destination — unlabeled, half-opacity, dashed border. */}
            <span
              aria-hidden
              className="inline-block shrink-0"
              style={{
                width: 8,
                height: 8,
                borderRadius: "999px",
                background: "transparent",
                border: "1px dashed color-mix(in oklab, var(--charcoal) 35%, transparent)",
                opacity: 0.7,
              }}
            />
          </div>
        </>
      ) : null}

      {/* ---------- Interests: thematic pins, connected to origin by hairlines ---------- */}
      {isInterests ? (
        <>
          {/* Faint hairlines from origin to each pin — SVG so we can draw
              true diagonals without new components. */}
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {reaction.chips!.slice(0, 4).map((label, i) => {
              const p = pinPositions[i];
              return (
                <line
                  key={`line-${label}`}
                  x1={10}
                  y1={82}
                  x2={p.x}
                  y2={p.y}
                  stroke="color-mix(in oklab, var(--charcoal) 22%, transparent)"
                  strokeWidth={0.35}
                  strokeDasharray="1.2 1.6"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* Origin anchor — gold, bottom-left. */}
          <span
            aria-hidden
            className="absolute"
            style={{
              left: "10%",
              top: "82%",
              transform: "translate(-50%, -50%)",
              width: 10,
              height: 10,
              borderRadius: "999px",
              background: "var(--gold)",
              boxShadow:
                "0 0 0 4px color-mix(in oklab, var(--gold) 18%, transparent), 0 0 0 7px color-mix(in oklab, var(--gold) 9%, transparent)",
            }}
          />
          {reaction.chips!.slice(0, 4).map((label, i) => {
            const p = pinPositions[i];
            return (
              <div
                key={label}
                className="absolute flex items-center gap-1.5"
                style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}
              >
                <span
                  aria-hidden
                  className="inline-block"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "999px",
                    background: "color-mix(in oklab, var(--teal) 80%, transparent)",
                    boxShadow: "0 0 0 3px color-mix(in oklab, var(--teal) 14%, transparent)",
                  }}
                />
                <span
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold whitespace-nowrap"
                  style={{
                    color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
          {reaction.chipsTail ? (
            <p
              className="absolute inset-x-0 bottom-2 text-center text-[10px] italic"
              style={{
                fontFamily: "var(--font-serif)",
                color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
              }}
            >
              {reaction.chipsTail}
            </p>
          ) : null}
        </>
      ) : null}

      {/* ---------- Rhythm: origin + density-aware stop dots ---------- */}
      {reaction.kind === "rhythm" ? (
        <div className="absolute inset-x-5 bottom-5 flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block shrink-0"
            style={{
              width: 9,
              height: 9,
              borderRadius: "999px",
              background: "var(--gold)",
              boxShadow: "0 0 0 4px color-mix(in oklab, var(--gold) 18%, transparent)",
            }}
          />
          <span
            aria-hidden
            className="h-px w-4"
            style={{ background: "color-mix(in oklab, var(--charcoal) 30%, transparent)" }}
          />
          {Array.from({ length: rhythmDots }).map((_, i) => (
            <span key={i} aria-hidden className="flex items-center gap-2">
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "999px",
                  background: "color-mix(in oklab, var(--teal) 70%, transparent)",
                  display: "inline-block",
                }}
              />
              {i < rhythmDots - 1 ? (
                <span
                  aria-hidden
                  className="h-px w-3"
                  style={{
                    background: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
                  }}
                />
              ) : null}
            </span>
          ))}
          <span
            aria-hidden
            className="flex-1 h-px"
            style={{
              background:
                "linear-gradient(to right, color-mix(in oklab, var(--charcoal) 18%, transparent), transparent)",
            }}
          />
          {reaction.postcardCaption ? (
            <span
              className="ml-2 text-[10px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
            >
              {reaction.postcardCaption}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* ---------- Investment: origin + moment dots + faint route + ghost end ---------- */}
      {reaction.kind === "investment" ? (
        <>
          <p
            className="absolute left-5 top-5 text-[9.5px] uppercase tracking-[0.28em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
          >
            The route can take shape
          </p>
          <div className="absolute inset-x-5 bottom-5 flex items-center gap-2">
            {/* Origin */}
            <span
              aria-hidden
              className="inline-block shrink-0"
              style={{
                width: 10,
                height: 10,
                borderRadius: "999px",
                background: "var(--gold)",
                boxShadow:
                  "0 0 0 4px color-mix(in oklab, var(--gold) 18%, transparent), 0 0 0 7px color-mix(in oklab, var(--gold) 9%, transparent)",
              }}
            />
            {/* Three teal moment dots along the arc, separated by hairlines. */}
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex items-center gap-2 flex-1">
                <span
                  aria-hidden
                  className="flex-1 h-px"
                  style={{
                    background:
                      "linear-gradient(to right, color-mix(in oklab, var(--charcoal) 28%, transparent), color-mix(in oklab, var(--charcoal) 18%, transparent))",
                  }}
                />
                <span
                  aria-hidden
                  className="inline-block shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background: "color-mix(in oklab, var(--teal) 78%, transparent)",
                    boxShadow: "0 0 0 3px color-mix(in oklab, var(--teal) 12%, transparent)",
                  }}
                />
              </span>
            ))}
            {/* Tail hairline + ghost destination (unlabeled, dashed). */}
            <span
              aria-hidden
              className="flex-1 h-px"
              style={{
                backgroundImage:
                  "linear-gradient(to right, color-mix(in oklab, var(--charcoal) 22%, transparent), color-mix(in oklab, var(--charcoal) 8%, transparent))",
                backgroundSize: "6px 1px",
                backgroundRepeat: "repeat-x",
              }}
            />
            <span
              aria-hidden
              className="inline-block shrink-0"
              style={{
                width: 8,
                height: 8,
                borderRadius: "999px",
                background: "transparent",
                border: "1px dashed color-mix(in oklab, var(--charcoal) 35%, transparent)",
                opacity: 0.7,
              }}
            />
          </div>
        </>
      ) : null}

      {/* ---------- Fallback: quiet caption (feeling / considerations) ---------- */}
      {!showMap && reaction.postcardCaption ? (
        <div className="absolute inset-x-5 bottom-5">
          <p
            className="text-[11px] uppercase tracking-[0.24em] font-semibold text-left"
            style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
          >
            <span style={{ color: "var(--gold)" }}>—</span> {reaction.postcardCaption}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phase 7A — Saveable Signature                                      */
/* ------------------------------------------------------------------ */

function SaveSignatureButton({
  state,
  journeyTitle,
}: {
  state: StudioV3State;
  journeyTitle: string;
}) {
  const save = useServerFn(saveStudioV3Signature);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onSave = useCallback(async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    try {
      const res = await save({
        data: {
          journeyTitle,
          skeletonTourKey: state.tourId ?? null,
          state: state as unknown as Record<string, unknown>,
        },
      });
      setToken(res.token);
      setStatus("saved");
    } catch (e) {
      console.error("[studio-v3 save]", e);
      setStatus("error");
    }
  }, [save, status, journeyTitle, state]);

  if (status === "saved" && token) {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/studio-v3?saved=${token}`
        : `/studio-v3?saved=${token}`;
    return (
      <div
        data-testid="studio-v3-saved-confirmation"
        className="mt-2 w-full max-w-[420px] motion-safe:[animation:studioV3RiseIn_520ms_ease-out_both]"
      >
        <span aria-hidden="true" className="gold-rule mb-4 max-w-[3rem] mx-auto block" />
        <span className="flex items-center justify-center gap-2.5 text-[11px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
          <span
            aria-hidden="true"
            className="inline-block h-[6px] w-[6px] rounded-full bg-[color:var(--gold)]"
          />
          Saved
        </span>
        <h3 className="serif mt-3 text-[1.6rem] leading-[1.14] tracking-[-0.014em] text-[color:var(--charcoal)] font-medium text-balance text-center">
          Your Signature is saved
        </h3>
        <p className="mt-3 text-[13px] leading-[1.55] text-[color:var(--charcoal-soft)] max-w-md mx-auto text-center">
          You can return to this private story anytime.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3">
          <CtaButton
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard blocked — link still visible below */
              }
            }}
            iconLeading={<Check size={13} aria-hidden className="text-[color:var(--gold)]" />}
            icon={null}
          >
            {copied ? "Copied" : "Copy link"}
          </CtaButton>
          <p
            className="text-[10.5px] font-mono break-all text-center"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            {link}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <CtaButton
        variant="ghost"
        size="sm"
        onClick={onSave}
        loading={status === "saving"}
        loadingLabel="Saving…"
        error={status === "error" ? 1 : 0}
        icon={null}
        aria-label="Save this Signature for later"
        data-testid="studio-v3-save-signature"
      >
        {status === "error" ? "Try saving again" : "Save this Signature"}
      </CtaButton>
      {status === "error" ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="studio-v3-save-error"
          className="mt-3 max-w-[340px] text-center text-[12px] leading-[1.5] [text-wrap:pretty] text-[color:var(--text-muted)]"
        >
          We couldn't save this Signature just now. Please try again, or use{" "}
          <span style={{ color: "var(--gold)", fontWeight: 600 }}>Say YES</span> and we'll keep the
          details with your request.
        </p>
      ) : null}
    </div>
  );
}
