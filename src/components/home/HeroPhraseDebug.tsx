import { useEffect, useRef, useState } from "react";

/**
 * HeroPhraseDebug — preview-only overlay showing the active phrase, its
 * current phase (fadeIn / hold / fadeOut / done), the per-phrase scene
 * (entry vector → rest anchor → exit vector), and the timings used.
 *
 * The overlay is DRAGGABLE (header strip) and RESIZABLE (bottom-right
 * handle). Position + size persist in localStorage so it stays where
 * you put it across reloads / different screen sizes.
 *
 * Activate with any of:
 *   • URL flag `?debug-phrase` (or `?debug-phrase=1`)
 *   • Shift+P toggle (persisted in sessionStorage)
 */

const STORAGE_KEY = "hero-phrase-debug";
const RECT_KEY = "hero-phrase-debug:rect";
const SNAP_KEY = "hero-phrase-debug:snap";

type SnapConfig = {
  on: boolean;
  pxStep: number; // grid step in px for from/to vectors
  pctStep: number; // grid step in % for rest anchor
};
const DEFAULT_SNAP: SnapConfig = { on: true, pxStep: 8, pctStep: 2 };
const PX_STEPS = [4, 8, 12, 16, 24];
const PCT_STEPS = [1, 2, 4, 5];

function loadSnap(): SnapConfig {
  if (typeof window === "undefined") return DEFAULT_SNAP;
  try {
    const raw = window.localStorage.getItem(SNAP_KEY);
    if (!raw) return DEFAULT_SNAP;
    const p = JSON.parse(raw) as Partial<SnapConfig>;
    return {
      on: typeof p.on === "boolean" ? p.on : DEFAULT_SNAP.on,
      pxStep: typeof p.pxStep === "number" ? p.pxStep : DEFAULT_SNAP.pxStep,
      pctStep: typeof p.pctStep === "number" ? p.pctStep : DEFAULT_SNAP.pctStep,
    };
  } catch {
    return DEFAULT_SNAP;
  }
}
function saveSnap(s: SnapConfig) {
  try {
    window.localStorage.setItem(SNAP_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
const snapTo = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v);

// eslint-disable-next-line react-refresh/only-export-components
export function useHeroPhraseDebugToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = new URLSearchParams(window.location.search).has("debug-phrase");
    const fromStorage = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    if (fromUrl || fromStorage) setEnabled(true);

    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== "p") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      setEnabled((prev) => {
        const next = !prev;
        try {
          window.sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return enabled;
}

export type PhrasePhase = "idle" | "fadeIn" | "hold" | "fadeOut" | "done";

export type HeroPhraseDebugProps = {
  phraseIndex: number;
  total: number;
  phase: PhrasePhase;
  fadeInMs: number;
  holdMs: number;
  fadeOutMs: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  restXPct: number;
  restYPct: number;
  elapsedMs: number;
  /** Current global animation intensity (0.5 – 1.5). Optional for back-compat. */
  intensity?: number;
  /** Effective scale applied (intensity × video-fit). Display-only. */
  globalScale?: number;
  /** Video duration in ms once metadata has loaded; null while unknown. */
  videoDurationMs?: number | null;
  /** Base (un-scaled) breathing pause between phrases, in ms. */
  gapMs?: number;
};

/** Film-title cadence contract — base values at intensity=1, no video-fit. */
const CONTRACT = {
  fadeIn: 1200,
  hold: 3200,
  fadeOut: 900,
  gapMin: 400,
  gapMax: 600,
} as const;
const TIMING_TOLERANCE_MS = 40;

function checkExact(actual: number, target: number) {
  return Math.abs(actual - target) <= TIMING_TOLERANCE_MS;
}
function checkRange(actual: number, min: number, max: number) {
  return actual >= min - TIMING_TOLERANCE_MS && actual <= max + TIMING_TOLERANCE_MS;
}

const INTENSITY_KEY = "hero-phrase-debug:intensity";
const INTENSITY_EVENT = "hero-phrase-intensity-change";
const INTENSITY_MIN = 0.5;
const INTENSITY_MAX = 1.5;

const phaseColors: Record<PhrasePhase, string> = {
  idle: "#888",
  fadeIn: "#7BD389",
  hold: "var(--gold)",
  fadeOut: "#E58A6B",
  done: "#7AA7C7",
};

type Rect = { x: number; y: number; w: number; h: number };

const DEFAULT_RECT: Rect = { x: 8, y: 8, w: 220, h: 200 };
const MIN_W = 170;
const MIN_H = 140;

function loadRect(): Rect {
  if (typeof window === "undefined") return DEFAULT_RECT;
  try {
    const raw = window.localStorage.getItem(RECT_KEY);
    if (!raw) return DEFAULT_RECT;
    const parsed = JSON.parse(raw) as Partial<Rect>;
    return {
      x: typeof parsed.x === "number" ? parsed.x : DEFAULT_RECT.x,
      y: typeof parsed.y === "number" ? parsed.y : DEFAULT_RECT.y,
      w: typeof parsed.w === "number" ? Math.max(parsed.w, MIN_W) : DEFAULT_RECT.w,
      h: typeof parsed.h === "number" ? Math.max(parsed.h, MIN_H) : DEFAULT_RECT.h,
    };
  } catch {
    return DEFAULT_RECT;
  }
}

function saveRect(rect: Rect) {
  try {
    window.localStorage.setItem(RECT_KEY, JSON.stringify(rect));
  } catch {
    /* ignore quota */
  }
}

export function HeroPhraseDebug({
  phraseIndex,
  total,
  phase,
  fadeInMs,
  holdMs,
  fadeOutMs,
  fromX,
  fromY,
  toX,
  toY,
  restXPct,
  restYPct,
  elapsedMs,
  intensity = 1,
  globalScale = 1,
  videoDurationMs = null,
  gapMs,
}: HeroPhraseDebugProps) {
  // Derive base (un-scaled) durations so we can verify the design contract
  // (1200 / 3200 / 900 / 400–600ms) regardless of current intensity / video-fit.
  const safeScale = globalScale > 0 ? globalScale : 1;
  const baseFadeIn = Math.round(fadeInMs / safeScale);
  const baseHold = Math.round(holdMs / safeScale);
  const baseFadeOut = Math.round(fadeOutMs / safeScale);
  const baseGap = gapMs ?? 0;
  const passEnter = checkExact(baseFadeIn, CONTRACT.fadeIn);
  const passHold = baseHold >= CONTRACT.hold - TIMING_TOLERANCE_MS;
  const passExit = checkExact(baseFadeOut, CONTRACT.fadeOut);
  const passGap = checkRange(baseGap, CONTRACT.gapMin, CONTRACT.gapMax);
  const allPass = passEnter && passHold && passExit && passGap;
  const beat = fadeInMs + holdMs + fadeOutMs;
  const [rect, setRect] = useState<Rect>(() => loadRect());
  const [snap, setSnap] = useState<SnapConfig>(() => loadSnap());
  const dragRef = useRef<{ kind: "move" | "resize"; sx: number; sy: number; sr: Rect } | null>(
    null,
  );

  const setIntensity = (next: number) => {
    const clamped = Math.max(INTENSITY_MIN, Math.min(INTENSITY_MAX, next));
    try {
      window.localStorage.setItem(INTENSITY_KEY, String(clamped));
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new CustomEvent(INTENSITY_EVENT, { detail: clamped }));
    } catch {
      /* ignore */
    }
  };

  const updateSnap = (patch: Partial<SnapConfig>) => {
    setSnap((s) => {
      const next = { ...s, ...patch };
      saveSnap(next);
      return next;
    });
  };

  // Snapped values shown for copy/paste into PHRASE_SCENES.
  const snappedFromX = snap.on ? snapTo(fromX, snap.pxStep) : fromX;
  const snappedFromY = snap.on ? snapTo(fromY, snap.pxStep) : fromY;
  const snappedToX = snap.on ? snapTo(toX, snap.pxStep) : toX;
  const snappedToY = snap.on ? snapTo(toY, snap.pxStep) : toY;
  const snappedRestX = snap.on ? snapTo(restXPct, snap.pctStep) : restXPct;
  const snappedRestY = snap.on ? snapTo(restYPct, snap.pctStep) : restYPct;

  // Clamp into the section bounds whenever the parent resizes.
  useEffect(() => {
    const clamp = () => {
      setRect((r) => {
        const parent =
          (document.querySelector('[data-hero-cinematic="true"]') as HTMLElement | null) ?? null;
        if (!parent) return r;
        const pw = parent.clientWidth;
        const ph = parent.clientHeight;
        const w = Math.min(r.w, Math.max(MIN_W, pw - 8));
        const h = Math.min(r.h, Math.max(MIN_H, ph - 8));
        const x = Math.max(0, Math.min(r.x, pw - w - 4));
        const y = Math.max(0, Math.min(r.y, ph - h - 4));
        return { x, y, w, h };
      });
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);

  // Pointer drag/resize handlers wired on document while a gesture is active.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      setRect((cur) => {
        const parent =
          (document.querySelector('[data-hero-cinematic="true"]') as HTMLElement | null) ?? null;
        const pw = parent?.clientWidth ?? window.innerWidth;
        const ph = parent?.clientHeight ?? window.innerHeight;
        if (d.kind === "move") {
          const x = Math.max(0, Math.min(d.sr.x + dx, pw - cur.w - 4));
          const y = Math.max(0, Math.min(d.sr.y + dy, ph - cur.h - 4));
          return { ...cur, x, y };
        }
        // resize
        const w = Math.max(MIN_W, Math.min(d.sr.w + dx, pw - cur.x - 4));
        const h = Math.max(MIN_H, Math.min(d.sr.h + dy, ph - cur.y - 4));
        return { ...cur, w, h };
      });
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        // persist on release
        setRect((r) => {
          saveRect(r);
          return r;
        });
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const beginDrag = (kind: "move" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind, sx: e.clientX, sy: e.clientY, sr: { ...rect } };
  };

  const reset = () => {
    setRect(DEFAULT_RECT);
    saveRect(DEFAULT_RECT);
  };

  return (
    <>
      {/* Grid overlay across the hero stage. The px grid maps directly to
         from/to vector units; the % grid maps to the rest anchor. Toggle
         and step sizes persist in localStorage. */}
      {snap.on && (
        <div
          aria-hidden="true"
          data-hero-phrase-grid="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 49,
            pointerEvents: "none",
            backgroundImage: [
              // px grid (gold, fine)
              `linear-gradient(to right, rgba(201,169,106,0.18) 1px, transparent 1px)`,
              `linear-gradient(to bottom, rgba(201,169,106,0.18) 1px, transparent 1px)`,
              // % grid (ivory, coarse) — center cross + stride
              `linear-gradient(to right, rgba(250,248,243,0.12) 1px, transparent 1px)`,
              `linear-gradient(to bottom, rgba(250,248,243,0.12) 1px, transparent 1px)`,
            ].join(", "),
            backgroundSize: [
              `${snap.pxStep}px ${snap.pxStep}px`,
              `${snap.pxStep}px ${snap.pxStep}px`,
              `${snap.pctStep}% ${snap.pctStep}%`,
              `${snap.pctStep}% ${snap.pctStep}%`,
            ].join(", "),
            backgroundPosition: "center center",
            mixBlendMode: "screen",
          }}
        >
          {/* Centre crosshair = stage origin (rest anchor 0%,0%). */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(201,169,106,0.45)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(201,169,106,0.45)",
            }}
          />
        </div>
      )}

      <div
        data-hero-phrase-debug="true"
        style={{
          position: "absolute",
          top: rect.y,
          left: rect.x,
          width: rect.w,
          height: rect.h,
          zIndex: 50,
          pointerEvents: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 10.5,
          lineHeight: 1.45,
          color: "var(--ivory)",
          background: "rgba(20,20,22,0.82)",
          border: "1px solid rgba(201,169,106,0.45)",
          borderRadius: 6,
          boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Header / drag strip */}
        <div
          onPointerDown={beginDrag("move")}
          style={{
            padding: "5px 8px",
            background: "rgba(201,169,106,0.12)",
            borderBottom: "1px solid rgba(201,169,106,0.25)",
            cursor: "move",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <span style={{ fontWeight: 700, letterSpacing: "0.06em", color: "var(--gold)" }}>
            HERO · PHRASE DEBUG
          </span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={reset}
            style={{
              pointerEvents: "auto",
              background: "transparent",
              color: "rgba(250,248,243,0.7)",
              border: "1px solid rgba(250,248,243,0.25)",
              borderRadius: 3,
              fontSize: 9,
              letterSpacing: "0.08em",
              padding: "1px 5px",
              cursor: "pointer",
            }}
            aria-label="Reset overlay position"
          >
            RESET
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "6px 8px", flex: 1, overflow: "auto" }}>
          <div>
            phrase:{" "}
            <strong>
              {phraseIndex < 0 ? "—" : `${Math.min(phraseIndex, total - 1) + 1}/${total}`}
            </strong>
            {phraseIndex >= total ? "  (done)" : ""}
          </div>
          <div>
            phase: <strong style={{ color: phaseColors[phase] }}>{phase}</strong>{" "}
            <span style={{ opacity: 0.7 }}>
              {elapsedMs.toFixed(0)}/{beat}ms
            </span>
          </div>
          <div style={{ opacity: 0.85 }}>
            in {fadeInMs} · hold {holdMs} · out {fadeOutMs}
          </div>
          <div style={{ opacity: 0.85 }}>
            from ({fromX},{fromY}) → rest ({restXPct}%,{restYPct}%) → to ({toX},{toY})
          </div>

          {/* ── Film-title cadence contract ──────────────────────────────
           Verifies the design spec: 1200ms enter · 3200ms+ hold ·
           900ms exit · 400–600ms breathing pause. Values are derived
           at intensity=1 so the badge stays meaningful even when the
           debug slider scales the live timing. */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px dashed rgba(250,248,243,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <span style={{ letterSpacing: "0.06em", color: "var(--gold)", fontWeight: 600 }}>
                CONTRACT
              </span>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: allPass ? "rgba(123,211,137,0.22)" : "rgba(229,138,107,0.22)",
                  border: `1px solid ${allPass ? "rgba(123,211,137,0.7)" : "rgba(229,138,107,0.7)"}`,
                  color: allPass ? "#7BD389" : "#E58A6B",
                  fontWeight: 700,
                }}
              >
                {allPass ? "PASS" : "FAIL"}
              </span>
            </div>
            <ContractRow
              label="enter"
              actual={baseFadeIn}
              target={`${CONTRACT.fadeIn}ms`}
              pass={passEnter}
            />
            <ContractRow
              label="hold"
              actual={baseHold}
              target={`≥${CONTRACT.hold}ms`}
              pass={passHold}
            />
            <ContractRow
              label="exit"
              actual={baseFadeOut}
              target={`${CONTRACT.fadeOut}ms`}
              pass={passExit}
            />
            <ContractRow
              label="gap"
              actual={baseGap}
              target={`${CONTRACT.gapMin}–${CONTRACT.gapMax}ms`}
              pass={passGap}
            />
            {safeScale !== 1 && (
              <div style={{ marginTop: 3, opacity: 0.6, fontSize: 9 }}>
                base values shown · live ×{safeScale.toFixed(2)}
              </div>
            )}
          </div>

          {/* Phase progress bar */}
          <div
            style={{
              marginTop: 5,
              height: 4,
              width: "100%",
              background: "rgba(255,255,255,0.12)",
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
            }}
          >
            <div
              style={{
                width: `${(fadeInMs / beat) * 100}%`,
                background: phase === "fadeIn" ? phaseColors.fadeIn : "rgba(123,211,137,0.35)",
              }}
            />
            <div
              style={{
                width: `${(holdMs / beat) * 100}%`,
                background: phase === "hold" ? phaseColors.hold : "rgba(201,169,106,0.35)",
              }}
            />
            <div
              style={{
                width: `${(fadeOutMs / beat) * 100}%`,
                background: phase === "fadeOut" ? phaseColors.fadeOut : "rgba(229,138,107,0.35)",
              }}
            />
          </div>

          {/* Vector mini-map: entry → rest → exit */}
          <div
            style={{
              marginTop: 6,
              position: "relative",
              height: 60,
              border: "1px dashed rgba(250,248,243,0.18)",
              borderRadius: 3,
              overflow: "hidden",
            }}
            aria-hidden="true"
          >
            <Mini
              fromX={fromX}
              fromY={fromY}
              toX={toX}
              toY={toY}
              restXPct={restXPct}
              restYPct={restYPct}
              phase={phase}
            />
          </div>

          {/* Global animation intensity */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px dashed rgba(250,248,243,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <span style={{ letterSpacing: "0.06em", color: "var(--gold)", fontWeight: 600 }}>
                INTENSITY
              </span>
              <span style={{ opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>
                {intensity.toFixed(2)}× · scale {globalScale.toFixed(2)}×
              </span>
            </div>
            <input
              type="range"
              min={INTENSITY_MIN}
              max={INTENSITY_MAX}
              step={0.05}
              value={intensity}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setIntensity(Number(e.currentTarget.value))}
              style={{
                width: "100%",
                marginTop: 3,
                accentColor: "var(--gold)",
              }}
              aria-label="Animation intensity"
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginTop: 2 }}>
              {[0.5, 0.75, 1, 1.25, 1.5].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setIntensity(preset)}
                  style={{
                    flex: 1,
                    fontFamily: "inherit",
                    fontSize: 9.5,
                    padding: "1px 0",
                    borderRadius: 3,
                    cursor: "pointer",
                    border: "1px solid rgba(201,169,106,0.45)",
                    background:
                      Math.abs(intensity - preset) < 0.025
                        ? "rgba(201,169,106,0.35)"
                        : "transparent",
                    color: "var(--ivory)",
                  }}
                >
                  {preset}×
                </button>
              ))}
            </div>
            <div style={{ marginTop: 3, opacity: 0.7, fontSize: 9.5 }}>
              video: {videoDurationMs == null ? "—" : `${(videoDurationMs / 1000).toFixed(1)}s`} ·
              fit auto
            </div>
          </div>

          {/* Snap-to-grid controls */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px dashed rgba(250,248,243,0.18)",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={snap.on}
                onChange={(e) => updateSnap({ on: e.target.checked })}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ accentColor: "var(--gold)" }}
              />
              <span style={{ letterSpacing: "0.06em", color: "var(--gold)", fontWeight: 600 }}>
                SNAP-TO-GRID
              </span>
            </label>

            <div
              style={{
                marginTop: 4,
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "3px 6px",
                alignItems: "center",
                opacity: snap.on ? 1 : 0.5,
              }}
            >
              <span style={{ opacity: 0.75 }}>px:</span>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {PX_STEPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => updateSnap({ pxStep: s })}
                    disabled={!snap.on}
                    style={{
                      fontFamily: "inherit",
                      fontSize: 9.5,
                      padding: "1px 5px",
                      borderRadius: 3,
                      cursor: snap.on ? "pointer" : "default",
                      border: "1px solid rgba(201,169,106,0.45)",
                      background: snap.pxStep === s ? "rgba(201,169,106,0.35)" : "transparent",
                      color: "var(--ivory)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span style={{ opacity: 0.75 }}>%:</span>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {PCT_STEPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => updateSnap({ pctStep: s })}
                    disabled={!snap.on}
                    style={{
                      fontFamily: "inherit",
                      fontSize: 9.5,
                      padding: "1px 5px",
                      borderRadius: 3,
                      cursor: snap.on ? "pointer" : "default",
                      border: "1px solid rgba(201,169,106,0.45)",
                      background: snap.pctStep === s ? "rgba(201,169,106,0.35)" : "transparent",
                      color: "var(--ivory)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {snap.on && (
              <div
                style={{
                  marginTop: 5,
                  padding: "4px 6px",
                  background: "rgba(201,169,106,0.08)",
                  borderRadius: 3,
                  fontSize: 9.5,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ opacity: 0.7, letterSpacing: "0.05em" }}>SNAPPED</div>
                <div>
                  from ({snappedFromX},{snappedFromY}) → rest ({snappedRestX}%,{snappedRestY}%) → to
                  ({snappedToX},{snappedToY})
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 4, opacity: 0.6, fontSize: 9.5 }}>
            drag header · resize ↘ · Shift+P toggle
          </div>
        </div>

        {/* Resize handle */}
        <div
          onPointerDown={beginDrag("resize")}
          aria-label="Resize"
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 16,
            height: 16,
            cursor: "nwse-resize",
            background:
              "linear-gradient(135deg, transparent 50%, rgba(201,169,106,0.55) 50%, rgba(201,169,106,0.55) 60%, transparent 60%, transparent 70%, rgba(201,169,106,0.55) 70%, rgba(201,169,106,0.55) 80%, transparent 80%)",
          }}
        />
      </div>
    </>
  );
}

function ContractRow({
  label,
  actual,
  target,
  pass,
}: {
  label: string;
  actual: number;
  target: string;
  pass: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 6,
        alignItems: "center",
        marginTop: 3,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span aria-hidden="true" style={{ color: pass ? "#7BD389" : "#E58A6B" }}>
        {pass ? "✓" : "✗"}
      </span>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <span style={{ opacity: 0.7 }}>{actual}ms</span>
      <span style={{ opacity: 0.55, fontSize: 9.5 }}>/ {target}</span>
    </div>
  );
}

function Mini({
  fromX,
  fromY,
  toX,
  toY,
  restXPct,
  restYPct,
  phase,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  restXPct: number;
  restYPct: number;
  phase: PhrasePhase;
}) {
  // Map px offsets onto a 100×60 visual. Centre = rest anchor (offset by restPct).
  const cx = 50 + restXPct * 0.5; // restXPct is in % of a notional stage; squashed for the mini
  const cy = 30 + restYPct * 0.3;
  const sx = cx - fromX * 0.45;
  const sy = cy - fromY * 0.45;
  const ex = cx + toX * 0.45;
  const ey = cy + toY * 0.45;
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <line
        x1={sx}
        y1={sy}
        x2={cx}
        y2={cy}
        stroke={phaseColors.fadeIn}
        strokeWidth="0.8"
        opacity={phase === "fadeIn" ? 1 : 0.45}
      />
      <line
        x1={cx}
        y1={cy}
        x2={ex}
        y2={ey}
        stroke={phaseColors.fadeOut}
        strokeWidth="0.8"
        opacity={phase === "fadeOut" ? 1 : 0.45}
      />
      <circle cx={sx} cy={sy} r="1.6" fill={phaseColors.fadeIn} />
      <circle cx={cx} cy={cy} r="2.2" fill={phaseColors.hold} />
      <circle cx={ex} cy={ey} r="1.6" fill={phaseColors.fadeOut} />
    </svg>
  );
}
