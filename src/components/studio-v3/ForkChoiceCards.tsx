/**
 * TURBO 2 — IMAGE-LED FORK.
 *
 * Renders EXACTLY the Director's ordered options, each with its own honest
 * photograph. It selects nothing, reorders nothing and adds nothing: it is a
 * different skin over the same decision as `ChoiceGrid`.
 */

import type { ChoiceOption } from "./types";
import type { StudioMedia } from "@/lib/studio-v3/studioMediaResolver";

export function ForkChoiceCards({
  options,
  media,
  onSelect,
}: {
  options: ChoiceOption<string>[];
  media: StudioMedia[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul
      role="radiogroup"
      data-testid="studio-fork-cards"
      className="mt-7 grid w-full max-w-[560px] grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2"
    >
      {options.map((option, index) => {
        const image = media[index];
        return (
          <li key={option.id}>
            <button
              type="button"
              role="radio"
              aria-checked={false}
              data-testid="studio-v3-choice"
              data-phase-cta="choice"
              data-option-id={option.id}
              data-media-id={image.id}
              onClick={() => onSelect(option.id)}
              className="group block w-full overflow-hidden rounded-[4px] text-left transition-[transform,border-color] duration-[220ms] ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                border: "1px solid color-mix(in oklab, var(--charcoal) 12%, transparent)",
                background: "color-mix(in oklab, var(--sand) 28%, transparent)",
                minHeight: 44,
              }}
            >
              <span className="block overflow-hidden">
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-[148px] w-full object-cover motion-safe:transition-transform motion-safe:duration-[560ms] motion-safe:ease-out group-hover:scale-[1.03]"
                />
              </span>
              <span className="block px-4 py-4">
                <span
                  className="block text-[16px] leading-snug"
                  style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
                >
                  {option.label}
                </span>
                {option.whisper ? (
                  <span
                    className="mt-1 block text-[13px] leading-relaxed"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 68%, transparent)" }}
                  >
                    {option.whisper}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
