import { useEffect, useRef, useState } from "react";
import { INTENT_IMAGE, INTENT_IMAGE_ALT } from "@/lib/studio-v2/images";
import type { SceneSignal } from "@/lib/studio-v2/intent-infer";

/**
 * Phase 2 — WHO & RHYTHM.
 *
 * Two-stage visual diptych. No form fields, no sliders.
 *   Stage A · WHO    → solo | couple | friends | family   (sets pax)
 *   Stage B · RHYTHM → slow | relaxed | adventurous | discovery
 *                      (emits a SceneSignal that nudges pace + priorities)
 *
 * Cards are real photography; one tap commits each stage. Mirrors the
 * grammar of FeelingScene so the journey reads as one continuous gesture.
 */

export type WhoKey = "solo" | "couple" | "friends" | "family";

interface WhoCard {
  id: WhoKey;
  label: string;
  hint: string;
  image: string;
  alt: string;
  pax: number;
}

interface RhythmCard {
  id: string;
  label: string;
  hint: string;
  image: string;
  alt: string;
}

const WHO: WhoCard[] = [
  {
    id: "couple",
    label: "Two of us",
    hint: "a private rhythm, just the two",
    image: INTENT_IMAGE_ALT.romantic_intimate.src,
    alt: INTENT_IMAGE_ALT.romantic_intimate.alt,
    pax: 2,
  },
  {
    id: "solo",
    label: "Just me",
    hint: "the day, unhurried, on my own",
    image: INTENT_IMAGE.relaxed_scenic.src,
    alt: INTENT_IMAGE.relaxed_scenic.alt,
    pax: 1,
  },
  {
    id: "friends",
    label: "A small circle",
    hint: "a few of us, raised glasses",
    image: INTENT_IMAGE.social_celebratory.src,
    alt: INTENT_IMAGE.social_celebratory.alt,
    pax: 4,
  },
  {
    id: "family",
    label: "Family",
    hint: "a long table, everyone in",
    image: INTENT_IMAGE.food_local.src,
    alt: INTENT_IMAGE.food_local.alt,
    pax: 4,
  },
];

const RHYTHM: RhythmCard[] = [
  {
    id: "rhythm-slow",
    label: "Slow",
    hint: "few things, savoured",
    image: INTENT_IMAGE.elegant_cultural.src,
    alt: INTENT_IMAGE.elegant_cultural.alt,
  },
  {
    id: "rhythm-relaxed",
    label: "Relaxed",
    hint: "an unhurried, open day",
    image: INTENT_IMAGE.relaxed_scenic.src,
    alt: INTENT_IMAGE.relaxed_scenic.alt,
  },
  {
    id: "rhythm-discovery",
    label: "Discovery",
    hint: "stories, depth, layers",
    image: INTENT_IMAGE.elegant_cultural.src,
    alt: INTENT_IMAGE.elegant_cultural.alt,
  },
  {
    id: "rhythm-adventurous",
    label: "Adventurous",
    hint: "coast, edges, motion",
    image: INTENT_IMAGE.coastal_cinematic.src,
    alt: INTENT_IMAGE.coastal_cinematic.alt,
  },
];

const SCENE_ID = "scene-who-rhythm";

interface Props {
  /** Called once both WHO and RHYTHM are chosen. */
  onComplete: (out: { pax: number; who: WhoKey; signal: SceneSignal }) => void;
}

export function WhoRhythmScene({ onComplete }: Props) {
  const [stage, setStage] = useState<"who" | "rhythm">("who");
  const [who, setWho] = useState<WhoCard | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const stageEnteredAt = useRef(Date.now());

  useEffect(() => {
    setEntered(false);
    stageEnteredAt.current = Date.now();
    const t = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(t);
  }, [stage]);

  const chooseWho = (card: WhoCard) => {
    if (picked) return;
    setPicked(card.id);
    window.setTimeout(() => {
      setWho(card);
      setPicked(null);
      setStage("rhythm");
    }, 260);
  };

  const chooseRhythm = (card: RhythmCard) => {
    if (picked || !who) return;
    setPicked(card.id);
    const lingerMs = Date.now() - stageEnteredAt.current;
    window.setTimeout(() => {
      onComplete({
        pax: who.pax,
        who: who.id,
        signal: {
          sceneId: SCENE_ID,
          tappedFragmentId: card.id,
          lingerMs,
        },
      });
    }, 240);
  };

  const items: Array<{ id: string; label: string; hint: string; image: string; alt: string }> =
    stage === "who" ? WHO : RHYTHM;

  const eyebrow = stage === "who" ? "Who" : "Rhythm";
  const title =
    stage === "who" ? (
      <>
        Who travels <em className="font-serif italic font-normal">with you</em>?
      </>
    ) : (
      <>
        And the <em className="font-serif italic font-normal">tempo</em> of the day?
      </>
    );

  return (
    <section
      aria-label={stage === "who" ? "Choose who travels" : "Choose the rhythm"}
      className="relative z-10 mx-auto w-full max-w-[var(--editorial-max,72rem)] px-5 pb-12 pt-10 sm:px-8"
    >
      <p
        className={[
          "mb-6 text-center text-[11px] uppercase tracking-[0.32em] text-[var(--charcoal-soft,#6b6b6b)]",
          "transition-all duration-[700ms] ease-out",
          entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        ].join(" ")}
      >
        {eyebrow}
      </p>
      <h2
        className={[
          "mb-8 text-center font-display text-[24px] font-bold leading-tight tracking-tight text-[var(--charcoal,#2E2E2E)] sm:text-[30px]",
          "transition-all duration-[800ms] ease-out",
          entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
      >
        {title}
      </h2>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {items.map((card, i) => {
          const isPicked = picked === card.id;
          const isDimmed = !!picked && !isPicked;
          const onClick =
            stage === "who"
              ? () => chooseWho(card as WhoCard)
              : () => chooseRhythm(card as RhythmCard);
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={onClick}
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
                  src={card.image}
                  alt={card.alt}
                  loading={i < 2 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                />
                <div className="absolute inset-x-4 bottom-4">
                  <span className="block font-display text-[18px] font-semibold leading-tight tracking-tight text-[var(--ivory,#FAF8F3)] sm:text-[20px]">
                    {card.label}
                  </span>
                  <span
                    className="mt-1 block text-[11px] uppercase tracking-[0.22em]"
                    style={{ color: "color-mix(in oklab, var(--ivory) 80%, transparent)" }}
                  >
                    {card.hint}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
