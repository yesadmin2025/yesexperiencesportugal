// Studio V3 — Opening intro.
//
// Two quiet moments:
//   1. Welcome — editorial invitation + Begin
//   2. Name (optional) — guided by default, with a quiet quick-version escape hatch
//
// The Studio counts no progress here: this is mood-setting only. The name
// is stored in state and used lightly later (when present) to address the
// traveller — it never blocks the flow and never reaches the backend.

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import atmCoastal from "@/assets/studio/atm-coastal-cinematic.jpg";

interface Props {
  /** Called once the intro completes. */
  onComplete: (firstName: string | null, pathMode: "guided" | "fast") => void;
}

type IntroStep = "welcome" | "name";

const NAME_PATTERN = /[^A-Za-zÀ-ÿ' -]/g;

function sanitiseName(raw: string): string {
  return raw.replace(NAME_PATTERN, "").trim().slice(0, 32);
}

export function StudioV3Intro({ onComplete }: Props) {
  const [step, setStep] = useState<IntroStep>("welcome");
  const [value, setValue] = useState("");

  // Privacy-safe: fires once when the emotional opening paints. No payload.
  useEffect(() => {
    if (step !== "welcome") return;
    void import("@/lib/analytics-ga4").then((m) => m.gaStudioOpeningViewed());
  }, [step]);

  const currentName = (): string | null => {
    const clean = sanitiseName(value);
    return clean.length > 0 ? clean : null;
  };

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    onComplete(currentName(), "guided");
  };

  return (
    <main
      aria-label="Studio intro"
      data-testid="studio-v3-root"
      data-phase="intro"
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
              data-testid="studio-v3-intro-headline"
              className="mt-5 text-[28px] sm:text-[34px] leading-[1.12] tracking-[-0.01em] font-bold"
              style={{
                fontFamily: "var(--font-editorial)",
                color: "var(--ivory)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-editorial)",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "color-mix(in oklab, var(--gold) 90%, var(--ivory))",
                }}
              >
                Portugal
              </span>{" "}
              is the stage.
              <br />
              You write the story.
            </h2>
            <p
              className="mx-auto mt-5 max-w-[34ch] text-[13px] leading-[1.6]"
              style={{
                color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
                fontFamily: "var(--font-body)",
              }}
            >
              A few quiet choices, then we shape a private day around your pace, people and interests.
            </p>

            <button
              type="button"
              onClick={() => {
                void import("@/lib/analytics-ga4").then((m) => m.gaStudioStart());
                setStep("name");
              }}
              data-phase-cta="intro-begin"
              data-testid="studio-v3-intro-begin"
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
            onSubmit={handleNameSubmit}
            data-testid="studio-v3-intro-name"
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
                fontFamily: "var(--font-editorial)",
                color: "var(--ivory)",
              }}
            >
              What should we call{" "}
              <span
                style={{
                  fontFamily: "var(--font-editorial)",
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
                fontFamily: "var(--font-editorial)",
                color: "var(--ivory)",
                borderColor: "color-mix(in oklab, var(--gold) 45%, transparent)",
              }}
            />

            <button
              type="submit"
              data-phase-cta="intro-name"
              data-testid="studio-v3-intro-continue"
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
              onClick={() => onComplete(currentName(), "fast")}
              data-phase-cta="intro-fast"
              data-testid="studio-v3-intro-fast"
              className="mt-2 inline-flex min-h-[44px] items-center justify-center px-3 text-[11px] font-semibold transition-colors hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                color: "color-mix(in oklab, var(--ivory) 72%, transparent)",
                fontFamily: "var(--font-body)",
              }}
            >
              Use the quick version
            </button>

            <button
              type="button"
              onClick={() => onComplete(null, "guided")}
              data-testid="studio-v3-intro-skip"
              className="mt-1 inline-flex min-h-[44px] items-center justify-center px-3 text-[10.5px] uppercase font-semibold transition-colors hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                color: "color-mix(in oklab, var(--ivory) 52%, transparent)",
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
