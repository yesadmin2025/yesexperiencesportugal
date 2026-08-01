/**
 * pauseOffscreenLoops — Batch 4 shared performance guard.
 *
 * Several editorial surfaces run long, infinite Ken Burns / crossfade
 * animations. Those keep the compositor (and on some devices the main
 * thread) busy even when the element is far outside the viewport.
 *
 * This installs one IntersectionObserver per page view that pauses those
 * running animations via the Web Animations API while the element is
 * offscreen, and resumes them exactly where they left off on scroll back.
 *
 * The DOM is never mutated (no classes, no attributes), so hydration is
 * untouched. Progressive enhancement only: without JS, IntersectionObserver
 * or `getAnimations`, every loop keeps running exactly as it does today.
 */
const LOOP_SELECTOR = [".ken-burns-slow", ".he-image-cinema img", ".cinematic-editorial"].join(",");

type Animatable = Element & {
  getAnimations?: (options?: { subtree?: boolean }) => Animation[];
};

function setPlayState(el: Element, paused: boolean) {
  const target = el as Animatable;
  if (typeof target.getAnimations !== "function") return;
  for (const animation of target.getAnimations({ subtree: true })) {
    // Only touch endless decorative loops; one-shot reveals must finish.
    const iterations = (animation.effect?.getTiming?.().iterations ?? 1) as number;
    if (iterations !== Infinity) continue;
    try {
      if (paused) animation.pause();
      else void animation.play();
    } catch {
      /* animation already finished or detached — nothing to do */
    }
  }
}

export function pauseOffscreenLoops(): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) setPlayState(entry.target, !entry.isIntersecting);
    },
    { rootMargin: "150px" },
  );

  const scan = () => {
    document.querySelectorAll(LOOP_SELECTOR).forEach((el) => io.observe(el));
  };

  scan();
  // Re-scan once after hydration settles so lazily mounted blocks are covered.
  const t = setTimeout(scan, 1200);

  return () => {
    clearTimeout(t);
    io.disconnect();
  };
}
