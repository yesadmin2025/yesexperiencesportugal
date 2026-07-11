/**
 * useHydrated — returns `false` during SSR and the first render, `true`
 * after `useEffect` fires client-side. Use this to gate render-visible
 * state read from browser storage (localStorage, window.matchMedia,
 * document.*) so SSR + first client render stay identical and React
 * does not warn about hydration attribute mismatches.
 */
import { useEffect, useState } from "react";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
