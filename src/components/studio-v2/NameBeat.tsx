/**
 * NameBeat — optional name capture before the thinking beat.
 *
 * Not a form. A single italic invitation with one input. Skippable. If the
 * traveller offers a name, the reveal personalises ("Sofia's Portugal").
 * If skipped, the reveal stays neutral ("Your Portugal"). Bible: guided, not
 * asked; interface progressively disappears.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

interface Props {
  initial?: string;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}

export function NameBeat({ initial = "", onSubmit, onSkip }: Props) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 500);
    return () => window.clearTimeout(t);
  }, []);

  const submit = () => {
    const trimmed = value.trim().slice(0, 40);
    if (!trimmed) {
      onSkip();
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <section
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col items-center justify-center px-6 pb-16 pt-14 text-center"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      <span
        className="inline-flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.32em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
      >
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
        Before we show you
        <span className="h-px w-6" style={{ background: "var(--gold)" }} />
      </span>

      <p
        className="mt-10 max-w-[26ch] text-[26px] leading-[1.18] sm:text-[30px]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
      >
        What should we call you?
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-10 flex w-full max-w-[360px] items-center gap-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={40}
          autoComplete="given-name"
          aria-label="Your name (optional)"
          placeholder="(optional)"
          className="flex-1 border-0 border-b bg-transparent pb-2 text-center text-[20px] focus:outline-none"
          style={{
            borderColor: "color-mix(in oklab, var(--charcoal) 30%, transparent)",
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            color: "var(--charcoal)",
          }}
        />
        <button
          type="submit"
          aria-label="Continue"
          className="grid h-11 w-11 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <button
        type="button"
        onClick={onSkip}
        className="mt-8 text-[10.5px] font-semibold uppercase tracking-[0.32em] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      >
        Skip — keep it private
      </button>
    </section>
  );
}
