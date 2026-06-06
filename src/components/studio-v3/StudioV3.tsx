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

export function StudioV3() {
  const [state, setState] = useState<StudioV3State>(INITIAL_STATE);
  const [exiting, setExiting] = useState(false);

  const advance = useCallback((next: StudioV3Phase) => {
    setExiting(true);
    window.setTimeout(() => {
      setState((s) => ({ ...s, phase: next }));
      setExiting(false);
    }, 380);
  }, []);

  const back = useCallback((prev: StudioV3Phase) => {
    setExiting(true);
    window.setTimeout(() => {
      setState((s) => ({ ...s, phase: prev }));
      setExiting(false);
    }, 280);
  }, []);

  // Single-select handlers — set field, then auto-advance.
  const pickAndAdvance = <K extends keyof StudioV3State>(
    key: K,
    value: StudioV3State[K],
    next: StudioV3Phase,
    delay = 520,
  ) => {
    setState((s) => ({ ...s, [key]: value }));
    window.setTimeout(() => advance(next), delay);
  };

  const onFeeling = (id: Feeling) => pickAndAdvance("feeling", id, "who");
  const onCompanions = (id: Companions) => pickAndAdvance("companions", id, "occasion");
  const onOccasion = (id: Occasion) => pickAndAdvance("occasion", id, "date");
  const onDate = (id: DateWindow) => pickAndAdvance("dateWindow", id, "pickup");
  const onPickup = (id: Pickup) => pickAndAdvance("pickup", id, "guests");
  const onGuests = (id: GuestBucket) => pickAndAdvance("guests", id, "interests");
  const onRhythm = (id: Rhythm) => pickAndAdvance("rhythm", id, "considerations", 620);
  const onLanguage = (id: Language) => pickAndAdvance("language", id, "investment");
  const onInvestment = (id: InvestmentTier) => pickAndAdvance("investment", id, "map");

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

  // Keyboard back — follows the full phase chain in reverse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const prev = prevPhase(state.phase);
      if (prev) back(prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, back]);

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
            onClick={() => advance("rhythm")}
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
          <ContinueCta disabled={false} onClick={() => advance("language")} label="Continue" />
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
  return (
    <div
      className="w-full max-w-[520px] text-center"
      style={{ animation: "studioV3RiseIn 620ms ease-out both" }}
    >
      <BackLink onClick={onBack} />
      <p
        className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
      >
        <span style={{ color: "var(--gold)" }}>—</span> Your journey, held
      </p>
      {state.journeyTitle ? (
        <p
          className="mt-4 text-[18px] sm:text-[20px] leading-[1.25] italic"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--teal)",
          }}
        >
          {state.journeyTitle}
        </p>
      ) : null}
      <h2
        className="mt-5 text-[26px] sm:text-[32px] leading-[1.1] tracking-[-0.012em] font-bold"
        style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
      >
        {tour?.region ?? "Portugal"} is{" "}
        <span
          className="italic font-normal"
          style={{ fontFamily: "var(--font-serif)", color: "var(--teal)" }}
        >
          waiting.
        </span>
      </h2>

      {tour ? (
        <p
          className="mt-5 text-[13px] leading-relaxed max-w-[420px] mx-auto"
          style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
        >
          {tour.blurb}
        </p>
      ) : null}

      {/* TODO: 1B — render Journey Summary block here listing every captured choice. */}

      <button
        type="button"
        disabled
        className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 text-[11px] uppercase tracking-[0.24em] font-semibold opacity-70 cursor-not-allowed"
        style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
      >
        Open the storyboard <ArrowRight size={14} aria-hidden />
      </button>
      <p
        className="mt-3 text-[10px] uppercase tracking-[0.24em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--charcoal) 45%, transparent)" }}
      >
        Storyboard composition · arriving next
      </p>
    </div>
  );
}
