import { useEffect } from "react";

/**
 * Hides the floating WhatsApp + scroll-to-top buttons while any element
 * marked `data-floating-quiet` (prices, booking form, reviews) is on screen,
 * so they never cover price details, booking controls or review text.
 * Sets `html[data-floating-quiet]`; styles.css does the hiding.
 */
export function useFloatingQuietZones() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    const visible = new Set<Element>();
    const sync = () => {
      if (visible.size > 0) root.setAttribute("data-floating-quiet", "");
      else root.removeAttribute("data-floating-quiet");
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        sync();
      },
      { threshold: 0 },
    );
    const observed = new Set<Element>();
    const scan = () => {
      document.querySelectorAll("[data-floating-quiet]").forEach((el) => {
        if (el === root || observed.has(el)) return;
        observed.add(el);
        io.observe(el);
      });
      for (const el of observed) {
        if (!el.isConnected) {
          io.unobserve(el);
          observed.delete(el);
          visible.delete(el);
        }
      }
      sync();
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.removeAttribute("data-floating-quiet");
    };
  }, []);
}
