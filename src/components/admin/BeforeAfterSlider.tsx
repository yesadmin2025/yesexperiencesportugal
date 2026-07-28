/**
 * Before/after image comparator — draggable divider revealing the
 * candidate image over the current one. Keyboard-accessible via arrow
 * keys on the handle. Respects prefers-reduced-motion (no transitions).
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  aspect?: "4/5" | "3/2" | "1/1";
};

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  aspect = "4/5",
}: Props) {
  const [pct, setPct] = useState(50);
  const wrap = useRef<HTMLDivElement>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = wrap.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.max(0, Math.min(100, raw)));
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.buttons !== 1) return;
      updateFromClientX(e.clientX);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [updateFromClientX]);

  const aspectClass =
    aspect === "3/2" ? "aspect-[3/2]" : aspect === "1/1" ? "aspect-square" : "aspect-[4/5]";

  return (
    <div
      ref={wrap}
      className={`relative w-full ${aspectClass} overflow-hidden bg-[color:var(--sand)] select-none touch-none`}
      onPointerDown={(e) => updateFromClientX(e.clientX)}
    >
      {/* Before (base layer) */}
      <img
        src={beforeSrc}
        alt={beforeAlt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* After (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        <img
          src={afterSrc}
          alt={afterAlt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
      {/* Labels */}
      <span className="absolute top-2 left-2 bg-[color:var(--charcoal)]/80 text-[color:var(--ivory)] text-[10px] uppercase tracking-[0.2em] px-2 py-0.5">
        Atual
      </span>
      <span className="absolute top-2 right-2 bg-[color:var(--gold)] text-[color:var(--charcoal)] text-[10px] uppercase tracking-[0.2em] px-2 py-0.5">
        Nova
      </span>
      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-px bg-[color:var(--ivory)] shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
        style={{ left: `${pct}%` }}
      />
      <button
        type="button"
        aria-label="Arrastar comparação"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPct((p) => Math.max(0, p - 3));
          if (e.key === "ArrowRight") setPct((p) => Math.min(100, p + 3));
        }}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-[color:var(--ivory)] border border-[color:var(--charcoal)]/25 shadow flex items-center justify-center text-[color:var(--charcoal)]"
        style={{ left: `${pct}%` }}
      >
        <span aria-hidden="true">⇔</span>
      </button>
    </div>
  );
}
