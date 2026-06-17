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
  | "swapped-for-wine";

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

export type StudioV3Phase4Phase =
  | "silhouette-shown"
  | "map-mounted"
  | "first-stop"
  | "complete";

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

type StudioV3Event =
  | { kind: "curation.decision"; payload: StudioV3CurationDecision }
  | { kind: "phase4.timing"; payload: StudioV3Phase4Timing };

/** Single emit helper — keeps the console prefix and event names aligned. */
export function emitStudioV3Event(event: StudioV3Event): void {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line no-console
    console.info(`[studio-v3.${event.kind}]`, event.payload);
  } catch {
    /* console can be missing in exotic embeds — never throw */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(`studio-v3:${event.kind}`, { detail: event.payload }),
    );
  } catch {
    /* SSR / no-window — silent */
  }
}

/** Convenience wrappers (typed call-sites, single import per consumer). */
export function recordStudioV3CurationDecision(
  payload: StudioV3CurationDecision,
): void {
  emitStudioV3Event({ kind: "curation.decision", payload });
}

export function recordStudioV3Phase4Timing(
  payload: StudioV3Phase4Timing,
): void {
  emitStudioV3Event({ kind: "phase4.timing", payload });
}
