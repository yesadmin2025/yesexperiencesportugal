import { useState } from "react";
import { ArrowRight, CarFront, Clock3, Compass, RefreshCw, Undo2, Waves, Wine } from "lucide-react";

import {
  formatLivingAtlasDuration,
  livingAtlasPreviewDayTitle,
  type LivingAtlasPreviewPreferences,
} from "@/components/studio-v3/livingAtlasPreviewComposition";
import {
  formatLivingAtlasDurationDelta,
  type LivingAtlasAlternativesBySlot,
  type LivingAtlasReplacementMap,
  type LivingAtlasResolvedComposition,
} from "@/components/studio-v3/livingAtlasAlternatives";
import { deriveLivingAtlasPaceSummary } from "@/components/studio-v3/livingAtlasOperationalConfidence";
import type { LivingAtlasRoutePlan } from "@/components/studio-v3/livingAtlasRoutePlanner";
import type {
  ExperienceProfile,
  LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  ARRABIDA_SIGNATURES,
  BackButton,
  CompositionStatus,
  PreferencePanel,
  ReactivePortugalMap,
  SIGNATURE_REGION,
  SegmentedChoice,
  StepHeading,
  dimensionLabel,
} from "@/components/studio-v3/LivingAtlasPreviewPrimitives";
import {
  LivingAtlasOperationalBadges,
  LivingAtlasPaceCard,
} from "@/components/studio-v3/LivingAtlasOperationalConfidence";
import {
  incomingLivingAtlasRouteLeg,
  LivingAtlasRouteSummary,
} from "@/components/studio-v3/LivingAtlasRouteSummary";

export function ShapeStep({
  signatureId,
  signatureTitle,
  profile,
  preferences,
  onPreferencesChange,
  composition,
  routePlan,
  alternativesBySlot,
  replacements,
  isPersisted,
  statusMessage,
  onReplace,
  onUndo,
  onBack,
}: {
  signatureId: LivingAtlasSignatureId;
  signatureTitle: string;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  onPreferencesChange: (preferences: LivingAtlasPreviewPreferences) => void;
  composition: LivingAtlasResolvedComposition;
  routePlan: LivingAtlasRoutePlan;
  alternativesBySlot: LivingAtlasAlternativesBySlot;
  replacements: LivingAtlasReplacementMap;
  isPersisted: boolean;
  statusMessage: string;
  onReplace: (slotId: string, stopId: string, message: string) => void;
  onUndo: (slotId: string, message: string) => void;
  onBack: () => void;
}) {
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const isArrabida = ARRABIDA_SIGNATURES.has(signatureId);
  const orderedMoments = routePlan.orderedMoments;
  const title = livingAtlasPreviewDayTitle({ moments: orderedMoments });
  const paceSummary = deriveLivingAtlasPaceSummary({
    density: preferences.density,
    stopMinutes: composition.totalDurationMin,
    transferMinutes: routePlan.totalEstimatedDrivingMin,
    routeStatus: routePlan.status,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <StepHeading
        eyebrow="Your day is taking shape"
        title={title}
        copy="This is a working itinerary made from verified regional moments. Change one answer and the actual draft responds."
      />
      <div
        className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-center"
        role="status"
        aria-live="polite"
      >
        {isPersisted ? (
          <span
            className="rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: "color-mix(in oklab, var(--gold) 34%, transparent)",
              color: "var(--gold)",
            }}
          >
            Saved on this device
          </span>
        ) : null}
        <span
          className="text-[11px] leading-5"
          style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}
        >
          {statusMessage ||
            "Every change is checked against the region, timing and interests before it enters your day."}
        </span>
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          <ReactivePortugalMap activeSignatureId={signatureId} candidates={[]} />
          <LivingAtlasRouteSummary routePlan={routePlan} />
          <LivingAtlasPaceCard summary={paceSummary} />
          <PreferencePanel
            label="How full should the day feel?"
            icon={<Clock3 size={16} aria-hidden />}
          >
            <SegmentedChoice
              value={preferences.density}
              options={[
                { value: "slow", label: "Slow" },
                { value: "balanced", label: "Balanced" },
                { value: "rich", label: "Rich" },
              ]}
              onChange={(density) => onPreferencesChange({ ...preferences, density })}
            />
          </PreferencePanel>
          {profile.selected.includes("wine-table") ? (
            <PreferencePanel
              label="How much space should wine take?"
              icon={<Wine size={16} aria-hidden />}
            >
              <SegmentedChoice
                value={preferences.wineEmphasis}
                options={[
                  { value: "one-winery", label: "One meaningful winery" },
                  { value: "wine-centred", label: "Wine at the centre" },
                ]}
                onChange={(wineEmphasis) => onPreferencesChange({ ...preferences, wineEmphasis })}
              />
            </PreferencePanel>
          ) : null}
          {isArrabida && profile.selected.includes("atlantic-coast") ? (
            <PreferencePanel
              label="How should the Atlantic enter the day?"
              icon={<Waves size={16} aria-hidden />}
            >
              <SegmentedChoice
                value={preferences.atlanticMode}
                options={[
                  { value: "coast", label: "From the coast" },
                  { value: "boat", label: "From the water" },
                ]}
                onChange={(atlanticMode) => onPreferencesChange({ ...preferences, atlanticMode })}
              />
            </PreferencePanel>
          ) : null}
          {isArrabida && profile.selected.includes("local-life") ? (
            <PreferencePanel
              label="Which local moment matters more?"
              icon={<Compass size={16} aria-hidden />}
            >
              <SegmentedChoice
                value={preferences.localMoment}
                options={[
                  { value: "market", label: "Market" },
                  { value: "village", label: "Village life" },
                ]}
                onChange={(localMoment) => onPreferencesChange({ ...preferences, localMoment })}
              />
            </PreferencePanel>
          ) : null}
        </div>

        <div
          className="overflow-hidden rounded-2xl border"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 36%, transparent)",
            background: "color-mix(in oklab, var(--ivory) 4%, transparent)",
          }}
        >
          <div
            className="flex flex-wrap items-start justify-between gap-4 border-b p-5 sm:p-6"
            style={{ borderColor: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}
          >
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--gold)" }}
              >
                {SIGNATURE_REGION[signatureId]}
              </p>
              <h2
                className="mt-2 text-[24px] font-semibold"
                style={{ fontFamily: "var(--font-editorial)" }}
              >
                {title}
              </h2>
              <p
                className="mt-2 text-[11px] leading-5"
                style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}
              >
                Operational skeleton: {signatureTitle}. Traveller-facing identity comes from the
                composed moments above.
              </p>
            </div>
            <div
              className="rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{
                borderColor: "color-mix(in oklab, var(--gold) 40%, transparent)",
                color: "var(--gold)",
              }}
            >
              {formatLivingAtlasDuration(composition.totalDurationMin)} of stops
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <CompositionStatus composition={composition} />
            <ol className="mt-6 space-y-3">
              {orderedMoments.map((moment, index) => {
                const alternatives = alternativesBySlot[moment.slotId] ?? [];
                const expanded = expandedSlotId === moment.slotId;
                const changed = Boolean(replacements[moment.slotId]);
                const incomingLeg = incomingLivingAtlasRouteLeg(routePlan, moment.stopId);

                return (
                  <li
                    key={moment.slotId}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: changed
                        ? "color-mix(in oklab, var(--gold) 48%, transparent)"
                        : "color-mix(in oklab, var(--ivory) 13%, transparent)",
                      background: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                    }}
                  >
                    {incomingLeg ? (
                      <div
                        className="mb-3 flex items-center gap-2 border-b pb-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                        style={{
                          borderColor: "color-mix(in oklab, var(--ivory) 10%, transparent)",
                          color: "color-mix(in oklab, var(--ivory) 48%, transparent)",
                        }}
                      >
                        <CarFront size={12} aria-hidden />
                        Estimated transfer · {incomingLeg.estimatedDrivingMin} min ·{" "}
                        {incomingLeg.estimatedRoadKm} km
                      </div>
                    ) : null}
                    <div className="grid grid-cols-[2rem_1fr_auto] gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{ background: "var(--gold)", color: "var(--charcoal)" }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold">{moment.label}</p>
                          {changed ? (
                            <span
                              className="rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em]"
                              style={{
                                background: "color-mix(in oklab, var(--gold) 18%, transparent)",
                                color: "var(--gold)",
                              }}
                            >
                              Your change
                            </span>
                          ) : null}
                        </div>
                        {moment.originalLabel ? (
                          <p
                            className="mt-1 text-[10px] leading-4"
                            style={{ color: "color-mix(in oklab, var(--ivory) 48%, transparent)" }}
                          >
                            Replaces {moment.originalLabel}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {moment.dimensions
                            .filter((dimension) => profile.selected.includes(dimension))
                            .map((dimension) => (
                              <span
                                key={dimension}
                                className="rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]"
                                style={{
                                  borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
                                  color: "color-mix(in oklab, var(--ivory) 72%, transparent)",
                                }}
                              >
                                {dimensionLabel(dimension)}
                              </span>
                            ))}
                        </div>
                        <div className="mt-3">
                          <LivingAtlasOperationalBadges type={moment.type} />
                        </div>
                      </div>
                      <span
                        className="pt-1 text-[11px]"
                        style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}
                      >
                        {moment.durationMin} min
                      </span>
                    </div>

                    <div
                      className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                      style={{ borderColor: "color-mix(in oklab, var(--ivory) 10%, transparent)" }}
                    >
                      <span
                        className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                        style={{ color: "color-mix(in oklab, var(--ivory) 46%, transparent)" }}
                      >
                        {alternatives.length > 0
                          ? "Validated choices available"
                          : "Protected by your answers"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {changed ? (
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSlotId(null);
                              onUndo(
                                moment.slotId,
                                moment.label + " was removed and the original moment was restored.",
                              );
                            }}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                            style={{
                              borderColor: "color-mix(in oklab, var(--ivory) 18%, transparent)",
                            }}
                          >
                            <Undo2 size={12} aria-hidden /> Undo
                          </button>
                        ) : null}
                        {alternatives.length > 0 ? (
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={"living-atlas-alternatives-" + moment.slotId}
                            onClick={() => setExpandedSlotId(expanded ? null : moment.slotId)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                            style={{
                              borderColor: "color-mix(in oklab, var(--gold) 38%, transparent)",
                              color: "var(--gold)",
                            }}
                          >
                            <RefreshCw size={12} aria-hidden />
                            {expanded ? "Hide alternatives" : alternatives.length + " alternatives"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {expanded ? (
                      <div
                        id={"living-atlas-alternatives-" + moment.slotId}
                        className="mt-3 grid gap-2 sm:grid-cols-2"
                        role="region"
                        aria-label={"Alternatives to " + moment.label}
                      >
                        {alternatives.map((alternative) => (
                          <article
                            key={alternative.moment.stopId}
                            className="rounded-xl border p-3"
                            style={{
                              borderColor: "color-mix(in oklab, var(--gold) 24%, transparent)",
                              background: "color-mix(in oklab, var(--ivory) 4%, transparent)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-[13px] font-semibold leading-5">
                                  {alternative.moment.label}
                                </h3>
                                <p
                                  className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em]"
                                  style={{ color: "var(--gold)" }}
                                >
                                  {formatLivingAtlasDurationDelta(alternative.durationDeltaMin)}
                                </p>
                              </div>
                              <span
                                className="rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em]"
                                style={{
                                  borderColor: "color-mix(in oklab, var(--ivory) 16%, transparent)",
                                }}
                              >
                                Checked
                              </span>
                            </div>
                            <p
                              className="mt-2 text-[11px] leading-5"
                              style={{
                                color: "color-mix(in oklab, var(--ivory) 62%, transparent)",
                              }}
                            >
                              {alternative.explanation}
                            </p>
                            <div className="mt-3">
                              <LivingAtlasOperationalBadges
                                type={alternative.moment.type}
                                compact
                              />
                            </div>
                            <button
                              type="button"
                              aria-label={
                                "Replace " + moment.label + " with " + alternative.moment.label
                              }
                              onClick={() => {
                                setExpandedSlotId(null);
                                onReplace(
                                  moment.slotId,
                                  alternative.moment.stopId,
                                  moment.label +
                                    " was replaced by " +
                                    alternative.moment.label +
                                    ". The title, duration, coverage and route were recalculated.",
                                );
                              }}
                              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                              style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
                            >
                              Use this moment <ArrowRight size={12} aria-hidden />
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <p
              className="mt-5 text-[11px] leading-5"
              style={{ color: "color-mix(in oklab, var(--ivory) 52%, transparent)" }}
            >
              The geographic sequence and internal transfers are planning estimates from verified
              coordinates. Opening hours, live traffic, pickup routing, supplier availability and
              sea conditions still require operational confirmation.
            </p>
          </div>
        </div>
      </div>
      <BackButton onClick={onBack} label="Back to recommendation" />
    </div>
  );
}
