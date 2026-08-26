// Studio V3 — deliberately small CRO experiment registry.
//
// P14 runs ONE experiment at a time. Assignment is session-scoped, stable,
// privacy-safe and deterministic from the existing anonymous funnel session id.
// No cookies, user identifiers, pricing inputs or itinerary state are involved.

export const P14_INTRO_CTA_EXPERIMENT_ID = "p14_intro_cta_v1" as const;

export type P14IntroCtaArm = "control" | "compose";

export interface P14IntroCtaExperiment {
  id: typeof P14_INTRO_CTA_EXPERIMENT_ID;
  arm: P14IntroCtaArm;
  analyticsVariant: string;
  label: string;
}

/** Small stable 32-bit hash. Deterministic across browsers and refreshes. */
function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function p14IntroCtaArmForSession(sessionId: string): P14IntroCtaArm {
  return stableHash(`${P14_INTRO_CTA_EXPERIMENT_ID}:${sessionId}`) % 2 === 0
    ? "control"
    : "compose";
}

export function p14IntroCtaExperimentForSession(sessionId: string): P14IntroCtaExperiment {
  const arm = p14IntroCtaArmForSession(sessionId);
  return {
    id: P14_INTRO_CTA_EXPERIMENT_ID,
    arm,
    analyticsVariant: `${P14_INTRO_CTA_EXPERIMENT_ID}:${arm}`,
    label: arm === "compose" ? "Compose my day" : "Begin",
  };
}
