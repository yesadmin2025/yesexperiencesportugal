/**
 * UnderstoodBeat — a brief acknowledgement between preference collection and
 * composition. It is a beat, not a phase: skippable, never blocking, and fed
 * only by deterministic wording derived from choices the traveller actually made.
 */

import { useEffect, useRef } from "react";

const HOLD_MS = 1600;

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
    const timer = window.setTimeout(finish, reduced ? 650 : HOLD_MS);
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
        className="text-[12px] uppercase tracking-[0.18em] font-semibold"
        style={{ color: "var(--gold-ink, var(--gold))" }}
      >
        I’ve got it.
      </p>
      <p
        data-testid="studio-v3-understood-line"
        className="mt-4 max-w-[28ch] text-[22px] leading-[1.3]"
        style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
      >
        {line}
      </p>
      <button
        type="button"
        onClick={finish}
        className="mt-7 min-h-[44px] px-4 text-[12px] uppercase tracking-[0.16em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      >
        Continue
      </button>
    </div>
  );
}
