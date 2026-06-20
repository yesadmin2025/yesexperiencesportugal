import { useEffect, useState } from "react";

/**
 * Motion-QA diagnostic panel.
 *
 * Activates ONLY when the URL contains `?motion-qa=1`. Renders a small
 * fixed read-out reporting the live state of the homepage motion system:
 *
 *   - total / visible / hidden reveal-class elements
 *   - whether IntersectionObserver fired at least once
 *   - whether the 1200ms fail-safe fired
 *   - prefers-reduced-motion state
 *   - scroll-debug class state on <html>
 *   - iframe / sandbox detection
 *   - whether the key `.reveal` keyframes are present in CSSOM
 *
 * No side-effects: this panel only reads state. It never forces visibility,
 * never mutates classes, never intercepts events. Safe to leave on in any
 * environment when the flag is set.
 */

type Telemetry = {
  reveal: {
    total: number;
    pending: number;
    io: number;
    sweepInitial: number;
    sweepDelayed: number;
  };
  sectionEnter: {
    total: number;
    pending: number;
    io: number;
    sweepInitial: number;
    sweepDelayed: number;
  };
  ioFired?: boolean;
  failSafeFired?: boolean;
  iframeFallbackFired?: boolean;
  timings?: Array<{
    section: string;
    source: string;
    atMs: number;
    fold: string;
    durationMs: number;
    delayMs: number;
    realisticallyVisible: boolean;
    note: string;
  }>;
};

function readQueryFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("motion-qa") === "1";
  } catch {
    return false;
  }
}

function readVisibleTestFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("motion-visible-test") === "1";
  } catch {
    return false;
  }
}

function detectIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent → access throws → we ARE in a sandboxed iframe.
    return true;
  }
}

function countReveals() {
  if (typeof document === "undefined") return { total: 0, visible: 0 };
  const els = document.querySelectorAll(".reveal, .reveal-stagger, .section-enter");
  let visible = 0;
  els.forEach((el) => {
    if (el.classList.contains("is-visible")) visible += 1;
  });
  return { total: els.length, visible };
}

/**
 * Best-effort detection that the `.reveal` entrance keyframes are loaded.
 * We don't iterate every stylesheet (many are cross-origin in preview);
 * instead we read the computed `transition-property` of a probe element
 * carrying `.reveal`. If CSS loaded, `transition-property` will include
 * `opacity` / `transform`. If CSS failed to load, it'll be `all` or `none`.
 */
function probeRevealCssLoaded(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("div");
  probe.className = "reveal";
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  probe.style.pointerEvents = "none";
  probe.setAttribute("aria-hidden", "true");
  document.body.appendChild(probe);
  try {
    const cs = getComputedStyle(probe);
    const props = cs.transitionProperty || "";
    return /opacity/.test(props) && /transform/.test(props);
  } finally {
    probe.remove();
  }
}

export function MotionQaPanel() {
  const [active, setActive] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setActive(readQueryFlag());
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const t = (window as unknown as { __yesRevealTelemetry?: Telemetry }).__yesRevealTelemetry;
  const counts = countReveals();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inIframe = detectIframe();
  const cssLoaded = probeRevealCssLoaded();
  const scrollDebugClasses = Array.from(document.documentElement.classList).filter((c) =>
    c.startsWith("scroll-debug-"),
  );

  const ioFired = t?.ioFired === true;
  const failSafeFired = t?.failSafeFired === true;
  const hidden = counts.total - counts.visible;
  const visibleTest = readVisibleTestFlag();
  const sections = [
    "Trust strip",
    "Three Ways / Studio",
    "Why YES",
    "Signature Experiences",
    "Occasions / Groups",
    "FAQ",
    "Final CTA / Footer",
  ].map((name) => {
    const hits = (t?.timings ?? []).filter((x) => x.section === name);
    const first = hits[0];
    return { name, first, hits };
  });

  // One-shot console report so devs can grep without opening the panel.
  if (tick === 0) {
    console.info("[motion-qa] active", {
      total: counts.total,
      visible: counts.visible,
      hidden,
      ioFired,
      failSafeFired,
      reducedMotion: reduced,
      inIframe,
      cssLoaded,
      visibleTest,
      scrollDebugClasses,
      telemetry: t,
    });
  }

  const Row = ({ k, v, ok }: { k: string; v: string | number; ok?: boolean | null }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ opacity: 0.75 }}>{k}</span>
      <span style={{ color: ok === false ? "#ff8a8a" : ok === true ? "#a6e3a1" : "var(--ivory)" }}>
        {String(v)}
      </span>
    </div>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      data-motion-qa="1"
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 99999,
        width: 320,
        maxHeight: "72vh",
        overflow: "auto",
        padding: 10,
        background: "rgba(20,20,20,0.92)",
        color: "var(--ivory)",
        font: "600 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace",
        border: "1px solid rgba(201,169,106,0.55)",
        borderRadius: 6,
        boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
        pointerEvents: "auto",
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ color: "var(--gold)", marginBottom: 2 }}>motion-qa · live</div>
      <Row k="total" v={counts.total} />
      <Row
        k="visible"
        v={counts.visible}
        ok={counts.total > 0 && counts.visible === counts.total}
      />
      <Row k="hidden" v={hidden} ok={hidden === 0} />
      <Row k="IO fired" v={ioFired ? "yes" : "no"} ok={ioFired} />
      <Row k="fail-safe fired" v={failSafeFired ? "yes" : "no"} />
      <Row k="reduced-motion" v={reduced ? "ON" : "off"} />
      <Row k="iframe" v={inIframe ? "yes" : "no"} />
      <Row k="reveal CSS" v={cssLoaded ? "loaded" : "missing"} ok={cssLoaded} />
      <Row k="visible-test" v={visibleTest ? "ON" : "off"} />
      <Row k="scroll-debug" v={scrollDebugClasses.length ? scrollDebugClasses.join(",") : "off"} />
      {/* Home motion controller (data-motion) — single source of truth on the homepage. */}
      {(() => {
        const hm = (
          window as unknown as {
            __yesHomeMotion?: {
              total: number;
              triggered: number;
              pending: number;
              reducedMotion: boolean;
              ready: boolean;
              active: boolean;
            };
          }
        ).__yesHomeMotion;
        if (!hm) return <Row k="data-motion" v="not active" ok={false} />;
        return (
          <>
            <Row k="data-motion total" v={hm.total} />
            <Row
              k="data-motion in"
              v={hm.triggered}
              ok={hm.total > 0 && hm.triggered === hm.total}
            />
            <Row k="data-motion pending" v={hm.pending} ok={hm.pending === 0} />
            <Row k="motion-ready" v={hm.ready ? "yes" : "no"} ok={hm.ready || hm.reducedMotion} />
            <Row k="controller" v={hm.active ? "active" : "off"} ok={hm.active} />
          </>
        );
      })()}
      {t && (
        <div style={{ opacity: 0.75, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          reveal io/init/late: {t.reveal.io}/{t.reveal.sweepInitial}/{t.reveal.sweepDelayed}
          <br />
          section io/init/late: {t.sectionEnter.io}/{t.sectionEnter.sweepInitial}/
          {t.sectionEnter.sweepDelayed}
        </div>
      )}
      {t && (
        <div
          style={{
            opacity: 0.86,
            paddingTop: 4,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "grid",
            gap: 3,
          }}
        >
          {sections.map(({ name, first, hits }) => (
            <div key={name}>
              <span style={{ color: "var(--gold)" }}>{name}</span>{" "}
              {first ? (
                <span style={{ color: first.realisticallyVisible ? "#a6e3a1" : "#ffcf8a" }}>
                  {first.source} · {first.atMs}ms · {first.fold} · {first.durationMs}+
                  {first.delayMs}ms · {first.realisticallyVisible ? "seen" : first.note}
                  {hits.length > 1 ? ` · ${hits.length} nodes` : ""}
                </span>
              ) : (
                <span style={{ color: "#ff8a8a" }}>pending</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ opacity: 0.55, fontSize: 10, paddingTop: 4 }}>?motion-qa=1 · read-only</div>
    </div>
  );
}
