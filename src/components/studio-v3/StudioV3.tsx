import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChoiceGrid } from "./ChoiceGrid";
import { StudioV3Intro } from "./StudioV3Intro";
import { PhaseShell } from "./PhaseShell";
import { MapAwakens } from "./MapAwakens";
import { LivingJourneyPanel } from "./LivingJourneyPanel";
import { ComposerMap } from "./ComposerMap";
import { AtmosphereBeat } from "./CreationBeat";
import { LeadCaptureSheet, type LeadIntent } from "./LeadCaptureSheet";
import { whatsappHref } from "@/components/WhatsAppFab";
import {
  composeJourneyTitle,
  composePersonalizedMoments,
  composeSuggestedRoute,
  getOptionLabel,
  inferGuests,
} from "./curation";
import { findTour } from "@/data/signatureTours";

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
  COMPANIONS,
  CONSIDERATIONS,
  DATE_WINDOWS,
  FEELINGS,
  GUEST_BUCKETS,
  INITIAL_STATE,
  INTERESTS,
  INVESTMENT_TIERS,
  LANGUAGES,
  OCCASIONS,
  PICKUPS,
  RHYTHMS,
  type ChoiceOption,
  type Companions,
  type Consideration,
  type DateWindow,
  type Feeling,
  type GuestBucket,
  type Interest,
  type InvestmentTier,
  type Language,
  type Occasion,
  type Pickup,
  type Rhythm,
  type StudioV3Phase,
  type StudioV3State,
} from "./types";

/**
 * StudioV3 — Cinematic Journey Composer (Phase 1A: Operational Spine).
 *
 * Chain (13 internal phases — never surfaced as a "long form"):
 *   feeling → who → occasion → date → pickup → guests → interests
 *   → rhythm → considerations → language → investment → map → storyboard
 *
 * Phase 1B will: wire curation soft-hints from the new fields, show pickup
 * in the map eyebrow, and render the Journey Summary block in the
 * storyboard handoff. Those are intentionally not touched here.
 */

const TOTAL_STEPS = 13;

const PHASE_ORDER: StudioV3Phase[] = [
  "intro",
  "feeling",
  "who",
  "occasion",
  "date",
  "pickup",
  "guests",
  "interests",
  "rhythm",
  "considerations",
  "language",
  "investment",
  "map",
  "storyboard",
];

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
  feeling: ["Next, the company", "Next, who joins you", "Next, your travellers"],
  who: ["Next, the occasion", "Next, the reason", "Next, what brings you here"],
  occasion: ["Next, the when", "Next, your timing", "Next, the season"],
  date: ["Next, we shape the beginning", "Next, where it starts", "Next, the starting point"],
  pickup: ["Next, the party size", "Next, your group", "Next, how many guests"],
  guests: ["Next, we choose the moments", "Next, what draws you", "Next, the experiences"],
  interests: ["Next, we refine the rhythm", "Next, the pace", "Next, how it flows"],
  rhythm: ["Next, the care", "Next, the details", "Next, what matters most"],
  considerations: ["Next, the voice", "Next, your language", "Next, how you hear it"],
  language: ["Next, the comfort", "Next, the shape", "Next, your style"],
  investment: ["Next, the route takes shape", "Next, the map awakens", "Next, the journey forms"],
  map: ["Next, your draft"],
  storyboard: [""],
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
      if (feeling === "family") return "Next, we make the day easy for everyone.";
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
    case "family":
      return "Easy timing, real laughter, and space for everyone.\nThe day begins gently.";
    case "hidden":
      return "Quiet roads, small doors, places that do not perform.\nThe route begins away from the obvious.";
    case "adventure":
      return "Open edges, movement, and air in the day.\nThe route begins with energy.";
    case "slow-luxury":
      return "Fewer stops, deeper moments, nothing rushed.\nThe route begins with space.";
    case "coastal":
      return "Atlantic light, salt on the wind, the cliffs ahead.\nThe route begins facing the sea.";
    case "culture":
      return "Old stones, long stories, footsteps that linger.\nThe day begins with depth.";
    default:
      return "Light, space, and a slower rhythm.\nThis is where it begins.";
  }
}

/** Inferred-guests note shown subtly on the final reveal. */
function inferredGuestsNote(state: StudioV3State): string | null {
  if (!state.guestsInferred || !state.guests) return null;
  if (state.guests === "1") return "Assumed for this draft: solo traveller";
  if (state.guests === "2") return "Assumed for this draft: 2 guests";
  return null;
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
  | "atmosphere";

type Reaction = {
  /** Which of the 5 priority beats — drives the postcard visual. */
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

export function StudioV3() {
  const [state, setState] = useState<StudioV3State>(INITIAL_STATE);
  const [exiting, setExiting] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [leadSheet, setLeadSheet] = useState<{ open: boolean; intent: LeadIntent }>(
    { open: false, intent: "book" },
  );
  const openLeadSheet = useCallback(
    (intent: LeadIntent) => setLeadSheet({ open: true, intent }),
    [],
  );
  const closeLeadSheet = useCallback(
    () => setLeadSheet((s) => ({ ...s, open: false })),
    [],
  );

  const advance = useCallback((next: StudioV3Phase) => {
    setExiting(true);
    window.setTimeout(() => {
      setState((s) => ({ ...s, phase: next }));
      setExiting(false);
    }, 380);
  }, []);

  const back = useCallback((prev: StudioV3Phase) => {
    setReaction(null);
    setExiting(true);
    window.setTimeout(() => {
      setState((s) => ({ ...s, phase: prev }));
      setExiting(false);
    }, 280);
  }, []);

  /**
   * Show a reaction beat, then land on the next phase. The phase is
   * advanced silently beneath the overlay so when the beat dissolves the
   * next question is already mounted and ready. Users can tap the overlay
   * to dismiss the beat early.
   */
  const playReaction = useCallback((r: Reaction) => {
    // Reduced-motion: skip the beat entirely and advance immediately.
    if (prefersReducedMotion()) {
      advance(r.nextPhase);
      return;
    }
    const hold = Math.min(r.holdMs ?? 2600, 3400);
    setExiting(true);
    window.setTimeout(() => {
      setState((s) => ({ ...s, phase: r.nextPhase }));
      setExiting(false);
      setReaction(r);
      window.setTimeout(() => {
        setReaction((current) => (current === r ? null : current));
      }, hold);
    }, 280);
  }, [advance]);

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
    setState((s) => ({ ...s, [key]: value }));
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
    pickAndAdvance("feeling", id, "who", {
      kind: "feeling",
      eyebrow: "The feeling",
      message: feelingReactionMessage(id),
      postcardCaption: label ? `Atmosphere · ${label}` : "Atmosphere selected",
      holdMs: 2600,
      bgImage: FEELING_IMAGE[id],
    });
  };
  const onCompanions = (id: Companions) => {
    // Re-infer eagerly so the user landing on pickup already has guests set
    // when applicable. We never overwrite an explicit user choice.
    setState((s) => {
      const inferred = inferGuests(id, s.occasion, s.feeling);
      if (inferred && (s.guestsInferred || !s.guests)) {
        return { ...s, companions: id, guests: inferred, guestsInferred: true };
      }
      // Companions changed to something that no longer infers — clear stale inference.
      if (!inferred && s.guestsInferred) {
        return { ...s, companions: id, guests: null, guestsInferred: false };
      }
      return { ...s, companions: id };
    });
    window.setTimeout(() => {
      playReaction({
        kind: "atmosphere",
        eyebrow: "The company",
        message: companionsAtmosphereLine(id),
        bgImage: companionsAtmosphereImage(id, state.feeling),
        nextPhase: "occasion",
        holdMs: 1700,
      });
    }, 420);
  };
  const onOccasion = (id: Occasion) => {
    setState((s) => {
      const inferred = inferGuests(s.companions, id, s.feeling);
      if (inferred && (s.guestsInferred || !s.guests)) {
        return { ...s, occasion: id, guests: inferred, guestsInferred: true };
      }
      if (!inferred && s.guestsInferred) {
        return { ...s, occasion: id, guests: null, guestsInferred: false };
      }
      return { ...s, occasion: id };
    });
    window.setTimeout(() => {
      playReaction({
        kind: "atmosphere",
        eyebrow: "The occasion",
        message: occasionAtmosphereLine(id, state.companions),
        bgImage: occasionAtmosphereImage(id, state.feeling),
        nextPhase: "date",
        holdMs: 1700,
      });
    }, 420);
  };
  const onDate = (id: DateWindow) => pickAndAdvance("dateWindow", id, "pickup");
  const onPickup = (id: Pickup) => {
    const label = getOptionLabel(PICKUPS, id);
    // Final inference check before leaving pickup → decide whether to skip guests.
    const inferred = inferGuests(state.companions, state.occasion, state.feeling);
    const nextAfterPickup: StudioV3Phase = inferred ? "interests" : "guests";
    if (inferred) {
      setState((s) => ({ ...s, guests: inferred, guestsInferred: true }));
    }
    pickAndAdvance("pickup", id, nextAfterPickup, {
      kind: "pickup",
      eyebrow: "The beginning",
      message: label
        ? `It starts here.\nFrom ${label}, the day begins to open.`
        : "It starts here.\nThe day begins to open.",
      originLabel: label,
      postcardSubline: "Route forming",
      holdMs: 2800,
      // Pickup carries the feeling's atmosphere as a subtle wash, so the
      // origin moment still feels grounded in the trip's tone.
      bgImage: state.feeling ? FEELING_IMAGE[state.feeling] : undefined,
    });
  };
  const onGuests = (id: GuestBucket) => {
    // Explicit pick overrides any prior inference.
    setState((s) => ({ ...s, guests: id, guestsInferred: false }));
    window.setTimeout(() => advance("interests"), 420);
  };
  const onRhythm = (id: Rhythm) => {
    const hint =
      id === "slow"
        ? "Fewer stops. More time in place."
        : id === "balanced"
          ? "Movement and pause, kept in balance."
          : id === "full"
            ? "More discovery, still shaped into one realistic day."
            : "A fuller arc, carefully held.";
    const pickupLabel = getOptionLabel(PICKUPS, state.pickup);
    pickAndAdvance("rhythm", id, "considerations", {
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
      holdMs: 1600,
    });
  };
  const onLanguage = (id: Language) => pickAndAdvance("language", id, "investment");
  const onInvestment = (id: InvestmentTier) =>
    pickAndAdvance("investment", id, "map", {
      kind: "investment",
      eyebrow: "The shape",
      message: "No surprises.\nJust clarity before anything moves forward.",
      postcardCaption: "Estimate before confirmation.",
      postcardSubline: "Now the route can take shape.",
      holdMs: 2600,
    });



  // Multi-select toggles.
  const toggleInterest = (id: Interest) => {
    setState((s) => ({
      ...s,
      interests: s.interests.includes(id)
        ? s.interests.filter((x) => x !== id)
        : [...s.interests, id],
    }));
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
    playReaction({
      kind: "interests",
      eyebrow: "The moments",
      message: "These are the moments that will stay.\nThe rest can stay quiet.",
      chips: chips.length > 0 ? chips : undefined,
      chipsLabel: chips.length > 0 ? "Chosen moments" : undefined,
      chipsTail: tail,
      postcardSubline: "These will guide the route.",
      nextPhase: "rhythm",
      holdMs: 3200,
      bgImage: state.interests[0] ? INTEREST_IMAGE[state.interests[0]] : undefined,
    });
  };
  const continueFromConsiderations = () => {
    const isNone =
      state.considerations.length === 0 || state.considerations.includes("none");
    playReaction({
      kind: "considerations",
      eyebrow: "The care",
      message: "It is not just where you go.\nIt is how the day fits you.",
      postcardCaption: isNone ? "Nothing to adjust." : "Care notes held.",
      nextPhase: "language",
      holdMs: 2600,
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
            : state.feeling === "family"
              ? ["nature", "coast", "local-life"]
              : [];

  const rhythmPriority: Rhythm[] = isCoupleish || state.feeling === "slow-luxury"
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

  const guestsPriority: GuestBucket[] = isCorporate
    ? ["7-10", "11+", "5-6", "3-4"]
    : isFamily
      ? ["3-4", "5-6"]
      : [];

  const orderedInterests = prioritiseOptions(INTERESTS, interestsPriority);
  const orderedRhythms = prioritiseOptions(RHYTHMS, rhythmPriority);
  const orderedInvestment = prioritiseOptions(INVESTMENT_TIERS, investmentPriority);
  const orderedConsiderations = prioritiseOptions(CONSIDERATIONS, considerationsPriority);
  const orderedGuests = prioritiseOptions(GUEST_BUCKETS, guestsPriority);

  // Solo-aware occasion list: hide clearly group/couple-only options.
  // Couple/family/corporate get a prioritised order but the full list stays
  // available below — only Solo trims the list.
  const orderedOccasions = state.companions === "solo"
    ? OCCASIONS.filter((o) => o.id !== "proposal" && o.id !== "honeymoon" && o.id !== "family-day" && o.id !== "corporate")
    : isCoupleish
      ? prioritiseOptions(OCCASIONS, ["honeymoon", "proposal", "anniversary", "birthday", "none", "celebration"])
      : isFamily
        ? prioritiseOptions(OCCASIONS, ["family-day", "birthday", "celebration", "none"])
        : isCorporate
          ? prioritiseOptions(OCCASIONS, ["corporate", "celebration", "none"])
          : [...OCCASIONS];


  // Living Journey Panel visibility — hide on the opening "feeling" pick
  // (don't compete with the first moment), on the final map/storyboard
  // (own panels), and while a reaction beat is overlaying the screen.
  const livingPanelHidden =
    !!reaction ||
    state.phase === "feeling" ||
    state.phase === "map" ||
    state.phase === "storyboard";

  // ComposerMap shares LivingJourneyPanel's hidden gate, plus an extra
  // guard so it never renders on the opening feeling phase before a pick.
  const composerHidden =
    livingPanelHidden || (state.phase === "feeling" && !state.feeling);

  return (
    <main aria-label="YES Studio">
      <LivingJourneyPanel state={state} hidden={livingPanelHidden} />
      <ComposerMap state={state} hidden={composerHidden} />
      {state.phase === "feeling" ? (
        <PhaseShell accent="ivory" exiting={exiting}>
          <PhaseHeader
            eyebrow="The feeling"
            title="How would you like"
            titleAccent="Portugal to feel?"
          />
          <ChoiceGrid options={FEELINGS} value={state.feeling} onSelect={onFeeling} />
          {state.feeling ? (
            <NextTeaser>{contextualTeaser("feeling", state)}</NextTeaser>
          ) : (
            <FooterHint>One choice. You can shape the rest later.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "who" ? (
        <PhaseShell accent="gold" exiting={exiting}>
          <BackLink onClick={() => back("feeling")} />
          <PhaseHeader eyebrow="The company" title="Who is" titleAccent="travelling?" />
          <ChoiceGrid options={COMPANIONS} value={state.companions} onSelect={onCompanions} />
          {state.companions ? (
            <NextTeaser>{contextualTeaser("who", state)}</NextTeaser>
          ) : (
            <FooterHint>This quietly shapes what we suggest next.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "occasion" ? (
        <PhaseShell accent="ivory" exiting={exiting}>
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

      {state.phase === "date" ? (
        <PhaseShell accent="teal" exiting={exiting}>
          <BackLink onClick={() => back("occasion")} />
          <PhaseHeader eyebrow="The when" title="When should" titleAccent="this unfold?" />
          <ChoiceGrid options={DATE_WINDOWS} value={state.dateWindow} onSelect={onDate} columns={1} />
          {state.dateWindow ? (
            <NextTeaser>{contextualTeaser("date", state)}</NextTeaser>
          ) : (
            <FooterHint>We'll confirm the exact date together later.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "pickup" ? (
        <PhaseShell accent="gold" exiting={exiting}>
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
        <PhaseShell accent="ivory" exiting={exiting}>
          <BackLink onClick={() => back("pickup")} />
          <PhaseHeader eyebrow="The party" title="How many" titleAccent="guests?" />
          <ChoiceGrid options={orderedGuests} value={state.guests} onSelect={onGuests} />
          {state.guests ? (
            <NextTeaser>{contextualTeaser("guests", state)}</NextTeaser>
          ) : (
            <FooterHint>You can adjust the exact number with us later.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "interests" ? (
        <PhaseShell accent="teal" exiting={exiting}>
          <BackLink onClick={() => back(state.guestsInferred ? "pickup" : "guests")} />
          <PhaseHeader eyebrow="The moments" title="What" titleAccent="pulls you in?" />
          <ChoiceGrid
            mode="multi"
            options={orderedInterests}
            values={state.interests}
            onToggle={toggleInterest}
          />
          {state.interests.length > 0 ? (
            <NextTeaser>{contextualTeaser("interests", state)}</NextTeaser>
          ) : (
            <FooterHint>Choose the moments that matter most — usually two to four.</FooterHint>
          )}
          <ContinueCta
            disabled={state.interests.length < 1}
            onClick={continueFromInterests}
            label={state.interests.length < 1 ? "Choose at least one" : "Continue"}
          />

        </PhaseShell>
      ) : null}

      {state.phase === "rhythm" ? (
        <PhaseShell accent="gold" exiting={exiting}>
          <BackLink onClick={() => back("interests")} />
          <PhaseHeader
            eyebrow="The rhythm"
            title="How should the"
            titleAccent="day unfold?"
          />
          <ChoiceGrid options={orderedRhythms} value={state.rhythm} onSelect={onRhythm} columns={2} />
          {state.rhythm ? (
            <NextTeaser>{contextualTeaser("rhythm", state)}</NextTeaser>
          ) : (
            <FooterHint>You can change pace at any stop.</FooterHint>
          )}
        </PhaseShell>
      ) : null}

      {state.phase === "considerations" ? (
        <PhaseShell accent="ivory" exiting={exiting}>
          <BackLink onClick={() => back("rhythm")} />
          <PhaseHeader
            eyebrow="The care"
            title="Anything we should"
            titleAccent="hold for you?"
          />
          <ChoiceGrid
            mode="multi"
            options={orderedConsiderations}
            values={state.considerations}
            onToggle={toggleConsideration}
          />
          {state.considerations.length > 0 ? (
            <NextTeaser>{contextualTeaser("considerations", state)}</NextTeaser>
          ) : (
            <FooterHint>Add anything we should know — or continue if there is nothing to mention.</FooterHint>
          )}
          <ContinueCta disabled={false} onClick={continueFromConsiderations} label="Continue" />
        </PhaseShell>
      ) : null}

      {state.phase === "language" ? (
        <PhaseShell accent="teal" exiting={exiting}>
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
        <PhaseShell accent="gold" exiting={exiting}>
          <BackLink onClick={() => back("language")} />
          <PhaseHeader
            eyebrow="The comfort"
            title="How should we"
            titleAccent="shape the experience?"
          />
          <ChoiceGrid options={orderedInvestment} value={state.investment} onSelect={onInvestment} />
          {state.investment ? (
            <NextTeaser>{contextualTeaser("investment", state)}</NextTeaser>
          ) : (
            <FooterHint>Comfort level only — we'll share specifics together.</FooterHint>
          )}
        </PhaseShell>
      ) : null}


      {state.phase === "map" && state.feeling && state.companions && state.rhythm ? (
        <MapAwakens
          feeling={state.feeling}
          companions={state.companions}
          rhythm={state.rhythm}
          onBack={() => back("investment")}
          onContinue={(tourId) => {
            const tour = findTour(tourId);
            const title = composeJourneyTitle({
              feeling: state.feeling,
              companions: state.companions,
              occasion: state.occasion,
              pickup: state.pickup,
              interests: state.interests,
              rhythm: state.rhythm,
              region: tour?.region ?? null,
            });
            setState((s) => ({ ...s, tourId, journeyTitle: title }));
            advance("storyboard");
          }}
        />
      ) : null}

      {state.phase === "storyboard" ? (
        <PhaseShell accent="teal" exiting={exiting}>
          <StoryboardHandoff
            state={state}
            onBack={() => back("map")}
            onSecure={() => openLeadSheet("book")}
            onRefine={() => openLeadSheet("refine")}
          />
        </PhaseShell>
      ) : null}

      <LeadCaptureSheet
        open={leadSheet.open}
        intent={leadSheet.intent}
        state={state}
        onClose={closeLeadSheet}
      />


      {reaction ? (
        <ReactionOverlay reaction={reaction} onDismiss={() => setReaction(null)} />
      ) : null}

      {/* Discreet help affordance. Softened to a near-whisper so it never
          competes with the main experience. Hidden on phases that already
          show a Continue CTA (interests, considerations), on the final Map +
          Storyboard, and whenever a reaction beat is on screen.
          TODO: Later phase — connect Ask YES help link to official contact channel. */}
      {!reaction &&
      state.phase !== "map" &&
      state.phase !== "interests" &&
      state.phase !== "considerations" &&
      state.phase !== "storyboard" ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-2 z-30 flex justify-center px-6"
        >
          <button
            type="button"
            disabled
            aria-label="Need help? Ask YES (coming soon)"
            className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.26em] font-semibold opacity-55 cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 45%, transparent)",
              background: "transparent",
              borderRadius: "999px",
            }}
          >
            <span aria-hidden style={{ color: "color-mix(in oklab, var(--gold) 70%, transparent)" }}>—</span>
            Need help? Ask YES
          </button>
        </div>
      ) : null}
    </main>

  );
}


/* ---------- Sub-components ---------- */

function PhaseHeader({
  eyebrow,
  title,
  titleAccent,
}: {
  eyebrow: string;
  title: string;
  titleAccent: string;
}) {
  return (
    <header className="w-full max-w-[520px] text-center">
      <p
        className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
      >
        <span style={{ color: "var(--gold)" }}>—</span> {eyebrow}
      </p>
      <h1
        className="mt-5 text-[28px] sm:text-[34px] leading-[1.08] tracking-[-0.012em] font-bold"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--charcoal)",
          animation: "studioV3RiseIn 520ms ease-out both",
          animationDelay: "60ms",
        }}
      >
        {title}{" "}
        <span
          className="italic font-normal"
          style={{ fontFamily: "var(--font-serif)", color: "var(--teal)" }}
        >
          {titleAccent}
        </span>
      </h1>
    </header>
  );
}

function FooterHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-8 text-center text-[12px] italic max-w-[320px]"
      style={{
        fontFamily: "var(--font-serif)",
        color: "color-mix(in oklab, var(--charcoal) 52%, transparent)",
        animation: "studioV3RiseIn 600ms ease-out both",
        animationDelay: "320ms",
      }}
    >
      {children}
    </p>
  );
}

function NextTeaser({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-5 text-center text-[11.5px] uppercase tracking-[0.22em] font-semibold max-w-[320px]"
      style={{
        color: "color-mix(in oklab, var(--gold) 70%, var(--charcoal))",
        animation: "studioV3RiseIn 340ms ease-out both",
      }}
    >
      <span style={{ color: "var(--gold)" }}>→</span> {children}
    </p>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-4 top-4 inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
      aria-label="Back to previous step"
    >
      <ArrowLeft size={14} aria-hidden /> Back
    </button>
  );
}

/** Dark continue CTA used by the two multi-select screens. Inline styles
 *  intentionally mirror the StoryboardHandoff CTA — no new component. */
function ContinueCta({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-6 inline-flex items-center gap-2 px-6 py-3.5 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
    >
      {label} <ArrowRight size={14} aria-hidden />
    </button>
  );
}

function StoryboardHandoff({
  state,
  onBack,
  onSecure,
  onRefine,
}: {
  state: StudioV3State;
  onBack: () => void;
  onSecure: () => void;
  onRefine: () => void;
}) {
  const pickupLabel = getOptionLabel(PICKUPS, state.pickup);

  const themeWord =
    state.interests[0] === "wine" || state.feeling === "wine-food"
      ? "wine and local flavour"
      : state.feeling === "coastal" || state.interests.includes("coast")
        ? "coastal beauty"
        : state.feeling === "culture" || state.interests.includes("heritage")
          ? "heritage and atmosphere"
          : state.feeling === "romance"
            ? "quiet, romantic moments"
            : state.feeling === "family"
              ? "ease and shared time"
              : "real Portuguese moments";
  const paceWord =
    state.rhythm === "slow"
      ? "a slower rhythm"
      : state.rhythm === "immersive"
        ? "an unhurried, immersive day"
        : state.rhythm === "full"
          ? "a rich, full day"
          : "a thoughtful rhythm";
  const pickupCity =
    pickupLabel && state.pickup && state.pickup !== "other"
      ? pickupLabel
      : "your chosen starting point";

  const description = `A private day shaped around ${themeWord} and ${paceWord}. From ${pickupCity}, with real moments and no rush.`;

  const journeyTitle = state.journeyTitle ?? "Your private Portugal day";

  const moments = composePersonalizedMoments({
    feeling: state.feeling,
    rhythm: state.rhythm,
    interests: state.interests,
    considerations: state.considerations,
  });

  const suggestedRoute = composeSuggestedRoute({
    pickup: state.pickup,
    feeling: state.feeling,
    companions: state.companions,
    rhythm: state.rhythm,
  });

  return (
    <div
      className="relative w-full max-w-[640px] px-5 pb-12"
      style={{ animation: "studioV3RiseIn 620ms ease-out both" }}
    >
      <BackLink onClick={onBack} />

      {/* ---------- 1. Big title ---------- */}
      <header className="text-center pt-10">
        <h1
          className="text-[30px] sm:text-[38px] leading-[1.05] tracking-[-0.015em] font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
        >
          Your journey draft
        </h1>

        {/* Journey name */}
        <h2
          className="mt-3 text-[17px] sm:text-[20px] leading-[1.3] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
        >
          {journeyTitle}
        </h2>

        {/* Emotional paragraph */}
        <p
          className="mt-5 text-[14px] leading-[1.55] max-w-[480px] mx-auto"
          style={{ color: "color-mix(in oklab, var(--charcoal) 75%, transparent)" }}
        >
          {description}
        </p>
      </header>

      {/* ---------- 2. Suggested route ---------- */}
      <div className="mt-8 text-center">
        <p
          className="text-[11px] uppercase tracking-[0.26em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
        >
          <span style={{ color: "var(--gold)" }}>—</span> Suggested route
        </p>
        <p
          className="mt-2.5 text-[15px] leading-[1.55]"
          style={{
            fontFamily: "var(--font-serif)",
            color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
          }}
        >
          {suggestedRoute}
        </p>
      </div>

      {/* ---------- 3. Personalized moments (max 2) ---------- */}
      {moments.length > 0 ? (
        <div className="mt-8 text-center">
          <p
            className="text-[11px] uppercase tracking-[0.26em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
          >
            <span style={{ color: "var(--gold)" }}>—</span> Personalized moments
          </p>
          <ul className="mt-3 inline-block text-left space-y-1.5">
            {moments.slice(0, 2).map((m) => (
              <li
                key={m}
                className="flex gap-2.5 text-[13px] leading-[1.5]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
              >
                <span aria-hidden style={{ color: "var(--gold)" }}>—</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---------- 4. Before you secure it ---------- */}
      <div className="mt-8 text-center">
        <p
          className="text-[11.5px] leading-[1.6] italic"
          style={{
            fontFamily: "var(--font-serif)",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          Availability and final details are confirmed before your experience.
        </p>
        {inferredGuestsNote(state) ? (
          <p
            className="mt-2 text-[10.5px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 48%, transparent)" }}
          >
            <span style={{ color: "var(--gold)" }}>—</span> {inferredGuestsNote(state)}
          </p>
        ) : null}
      </div>

      {/* ---------- 5. CTA stack ---------- */}
      <div className="mt-12 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onSecure}
          className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
          aria-label="Secure this journey directly"
        >
          Secure this journey directly <ArrowRight size={14} aria-hidden />
        </button>

        <button
          type="button"
          onClick={onRefine}
          className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{
            color: "var(--charcoal)",
            background: "transparent",
            border: "1px solid color-mix(in oklab, var(--charcoal) 22%, transparent)",
          }}
          aria-label="Refine with YES first"
        >
          Refine with YES first
        </button>

        <a
          href={whatsappHref(
            `Hi YES — I just composed a journey in the Studio${
              state.journeyTitle ? ` ("${state.journeyTitle}")` : ""
            } and would like some help.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 min-h-[32px] text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)", background: "transparent" }}
          aria-label="Need help? Ask YES on WhatsApp"
        >
          <span aria-hidden style={{ color: "var(--gold)" }}>—</span>
          Need help? Ask YES
        </a>
      </div>

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
  onDismiss,
}: {
  reaction: Reaction;
  onDismiss: () => void;
}) {
  const hold = Math.min(reaction.holdMs ?? 2600, 3400);

  // Atmosphere beat — Creation Storytelling layer (Phase 1). Renders a
  // full-bleed image wash with a single italic line, no postcard chrome.
  if (reaction.kind === "atmosphere") {
    return (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Continue"
        key={`${reaction.eyebrow}-${reaction.message}`}
        className="fixed inset-0 z-40 flex items-center justify-center cursor-pointer focus:outline-none"
        style={{
          background: "var(--charcoal)",
          animation: `studioV3ReactionFade ${hold}ms ease-out both`,
        }}
      >
        <AtmosphereBeat
          imageSrc={reaction.bgImage}
          eyebrow={reaction.eyebrow}
          line={reaction.message}
        />
        <style>{`
          @keyframes studioV3ReactionFade {
            0% { opacity: 0; }
            10% { opacity: 1; }
            85% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </button>
    );
  }


  // Per-kind soft "postcard" gradient using brand tokens only.
  // No external imagery: warm scenic washes drawn from --ivory / --sand /
  // --gold-soft / --teal-2. Acts as the visual layer behind/above the copy.
  const postcardBg =
    reaction.kind === "feeling"
      ? "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 88%, transparent) 0%, color-mix(in oklab, var(--sand) 70%, transparent) 55%, color-mix(in oklab, var(--gold-soft, var(--gold)) 40%, transparent) 100%)"
      : reaction.kind === "pickup"
        ? "linear-gradient(135deg, color-mix(in oklab, var(--ivory) 92%, transparent) 0%, color-mix(in oklab, var(--teal-2, var(--teal)) 18%, transparent) 100%)"
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
      key={`${reaction.eyebrow}-${reaction.message}`}
      className="fixed inset-0 z-40 flex items-center justify-center px-6 cursor-pointer focus:outline-none"
      style={{
        background: "color-mix(in oklab, var(--ivory) 92%, transparent)",
        backdropFilter: "blur(2px)",
        animation: `studioV3ReactionFade ${hold}ms ease-out both`,
      }}
    >
      <div className="w-full max-w-[480px] text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
        >
          <span style={{ color: "var(--gold)" }}>—</span> {reaction.eyebrow}
        </p>

        {/* ---------- Map preview panel ---------- */}
        <MapPreviewPanel reaction={reaction} fallbackBg={postcardBg} />


        {/* ---------- Story copy ---------- */}
        <p
          className="mt-6 text-[20px] sm:text-[24px] leading-[1.3] italic whitespace-pre-line text-balance"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--charcoal)",
            animation: "studioV3RiseIn 620ms ease-out both",
            animationDelay: "160ms",
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
              animation: "studioV3RiseIn 640ms ease-out both",
              animationDelay: "260ms",
            }}
          >
            {reaction.postcardSubline}
          </p>
        ) : null}

        {reaction.detail ? (
          <p
            className="mt-3 text-[11px] uppercase tracking-[0.24em] font-semibold"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
              animation: "studioV3RiseIn 540ms ease-out both",
              animationDelay: "260ms",
            }}
          >
            <span style={{ color: "var(--gold)" }}>—</span> {reaction.detail}
          </p>
        ) : null}
      </div>

      <style>{`
        @keyframes studioV3ReactionFade {
          0% { opacity: 0; }
          8% { opacity: 1; }
          85% { opacity: 1; }
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
function MapPreviewPanel({
  reaction,
  fallbackBg,
}: {
  reaction: Reaction;
  fallbackBg: string;
}) {
  const isInterests =
    reaction.kind === "interests" && reaction.chips && reaction.chips.length > 0;
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
            maskImage:
              "radial-gradient(ellipse at center, black 55%, transparent 95%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 55%, transparent 95%)",
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
                    boxShadow:
                      "0 0 0 3px color-mix(in oklab, var(--teal) 14%, transparent)",
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
                    boxShadow:
                      "0 0 0 3px color-mix(in oklab, var(--teal) 12%, transparent)",
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


