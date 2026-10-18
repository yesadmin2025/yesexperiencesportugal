// Early, honest price orientation for the Studio region step: the lowest
// public "From" price of the Signature days in that region — the same
// figure shown on /experiences. Never a computed total; the canonical
// SignaturePriceCard remains the exact price.
import { signatureTours } from "@/data/signatureTours";
import { SIGNATURE_DESTINATION } from "./livingAtlasCheckoutHandoff";
import type { ChoiceOption, DestinationIntent } from "./types";

export function regionFromPriceEur(intent: DestinationIntent): number | null {
  const prices = signatureTours
    .filter((t) => (SIGNATURE_DESTINATION as Record<string, DestinationIntent>)[t.id] === intent)
    .map((t) => t.priceFrom)
    .filter((p): p is number => typeof p === "number" && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function withRegionFromPrice(
  options: ChoiceOption<DestinationIntent>[],
): ChoiceOption<DestinationIntent>[] {
  return options.map((o) => {
    const from = regionFromPriceEur(o.id);
    if (from == null) return o;
    const hint = `From €${from} per guest`;
    return { ...o, whisper: o.whisper ? `${o.whisper} · ${hint}` : hint };
  });
}

/** Lowest public "From" price across Signature days (the Studio's entry orientation). */
export function studioFromPriceEur(): number | null {
  const prices = signatureTours.map((t) => t.priceFrom).filter((p) => typeof p === "number" && p > 0);
  return prices.length ? Math.min(...prices) : null;
}
