/**
 * PathfinderQuiz — homepage 3-question gated quiz that routes the
 * visitor to the right product surface (Arrábida / Tróia / Sintra
 * Signature, Studio v2, or Bespoke). State is intentionally local
 * and resets on reload.
 *
 * Strict rules respected:
 * - No raw colors; only brand tokens.
 * - Mobile-first; respects prefers-reduced-motion.
 * - Copy is verbatim from spec; no invented prices or inclusions
 *   beyond the locked Pills strings.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

type Intent = "wine" | "coast" | "history" | "unique";
type Travellers = "couple" | "group" | "journey";
type Pace = "relaxed" | "active" | "mix";

type ResultKey = "ARRABIDA" | "TROIA" | "SINTRA" | "STUDIO" | "BESPOKE";

interface QuizState {
  intent: Intent | null;
  travellers: Travellers | null;
  pace: Pace | null;
}

const INITIAL: QuizState = { intent: null, travellers: null, pace: null };

function resolveResult(s: QuizState): ResultKey | null {
  if (!s.intent) return null;
  if (s.intent === "unique") return "STUDIO";
  if (!s.travellers) return null;
  if (s.travellers === "journey") return "BESPOKE";
  if (!s.pace) return null;

  // History → always Sintra unless family/group + active
  if (s.intent === "history") {
    if (s.travellers === "group" && s.pace === "active") return "STUDIO";
    return "SINTRA";
  }
  // Wine & food → Active = STUDIO, else ARRABIDA
  if (s.intent === "wine") {
    return s.pace === "active" ? "STUDIO" : "ARRABIDA";
  }
  // Coast & nature → Active = STUDIO, else TROIA
  if (s.intent === "coast") {
    return s.pace === "active" ? "STUDIO" : "TROIA";
  }
  return "STUDIO";
}

export function PathfinderQuiz() {
  const [state, setState] = useState<QuizState>(INITIAL);
  const result = useMemo(() => resolveResult(state), [state]);

  const showQ2 = state.intent !== null && state.intent !== "unique";
  const showQ3 = showQ2 && state.travellers !== null && state.travellers !== "journey";

  const reset = () => setState(INITIAL);

  return (
    <section aria-labelledby="pathfinder-title" className="pf-section">
      <style>{`
        .pf-section {
          background: var(--teal);
          color: var(--ivory);
          padding: 48px 0;
        }
        @media (min-width: 768px) {
          .pf-section { padding: 80px 0; }
        }
        .pf-eyebrow {
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .pf-title {
          font-family: Georgia, "Cormorant Garamond", "Playfair Display", serif;
          font-weight: 500;
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--ivory);
          margin-top: 12px;
        }
        @media (min-width: 768px) {
          .pf-title { font-size: 36px; }
        }
        .pf-sub {
          font-family: Inter, system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: color-mix(in srgb, var(--ivory) 80%, transparent);
          margin-top: 10px;
        }
        @media (min-width: 768px) {
          .pf-sub { font-size: 16px; }
        }
        .pf-qlabel {
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--ivory) 70%, transparent);
          margin-bottom: 14px;
          display: block;
        }
        .pf-qtitle {
          font-family: Georgia, "Cormorant Garamond", serif;
          font-style: italic;
          font-size: 20px;
          color: var(--ivory);
          margin-bottom: 16px;
          line-height: 1.3;
        }
        @media (min-width: 768px) {
          .pf-qtitle { font-size: 22px; }
        }
        .pf-btn {
          font-family: Inter, system-ui, sans-serif;
          font-size: 14px;
          color: var(--ivory);
          background: transparent;
          border: 1px solid color-mix(in srgb, var(--ivory) 40%, transparent);
          border-radius: 8px;
          padding: 14px 20px;
          cursor: pointer;
          transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
          text-align: center;
          line-height: 1.3;
        }
        .pf-btn:hover, .pf-btn:focus-visible {
          border-color: var(--gold);
          outline: none;
        }
        .pf-btn[aria-pressed="true"] {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--charcoal);
          font-weight: 600;
        }
        .pf-grid-22 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .pf-stack {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 768px) {
          .pf-stack { grid-template-columns: repeat(3, 1fr); }
        }
        .pf-step {
          animation: pfFade 250ms ease-out both;
        }
        @keyframes pfFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pf-result {
          margin-top: 32px;
          padding: 20px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--ivory) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
          animation: pfFadeUp 300ms ease-out both;
        }
        @media (min-width: 768px) {
          .pf-result { padding: 28px; }
        }
        @keyframes pfFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pf-rlabel {
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .pf-rtitle {
          font-family: Georgia, "Cormorant Garamond", serif;
          font-size: 22px;
          line-height: 1.3;
          color: var(--ivory);
          margin-top: 10px;
          font-weight: 500;
        }
        @media (min-width: 768px) {
          .pf-rtitle { font-size: 26px; }
        }
        .pf-rsub {
          font-family: Inter, system-ui, sans-serif;
          font-size: 14.5px;
          line-height: 1.6;
          color: color-mix(in srgb, var(--ivory) 80%, transparent);
          margin-top: 8px;
        }
        .pf-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 16px;
        }
        .pf-pill {
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          background: color-mix(in srgb, var(--gold) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
          padding: 4px 10px;
          border-radius: 999px;
        }
        .pf-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        .pf-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.04em;
          padding: 11px 18px;
          border-radius: 8px;
          text-decoration: none;
          transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
        }
        .pf-cta--primary {
          background: var(--teal);
          color: var(--ivory);
          border: 1px solid var(--ivory);
        }
        .pf-cta--primary:hover, .pf-cta--primary:focus-visible {
          background: var(--ivory);
          color: var(--teal);
          outline: none;
        }
        .pf-cta--gold {
          background: var(--gold);
          color: var(--charcoal);
          border: 1px solid var(--gold);
        }
        .pf-cta--gold:hover, .pf-cta--gold:focus-visible {
          background: transparent;
          color: var(--gold);
          outline: none;
        }
        .pf-cta--ivory {
          background: var(--ivory);
          color: var(--teal);
          border: 1px solid var(--ivory);
        }
        .pf-cta--ivory:hover, .pf-cta--ivory:focus-visible {
          background: transparent;
          color: var(--ivory);
          outline: none;
        }
        .pf-cta--outline {
          background: transparent;
          color: var(--gold);
          border: 1px solid var(--gold);
        }
        .pf-cta--outline:hover, .pf-cta--outline:focus-visible {
          background: var(--gold);
          color: var(--charcoal);
          outline: none;
        }
        .pf-reset {
          margin-top: 18px;
          background: transparent;
          border: none;
          color: color-mix(in srgb, var(--ivory) 50%, transparent);
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
        }
        .pf-reset:hover, .pf-reset:focus-visible {
          color: var(--ivory);
          text-decoration: underline;
          outline: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .pf-step, .pf-result, .pf-btn, .pf-cta { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="container-x">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <span className="pf-eyebrow">Not sure where to start?</span>
            <h2 id="pathfinder-title" className="pf-title">
              Answer three questions.
            </h2>
            <p className="pf-sub">We'll point you in the right direction.</p>
          </div>

          {/* Q1 — Intent */}
          <div className="mt-10 md:mt-12 pf-step">
            <span className="pf-qlabel">01</span>
            <p className="pf-qtitle">What kind of day do you want?</p>
            <div className="pf-grid-22">
              <QButton
                selected={state.intent === "wine"}
                onClick={() => setState({ intent: "wine", travellers: null, pace: null })}
              >
                Wine &amp; food
              </QButton>
              <QButton
                selected={state.intent === "coast"}
                onClick={() => setState({ intent: "coast", travellers: null, pace: null })}
              >
                Coast &amp; nature
              </QButton>
              <QButton
                selected={state.intent === "history"}
                onClick={() => setState({ intent: "history", travellers: null, pace: null })}
              >
                History &amp; culture
              </QButton>
              <QButton
                selected={state.intent === "unique"}
                onClick={() => setState({ intent: "unique", travellers: null, pace: null })}
              >
                Something unique
              </QButton>
            </div>
          </div>

          {/* Q2 — Travellers */}
          {showQ2 && (
            <div className="mt-8 pf-step">
              <span className="pf-qlabel">02</span>
              <p className="pf-qtitle">Who's travelling?</p>
              <div className="pf-stack">
                <QButton
                  selected={state.travellers === "couple"}
                  onClick={() => setState((s) => ({ ...s, travellers: "couple", pace: null }))}
                >
                  Just us two
                </QButton>
                <QButton
                  selected={state.travellers === "group"}
                  onClick={() => setState((s) => ({ ...s, travellers: "group", pace: null }))}
                >
                  Family or group
                </QButton>
                <QButton
                  selected={state.travellers === "journey"}
                  onClick={() => setState((s) => ({ ...s, travellers: "journey", pace: null }))}
                >
                  I want a full journey
                </QButton>
              </div>
            </div>
          )}

          {/* Q3 — Pace */}
          {showQ3 && (
            <div className="mt-8 pf-step">
              <span className="pf-qlabel">03</span>
              <p className="pf-qtitle">How do you like to move?</p>
              <div className="pf-stack">
                <QButton
                  selected={state.pace === "relaxed"}
                  onClick={() => setState((s) => ({ ...s, pace: "relaxed" }))}
                >
                  Relaxed &amp; slow
                </QButton>
                <QButton
                  selected={state.pace === "active"}
                  onClick={() => setState((s) => ({ ...s, pace: "active" }))}
                >
                  Active &amp; full
                </QButton>
                <QButton
                  selected={state.pace === "mix"}
                  onClick={() => setState((s) => ({ ...s, pace: "mix" }))}
                >
                  Mix of both
                </QButton>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <ResultCard key={result + JSON.stringify(state)} state={state} result={result} />
          )}

          {(state.intent || state.travellers || state.pace) && (
            <div className="text-center">
              <button type="button" className="pf-reset" onClick={reset}>
                Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function QButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="pf-btn" aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}

function ResultCard({ state, result }: { state: QuizState; result: ResultKey }) {
  const content = buildResultContent(state, result);
  return (
    <div className="pf-result" role="status" aria-live="polite">
      <div className="pf-rlabel">{content.label}</div>
      <p className="pf-rtitle">{content.title}</p>
      {content.subtitle && <p className="pf-rsub">{content.subtitle}</p>}
      <div className="pf-pills">
        {content.pills.map((p) => (
          <span key={p} className="pf-pill">
            {p}
          </span>
        ))}
      </div>
      <div className="pf-ctas">
        {content.ctas.map((c) => (
          <Link
            key={c.to + c.label}
            to={c.to}
            params={c.params as never}
            className={`pf-cta pf-cta--${c.variant}`}
          >
            {c.label}
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface ResultCta {
  label: string;
  to: string;
  params?: Record<string, string>;
  variant: "primary" | "gold" | "ivory" | "outline";
}

interface ResultContent {
  label: string;
  title: string;
  subtitle?: string;
  pills: string[];
  ctas: ResultCta[];
}

function buildResultContent(s: QuizState, r: ResultKey): ResultContent {
  if (r === "ARRABIDA") {
    const title = arrabidaTitle(s);
    return {
      label: "Signature day · Arrábida",
      title,
      pills: ["Wine", "Coast", "Private", "From €138"],
      ctas: [
        {
          label: "Reserve this day",
          to: "/tours/$tourId",
          search: { tourId: "arrabida-wine-allinclusive" },
          variant: "primary",
        },
        {
          label: "Make it yours",
          to: "/tours/$tourId/tailor",
          search: { tourId: "arrabida-wine-allinclusive" },
          variant: "outline",
        },
      ],
    };
  }
  if (r === "STUDIO") {
    return {
      label: "Experience Studio",
      title: "No exact match — let's build it.",
      subtitle: "Open the Studio and design your day in real time. Takes about 90 seconds.",
      pills: ["Custom", "Any mood", "Instant price"],
      ctas: [{ label: "Open Studio", to: "/studio-v3", variant: "gold" }],
    };
  }
  return {
    label: "Travel Designer",
    title: "Sounds like you want more than a day.",
    subtitle:
      "Let's plan your Portugal properly — multi-day, fully designed, every night confirmed.",
    pills: ["Multi-day", "Private", "Curated"],
    ctas: [{ label: "Start Planning", to: "/multi-day", variant: "ivory" }],
  };
}

function arrabidaTitle(s: QuizState): string {
  if (s.travellers === "couple" && s.pace === "relaxed") {
    return "A private day through boutique wineries, a local market and the sea at Sesimbra. Made for two.";
  }
  if (s.travellers === "couple" && s.pace === "mix") {
    return "The Arrábida all-inclusive fits you perfectly — wine, lunch, coast, at your pace.";
  }
  if (s.travellers === "group" && s.pace === "relaxed") {
    return "A private group day — wineries, market, traditional lunch, coast. Everyone wins.";
  }
  return "The Arrábida all-inclusive works for groups — private, full day, no decisions on the day.";
}

function troiaTitle(s: QuizState): string {
  if (s.travellers === "couple" && s.pace === "relaxed") {
    return "Dunes, cork forest, river ferry and the most peaceful coast near Lisbon. Perfect for two.";
  }
  if (s.travellers === "couple" && s.pace === "mix") {
    return "Tróia and Comporta — relaxed but never boring. A full day on the Atlantic.";
  }
  if (s.travellers === "group" && s.pace === "relaxed") {
    return "The easiest full-group day near Lisbon — ferry, beach, dunes, lunch. No stress.";
  }
  return "Private group, full coastal day. Tróia and Comporta deliver every time.";
}

function sintraTitle(s: QuizState): string {
  if (s.travellers === "couple" && s.pace === "relaxed") {
    return "Sintra's quieter side, Cabo da Roca, Cascais — private, at your pace, no tour buses.";
  }
  if (s.travellers === "couple" && s.pace === "active") {
    return "Sintra to Cabo da Roca on foot, then Cascais. The active version of Portugal's most iconic coast.";
  }
  if (s.travellers === "couple" && s.pace === "mix") {
    return "Palaces, cliffs, the westernmost point in Europe — and lunch with a view. Private, yours.";
  }
  if (s.travellers === "group" && s.pace === "relaxed") {
    return "A private group day through Sintra and Cascais — history without the crowds.";
  }
  return "Sintra, Cabo da Roca and Cascais for your group — private, unhurried, complete.";
}

export default PathfinderQuiz;
