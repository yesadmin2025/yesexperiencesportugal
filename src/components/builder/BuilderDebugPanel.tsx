import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * BuilderDebugPanel — developer-only panel showing persisted builder state.
 *
 * Visibility: opt-in. Rendered only when ANY of these are true:
 *   • import.meta.env.DEV (local dev)
 *   • URL search param `?debug=1`
 *   • localStorage flag `yes.builder.debug` === "1"
 *
 * Used to verify refresh / return-visit behavior — shows the persisted
 * intentions array, furthestStep counter, and the rest of the slice.
 */

interface Props {
  state: Record<string, unknown>;
  /** Pretty title for the slice (defaults to "Builder state"). */
  title?: string;
}

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("debug") === "1") return true;
    if (window.localStorage.getItem("yes.builder.debug") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function BuilderDebugPanel({ state, title = "Builder state" }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setEnabled(shouldShow());
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="fixed bottom-3 left-3 z-[80] max-w-[min(92vw,360px)] rounded-[2px] border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)]/95 shadow-[0_12px_30px_-12px_rgba(46,46,46,0.4)] backdrop-blur"
      role="region"
      aria-label="Builder debug panel"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--charcoal)]/10 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
          Debug · {title}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:var(--charcoal)]/60 hover:text-[color:var(--charcoal)] px-1.5"
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={() => setEnabled(false)}
            aria-label="Close debug panel"
            className="inline-flex h-6 w-6 items-center justify-center text-[color:var(--charcoal)]/50 hover:text-[color:var(--charcoal)]"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {open && (
        <pre className="m-0 max-h-[40vh] overflow-auto px-3 py-2 text-[11px] leading-snug text-[color:var(--charcoal)] font-mono">
          {JSON.stringify(state, null, 2)}
        </pre>
      )}
    </div>
  );
}
