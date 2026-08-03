import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, RotateCcw } from "lucide-react";

import { findTour } from "@/data/signatureTours";
import type { DestinationIntent } from "@/components/studio-v3/types";
import {
  DISCOVERY_SIGNAL_BY_SIGNATURE,
  decideLivingAtlasSignature,
  type LivingAtlasDecision,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  EXPERIENCE_DIMENSIONS,
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  SIGNATURE_DISCOVERY_DOORS,
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";

type Stage = "entry" | "destination" | "interests" | "priority" | "result";
type PathMode = "discover" | "destination";

type DestinationChoice = {
  id: DestinationIntent;
  label: string;
  whisper: string;
};

const DESTINATION_CHOICES: readonly DestinationChoice[] = [
  {
    id: "spiritual-coast",
    label: "Fátima, Nazaré & Óbidos",
    whisper: "Living faith, Atlantic scenery and a medieval walled town.",
  },
  {
    id: "central-portugal",
    label: "Tomar & Coimbra",
    whisper: "Templars, ancient orders and Portugal's scholarly heritage.",
  },
  {
    id: "arrabida-setubal-azeitao",
    label: "Arrábida, Setúbal & Azeitão",
    whisper: "Wine, coast, craft and local life close to Lisbon.",
  },
  {
    id: "lisbon-sintra-cascais",
    label: "Sintra & Cascais",
    whisper: "Palaces, estates, forests and Atlantic cliffs.",
  },
  {
    id: "alentejo-evora-wine",
    label: "Évora & classic Alentejo",
    whisper: "Monumental heritage and the region's established wine estates.",
  },
  {
    id: "alentejo-roman-talha",
    label: "Roman Talha & Vidigueira",
    whisper: "Clay amphorae, Roman roots and a family cellar.",
  },
  {
    id: "comporta-troia",
    label: "Tróia & Comporta",
    whisper: "Ferry, Roman ruins, rice fields, wine and Atlantic beaches.",
  },
  {
    id: "vicentine-coast",
    label: "Southwest Vicentine Coast",
    whisper: "Remote villages, river mouths and Portugal's wild Atlantic edge.",
  },
] as const;

const SIGNATURE_REGION: Readonly<Record<LivingAtlasSignatureId, string>> = {
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

function dimensionLabel(id: ExperienceDimensionId): string {
  return EXPERIENCE_DIMENSIONS.find((item) => item.id === id)?.label ?? id;
}

function signatureDistinction(id: LivingAtlasSignatureId): string {
  return SIGNATURE_DISCOVERY_DOORS.find((item) => item.signatureId === id)?.distinction ?? "";
}

function decisionTitle(decision: LivingAtlasDecision): string {
  if (decision.status === "precision-fork") return "Two directions fit you beautifully.";
  if (decision.status === "weak") return "This combination needs one honest adjustment.";
  if (decision.status === "invalid") return "We need one more clear choice.";
  return "Your Portugal is beginning to take shape.";
}

export function LivingAtlasPreview() {
  const [stage, setStage] = useState<Stage>("entry");
  const [pathMode, setPathMode] = useState<PathMode | null>(null);
  const [destinationIntent, setDestinationIntent] = useState<DestinationIntent>("no-preference");
  const [selected, setSelected] = useState<ExperienceDimensionId[]>([]);
  const [leads, setLeads] = useState<ExperienceDimensionId[]>([]);
  const [discoverySignal, setDiscoverySignal] = useState<LivingAtlasDiscoverySignal | null>(null);

  const profile: ExperienceProfile = useMemo(
    () => ({ selected, leads }),
    [selected, leads],
  );

  const decision = useMemo(
    () =>
      leads.length > 0
        ? decideLivingAtlasSignature({
            profile,
            destinationIntent,
            discoverySignal,
          })
        : null,
    [profile, destinationIntent, discoverySignal, leads.length],
  );

  const selectedTour = decision?.selectedSignatureId
    ? findTour(decision.selectedSignatureId)
    : null;

  const reset = () => {
    setStage("entry");
    setPathMode(null);
    setDestinationIntent("no-preference");
    setSelected([]);
    setLeads([]);
    setDiscoverySignal(null);
  };

  const startDiscover = () => {
    setPathMode("discover");
    setDestinationIntent("no-preference");
    setStage("interests");
  };

  const startDestination = () => {
    setPathMode("destination");
    setStage("destination");
  };

  const toggleSelected = (id: ExperienceDimensionId) => {
    setDiscoverySignal(null);
    setSelected((current) => {
      if (current.includes(id)) {
        setLeads((currentLeads) => currentLeads.filter((lead) => lead !== id));
        return current.filter((item) => item !== id);
      }
      if (current.length >= MAX_SELECTED_DIMENSIONS) return current;
      return [...current, id];
    });
  };

  const toggleLead = (id: ExperienceDimensionId) => {
    setDiscoverySignal(null);
    setLeads((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_LEAD_DIMENSIONS) return current;
      return [...current, id];
    });
  };

  const continueFromInterests = () => {
    if (selected.length === 0) return;
    if (selected.length === 1) {
      setLeads([selected[0]]);
      setStage("result");
      return;
    }
    setStage("priority");
  };

  const chooseFork = (signatureId: LivingAtlasSignatureId) => {
    setDiscoverySignal(DISCOVERY_SIGNAL_BY_SIGNATURE[signatureId]);
  };

  const goBack = () => {
    if (stage === "destination") {
      setStage("entry");
      return;
    }
    if (stage === "interests") {
      setStage(pathMode === "destination" ? "destination" : "entry");
      return;
    }
    if (stage === "priority") {
      setStage("interests");
      return;
    }
    if (stage === "result") {
      setDiscoverySignal(null);
      setStage(selected.length > 1 ? "priority" : "interests");
    }
  };

  return (
    <main
      className="min-h-[100dvh] w-full px-4 py-8 sm:px-6 sm:py-12"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--gold) 13%, transparent), transparent 38%), var(--charcoal)",
        color: "var(--ivory)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: "var(--gold)" }}
            >
              YES Experience Studio · Living Atlas preview
            </p>
            <p
              className="mt-1 text-[11px] leading-relaxed"
              style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}
            >
              Isolated prototype. No booking, price or production behaviour is changed.
            </p>
          </div>
          {stage !== "entry" ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
              style={{
                borderColor: "color-mix(in oklab, var(--ivory) 20%, transparent)",
                color: "color-mix(in oklab, var(--ivory) 72%, transparent)",
              }}
            >
              <RotateCcw size={13} aria-hidden />
              Restart
            </button>
          ) : null}
        </header>

        <section className="flex flex-1 items-center py-8 sm:py-12">
          <div className="w-full">
            {stage === "entry" ? (
              <EntryStep onDiscover={startDiscover} onDestination={startDestination} />
            ) : null}

            {stage === "destination" ? (
              <DestinationStep
                value={destinationIntent}
                onChange={setDestinationIntent}
                onBack={goBack}
                onContinue={() => setStage("interests")}
              />
            ) : null}

            {stage === "interests" ? (
              <InterestsStep
                selected={selected}
                onToggle={toggleSelected}
                onBack={goBack}
                onContinue={continueFromInterests}
              />
            ) : null}

            {stage === "priority" ? (
              <PriorityStep
                selected={selected}
                leads={leads}
                onToggle={toggleLead}
                onBack={goBack}
                onContinue={() => setStage("result")}
              />
            ) : null}

            {stage === "result" && decision ? (
              <ResultStep
                decision={decision}
                selectedTourTitle={selectedTour?.title ?? null}
                profile={profile}
                destinationIntent={destinationIntent}
                onBack={goBack}
                onChooseFork={chooseFork}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function EntryStep({
  onDiscover,
  onDestination,
}: {
  onDiscover: () => void;
  onDestination: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{ color: "var(--gold)" }}
      >
        The invitation
      </p>
      <h1
        className="mx-auto mt-5 max-w-3xl text-[34px] font-semibold leading-[1.04] sm:text-[56px]"
        style={{ fontFamily: "var(--font-editorial)" }}
      >
        There is more than one Portugal. Let&apos;s find yours.
      </h1>
      <p
        className="mx-auto mt-5 max-w-xl text-[14px] leading-7 sm:text-[16px]"
        style={{ color: "color-mix(in oklab, var(--ivory) 72%, transparent)" }}
      >
        Choose what belongs in the day. The route, region and Signature will respond.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <PathCard
          eyebrow="Discover"
          title="Help me find my day"
          whisper="Start with one to three things that matter to you."
          onClick={onDiscover}
        />
        <PathCard
          eyebrow="Direct"
          title="I know where I want to go"
          whisper="Fix the destination first, then shape the day inside it."
          onClick={onDestination}
        />
      </div>
    </div>
  );
}

function PathCard({
  eyebrow,
  title,
  whisper,
  onClick,
}: {
  eyebrow: string;
  title: string;
  whisper: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-44 rounded-2xl border p-6 text-left transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{
        background: "color-mix(in oklab, var(--ivory) 5%, transparent)",
        borderColor: "color-mix(in oklab, var(--gold) 36%, transparent)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "var(--gold)" }}>
        {eyebrow}
      </p>
      <h2 className="mt-5 text-2xl font-semibold" style={{ fontFamily: "var(--font-editorial)" }}>
        {title}
      </h2>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="max-w-sm text-[13px] leading-6" style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}>
          {whisper}
        </p>
        <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" size={18} aria-hidden />
      </div>
    </button>
  );
}

function StepHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
        {eyebrow}
      </p>
      <h1 className="mt-4 text-[30px] font-semibold leading-tight sm:text-[46px]" style={{ fontFamily: "var(--font-editorial)" }}>
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-[13px] leading-6 sm:text-[15px]" style={{ color: "color-mix(in oklab, var(--ivory) 70%, transparent)" }}>
        {copy}
      </p>
    </div>
  );
}

function DestinationStep({
  value,
  onChange,
  onBack,
  onContinue,
}: {
  value: DestinationIntent;
  onChange: (value: DestinationIntent) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const hasChoice = value !== "no-preference";
  return (
    <div>
      <StepHeading
        eyebrow="Fix the geography"
        title="Where should the day live?"
        copy="A destination chosen here becomes a hard boundary. The Studio may reshape the day, but it will not quietly send you somewhere else."
      />
      <div className="mx-auto mt-9 grid max-w-4xl gap-3 sm:grid-cols-2">
        {DESTINATION_CHOICES.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item.id)}
              className="rounded-xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                background: active
                  ? "color-mix(in oklab, var(--gold) 16%, transparent)"
                  : "color-mix(in oklab, var(--ivory) 4%, transparent)",
                borderColor: active
                  ? "var(--gold)"
                  : "color-mix(in oklab, var(--ivory) 16%, transparent)",
              }}
            >
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: "var(--gold)" }} aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold">{item.label}</p>
                  <p className="mt-1 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>
                    {item.whisper}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} disabled={!hasChoice} />
    </div>
  );
}

function InterestsStep({
  selected,
  onToggle,
  onBack,
  onContinue,
}: {
  selected: ExperienceDimensionId[];
  onToggle: (id: ExperienceDimensionId) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="The recognition"
        title="What belongs in your day?"
        copy="Choose up to three. Every selected thread must appear meaningfully in the final day, not merely in its description."
      />
      <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}>
        {selected.length} of {MAX_SELECTED_DIMENSIONS} selected
      </p>
      <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXPERIENCE_DIMENSIONS.map((item) => {
          const active = selected.includes(item.id);
          const blocked = !active && selected.length >= MAX_SELECTED_DIMENSIONS;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              disabled={blocked}
              onClick={() => onToggle(item.id)}
              className="min-h-32 rounded-xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                background: active
                  ? "color-mix(in oklab, var(--gold) 16%, transparent)"
                  : "color-mix(in oklab, var(--ivory) 4%, transparent)",
                borderColor: active
                  ? "var(--gold)"
                  : "color-mix(in oklab, var(--ivory) 16%, transparent)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] font-semibold leading-snug">{item.label}</p>
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor: active ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 28%, transparent)",
                    background: active ? "var(--gold)" : "transparent",
                    color: "var(--charcoal)",
                  }}
                >
                  {active ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
                </span>
              </div>
              <p className="mt-3 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>
                {item.whisper}
              </p>
            </button>
          );
        })}
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} disabled={selected.length === 0} />
    </div>
  );
}

function PriorityStep({
  selected,
  leads,
  onToggle,
  onBack,
  onContinue,
}: {
  selected: ExperienceDimensionId[];
  leads: ExperienceDimensionId[];
  onToggle: (id: ExperienceDimensionId) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Set the hierarchy"
        title="What should lead?"
        copy="Choose one clear lead, or two co-leads when they should share the day equally. A third selection remains a required supporting thread."
      />
      <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}>
        {leads.length === 2 ? "Two interests will share the day" : "Choose one or two leaders"}
      </p>
      <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-2">
        {selected.map((id) => {
          const item = EXPERIENCE_DIMENSIONS.find((dimension) => dimension.id === id)!;
          const active = leads.includes(id);
          const blocked = !active && leads.length >= MAX_LEAD_DIMENSIONS;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              disabled={blocked}
              onClick={() => onToggle(id)}
              className="rounded-xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                background: active
                  ? "color-mix(in oklab, var(--gold) 18%, transparent)"
                  : "color-mix(in oklab, var(--ivory) 4%, transparent)",
                borderColor: active
                  ? "var(--gold)"
                  : "color-mix(in oklab, var(--ivory) 16%, transparent)",
              }}
            >
              <p className="text-[16px] font-semibold">{item.label}</p>
              <p className="mt-2 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>
                {active ? "This will shape the Signature and the structure of the day." : "Keep this as a supporting thread, or let it lead."}
              </p>
            </button>
          );
        })}
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} disabled={leads.length === 0} />
    </div>
  );
}

function ResultStep({
  decision,
  selectedTourTitle,
  profile,
  destinationIntent,
  onBack,
  onChooseFork,
}: {
  decision: LivingAtlasDecision;
  selectedTourTitle: string | null;
  profile: ExperienceProfile;
  destinationIntent: DestinationIntent;
  onBack: () => void;
  onChooseFork: (signatureId: LivingAtlasSignatureId) => void;
}) {
  const top = decision.ranked[0] ?? null;
  return (
    <div className="mx-auto max-w-4xl">
      <StepHeading
        eyebrow="The map awakens"
        title={decisionTitle(decision)}
        copy={
          decision.status === "precision-fork"
            ? "The system will not hide a close match behind an arbitrary score. Choose the distinction that feels more like your day."
            : decision.status === "weak"
              ? "The chosen destination or combination cannot truthfully carry every leading interest. The Studio exposes that tension instead of inventing a fit."
              : "This recommendation is based on your hierarchy, a hard destination boundary when chosen, and the verified structure of a real Signature."
        }
      />

      <div className="mt-8 rounded-2xl border p-5 sm:p-7" style={{ background: "color-mix(in oklab, var(--ivory) 5%, transparent)", borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)" }}>
        <div className="flex flex-wrap gap-2">
          {profile.leads.map((id) => (
            <span key={id} className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ background: "var(--gold)", color: "var(--charcoal)" }}>
              Leads · {dimensionLabel(id)}
            </span>
          ))}
          {profile.selected.filter((id) => !profile.leads.includes(id)).map((id) => (
            <span key={id} className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: "color-mix(in oklab, var(--ivory) 22%, transparent)", color: "color-mix(in oklab, var(--ivory) 76%, transparent)" }}>
              Supports · {dimensionLabel(id)}
            </span>
          ))}
        </div>
        {destinationIntent !== "no-preference" ? (
          <p className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>
            <MapPin size={14} style={{ color: "var(--gold)" }} aria-hidden />
            Destination fixed as a hard boundary.
          </p>
        ) : null}
      </div>

      {decision.status === "precision-fork" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {decision.forkCandidates.map((candidate) => {
            const tour = findTour(candidate.signatureId);
            return (
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
                <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--gold)" }}>
                  {SIGNATURE_REGION[candidate.signatureId]}
                </p>
                <h2 className="mt-3 text-xl font-semibold leading-snug" style={{ fontFamily: "var(--font-editorial)" }}>
                  {tour?.title ?? candidate.signatureId}
                </h2>
                <p className="mt-3 text-[12px] leading-6" style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}>
                  {signatureDistinction(candidate.signatureId)}
                </p>
                <p className="mt-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>
                  This is my direction
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden />
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {decision.status === "clear" && decision.selectedSignatureId ? (
        <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: "color-mix(in oklab, var(--gold) 40%, transparent)" }}>
          <div className="p-6 sm:p-8" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 17%, transparent), color-mix(in oklab, var(--ivory) 4%, transparent))" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "var(--gold)" }}>
              {SIGNATURE_REGION[decision.selectedSignatureId]}
            </p>
            <h2 className="mt-3 max-w-3xl text-[26px] font-semibold leading-tight sm:text-[38px]" style={{ fontFamily: "var(--font-editorial)" }}>
              {selectedTourTitle ?? decision.selectedSignatureId}
            </h2>
            <p className="mt-4 max-w-2xl text-[14px] leading-7" style={{ color: "color-mix(in oklab, var(--ivory) 74%, transparent)" }}>
              {signatureDistinction(decision.selectedSignatureId)}
            </p>
          </div>
          <div className="grid gap-px sm:grid-cols-3" style={{ background: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}>
            <EvidenceCell label="Decision confidence" value={top && decision.ranked[1] ? `${top.totalScore - decision.ranked[1].totalScore} point lead` : "Direct fit"} />
            <EvidenceCell label="Leading interests covered" value={top ? `${top.leadCoverage.filter((item) => item.strength >= 2).length} of ${top.leadCoverage.length}` : "—"} />
            <EvidenceCell label="Missing selected threads" value={top?.missingCoverage.length ? top.missingCoverage.map(dimensionLabel).join(", ") : "None"} />
          </div>
        </div>
      ) : null}

      {decision.status === "weak" ? (
        <div className="mt-5 rounded-2xl border p-6" style={{ background: "color-mix(in oklab, var(--ivory) 5%, transparent)", borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)" }}>
          <p className="text-[14px] leading-7" style={{ color: "color-mix(in oklab, var(--ivory) 74%, transparent)" }}>
            The strongest available direction is {top ? findTour(top.signatureId)?.title ?? top.signatureId : "not yet clear"}, but at least one leading interest has no structural place in it. Go back and change the hierarchy rather than accepting a decorative compromise.
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex justify-start">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[10px] font-bold uppercase tracking-[0.22em] transition-opacity hover:opacity-80" style={{ borderColor: "color-mix(in oklab, var(--ivory) 22%, transparent)" }}>
          <ArrowLeft size={14} aria-hidden />
          Refine choices
        </button>
      </div>
    </div>
  );
}

function EvidenceCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4" style={{ background: "var(--charcoal)" }}>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklab, var(--ivory) 50%, transparent)" }}>
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5">{value}</p>
    </div>
  );
}

function StepActions({
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
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[10px] font-bold uppercase tracking-[0.22em] transition-opacity hover:opacity-80"
        style={{ borderColor: "color-mix(in oklab, var(--ivory) 22%, transparent)" }}
      >
        <ArrowLeft size={14} aria-hidden />
        Back
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[10px] font-bold uppercase tracking-[0.22em] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
      >
        Continue
        <ArrowRight size={14} aria-hidden />
      </button>
    </div>
  );
}
