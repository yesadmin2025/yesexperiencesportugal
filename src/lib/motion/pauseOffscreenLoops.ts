/**
 * pauseOffscreenLoops — Batch 4 shared performance guard.
 *
 * Several editorial surfaces run long, infinite Ken Burns / crossfade
 * animations. Those keep the compositor (and on some devices the main
 * thread) busy even when the element is far outside the viewport.
 *
 * This installs one IntersectionObserver per page view that flips
 * `data-loop-paused="1"` on offscreen loop elements; the CSS rule sets
 * `animation-play-state: paused`. Nothing is hidden, nothing shifts, and
 * the animation resumes exactly where it left off when scrolled back.
 *
 * Progressive enhancement only: without JS or IO, every loop simply keeps
 * running as it does today.
 */
const LOOP_SELECTOR = [".ken-burns-slow", ".he-image-cinema img", ".cinematic-editorial"].join(",");

export function pauseOffscreenLoops(): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) el.removeAttribute("data-loop-paused");
        else el.setAttribute("data-loop-paused", "1");
      }
    },
    { rootMargin: "150px" },
  );

  const scan = () => {
    document.querySelectorAll<HTMLElement>(LOOP_SELECTOR).forEach((el) => io.observe(el));
  };

  scan();
  // Re-scan once after hydration settles so lazily mounted blocks are covered.
  const t = setTimeout(scan, 1200);

  return () => {
    clearTimeout(t);
    io.disconnect();
  };
}
