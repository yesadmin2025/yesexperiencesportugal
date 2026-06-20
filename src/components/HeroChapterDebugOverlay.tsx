import { useEffect, useState } from "react";
import { HERO_SCENES } from "@/content/hero-scenes-manifest";

const STORAGE_KEY = "yes:hero-chapter-debug";

/**
 * useHeroChapterDebugToggle — hidden QA toggle.
 *   - URL: `?heroDebug` (or `&heroDebug`) enables for the session
 *   - Keyboard: Shift+H toggles + persists in sessionStorage
 *
 * SSR-safe: starts false, hydrates after mount.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useHeroChapterDebugToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = new URLSearchParams(window.location.search).has("heroDebug");
    const fromStorage = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    if (fromUrl || fromStorage) setEnabled(true);

    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== "h") return;
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

type Snap = {
  chapterId: string;
  chapterIndex: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  effectiveTime: number;
  playbackRate: number;
  remainingInChapter: number;
  prevOpacity: number | null;
  currentOpacity: number;
  fadeElapsedMs: number | null;
  fadeTotalMs: number;
};

const HERO_OVERLAP_MS = 1450;

/**
 * HeroChapterDebugOverlay — fixed-corner readout that proves the
 * credits/copy never advance faster than authored. Polls the live
 * `<video>` via rAF.
 *
 * `effectiveTime` = `currentTime / playbackRate` — wall-clock seconds
 * the viewer has actually spent inside the chapter. This is the
 * number to watch when QAing pacing across viewports.
 */
export function HeroChapterDebugOverlay() {
  const [snap, setSnap] = useState<Snap | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let mounted = true;

    const tick = () => {
      if (!mounted) return;
      const video = document.querySelector<HTMLVideoElement>(
        ".hero-story-stage video[data-hero-film='true']",
      );
      if (video) {
        const t = video.currentTime;
        let idx = -1;
        for (let i = 0; i < HERO_SCENES.length; i += 1) {
          const s = HERO_SCENES[i];
          if (t >= s.startTime && t <= s.endTime) {
            idx = i;
            break;
          }
        }
        if (idx === -1) idx = HERO_SCENES.length - 1;
        const c = HERO_SCENES[idx];
        const rate = video.playbackRate || 1;

        // Live read of the rendered overlay opacities — proves the
        // dissolve curve and timing on real frames.
        const prevEl = document.querySelector<HTMLElement>('[data-hero-overlay="prev"]');
        const currentEl = document.querySelector<HTMLElement>('[data-hero-overlay="current"]');
        const prevOpacity = prevEl ? parseFloat(getComputedStyle(prevEl).opacity || "1") : null;
        const currentOpacity = currentEl
          ? parseFloat(getComputedStyle(currentEl).opacity || "1")
          : 1;
        // While prev is mounted we're inside the cross-fade window.
        // Approximate elapsed via 1 - currentOpacity^(1/curve) is
        // unreliable; expose the raw opacities + total instead.
        const fadeElapsedMs =
          prevEl && prevOpacity !== null ? Math.round((1 - prevOpacity) * HERO_OVERLAP_MS) : null;

        setSnap({
          chapterId: c.id,
          chapterIndex: idx,
          startTime: c.startTime,
          endTime: c.endTime,
          currentTime: t,
          effectiveTime: (t - c.startTime) / rate,
          playbackRate: rate,
          remainingInChapter: (c.endTime - t) / rate,
          prevOpacity,
          currentOpacity,
          fadeElapsedMs,
          fadeTotalMs: HERO_OVERLAP_MS,
        });
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!snap) return null;

  const chapterDuration = snap.endTime - snap.startTime;
  const effectiveDuration = chapterDuration / snap.playbackRate;
  const progressPct = Math.min(
    100,
    Math.max(0, ((snap.currentTime - snap.startTime) / chapterDuration) * 100),
  );

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] pointer-events-none select-none font-mono text-[11px] leading-tight text-white"
      role="status"
      aria-label="Hero chapter debug overlay"
    >
      <div className="rounded-md bg-black/85 backdrop-blur-md px-3 py-2.5 shadow-2xl ring-1 ring-white/10 min-w-[260px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 uppercase tracking-[0.18em] text-[9.5px]">
            hero-chapter
          </span>
          <span className="text-white/40 text-[9.5px]">Shift+H</span>
        </div>

        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[15px] font-medium text-[color:var(--gold-soft)]">
            #{snap.chapterIndex + 1} {snap.chapterId}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-2 text-[10px] tabular-nums text-white/80">
          <span className="text-white/50">start</span>
          <span className="text-right">{snap.startTime.toFixed(3)}s</span>
          <span className="text-white/50">end</span>
          <span className="text-right">{snap.endTime.toFixed(3)}s</span>
          <span className="text-white/50">currentTime</span>
          <span className="text-right">{snap.currentTime.toFixed(3)}s</span>
          <span className="text-white/50">effective in-chapter</span>
          <span className="text-right">{snap.effectiveTime.toFixed(2)}s</span>
          <span className="text-white/50">remaining</span>
          <span className="text-right">{snap.remainingInChapter.toFixed(2)}s</span>
          <span className="text-white/50">playbackRate</span>
          <span className="text-right">{snap.playbackRate.toFixed(2)}×</span>
          <span className="text-white/50">chapter duration</span>
          <span className="text-right">
            {chapterDuration.toFixed(2)}s · eff {effectiveDuration.toFixed(2)}s
          </span>
          <span className="text-white/50">overlay prev/curr</span>
          <span className="text-right">
            {snap.prevOpacity === null ? "—" : snap.prevOpacity.toFixed(2)} /{" "}
            {snap.currentOpacity.toFixed(2)}
          </span>
          <span className="text-white/50">fade window</span>
          <span className="text-right">
            {snap.fadeElapsedMs === null
              ? "idle"
              : `${snap.fadeElapsedMs}ms / ${snap.fadeTotalMs}ms`}
          </span>
        </div>

        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-0.5 text-[9.5px] text-white/50 uppercase tracking-[0.14em]">
            <span>chapter progress</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--gold)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5 text-[9.5px] text-white/50 uppercase tracking-[0.14em]">
            <span>fade dissolve (smootherstep)</span>
            <span>
              {snap.prevOpacity === null ? "—" : `${Math.round((1 - snap.prevOpacity) * 100)}%`}
            </span>
          </div>
          <div className="relative h-3 rounded-sm bg-white/10 overflow-hidden">
            {/* Outgoing (prev) ramp */}
            <div
              className="absolute inset-y-0 left-0 bg-[color:var(--ivory)]/55"
              style={{
                width: `${(snap.prevOpacity ?? 0) * 100}%`,
              }}
            />
            {/* Incoming (current) ramp — drawn from the right so the
                two bars meet visually as the dissolve progresses. */}
            <div
              className="absolute inset-y-0 right-0 bg-[color:var(--gold-soft)]/85"
              style={{
                width: `${snap.currentOpacity * 100}%`,
              }}
            />
            {/* 50% midline marker */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
          </div>
          <div className="flex justify-between mt-0.5 text-[9px] text-white/40 tabular-nums">
            <span>prev opacity</span>
            <span>curr opacity</span>
          </div>
        </div>

        {/* Easing curve graph — smootherstep opacity over time */}
        <EasingCurveGraph
          progress={
            snap.fadeElapsedMs === null
              ? null
              : Math.min(1, Math.max(0, snap.fadeElapsedMs / snap.fadeTotalMs))
          }
        />
      </div>
    </div>
  );
}

/**
 * EasingCurveGraph — SVG plot of the smootherstep curve
 * (6t⁵ − 15t⁴ + 10t³) used for the hero overlay cross-fade.
 * Draws the outgoing (1 − s(t)) and incoming (s(t)) ramps and a
 * live playhead marker showing where the current fade sits.
 */
function EasingCurveGraph({ progress }: { progress: number | null }) {
  const W = 240;
  const H = 64;
  const PAD = 4;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

  const SAMPLES = 48;
  const pointsIn: string[] = [];
  const pointsOut: string[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const s = smootherstep(t);
    const x = PAD + t * innerW;
    const yIn = PAD + (1 - s) * innerH;
    const yOut = PAD + s * innerH;
    pointsIn.push(`${x.toFixed(2)},${yIn.toFixed(2)}`);
    pointsOut.push(`${x.toFixed(2)},${yOut.toFixed(2)}`);
  }

  const playX = progress === null ? null : PAD + progress * innerW;
  const playS = progress === null ? null : smootherstep(progress);
  const playYIn = playS === null ? null : PAD + (1 - playS) * innerH;
  const playYOut = playS === null ? null : PAD + playS * innerH;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-0.5 text-[9.5px] text-white/50 uppercase tracking-[0.14em]">
        <span>easing curve · smootherstep</span>
        <span className="tabular-nums">
          {progress === null ? "idle" : `t=${progress.toFixed(2)} · α=${(playS ?? 0).toFixed(2)}`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full h-[64px] rounded-sm bg-white/[0.04] ring-1 ring-white/10"
        preserveAspectRatio="none"
      >
        {/* gridlines: 25/50/75% */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + g * innerH}
            y2={PAD + g * innerH}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={`v${g}`}
            y1={PAD}
            y2={H - PAD}
            x1={PAD + g * innerW}
            x2={PAD + g * innerW}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}
        {/* outgoing curve (prev) */}
        <polyline
          points={pointsIn.join(" ")}
          fill="none"
          stroke="var(--ivory)"
          strokeOpacity={0.7}
          strokeWidth={1.4}
        />
        {/* incoming curve (current) */}
        <polyline
          points={pointsOut.join(" ")}
          fill="none"
          stroke="var(--gold-soft)"
          strokeOpacity={0.95}
          strokeWidth={1.4}
        />
        {/* playhead */}
        {playX !== null && (
          <>
            <line
              x1={playX}
              x2={playX}
              y1={PAD}
              y2={H - PAD}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {playYIn !== null && <circle cx={playX} cy={playYIn} r={2.5} fill="var(--ivory)" />}
            {playYOut !== null && (
              <circle cx={playX} cy={playYOut} r={2.5} fill="var(--gold-soft)" />
            )}
          </>
        )}
      </svg>
      <div className="flex justify-between mt-0.5 text-[9px] text-white/40 tabular-nums">
        <span>0ms</span>
        <span>{Math.round(HERO_OVERLAP_MS / 2)}ms</span>
        <span>{HERO_OVERLAP_MS}ms</span>
      </div>
    </div>
  );
}
