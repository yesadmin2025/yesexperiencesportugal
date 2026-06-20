import { useEffect, useMemo, useRef, useState } from "react";
import { MOOD_SCENES, type SceneSignal } from "@/lib/studio-v2/intent-infer";

interface FeelingSceneProps {
  /** Fires with the chosen fragment + linger time, then the host advances. */
  onSignal: (signal: SceneSignal) => void;
}

/**
 * Phase 1 — FEELING.
 * Six emotion cards over real Portugal footage. No place names, no questions.
 * Single tap commits and advances. Mobile-first: one column ≤480px, two above.
 */
export function FeelingScene({ onSignal }: FeelingSceneProps) {
  const scene = useMemo(() => MOOD_SCENES.find((s) => s.id === "scene-feeling")!, []);
  const mountedAt = useRef<number>(Date.now());
  const [entered, setEntered] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  const choose = (fragmentId: string) => {
    if (picked) return;
    setPicked(fragmentId);
    const lingerMs = Date.now() - mountedAt.current;
    // Brief tactile beat before handoff so the choice feels acknowledged.
    window.setTimeout(() => {
      onSignal({ sceneId: scene.id, tappedFragmentId: fragmentId, lingerMs });
    }, 220);
  };

  return (
    <section
      aria-label="Choose the feeling"
      className="relative z-10 mx-auto w-full max-w-[var(--editorial-max,72rem)] px-5 pb-12 pt-10 sm:px-8"
    >
      <p
        className={[
          "mb-6 text-center text-[11px] uppercase tracking-[0.32em] text-[var(--charcoal-soft,#6b6b6b)]",
          "transition-all duration-[700ms] ease-out",
          entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        ].join(" ")}
      >
        {scene.eyebrow}
      </p>
      <h2
        className={[
          "mb-8 text-center font-display text-[24px] font-bold leading-tight tracking-tight text-[var(--charcoal,#2E2E2E)] sm:text-[30px]",
          "transition-all duration-[800ms] ease-out",
          entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
      >
        Where does your <em className="font-serif italic font-normal">Portugal</em> begin?
      </h2>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {scene.fragments.map((f, i) => {
          const isPicked = picked === f.id;
          const isDimmed = !!picked && !isPicked;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => choose(f.id)}
                aria-pressed={isPicked}
                disabled={!!picked && !isPicked}
                className={[
                  "group relative block aspect-[4/5] w-full overflow-hidden rounded-[6px] text-left",
                  "ring-1 ring-[var(--charcoal,#2E2E2E)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold,#C9A96A)]",
                  "transition-[opacity,transform] duration-[600ms] ease-out",
                  entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  isDimmed ? "opacity-30" : "",
                  isPicked ? "ring-2 ring-[var(--gold,#C9A96A)]" : "",
                ].join(" ")}
                style={{ transitionDelay: entered ? `${80 + i * 90}ms` : "0ms" }}
              >
                <img
                  src={f.image}
                  alt={f.alt}
                  loading={i < 2 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent"
                />
                <span className="absolute inset-x-4 bottom-4 block font-display text-[17px] font-semibold leading-tight tracking-tight text-[var(--ivory,#FAF8F3)] sm:text-[19px]">
                  {f.whisper}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
