/**
 * TURBO 1 — the one optional note inside FEEL/TASTE.
 *
 * It is NOT a phase and NOT a questionnaire: it lives under the interest
 * choices, is fully skippable, and its raw text stays local draft state.
 * Only the structured interpretation reaches the canonical question history.
 */

import { useId } from "react";

export function StudioFreeTextNote({
  value,
  onChange,
  understood,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Short, factual echo of what was understood. Never the raw sentence. */
  understood?: string | null;
}) {
  const id = useId();

  return (
    <div className="mt-6 w-full" data-testid="studio-free-text-note">
      <label
        htmlFor={id}
        className="block text-[10.5px] uppercase tracking-[0.22em] font-semibold"
        style={{
          fontFamily: "var(--font-display)",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        }}
      >
        Optional
      </label>
      <textarea
        id={id}
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Anything this day should know?"
        className="mt-2 w-full min-h-[44px] resize-y rounded-[3px] px-3 py-2 text-[14px] outline-none focus-visible:ring-2"
        style={{
          fontFamily: "var(--font-body, Inter, sans-serif)",
          color: "var(--charcoal)",
          background: "var(--ivory)",
          border: "1px solid color-mix(in oklab, var(--charcoal) 16%, transparent)",
        }}
      />
      {understood ? (
        <p
          aria-live="polite"
          data-testid="studio-free-text-understood"
          className="mt-2 text-[13px]"
          style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
        >
          {understood}
        </p>
      ) : null}
    </div>
  );
}
