/**
 * Studio V3 — Phase 5A: Route Intelligence Pool foundation.
 *
 * This file defines the data model for optional, region-scoped stops that
 * Studio V3 may later use to personalize journeys beyond the hidden Signature
 * skeleton.
 *
 * IMPORTANT — current state:
 * - This pool is NOT wired into live route resolution.
 * - The feature flag below is OFF.
 * - No optional stops are seeded yet (no invention of stops is allowed).
 * - Route output, ComposerMap, MapAwakens, StoryboardHandoff, lead capture,
 *   checkout, pricing, Supabase and homepage are all unchanged by this file.
 *
 * Seeding rules (for future phases):
 * - Only add stops that already exist in confirmed Signature data or are
 *   operator-confirmed. Never invent stops.
 * - Never cross regions in a single journey.
 * - Keep `active: false` for any stop that has not been explicitly cleared.
 */

export type RegionId =
  | "lisbon-sintra-cascais"
  | "arrabida-setubal"
  | "alentejo-evora"
  | "douro-porto"
  | "comporta-troia"
  | "fatima-nazare-obidos"
  | "tomar-coimbra"
  | "other";

export type OptionalStopType =
  | "viewpoint"
  | "winery"
  | "village"
  | "beach"
  | "market"
  | "monument"
  | "table"
  | "garden"
  | "studio"
  | "boat"
  | "workshop"
  | "nature"
  | "heritage";

export type OptionalStopSource =
  | "signature-core"
  | "research-link"
  | "operator-confirmed";

export interface OptionalStop {
  id: string;
  region: RegionId;
  subregion?: string;
  name: string;
  type: OptionalStopType;
  coords?: { lat: number; lng: number };
  suitsInterests: string[];
  suitsRhythm: string[];
  suitsCompanions?: string[];
  suitsInvestment?: string[];
  durationMin: number;
  notes?: string;
  source: OptionalStopSource;
  signatureTourId?: string;
  active: boolean;
}

/**
 * Feature flag — keep OFF until a later phase explicitly activates the
 * optional stop pool inside Studio V3 curation.
 */
export const STUDIO_V3_OPTIONAL_STOPS_ENABLED = false;

/**
 * Regional optional stop pool.
 *
 * TODO (future phase): Seed only from confirmed Signature data or
 * operator-confirmed sources. Do NOT invent stops. Until then, this pool
 * stays empty and has zero effect on live route output.
 */
export const REGION_STOP_POOL: OptionalStop[] = [];
