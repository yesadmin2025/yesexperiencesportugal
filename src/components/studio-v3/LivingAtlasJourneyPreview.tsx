import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Compass,
  MapPin,
  RotateCcw,
  Waves,
  Wine,
} from "lucide-react";

import { findTour } from "@/data/signatureTours";
import type { DestinationIntent } from "@/components/studio-v3/types";
import {
  DISCOVERY_SIGNAL_BY_SIGNATURE,
  decideLivingAtlasSignature,
  type LivingAtlasDecision,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  composeLivingAtlasPreviewDay,
  DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  formatLivingAtlasDuration,
  livingAtlasPreviewDayTitle,
  type LivingAtlasPreviewPreferences,
} from "@/components/studio-v3/livingAtlasPreviewComposition";
import {
  EXPERIENCE_DIMENSIONS,
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  SIGNATURE_DISCOVERY_DOORS,
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";

type Stage = "entry" | "destination" | "interests" | "priority" | "result" | "shape";
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

const ARRABIDA_SIGNATURES = new Set<LivingAtlasSignatureId>([
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

function dimensionLabel(id: ExperienceDimensionId): string {
  return EXPERIENCE_DIMENSIONS.find((item) => item.id === id)?.label ?? id;
}

function signatureDistinction(id: LivingAtlasSignatureId): string {
  return SIGNATURE_DISCOVERY_DOORS.find((item) => item.signatureId === id)?.distinction ?? "";
}

function decisionTitle(decision: LivingAtlasDecision): string {
  if (decision.status === "precision-fork") return "Two real directions remain.";
  if (decision.status === "weak") return "This combination needs one honest adjustment.";
  if (decision.status === "invalid") return "One more clear choice is needed.";
  return "Your Portugal is beginning to take shape.";
}

export function LivingAtlasJourneyPreview() {
  const [stage, setStage] = useState<Stage>("entry");
  const [pathMode, setPathMode] = useState<PathMode | null>(null);
  const [destinationIntent, setDestinationIntent] = useState<DestinationIntent>("no-preference");
  const [selected, setSelected] = useState<ExperienceDimensionId[]>([]);
  const [leads, setLeads] = useState<ExperienceDimensionId[]>([]);
  const [discoverySignal, setDiscoverySignal] = useState<LivingAtlasDiscoverySignal | null>(null);
  const [preferences, setPreferences] = useState<LivingAtlasPreviewPreferences>(
    DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  );

  const profile: ExperienceProfile = useMemo(() => ({ selected, leads }), [selected, leads]);
  const decision = useMemo(
    () =>
      leads.length > 0
        ? decideLivingAtlasSignature({ profile, destinationIntent, discoverySignal })
        : null,
    [profile, destinationIntent, discoverySignal, leads.length],
  );

  const selectedSignatureId = decision?.selectedSignatureId ?? null;
  const selectedTour = selectedSignatureId ? findTour(selectedSignatureId) : null;
  const composition = useMemo(
    () =>
      selectedSignatureId
        ? composeLivingAtlasPreviewDay({
            anchorSignatureId: selectedSignatureId,
            profile,
            preferences,
          })
        : null,
    [selectedSignatureId, profile, preferences],
  );

  const reset = () => {
    setStage("entry");
    setPathMode(null);
    setDestinationIntent("no-preference");
    setSelected([]);
    setLeads([]);
    setDiscoverySignal(null);
    setPreferences(DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES);
  };

  const goBack = () => {
    if (stage === "destination") setStage("entry");
    if (stage === "interests") setStage(pathMode === "destination" ? "destination" : "entry");
    if (stage === "priority") setStage("interests");
    if (stage === "result") {
      setDiscoverySignal(null);
      setStage(selected.length > 1 ? "priority" : "interests");
    }
    if (stage === "shape") setStage("result");
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

  return (
    <main
      className="min-h-[100dvh] w-full px-4 py-8 sm:px-6 sm:py-12"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--gold) 13%, transparent), transparent 38%), var(--charcoal)",
        color: "var(--ivory)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "var(--gold)" }}>
              YES Experience Studio · Living Atlas preview
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}>
              Isolated, noindex and unbookable. No price, checkout or production behaviour is changed.
            </p>
          </div>
          {stage !== "entry" ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
              style={{ borderColor: "color-mix(in oklab, var(--ivory) 20%, transparent)" }}
            >
              <RotateCcw size={13} aria-hidden />
              Restart
            </button>
          ) : null}
        </header>

        <section className="flex flex-1 items-center py-8 sm:py-12">
          <div className="w-full">
            {stage === "entry" ? (
              <EntryStep
                onDiscover={() => {
                  setPathMode("discover");
                  setDestinationIntent("no-preference");
                  setStage("interests");
                }}
                onDestination={() => {
                  setPathMode("destination");
                  setStage("destination");
                }}
              />
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
                onToggle={(id) => {
                  setDiscoverySignal(null);
                  setSelected((current) => {
                    if (current.includes(id)) {
                      setLeads((currentLeads) => currentLeads.filter((lead) => lead !== id));
                      return current.filter((item) => item !== id);
                    }
                    if (current.length >= MAX_SELECTED_DIMENSIONS) return current;
                    return [...current, id];
                  });
                }}
                onBack={goBack}
                onContinue={continueFromInterests}
              />
            ) : null}

            {stage === "priority" ? (
              <PriorityStep
                selected={selected}
                leads={leads}
                onToggle={(id) => {
                  setDiscoverySignal(null);
                  setLeads((current) => {
                    if (current.includes(id)) return current.filter((item) => item !== id);
                    if (current.length >= MAX_LEAD_DIMENSIONS) return current;
                    return [...current, id];
                  });
                }}
                onBack={goBack}
                onContinue={() => setStage("result")}
              />
            ) : null}

            {stage === "result" && decision ? (
              <ResultStep
                decision={decision}
                profile={profile}
                destinationIntent={destinationIntent}
                selectedTourTitle={selectedTour?.title ?? null}
                onBack={goBack}
                onChooseFork={(signatureId) =>
                  setDiscoverySignal(DISCOVERY_SIGNAL_BY_SIGNATURE[signatureId])
                }
                onCompose={() => setStage("shape")}
              />
            ) : null}

            {stage === "shape" && selectedSignatureId && composition ? (
              <ShapeStep
                signatureId={selectedSignatureId}
                signatureTitle={selectedTour?.title ?? selectedSignatureId}
                profile={profile}
                preferences={preferences}
                onPreferencesChange={setPreferences}
                composition={composition}
                onBack={goBack}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function EntryStep({ onDiscover, onDestination }: { onDiscover: () => void; onDestination: () => void }) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
        The invitation
      </p>
      <h1 className="mx-auto mt-5 max-w-3xl text-[34px] font-semibold leading-[1.04] sm:text-[56px]" style={{ fontFamily: "var(--font-editorial)" }}>
        There is more than one Portugal. Let&apos;s find yours.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-[14px] leading-7 sm:text-[16px]" style={{ color: "color-mix(in oklab, var(--ivory) 72%, transparent)" }}>
        Choose what belongs in the day. The geography, Signature skeleton and real itinerary will respond.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <ChoiceCard eyebrow="Discover" title="Help me find my day" copy="Start with one to three things that matter to you." onClick={onDiscover} />
        <ChoiceCard eyebrow="Direct" title="I know where I want to go" copy="Fix the destination first, then shape the day inside it." onClick={onDestination} />
      </div>
    </div>
  );
}

function ChoiceCard({ eyebrow, title, copy, onClick }: { eyebrow: string; title: string; copy: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-44 rounded-2xl border p-6 text-left transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{ background: "color-mix(in oklab, var(--ivory) 5%, transparent)", borderColor: "color-mix(in oklab, var(--gold) 36%, transparent)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "var(--gold)" }}>{eyebrow}</p>
      <h2 className="mt-5 text-2xl font-semibold" style={{ fontFamily: "var(--font-editorial)" }}>{title}</h2>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="max-w-sm text-[13px] leading-6" style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}>{copy}</p>
        <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
      </div>
    </button>
  );
}

function StepHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>{eyebrow}</p>
      <h1 className="mt-4 text-[30px] font-semibold leading-tight sm:text-[46px]" style={{ fontFamily: "var(--font-editorial)" }}>{title}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-[13px] leading-6 sm:text-[15px]" style={{ color: "color-mix(in oklab, var(--ivory) 70%, transparent)" }}>{copy}</p>
    </div>
  );
}

function DestinationStep({ value, onChange, onBack, onContinue }: { value: DestinationIntent; onChange: (value: DestinationIntent) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <div>
      <StepHeading eyebrow="Fix the geography" title="Where should the day live?" copy="A destination chosen here is a hard boundary. The Studio may reshape the day, but it will not quietly send you elsewhere." />
      <div className="mx-auto mt-9 grid max-w-4xl gap-3 sm:grid-cols-2">
        {DESTINATION_CHOICES.map((item) => {
          const active = value === item.id;
          return (
            <button key={item.id} type="button" aria-pressed={active} onClick={() => onChange(item.id)} className="rounded-xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]" style={{ background: active ? "color-mix(in oklab, var(--gold) 16%, transparent)" : "color-mix(in oklab, var(--ivory) 4%, transparent)", borderColor: active ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 16%, transparent)" }}>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: "var(--gold)" }} aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold">{item.label}</p>
                  <p className="mt-1 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>{item.whisper}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} disabled={value === "no-preference"} />
    </div>
  );
}

function InterestsStep({ selected, onToggle, onBack, onContinue }: { selected: ExperienceDimensionId[]; onToggle: (id: ExperienceDimensionId) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <div>
      <StepHeading eyebrow="The recognition" title="What belongs in your day?" copy="Choose up to three. Every selected thread must appear meaningfully in the proposed day, not merely in its description." />
      <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}>{selected.length} of {MAX_SELECTED_DIMENSIONS} selected</p>
      <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXPERIENCE_DIMENSIONS.map((item) => {
          const active = selected.includes(item.id);
          const blocked = !active && selected.length >= MAX_SELECTED_DIMENSIONS;
          return (
            <button key={item.id} type="button" aria-pressed={active} disabled={blocked} onClick={() => onToggle(item.id)} className="min-h-32 rounded-xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:cursor-not-allowed disabled:opacity-35" style={{ background: active ? "color-mix(in oklab, var(--gold) 16%, transparent)" : "color-mix(in oklab, var(--ivory) 4%, transparent)", borderColor: active ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 16%, transparent)" }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] font-semibold leading-snug">{item.label}</p>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: active ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 28%, transparent)", background: active ? "var(--gold)" : "transparent", color: "var(--charcoal)" }}>{active ? <Check size={12} strokeWidth={3} aria-hidden /> : null}</span>
              </div>
              <p className="mt-3 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>{item.whisper}</p>
            </button>
          );
        })}
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} disabled={selected.length === 0} />
    </div>
  );
}

function PriorityStep({ selected, leads, onToggle, onBack, onContinue }: { selected: ExperienceDimensionId[]; leads: ExperienceDimensionId[]; onToggle: (id: ExperienceDimensionId) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <div>
      <StepHeading eyebrow="Set the hierarchy" title="What should lead?" copy="Choose one clear lead, or two co-leads. A third choice remains a required supporting thread." />
      <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
        {selected.map((id) => {
          const item = EXPERIENCE_DIMENSIONS.find((dimension) => dimension.id === id)!;
          const active = leads.includes(id);
          const blocked = !active && leads.length >= MAX_LEAD_DIMENSIONS;
          return (
            <button key={id} type="button" aria-pressed={active} disabled={blocked} onClick={() => onToggle(id)} className="rounded-xl border p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:opacity-35" style={{ background: active ? "color-mix(in oklab, var(--gold) 18%, transparent)" : "color-mix(in oklab, var(--ivory) 4%, transparent)", borderColor: active ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 16%, transparent)" }}>
              <p className="text-[16px] font-semibold">{item.label}</p>
              <p className="mt-2 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>{active ? "This will structure the day." : "Keep this as support, or let it lead."}</p>
            </button>
          );
        })}
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} disabled={leads.length === 0} />
    </div>
  );
}

function ResultStep({ decision, profile, destinationIntent, selectedTourTitle, onBack, onChooseFork, onCompose }: { decision: LivingAtlasDecision; profile: ExperienceProfile; destinationIntent: DestinationIntent; selectedTourTitle: string | null; onBack: () => void; onChooseFork: (signatureId: LivingAtlasSignatureId) => void; onCompose: () => void }) {
  const top = decision.ranked[0] ?? null;
  return (
    <div className="mx-auto max-w-5xl">
      <StepHeading eyebrow="The map awakens" title={decisionTitle(decision)} copy={decision.status === "precision-fork" ? "The system will not hide a close match behind an arbitrary score. Choose the real distinction that feels more like your day." : decision.status === "weak" ? "The chosen geography cannot truthfully carry every leading interest. The tension remains visible." : "The region is selected from your hierarchy, a hard destination boundary when chosen, and verified Signature structure."} />
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <ReactivePortugalMap activeSignatureId={decision.selectedSignatureId} candidates={decision.forkCandidates.map((candidate) => candidate.signatureId)} />
        <div>
          <ProfileSummary profile={profile} destinationFixed={destinationIntent !== "no-preference"} />
          {decision.status === "precision-fork" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {decision.forkCandidates.map((candidate) => (
                <button key={candidate.signatureId} type="button" onClick={() => onChooseFork(candidate.signatureId)} className="group rounded-2xl border p-5 text-left transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]" style={{ background: "color-mix(in oklab, var(--ivory) 5%, transparent)", borderColor: "color-mix(in oklab, var(--gold) 32%, transparent)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>{SIGNATURE_REGION[candidate.signatureId]}</p>
                  <h2 className="mt-3 text-xl font-semibold" style={{ fontFamily: "var(--font-editorial)" }}>{findTour(candidate.signatureId)?.title ?? candidate.signatureId}</h2>
                  <p className="mt-3 text-[12px] leading-6" style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}>{signatureDistinction(candidate.signatureId)}</p>
                  <p className="mt-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>This is my direction <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden /></p>
                </button>
              ))}
            </div>
          ) : null}

          {decision.status === "clear" && decision.selectedSignatureId ? (
            <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: "color-mix(in oklab, var(--gold) 38%, transparent)" }}>
              <div className="p-6" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 17%, transparent), color-mix(in oklab, var(--ivory) 4%, transparent))" }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--gold)" }}>{SIGNATURE_REGION[decision.selectedSignatureId]}</p>
                <h2 className="mt-3 text-[27px] font-semibold leading-tight" style={{ fontFamily: "var(--font-editorial)" }}>{selectedTourTitle ?? decision.selectedSignatureId}</h2>
                <p className="mt-3 text-[13px] leading-6" style={{ color: "color-mix(in oklab, var(--ivory) 72%, transparent)" }}>{signatureDistinction(decision.selectedSignatureId)}</p>
                <button type="button" onClick={onCompose} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: "var(--ivory)", color: "var(--charcoal)" }}>Shape this day <ArrowRight size={14} aria-hidden /></button>
              </div>
              <div className="grid gap-px sm:grid-cols-3" style={{ background: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}>
                <EvidenceCell label="Decision lead" value={top && decision.ranked[1] ? `${top.totalScore - decision.ranked[1].totalScore} points` : "Direct fit"} />
                <EvidenceCell label="Lead coverage" value={top ? `${top.leadCoverage.filter((item) => item.strength >= 2).length} of ${top.leadCoverage.length}` : "—"} />
                <EvidenceCell label="Missing threads" value={top?.missingCoverage.length ? top.missingCoverage.map(dimensionLabel).join(", ") : "None"} />
              </div>
            </div>
          ) : null}

          {decision.status === "weak" ? (
            <div className="mt-4 rounded-2xl border p-5" style={{ background: "color-mix(in oklab, var(--ivory) 5%, transparent)", borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)" }}>
              <p className="text-[13px] leading-6" style={{ color: "color-mix(in oklab, var(--ivory) 72%, transparent)" }}>The strongest available direction is {top ? findTour(top.signatureId)?.title ?? top.signatureId : "not yet clear"}, but at least one lead has no structural place in it. Refine the hierarchy rather than accepting decorative copy.</p>
            </div>
          ) : null}
        </div>
      </div>
      <BackButton onClick={onBack} label="Refine choices" />
    </div>
  );
}

function ShapeStep({ signatureId, signatureTitle, profile, preferences, onPreferencesChange, composition, onBack }: { signatureId: LivingAtlasSignatureId; signatureTitle: string; profile: ExperienceProfile; preferences: LivingAtlasPreviewPreferences; onPreferencesChange: (preferences: LivingAtlasPreviewPreferences) => void; composition: ReturnType<typeof composeLivingAtlasPreviewDay>; onBack: () => void }) {
  const isArrabida = ARRABIDA_SIGNATURES.has(signatureId);
  const title = livingAtlasPreviewDayTitle(composition);
  return (
    <div className="mx-auto max-w-6xl">
      <StepHeading eyebrow="Your day is taking shape" title={title} copy="This is a working itinerary made from verified regional moments. Change one answer and the actual draft responds." />
      <div className="mt-8 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          <ReactivePortugalMap activeSignatureId={signatureId} candidates={[]} />
          <PreferencePanel label="How full should the day feel?" icon={<Clock3 size={16} aria-hidden />}>
            <SegmentedChoice value={preferences.density} options={[{ value: "slow", label: "Slow" }, { value: "balanced", label: "Balanced" }, { value: "rich", label: "Rich" }]} onChange={(density) => onPreferencesChange({ ...preferences, density })} />
          </PreferencePanel>
          {profile.selected.includes("wine-table") ? (
            <PreferencePanel label="How much space should wine take?" icon={<Wine size={16} aria-hidden />}>
              <SegmentedChoice value={preferences.wineEmphasis} options={[{ value: "one-winery", label: "One meaningful winery" }, { value: "wine-centred", label: "Wine at the centre" }]} onChange={(wineEmphasis) => onPreferencesChange({ ...preferences, wineEmphasis })} />
            </PreferencePanel>
          ) : null}
          {isArrabida && profile.selected.includes("atlantic-coast") ? (
            <PreferencePanel label="How should the Atlantic enter the day?" icon={<Waves size={16} aria-hidden />}>
              <SegmentedChoice value={preferences.atlanticMode} options={[{ value: "coast", label: "From the coast" }, { value: "boat", label: "From the water" }]} onChange={(atlanticMode) => onPreferencesChange({ ...preferences, atlanticMode })} />
            </PreferencePanel>
          ) : null}
          {isArrabida && profile.selected.includes("local-life") ? (
            <PreferencePanel label="Which local moment matters more?" icon={<Compass size={16} aria-hidden />}>
              <SegmentedChoice value={preferences.localMoment} options={[{ value: "market", label: "Market" }, { value: "village", label: "Village life" }]} onChange={(localMoment) => onPreferencesChange({ ...preferences, localMoment })} />
            </PreferencePanel>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "color-mix(in oklab, var(--gold) 36%, transparent)", background: "color-mix(in oklab, var(--ivory) 4%, transparent)" }}>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5 sm:p-6" style={{ borderColor: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>{SIGNATURE_REGION[signatureId]}</p>
              <h2 className="mt-2 text-[24px] font-semibold" style={{ fontFamily: "var(--font-editorial)" }}>{title}</h2>
              <p className="mt-2 text-[11px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}>Operational skeleton: {signatureTitle}. Traveller-facing identity comes from the composed moments above.</p>
            </div>
            <div className="rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ borderColor: "color-mix(in oklab, var(--gold) 40%, transparent)", color: "var(--gold)" }}>{formatLivingAtlasDuration(composition.totalDurationMin)} of stops</div>
          </div>

          <div className="p-5 sm:p-6">
            <CompositionStatus composition={composition} />
            <ol className="mt-6 space-y-3">
              {composition.moments.map((moment, index) => (
                <li key={moment.stopId} className="grid grid-cols-[2rem_1fr_auto] gap-3 rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--ivory) 13%, transparent)", background: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "var(--gold)", color: "var(--charcoal)" }}>{index + 1}</span>
                  <div>
                    <p className="text-[15px] font-semibold">{moment.label}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {moment.dimensions.filter((dimension) => profile.selected.includes(dimension)).map((dimension) => (
                        <span key={dimension} className="rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)", color: "color-mix(in oklab, var(--ivory) 72%, transparent)" }}>{dimensionLabel(dimension)}</span>
                      ))}
                    </div>
                  </div>
                  <span className="pt-1 text-[11px]" style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}>{moment.durationMin} min</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[11px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 52%, transparent)" }}>Selection is verified and region-contained. Geographic visit order, live supplier availability, sea conditions and driving time remain the next operational layer.</p>
          </div>
        </div>
      </div>
      <BackButton onClick={onBack} label="Back to recommendation" />
    </div>
  );
}

function ReactivePortugalMap({ activeSignatureId, candidates }: { activeSignatureId: LivingAtlasSignatureId | null; candidates: LivingAtlasSignatureId[] }) {
  return (
    <div className="relative min-h-80 overflow-hidden rounded-2xl border p-5" style={{ borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)", background: "linear-gradient(180deg, color-mix(in oklab, var(--gold) 8%, transparent), color-mix(in oklab, var(--ivory) 3%, transparent))" }} aria-label="Living Atlas regional narrowing">
      <div className="absolute inset-5">
        <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Editorial map of Portugal with the selected experience region highlighted">
          <path d="M46 5 C58 10 62 20 58 30 C64 39 59 48 62 57 C67 67 63 78 55 94 L30 91 C25 80 28 70 22 62 C18 52 24 43 22 33 C27 21 31 10 46 5 Z" fill="color-mix(in oklab, var(--ivory) 7%, transparent)" stroke="color-mix(in oklab, var(--ivory) 26%, transparent)" strokeWidth="1" />
          {MAP_POINTS.map((point) => {
            const active = activeSignatureId === point.id;
            const candidate = candidates.includes(point.id);
            return (
              <g key={point.id}>
                <circle cx={point.x} cy={point.y} r={active ? 3.6 : candidate ? 2.8 : 1.5} fill={active ? "var(--gold)" : candidate ? "var(--ivory)" : "color-mix(in oklab, var(--ivory) 34%, transparent)"} />
                {active ? <circle cx={point.x} cy={point.y} r="6" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.55" /> : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="relative z-10 flex h-full min-h-72 flex-col justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--gold)" }}>Living Atlas</p>
          <p className="mt-2 max-w-48 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}>{activeSignatureId ? SIGNATURE_REGION[activeSignatureId] : candidates.length ? "Two regions remain alive" : "Portugal before the choice"}</p>
        </div>
        <p className="text-[9px] uppercase tracking-[0.16em]" style={{ color: "color-mix(in oklab, var(--ivory) 42%, transparent)" }}>Editorial orientation, not navigation</p>
      </div>
    </div>
  );
}

function ProfileSummary({ profile, destinationFixed }: { profile: ExperienceProfile; destinationFixed: boolean }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: "color-mix(in oklab, var(--ivory) 5%, transparent)", borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)" }}>
      <div className="flex flex-wrap gap-2">
        {profile.leads.map((id) => <span key={id} className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ background: "var(--gold)", color: "var(--charcoal)" }}>Leads · {dimensionLabel(id)}</span>)}
        {profile.selected.filter((id) => !profile.leads.includes(id)).map((id) => <span key={id} className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: "color-mix(in oklab, var(--ivory) 22%, transparent)" }}>Supports · {dimensionLabel(id)}</span>)}
      </div>
      {destinationFixed ? <p className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: "color-mix(in oklab, var(--ivory) 64%, transparent)" }}><MapPin size={14} style={{ color: "var(--gold)" }} aria-hidden /> Destination fixed as a hard boundary.</p> : null}
    </div>
  );
}

function PreferencePanel({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--ivory) 14%, transparent)", background: "color-mix(in oklab, var(--ivory) 4%, transparent)" }}>
      <div className="flex items-center gap-2 text-[12px] font-semibold">{icon}<h2>{label}</h2></div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SegmentedChoice<T extends string>({ value, options, onChange }: { value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = option.value === value;
        return <button key={option.value} type="button" aria-pressed={active} onClick={() => onChange(option.value)} className="min-h-10 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-[0.14em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]" style={{ background: active ? "color-mix(in oklab, var(--gold) 18%, transparent)" : "transparent", borderColor: active ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 16%, transparent)", color: active ? "var(--ivory)" : "color-mix(in oklab, var(--ivory) 64%, transparent)" }}>{option.label}</button>;
      })}
    </div>
  );
}

function CompositionStatus({ composition }: { composition: ReturnType<typeof composeLivingAtlasPreviewDay> }) {
  const complete = composition.status === "complete";
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: complete ? "color-mix(in oklab, var(--gold) 40%, transparent)" : "color-mix(in oklab, #d78b62 55%, transparent)", background: complete ? "color-mix(in oklab, var(--gold) 9%, transparent)" : "color-mix(in oklab, #d78b62 9%, transparent)" }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: complete ? "var(--gold)" : "#e2aa88" }}>{complete ? "All selected threads are visible" : composition.status === "impossible" ? "One hard request cannot be fulfilled" : "The draft still has a gap"}</p>
      {!complete ? <p className="mt-2 text-[12px] leading-5" style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}>Missing interests: {composition.missingDimensions.map(dimensionLabel).join(", ") || "none"}. Missing activity types: {composition.missingRequiredTypes.join(", ") || "none"}.</p> : null}
    </div>
  );
}

function EvidenceCell({ label, value }: { label: string; value: string }) {
  return <div className="p-4" style={{ background: "var(--charcoal)" }}><p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklab, var(--ivory) 48%, transparent)" }}>{label}</p><p className="mt-2 text-[12px] leading-5">{value}</p></div>;
}

function StepActions({ onBack, onContinue, disabled }: { onBack: () => void; onContinue: () => void; disabled: boolean }) {
  return (
    <div className="mx-auto mt-9 flex max-w-4xl items-center justify-between gap-3">
      <BackButton onClick={onBack} label="Back" compact />
      <button type="button" onClick={onContinue} disabled={disabled} className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[10px] font-bold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-30" style={{ background: "var(--ivory)", color: "var(--charcoal)" }}>Continue <ArrowRight size={14} aria-hidden /></button>
    </div>
  );
}

function BackButton({ onClick, label, compact = false }: { onClick: () => void; label: string; compact?: boolean }) {
  return (
    <div className={compact ? "" : "mt-8"}>
      <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-80" style={{ borderColor: "color-mix(in oklab, var(--ivory) 22%, transparent)" }}><ArrowLeft size={14} aria-hidden />{label}</button>
    </div>
  );
}
