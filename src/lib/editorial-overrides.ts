/**
 * Editorial image overrides — read-through helper.
 *
 * Public modules (GuestMomentsStrip, AmbientLandscapeStrip) pass their
 * `moduleKey` + default photos to `useEditorialOverrides`. If an admin has
 * published an override for a slot in `public.editorial_image_overrides`,
 * the corresponding default is replaced (src/alt/caption) — otherwise the
 * defaults render as before. RLS restricts public reads to published rows.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EditorialModuleKey =
  | "homepage_moments"
  | "about_moments"
  | "corporate_moments"
  | "multi_day_moments"
  | "corporate_ambient"
  | "proposal_ambient"
  | "multi_day_ambient";

export const EDITORIAL_MODULE_LABELS: Record<EditorialModuleKey, string> = {
  homepage_moments: "Homepage · Moments",
  about_moments: "About · Moments",
  corporate_moments: "Corporate · Moments",
  multi_day_moments: "Multi-day · Moments",
  corporate_ambient: "Corporate · Ambient landscapes",
  proposal_ambient: "Proposal · Ambient landscapes",
  multi_day_ambient: "Multi-day · Ambient landscapes",
};

export type EditorialSlot = {
  src: string;
  alt: string;
  caption: string;
};

type OverrideRow = {
  module_key: string;
  slot_index: number;
  photo_src: string;
  alt: string;
  caption: string | null;
  status: "draft" | "published";
};

// Simple in-memory cache keyed by moduleKey so multiple strips on the same
// page don't refetch. Cleared on auth change.
const cache = new Map<string, EditorialSlot[]>();

export function useEditorialOverrides<T extends EditorialSlot>(
  moduleKey: EditorialModuleKey,
  defaults: T[],
): T[] {
  const [merged, setMerged] = useState<T[]>(defaults);

  useEffect(() => {
    let cancelled = false;

    async function apply(rows: OverrideRow[]) {
      const byIndex = new Map(rows.map((r) => [r.slot_index, r]));
      const next = defaults.map((d, i) => {
        const o = byIndex.get(i);
        if (!o) return d;
        return { ...d, src: o.photo_src, alt: o.alt, caption: o.caption ?? d.caption };
      });
      cache.set(moduleKey, next);
      if (!cancelled) setMerged(next);
    }

    const cached = cache.get(moduleKey);
    if (cached) {
      // Fast path — re-apply cached over current defaults to keep types tight
      const byIndex = new Map(cached.map((c, i) => [i, c]));
      const next = defaults.map((d, i) => {
        const c = byIndex.get(i);
        if (!c || c.src === d.src) return d;
        return { ...d, src: c.src, alt: c.alt, caption: c.caption };
      });
      setMerged(next);
    }




    (async () => {
      const { data, error } = await supabase
        .from("editorial_image_overrides")
        .select("module_key, slot_index, photo_src, alt, caption, status")
        .eq("module_key", moduleKey)
        .eq("status", "published");
      if (error || !data) return;
      apply(data as OverrideRow[]);
    })();

    return () => {
      cancelled = true;
    };
    // Defaults array identity is stable per module (module-scope const);
    // depending on moduleKey is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey]);

  return merged;
}

// ---------- Batch helpers (admin-only writes; RLS enforces role) ----------

export type BatchEntry = {
  slotIndex: number;
  photoSrc: string;
  alt: string;
  caption: string | null;
};

export type BatchSnapshotEntry = {
  slotIndex: number;
  previous: { photoSrc: string; alt: string; caption: string | null } | null;
};

/**
 * Publish multiple slot overrides for one module in a single call. Reads
 * current published rows first so callers can offer a single undo. Rejects
 * out-of-range slot indexes — this tool NEVER adds new slots to a module.
 */
export async function publishOverridesBatch(
  moduleKey: EditorialModuleKey,
  entries: BatchEntry[],
  maxSlotIndex: number,
): Promise<{ snapshot: BatchSnapshotEntry[] }> {
  for (const e of entries) {
    if (e.slotIndex < 0 || e.slotIndex >= maxSlotIndex) {
      throw new Error(
        `slot ${e.slotIndex} fora do intervalo do módulo ${moduleKey} (0..${maxSlotIndex - 1}). Esta ferramenta só substitui slots existentes.`,
      );
    }
  }

  const slotIndexes = entries.map((e) => e.slotIndex);
  const { data: currentRows } = await supabase
    .from("editorial_image_overrides")
    .select("slot_index, photo_src, alt, caption")
    .eq("module_key", moduleKey)
    .eq("status", "published")
    .in("slot_index", slotIndexes);

  const currentByIndex = new Map(
    (currentRows ?? []).map((r) => [r.slot_index as number, r]),
  );
  const snapshot: BatchSnapshotEntry[] = entries.map((e) => {
    const c = currentByIndex.get(e.slotIndex);
    return {
      slotIndex: e.slotIndex,
      previous: c
        ? { photoSrc: c.photo_src, alt: c.alt, caption: c.caption }
        : null,
    };
  });

  const payload = entries.map((e) => ({
    module_key: moduleKey,
    slot_index: e.slotIndex,
    photo_src: e.photoSrc,
    alt: e.alt,
    caption: e.caption,
    status: "published" as const,
  }));
  const { error } = await supabase
    .from("editorial_image_overrides")
    .upsert(payload, { onConflict: "module_key,slot_index,status" });
  if (error) throw error;
  cache.delete(moduleKey);
  return { snapshot };
}

export async function deleteOverrides(
  moduleKey: EditorialModuleKey,
  slotIndexes: number[],
): Promise<void> {
  if (slotIndexes.length === 0) return;
  const { error } = await supabase
    .from("editorial_image_overrides")
    .delete()
    .eq("module_key", moduleKey)
    .eq("status", "published")
    .in("slot_index", slotIndexes);
  if (error) throw error;
  cache.delete(moduleKey);
}

/** Revert a batch using the snapshot returned by publishOverridesBatch. */
export async function revertOverridesBatch(
  moduleKey: EditorialModuleKey,
  snapshot: BatchSnapshotEntry[],
): Promise<void> {
  const toRestore = snapshot.filter((s) => s.previous !== null);
  const toDelete = snapshot.filter((s) => s.previous === null).map((s) => s.slotIndex);
  if (toRestore.length > 0) {
    const payload = toRestore.map((s) => ({
      module_key: moduleKey,
      slot_index: s.slotIndex,
      photo_src: s.previous!.photoSrc,
      alt: s.previous!.alt,
      caption: s.previous!.caption,
      status: "published" as const,
    }));
    const { error } = await supabase
      .from("editorial_image_overrides")
      .upsert(payload, { onConflict: "module_key,slot_index,status" });
    if (error) throw error;
  }
  if (toDelete.length > 0) await deleteOverrides(moduleKey, toDelete);
  cache.delete(moduleKey);
}

