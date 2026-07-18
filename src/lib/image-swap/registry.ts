/**
 * Registry mapping each editorial module key to its default slots.
 * Single source of truth used by the admin swap tool to render the
 * current image + fetch candidates. Kept in a browser-safe module so
 * the admin page can iterate slots without pulling route components.
 */
import type { EditorialModuleKey, EditorialSlot } from "@/lib/editorial-overrides";
import {
  ABOUT_MOMENTS,
  CORPORATE_MOMENTS,
  HOMEPAGE_MOMENTS,
  MULTI_DAY_MOMENTS,
} from "@/content/guest-moments";
import {
  CORPORATE_LANDSCAPES,
  PROPOSAL_LANDSCAPES,
  MULTIDAY_LANDSCAPES,
} from "@/components/ui/AmbientLandscapeStrip";

export type ModuleShape = {
  key: EditorialModuleKey;
  label: string;
  kind: "moments" | "ambient";
  orientation: "portrait" | "landscape";
  desiredTags: string[];
  defaults: EditorialSlot[];
};

export const EDITORIAL_MODULES: ModuleShape[] = [
  {
    key: "homepage_moments",
    label: "Homepage · Moments",
    kind: "moments",
    orientation: "portrait",
    desiredTags: ["people", "place"],
    defaults: HOMEPAGE_MOMENTS,
  },
  {
    key: "about_moments",
    label: "About · Moments",
    kind: "moments",
    orientation: "portrait",
    desiredTags: ["craft", "people"],
    defaults: ABOUT_MOMENTS,
  },
  {
    key: "corporate_moments",
    label: "Corporate · Moments",
    kind: "moments",
    orientation: "portrait",
    desiredTags: ["people", "wine"],
    defaults: CORPORATE_MOMENTS,
  },
  {
    key: "multi_day_moments",
    label: "Multi-day · Moments",
    kind: "moments",
    orientation: "portrait",
    desiredTags: ["wine", "people"],
    defaults: MULTI_DAY_MOMENTS,
  },
  {
    key: "corporate_ambient",
    label: "Corporate · Ambient landscapes",
    kind: "ambient",
    orientation: "landscape",
    desiredTags: ["landscape", "place", "craft"],
    defaults: CORPORATE_LANDSCAPES,
  },
  {
    key: "proposal_ambient",
    label: "Proposal · Ambient landscapes",
    kind: "ambient",
    orientation: "landscape",
    desiredTags: ["landscape", "coast"],
    defaults: PROPOSAL_LANDSCAPES,
  },
  {
    key: "multi_day_ambient",
    label: "Multi-day · Ambient landscapes",
    kind: "ambient",
    orientation: "landscape",
    desiredTags: ["landscape", "coast", "wine"],
    defaults: MULTIDAY_LANDSCAPES,
  },
];

export function getModule(key: EditorialModuleKey): ModuleShape | undefined {
  return EDITORIAL_MODULES.find((m) => m.key === key);
}

/**
 * Map of src → module labels where that src appears (per-defaults). Used
 * to flag "already used elsewhere" in the candidate list. Applied
 * overrides are layered on top at call time.
 */
export function buildUsageIndex(
  overridesByModule?: Map<EditorialModuleKey, EditorialSlot[]>,
): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  for (const m of EDITORIAL_MODULES) {
    const effective = overridesByModule?.get(m.key) ?? m.defaults;
    for (const slot of effective) {
      const list = usage.get(slot.src) ?? [];
      list.push(m.label);
      usage.set(slot.src, list);
    }
  }
  return usage;
}
