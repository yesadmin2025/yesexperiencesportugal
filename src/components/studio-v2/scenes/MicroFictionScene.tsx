/**
 * MicroFictionScene — Scene III grammar.
 *
 * A single italic sentence with two possible endings. The traveller finishes
 * the scene. Captures register/intimacy through narrative completion, not
 * through a filter.
 */

import { useEffect, useRef, useState } from "react";
import type { MoodScene, SceneSignal } from "@/lib/studio-v2/intent-infer";
import type { IntentAtmosphere } from "@/lib/studio-v2/profile";
import { getMoodTint } from "@/lib/studio-v2/mood-tint";

interface Props {
  scene: MoodScene;
  index: number;
  onSignal: (sig: SceneSignal) => void;
  /** Dominant atmosphere inferred so far — drives the soft backdrop tint. */
  topIntent?: IntentAtmosphere | null;
}

const ROMAN = ["I", "II", "III", "IV"];

// Per-scene opening sentence (real Portugal, no place names invented).
// Falls back to a neutral opener if the scene id is unknown.
const OPENERS: Record<string, string> = {
  "scene-table-vs-view": "The afternoon stretches, and we…",
  "scene-coast-vs-stone": "The light shifts at five, and we…",
  "scene-two-vs-many":    "The table is set, and then…",
  // adaptive clarifier
  "scene-pace-clarify":   "The morning is ours, and we…",
};

// Per-fragment ending — must read as a natural continuation of the opener.
const ENDINGS: Record<string, string> = {
  "long-table":     "…stay at the table until the bottle is empty.",
  "open-horizon":   "…take the road that has no destination.",
  "atlantic-edge":  "…follow the wind out to the cliff.",
  "quiet-stone":    "…disappear into a cool, quiet room.",
  "two-at-dusk":    "…stay just the two of us, all evening.",
  "raised-glasses": "…fill the room with people we love.",
  "morning-light":  "…sit with coffee until the bells.",
  "late-shadow":    "…push lunch toward the long shadows.",
};

export function MicroFictionScene({ scene, index, onSignal, topIntent }: Props) {
  const [a, b] = scene.fragments;
  const enteredAt = useRef<number>(Date.now());
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => { enteredAt.current = Date.now(); setChosen(null); }, [scene.id]);

  const opener = OPENERS[scene.id] ?? "The day opens, and we…";
  const endA = ENDINGS[a.id] ?? a.whisper;
  const endB = ENDINGS[b.id] ?? b.whisper;

  // Tint resolves from the dominant inferred intent so far; if a choice is
  // being made, lean into the just-tapped fragment's intent for an immediate
  // emotional response before the engine reruns inference.
  const tappedFrag = chosen ? scene.fragments.find((f) => f.id === chosen) : null;
  const tint = getMoodTint(tappedFrag?.intent ?? topIntent ?? null);

  const choose = (fragId: string) => {
    if (chosen) return;
    setChosen(fragId);
    window.setTimeout(() => {
      onSignal({
        sceneId: scene.id,
        tappedFragmentId: fragId,
        lingerMs: Date.now() - enteredAt.current,
      });
    }, 700); // longer pause — let the chosen ending land
  };

  return (
    <section
      key={scene.id}
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-[640px] flex-col px-5 pb-16 pt-14 sm:px-8"
      aria-label={scene.eyebrow}
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      {/* Soft atmospheric backdrop — shifts with the dominant intent. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          key={tint.image}
          src={tint.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1100ms] ease-out"
          style={{ opacity: tint.imageOpacity, filter: "saturate(0.85) blur(1px)" }}
        />
        <div
          className="absolute inset-0 transition-[background] duration-[1100ms] ease-out"
          style={{ background: tint.tintHex, opacity: tint.tintOpacity }}
        />
        {/* Ivory veil keeps body legible; vignette pushes focus to centre. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 50%, color-mix(in oklab, var(--ivory) 55%, transparent) 0%, color-mix(in oklab, var(--ivory) 85%, transparent) 70%, var(--ivory) 100%)",
          }}
        />
      </div>

      <div
        className="relative z-10 mx-auto flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.32em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
      >
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
        Chapter {ROMAN[index - 1] ?? index} · {scene.eyebrow}
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
      </div>


      <div className="relative z-10 mx-auto mt-14 max-w-[34ch] flex-1">
        <p
          className="text-[22px] leading-[1.28] sm:text-[26px]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
        >
          {opener}
        </p>

        <div className="mt-10 space-y-3">
          {[
            { id: a.id, text: endA },
            { id: b.id, text: endB },
          ].map(({ id, text }) => {
            const isChosen = chosen === id;
            const isDimmed = chosen && !isChosen;
            return (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                className="group block w-full rounded-[2px] border px-4 py-4 text-left transition-[opacity,border-color,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{
                  borderColor: isChosen
                    ? "var(--gold)"
                    : "color-mix(in oklab, var(--charcoal) 14%, transparent)",
                  opacity: isDimmed ? 0.4 : 1,
                  transform: isChosen ? "translateY(-2px)" : "translateY(0)",
                  background: isChosen
                    ? "color-mix(in oklab, var(--sand) 55%, transparent)"
                    : "transparent",
                }}
              >
                <p
                  className="text-[17px] leading-[1.32] sm:text-[18px]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
                >
                  {text}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <p
        className="mx-auto mt-6 text-center text-[9.5px] uppercase tracking-[0.36em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
      >
        Finish the sentence
      </p>
    </section>
  );
}
