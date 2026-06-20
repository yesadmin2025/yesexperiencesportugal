/**
 * SensePairScene — Scene II grammar.
 *
 * Two tactile metaphors as side-by-side cards. Sensory verb, no question
 * framing. The traveller picks the texture that "feels true". One tap.
 */

import { useEffect, useRef, useState } from "react";
import type { MoodScene, SceneSignal } from "@/lib/studio-v2/intent-infer";

interface Props {
  scene: MoodScene;
  index: number;
  onSignal: (sig: SceneSignal) => void;
}

const ROMAN = ["I", "II", "III", "IV"];

// Map each fragment id to a sensory metaphor pair. Keeps the scene editorial
// even when the underlying signal axis is mood/intimacy/pace. Never invents
// places — pure atmosphere.
const SENSORY: Record<string, { verb: string; hint: string }> = {
  // scene-table-vs-view
  "long-table": { verb: "Linen warmed by sun.", hint: "the table that holds the afternoon" },
  "open-horizon": { verb: "Wind on an empty road.", hint: "the silence between two villages" },
  // scene-coast-vs-stone
  "atlantic-edge": { verb: "Salt drying on skin.", hint: "the cliff at five in the afternoon" },
  "quiet-stone": { verb: "Cool stone under the palm.", hint: "a corridor that holds its breath" },
  // scene-two-vs-many
  "two-at-dusk": { verb: "Two glasses, one bottle.", hint: "the hour that belongs to no one else" },
  "raised-glasses": { verb: "Glasses meeting in soft light.", hint: "the day that lifts the room" },
  // optional clarifier fragments
  "morning-light": { verb: "First light on a closed shutter.", hint: "an unhurried beginning" },
  "late-shadow": { verb: "Long shadows on warm tile.", hint: "the evening, taken slowly" },
};

export function SensePairScene({ scene, index, onSignal }: Props) {
  const [a, b] = scene.fragments;
  const enteredAt = useRef<number>(Date.now());
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    enteredAt.current = Date.now();
    setChosen(null);
  }, [scene.id]);

  const choose = (which: "a" | "b") => {
    if (chosen) return;
    const frag = which === "a" ? a : b;
    setChosen(frag.id);
    // Tiny pause for the chosen state to read, then advance.
    window.setTimeout(() => {
      onSignal({
        sceneId: scene.id,
        tappedFragmentId: frag.id,
        lingerMs: Date.now() - enteredAt.current,
      });
    }, 280);
  };

  const senseA = SENSORY[a.id] ?? { verb: a.whisper, hint: "" };
  const senseB = SENSORY[b.id] ?? { verb: b.whisper, hint: "" };

  return (
    <section
      key={scene.id}
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-[640px] flex-col px-5 pb-16 pt-14 sm:px-8"
      aria-label={scene.eyebrow}
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      <div
        className="mx-auto flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.32em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
      >
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
        Chapter {ROMAN[index - 1] ?? index} · {scene.eyebrow}
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
      </div>

      <p
        className="mx-auto mt-10 max-w-[28ch] text-center text-[19px] leading-[1.3] sm:text-[22px]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
      >
        Which one is closer to true?
      </p>

      <div className="mt-10 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { key: "a" as const, frag: a, sense: senseA },
          { key: "b" as const, frag: b, sense: senseB },
        ].map(({ key, frag, sense }) => {
          const isChosen = chosen === frag.id;
          const isDimmed = chosen && !isChosen;
          return (
            <button
              key={frag.id}
              type="button"
              onClick={() => choose(key)}
              aria-label={`Choose: ${sense.verb}`}
              className="group relative flex flex-col overflow-hidden rounded-[2px] border text-left transition-[transform,opacity,border-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                borderColor: isChosen
                  ? "var(--gold)"
                  : "color-mix(in oklab, var(--charcoal) 16%, transparent)",
                opacity: isDimmed ? 0.42 : 1,
                transform: isChosen ? "translateY(-2px)" : "translateY(0)",
                background: "color-mix(in oklab, var(--sand) 35%, transparent)",
              }}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <img
                  src={frag.image}
                  alt={frag.alt}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.03]"
                  style={{ filter: "saturate(0.92)" }}
                />
              </div>
              <div className="px-4 py-4 sm:py-5">
                <p
                  className="text-[15px] leading-[1.3] sm:text-[16px]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
                >
                  {sense.verb}
                </p>
                {sense.hint && (
                  <p
                    className="mt-1.5 text-[11px] uppercase tracking-[0.22em]"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                  >
                    {sense.hint}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
