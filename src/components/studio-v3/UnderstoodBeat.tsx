/**
 * UnderstoodBeat — the short "YES understood me" moment between logistics
 * and the composition.
 *
 * It is a beat, not a phase: it holds for ~2s, is skippable with any tap or
 * key, and never blocks. The sentence it shows is produced deterministically
 * from answers the traveller actually gave (see `interpretationLine`), so it
 * can never claim wine, sea or romance that was never chosen.
 */

import { useEffect, useRef } from "react";

const HOLD_MS = 2000;

export function UnderstoodBeat({
  line,
  onDone,
}: {
  line: string;
  onDone: () => void;
}) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(finish, reduced ? 900 : HOLD_MS);
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="studio-v3-understood-beat"
      onClick={finish}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-7 text-center cursor-pointer"
      style={{ background: "var(--ivory)" }}
    >
      <p
        className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
        style={{ color: "var(--gold-ink, var(--gold))" }}
      >
        YES understood you
      </p>
      <p
        data-testid="studio-v3-understood-line"
        className="mt-4 max-w-[24ch] text-[22px] leading-[1.25]"
        style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
      >
        {line}
      </p>
      <button
        type="button"
        onClick={finish}
        className="mt-8 min-h-[44px] px-4 text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      >
        Skip
      </button>
    </div>
  );
}
