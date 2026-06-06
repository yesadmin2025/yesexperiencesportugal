import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChoiceGrid } from "./ChoiceGrid";
import { PhaseShell } from "./PhaseShell";
import { MapAwakens } from "./MapAwakens";
import { composeJourneyTitle, getOptionLabel, getOptionLabels } from "./curation";
import { findTour } from "@/data/signatureTours";
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

/**
 * Reaction beat — a short cinematic punctuation shown between phases.
 * It overlays the next phase, holds for ~1.1s (or ~0.35s for
 * reduced-motion users) and then dissolves on its own. The user never
 * has to click through it. It exists to break the "form-feeling" by
 * acknowledging each choice before the next question appears.
 */
type Reaction = {
  eyebrow: string;
  message: string;
  /** Small detail line under the message (e.g. "From Lisbon"). */
  detail?: string | null;
  /** Optional chips rendered as journey pins (e.g. selected interests). */
  chips?: string[];
  /** Phase the user lands on once the beat dissolves. */
  nextPhase: StudioV3Phase;
  /** How long the beat holds before auto-dissolving. Capped at 2100ms. */
  holdMs?: number;
};


function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function StudioV3() {
  const [state, setState] = useState<StudioV3State>(INITIAL_STATE);
  const [exiting, setExiting] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);

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
    const hold = Math.min(r.holdMs ?? 1600, 2100);
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
  const onFeeling = (id: Feeling) =>
    pickAndAdvance("feeling", id, "who", {
      eyebrow: "The feeling",
      message: "Your journey is finding its atmosphere.",
      holdMs: 1600,
    });
  const onCompanions = (id: Companions) => pickAndAdvance("companions", id, "occasion");
  const onOccasion = (id: Occasion) => pickAndAdvance("occasion", id, "date");
  const onDate = (id: DateWindow) => pickAndAdvance("dateWindow", id, "pickup");
  const onPickup = (id: Pickup) => {
    const label = getOptionLabel(PICKUPS, id);
    pickAndAdvance("pickup", id, "guests", {
      eyebrow: "The beginning",
      message: "Your route now has a beginning.",
      detail: label ? `From ${label}` : null,
      holdMs: 1600,
      // TODO: Later phase — render a real map preview here once
      // BuilderMap is safe to lift above the existing Map phase.
    });
  };
  const onGuests = (id: GuestBucket) => pickAndAdvance("guests", id, "interests");
  const onRhythm = (id: Rhythm) => pickAndAdvance("rhythm", id, "considerations");
  const onLanguage = (id: Language) => pickAndAdvance("language", id, "investment");
  const onInvestment = (id: InvestmentTier) =>
    pickAndAdvance("investment", id, "map", {
      eyebrow: "The shape",
      message: "We'll keep the design transparent before anything is confirmed.",
      holdMs: 1600,
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
    const chips = state.interests
      .map((id) => getOptionLabel(INTERESTS, id))
      .filter((l): l is string => Boolean(l))
      .slice(0, 4);
    playReaction({
      eyebrow: "The moments",
      message: "These moments are becoming the heart of your journey.",
      chips: chips.length > 0 ? chips : undefined,
      nextPhase: "rhythm",
    });
  };
  const continueFromConsiderations = () => {
    const isNone =
      state.considerations.length === 0 || state.considerations.includes("none");
    playReaction({
      eyebrow: "The care",
      message: "Good experiences are designed around real people.",
      detail: isNone ? "Nothing to mention" : null,
      nextPhase: "language",
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

  return (
    <main aria-label="YES Studio">
      {state.phase === "feeling" ? (
        <PhaseShell accent="ivory" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <PhaseHeader
            eyebrow="The feeling"
            title="How would you like"
            titleAccent="Portugal to feel?"
          />
          <ChoiceGrid options={FEELINGS} value={state.feeling} onSelect={onFeeling} />
          <FooterHint>One choice. You can shape the rest later.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "who" ? (
        <PhaseShell accent="gold" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("feeling")} />
          <PhaseHeader eyebrow="The company" title="Who is" titleAccent="travelling?" />
          <ChoiceGrid options={COMPANIONS} value={state.companions} onSelect={onCompanions} />
          <FooterHint>This quietly shapes what we suggest next.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "occasion" ? (
        <PhaseShell accent="ivory" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("who")} />
          <PhaseHeader eyebrow="The occasion" title="Is there a" titleAccent="reason behind it?" />
          <ChoiceGrid options={OCCASIONS} value={state.occasion} onSelect={onOccasion} />
          <FooterHint>If yes, we'll quietly tilt the day towards it.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "date" ? (
        <PhaseShell accent="teal" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("occasion")} />
          <PhaseHeader eyebrow="The when" title="When should" titleAccent="this unfold?" />
          <ChoiceGrid options={DATE_WINDOWS} value={state.dateWindow} onSelect={onDate} columns={1} />
          <FooterHint>We'll confirm the exact date together later.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "pickup" ? (
        <PhaseShell accent="gold" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("date")} />
          <PhaseHeader eyebrow="The beginning" title="Where does" titleAccent="the day begin?" />
          <ChoiceGrid options={PICKUPS} value={state.pickup} onSelect={onPickup} columns={1} />
          <FooterHint>Pickup is included from the Lisbon region.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "guests" ? (
        <PhaseShell accent="ivory" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("pickup")} />
          <PhaseHeader eyebrow="The party" title="How many" titleAccent="guests?" />
          <ChoiceGrid options={GUEST_BUCKETS} value={state.guests} onSelect={onGuests} />
          <FooterHint>You can adjust the exact number with us later.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "interests" ? (
        <PhaseShell accent="teal" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("guests")} />
          <PhaseHeader eyebrow="The moments" title="What" titleAccent="pulls you in?" />
          <ChoiceGrid
            mode="multi"
            options={INTERESTS}
            values={state.interests}
            onToggle={toggleInterest}
          />
          <FooterHint>Choose the moments that matter most — usually two to four.</FooterHint>
          <ContinueCta
            disabled={state.interests.length < 1}
            onClick={continueFromInterests}
            label={state.interests.length < 1 ? "Choose at least one" : "Continue"}
          />

        </PhaseShell>
      ) : null}

      {state.phase === "rhythm" ? (
        <PhaseShell accent="gold" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("interests")} />
          <PhaseHeader
            eyebrow="The rhythm"
            title="How should the"
            titleAccent="day unfold?"
          />
          <ChoiceGrid options={RHYTHMS} value={state.rhythm} onSelect={onRhythm} columns={2} />
          <FooterHint>You can change pace at any stop.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "considerations" ? (
        <PhaseShell accent="ivory" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("rhythm")} />
          <PhaseHeader
            eyebrow="The care"
            title="Anything we should"
            titleAccent="hold for you?"
          />
          <ChoiceGrid
            mode="multi"
            options={CONSIDERATIONS}
            values={state.considerations}
            onToggle={toggleConsideration}
          />
          <FooterHint>Add anything we should know — or continue if there is nothing to mention.</FooterHint>
          <ContinueCta disabled={false} onClick={continueFromConsiderations} label="Continue" />
        </PhaseShell>
      ) : null}

      {state.phase === "language" ? (
        <PhaseShell accent="teal" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("considerations")} />
          <PhaseHeader eyebrow="The voice" title="Hosted in" titleAccent="which language?" />
          <ChoiceGrid options={LANGUAGES} value={state.language} onSelect={onLanguage} />
          <FooterHint>Your host will be fluent in your choice.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "investment" ? (
        <PhaseShell accent="gold" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <BackLink onClick={() => back("language")} />
          <PhaseHeader
            eyebrow="The comfort"
            title="How should we"
            titleAccent="shape the experience?"
          />
          <ChoiceGrid options={INVESTMENT_TIERS} value={state.investment} onSelect={onInvestment} />
          <FooterHint>Comfort level only — we'll share specifics together.</FooterHint>
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
        <PhaseShell accent="teal" exiting={exiting} step={step} totalSteps={TOTAL_STEPS}>
          <StoryboardHandoff state={state} onBack={() => back("map")} />
        </PhaseShell>
      ) : null}

      {reaction ? <ReactionOverlay reaction={reaction} /> : null}
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
}: {
  state: StudioV3State;
  onBack: () => void;
}) {
  const tour = state.tourId ? findTour(state.tourId) : undefined;

  // Human-readable labels for every captured choice.
  const feelingLabel = getOptionLabel(FEELINGS, state.feeling);
  const companionsLabel = getOptionLabel(COMPANIONS, state.companions);
  const occasionLabel =
    state.occasion && state.occasion !== "none"
      ? getOptionLabel(OCCASIONS, state.occasion)
      : "Just because";
  const dateLabel = getOptionLabel(DATE_WINDOWS, state.dateWindow, "Flexible");
  const pickupLabel = getOptionLabel(PICKUPS, state.pickup);
  const guestsLabel = getOptionLabel(GUEST_BUCKETS, state.guests, "To be refined with YES");
  const interestsLabel = getOptionLabels(INTERESTS, state.interests, "Open to suggestions");
  const rhythmLabel = getOptionLabel(RHYTHMS, state.rhythm);
  const considerationsLabel = state.considerations.includes("none")
    ? "Nothing to mention"
    : getOptionLabels(CONSIDERATIONS, state.considerations, "Nothing to mention");
  const languageLabel = getOptionLabel(LANGUAGES, state.language, "English");
  const investmentLabel = getOptionLabel(INVESTMENT_TIERS, state.investment, "Open to suggestions");

  // Emotional 2-sentence description, composed from real choices.
  const region = tour?.region ?? "Portugal";
  const themeWord =
    state.interests[0] === "wine" || state.feeling === "wine-food"
      ? "wine, local flavour"
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
  const description = `A private day shaped around ${themeWord} and ${paceWord}. Starting from ${pickupCity}, this journey brings together scenic moments, real local experiences and time to enjoy ${region} without rushing.`;

  const journeyTitle = state.journeyTitle ?? "Your private Portugal day";

  return (
    <div
      className="w-full max-w-[640px]"
      style={{ animation: "studioV3RiseIn 620ms ease-out both" }}
    >
      <BackLink onClick={onBack} />

      {/* ---------- Title block ---------- */}
      <header className="text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
        >
          <span style={{ color: "var(--gold)" }}>—</span> Your private journey
        </p>
        <h1
          className="mt-5 text-[28px] sm:text-[34px] leading-[1.08] tracking-[-0.012em] font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
        >
          {journeyTitle}
        </h1>
        <p
          className="mt-5 text-[14px] leading-[1.55] max-w-[520px] mx-auto"
          style={{ color: "color-mix(in oklab, var(--charcoal) 75%, transparent)" }}
        >
          {description}
        </p>
      </header>

      {/* ---------- Journey summary ---------- */}
      <section
        aria-label="Journey summary"
        className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 text-left"
      >
        <SummaryRow label="Feeling" value={feelingLabel} />
        <SummaryRow label="Travelling with" value={companionsLabel} />
        <SummaryRow label="Occasion" value={occasionLabel} />
        <SummaryRow label="When" value={dateLabel} />
        <SummaryRow label="Beginning" value={pickupLabel} />
        <SummaryRow label="Guests" value={guestsLabel} />
        <SummaryRow label="Moments" value={interestsLabel} />
        <SummaryRow label="Rhythm" value={rhythmLabel} />
        <SummaryRow label="Care notes" value={considerationsLabel} />
        <SummaryRow label="Hosted in" value={languageLabel} />
        <SummaryRow label="Experience comfort" value={investmentLabel} />
        {tour ? <SummaryRow label="Anchor region" value={tour.region} /> : null}
      </section>

      {/* ---------- What YES will refine ---------- */}
      <section
        aria-label="What YES will refine"
        className="mt-12 pt-8 border-t text-left"
        style={{ borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)" }}
      >
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
        >
          <span style={{ color: "var(--gold)" }}>—</span> What YES will refine with you
        </p>
        <p
          className="mt-4 text-[14px] leading-[1.6] italic"
          style={{
            fontFamily: "var(--font-serif)",
            color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
          }}
        >
          Your journey now has a shape. The YES team will refine the final details, confirm
          availability and make sure the day feels effortless before anything is locked.
        </p>
        <ul
          className="mt-5 space-y-2.5 text-[13.5px] leading-[1.55]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
        >
          {[
            "Exact availability and best timing",
            "Final route and partner availability",
            "Pickup details",
            "Dietary, comfort or mobility notes",
            "Final investment before confirmation",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden style={{ color: "var(--gold)" }}>
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Final CTA ---------- */}
      {/* TODO: Later phase — connect this CTA to contact / lead handoff. */}
      <div className="mt-12 text-center">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold opacity-80 cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
        >
          Refine this journey with YES <ArrowRight size={14} aria-hidden />
        </button>
        <p
          className="mt-3 text-[10.5px] uppercase tracking-[0.24em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
        >
          Contact and confirmation come next
        </p>
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
function ReactionOverlay({ reaction }: { reaction: Reaction }) {
  return (
    <div
      key={`${reaction.eyebrow}-${reaction.message}`}
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-40 flex items-center justify-center px-6 pointer-events-none"
      style={{
        background: "color-mix(in oklab, var(--ivory) 92%, transparent)",
        backdropFilter: "blur(2px)",
        animation: "studioV3ReactionFade 1100ms ease-out both",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[22%] h-px w-12 -translate-x-1/2"
        style={{ background: "var(--gold)" }}
      />
      <div className="max-w-[480px] text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
        >
          <span style={{ color: "var(--gold)" }}>—</span> {reaction.eyebrow}
        </p>
        <p
          className="mt-5 text-[20px] sm:text-[24px] leading-[1.25] italic"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--charcoal)",
            animation: "studioV3RiseIn 520ms ease-out both",
            animationDelay: "80ms",
          }}
        >
          {reaction.message}
        </p>
        {reaction.detail ? (
          <p
            className="mt-3 text-[11px] uppercase tracking-[0.24em] font-semibold"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
              animation: "studioV3RiseIn 540ms ease-out both",
              animationDelay: "180ms",
            }}
          >
            <span style={{ color: "var(--gold)" }}>—</span> {reaction.detail}
          </p>
        ) : null}
        {reaction.chips && reaction.chips.length > 0 ? (
          <ul
            className="mt-5 flex flex-wrap justify-center gap-2"
            style={{
              animation: "studioV3RiseIn 600ms ease-out both",
              animationDelay: "220ms",
            }}
          >
            {reaction.chips.map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] font-semibold"
                style={{
                  background: "var(--ivory)",
                  color: "var(--charcoal)",
                  border: "1px solid color-mix(in oklab, var(--charcoal) 14%, transparent)",
                  boxShadow: "0 8px 18px -14px rgba(46,46,46,0.22)",
                }}
              >
                <span aria-hidden style={{ color: "var(--gold)" }}>
                  ●
                </span>
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <style>{`
        @keyframes studioV3ReactionFade {
          0% { opacity: 0; }
          15% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

