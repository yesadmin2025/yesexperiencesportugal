# Drift Adaptation Thresholds

`diffAdaptation()` (in `src/lib/drift/adaptation.ts`) decides **when the predictive engine has actually moved** and emits a `prediction_update` row into `drift_behavior_events`. To avoid flooding the table with micro-noise, three soft-drift thresholds gate the "did the engine adapt?" decision.

This document is the source of truth for what each threshold means, the default value, and which `AdaptationReason` it controls.

---

## TL;DR

| Threshold | Default | Reason it gates | Fires when… |
|---|---|---|---|
| `topMoodWeight` | `0.08` | `"top_mood"` | Top mood **label is stable** but its weight moved by more than this delta |
| `topInferredConfidence` | `0.1` | `"top_inferred"` | Top inferred dimension **key is stable** but its confidence moved by more than this delta |
| `revealConfidence` | `0.06` | `"confidence"` | Reveal confidence moved by more than this delta |

All deltas are absolute (`Math.abs(prev - next)`) and compared against the **rounded** snapshot fields (2-decimal precision), so values below ~0.005 are invisible regardless of threshold.

Reasons that are **not** threshold-gated always fire on any change:
`tonal_register`, `pacing`, `collapse_ahead`, `itinerary`, plus label changes for `top_mood` and `top_inferred`.

---

## How a diff is computed

`diffAdaptation(previous, next, thresholds?)`:

1. If `previous` is `null` → baseline: `{ changed: true, reasons: [] }`.
2. Otherwise compare each field in the `AdaptationSnapshot` and push reasons:
   - **Label changes** (mood name, inferred key, register, pacing class, stop ordering, collapse set) → fire unconditionally.
   - **Numeric drift** (weight, confidence) → fire only when `|prev - next| > threshold`.
3. `changed = reasons.length > 0`.

Override defaults per call:

```ts
diffAdaptation(prev, next, { topMoodWeight: 0.04 });
```

Missing keys fall back to `DEFAULT_ADAPTATION_THRESHOLDS`.

---

## `topMoodWeight` — default `0.08`

Controls the `"top_mood"` reason **when the top mood label is unchanged** (e.g. `celebration` stays the top mood, but its weight drifts from `0.42` → `0.49`).

- **Lower it (e.g. `0.04`)** → more sensitive. Useful when QA-ing whether soft attraction signals are nudging the engine at all.
- **Raise it (e.g. `0.15`)** → only fire on big mood-weight swings. Useful in production to keep `drift_behavior_events` lean.
- Label flips (e.g. `celebration` → `intimacy`) always fire, regardless of this threshold.

**Example**

```ts
const before = { ...snap, topMood: "celebration", topMoodWeight: 0.50 };
const after  = { ...before, topMoodWeight: 0.56 }; // Δ = 0.06

diffAdaptation(before, after).reasons;
// → []  (0.06 ≤ default 0.08)

diffAdaptation(before, after, { topMoodWeight: 0.04 }).reasons;
// → ["top_mood"]  (0.06 > 0.04)
```

---

## `topInferredConfidence` — default `0.1`

Controls the `"top_inferred"` reason **when the top inferred dimension key is unchanged** (e.g. `style:wine` stays on top, but confidence drifts from `0.60` → `0.71`).

- **Lower it (e.g. `0.05`)** → catch slow confidence ramps as the user lingers on related scenes.
- **Raise it (e.g. `0.2`)** → only fire when confidence makes a decisive jump.
- Key flips (e.g. `style:wine` → `style:coast`) always fire.

**Example**

```ts
const before = { ...snap, topInferred: "style:wine", topInferredConfidence: 0.60 };
const after  = { ...before, topInferredConfidence: 0.68 }; // Δ = 0.08

diffAdaptation(before, after).reasons;
// → []  (0.08 ≤ default 0.10)

diffAdaptation(before, after, { topInferredConfidence: 0.05 }).reasons;
// → ["top_inferred"]  (0.08 > 0.05)
```

---

## `revealConfidence` — default `0.06`

Controls the `"confidence"` reason — the engine's overall confidence in the upcoming reveal. This is independent of mood or inferred dimension and reflects how ready the engine is to commit to a recommendation.

- **Lower it (e.g. `0.02`)** → emit on every small confidence wobble (useful for live debugging dashboards).
- **Raise it (e.g. `0.2`)** → only fire when confidence shifts band (e.g. tentative → confident).

**Example**

```ts
const before = { ...snap, revealConfidence: 0.50 };
const after  = { ...before, revealConfidence: 0.58 }; // Δ = 0.08

diffAdaptation(before, after).reasons;
// → ["confidence"]  (0.08 > default 0.06)

diffAdaptation(before, after, { revealConfidence: 0.2 }).reasons;
// → []  (0.08 ≤ 0.20)
```

---

## Reasons NOT gated by thresholds

These always fire on any change between snapshots — they're either categorical or structural:

| Reason | Trigger |
|---|---|
| `tonal_register` | Predicted reveal register changed (e.g. `intimate` → `celebratory`) |
| `pacing` | `pacingClass` changed (derived from decision latency) |
| `collapse_ahead` | Set of chapters the engine is willing to skip changed |
| `top_mood` (label) | Top mood label changed |
| `top_inferred` (key) | Top inferred dimension key changed |
| `itinerary` | Ordered `dayStopIds` differ (the composed day actually rebuilt) |

If you want to silence one of these you must filter downstream — they intentionally cannot be threshold-tuned because they represent qualitative shifts a human would notice immediately.

---

## Choosing thresholds in practice

| Goal | Suggested overrides |
|---|---|
| **Production default** — minimal noise | leave defaults (`0.08 / 0.1 / 0.06`) |
| **QA / debugging adaptation** | `{ topMoodWeight: 0.03, topInferredConfidence: 0.04, revealConfidence: 0.02 }` |
| **High-volume sessions** (cut row count) | `{ topMoodWeight: 0.15, topInferredConfidence: 0.2, revealConfidence: 0.15 }` |
| **Proving micro-adaptation in tests** | per-test overrides — see `src/lib/drift/adaptation.test.ts` |

Whatever you pick, the contract holds: **every row in `drift_behavior_events` with `signal_type = 'prediction_update'` corresponds to at least one reason in `meta.changeReasons`**, and that reason is reproducible from `meta.snapshot` vs `meta.previousSnapshot` using `diffAdaptation`.
