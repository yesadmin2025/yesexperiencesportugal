import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";

import type { LivingAtlasDecision } from "@/components/studio-v3/livingAtlasDecision";
import type { LivingAtlasResolvedComposition } from "@/components/studio-v3/livingAtlasAlternatives";
import {
  EXPERIENCE_DIMENSIONS,
  SIGNATURE_DISCOVERY_DOORS,
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";

export const SIGNATURE_REGION: Readonly<Record<LivingAtlasSignatureId, string>> = {
  "arrabida-wine-allinclusive": "Arrábida · Setúbal · Azeitão",
  "arrabida-boat": "Arrábida · Sesimbra",
  "wild-beaches-picnic": "Arrábida · Atlantic coast",
  "tiles-workshop": "Azeitão · Sesimbra",
  "azeitao-cheese": "Azeitão · Arrábida",
  "sintra-cascais": "Sintra · Cascais · Atlantic coast",
  "troia-comporta": "Tróia · Comporta · Alentejo coast",
  "evora-alentejo": "Évora · Alentejo",
  "tomar-coimbra": "Tomar · Coimbra · Central Portugal",
  "fatima-nazare-obidos": "Fátima · Nazaré · Óbidos",
  "roman-heritage-alentejo": "Vidigueira · Roman Alentejo",
  "southwest-vicentine-coast": "Southwest Alentejo · Vicentine Coast",
};

export const ARRABIDA_SIGNATURES = new Set<LivingAtlasSignatureId>([
  "arrabida-wine-allinclusive",
  "arrabida-boat",
  "wild-beaches-picnic",
  "tiles-workshop",
  "azeitao-cheese",
]);

const MAP_POINTS: ReadonlyArray<{
  id: LivingAtlasSignatureId;
  x: number;
  y: number;
  label: string;
}> = [
  { id: "tomar-coimbra", x: 52, y: 24, label: "Tomar · Coimbra" },
  { id: "fatima-nazare-obidos", x: 30, y: 35, label: "Fátima · Nazaré · Óbidos" },
  { id: "sintra-cascais", x: 18, y: 51, label: "Sintra · Cascais" },
  { id: "arrabida-wine-allinclusive", x: 34, y: 58, label: "Arrábida · Setúbal" },
  { id: "arrabida-boat", x: 38, y: 61, label: "Sesimbra coast" },
  { id: "wild-beaches-picnic", x: 29, y: 63, label: "Arrábida beaches" },
  { id: "tiles-workshop", x: 40, y: 56, label: "Azeitão craft" },
  { id: "azeitao-cheese", x: 43, y: 59, label: "Azeitão table" },
  { id: "troia-comporta", x: 37, y: 69, label: "Tróia · Comporta" },
  { id: "evora-alentejo", x: 63, y: 67, label: "Évora" },
  { id: "roman-heritage-alentejo", x: 58, y: 77, label: "Vidigueira · Talha" },
  { id: "southwest-vicentine-coast", x: 24, y: 84, label: "Vicentine Coast" },
];

export function dimensionLabel(id: ExperienceDimensionId): string {
  return EXPERIENCE_DIMENSIONS.find((item) => item.id === id)?.label ?? id;
}

export function signatureDistinction(id: LivingAtlasSignatureId): string {
  return SIGNATURE_DISCOVERY_DOORS.find((item) => item.signatureId === id)?.distinction ?? "";
}

export function decisionTitle(decision: LivingAtlasDecision): string {
  if (decision.status === "precision-fork") return "Two real directions remain.";
  if (decision.status === "weak") return "This combination needs one honest adjustment.";
  if (decision.status === "invalid") return "One more clear choice is needed.";
  return "Your Portugal is beginning to take shape.";
}

export function StepHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{ color: "var(--gold)" }}
      >
        {eyebrow}
      </p>
      <h1
        className="mt-4 text-[30px] font-semibold leading-tight sm:text-[46px]"
        style={{ fontFamily: "var(--font-editorial)" }}
      >
        {title}
      </h1>
      <p
        className="mx-auto mt-4 max-w-2xl text-[13px] leading-6 sm:text-[15px]"
        style={{ color: "color-mix(in oklab, var(--ivory) 70%, transparent)" }}
      >
        {copy}
      </p>
    </div>
  );
}

export function ReactivePortugalMap({
  activeSignatureId,
  candidates,
}: {
  activeSignatureId: LivingAtlasSignatureId | null;
  candidates: LivingAtlasSignatureId[];
}) {
  return (
    <div
      className="relative min-h-80 overflow-hidden rounded-2xl border p-5"
      style={{
        borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--gold) 8%, transparent), color-mix(in oklab, var(--ivory) 3%, transparent))",
      }}
      aria-label="Living Atlas regional narrowing"
    >
      <div className="absolute inset-5">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          role="img"
          aria-label="Editorial map of Portugal with the selected experience region highlighted"
        >
          <path
            d="M46 5 C58 10 62 20 58 30 C64 39 59 48 62 57 C67 67 63 78 55 94 L30 91 C25 80 28 70 22 62 C18 52 24 43 22 33 C27 21 31 10 46 5 Z"
            fill="color-mix(in oklab, var(--ivory) 7%, transparent)"
            stroke="color-mix(in oklab, var(--ivory) 26%, transparent)"
            strokeWidth="1"
          />
          {MAP_POINTS.map((point) => {
            const active = activeSignatureId === point.id;
            const candidate = candidates.includes(point.id);
            return (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={active ? 3.6 : candidate ? 2.8 : 1.5}
                  fill={
                    active
                      ? "var(--gold)"
                      : candidate
                        ? "var(--ivory)"
                        : "color-mix(in oklab, var(--ivory) 34%, transparent)"
                  }
                />
                {active ? (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="0.8"
                    opacity="0.55"
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="relative z-10 flex h-full min-h-72 flex-col justify-between">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.24em]"
            style={{ color: "var(--gold)" }}
          >
            Living Atlas
          </p>
          <p
            className="mt-2 max-w-48 text-[12px] leading-5"
            style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}
          >
            {activeSignatureId
              ? SIGNATURE_REGION[activeSignatureId]
              : candidates.length
                ? "Two regions remain alive"
                : "Portugal before the choice"}
          </p>
        </div>
        <p
          className="text-[9px] uppercase tracking-[0.16em]"
          style={{ color: "color-mix(in oklab, var(--ivory) 42%, transparent)" }}
        >
          Editorial orientation, not navigation
        </p>
      </div>
    </div>
  );
}

export function ProfileSummary({
  profile,
  destinationFixed,
}: {
  profile: ExperienceProfile;
  destinationFixed: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "color-mix(in oklab, var(--ivory) 5%, transparent)",
        borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)",
      }}
    >
      <div className="flex flex-wrap gap-2">
        {profile.leads.map((id) => (
          <span
            key={id}
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ background: "var(--gold)", color: "var(--charcoal)" }}
          >
            Leads · {dimensionLabel(id)}
          </span>
        ))}
        {profile.selected
          .filter((id) => !profile.leads.includes(id))
          .map((id) => (
            <span
              key={id}
              className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ borderColor: "color-mix(in oklab, var(--ivory) 22%, transparent)" }}
            >
              Supports · {dimensionLabel(id)}
            </span>
          ))}
      </div>
      {destinationFixed ? (
        <p
          className="mt-4 flex items-center gap-2 text-[12px]"
          style={{ color: "color-mix(in oklab, var(--ivory) 64%, transparent)" }}
        >
          <MapPin size={14} style={{ color: "var(--gold)" }} aria-hidden /> Destination fixed as a
          hard boundary.
        </p>
      ) : null}
    </div>
  );
}

export function PreferencePanel({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in oklab, var(--ivory) 14%, transparent)",
        background: "color-mix(in oklab, var(--ivory) 4%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        {icon}
        <h2>{label}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="min-h-10 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-[0.14em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{
              background: active
                ? "color-mix(in oklab, var(--gold) 18%, transparent)"
                : "transparent",
              borderColor: active
                ? "var(--gold)"
                : "color-mix(in oklab, var(--ivory) 16%, transparent)",
              color: active ? "var(--ivory)" : "color-mix(in oklab, var(--ivory) 64%, transparent)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CompositionStatus({
  composition,
}: {
  composition: LivingAtlasResolvedComposition;
}) {
  const complete = composition.status === "complete";
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: complete
          ? "color-mix(in oklab, var(--gold) 40%, transparent)"
          : "color-mix(in oklab, #d78b62 55%, transparent)",
        background: complete
          ? "color-mix(in oklab, var(--gold) 9%, transparent)"
          : "color-mix(in oklab, #d78b62 9%, transparent)",
      }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-[0.18em]"
        style={{ color: complete ? "var(--gold)" : "#e2aa88" }}
      >
        {complete
          ? "All selected threads are visible"
          : composition.status === "impossible"
            ? "One hard request cannot be fulfilled"
            : "The draft still has a gap"}
      </p>
      {!complete ? (
        <p
          className="mt-2 text-[12px] leading-5"
          style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}
        >
          Missing interests:{" "}
          {composition.missingDimensions.map(dimensionLabel).join(", ") || "none"}. Missing activity
          types: {composition.missingRequiredTypes.join(", ") || "none"}.
        </p>
      ) : null}
    </div>
  );
}

export function EvidenceCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4" style={{ background: "var(--charcoal)" }}>
      <p
        className="text-[9px] font-bold uppercase tracking-[0.18em]"
        style={{ color: "color-mix(in oklab, var(--ivory) 48%, transparent)" }}
      >
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5">{value}</p>
    </div>
  );
}

export function StepActions({
  onBack,
  onContinue,
  disabled,
}: {
  onBack: () => void;
  onContinue: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mx-auto mt-9 flex max-w-4xl items-center justify-between gap-3">
      <BackButton onClick={onBack} label="Back" compact />
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[10px] font-bold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-30"
        style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
      >
        Continue <ArrowRight size={14} aria-hidden />
      </button>
    </div>
  );
}

export function BackButton({
  onClick,
  label,
  compact = false,
}: {
  onClick: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "mt-8"}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
        style={{ borderColor: "color-mix(in oklab, var(--ivory) 22%, transparent)" }}
      >
        <ArrowLeft size={14} aria-hidden />
        {label}
      </button>
    </div>
  );
}
