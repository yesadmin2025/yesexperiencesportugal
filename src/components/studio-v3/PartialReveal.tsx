// Studio V3 — PartialReveal (Destination phase)
//
// Cinematic micro-reveal that fires the moment the traveller picks a
// destinationIntent. Shows:
//   • a teal eyebrow with the region name
//   • 2–3 ghost stop names (50% opacity, Georgia italic) drawn ONLY from
//     REGION_STOP_POOL (zero invention — every label is source-verified)
//   • a short italic bridging line
//
// Purpose: anchor the traveller emotionally in Portugal BEFORE the
// Investment tier ask in the next step. The visual hierarchy stays
// minimal so the page still feels editorial, not cluttered.
//
// Reduced-motion: stops fade in instantly with no translate.

import { useEffect, useMemo, useState } from "react";
import type { DestinationIntent } from "./types";
import { REGION_STOP_POOL } from "@/data/regionStopPool";

const REGION_LABEL: Record<
  Exclude<DestinationIntent, "no-preference" | "anywhere-special">,
  string
> = {
  "lisbon-sintra-cascais": "Lisbon · Sintra · Cascais",
  "arrabida-setubal-azeitao": "Arrábida · Setúbal · Azeitão",
  "alentejo-evora-wine": "Alentejo · Évora · Wine country",
  "alentejo-roman-talha": "Vila de Frades · Roman Alentejo · Talha wine",
  "vicentine-coast": "Vicentine coast · Alentejo & Algarve",
  "spiritual-coast": "Fátima · Nazaré · Óbidos",
  "central-portugal": "Tomar · Coimbra · Centro",
  "comporta-troia": "Comporta · Tróia",
};

const REGION_BRIDGE: Record<
  Exclude<DestinationIntent, "no-preference" | "anywhere-special">,
  string
> = {
  "lisbon-sintra-cascais": "Palaces, pine and Atlantic light are taking shape.",
  "arrabida-setubal-azeitao": "Cellars, coves and quiet roads start to surface.",
  "alentejo-evora-wine": "Long lunches and open plains are gathering form.",
  "alentejo-roman-talha": "A 2,000-year-old wine tradition, poured from clay.",
  "vicentine-coast": "One of Portugal's wildest, quietest coasts starts to unfold.",
  "spiritual-coast": "Sanctuaries, cliffs and walled towns rise into view.",
  "central-portugal": "Templar stones and scholarly streets begin to draw.",
  "comporta-troia": "Pine, rice fields and white sand draw closer.",
};

/**
 * Map our destinationIntent ids to the REGION_STOP_POOL.region values.
 * Some intents span multiple data regions — we accept any matching pool
 * stop so the ghost list is always real.
 */
const INTENT_TO_POOL_REGIONS: Record<
  Exclude<DestinationIntent, "no-preference" | "anywhere-special">,
  ReadonlyArray<string>
> = {
  "lisbon-sintra-cascais": ["sintra-cascais"],
  "arrabida-setubal-azeitao": ["arrabida-setubal"],
  "alentejo-evora-wine": ["alentejo-evora"],
  "alentejo-roman-talha": ["alentejo-evora"],
  "vicentine-coast": [],
  "spiritual-coast": ["fatima-nazare-obidos"],
  "central-portugal": ["tomar-coimbra"],
  "comporta-troia": ["comporta-troia"],
};

function ghostStopsFor(intent: DestinationIntent): string[] {
  if (intent === "no-preference" || intent === "anywhere-special") return [];
  const wanted = new Set(INTENT_TO_POOL_REGIONS[intent] ?? []);
  const pool = REGION_STOP_POOL.filter((s) => s.active && wanted.has(s.region)).map((s) => s.name);
  // Dedupe + cap at 3. Stable order from REGION_STOP_POOL declaration.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of pool) {
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * Pass 2A: when the persistent Living Day is on screen it already owns the
 * "here is your day forming" job. To avoid two competing previews, this
 * reveal drops its ghost-stop list and stays a light region cue only.
 */
export function PartialReveal({
  intent,
  compact = false,
}: {
  intent: DestinationIntent | null;
  compact?: boolean;
}) {
  const stops = useMemo(() => (intent ? ghostStopsFor(intent) : []), [intent]);
  const label =
    intent && intent !== "no-preference" && intent !== "anywhere-special"
      ? REGION_LABEL[intent]
      : null;
  const bridge =
    intent && intent !== "no-preference" && intent !== "anywhere-special"
      ? REGION_BRIDGE[intent]
      : null;

  // Stagger the ghost stops in with a tiny mount delay per index so the
  // reveal feels composed, not all-at-once. Reduced motion → instant.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!intent) {
      setMounted(false);
      return;
    }
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, [intent]);

  if (!intent || stops.length === 0 || !label) return null;

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      data-testid="studio-v3-partial-reveal"
      data-compact={compact ? "1" : "0"}
      className="mx-auto mt-5 max-w-[34ch] text-center"
      aria-live="polite"
    >
      <div
        className="text-[10.5px] font-medium uppercase tracking-[0.26em]"
        style={{ color: "var(--gold)" }}
      >
        {label}
      </div>
      {compact ? null : (
      <ul className="mt-3 space-y-1.5">
        {stops.map((name, i) => {
          const showAt = prefersReduced ? 0 : 120 + i * 180;
          return (
            <li
              key={name}
              className="text-[13.5px] leading-[1.55]"
              style={{
                fontFamily: "var(--font-editorial)",
                fontStyle: "italic",
                color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                opacity: mounted ? 0.55 : 0,
                transform: mounted ? "translateY(0)" : "translateY(6px)",
                transition: prefersReduced
                  ? "opacity 120ms ease-out"
                  : `opacity 420ms ease-out ${showAt}ms, transform 420ms ease-out ${showAt}ms`,
              }}
            >
              {name}
            </li>
          );
        })}
      </ul>
      )}
      <p
        className={compact ? "mt-2 text-[12px] leading-[1.55]" : "mt-4 text-[12px] leading-[1.55]"}
        style={{
          fontFamily: "var(--font-editorial)",
          fontStyle: "italic",
          color: "color-mix(in oklab, var(--teal) 78%, transparent)",
        }}
      >
        {bridge}
      </p>
    </div>
  );
}
