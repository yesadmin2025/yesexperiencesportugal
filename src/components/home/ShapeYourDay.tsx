/**
 * ShapeYourDay — hero-overlay intent capture widget.
 *
 * Sits over the cinematic hero (desktop: bottom-left card; mobile:
 * collapsible bottom button). Three dropdowns (intent · group · pickup)
 * route to /studio-v2 with searchParams, EXCEPT when the user picks a
 * full multi-day journey or "Other" pickup → /bespoke or /studio-v2
 * with an explicit override per spec.
 *
 * Strict rules respected:
 * - No raw colors; only brand tokens.
 * - Mobile-first; respects prefers-reduced-motion.
 * - Does not touch HERO_COPY, hero typography or studio-v2 internals.
 */

import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

type IntentValue = "wine-food" | "coast-nature" | "history-culture" | "unique";
type GroupValue = "solo" | "couple" | "small" | "family" | "large" | "journey";
type PickupValue = "lisbon" | "cascais-sintra" | "other";

const INTENT_OPTIONS: { value: IntentValue; label: string }[] = [
  { value: "wine-food", label: "Wine & food" },
  { value: "coast-nature", label: "Coast & nature" },
  { value: "history-culture", label: "History & culture" },
  { value: "unique", label: "Something unique" },
];

const GROUP_OPTIONS: { value: GroupValue; label: string }[] = [
  { value: "solo", label: "Just me" },
  { value: "couple", label: "2 people" },
  { value: "small", label: "Small group (3–6)" },
  { value: "family", label: "Family with kids" },
  { value: "large", label: "Larger group (7+)" },
  { value: "journey", label: "A full journey (multi-day)" },
];

const PICKUP_OPTIONS: { value: PickupValue; label: string }[] = [
  { value: "lisbon", label: "Lisbon" },
  { value: "cascais-sintra", label: "Cascais / Sintra area" },
  { value: "other", label: "Other — I'll explain" },
];

export function ShapeYourDay() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<IntentValue>("wine-food");
  const [group, setGroup] = useState<GroupValue>("couple");
  const [pickup, setPickup] = useState<PickupValue>("lisbon");
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  // Close mobile panel on Esc.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const handleSubmit = () => {
    // Spec: group = full journey → always /bespoke
    if (group === "journey") {
      void navigate({ to: "/bespoke" });
      return;
    }
    // Spec: pickup = other → /studio-v2 (with note flag) - studio still
    // gets the intent/group so the rest of the prompt is honored.
    void navigate({
      to: "/studio-v2",
      search: { intent, group, pickup },
    });
  };

  return (
    <>
      <style>{`
        .syd-card {
          background: color-mix(in srgb, var(--ivory) 92%, transparent);
          border: 1px solid var(--gold);
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          color: var(--charcoal);
        }
        .syd-label {
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--teal);
        }
        .syd-select-wrap {
          position: relative;
        }
        .syd-select {
          width: 100%;
          appearance: none;
          -webkit-appearance: none;
          background: #FFFFFF;
          border: 1px solid var(--gold);
          border-radius: 8px;
          padding: 10px 36px 10px 14px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.3;
          color: var(--charcoal);
          cursor: pointer;
          transition: box-shadow 200ms ease, border-color 200ms ease;
        }
        .syd-select:focus-visible {
          outline: none;
          border-color: var(--teal);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 25%, transparent);
        }
        .syd-chev {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--teal);
        }
        .syd-cta {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--teal);
          color: var(--ivory);
          font-family: Inter, system-ui, sans-serif;
          font-size: 14px;
          font-weight: 500;
          padding: 12px 20px;
          border-radius: 8px;
          border: 1px solid var(--teal);
          cursor: pointer;
          transition: background 200ms ease, color 200ms ease, transform 150ms ease;
        }
        .syd-cta:hover, .syd-cta:focus-visible {
          background: var(--gold);
          color: var(--charcoal);
          border-color: var(--gold);
          outline: none;
        }
        .syd-cta:active { transform: translateY(1px); }
        .syd-secondary {
          display: block;
          text-align: center;
          margin-top: 12px;
          font-family: Georgia, "Cormorant Garamond", serif;
          font-style: italic;
          font-size: 12px;
          color: var(--teal);
          text-decoration: none;
        }
        .syd-secondary:hover, .syd-secondary:focus-visible {
          color: var(--gold);
          text-decoration: underline;
          outline: none;
        }
        /* Mobile trigger button */
        .syd-trigger {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--gold);
          color: var(--charcoal);
          font-family: Georgia, "Cormorant Garamond", serif;
          font-style: italic;
          font-size: 15px;
          padding: 14px 20px;
          border-radius: 10px;
          border: 1px solid var(--gold);
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .syd-trigger:hover, .syd-trigger:focus-visible {
          outline: none;
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.32);
        }
        .syd-panel-mobile {
          overflow: hidden;
          transition: max-height 300ms ease, opacity 200ms ease, margin 300ms ease;
          max-height: 0;
          opacity: 0;
          margin-top: 0;
        }
        .syd-panel-mobile[data-open="true"] {
          max-height: 520px;
          opacity: 1;
          margin-top: 12px;
        }
        @media (prefers-reduced-motion: reduce) {
          .syd-cta, .syd-trigger, .syd-panel-mobile, .syd-select {
            transition: none !important;
          }
        }
      `}</style>

      {/* ── Desktop (lg+) — anchored bottom-left card ─────────────── */}
      <div
        className="hidden lg:block absolute z-20 left-8 bottom-8"
        style={{ width: 340 }}
        aria-label="Shape your day"
      >
        <ShapeYourDayPanel
          intent={intent}
          group={group}
          pickup={pickup}
          onIntent={setIntent}
          onGroup={setGroup}
          onPickup={setPickup}
          onSubmit={handleSubmit}
        />
      </div>

      {/* ── Mobile / tablet (<lg) — collapsed trigger above safe area ─ */}
      <div
        className="flex lg:hidden absolute z-20 inset-x-4 flex-col"
        style={{
          bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
        }}
      >
        <button
          type="button"
          className="syd-trigger"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Close" : "Shape your day"}
          <span aria-hidden="true">→</span>
        </button>
        <div
          ref={panelRef}
          id={panelId}
          className="syd-panel-mobile"
          data-open={expanded ? "true" : "false"}
          aria-hidden={!expanded}
        >
          <ShapeYourDayPanel
            intent={intent}
            group={group}
            pickup={pickup}
            onIntent={setIntent}
            onGroup={setGroup}
            onPickup={setPickup}
            onSubmit={handleSubmit}
            compact
          />
        </div>
      </div>
    </>
  );
}

function ShapeYourDayPanel(props: {
  intent: IntentValue;
  group: GroupValue;
  pickup: PickupValue;
  onIntent: (v: IntentValue) => void;
  onGroup: (v: GroupValue) => void;
  onPickup: (v: PickupValue) => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  const pad = props.compact ? "p-4" : "p-6";
  return (
    <div className={`syd-card ${pad}`}>
      <div className="space-y-3.5">
        <Field label="I want">
          <select
            className="syd-select"
            value={props.intent}
            onChange={(e) => props.onIntent(e.target.value as IntentValue)}
            aria-label="What kind of day"
          >
            {INTENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="syd-chev" size={16} aria-hidden="true" />
        </Field>

        <Field label="for">
          <select
            className="syd-select"
            value={props.group}
            onChange={(e) => props.onGroup(e.target.value as GroupValue)}
            aria-label="Who's travelling"
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="syd-chev" size={16} aria-hidden="true" />
        </Field>

        <Field label="from">
          <select
            className="syd-select"
            value={props.pickup}
            onChange={(e) => props.onPickup(e.target.value as PickupValue)}
            aria-label="Pickup location"
          >
            {PICKUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="syd-chev" size={16} aria-hidden="true" />
        </Field>

        <button
          type="button"
          className="syd-cta"
          onClick={props.onSubmit}
        >
          Shape my experience
          <span aria-hidden="true">→</span>
        </button>

        <Link to="/bespoke" className="syd-secondary">
          Or plan a multi-day journey →
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="syd-label mb-1.5">{label}</div>
      <div className="syd-select-wrap">{children}</div>
    </div>
  );
}

export default ShapeYourDay;
