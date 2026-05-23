// Drift i18n — auto-detects navigator.language and resolves a tiny dictionary
// of visible UI strings (convergence labels, CTAs, encouragements, chapter
// whispers/hints). PT is canonical; EN is a respectful translation.
//
// Override with `?lang=en` on the URL for testing. Falls back to PT.
//
// NOTE: We intentionally keep the dictionary small. AI-generated story text
// is locale-aware on the server side via `revealJourney({ locale })`.

import { useEffect, useState } from "react";

export type DriftLocale = "pt" | "en";

type Dict = Record<string, string>;

const PT: Dict = {
  // Convergence
  "reveal.eyebrow": "o teu dia, composto",
  "reveal.stops": "paragens",
  "reveal.road": "de estrada",
  "reveal.departure": "partida de",
  "reveal.drive_from_prev": "min de estrada",
  "reveal.no_day": "ainda não há um dia possível para este pedido — fala com um local.",
  "reveal.open_all_day": "aberto todo o dia",
  "reveal.map_label": "o teu trajecto",

  // CTAs (defaults if Supabase voice is empty)
  "cta.book": "reservar este dia",
  "cta.save": "guardar para depois",
  "cta.refine": "refinar com um local",
  "cta.explore": "explorar tudo",

  // Encouragements (shown above progress bar at key moments)
  "enc.start": "um traço de Portugal",
  "enc.middle": "a forma começa a aparecer",
  "enc.late": "já há um dia a ganhar corpo",
  "enc.near": "a revelação está pronta",

  // Text phase
  "text.continue": "continuar",

  // Exit
  "ui.exit": "sair",
};

const EN: Dict = {
  "reveal.eyebrow": "your day, composed",
  "reveal.stops": "stops",
  "reveal.road": "on the road",
  "reveal.departure": "departing from",
  "reveal.drive_from_prev": "min drive",
  "reveal.no_day": "we couldn't compose a day for this request yet — speak to a local.",
  "reveal.open_all_day": "open all day",
  "reveal.map_label": "your route",

  "cta.book": "book this day",
  "cta.save": "save for later",
  "cta.refine": "refine with a local",
  "cta.explore": "explore everything",

  "enc.start": "a trace of Portugal",
  "enc.middle": "the shape is emerging",
  "enc.late": "a day is taking form",
  "enc.near": "the reveal is ready",

  "text.continue": "continue",

  "ui.exit": "exit",
};

const DICTS: Record<DriftLocale, Dict> = { pt: PT, en: EN };

function detect(): DriftLocale {
  if (typeof window === "undefined") return "pt";
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("lang");
    if (q === "en" || q === "pt") return q;
  } catch {
    /* noop */
  }
  const nav =
    typeof navigator !== "undefined" ? (navigator.language || "pt").toLowerCase() : "pt";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}

export function useDriftLocale(): DriftLocale {
  const [loc, setLoc] = useState<DriftLocale>("pt");
  useEffect(() => {
    setLoc(detect());
  }, []);
  return loc;
}

export function t(key: string, locale: DriftLocale): string {
  return DICTS[locale][key] ?? DICTS.pt[key] ?? key;
}
