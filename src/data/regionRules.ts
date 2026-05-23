// Regional rules — composition caps and time budgets used by the Drift composer.
//
// These are operational guardrails, not editorial preferences. Edit when the
// real operation changes (e.g. a region adds a new winery slot).

import type { RegionKey, StopKind } from "./regionStops";

export interface RegionRules {
  /** Max number of stops of a given kind allowed in one day. */
  kindCaps: Partial<Record<StopKind, number>>;
  /** Total drive time budget across the day (minutes). */
  maxDriveMinutes: number;
  /** Hard cap for any single hop (minutes). */
  maxHopMinutes: number;
  /** Total day length: pickup → drop-off (minutes). */
  dayLengthMinutes: { near: number; far: number };
  /** Minimum stops required to call a day "composed". */
  minStops: number;
  /** Maximum stops kept in the composed day. */
  maxStops: number;
}

export const REGION_RULES: Record<RegionKey, RegionRules> = {
  arrabida: {
    kindCaps: { winery: 3, market: 1, table: 1, beach: 1, viewpoint: 2, workshop: 1 },
    maxDriveMinutes: 150,
    maxHopMinutes: 55,
    dayLengthMinutes: { near: 6 * 60, far: 9 * 60 },
    minStops: 3,
    maxStops: 5,
  },
  "lisbon-coast": {
    kindCaps: { heritage: 2, viewpoint: 1, village: 2, beach: 1, table: 1, workshop: 1 },
    maxDriveMinutes: 150,
    maxHopMinutes: 50,
    dayLengthMinutes: { near: 6 * 60, far: 9 * 60 },
    minStops: 3,
    maxStops: 5,
  },
  alentejo: {
    kindCaps: { winery: 2, cellar: 1, table: 1, heritage: 2, beach: 1, village: 1 },
    maxDriveMinutes: 180,
    maxHopMinutes: 70,
    dayLengthMinutes: { near: 7 * 60, far: 10 * 60 },
    minStops: 3,
    maxStops: 5,
  },
  centro: {
    kindCaps: { heritage: 2, village: 2, viewpoint: 1, table: 1 },
    maxDriveMinutes: 180,
    maxHopMinutes: 70,
    dayLengthMinutes: { near: 7 * 60, far: 10 * 60 },
    minStops: 3,
    maxStops: 5,
  },
};
