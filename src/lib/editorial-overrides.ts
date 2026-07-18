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
