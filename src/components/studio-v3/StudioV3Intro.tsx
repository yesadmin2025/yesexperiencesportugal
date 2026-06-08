// Studio V3 — Opening intro.
//
// A short premium opening shown before any Studio question. Two screens:
//   1. Welcome — single line of intent + Begin
//   2. Name (optional) — input + Continue + Skip
//
// The Studio counts no progress here: this is mood-setting only. The name
// is stored in state and used lightly later (when present) to address the
// traveller — it never blocks the flow and never reaches the backend.

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import atmCoastal from "@/assets/studio/atm-coastal-cinematic.jpg";

interface Props {
  /** Called once the intro completes. Pass null when the user skips. */
  onComplete: (firstName: string | null) => void;
}

type IntroStep = "welcome" | "name";

const NAME_PATTERN = /[^A-Za-zÀ-ÿ' -]/g;

function sanitiseName(raw: string): string {
  return raw.replace(NAME_PATTERN, "").trim().slice(0, 32);
}

export function StudioV3Intro({ onComplete }: Props) {
  const [step, setStep] = useState<IntroStep>("welcome");
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = sanitiseName(value);
    onComplete(clean.length > 0 ? clean : null);
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
            <h1
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
            </h1>
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
        ) : (
          <form
            onSubmit={handleSubmit}
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
              style={{
                color: "color-mix(in oklab, var(--ivory) 70%, transparent)",
              }}
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
              onClick={() => onComplete(null)}
              className="mt-4 inline-flex min-h-[40px] items-center justify-center px-3 text-[10.5px] uppercase font-semibold transition-colors hover:opacity-100"
              style={{
                color: "color-mix(in oklab, var(--ivory) 55%, transparent)",
                letterSpacing: "0.24em",
              }}
            >
              Skip
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
