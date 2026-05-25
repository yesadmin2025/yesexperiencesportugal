/**
 * Studio A/B testing — sticky per-visitor variant assignment for the
 * Studio Drift experience. Mirrors the hero A/B primitives but writes
 * to `studio_ab_assignments` / `studio_ab_events`.
 *
 * SSR-safe: server renders the control. The client swaps in the
 * resolved variant once the anon id is read from localStorage.
 *
 * Forced override via `?studioVariant=<id>` (QA preview).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getOrCreateAnonId } from "@/lib/ab-testing";

export type StudioExperiment = {
  key: string;
  /** First variant is the control rendered during SSR. */
  variants: readonly { id: string }[];
  weights?: Record<string, number>;
};

export type StudioAbEvent =
  | "exposure"
  | "drawer_open"
  | "reco_add"
  | "fast_mode_on"
  | "cta_book"
  | "cta_save"
  | "reveal_shown";

const ASSIGNMENT_KEY_PREFIX = "yes_studio_ab_";
const SESSION_LOGGED_PREFIX = "yes_studio_ab_logged_";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function hashUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

function readOverride(experiment: StudioExperiment): string | null {
  if (!isBrowser()) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("studioVariant");
    if (!explicit) return null;
    return experiment.variants.find((v) => v.id === explicit)?.id ?? null;
  } catch {
    return null;
  }
}

function pickVariant(
  experiment: StudioExperiment,
  anonymousId: string,
): { id: string } {
  const variants = experiment.variants;
  if (variants.length === 0) throw new Error("Experiment has no variants");
  const weights = experiment.weights;
  const r = hashUnit(`${anonymousId}::${experiment.key}`);
  if (weights && Object.keys(weights).length > 0) {
    const total = variants.reduce((acc, v) => acc + (weights[v.id] ?? 0), 0);
    if (total > 0) {
      let acc = 0;
      const target = r * total;
      for (const v of variants) {
        acc += weights[v.id] ?? 0;
        if (target < acc) return v;
      }
    }
  }
  const idx = Math.min(variants.length - 1, Math.floor(r * variants.length));
  return variants[idx];
}

export function resolveStudioVariant(
  experiment: StudioExperiment,
): { id: string } {
  if (!isBrowser()) return experiment.variants[0];
  const override = readOverride(experiment);
  if (override) {
    const v = experiment.variants.find((x) => x.id === override);
    if (v) return v;
  }
  const anonId = getOrCreateAnonId();
  const cacheKey = ASSIGNMENT_KEY_PREFIX + experiment.key;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const found = experiment.variants.find((v) => v.id === cached);
      if (found) return found;
    }
  } catch {
    /* ignore */
  }
  const picked = pickVariant(experiment, anonId);
  try {
    localStorage.setItem(cacheKey, picked.id);
  } catch {
    /* ignore */
  }
  return picked;
}

export async function recordStudioAssignment(
  experiment: StudioExperiment,
  variantId: string,
): Promise<void> {
  if (!isBrowser()) return;
  const anonId = getOrCreateAnonId();
  if (!anonId) return;
  const sessionKey = SESSION_LOGGED_PREFIX + experiment.key;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    /* ignore */
  }
  try {
    await supabase.from("studio_ab_assignments").insert([
      {
        anonymous_id: anonId,
        experiment_key: experiment.key,
        variant: variantId,
      },
    ]);
  } catch {
    /* non-fatal */
  }
}

export async function trackStudioAbEvent(
  experiment: StudioExperiment,
  variantId: string,
  event: StudioAbEvent,
  meta?: { sceneId?: string; route?: string; extra?: Record<string, unknown> },
): Promise<void> {
  if (!isBrowser()) return;
  const anonId = getOrCreateAnonId();
  if (!anonId) return;

  const dedupeKey = `yes_studio_ab_evt_${experiment.key}_${event}_${meta?.sceneId ?? "_"}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    /* ignore */
  }

  try {
    const safeMeta: Json | undefined = meta?.extra
      ? (JSON.parse(JSON.stringify(meta.extra)) as Json)
      : undefined;
    const payload = {
      anonymous_id: anonId,
      experiment_key: experiment.key,
      variant: variantId,
      event,
      scene_id: meta?.sceneId,
      route: meta?.route ?? window.location.pathname,
      ...(safeMeta ? { meta: safeMeta } : {}),
    };
    await supabase.from("studio_ab_events").insert([payload]);
  } catch {
    /* swallow */
  }
}

/**
 * Drawer-mode experiment: control = peek (84px collapsed), variant = open (drawer expanded by default).
 */
export const STUDIO_DRAWER_EXPERIMENT: StudioExperiment = {
  key: "studio_drawer_mode_v1",
  variants: [{ id: "peek" }, { id: "open" }],
};
