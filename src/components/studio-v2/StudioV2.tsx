import { useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import {
  emptyProfile,
  applyIntent,
  applyPace,
  deriveArchetype,
  type GroupProfile,
  type IntentAtmosphere,
  type PaceV2,
  type PriorityKey,
  type TravelerProfile,
} from "@/lib/studio-v2/profile";
import {
  INTENT_OPTIONS,
  PACE_OPTIONS,
  PRIORITY_OPTIONS,
  PRIORITY_WEIGHTS,
  TRANSITION_COPY,
} from "@/lib/studio-v2/content";
import { designExperience, type DesignResult } from "@/lib/studio-v2/engine";
import { fmtMinutes } from "@/components/builder/types";

type Stage = "intent" | "group" | "pace" | "priorities" | "ops" | "reveal";

interface StudioV2Props {
  onExit: () => void;
}

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: "easeOut" as const },
};

/**
 * Five-stage guided consultation. Each stage writes structured data into
 * a single TravelerProfile object, which the engine turns into a feasible
 * itinerary + match score at reveal time.
 *
 * Visually restrained: ivory ground, charcoal type, gold micro-accents.
 * One decision per screen. Mobile-first 393px.
 */
export function StudioV2({ onExit }: StudioV2Props) {
  const [profile, setProfile] = useState<TravelerProfile>(() => emptyProfile());
  const [stage, setStage] = useState<Stage>("intent");
  const [result, setResult] = useState<DesignResult | null>(null);

  const update = (patch: Partial<TravelerProfile>) =>
    setProfile((p) => ({ ...p, ...patch }));

  const summaryChips = useMemo(() => {
    const chips: string[] = [];
    if (profile.intent) {
      chips.push(INTENT_OPTIONS.find((o) => o.id === profile.intent)?.label ?? "");
    }
    if (profile.group) {
      const total = profile.group.adults + profile.group.children + profile.group.teens;
      chips.push(`${total} guest${total === 1 ? "" : "s"}`);
    }
    if (profile.pace) {
      chips.push(PACE_OPTIONS.find((o) => o.id === profile.pace)?.label ?? "");
    }
    const prios = Object.keys(profile.priorityWeights).length;
    if (prios) chips.push(`${prios} priorit${prios === 1 ? "y" : "ies"}`);
    return chips.filter(Boolean);
  }, [profile]);

  const finalize = () => {
    const archetype = deriveArchetype(profile);
    const r = designExperience({ ...profile, archetype });
    setResult(r);
    setStage("reveal");
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <span
          className="text-[11px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
        >
          Studio · consultation
        </span>
        <button
          onClick={onExit}
          aria-label="Exit studio"
          className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-[color:var(--sand)] focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {summaryChips.length > 0 && stage !== "reveal" && (
        <div
          className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 px-5 pb-2 sm:px-8"
          aria-label="Consultation summary"
        >
          {summaryChips.map((c) => (
            <span
              key={c}
              className="rounded-full border px-3 py-1 text-[11px]"
              style={{
                borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)",
                color: "color-mix(in oklab, var(--charcoal) 80%, transparent)",
                background: "color-mix(in oklab, var(--sand) 50%, transparent)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
        <AnimatePresence mode="wait">
          {stage === "intent" && (
            <motion.section key="intent" {...fade}>
              <Eyebrow>Stage 1 · Travel intent</Eyebrow>
              <Headline>How should Portugal feel?</Headline>
              <Helper>Select the atmosphere closest to what you have in mind.</Helper>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INTENT_OPTIONS.map((opt) => {
                  const active = profile.intent === opt.id;
                  return (
                    <OptionCard
                      key={opt.id}
                      active={active}
                      label={opt.label}
                      sub={opt.sub}
                      onClick={() => update(applyIntent(profile, opt.id as IntentAtmosphere))}
                    />
                  );
                })}
              </div>
              <StageFooter
                disabled={!profile.intent}
                helper={profile.intent ? TRANSITION_COPY.afterIntent : undefined}
                onContinue={() => setStage("group")}
              />
            </motion.section>
          )}

          {stage === "group" && (
            <motion.section key="group" {...fade}>
              <Eyebrow>Stage 2 · Group profile</Eyebrow>
              <Headline>Who is this experience designed for?</Headline>
              <Helper>Composition shapes pacing, comfort and choice of place.</Helper>
              <GroupForm
                value={profile.group}
                onChange={(g) => update({ group: g })}
              />
              <StageFooter
                disabled={!profile.group}
                helper={profile.group ? TRANSITION_COPY.afterGroup : undefined}
                onContinue={() => setStage("pace")}
              />
            </motion.section>
          )}

          {stage === "pace" && (
            <motion.section key="pace" {...fade}>
              <Eyebrow>Stage 3 · Rhythm & flow</Eyebrow>
              <Headline>How full should the day feel?</Headline>
              <Helper>Pacing decides stop density, drive tolerance and lunch length.</Helper>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PACE_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.id}
                    active={profile.pace === opt.id}
                    label={opt.label}
                    sub={opt.sub}
                    onClick={() => update(applyPace(profile, opt.id as PaceV2))}
                  />
                ))}
              </div>
              <StageFooter
                disabled={!profile.pace}
                helper={profile.pace ? TRANSITION_COPY.afterPace : undefined}
                onContinue={() => setStage("priorities")}
              />
            </motion.section>
          )}

          {stage === "priorities" && (
            <motion.section key="priorities" {...fade}>
              <Eyebrow>Stage 4 · Experience priorities</Eyebrow>
              <Headline>What would make the experience feel complete?</Headline>
              <Helper>
                Tap to include. Tap again to mark as essential.
              </Helper>
              <div className="mt-6 flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((opt) => {
                  const w = profile.priorityWeights[opt.id as PriorityKey];
                  const next =
                    w === undefined ? PRIORITY_WEIGHTS.single :
                    w === PRIORITY_WEIGHTS.single ? PRIORITY_WEIGHTS.must :
                    undefined;
                  return (
                    <PriorityChip
                      key={opt.id}
                      label={opt.label}
                      weight={w}
                      onClick={() => {
                        const pw = { ...profile.priorityWeights };
                        if (next === undefined) delete pw[opt.id as PriorityKey];
                        else pw[opt.id as PriorityKey] = next;
                        update({ priorityWeights: pw });
                      }}
                    />
                  );
                })}
              </div>
              <StageFooter
                disabled={Object.keys(profile.priorityWeights).length === 0}
                helper={Object.keys(profile.priorityWeights).length > 0 ? TRANSITION_COPY.afterPrios : undefined}
                onContinue={() => setStage("ops")}
              />
            </motion.section>
          )}

          {stage === "ops" && (
            <motion.section key="ops" {...fade}>
              <Eyebrow>Stage 5 · Logistics</Eyebrow>
              <Headline>A few practical details.</Headline>
              <Helper>Used for pickup, timing and any constraints we must respect.</Helper>
              <OpsForm
                value={profile.ops}
                onChange={(ops) => update({ ops })}
              />
              <StageFooter
                disabled={!profile.ops.pickup}
                helper="Designing your day."
                ctaLabel="Design my experience"
                onContinue={finalize}
              />
            </motion.section>
          )}

          {stage === "reveal" && result && (
            <motion.section key="reveal" {...fade}>
              <Reveal result={result} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── primitives ───────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10.5px] uppercase tracking-[0.32em]"
      style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
    >
      {children}
    </p>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="mt-3 text-[26px] leading-[1.15] sm:text-[34px]"
      style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
    >
      {children}
    </h1>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-2 text-[14px] leading-relaxed"
      style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
    >
      {children}
    </p>
  );
}

function OptionCard({
  active, label, sub, onClick,
}: { active: boolean; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[88px] flex-col items-start gap-1 rounded-[2px] border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2"
      style={{
        borderColor: active
          ? "color-mix(in oklab, var(--gold) 75%, transparent)"
          : "color-mix(in oklab, var(--charcoal) 12%, transparent)",
        background: active
          ? "color-mix(in oklab, var(--sand) 65%, transparent)"
          : "var(--ivory)",
        boxShadow: active
          ? "inset 0 0 0 1px color-mix(in oklab, var(--gold) 30%, transparent)"
          : "none",
      }}
    >
      <span
        className="text-[15px]"
        style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
      >
        {label}
      </span>
      <span
        className="text-[12.5px] leading-snug"
        style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
      >
        {sub}
      </span>
    </button>
  );
}

function PriorityChip({
  label, weight, onClick,
}: { label: string; weight: number | undefined; onClick: () => void }) {
  const state = weight === undefined ? "off" : weight >= 100 ? "must" : "on";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-[12.5px] transition-all min-h-[36px]"
      style={{
        borderColor:
          state === "must" ? "color-mix(in oklab, var(--gold) 80%, transparent)" :
          state === "on"   ? "color-mix(in oklab, var(--gold) 45%, transparent)" :
                             "color-mix(in oklab, var(--charcoal) 18%, transparent)",
        background:
          state === "must" ? "color-mix(in oklab, var(--gold) 18%, transparent)" :
          state === "on"   ? "color-mix(in oklab, var(--sand) 60%, transparent)" :
                             "transparent",
        color: "var(--charcoal)",
        fontWeight: state === "must" ? 600 : 500,
      }}
    >
      {label}{state === "must" ? " · essential" : ""}
    </button>
  );
}

function StageFooter({
  disabled, helper, ctaLabel = "Continue", onContinue,
}: { disabled?: boolean; helper?: string; ctaLabel?: string; onContinue: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-start gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onContinue}
        className="group inline-flex items-center gap-2 rounded-[2px] px-6 py-3 text-[12px] tracking-[0.24em] lowercase transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "var(--charcoal)",
          color: "var(--ivory)",
          minHeight: 48,
          minWidth: 184,
        }}
      >
        {ctaLabel}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px]"
          aria-hidden
        />
      </button>
      {helper && (
        <span
          className="text-[12.5px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          {helper}
        </span>
      )}
    </div>
  );
}

// ─── group form ───────────────────────────────────────────────────────────

function GroupForm({
  value, onChange,
}: { value: GroupProfile | undefined; onChange: (g: GroupProfile) => void }) {
  const g: GroupProfile = value ?? {
    adults: 2, children: 0, teens: 0, mobility: "none",
    occasion: "none", decisionStyle: "collaborative", luxuryTier: "elevated",
  };
  const set = (patch: Partial<GroupProfile>) => onChange({ ...g, ...patch });

  return (
    <div className="mt-6 space-y-6">
      <CountRow label="Adults"   value={g.adults}   onChange={(v) => set({ adults: v })} min={1} />
      <CountRow label="Teens"    value={g.teens}    onChange={(v) => set({ teens: v })} />
      <CountRow label="Children" value={g.children} onChange={(v) => set({ children: v })} />

      <SelectRow
        label="Occasion"
        value={g.occasion}
        onChange={(v) => set({ occasion: v as GroupProfile["occasion"] })}
        options={[
          ["none", "Just a great day"],
          ["anniversary", "Anniversary"],
          ["birthday", "Birthday"],
          ["honeymoon", "Honeymoon"],
          ["celebration", "Celebration"],
          ["corporate", "Corporate"],
        ]}
      />
      <SelectRow
        label="Mobility"
        value={g.mobility}
        onChange={(v) => set({ mobility: v as GroupProfile["mobility"] })}
        options={[["none", "No constraints"], ["limited", "Some limitations"], ["wheelchair", "Wheelchair"]]}
      />
      <SelectRow
        label="Luxury expectation"
        value={g.luxuryTier}
        onChange={(v) => set({ luxuryTier: v as GroupProfile["luxuryTier"] })}
        options={[["refined", "Refined"], ["elevated", "Elevated"], ["ultra", "Ultra"]]}
      />
    </div>
  );
}

function CountRow({
  label, value, onChange, min = 0,
}: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px]">{label}</span>
      <div className="flex items-center gap-3">
        <StepBtn onClick={() => onChange(Math.max(min, value - 1))} label="−" />
        <span className="w-6 text-center text-[15px] tabular-nums">{value}</span>
        <StepBtn onClick={() => onChange(value + 1)} label="+" />
      </div>
    </div>
  );
}

function StepBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === "+" ? "increase" : "decrease"}
      className="grid h-11 w-11 place-items-center rounded-full border text-[16px] transition focus-visible:outline-none focus-visible:ring-2"
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
        background: "var(--ivory)",
      }}
    >
      {label}
    </button>
  );
}

function SelectRow({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.28em]" style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, lab]) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="rounded-full border px-3 py-1.5 text-[12.5px] transition min-h-[36px]"
              style={{
                borderColor: active
                  ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                  : "color-mix(in oklab, var(--charcoal) 18%, transparent)",
                background: active
                  ? "color-mix(in oklab, var(--sand) 60%, transparent)"
                  : "transparent",
                fontWeight: active ? 600 : 500,
              }}
            >
              {lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ops form ─────────────────────────────────────────────────────────────

function OpsForm({
  value, onChange,
}: { value: TravelerProfile["ops"]; onChange: (v: TravelerProfile["ops"]) => void }) {
  const set = (patch: Partial<TravelerProfile["ops"]>) => onChange({ ...value, ...patch });
  return (
    <div className="mt-6 space-y-5">
      <TextRow
        label="Pickup location"
        placeholder="Hotel name, area, or address"
        value={value.pickup ?? ""}
        onChange={(v) => set({ pickup: v })}
      />
      <TextRow
        label="Accommodation area"
        placeholder="e.g. Cascais, Comporta, Lisbon"
        value={value.accommodationArea ?? ""}
        onChange={(v) => set({ accommodationArea: v })}
      />
      <TextRow
        label="Dietary notes"
        placeholder="Allergies, vegetarian, vegan…"
        value={(value.dietary ?? []).join(", ")}
        onChange={(v) => set({ dietary: v.split(",").map((s) => s.trim()).filter(Boolean) })}
      />
      <TextRow
        label="Hard time constraints"
        placeholder="e.g. cruise back by 18:00"
        value={(value.hardConstraints ?? []).join(", ")}
        onChange={(v) => set({ hardConstraints: v.split(",").map((s) => s.trim()).filter(Boolean) })}
      />
    </div>
  );
}

function TextRow({
  label, placeholder, value, onChange,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[11px] uppercase tracking-[0.28em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[2px] border bg-transparent px-3 py-3 text-[14px] focus-visible:outline-none focus-visible:ring-2"
        style={{
          borderColor: "color-mix(in oklab, var(--charcoal) 20%, transparent)",
          color: "var(--charcoal)",
        }}
      />
    </label>
  );
}

// ─── reveal ───────────────────────────────────────────────────────────────

function Reveal({ result }: { result: DesignResult }) {
  const { day, score, archetype, region } = result;
  return (
    <div>
      <Eyebrow>Your experience</Eyebrow>
      <Headline>A {paceLabel(result.profile.pace)} day in {regionLabel(region)}.</Headline>
      <Helper>
        Designed for the {archetypeLabel(archetype)} · {day.stops.length} stops · about{" "}
        {fmtMinutes(day.totals.dayMin)} total.
      </Helper>

      <div
        className="mt-6 rounded-[2px] border p-5"
        style={{
          borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
          background: "color-mix(in oklab, var(--sand) 35%, transparent)",
        }}
      >
        <ScoreRow label="Overall match" value={score.total} primary />
        <ScoreRow label="Fit"        value={score.fit} />
        <ScoreRow label="Pacing"     value={score.pacing} />
        <ScoreRow label="Logistics"  value={score.logistics} />
      </div>

      <ol className="mt-8 space-y-4">
        {day.stops.map(({ stop, driveFromPrev }, i) => (
          <li key={stop.id} className="flex gap-4">
            <span
              className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px]"
              style={{
                background: "var(--charcoal)",
                color: "var(--ivory)",
                fontWeight: 600,
              }}
            >
              {i + 1}
            </span>
            <div className="flex-1">
              <p
                className="text-[15px]"
                style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
              >
                {stop.name}
              </p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}>
                {stop.blurb}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
                {driveFromPrev > 0 ? `${driveFromPrev} min drive · ` : ""}{fmtMinutes(stop.dwellMin)} on site
              </p>
            </div>
          </li>
        ))}
      </ol>

      {day.warnings.length > 0 && (
        <div
          className="mt-6 rounded-[2px] border-l-2 px-4 py-3 text-[12.5px]"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 70%, transparent)",
            background: "color-mix(in oklab, var(--sand) 50%, transparent)",
            color: "color-mix(in oklab, var(--charcoal) 75%, transparent)",
          }}
        >
          {day.warnings.join(" · ")}
        </div>
      )}

      <details className="mt-8 text-[12px]" style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}>
        <summary className="cursor-pointer">Operational data</summary>
        <pre className="mt-2 overflow-x-auto rounded-[2px] border p-3 text-[11px]" style={{ borderColor: "color-mix(in oklab, var(--charcoal) 15%, transparent)" }}>
{JSON.stringify(
  {
    archetype,
    pace: result.profile.pace,
    region,
    priorityWeights: result.profile.priorityWeights,
    score,
    totals: day.totals,
    stops: day.stops.map(({ stop, driveFromPrev }) => ({
      id: stop.id, name: stop.name, kind: stop.kind,
      driveFromPrev, dwell: stop.dwellMin,
    })),
  },
  null,
  2,
)}
        </pre>
      </details>
    </div>
  );
}

function ScoreRow({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${primary ? "" : "mt-2"}`}>
      <span
        className="text-[12px] uppercase tracking-[0.24em]"
        style={{
          color: primary
            ? "var(--charcoal)"
            : "color-mix(in oklab, var(--charcoal) 65%, transparent)",
          fontWeight: primary ? 600 : 500,
        }}
      >
        {label}
      </span>
      <span
        className="text-[14px] tabular-nums"
        style={{
          fontFamily: "var(--font-display, Montserrat), sans-serif",
          fontWeight: primary ? 700 : 500,
          color: primary
            ? "color-mix(in oklab, var(--gold) 80%, var(--charcoal))"
            : "var(--charcoal)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function paceLabel(p?: PaceV2): string {
  switch (p) {
    case "light":    return "spacious";
    case "balanced": return "balanced";
    case "rich":     return "full but elegant";
    case "full":     return "rich";
    default:         return "considered";
  }
}

function regionLabel(r: string): string {
  switch (r) {
    case "arrabida":      return "Arrábida";
    case "lisbon-coast":  return "Sintra & the Atlantic edge";
    case "alentejo":      return "Alentejo";
    case "centro":        return "Centro";
    default:              return r;
  }
}

function archetypeLabel(a: string): string {
  return a.replace(/_/g, " ");
}
