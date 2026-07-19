import { useEffect, useState } from "react";

/**
 * ReadingProgress — thin gold scaleX bar fixed under the header, tracking
 * scroll depth through the article. Progressive enhancement: only mounts
 * post-hydration; respects prefers-reduced-motion (still shown, no easing).
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const p = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
      setProgress(p);
      raf = 0;
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full origin-left bg-[color:var(--gold)] transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
