import { useEffect, useState } from "react";

type ListenerRecord = {
  id: number;
  type: string;
  target: string;
  passive: boolean | null;
  capture: boolean | null;
};

type ObserverRecord = {
  id: number;
  root: string;
  rootMargin: string;
  threshold: string;
  targets: Set<string>;
};

export type ScrollDebugFlags = {
  enabled: boolean;
  disableHashSync: boolean;
  disableStickyCta: boolean;
  disableMobileReveals: boolean;
  staticMobileCarousels: boolean;
  disableMobileStudioMotion: boolean;
  /**
   * Reveal debug overlay: when ?scroll-debug=reveal-debug (or ?reveal-debug)
   * is in the URL, every IntersectionObserver/sweep trigger logs to the
   * console and flashes a visible outline + label badge on the affected
   * element. Useful on mobile where the dev tools console isn't visible.
   */
  revealDebug: boolean;
};

declare global {
  interface Window {
    __yesScrollDebug?: {
      listeners: ListenerRecord[];
      observers: ObserverRecord[];
      report: () => unknown;
    };
  }
}

const EMPTY_FLAGS: ScrollDebugFlags = {
  enabled: false,
  disableHashSync: false,
  disableStickyCta: false,
  disableMobileReveals: false,
  staticMobileCarousels: false,
  disableMobileStudioMotion: false,
  revealDebug: false,
};

function tokensFromUrl(win: Window): Set<string> {
  const params = new URLSearchParams(win.location.search);
  if (!params.has("scroll-debug")) return new Set();
  const raw = params.get("scroll-debug") ?? "";
  return new Set(
    raw
      .split(/[,+\s]+/)
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getScrollDebugFlags(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): ScrollDebugFlags {
  if (!win) return EMPTY_FLAGS;
  const params = new URLSearchParams(win.location.search);
  // Standalone shortcut: ?reveal-debug enables reveal debug without
  // pulling in the rest of the scroll-debug instrumentation.
  const standaloneRevealDebug = params.has("reveal-debug");
  if (!params.has("scroll-debug")) {
    return standaloneRevealDebug
      ? { ...EMPTY_FLAGS, enabled: true, revealDebug: true }
      : EMPTY_FLAGS;
  }
  const tokens = tokensFromUrl(win);
  const all = tokens.has("all");
  return {
    enabled: true,
    disableHashSync: all || tokens.has("hash-off") || tokens.has("no-hash-sync"),
    disableStickyCta: all || tokens.has("sticky-off") || tokens.has("no-sticky-cta"),
    disableMobileReveals: all || tokens.has("reveals-off") || tokens.has("no-mobile-reveals"),
    staticMobileCarousels: all || tokens.has("carousels-off") || tokens.has("static-carousels"),
    disableMobileStudioMotion: all || tokens.has("studio-static") || tokens.has("no-studio-motion"),
    revealDebug: standaloneRevealDebug || tokens.has("reveal-debug") || tokens.has("debug-reveals"),
  };
}

export function useScrollDebugFlags() {
  const [flags, setFlags] = useState<ScrollDebugFlags>(EMPTY_FLAGS);

  useEffect(() => {
    setFlags(getScrollDebugFlags());
  }, []);

  return flags;
}

function describeTarget(target: EventTarget | null): string {
  if (!target) return "unknown";
  if (target === window) return "window";
  if (target === document) return "document";
  if (target instanceof Element) return selectorFor(target);
  return target.constructor?.name ?? "EventTarget";
}

function selectorFor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes =
    typeof el.className === "string"
      ? el.className
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 4)
          .map((c) => `.${CSS.escape(c)}`)
          .join("")
      : "";
  return `${tag}${id}${classes}`;
}

function compactElement(el: Element) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return {
    selector: selectorFor(el),
    position: style.position,
    overflowX: style.overflowX,
    snapType: style.scrollSnapType,
    snapAlign: style.scrollSnapAlign,
    width: Math.round(rect.width),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    classes: typeof el.className === "string" ? el.className.slice(0, 180) : "",
  };
}

export function installScrollDebugInstrumentation(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
) {
  if (!win || win.__yesScrollDebug || !getScrollDebugFlags(win).enabled) return;
  const eventTargetCtor = (win as Window & typeof globalThis).EventTarget;
  if (!eventTargetCtor) return;

  const listeners: ListenerRecord[] = [];
  const observers: ObserverRecord[] = [];
  let nextListenerId = 1;
  let nextObserverId = 1;

  const originalAdd = eventTargetCtor.prototype.addEventListener;
  const originalRemove = eventTargetCtor.prototype.removeEventListener;

  eventTargetCtor.prototype.addEventListener = function addEventListenerDebug(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (type === "scroll") {
      listeners.push({
        id: nextListenerId++,
        type,
        target: describeTarget(this),
        passive: typeof options === "object" ? (options.passive ?? null) : null,
        capture: typeof options === "boolean" ? options : (options?.capture ?? null),
      });
    }
    return originalAdd.call(this, type, listener, options);
  };

  eventTargetCtor.prototype.removeEventListener = function removeEventListenerDebug(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    if (type === "scroll") {
      const target = describeTarget(this);
      const idx = listeners.findIndex((record) => record.type === type && record.target === target);
      if (idx >= 0) listeners.splice(idx, 1);
    }
    return originalRemove.call(this, type, listener, options);
  };

  if ("IntersectionObserver" in win) {
    const OriginalIntersectionObserver = win.IntersectionObserver as typeof IntersectionObserver;
    const WrappedIntersectionObserver = function (
      this: IntersectionObserver,
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      const record: ObserverRecord = {
        id: nextObserverId++,
        root: options?.root instanceof Element ? selectorFor(options.root) : "viewport",
        rootMargin: options?.rootMargin ?? "0px",
        threshold: JSON.stringify(options?.threshold ?? 0),
        targets: new Set<string>(),
      };
      observers.push(record);
      const io = new OriginalIntersectionObserver(callback, options);
      const originalObserve = io.observe.bind(io);
      const originalUnobserve = io.unobserve.bind(io);
      const originalDisconnect = io.disconnect.bind(io);
      io.observe = (target: Element) => {
        record.targets.add(selectorFor(target));
        return originalObserve(target);
      };
      io.unobserve = (target: Element) => {
        record.targets.delete(selectorFor(target));
        return originalUnobserve(target);
      };
      io.disconnect = () => {
        const idx = observers.indexOf(record);
        if (idx >= 0) observers.splice(idx, 1);
        return originalDisconnect();
      };
      return io;
    } as unknown as typeof IntersectionObserver;
    WrappedIntersectionObserver.prototype = OriginalIntersectionObserver.prototype;
    win.IntersectionObserver = WrappedIntersectionObserver;
  }

  win.__yesScrollDebug = {
    listeners,
    observers,
    report: () => reportScrollDebug(win),
  };
}

export function reportScrollDebug(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
) {
  if (!win) return null;
  const doc = win.document;
  const viewport = win.innerWidth;
  const all = [doc.documentElement, doc.body, ...Array.from(doc.body.querySelectorAll("*"))];

  const fixed = all.filter((el) => getComputedStyle(el).position === "fixed").map(compactElement);
  const sticky = all.filter((el) => getComputedStyle(el).position === "sticky").map(compactElement);
  const overflowX = all
    .filter((el) => !["visible", "clip"].includes(getComputedStyle(el).overflowX))
    .map(compactElement);
  const scrollSnap = all
    .filter((el) => {
      const style = getComputedStyle(el);
      return style.scrollSnapType !== "none" || style.scrollSnapAlign !== "none";
    })
    .map(compactElement);
  const widerThanViewport = all
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > viewport + 1 || rect.left < -1 || rect.right > viewport + 1;
    })
    .map(compactElement);
  const viewportUnits = all
    .filter((el) => {
      const classAttr = typeof el.className === "string" ? el.className : "";
      const styleAttr = el.getAttribute("style") ?? "";
      return /(?:^|\s)(?:min-)?h-\[[^\]]*(?:vh|svh|dvh)|(?:height|min-height)\s*:[^;]*(?:vh|svh|dvh)/.test(
        `${classAttr} ${styleAttr}`,
      );
    })
    .map(compactElement);
  const scrollAnimated = all
    .filter((el) =>
      el.matches(
        ".reveal, .reveal-stagger, .he-parallax, .he-parallax-counter, .studio-live, .slv-pin, .slv-moment, .builder-reveal",
      ),
    )
    .map(compactElement);

  const report = {
    fixed,
    sticky,
    overflowX,
    scrollSnap,
    widerThanViewport,
    viewportUnits,
    activeScrollListeners: win.__yesScrollDebug?.listeners ?? [],
    intersectionObservers: (win.__yesScrollDebug?.observers ?? []).map((record) => ({
      id: record.id,
      root: record.root,
      rootMargin: record.rootMargin,
      threshold: record.threshold,
      targets: Array.from(record.targets),
    })),
    scrollAnimated,
  };

  console.groupCollapsed("YES scroll debug report");
  Object.entries(report).forEach(([key, value]) => {
    console.log(key, value);
    if (Array.isArray(value)) console.table(value);
  });
  console.groupEnd();
  return report;
}

export function applyScrollDebugClasses(flags: ScrollDebugFlags) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("scroll-debug", flags.enabled);
  document.documentElement.classList.toggle(
    "scroll-debug-mobile-reveals-off",
    flags.disableMobileReveals,
  );
  document.documentElement.classList.toggle(
    "scroll-debug-studio-static",
    flags.disableMobileStudioMotion,
  );
  document.documentElement.classList.toggle(
    "scroll-debug-static-carousels",
    flags.staticMobileCarousels,
  );
}

installScrollDebugInstrumentation();
