import { useEffect, useState } from "react";

/**
 * useHoverPointer — returns true only on devices that expose a real
 * hover-capable, fine pointer (mouse / stylus). Used to gate
 * hover-only, cursor-tracking, magnetic, and parallax effects.
 *
 * IMPORTANT: Do NOT use this to gate scene reveals or scroll-driven
 * narrative. Touch users still receive the full narrative reveal
 * system — coarse-pointer only disables interactions that literally
 * require a hovering cursor.
 *
 * SSR-safe: returns false until mounted on the client.
 */
export function useHoverPointer(): boolean {
  const [hasHover, setHasHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setHasHover(mq.matches);
    apply();
    // Handle Safari's older API too.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    const legacy = mq as unknown as {
      addListener?: (fn: () => void) => void;
      removeListener?: (fn: () => void) => void;
    };
    legacy.addListener?.(apply);
    return () => legacy.removeListener?.(apply);
  }, []);

  return hasHover;
}
