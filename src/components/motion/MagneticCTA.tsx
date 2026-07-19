import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MagneticCTAProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

/**
 * MagneticCTA — desktop pointer attraction. No-op on touch/mobile and
 * reduced-motion (CSS). Wrap a single button/link.
 */
export function MagneticCTA({ children, className, strength = 6 }: MagneticCTAProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.setProperty("--mag-x", `${(dx * strength).toFixed(1)}px`);
      el.style.setProperty("--mag-y", `${(dy * strength).toFixed(1)}px`);
    };
    const reset = () => {
      el.style.setProperty("--mag-x", "0px");
      el.style.setProperty("--mag-y", "0px");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
    };
  }, [strength]);

  return (
    <span ref={ref} className={cn("motion-magnetic inline-block", className)}>
      {children}
    </span>
  );
}
