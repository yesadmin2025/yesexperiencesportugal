import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ParallaxLayer — translateY on scroll via rAF, capped. Off on small mobile
 * and reduced-motion (CSS handles that). Only mount 1-2 per route.
 */
interface ParallaxLayerProps {
  children: ReactNode;
  amount?: "sm" | "md";
  className?: string;
}

export function ParallaxLayer({ children, amount = "sm", className }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return;

    const cap = amount === "md" ? 32 : 20;
    let ticking = false;
    let rafId = 0;

    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      const clamped = Math.max(-1, Math.min(1, progress));
      el.style.setProperty("--parallax-y", `${(-clamped * cap).toFixed(1)}px`);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [amount]);

  return (
    <div ref={ref} className={cn("motion-parallax", className)}>
      {children}
    </div>
  );
}
