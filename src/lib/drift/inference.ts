// Drift inference — adaptive confidence vector per profile dimension.
//
// Phase 2 layer on top of the linear chapter graph: every signal (explicit
// imprint, motif reinforcement, lingering on a scene) updates a confidence
// map. The composer and scene router consume that map instead of treating
// the profile as binary "set / not set".
//
// Pure TS, no I/O. Safe to import from both client (StudioDrift) and
// server (driftEngine.server).

export type DriftDimension =
  | "companions"
  | "pickup"
  | "radius"
  | "energy"
  | "style"
  | "social";

/** key = `${dimension}:${value}`  → confidence in [0, 1]. */
export type ConfidenceMap = Record<string, number>;

export interface InferredProfile {
  companions?: "solo" | "couple" | "family" | "group";
  pickup?: "lisbon" | "centro" | "alentejo";
  radius?: "near" | "far" | "anywhere";
  energy?: "slow" | "vivid";
  style?: "coast" | "heritage" | "wine" | "table";
  social?: "intimate" | "shared";
}

export const EXPLICIT = 1.0;
export const STRONG = 0.65;
export const SOFT = 0.35;

/** Build the confidence key for a dimension/value pair. */
export const ckey = (dim: DriftDimension, value: string) => `${dim}:${value}`;

/** Add (clamped) confidence to a value within a dimension. Other values in
 *  the same dimension decay slightly so the top value always stands out. */
export function bump(
  map: ConfidenceMap,
  dim: DriftDimension,
  value: string,
  amount: number,
): ConfidenceMap {
  const next = { ...map };
  const key = ckey(dim, value);
  next[key] = Math.min(1, (next[key] ?? 0) + amount);
  // Soft decay on competing values within the same dimension.
  for (const k of Object.keys(next)) {
    if (k === key) continue;
    if (k.startsWith(`${dim}:`)) {
      next[k] = Math.max(0, next[k]! - amount * 0.35);
    }
  }
  return next;
}

/** Top value (and its confidence) for a dimension, if any. */
export function topValue(
  map: ConfidenceMap,
  dim: DriftDimension,
): { value: string; confidence: number } | null {
  let best: { value: string; confidence: number } | null = null;
  for (const [k, v] of Object.entries(map)) {
    if (!k.startsWith(`${dim}:`)) continue;
    if (!best || v > best.confidence) {
      best = { value: k.slice(dim.length + 1), confidence: v };
    }
  }
  return best;
}

/** Project the confidence map into a single inferred profile, treating any
 *  value ≥ minConfidence as a soft pick (explicit imprint always wins). */
export function projectProfile(
  map: ConfidenceMap,
  minConfidence = 0.5,
): InferredProfile {
  const dims: DriftDimension[] = [
    "companions",
    "pickup",
    "radius",
    "energy",
    "style",
    "social",
  ];
  const out: Record<string, string> = {};
  for (const d of dims) {
    const top = topValue(map, d);
    if (top && top.confidence >= minConfidence) out[d] = top.value;
  }
  return out as InferredProfile;
}

/** Confidence gap per dimension (1 - top confidence). Higher gap = more
 *  uncertain = better candidate for the next explicit whisper. */
export function gaps(map: ConfidenceMap): Array<{ dim: DriftDimension; gap: number }> {
  const dims: DriftDimension[] = [
    "companions",
    "pickup",
    "radius",
    "energy",
    "style",
    "social",
  ];
  return dims
    .map((dim) => {
      const top = topValue(map, dim);
      return { dim, gap: 1 - (top?.confidence ?? 0) };
    })
    .sort((a, b) => b.gap - a.gap);
}

/** Total confidence across all dimensions, normalised to [0, 1]. Used by
 *  the conversion layer to gate CTAs and by the scene router to know when
 *  the journey is "complete enough" to converge. */
export function totalConfidence(map: ConfidenceMap): number {
  const dims: DriftDimension[] = [
    "companions",
    "pickup",
    "radius",
    "energy",
    "style",
    "social",
  ];
  let sum = 0;
  for (const d of dims) sum += topValue(map, d)?.confidence ?? 0;
  return sum / dims.length;
}

/** Sanitize a confidence map coming over the wire — drops malformed keys
 *  and clamps values so the server never trusts client input blindly. */
export function sanitizeConfidence(input: unknown): ConfidenceMap {
  if (!input || typeof input !== "object") return {};
  const out: ConfidenceMap = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k !== "string" || k.length > 48) continue;
    if (!/^[a-z]+:[a-z-]+$/.test(k)) continue;
    const num = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(num)) continue;
    out[k] = Math.max(0, Math.min(1, num));
  }
  return out;
}
