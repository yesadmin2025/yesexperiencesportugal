export const P14_YOUR_DAY_CTA_EXPERIMENT = "p14_your_day_cta_v1";
export const P14_YOUR_DAY_CTA_TEST_ID = "studio-v3-handoff-primary";
export const P14_YOUR_DAY_CTA_CLICK_EVENT = "p14_your_day_cta_click";

export const P14_YOUR_DAY_CTA_VARIANTS = {
  control: "p14_your_day_cta_control",
  story: "p14_your_day_cta_story",
} as const;

export type P14YourDayCtaVariant =
  (typeof P14_YOUR_DAY_CTA_VARIANTS)[keyof typeof P14_YOUR_DAY_CTA_VARIANTS];

const FUNNEL_VARIANT_KEY = "studio-v3.funnel.variant.v1";

const CTA_COPY: Record<P14YourDayCtaVariant, string> = {
  [P14_YOUR_DAY_CTA_VARIANTS.control]: "Continue to guest details",
  [P14_YOUR_DAY_CTA_VARIANTS.story]: "Make this my day in Portugal",
};

export function isP14YourDayCtaVariant(value: string | null): value is P14YourDayCtaVariant {
  return value === P14_YOUR_DAY_CTA_VARIANTS.control || value === P14_YOUR_DAY_CTA_VARIANTS.story;
}

/** Small deterministic FNV-1a hash. No identity or PII enters assignment. */
export function stableExperimentHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function assignP14YourDayCtaVariant(sessionId: string): P14YourDayCtaVariant {
  return stableExperimentHash(`${P14_YOUR_DAY_CTA_EXPERIMENT}:${sessionId}`) % 2 === 0
    ? P14_YOUR_DAY_CTA_VARIANTS.control
    : P14_YOUR_DAY_CTA_VARIANTS.story;
}

export function p14YourDayCtaLabelForVariant(variant: string | null): string {
  return isP14YourDayCtaVariant(variant)
    ? CTA_COPY[variant]
    : CTA_COPY[P14_YOUR_DAY_CTA_VARIANTS.control];
}

/**
 * Presentation-only read. Assignment remains owned by studio-v3-funnel;
 * this helper never creates or replaces an experiment arm.
 */
export function readStoredP14YourDayCtaVariant(): P14YourDayCtaVariant | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(FUNNEL_VARIANT_KEY);
    return isP14YourDayCtaVariant(stored) ? stored : null;
  } catch {
    return null;
  }
}
