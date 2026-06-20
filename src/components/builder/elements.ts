import { Camera, Car, Clock, Flower2, Sparkles, Wine } from "lucide-react";

/**
 * Bounded "Add to your day" elements.
 *
 * Per booking-truth-model: TEST MODE. No invented prices for add-ons.
 * Each element is selectable but always marked "Concierge confirms" so
 * the user knows the cost / availability is finalised by a human before
 * Bokun-backed pricing goes live. The Stripe metadata records the
 * selected element keys so ops can see the request after checkout.
 */
export type ElementKey =
  | "sunset-setup"
  | "photographer"
  | "picnic"
  | "premium-tasting"
  | "vehicle-upgrade"
  | "extra-hour";

export interface BuilderElement {
  key: ElementKey;
  label: string;
  sub: string;
  icon: typeof Wine;
}

export const BUILDER_ELEMENTS: BuilderElement[] = [
  {
    key: "sunset-setup",
    label: "Sunset setup",
    sub: "Cove or terrace, set for two",
    icon: Sparkles,
  },
  { key: "photographer", label: "Photographer", sub: "An hour, real moments", icon: Camera },
  { key: "picnic", label: "Private picnic", sub: "Local table, set outdoors", icon: Flower2 },
  {
    key: "premium-tasting",
    label: "Premium tasting",
    sub: "Reserve cellar, with the maker",
    icon: Wine,
  },
  { key: "vehicle-upgrade", label: "Vehicle upgrade", sub: "Premium car or van", icon: Car },
  { key: "extra-hour", label: "Extra hour", sub: "More time at a stop you love", icon: Clock },
];

export function elementLabel(key: ElementKey): string {
  return BUILDER_ELEMENTS.find((e) => e.key === key)?.label ?? key;
}
