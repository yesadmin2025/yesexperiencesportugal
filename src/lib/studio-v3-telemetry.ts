// Studio V3 — fase 5 telemetria.
//
// Fire-and-forget client helper. Console.info para auditoria local em
// DevTools (filtrar por `[studio-v3.`) e CustomEvent no `window` para que
// qualquer camada de analytics (ou um teste) possa subscrever.
//
// Nunca bloqueia a narrativa, nunca lança. Não envia PII — só o que a
// curation/Phase 4 já têm em mãos: tour escolhido, region, viewport,
// rejections com o motivo, timings.

export type StudioV3RejectionReason =
  | "closed-on-date"
  | "winery-cap"
  | "duplicate-label"
  | "semantic-duplicate"
  | "swapped-for-wine"
  | "coherence-family-only"
  | "coherence-romantic-only";

export interface StudioV3StopRejection {
  label: string;
  reason: StudioV3RejectionReason;
  detail?: string;
}

export interface StudioV3CurationDecision {
  tourId: string;
  tourTitleInternal: string;
  region: string | null;
  feeling: string;
  companions: string;
  rhythm: string;
  dateExact: string | null;
  destinationIntent: string | null;
  investment: string | null;
  poolSizeRaw: number;
  poolSizeAfterClosures: number;
  picked: string[];
  rejections: StudioV3StopRejection[];
  wineSwapApplied: boolean;
  target: number;
  confidence?: string;
}

export type StudioV3Phase4Phase = "silhouette-shown" | "map-mounted" | "first-stop" | "complete";

export interface StudioV3Phase4Timing {
  phase: StudioV3Phase4Phase;
  elapsedMs: number;
  tourId: string;
  region: string | null;
  viewport: { w: number; h: number; dpr: number } | null;
  reducedMotion: boolean;
  // Allow callers to add ad-hoc context (e.g. swap counts) without
  // changing the shape downstream.
  [extra: string]: unknown;
}

export interface StudioV3RevealValidation {
  ok: boolean;
  missing: string[];
  tourId: string | null;
}

/** Perceived 4-beat stepper: Region → Rhythm → Dates → Compose. */
export type StudioV3BuilderStepId = "region" | "rhythm" | "dates" | "compose";
export interface StudioV3BuilderStep {
  step: StudioV3BuilderStepId;
  stepIndex: number;
  phase: string;
}

export interface StudioV3RevealPremium {
  tourId: string | null;
  hasPrice: boolean;
  priceFromEUR: number | null;
  durationLabel: string | null;
  stopCount: number;
  dateExact: string | null;
}

/**
 * Reveal add-on pool snapshot — emitted whenever a reveal surface
 * (SignaturePriceCard / SmartRecommendation) computes its filtered
 * add-on pool. Used to catch region/sub-region mismatches in the wild
 * (e.g. Arrábida add-ons leaking onto a Sintra anchor).
 */
export interface StudioV3RevealAddOns {
  surface: "price-card" | "smart-reco";
  tourId: string | null;
  region: string | null;
  regionBucket: string;
  lisbonSubRegion: string | null;
  stopCount: number;
  durationLabel: string | null;
  poolSize: number;
  poolIds: string[];
  poolSourceTourIds: string[];
  poolLisbonSubRegions: Array<string | null>;
  mismatch: boolean;
}

type StudioV3Event =
  | { kind: "curation.decision"; payload: StudioV3CurationDecision }
  | { kind: "phase4.timing"; payload: StudioV3Phase4Timing }
  | { kind: "reveal.validation"; payload: StudioV3RevealValidation }
  | { kind: "builder.step"; payload: StudioV3BuilderStep }
  | { kind: "reveal.premium"; payload: StudioV3RevealPremium }
  | { kind: "reveal.addons"; payload: StudioV3RevealAddOns };

export interface StudioV3BufferedEvent {
  kind: StudioV3Event["kind"];
  ts: number;
  payload:
    | StudioV3CurationDecision
    | StudioV3Phase4Timing
    | StudioV3RevealValidation
    | StudioV3BuilderStep
    | StudioV3RevealPremium
    | StudioV3RevealAddOns;
}

const BUFFER_KEY = "studio-v3.audit.buffer.v1";
const BUFFER_MAX = 200;

function readBuffer(): StudioV3BufferedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioV3BufferedEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBuffer(next: StudioV3BufferedEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUFFER_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — silent */
  }
}

/** Ring-buffer last N events in localStorage for the audit dashboard. */
function bufferEvent(event: StudioV3Event): void {
  const buf = readBuffer();
  buf.push({ kind: event.kind, ts: Date.now(), payload: event.payload });
  if (buf.length > BUFFER_MAX) buf.splice(0, buf.length - BUFFER_MAX);
  writeBuffer(buf);
}

export function readStudioV3AuditBuffer(): StudioV3BufferedEvent[] {
  return readBuffer();
}

export function clearStudioV3AuditBuffer(): void {
  writeBuffer([]);
}

/** Single emit helper — keeps the console prefix and event names aligned. */
export function emitStudioV3Event(event: StudioV3Event): void {
  if (typeof window === "undefined") return;
  // Silence in vitest — telemetry is fire-and-forget in product but in
  // tests it floods stdout (curation suites call resolveStudioV3Route
  // thousands of times) and pushes long-running suites past timeout.
  if (typeof process !== "undefined" && process.env?.VITEST) return;
  try {
    console.info(`[studio-v3.${event.kind}]`, event.payload);
  } catch {
    /* console can be missing in exotic embeds — never throw */
  }
  try {
    window.dispatchEvent(new CustomEvent(`studio-v3:${event.kind}`, { detail: event.payload }));
  } catch {
    /* SSR / no-window — silent */
  }
  bufferEvent(event);
}

/** Convenience wrappers (typed call-sites, single import per consumer). */
export function recordStudioV3CurationDecision(payload: StudioV3CurationDecision): void {
  emitStudioV3Event({ kind: "curation.decision", payload });
}

export function recordStudioV3Phase4Timing(payload: StudioV3Phase4Timing): void {
  emitStudioV3Event({ kind: "phase4.timing", payload });
}

export function recordStudioV3RevealValidation(payload: StudioV3RevealValidation): void {
  emitStudioV3Event({ kind: "reveal.validation", payload });
}

export function recordStudioV3BuilderStep(payload: StudioV3BuilderStep): void {
  emitStudioV3Event({ kind: "builder.step", payload });
}

export function recordStudioV3RevealPremium(payload: StudioV3RevealPremium): void {
  emitStudioV3Event({ kind: "reveal.premium", payload });
}
