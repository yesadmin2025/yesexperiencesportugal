/**
 * DriftScene — Scene I grammar.
 *
 * Single full-bleed atmosphere. The traveller drifts to one side of the
 * frame. Two soft "pull zones" capture the signal; linger time tracks dwell.
 * Tactile, no question framing, no buttons-as-cards. Bible: rhythm > features,
 * guided not asked.
 */

import { useEffect, useRef, useState } from "react";
import type { MoodScene } from "@/lib/studio-v2/intent-infer";
import type { SceneSignal } from "@/lib/studio-v2/intent-infer";

interface Props {
  scene: MoodScene;
  index: number;          // 1-based scene number for chapter eyebrow
  onSignal: (sig: SceneSignal) => void;
}

const ROMAN = ["I", "II", "III", "IV"];

export function DriftScene({ scene, index, onSignal }: Props) {
  const [left, right] = scene.fragments;
  const enteredAt = useRef<number>(Date.now());
  const [hovered, setHovered] = useState<"left" | "right" | null>(null);

  useEffect(() => { enteredAt.current = Date.now(); }, [scene.id]);

  const choose = (which: "left" | "right") => {
    const frag = which === "left" ? left : right;
    onSignal({
      sceneId: scene.id,
      tappedFragmentId: frag.id,
      lingerMs: Date.now() - enteredAt.current,
    });
  };

  return (
    <section
      key={scene.id}
      className="relative min-h-[100dvh] w-full overflow-hidden"
      aria-label={scene.eyebrow}
      style={{ background: "var(--charcoal)" }}
    >
      {/* Two atmosphere panels — drift the eye left or right. */}
      <div className="absolute inset-0 grid grid-cols-2">
        <button
          type="button"
          aria-label={left.alt}
          onMouseEnter={() => setHovered("left")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => setHovered("left")}
          onClick={() => choose("left")}
          className="relative block h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        >
          <img
            src={left.image}
            alt={left.alt}
            className="absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-[700ms] ease-out"
            style={{
              transform: hovered === "left" ? "scale(1.04)" : "scale(1.0)",
              filter: hovered === "right" ? "brightness(0.55) saturate(0.85)" : "brightness(0.88)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, color-mix(in oklab, var(--charcoal) 18%, transparent), transparent 60%)",
            }}
          />
        </button>
        <button
          type="button"
          aria-label={right.alt}
          onMouseEnter={() => setHovered("right")}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => setHovered("right")}
          onClick={() => choose("right")}
          className="relative block h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        >
          <img
            src={right.image}
            alt={right.alt}
            className="absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-[700ms] ease-out"
            style={{
              transform: hovered === "right" ? "scale(1.04)" : "scale(1.0)",
              filter: hovered === "left" ? "brightness(0.55) saturate(0.85)" : "brightness(0.88)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to left, color-mix(in oklab, var(--charcoal) 18%, transparent), transparent 60%)",
            }}
          />
        </button>
      </div>

      {/* Subtle vertical seam — never a hard divider. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px"
        style={{ background: "color-mix(in oklab, var(--ivory) 22%, transparent)" }}
      />

      {/* Top eyebrow */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-center gap-3 px-5 pt-7 text-[10.5px] font-bold uppercase tracking-[0.32em]"
        style={{ color: "color-mix(in oklab, var(--ivory) 88%, transparent)" }}
      >
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
        Chapter {ROMAN[index - 1] ?? index} · {scene.eyebrow}
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
      </div>

      {/* Whispers float at the bottom — show only the hovered side, or both subtly. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-3 px-5 pb-14 sm:pb-20">
        <p
          className="text-[15px] leading-[1.3] sm:text-[17px] transition-opacity duration-300"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "var(--ivory)",
            opacity: hovered === "right" ? 0.35 : 1,
            textShadow: "0 1px 12px rgba(0,0,0,0.55)",
          }}
        >
          {left.whisper}
        </p>
        <p
          className="text-right text-[15px] leading-[1.3] sm:text-[17px] transition-opacity duration-300"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "var(--ivory)",
            opacity: hovered === "left" ? 0.35 : 1,
            textShadow: "0 1px 12px rgba(0,0,0,0.55)",
          }}
        >
          {right.whisper}
        </p>
      </div>

      {/* Soft hint at the very bottom */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[9.5px] uppercase tracking-[0.36em]"
        style={{ color: "color-mix(in oklab, var(--ivory) 55%, transparent)" }}
      >
        Drift toward one
      </div>
    </section>
  );
}
