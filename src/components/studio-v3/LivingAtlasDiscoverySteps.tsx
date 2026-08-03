import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";

import type { DestinationIntent } from "@/components/studio-v3/types";
import { StepActions } from "@/components/studio-v3/LivingAtlasPreviewPrimitives";
import {
  EXPERIENCE_DIMENSIONS,
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  type ExperienceDimensionId,
} from "@/components/studio-v3/livingAtlasTaxonomy";

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

export function EntryStep({
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
        Choose what belongs in the day. The geography, Signature skeleton and real itinerary will
        respond.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <ChoiceCard
          eyebrow="Discover"
          title="Help me find my day"
          copy="Start with one to three things that matter to you."
          onClick={onDiscover}
        />
        <ChoiceCard
          eyebrow="Direct"
          title="I know where I want to go"
          copy="Fix the destination first, then shape the day inside it."
          onClick={onDestination}
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  eyebrow,
  title,
  copy,
  onClick,
}: {
  eyebrow: string;
  title: string;
  copy: string;
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
      <p
        className="text-[10px] font-bold uppercase tracking-[0.26em]"
        style={{ color: "var(--gold)" }}
      >
        {eyebrow}
      </p>
      <h2 className="mt-5 text-2xl font-semibold" style={{ fontFamily: "var(--font-editorial)" }}>
        {title}
      </h2>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p
          className="max-w-sm text-[13px] leading-6"
          style={{ color: "color-mix(in oklab, var(--ivory) 68%, transparent)" }}
        >
          {copy}
        </p>
        <ArrowRight
          size={18}
          className="shrink-0 transition-transform group-hover:translate-x-1"
          aria-hidden
        />
      </div>
    </button>
  );
}

function StepHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
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

export function DestinationStep({
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
  return (
    <div>
      <StepHeading
        eyebrow="Fix the geography"
        title="Where should the day live?"
        copy="A destination chosen here is a hard boundary. The Studio may reshape the day, but it will not quietly send you elsewhere."
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
              className="rounded-xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
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
                <MapPin
                  size={16}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--gold)" }}
                  aria-hidden
                />
                <div>
                  <p className="text-[15px] font-semibold">{item.label}</p>
                  <p
                    className="mt-1 text-[12px] leading-5"
                    style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}
                  >
                    {item.whisper}
                  </p>
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

export function InterestsStep({
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
        copy="Choose up to three. Every selected thread must appear meaningfully in the proposed day, not merely in its description."
      />
      <p
        className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}
      >
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
              className="min-h-32 rounded-xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:cursor-not-allowed disabled:opacity-35"
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
                    borderColor: active
                      ? "var(--gold)"
                      : "color-mix(in oklab, var(--ivory) 28%, transparent)",
                    background: active ? "var(--gold)" : "transparent",
                    color: "var(--charcoal)",
                  }}
                >
                  {active ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
                </span>
              </div>
              <p
                className="mt-3 text-[12px] leading-5"
                style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}
              >
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

export function PriorityStep({
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
        copy="Choose one clear lead, or two co-leads. A third choice remains a required supporting thread."
      />
      <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
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
              className="rounded-xl border p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] disabled:opacity-35"
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
              <p
                className="mt-2 text-[12px] leading-5"
                style={{ color: "color-mix(in oklab, var(--ivory) 66%, transparent)" }}
              >
                {active ? "This will structure the day." : "Keep this as support, or let it lead."}
              </p>
            </button>
          );
        })}
      </div>
      <StepActions onBack={onBack} onContinue={onContinue} disabled={leads.length === 0} />
    </div>
  );
}
