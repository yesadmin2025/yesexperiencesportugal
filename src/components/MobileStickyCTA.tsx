import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Compass, Sparkles, X } from "lucide-react";
import { usePastHero } from "@/hooks/use-past-hero";
import { useScrollDebugFlags } from "@/lib/scroll-debug";

/**
 * MobileStickyCTA
 *
 * A calm, premium sticky CTA bar shown only on small screens (< lg) once the
 * user has scrolled past the hero. Tapping the primary action ("Say YES")
 * opens a small bottom sheet that exposes the two true entry points to the
 * journey: explore the Signature Experiences, or design & secure a fully
 * private one from scratch. (A signature pick can still be tailored from
 * the experience page itself, so the two-option sheet covers all three
 * paths the brand promises: explore, customize, design.)
 *
 * Intent tracking strategy
 * ------------------------
 * Many analytics stacks may be present (GA4 via gtag, GTM via dataLayer, or
 * neither yet). We push to all available channels safely — no hard
 * dependencies, no console errors if nothing is wired up — and we also fire
 * a DOM CustomEvent ("yes:cta_intent") so any future tracking layer can
 * subscribe without us needing to re-touch this component.
 */

type IntentCta =
  | "say_yes_open" // user opened the choice sheet
  | "explore_signature" // chose to browse signature experiences
  | "design_private"; // chose to design a private experience

type IntentDetail = {
  cta: IntentCta;
  surface: "mobile_sticky";
  path: string;
  scroll_y: number;
  ts: number;
};

type GtagFn = (command: "event", eventName: string, params?: Record<string, unknown>) => void;

type DataLayerEntry = Record<string, unknown>;

interface TrackingWindow extends Window {
  dataLayer?: DataLayerEntry[];
  gtag?: GtagFn;
}

function trackIntent(detail: IntentDetail) {
  if (typeof window === "undefined") return;
  const w = window as TrackingWindow;

  try {
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: "cta_intent", ...detail });
    }
  } catch {
    /* swallow — tracking must never break UX */
  }

  try {
    if (typeof w.gtag === "function") {
      w.gtag("event", "cta_intent", detail);
    }
  } catch {
    /* noop */
  }

  try {
    window.dispatchEvent(new CustomEvent<IntentDetail>("yes:cta_intent", { detail }));
  } catch {
    /* noop */
  }
}

function buildDetail(cta: IntentCta): IntentDetail {
  return {
    cta,
    surface: "mobile_sticky",
    path: typeof window !== "undefined" ? window.location.pathname : "/",
    scroll_y: typeof window !== "undefined" ? Math.round(window.scrollY) : 0,
    ts: Date.now(),
  };
}

export function MobileStickyCTA() {
  const scrollDebug = useScrollDebugFlags();
  // Shared visibility gate — same threshold, persistence, and BFCache
  // handling that <FloatingActions> uses.
  const visible = usePastHero({
    threshold: 600,
    mediaQuery: "(max-width: 1023.98px)",
  });

  // Submit-lock for the choice links — prevents double-taps from firing
  // two navigations / two analytics events.
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Choice-sheet visibility. The bar's primary "Say YES" button toggles
  // this; the sheet itself is the surface that funnels into the two
  // routes (explore signature / design private).
  const [sheetOpen, setSheetOpen] = useState(false);
  const firstChoiceRef = useRef<HTMLAnchorElement | null>(null);

  const isRouterLoading = useRouterState({
    select: (s) => s.isLoading || s.status === "pending",
  });

  // Release the submit lock once routing has settled (or after a safety
  // timeout) so the CTA can never get stuck disabled.
  useEffect(() => {
    if (!submitting) return;
    if (!isRouterLoading) {
      const t = window.setTimeout(() => {
        submittingRef.current = false;
        setSubmitting(false);
        setSheetOpen(false);
      }, 50);
      return () => window.clearTimeout(t);
    }
    const safety = window.setTimeout(() => {
      submittingRef.current = false;
      setSubmitting(false);
    }, 4000);
    return () => window.clearTimeout(safety);
  }, [submitting, isRouterLoading]);

  // BFCache restore: reset locks/sheet so the CTA is interactive again.
  useEffect(() => {
    const onPageShow = () => {
      submittingRef.current = false;
      setSubmitting(false);
      setSheetOpen(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Close the sheet on Escape and when the bar itself is hidden by the
  // hero scroll-gate (e.g. user scrolled back into the hero with the
  // sheet open — keep the experience tidy).
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Move focus to the first choice so AT users land inside the sheet.
    const t = window.setTimeout(() => firstChoiceRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!visible && sheetOpen) setSheetOpen(false);
  }, [visible, sheetOpen]);

  // Lift the WhatsApp FAB above the sticky bar (~64px + safe area) via a
  // CSS custom property. Clears the var when the bar hides so the FAB
  // returns to its resting position. Any surface can opt-in by reading
  // `bottom: calc(... + var(--fab-lift, 0px))`.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (visible) {
      root.style.setProperty("--fab-lift", "72px");
    } else {
      root.style.removeProperty("--fab-lift");
    }
    return () => {
      root.style.removeProperty("--fab-lift");
    };
  }, [visible]);

  const handleSayYes = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (submittingRef.current) {
      e.preventDefault();
      return;
    }
    const next = !sheetOpen;
    setSheetOpen(next);
    if (next) trackIntent(buildDetail("say_yes_open"));
  };

  const handleChoice =
    (cta: Exclude<IntentCta, "say_yes_open">) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (submittingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      submittingRef.current = true;
      setSubmitting(true);
      trackIntent(buildDetail(cta));
    };

  if (scrollDebug.disableStickyCta) return null;

  return (
    <>
      {/* ---------- Choice sheet ---------- */}
      {/* Lives above the bar so its scrim covers the page but not the bar
          itself, keeping the "Say YES" affordance visible while choosing. */}
      <div
        className={[
          "lg:hidden fixed inset-0 z-30 print:hidden transition-opacity duration-300",
          sheetOpen && visible
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-hidden={!(sheetOpen && visible)}
        onClick={() => setSheetOpen(false)}
      >
        <div className="absolute inset-0 bg-[color:var(--charcoal)]/40 backdrop-blur-[2px]" />
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="yes-choice-title"
        aria-hidden={!(sheetOpen && visible)}
        inert={!(sheetOpen && visible)}
        className={[
          "lg:hidden fixed inset-x-0 z-40 print:hidden",
          // Sit just above the sticky bar (bar ~64px tall + safe area).
          "bottom-[calc(64px+env(safe-area-inset-bottom))]",
          "transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] will-change-transform",
          sheetOpen && visible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        ].join(" ")}
      >
        <div className="mx-3 mb-2 bg-white border border-[color:var(--charcoal-soft)] shadow-[0_18px_50px_-22px_rgba(15,23,42,0.35)]">
          <div className="flex items-start justify-between px-5 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)]">
                Two ways in
              </p>
              <p
                id="yes-choice-title"
                className="serif italic text-[17px] leading-tight text-[color:var(--charcoal)] mt-1"
              >
                Where shall we begin?
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close"
              className="p-1 -mr-1 text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-3 pt-3 pb-4 grid gap-2">
            <Link
              ref={firstChoiceRef}
              to="/experiences"
              onClick={handleChoice("explore_signature")}
              data-cta="explore_signature"
              data-cta-surface="mobile_sticky"
              className="group flex items-center gap-3 px-3 py-3 border border-[color:var(--charcoal-soft)] hover:bg-[color:var(--sand)] transition-colors"
            >
              <span className="shrink-0 w-9 h-9 inline-flex items-center justify-center bg-[color:var(--sand)] text-[color:var(--teal)] border border-[color:var(--charcoal-soft)]">
                <Compass size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block serif text-[15px] leading-tight text-[color:var(--charcoal)]">
                  Explore Signature Experiences
                </span>
                <span className="block text-[11px] text-[color:var(--charcoal-soft)] mt-0.5">
                  Hand-picked journeys, ready to tailor.
                </span>
              </span>
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="text-[color:var(--gold-deep)] group-hover:text-[color:var(--charcoal)] group-hover:translate-x-0.5 transition-[color,transform]"
              />
            </Link>

            <Link
              to="/studio-v3"
              onClick={handleChoice("design_private")}
              data-cta="design_private"
              data-cta-surface="mobile_sticky"
              className="group flex items-center gap-3 px-3 py-3 bg-[color:var(--teal)] text-white hover:bg-[color:var(--teal-2)] transition-colors"
            >
              <span className="shrink-0 w-9 h-9 inline-flex items-center justify-center bg-white/10 text-white border border-white/30">
                <Sparkles size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block serif text-[15px] leading-tight">
                  Design &amp; Secure Your Own
                </span>
                <span className="block text-[11px] text-white/80 mt-0.5">
                  A private experience, built around you.
                </span>
              </span>
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="bg-[color:var(--teal)] text-[color:var(--gold-soft)] group-hover:text-[color:var(--gold)] group-hover:translate-x-0.5 transition-[color,transform]"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* ---------- Sticky bar ---------- */}
      <div
        className={[
          "lg:hidden fixed inset-x-0 bottom-0 z-40 print:hidden",
          "transition-all duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] will-change-transform",
          visible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none",
        ].join(" ")}
        aria-hidden={!visible}
        inert={!visible}
      >
        <div className="h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />

        <div
          className="bg-white border-t border-[color:var(--charcoal)]/15 shadow-[0_-8px_28px_-18px_rgba(15,23,42,0.18)]"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        >
          <div className="px-3.5 py-2 flex items-center gap-2.5">
            {/* Left — branded promise. Compact two-line label. */}
            <div className="min-w-0 flex-1">
              <p className="serif italic text-[13px] leading-tight text-[color:var(--charcoal)] truncate">
                Your Portugal, Your Way
              </p>
              <p className="text-[9px] xs:text-[9.5px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)] mt-0.5 truncate">
                Private. Local. Curated.
              </p>
            </div>

            {/* Primary CTA — slimmer pill so the bar feels supportive,
                not blocking. Tap target preserved at 40px height. */}
            <button
              type="button"
              onClick={handleSayYes}
              tabIndex={visible && !submitting ? 0 : -1}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-controls="yes-choice-title"
              aria-disabled={submitting}
              aria-busy={submitting}
              data-cta="say_yes_open"
              data-cta-surface="mobile_sticky"
              data-state={submitting ? "submitting" : sheetOpen ? "open" : "idle"}
              className={[
                "group inline-flex items-center gap-1.5 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-white",
                "border border-[color:var(--gold)]/60 hover:border-[color:var(--gold)] px-3.5 py-2 text-[10.5px] font-semibold tracking-[0.1em] uppercase whitespace-nowrap",
                "shadow-[0_6px_18px_-10px_rgba(41,91,97,0.55)] hover:shadow-[0_10px_24px_-12px_rgba(201,169,106,0.45)]",
                "transition-[opacity,background-color,box-shadow,border-color,transform] duration-300",
                "hover:-translate-y-[1px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                submitting ? "opacity-70 pointer-events-none cursor-default" : "",
              ].join(" ")}
              aria-label="Start your experience — choose how to begin"
            >
              {submitting ? "Opening…" : "Start Your Experience"}
              <ArrowRight
                size={12}
                className={[
                  "text-[color:var(--gold-soft)] transition-[color,transform] duration-300",
                  sheetOpen ? "-rotate-90" : "group-hover:translate-x-0.5",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
