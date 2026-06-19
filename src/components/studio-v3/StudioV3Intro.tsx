// Studio V3 — Opening intro.
//
// Three quiet screens:
//   1. Welcome — single line of intent + Begin
//   2. Name (optional) — input + Continue + Skip
//   3. Path — guided ("Construir contigo") vs fast ("Construir rápido")
//
// The Studio counts no progress here: this is mood-setting only. The name
// is stored in state and used lightly later (when present) to address the
// traveller — it never blocks the flow and never reaches the backend.

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import atmCoastal from "@/assets/studio/atm-coastal-cinematic.jpg";

interface Props {
  /** Called once the intro completes. */
  onComplete: (firstName: string | null, pathMode: "guided" | "fast") => void;
}

type IntroStep = "welcome" | "name" | "path";

const NAME_PATTERN = /[^A-Za-zÀ-ÿ' -]/g;

function sanitiseName(raw: string): string {
  return raw.replace(NAME_PATTERN, "").trim().slice(0, 32);
}

export function StudioV3Intro({ onComplete }: Props) {
  const [step, setStep] = useState<IntroStep>("welcome");
  const [value, setValue] = useState("");
  const [pendingName, setPendingName] = useState<string | null>(null);

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = sanitiseName(value);
    setPendingName(clean.length > 0 ? clean : null);
    setStep("path");
  };

  return (
    <main
      aria-label="Studio intro"
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{ background: "var(--charcoal)" }}
    >
      {/* Atmospheric still — reused asset, heavily darkened. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${atmCoastal})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.42,
          filter: "saturate(0.85)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--charcoal) 70%, transparent) 0%, color-mix(in oklab, var(--charcoal) 92%, transparent) 100%)",
        }}
      />
      {/* Hairline gold horizon. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[20%] h-px w-12 -translate-x-1/2"
        style={{ background: "var(--gold)" }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        {step === "welcome" ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-[700ms] motion-reduce:animate-none">
            <p
              className="text-[10.5px] uppercase font-bold"
              style={{ color: "var(--gold)", letterSpacing: "0.28em" }}
            >
              — Studio
            </p>
            <h2
              className="mt-5 text-[28px] sm:text-[34px] leading-[1.12] tracking-[-0.01em] font-bold"
              style={{
                fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
                color: "var(--ivory)",
              }}
            >
              Let's compose your{" "}
              <span
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "color-mix(in oklab, var(--gold) 90%, var(--ivory))",
                }}
              >
                Portugal day.
              </span>
            </h2>
            <p
              className="mt-5 text-[14px] leading-[1.6]"
              style={{
                color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
              }}
            >
              Not a form. A few quiet choices, and Portugal responds.
            </p>

            <button
              type="button"
              onClick={() => setStep("name")}
              className="mt-10 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-7 py-3 text-[11px] uppercase font-bold transition-colors hover:opacity-90"
              style={{
                background: "var(--ivory)",
                color: "var(--charcoal)",
                letterSpacing: "0.24em",
              }}
            >
              Begin
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        ) : step === "name" ? (
          <form
            onSubmit={handleNameSubmit}
            className="w-full animate-in fade-in slide-in-from-bottom-2 duration-[700ms] motion-reduce:animate-none"
          >
            <p
              className="text-[10.5px] uppercase font-bold"
              style={{ color: "var(--gold)", letterSpacing: "0.28em" }}
            >
              — Before we begin
            </p>
            <h2
              className="mt-5 text-[24px] sm:text-[30px] leading-[1.15] tracking-[-0.01em] font-bold"
              style={{
                fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
                color: "var(--ivory)",
              }}
            >
              What should we call{" "}
              <span
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "color-mix(in oklab, var(--gold) 90%, var(--ivory))",
                }}
              >
                you?
              </span>
            </h2>
            <p
              className="mt-3 text-[12.5px] leading-[1.6]"
              style={{ color: "color-mix(in oklab, var(--ivory) 70%, transparent)" }}
            >
              Optional. So the day feels addressed to you.
            </p>

            <input
              type="text"
              inputMode="text"
              autoComplete="given-name"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Your first name"
              maxLength={32}
              aria-label="Your first name (optional)"
              className="mt-7 w-full border-0 border-b bg-transparent py-3 text-center text-[20px] italic outline-none transition-colors"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                color: "var(--ivory)",
                borderColor: "color-mix(in oklab, var(--gold) 45%, transparent)",
              }}
            />

            <button
              type="submit"
              className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-7 py-3 text-[11px] uppercase font-bold transition-colors hover:opacity-90"
              style={{
                background: "var(--ivory)",
                color: "var(--charcoal)",
                letterSpacing: "0.24em",
              }}
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => {
                setPendingName(null);
                setStep("path");
              }}
              className="mt-4 inline-flex min-h-[40px] items-center justify-center px-3 text-[10.5px] uppercase font-semibold transition-colors hover:opacity-100"
              style={{
                color: "color-mix(in oklab, var(--ivory) 55%, transparent)",
                letterSpacing: "0.24em",
              }}
            >
              Skip
            </button>
          </form>
        ) : (
          <div
            data-testid="studio-v3-intro-path"
            className="w-full animate-in fade-in slide-in-from-bottom-2 duration-[700ms] motion-reduce:animate-none"
          >
            <p
              className="text-[10.5px] uppercase font-bold"
              style={{ color: "var(--gold)", letterSpacing: "0.28em" }}
            >
              — How would you like to compose it
            </p>
            <h2
              className="mt-5 text-[22px] sm:text-[28px] leading-[1.18] tracking-[-0.01em] font-bold"
              style={{
                fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
                color: "var(--ivory)",
              }}
            >
              {pendingName ? `${pendingName}, ` : ""}
              <span
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "color-mix(in oklab, var(--gold) 90%, var(--ivory))",
                }}
              >
                choose your pace.
              </span>
            </h2>

            <div className="mt-7 grid gap-3">
              <PathCard
                eyebrow="Guided"
                title="Compose it with us"
                whisper="A few quiet choices. About five minutes."
                onClick={() => onComplete(pendingName, "guided")}
                recommended
              />
              <PathCard
                eyebrow="Fast"
                title="Compose it quickly"
                whisper="Only the essentials. Under two minutes."
                onClick={() => onComplete(pendingName, "fast")}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PathCard({
  eyebrow,
  title,
  whisper,
  onClick,
  recommended,
}: {
  eyebrow: string;
  title: string;
  whisper: string;
  onClick: () => void;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full rounded-[10px] px-5 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{
        background: "color-mix(in oklab, var(--ivory) 6%, transparent)",
        border: `1px solid color-mix(in oklab, var(--gold) ${recommended ? 55 : 28}%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[10px] uppercase font-bold"
          style={{
            color: "var(--gold)",
            letterSpacing: "0.26em",
          }}
        >
          — {eyebrow}
        </p>
        {recommended ? (
          <span
            className="text-[9.5px] uppercase font-semibold"
            style={{
              color: "color-mix(in oklab, var(--ivory) 65%, transparent)",
              letterSpacing: "0.22em",
            }}
          >
            Recommended
          </span>
        ) : null}
      </div>
      <h3
        className="mt-2 text-[16px] sm:text-[18px] leading-[1.2] font-bold"
        style={{
          fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
          color: "var(--ivory)",
        }}
      >
        {title}
      </h3>
      <p
        className="mt-1.5 text-[12.5px] leading-[1.5]"
        style={{
          color: "color-mix(in oklab, var(--ivory) 70%, transparent)",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
        }}
      >
        {whisper}
      </p>
      <ArrowRight
        className="absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-transform group-hover:translate-x-0.5"
        strokeWidth={2.2}
        aria-hidden
        style={{ color: "var(--gold)" }}
      />
    </button>
  );
}
