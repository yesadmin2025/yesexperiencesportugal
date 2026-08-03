import { ArrowRight } from "lucide-react";

import { findTour } from "@/data/signatureTours";
import type { DestinationIntent } from "@/components/studio-v3/types";
import type { LivingAtlasDecision } from "@/components/studio-v3/livingAtlasDecision";
import type { ExperienceProfile, LivingAtlasSignatureId } from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  BackButton,
  EvidenceCell,
  ProfileSummary,
  ReactivePortugalMap,
  SIGNATURE_REGION,
  StepHeading,
  decisionTitle,
  dimensionLabel,
  signatureDistinction,
} from "@/components/studio-v3/LivingAtlasPreviewPrimitives";

export function ResultStep({
  decision,
  profile,
  destinationIntent,
  selectedTourTitle,
  onBack,
  onChooseFork,
  onCompose,
}: {
  decision: LivingAtlasDecision;
  profile: ExperienceProfile;
  destinationIntent: DestinationIntent;
  selectedTourTitle: string | null;
  onBack: () => void;
  onChooseFork: (signatureId: LivingAtlasSignatureId) => void;
  onCompose: () => void;
}) {
  const top = decision.ranked[0] ?? null;
  return (
    <div className="mx-auto max-w-5xl">
      <StepHeading
        eyebrow="The map awakens"
        title={decisionTitle(decision)}
        copy={
          decision.status === "precision-fork"
            ? "The system will not hide a close match behind an arbitrary score. Choose the real distinction that feels more like your day."
            : decision.status === "weak"
              ? "The chosen geography cannot truthfully carry every leading interest. The tension remains visible."
              : "The region is selected from your hierarchy, a hard destination boundary when chosen, and verified Signature structure."
        }
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <ReactivePortugalMap
          activeSignatureId={decision.selectedSignatureId}
          candidates={decision.forkCandidates.map((candidate) => candidate.signatureId)}
        />
        <div>
          <ProfileSummary
            profile={profile}
            destinationFixed={destinationIntent !== "no-preference"}
          />
          {decision.status === "precision-fork" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {decision.forkCandidates.map((candidate) => (
                <button
                  key={candidate.signatureId}
                  type="button"
                  onClick={() => onChooseFork(candidate.signatureId)}
                  className="group rounded-2xl border p-5 text-left transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                  style={{
                    background: "color-mix(in oklab, var(--ivory) 5%, transparent)",
                    borderColor: "color-mix(in oklab, var(--gold) 32%, transparent)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "var(--gold)" }}
                  >
                    {SIGNATURE_REGION[candidate.signatureId]}
                  </p>
                  <h2
                    className="mt-3 text-xl font-semibold"
                    style={{ fontFamily: "var(--font-editorial)" }}
                  >
                    {findTour(candidate.signatureId)?.title ?? candidate.signatureId}
                  </h2>
                  <p
                    className="mt-3 text-[12px] leading-6"
                    style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}
                  >
                    {signatureDistinction(candidate.signatureId)}
                  </p>
                  <p
                    className="mt-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--gold)" }}
                  >
                    This is my direction{" "}
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {decision.status === "clear" && decision.selectedSignatureId ? (
            <div
              className="mt-4 overflow-hidden rounded-2xl border"
              style={{ borderColor: "color-mix(in oklab, var(--gold) 38%, transparent)" }}
            >
              <div
                className="p-6"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--gold) 17%, transparent), color-mix(in oklab, var(--ivory) 4%, transparent))",
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: "var(--gold)" }}
                >
                  {SIGNATURE_REGION[decision.selectedSignatureId]}
                </p>
                <h2
                  className="mt-3 text-[27px] font-semibold leading-tight"
                  style={{ fontFamily: "var(--font-editorial)" }}
                >
                  {selectedTourTitle ?? decision.selectedSignatureId}
                </h2>
                <p
                  className="mt-3 text-[13px] leading-6"
                  style={{ color: "color-mix(in oklab, var(--ivory) 72%, transparent)" }}
                >
                  {signatureDistinction(decision.selectedSignatureId)}
                </p>
                <button
                  type="button"
                  onClick={onCompose}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
                >
                  Shape this day <ArrowRight size={14} aria-hidden />
                </button>
              </div>
              <div
                className="grid gap-px sm:grid-cols-3"
                style={{ background: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}
              >
                <EvidenceCell
                  label="Decision lead"
                  value={
                    top && decision.ranked[1]
                      ? `${top.totalScore - decision.ranked[1].totalScore} points`
                      : "Direct fit"
                  }
                />
                <EvidenceCell
                  label="Lead coverage"
                  value={
                    top
                      ? `${top.leadCoverage.filter((item) => item.strength >= 2).length} of ${top.leadCoverage.length}`
                      : "—"
                  }
                />
                <EvidenceCell
                  label="Missing threads"
                  value={
                    top?.missingCoverage.length
                      ? top.missingCoverage.map(dimensionLabel).join(", ")
                      : "None"
                  }
                />
              </div>
            </div>
          ) : null}

          {decision.status === "weak" ? (
            <div
              className="mt-4 rounded-2xl border p-5"
              style={{
                background: "color-mix(in oklab, var(--ivory) 5%, transparent)",
                borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)",
              }}
            >
              <p
                className="text-[13px] leading-6"
                style={{ color: "color-mix(in oklab, var(--ivory) 72%, transparent)" }}
              >
                The strongest available direction is{" "}
                {top ? (findTour(top.signatureId)?.title ?? top.signatureId) : "not yet clear"}, but
                at least one lead has no structural place in it. Refine the hierarchy rather than
                accepting decorative copy.
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <BackButton onClick={onBack} label="Refine choices" />
    </div>
  );
}
