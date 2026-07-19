/**
 * scroll-driver — single global rAF loop that notifies subscribers on scroll.
 *
 * Motion v4 rule: never create per-instance scroll listeners. Every ParallaxScene
 * subscribes here; we tick once per frame and hand each subscriber its own
 * bounding rect + viewport progress (-1 → 1, 0 = element centered).
 *
 * Notes:
 *  • SSR-safe: exports are no-ops when window is undefined.
 *  • Subscribers gated by IntersectionObserver externally — we still deliver
 *    ticks so the callback can decide to update (cheap: just a getBoundingClientRect).
 *  • Auto-shutdown when no subscribers remain.
 */

export type ScrollSubscriber = (progress: number, rect: DOMRect) => void;

interface Entry {
  el: HTMLElement;
  cb: ScrollSubscriber;
  active: boolean;
}

const entries = new Set<Entry>();
let rafId = 0;
let running = false;

function tick() {
  running = entries.size > 0;
  if (!running) {
    rafId = 0;
    return;
  }
  const vh = window.innerHeight || 1;
  for (const e of entries) {
    if (!e.active) continue;
    const rect = e.el.getBoundingClientRect();
    // progress: -1 when element sits fully above viewport center,
    // +1 when fully below; 0 when centered.
    const center = rect.top + rect.height / 2;
    const raw = (center - vh / 2) / (vh / 2 + rect.height / 2);
    const clamped = Math.max(-1, Math.min(1, raw));
    e.cb(clamped, rect);
  }
  rafId = requestAnimationFrame(tick);
}

function ensureRunning() {
  if (running || typeof window === "undefined") return;
  running = true;
  rafId = requestAnimationFrame(tick);
}

export function subscribeScroll(el: HTMLElement, cb: ScrollSubscriber) {
  if (typeof window === "undefined") return () => {};
  const entry: Entry = { el, cb, active: true };
  entries.add(entry);

  // IntersectionObserver activates the entry only when near/in viewport.
  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      (obs) => {
        for (const o of obs) entry.active = o.isIntersecting;
      },
      { rootMargin: "20% 0px 20% 0px" },
    );
    io.observe(el);
  }

  ensureRunning();
  return () => {
    entries.delete(entry);
    io?.disconnect();
    if (!entries.size && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      running = false;
    }
  };
}
