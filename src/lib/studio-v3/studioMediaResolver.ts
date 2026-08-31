/**
 * TURBO 1 — MEDIA TRUTH RESOLVER.
 *
 * Deterministic, closed hierarchy over media that ALREADY ships in the
 * project. No new schema, no DB, no generated imagery, no external URLs.
 *
 *   1. real stop image        (a stop we truly have imagery for)
 *   2. real region + activity (approved editorial operation photography)
 *   3. real mood / interest   (approved studio atmosphere library)
 *   4. approved brand fallback
 *
 * Same input ⇒ same image. Never random, never an unrelated photo, never a
 * fabricated stop picture.
 */

import type { Feeling, Interest } from "@/components/studio-v3/types";

import atmCoastal from "@/assets/studio/atm-coastal-cinematic.jpg";
import atmCultural from "@/assets/studio/atm-elegant-cultural.jpg";
import atmFood from "@/assets/studio/atm-food-local.jpg";
import atmRomantic from "@/assets/studio/atm-romantic-intimate.jpg";
import atmScenic from "@/assets/studio/atm-relaxed-scenic.jpg";
import atmSocial from "@/assets/studio/atm-social-celebratory.jpg";
import expCoastal from "@/assets/exp-coastal.jpg";
import expGastronomy from "@/assets/exp-gastronomy.jpg";
import expNature from "@/assets/exp-nature.jpg";
import expStreet from "@/assets/exp-street.jpg";
import expWine from "@/assets/exp-wine.jpg";
import editMarket from "@/assets/edit-market.jpg";
import editViewpoint from "@/assets/edit-viewpoint.jpg";

export type StudioMediaRole =
  | "studio_mood"
  | "studio_choice"
  | "studio_fork"
  | "studio_canvas"
  | "stop_preview"
  | "studio_reveal";

export type StudioMediaSource = "stop" | "region-activity" | "mood" | "fallback";

export type StudioMedia = {
  /** Stable identity — reusable later by YOUR DAY without re-resolving. */
  id: string;
  src: string;
  alt: string;
  role: StudioMediaRole;
  source: StudioMediaSource;
  /**
   * CSS `object-position` from the EXISTING catalogue focal format
   * (e.g. `"50% 40%"`). Absent = natural CSS centre. Never invented.
   */
  focal?: string;
};


/** Approved brand fallback. Always real Portugal, never a placeholder. */
const BRAND_FALLBACK = {
  id: "media:fallback:scenic",
  src: atmScenic,
  alt: "A quiet Portuguese road easing through vineyard country in late light.",
} as const;

const MOOD_MEDIA: Readonly<Record<Feeling, { id: string; src: string; alt: string }>> = {
  coastal: {
    id: "media:mood:coastal",
    src: atmCoastal,
    alt: "Atlantic cliffs near Cabo da Roca in slow gold light.",
  },
  "wine-food": {
    id: "media:mood:wine-food",
    src: atmFood,
    alt: "A long Portuguese family table set under a vine pergola.",
  },
  hidden: {
    id: "media:mood:hidden",
    src: atmScenic,
    alt: "A quiet inland road with open country on both sides.",
  },
  romance: {
    id: "media:mood:romance",
    src: atmRomantic,
    alt: "Two people walking a quiet Atlantic cliff path at dusk.",
  },
  culture: {
    id: "media:mood:culture",
    src: atmCultural,
    alt: "A stone interior with azulejo panels and soft window light.",
  },
  adventure: {
    id: "media:mood:adventure",
    src: expNature,
    alt: "Open trail country in the Arrábida hills.",
  },
  "slow-luxury": {
    id: "media:mood:slow-luxury",
    src: atmSocial,
    alt: "A candle-lit private terrace above Portuguese rooftops at dusk.",
  },
  faith: {
    id: "media:mood:faith",
    src: atmCultural,
    alt: "A quiet sanctuary interior with light falling across stone.",
  },
  "hands-on": {
    id: "media:mood:hands-on",
    src: editMarket,
    alt: "Local hands at work at a Portuguese market stall.",
  },
};

const INTEREST_MEDIA: Readonly<Record<Interest, { id: string; src: string; alt: string }>> = {
  wine: { id: "media:interest:wine", src: expWine, alt: "A cellar tasting of Portuguese wine." },
  gastronomy: {
    id: "media:interest:gastronomy",
    src: expGastronomy,
    alt: "A Portuguese table laid with regional dishes.",
  },
  nature: {
    id: "media:interest:nature",
    src: expNature,
    alt: "Green hills opening toward the Atlantic.",
  },
  coast: {
    id: "media:interest:coast",
    src: expCoastal,
    alt: "A quiet cove below Arrábida cliffs.",
  },
  heritage: {
    id: "media:interest:heritage",
    src: atmCultural,
    alt: "Historic stonework and azulejo detail in soft light.",
  },
  photography: {
    id: "media:interest:photography",
    src: editViewpoint,
    alt: "A viewpoint over the coast with long evening light.",
  },
  wellness: {
    id: "media:interest:wellness",
    src: atmScenic,
    alt: "An unhurried country road under open sky.",
  },
  "local-life": {
    id: "media:interest:local-life",
    src: expStreet,
    alt: "A neighbourhood street with everyday Portuguese life.",
  },
  faith: {
    id: "media:interest:faith",
    src: atmCultural,
    alt: "A sanctuary interior with quiet light.",
  },
  "hands-on": {
    id: "media:interest:hands-on",
    src: editMarket,
    alt: "Local makers at work with their hands.",
  },
};

/**
 * Region + activity imagery we genuinely operate. Keys are lowercase region
 * cues that appear in real Signature area labels.
 */
const REGION_ACTIVITY_MEDIA: ReadonlyArray<{
  cue: string;
  id: string;
  src: string;
  alt: string;
}> = [
  {
    cue: "arrábida",
    id: "media:region:arrabida",
    src: expCoastal,
    alt: "The Arrábida coast seen from the ridge road.",
  },
  {
    cue: "arrabida",
    id: "media:region:arrabida",
    src: expCoastal,
    alt: "The Arrábida coast seen from the ridge road.",
  },
  {
    cue: "setúbal",
    id: "media:region:setubal",
    src: expGastronomy,
    alt: "A Setúbal table of grilled fish and local wine.",
  },
  {
    cue: "azeitão",
    id: "media:region:azeitao",
    src: expWine,
    alt: "A cellar tasting in Azeitão.",
  },
  {
    cue: "sintra",
    id: "media:region:sintra",
    src: atmCultural,
    alt: "Sintra's wooded hillside and historic stonework.",
  },
  {
    cue: "lisbon",
    id: "media:region:lisbon",
    src: expStreet,
    alt: "A Lisbon street in everyday afternoon light.",
  },
  {
    cue: "alentejo",
    id: "media:region:alentejo",
    src: atmScenic,
    alt: "Open Alentejo plains under a wide sky.",
  },
];

export type ResolveStudioMediaInput = {
  role: StudioMediaRole;
  /** A REAL stop we have imagery for. Never a guess. */
  stopImage?: { id: string; src: string; alt: string; focal?: string | null } | null;
  /** Customer-facing area label from the resolved route, when known. */
  regionLabel?: string | null;
  interest?: Interest | null;
  feeling?: Feeling | null;
};

/** Deterministic media resolution, strictly down the hierarchy. */
export function resolveStudioMedia(input: ResolveStudioMediaInput): StudioMedia {
  if (input.stopImage) {
    const { focal, ...rest } = input.stopImage;
    const media: StudioMedia = { ...rest, role: input.role, source: "stop" };
    // Only a REAL catalogue focal travels; absent stays absent (CSS centre).
    if (typeof focal === "string" && focal.trim()) media.focal = focal.trim();
    return media;
  }


  const region = (input.regionLabel ?? "").toLowerCase();
  if (region) {
    const hit = REGION_ACTIVITY_MEDIA.find((entry) => region.includes(entry.cue));
    if (hit) {
      return { id: hit.id, src: hit.src, alt: hit.alt, role: input.role, source: "region-activity" };
    }
  }

  if (input.interest) {
    const media = INTEREST_MEDIA[input.interest];
    return { ...media, role: input.role, source: "mood" };
  }

  if (input.feeling) {
    const media = MOOD_MEDIA[input.feeling];
    return { ...media, role: input.role, source: "mood" };
  }

  return { ...BRAND_FALLBACK, role: input.role, source: "fallback" };
}

/** Stable media identity for one interest thread. */
export function interestMedia(interest: Interest, role: StudioMediaRole = "studio_canvas") {
  return resolveStudioMedia({ role, interest });
}

/** Stable media identity for the atmosphere. */
export function feelingMedia(feeling: Feeling | null, role: StudioMediaRole = "studio_mood") {
  return resolveStudioMedia({ role, feeling });
}
