import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { ChoiceGrid } from "./ChoiceGrid";
import { PhaseShell } from "./PhaseShell";
import {
  COMPANIONS,
  FEELINGS,
  INITIAL_STATE,
  RHYTHMS,
  type Companions,
  type Feeling,
  type Rhythm,
  type StudioV3State,
} from "./types";

/**
 * StudioV3 — Cinematic Journey Composer (Phases 1–3 scaffold).
 *
 * Three sequential beats:
 *   1. Feeling — "How would you like Portugal to feel?"
 *   2. Who     — "Who is travelling?"
 *   3. Rhythm  — "How should the day unfold?"
 *
 * Each beat is one decision on a quiet, full-bleed ivory stage. The
 * orchestrator handles crossfades between phases (~360ms exit, ~480ms
 * enter) so the journey feels like one continuous reveal, not a wizard.
 *
 * Phase 4+ (Map Awakens, Curation, Storyboard, Signature, Booking) ship
 * in follow-up turns. For now we render a quiet handoff card when the
 * trilogy completes.
 */
export function StudioV3() {
  const [state, setState] = useState<StudioV3State>(INITIAL_STATE);
  const [exiting, setExiting] = useState(false);

  const advance = useCallback((next: StudioV3State["phase"]) => {
    setExiting(true);
    window.setTimeout(() => {
      setState((s) => ({ ...s, phase: next }));
      setExiting(false);
    }, 380);
  }, []);

  const back = useCallback((prev: StudioV3State["phase"]) => {
    setExiting(true);
    window.setTimeout(() => {
      setState((s) => ({ ...s, phase: prev }));
      setExiting(false);
    }, 280);
  }, []);

  const onFeeling = (id: Feeling) => {
    setState((s) => ({ ...s, feeling: id }));
    // Give the selection a beat to register before advancing.
    window.setTimeout(() => advance("who"), 520);
  };
  const onCompanions = (id: Companions) => {
    setState((s) => ({ ...s, companions: id }));
    window.setTimeout(() => advance("rhythm"), 520);
  };
  const onRhythm = (id: Rhythm) => {
    setState((s) => ({ ...s, rhythm: id }));
    window.setTimeout(() => advance("map"), 620);
  };

  // Keyboard back for desktop users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (state.phase === "who") back("feeling");
      else if (state.phase === "rhythm") back("who");
      else if (state.phase === "map") back("rhythm");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, back]);

  return (
    <main aria-label="YES Studio">
      {state.phase === "feeling" ? (
        <PhaseShell accent="ivory" exiting={exiting} step={1} totalSteps={3}>
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
        <PhaseShell accent="gold" exiting={exiting} step={2} totalSteps={3}>
          <BackLink onClick={() => back("feeling")} />
          <PhaseHeader eyebrow="The company" title="Who is" titleAccent="travelling?" />
          <ChoiceGrid options={COMPANIONS} value={state.companions} onSelect={onCompanions} />
          <FooterHint>This quietly shapes what we suggest next.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "rhythm" ? (
        <PhaseShell accent="teal" exiting={exiting} step={3} totalSteps={3}>
          <BackLink onClick={() => back("who")} />
          <PhaseHeader
            eyebrow="The rhythm"
            title="How should the"
            titleAccent="day unfold?"
          />
          <ChoiceGrid options={RHYTHMS} value={state.rhythm} onSelect={onRhythm} columns={2} />
          <FooterHint>You can change pace at any stop.</FooterHint>
        </PhaseShell>
      ) : null}

      {state.phase === "map" ? (
        <PhaseShell accent="teal" exiting={exiting}>
          <Handoff state={state} onBack={() => back("rhythm")} />
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

function Handoff({ state, onBack }: { state: StudioV3State; onBack: () => void }) {
  const feeling = FEELINGS.find((f) => f.id === state.feeling);
  const who = COMPANIONS.find((c) => c.id === state.companions);
  const rhythm = RHYTHMS.find((r) => r.id === state.rhythm);
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
        <span style={{ color: "var(--gold)" }}>—</span> The map awakens
      </p>
      <h2
        className="mt-5 text-[26px] sm:text-[32px] leading-[1.1] tracking-[-0.012em] font-bold"
        style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
      >
        Portugal is{" "}
        <span
          className="italic font-normal"
          style={{ fontFamily: "var(--font-serif)", color: "var(--teal)" }}
        >
          listening.
        </span>
      </h2>

      <dl className="mt-8 mx-auto inline-block text-left">
        <Row term="Feeling" value={feeling?.label ?? "—"} />
        <Row term="Company" value={who?.label ?? "—"} />
        <Row term="Rhythm" value={rhythm?.label ?? "—"} />
      </dl>

      <p
        className="mt-8 text-[13px] leading-relaxed max-w-[380px] mx-auto"
        style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
      >
        Next, the coastline draws itself and stops begin to appear — one by one,
        each with its own light and story.
      </p>

      <button
        type="button"
        disabled
        className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 text-[11px] uppercase tracking-[0.24em] font-semibold opacity-70 cursor-not-allowed"
        style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
      >
        Reveal the map <ArrowRight size={14} aria-hidden />
      </button>
      <p
        className="mt-3 text-[10px] uppercase tracking-[0.24em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--charcoal) 45%, transparent)" }}
      >
        Map composition · arriving next
      </p>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4 py-1.5">
      <dt
        className="text-[10px] uppercase tracking-[0.24em] font-semibold min-w-[64px]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
      >
        {term}
      </dt>
      <dd
        className="text-[14px] font-medium"
        style={{ fontFamily: "var(--font-display)", color: "var(--charcoal)" }}
      >
        {value}
      </dd>
    </div>
  );
}
