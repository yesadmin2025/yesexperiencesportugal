import { useEffect, useState } from "react";

/**
 * useMediaQuery — subscribe a component to a CSS media query.
 *
 * Returns `true` while `query` matches. Uses `matchMedia` so the
 * subscription fires only when the breakpoint is actually crossed
 * (cheaper than a `resize` listener) and naturally accounts for CSS
 * pixel density / browser chrome / soft keyboard.
 *
 * SSR-safe: returns `false` until mounted on the client. Pass an
 * explicit `defaultValue` (e.g. `true`) when the server's best guess
 * should be "matches" to avoid a hide → show flicker on hydration.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = (ev: MediaQueryListEvent) => setMatches(ev.matches);
    // Sync once on mount in case the query changed between SSR & hydration.
    setMatches(mql.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    // Safari ≤13 fallback.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}
