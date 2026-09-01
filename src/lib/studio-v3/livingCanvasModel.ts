/**
 * TURBO 1 — LIVING CANVAS read model.
 *
 * A PURE DERIVED projection of what the traveller has already told us:
 * current Studio answers + canonical `questionHistory` + (when it exists) the
 * resolved composition. It is NEVER persisted and is never a second truth
 * store — deleting it would lose nothing.
 *
 * Stages: mood → threads → direction → composition → shaped.
 * Geography emerges only when evidence exists; a route is only drawn from
 * REAL coordinates, otherwise the canvas falls back to an honest timeline.
 */

import { INTERESTS, type Feeling, type Interest } from "@/components/studio-v3/types";
import { publicMomentAltText } from "@/components/studio-v3/studioWineryPresentation";
import { deriveDirectorAnswerProjection } from "@/lib/studio-v3/directorAnswerProjection";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";
import { deriveSemanticProfile } from "@/lib/studio-v3/semanticProfile";
import {
  interestMedia,
  feelingMedia,
  resolveStudioMedia,
  type StudioMedia,
} from "@/lib/studio-v3/studioMediaResolver";

export type CanvasStage = "mood" | "threads" | "direction" | "composition" | "shaped";

export type CanvasThreadStatus = "active" | "supporting" | "deferred" | "excluded";

export type CanvasThread = {
  /** Stable across the whole session — reusable later by YOUR DAY. */
  id: string;
  label: string;
  image: StudioMedia;
  /** Lower = stronger. Mirrors semantic authority, never a score shown to users. */
  importance: number;
  status: CanvasThreadStatus;
  /** Canonical semantic key this thread was derived from. */
  sourceKey: string;
};

export type CanvasGeography =
  | { kind: "none" }
  | { kind: "region-cue"; regionLabel: string }
  | { kind: "anchors"; regionLabel: string; anchors: string[] }
  | {
      kind: "route";
      regionLabel: string;
      points: Array<{ label: string; lat: number; lng: number }>;
    }
  | { kind: "timeline"; regionLabel: string; steps: string[] };

export type CanvasMoment = {
  id: string;
  /**
   * STRUCTURAL identity of the moment (inventory / blueprint stop id), kept
   * strictly separate from the display label. `null` only for legacy hydrated
   * state that genuinely never carried identity.
   */
  stopId: string | null;
  label: string;
  story: string;
  hasCoordinates: boolean;
  /** Real stop imagery when it exists; region/mood only as an honest fallback. */
  image: StudioMedia;
};

export type LivingCanvasModel = {
  stage: CanvasStage;
  /** The atmospheric image behind everything. Always real Portugal. */
  backdrop: StudioMedia;
  threads: CanvasThread[];
  geography: CanvasGeography;
  moments: CanvasMoment[];
  /** True once the canvas shows real moments instead of abstract threads. */
  showsRealMoments: boolean;
  /** Deterministic identity of the whole canvas — metadata-free. */
  fingerprint: string;
};

/**
 * One composed/current route moment as the Canvas receives it.
 *
 * `stopId` is the SAME structural inventory/blueprint identity the rest of
 * Studio V3 uses (composition identity, commercial authority, editor state).
 * It is never derived from label, index or order. `image`/`focal` are the
 * VERIFIED per-point media the source already holds (authored Signature stop
 * photo, verified inventory media) — direct per-point truth, never a lookup
 * in an external label map.
 */
export type LivingCanvasPoint = {
  label: string;
  story: string;
  lat: number | null;
  lng: number | null;
  stopId?: string | null;
  image?: string | null;
  imageAlt?: string | null;
  focal?: string | null;
};

export type LivingCanvasInput = {
  feeling: Feeling | null;
  interests: readonly Interest[];
  questionHistory?: readonly QuestionAnswerEvent[];
  /** Resolved composition truth, when the Studio already has one. */
  composition?: {
    regionLabel: string;
    points: ReadonlyArray<LivingCanvasPoint>;
  } | null;
  /** True once the traveller has shaped the day (order / membership settled). */
  shaped?: boolean;
  /**
   * MIGRATION ONLY — legacy label-keyed media for old hydrated state that
   * genuinely carries no structural identity and no inline media. It is never
   * structural truth: it may not override a structural id and is consulted
   * only when the point itself has no verified image of its own.
   */
  stopImages?: Readonly<Record<string, { id: string; src: string; alt: string } | null>>;
};


const INTEREST_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  INTERESTS.map((option) => [option.id, option.label]),
);

function leadInterestOf(threads: readonly CanvasThread[]): Interest | null {
  const lead = threads.find((thread) => thread.status === "active");
  if (!lead) return null;
  const value = lead.sourceKey.split(":")[1] ?? "";
  return isInterest(value) ? value : null;
}

function threadId(interest: Interest): string {
  return `thread:interest:${interest}`;
}

function isInterest(value: string): value is Interest {
  return value in INTEREST_LABEL;
}

/**
 * Derive the canvas. Same input ⇒ byte-identical output, including the
 * order of threads and the fingerprint.
 */
export function deriveLivingCanvas(input: LivingCanvasInput): LivingCanvasModel {
  const history = input.questionHistory ?? [];
  const profile = deriveSemanticProfile({
    feeling: input.feeling,
    interests: input.interests,
    history,
  });
  const answers = deriveDirectorAnswerProjection(history);

  const seen = new Set<string>();
  const threads: CanvasThread[] = [];

  const push = (
    value: string,
    status: CanvasThreadStatus,
    importance: number,
    sourceKey: string,
  ) => {
    if (!isInterest(value)) return; // closed vocabulary only
    const id = threadId(value);
    if (seen.has(id)) return; // one stable thread per interest, never duplicated
    seen.add(id);
    threads.push({
      id,
      label: INTEREST_LABEL[value],
      image: interestMedia(value),
      importance,
      status,
      sourceKey,
    });
  };

  // Excluded first: an explicit "not this" must be visible as removed, not
  // silently absent, and can never be re-added as an active thread below.
  for (const signal of profile.explicitExclusions) {
    if (signal.domain !== "interest") continue;
    push(String(signal.value), "excluded", signal.authority, signal.key);
  }
  for (const signal of profile.leadInterests) {
    push(String(signal.value), "active", signal.authority, signal.key);
  }
  for (const signal of profile.contentInterests) {
    push(String(signal.value), "active", signal.authority, signal.key);
  }
  for (const signal of profile.supportingInterests) {
    push(String(signal.value), "supporting", signal.authority, signal.key);
  }

  const hasDirection =
    answers.selectedDiscoverySignals.length > 0 || answers.selectedDiscoveryChoiceKeys.length > 0;

  const points = input.composition?.points ?? [];
  const regionLabel = input.composition?.regionLabel ?? "";
  const routePoints = points
    .filter((point) => typeof point.lat === "number" && typeof point.lng === "number")
    .map((point) => ({ label: point.label, lat: point.lat as number, lng: point.lng as number }));

  const hasComposition = points.length > 0;
  const stage: CanvasStage = hasComposition
    ? input.shaped
      ? "shaped"
      : "composition"
    : hasDirection
      ? "direction"
      : threads.some((thread) => thread.status !== "excluded")
        ? "threads"
        : "mood";

  let geography: CanvasGeography = { kind: "none" };
  if (stage === "composition" || stage === "shaped") {
    geography =
      routePoints.length >= 2
        ? { kind: "route", regionLabel, points: routePoints }
        : // NEVER a fabricated polyline: an honest timeline instead.
          { kind: "timeline", regionLabel, steps: points.map((point) => point.label) };
  } else if (stage === "direction" && regionLabel) {
    geography = { kind: "region-cue", regionLabel };
  }

  const legacyStopImages = input.stopImages ?? {};
  const usedMomentIds = new Set<string>();
  const moments: CanvasMoment[] =
    stage === "composition" || stage === "shaped"
      ? points.map((point, index) => {
          const stopId = typeof point.stopId === "string" && point.stopId.trim()
            ? point.stopId.trim()
            : null;

          // 1 · VERIFIED per-point media travelling with the moment itself.
          const inline =
            typeof point.image === "string" && point.image.trim()
              ? {
                  id: stopId ? `stop:${stopId}` : `stop-media:${point.image.trim()}`,
                  src: point.image.trim(),
                  alt: publicMomentAltText(point.label, point.imageAlt),
                  focal: point.focal ?? null,
                }
              : null;

          // 2 · MIGRATION ONLY — a legacy label-keyed lookup, allowed strictly
          //     for identity-less, media-less hydrated points. It never
          //     overrides a structural id and never borrows across stops.
          const legacy =
            !inline && !stopId ? (legacyStopImages[point.label.toLowerCase()] ?? null) : null;

          // Structural identity decides the moment id whenever it exists, so
          // renaming a stop can never change its visual identity.
          let id = stopId ? `moment:${stopId}` : `moment:${index}:${point.label}`;
          if (usedMomentIds.has(id)) id = `${id}#${index}`;
          usedMomentIds.add(id);

          return {
            id,
            stopId,
            label: point.label,
            story: point.story,
            hasCoordinates: typeof point.lat === "number" && typeof point.lng === "number",
            image: resolveStudioMedia({
              role: "stop_preview",
              stopImage: inline ?? legacy,
              regionLabel,
              interest: leadInterestOf(threads),
              feeling: input.feeling,
            }),
          };
        })
      : [];


  const leadThread = threads.find((thread) => thread.status === "active");
  const backdrop =
    // Once real moments exist, the canvas shows the day itself — the same
    // media identity the reveal will use, so nothing swaps at the end.
    moments.length > 0
      ? moments[0].image
      : stage === "mood" || !leadThread
        ? feelingMedia(input.feeling)
        : resolveStudioMedia({
            role: "studio_canvas",
            regionLabel: regionLabel || null,
            interest: leadInterestOf(threads),
            feeling: input.feeling,
          });


  const fingerprint = JSON.stringify([
    stage,
    backdrop.id,
    threads.map((thread) => [thread.id, thread.status, thread.image.id]),
    geography.kind,
    moments.map((moment) => [moment.id, moment.image.id]),
  ]);

  return {
    stage,
    backdrop,
    threads,
    geography,
    moments,
    showsRealMoments: moments.length > 0,
    fingerprint,
  };
}

/** True when the canvas may show any map surface at all. */
export function canvasShowsMap(model: LivingCanvasModel): boolean {
  return model.geography.kind === "route";
}
