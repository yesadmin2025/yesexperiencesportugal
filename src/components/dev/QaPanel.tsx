import { useEffect, useState } from "react";
import {
  installQaModeActivators,
  isQaModeEnabled,
  setQaMode,
  subscribeQaMode,
} from "@/lib/qa-mode";

const STYLE_ID = "yes-qa-reduced-motion-override";
const REDUCED_MOTION_OVERRIDE_KEY = "yes:qa-rmo";

function applyReducedMotionOverride(on: boolean) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  if (on) {
    if (existing) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    // Neutralise the global `@media (prefers-reduced-motion: reduce)`
    // overrides so animations play even when the OS asks for reduced
    // motion. Used only when the QA toggle is on.
    style.textContent = `
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: revert !important;
          animation-iteration-count: revert !important;
          transition-duration: revert !important;
          scroll-behavior: revert !important;
        }
      }
    `;
    document.head.appendChild(style);
  } else if (existing) {
    existing.remove();
  }
}

function showAllReveals() {
  if (typeof document === "undefined") return 0;
  const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger, .section-enter");
  els.forEach((el) => {
    el.style.transitionDelay = "0ms";
    el.classList.add("is-visible");
  });
  return els.length;
}

function getRevealCounts() {
  if (typeof document === "undefined") return { total: 0, visible: 0 };
  const els = document.querySelectorAll(".reveal, .reveal-stagger, .section-enter");
  let visible = 0;
  els.forEach((el) => {
    if (el.classList.contains("is-visible")) visible += 1;
  });
  return { total: els.length, visible };
}

/**
 * QA / preview panel. Toggles via Ctrl+Shift+Q, `?qa=on`, or by clicking
 * the floating "QA" pill once mode is on. Independent of host.
 */
export function QaPanel() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [rmo, setRmo] = useState(false);
  const [counts, setCounts] = useState({ total: 0, visible: 0 });

  // Activators (URL flag + keyboard shortcut) + subscription to changes.
  useEffect(() => {
    const teardown = installQaModeActivators();
    setEnabled(isQaModeEnabled());
    const unsub = subscribeQaMode((on) => setEnabled(on));
    return () => {
      teardown();
      unsub();
    };
  }, []);

  // Restore reduced-motion override across reloads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(REDUCED_MOTION_OVERRIDE_KEY) === "1";
      setRmo(saved);
      applyReducedMotionOverride(saved);
    } catch {
      // ignore
    }
  }, []);

  // Live reveal counts while panel is open.
  useEffect(() => {
    if (!open || !enabled) return;
    const tick = () => setCounts(getRevealCounts());
    tick();
    const id = window.setInterval(tick, 600);
    return () => window.clearInterval(id);
  }, [open, enabled]);

  if (!enabled) return null;

  const handleReplay = () => {
    const w = window as unknown as { replayReveals?: () => void };
    if (typeof w.replayReveals === "function") w.replayReveals();
  };

  const handleShowAll = () => {
    const n = showAllReveals();

    console.info(`[qa] forced is-visible on ${n} elements`);
  };

  const handleToggleRmo = () => {
    const next = !rmo;
    setRmo(next);
    applyReducedMotionOverride(next);
    try {
      if (next) {
        window.localStorage.setItem(REDUCED_MOTION_OVERRIDE_KEY, "1");
      } else {
        window.localStorage.removeItem(REDUCED_MOTION_OVERRIDE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const handleDisableQa = () => {
    setQaMode(false);
    setOpen(false);
    applyReducedMotionOverride(false);
    setRmo(false);
    try {
      window.localStorage.removeItem(REDUCED_MOTION_OVERRIDE_KEY);
    } catch {
      // ignore
    }
  };

  const pillStyle: React.CSSProperties = {
    position: "fixed",
    left: 8,
    bottom: 72,
    zIndex: 99998,
    minHeight: 36,
    padding: "8px 12px",
    background: "rgba(41,91,97,0.92)",
    color: "var(--ivory)",
    font: "600 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace",
    border: "1px solid rgba(201,169,106,0.55)",
    borderRadius: 6,
    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
    cursor: "pointer",
    letterSpacing: "0.02em",
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open QA panel"
        title="QA panel (Ctrl+Shift+Q to toggle)"
        style={pillStyle}
      >
        ⚙ QA
      </button>
    );
  }

  const rowBtn: React.CSSProperties = {
    width: "100%",
    minHeight: 36,
    padding: "8px 10px",
    background: "rgba(255,255,255,0.06)",
    color: "var(--ivory)",
    border: "1px solid rgba(201,169,106,0.35)",
    borderRadius: 4,
    font: "600 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace",
    cursor: "pointer",
    textAlign: "left",
  };

  const rowBtnActive: React.CSSProperties = {
    ...rowBtn,
    background: "rgba(201,169,106,0.22)",
    borderColor: "rgba(201,169,106,0.85)",
  };

  return (
    <div
      role="dialog"
      aria-label="QA panel"
      style={{
        position: "fixed",
        left: 8,
        bottom: 72,
        zIndex: 99998,
        width: 220,
        padding: 10,
        background: "rgba(20,20,20,0.92)",
        color: "var(--ivory)",
        font: "600 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace",
        border: "1px solid rgba(201,169,106,0.55)",
        borderRadius: 8,
        boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--gold)",
        }}
      >
        <span>QA panel</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close QA panel"
          style={{
            background: "transparent",
            color: "var(--ivory)",
            border: "none",
            cursor: "pointer",
            font: "700 13px/1 ui-monospace,monospace",
            padding: 2,
          }}
        >
          ×
        </button>
      </div>

      <button type="button" onClick={handleReplay} style={rowBtn}>
        ↻ replay reveals
      </button>
      <button type="button" onClick={handleShowAll} style={rowBtn}>
        ⬛ show all (force visible)
      </button>
      <button
        type="button"
        onClick={handleToggleRmo}
        style={rmo ? rowBtnActive : rowBtn}
        aria-pressed={rmo}
      >
        {rmo ? "✓ " : ""}override reduced-motion
      </button>

      <div style={{ opacity: 0.7, paddingTop: 2 }}>
        reveals: {counts.visible}/{counts.total}
      </div>

      <button
        type="button"
        onClick={handleDisableQa}
        style={{
          ...rowBtn,
          borderColor: "rgba(255,255,255,0.25)",
          opacity: 0.85,
        }}
      >
        disable QA mode
      </button>

      <div style={{ opacity: 0.55, fontSize: 10 }}>Ctrl+Shift+Q · ?qa=on · ?qa=off</div>
    </div>
  );
}
