/**
 * Lightweight A/B testing primitives.
 *
 * Design goals:
 *   • Sticky per-visitor assignment with no flicker after hydration.
 *   • SSR-safe: server always renders the control. The variant is
 *     swapped in client-side once the anonymous id is read from
 *     localStorage. We accept a one-frame swap for the ~50% of
 *     visitors who get a non-control variant — far less invasive
 *     than blocking SSR or showing a skeleton.
 *   • Deterministic: variant is a hash of `anon_id + experiment_key`,
 *     so the same visitor always sees the same variant for the same
 *     experiment, with no DB round-trip required to render.
 *   • Honest analytics: every variant exposure / conversion lands in
 *     Supabase via the publishable client, RLS-allowed insert only.
 *   • Forced control on `?hero=last` (visual-regression freeze) and
 *     when an explicit `?heroVariant=<id>` override is set, so the
 *     copy-lock CI suite stays deterministic.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { HeroExperiment, HeroCopyVariant } from "@/content/hero-scene-variants";

const ANON_KEY = "yes_anon_id";
const ASSIGNMENT_KEY_PREFIX = "yes_ab_";
const SESSION_LOGGED_PREFIX = "yes_ab_logged_";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Stable, anonymous, non-PII id. 24 hex chars. */
export function getOrCreateAnonId(): string {
  if (!isBrowser()) return "";
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (id && /^[a-f0-9]{16,64}$/.test(id)) return id;
    const buf = new Uint8Array(12);
    crypto.getRandomValues(buf);
    id = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    // Private mode / storage disabled — fall back to a per-load id so
    // the visit still tracks consistently, just not across reloads.
    return "tx" + Math.random().toString(16).slice(2, 16);
  }
}

/** Deterministic 32-bit FNV-1a hash → uniform [0, 1). */
function hashUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned & normalise.
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

/**
 * Read a `?heroVariant=<id>` override from the URL. Used by QA / the
 * marketing team to preview a specific variant without flipping a
 * coin. Also honoured by `?hero=last` (forces control) so visual
 * regression and copy-lock suites stay deterministic.
 */
export function readVariantOverride(experiment: HeroExperiment): string | null {
  if (!isBrowser()) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hero") === "last") return "control";
    const explicit = params.get("heroVariant");
    if (!explicit) return null;
    const found = experiment.variants.find((v) => v.id === explicit);
    return found ? found.id : null;
  } catch {
    return null;
  }
}

/** Pick a variant deterministically, honouring `weights` if provided. */
export function pickVariant(experiment: HeroExperiment, anonymousId: string): HeroCopyVariant {
  const variants = experiment.variants;
  if (variants.length === 0) {
    throw new Error("Experiment has no variants");
  }
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
  // Equal split fallback.
  const idx = Math.min(variants.length - 1, Math.floor(r * variants.length));
  return variants[idx];
}

/**
 * Resolve which variant the current visitor should see. Returns the
 * control synchronously on the server, then the assigned variant on
 * the client after the anon id is available. Caches the resolution
 * in localStorage so the same variant survives reloads even if the
 * underlying weights change later.
 */
export function resolveVariant(experiment: HeroExperiment): HeroCopyVariant {
  if (!isBrowser()) {
    // SSR: render control deterministically.
    return experiment.variants[0];
  }
  const override = readVariantOverride(experiment);
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

/**
 * Persist the assignment to Supabase the first time we see this
 * (visitor × experiment) pair. Idempotent via the table's UNIQUE
 * constraint — duplicate inserts silently fail and are swallowed.
 * Fire-and-forget; analytics must NEVER block the UI.
 */
export async function recordAssignment(
  experiment: HeroExperiment,
  variant: HeroCopyVariant,
): Promise<void> {
  if (!isBrowser()) return;
  const anonId = getOrCreateAnonId();
  if (!anonId) return;
  const sessionKey = SESSION_LOGGED_PREFIX + experiment.key;
  if (sessionStorage.getItem(sessionKey)) return; // already logged this tab
  try {
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    /* ignore */
  }
  try {
    // Privacy: do NOT collect user agent. Anonymous_id + variant is enough
    // to compute conversion rates without device fingerprinting.
    await supabase.from("hero_ab_assignments").insert([
      {
        anonymous_id: anonId,
        experiment_key: experiment.key,
        variant: variant.id,
      },
    ]);
  } catch {
    // Non-fatal — the table has UNIQUE(anonymous_id, experiment_key)
    // so duplicate inserts intentionally throw a 23505. We don't care.
  }
}

export type AbEvent = "exposure" | "cta_click" | "builder_start" | "booking" | "view_signature";

/**
 * Track a conversion event. Throttled per (event × scene_id) per
 * session so we never spam the table on rapid scroll / re-renders.
 */
export async function trackAbEvent(
  experiment: HeroExperiment,
  variant: HeroCopyVariant,
  event: AbEvent,
  meta?: { sceneId?: string; route?: string; extra?: Record<string, unknown> },
): Promise<void> {
  if (!isBrowser()) return;
  const anonId = getOrCreateAnonId();
  if (!anonId) return;

  const dedupeKey = `yes_ab_evt_${experiment.key}_${event}_${meta?.sceneId ?? "_"}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    /* ignore */
  }

  try {
    // `meta.extra` is loosely typed `Record<string, unknown>` for caller
    // ergonomics; the column is `jsonb`. Round-trip through JSON to
    // strip non-serializable values and satisfy the generated `Json` type.
    const safeMeta: Json | undefined = meta?.extra
      ? (JSON.parse(JSON.stringify(meta.extra)) as Json)
      : undefined;
    const payload = {
      anonymous_id: anonId,
      experiment_key: experiment.key,
      variant: variant.id,
      event,
      scene_id: meta?.sceneId,
      route: meta?.route ?? window.location.pathname,
      ...(safeMeta ? { meta: safeMeta } : {}),
    };
    await supabase.from("hero_ab_events").insert([payload]);
  } catch {
    /* swallow — analytics never blocks UX */
  }
}
