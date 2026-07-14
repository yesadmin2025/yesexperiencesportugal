import { useEffect, useRef } from "react";

/**
 * useHeroParallax — pointer-driven parallax for the hero section.
 *
 * Writes two CSS custom properties on the section element:
 *   --hero-px : -1 → 1 (cursor X relative to section center)
 *   --hero-py : -1 → 1 (cursor Y relative to section center)
 *
 * Consumers read these in CSS with calc(), e.g.
 *   transform: translate3d(calc(var(--hero-px,0) * -8px), calc(var(--hero-py,0) * -6px), 0);
 *
 * Design constraints:
 *  • rAF-throttled — never write more than once per frame.
 *  • Eased toward the target (12% per frame) so motion feels weighted, not twitchy.
 *  • No-op on touch devices and when prefers-reduced-motion is set.
 *  • Resets to 0,0 on pointer leave / blur so the hero rests centered.
 *  • Does NOT change layout — only sets CSS variables.
 */
export function useHeroParallax<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect user preferences and skip on coarse pointers (touch).
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (reduceMotion || coarsePointer) {
      el.style.setProperty("--hero-px", "0");
      el.style.setProperty("--hero-py", "0");
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = 0;
    let running = false;

    const tick = () => {
      // Critically-damped easing toward target (12% per frame ≈ ~150ms settle).
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el.style.setProperty("--hero-px", currentX.toFixed(4));
      el.style.setProperty("--hero-py", currentY.toFixed(4));

      // Stop the loop once we've effectively reached target — avoids a
      // permanent rAF when the cursor is idle.
      const dx = Math.abs(targetX - currentX);
      const dy = Math.abs(targetY - currentY);
      if (dx < 0.0008 && dy < 0.0008) {
        currentX = targetX;
        currentY = targetY;
        running = false;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      // Only respond to fine pointers (mouse / pen). Touch is filtered out
      // above, but defensive guard here in case of mixed-input devices.
      if (e.pointerType === "touch") return;
      const rect = el.getBoundingClientRect();
      // Normalize to -1 → 1 with cursor at center = 0.
      targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      // Clamp (cursor can sit just outside via pointer capture quirks).
      targetX = Math.max(-1, Math.min(1, targetX));
      targetY = Math.max(-1, Math.min(1, targetY));
      start();
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      start();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return ref;
}
