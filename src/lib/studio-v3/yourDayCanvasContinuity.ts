/**
 * PASS 3A — Canvas → YOUR DAY visual continuity, on STRUCTURAL identity.
 *
 * The final surface must not re-resolve fresh imagery. It reuses the SAME
 * stable media identities the Living Canvas already derived, matched by the
 * SAME structural stop identity (inventory / blueprint id) the rest of Studio
 * V3 uses. A display label is never identity: renaming a stop keeps its
 * media, and two different stops that happen to share a label never collide.
 *
 * `byLabel` survives ONLY as a migration path for legacy hydrated moments
 * that genuinely carry no structural identity. It is populated exclusively
 * from identity-less canvas moments, so it can never override or shadow a
 * structural match.
 *
 * Pure projection of the derived model. No second persisted canvas state.
 */

import type { LivingCanvasModel } from "@/lib/studio-v3/livingCanvasModel";
import type { StudioMedia } from "@/lib/studio-v3/studioMediaResolver";

/** A current route moment as YOUR DAY knows it. */
export type YourDayMomentRef =
  | string
  | { label: string; stopId?: string | null; inventoryStopId?: string | null; blueprintStopId?: string | null };

export interface YourDayVisuals {
  /** The principal final visual, when the canvas holds a valid one. */
  readonly backdrop: StudioMedia | null;
  /** Canvas media identity per STRUCTURAL stop id. Sparse by design. */
  readonly byId: ReadonlyMap<string, StudioMedia>;
  /** MIGRATION ONLY — identity-less legacy moments, keyed by lowercased label. */
  readonly byLabel: ReadonlyMap<string, StudioMedia>;
}

const norm = (value: string): string => value.trim().toLowerCase();

function structuralIdOf(ref: YourDayMomentRef): string | null {
  if (typeof ref === "string") return null;
  const raw = ref.stopId ?? ref.inventoryStopId ?? ref.blueprintStopId ?? null;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function labelOf(ref: YourDayMomentRef): string {
  return typeof ref === "string" ? ref : ref.label;
}

export function resolveYourDayVisuals(
  model: LivingCanvasModel | null | undefined,
  moments: ReadonlyArray<YourDayMomentRef>,
): YourDayVisuals {
  if (!model) return { backdrop: null, byId: new Map(), byLabel: new Map() };

  const canvasById = new Map<string, StudioMedia>();
  const canvasByLabel = new Map<string, StudioMedia>();
  for (const moment of model.moments) {
    if (moment.stopId) {
      canvasById.set(moment.stopId, moment.image);
      continue;
    }
    // Legacy only: identity-less canvas moments may still be reached by label.
    canvasByLabel.set(norm(moment.label), moment.image);
  }

  const byId = new Map<string, StudioMedia>();
  const byLabel = new Map<string, StudioMedia>();
  for (const ref of moments) {
    const id = structuralIdOf(ref);
    if (id) {
      const media = canvasById.get(id);
      // A structural moment NEVER falls back to a label lookup: borrowing
      // another stop's photograph is worse than showing none.
      if (media) byId.set(id, media);
      continue;
    }
    const media = canvasByLabel.get(norm(labelOf(ref)));
    if (media) byLabel.set(norm(labelOf(ref)), media);
  }

  const backdrop = model.backdrop && model.backdrop.src ? model.backdrop : null;
  return { backdrop, byId, byLabel };
}

/** Media for one current moment, structural identity first. */
export function yourDayMediaFor(
  visuals: YourDayVisuals,
  ref: YourDayMomentRef,
): StudioMedia | null {
  const id = structuralIdOf(ref);
  if (id) return visuals.byId.get(id) ?? null;
  return visuals.byLabel.get(norm(labelOf(ref))) ?? null;
}
