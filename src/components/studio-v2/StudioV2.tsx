import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronDown, MessageCircle, X } from "lucide-react";
import {
  emptyProfile,
  applyIntent,
  applyPace,
  deriveArchetype,
  type DurationKey,
  type EnhancementKey,
  type GroupProfile,
  type IntentAtmosphere,
  type LuxuryTier,
  type PaceV2,
  type PriorityKey,
  type TravelerProfile,
} from "@/lib/studio-v2/profile";
import {
  INTENT_OPTIONS,
  INTENT_ATMOSPHERE,
  PACE_OPTIONS,
  PRIORITY_OPTIONS,
  PRIORITY_WEIGHTS,
  DURATION_OPTIONS,
  ENHANCEMENT_OPTIONS,
  TIER_OPTIONS,
  tierLabel,
  revealFraming,
  storyOpener,
  storyAfterIntent,
  storyAfterPace,
  storyAfterGroup,
} from "@/lib/studio-v2/content";
import { INTENT_IMAGE } from "@/lib/studio-v2/images";
import {
  designExperience,
  previewJourney,
  type DesignResult,
  type JourneyPreview,
} from "@/lib/studio-v2/engine";
import { fmtMinutes } from "@/components/builder/types";
import { PersistentChatFab } from "./PersistentChatFab";
import { LivingStoryStrip } from "./LivingStoryStrip";
import { MemoryDeck } from "./MemoryDeck";
import { AmbientToggle } from "./AmbientToggle";
import { whatsappHref } from "@/components/WhatsAppFab";
import { useServerFn } from "@tanstack/react-start";
import { composeStudioMoment } from "@/server/studioNarrative.functions";
import { createStudioSession } from "@/lib/studio-v2/sessions.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";

const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);


interface StudioV2Props {
  onExit: () => void;
  /** Optional pre-filled profile (e.g. resuming a saved share token). */
  initialProfile?: TravelerProfile;
  /** When true, jumps straight to the reveal beat using initialProfile. */
  startAtReveal?: boolean;
}


// ─── beat sequence ───────────────────────────────────────────────────────
//
// The Studio v2 journey alternates Choice → Reward → Choice → Reward …
// Reward beats auto-advance after a short pause (tap to skip). Choice
// beats advance when the traveller makes a selection (or, for multi-input
// beats like Group/Ops, when they tap Continue).

type Beat =
  | "intro"
  | "name"
  | "story-opener"
  | "choice-group"
  | "story-group"
  | "choice-duration"
  | "choice-intent"
  | "reward-image"
  | "choice-priorities"
  | "reward-map"
  | "choice-pace"
  | "reward-insight"
  | "choice-enhancements"
  | "choice-tier"
  | "choice-ops"
  | "thinking"
  | "reveal";

// Bible-aligned order:
// Welcome → Name → Group + Guests → Duration → Style (intent) →
// Highlights (priorities) → Pace → Enhancements → Tier → Ops → Reveal.
const SEQUENCE: Beat[] = [
  "intro",
  "name",
  "story-opener",
  "choice-group",
  "story-group",
  "choice-duration",
  "choice-intent",
  "reward-image",
  "choice-priorities",
  "reward-map",
  "choice-pace",
  "reward-insight",
  "choice-enhancements",
  "choice-tier",
  "choice-ops",
  "thinking",
  "reveal",
];

const REWARD_BEATS = new Set<Beat>([
  "story-opener",
  "reward-image",
  "reward-insight",
  "reward-map",
  "story-group",
  "thinking",
]);

const CHOICE_BEATS = new Set<Beat>([
  "choice-group",
  "choice-duration",
  "choice-intent",
  "choice-priorities",
  "choice-pace",
  "choice-enhancements",
  "choice-tier",
  "choice-ops",
]);

export function StudioV2({ onExit, initialProfile, startAtReveal }: StudioV2Props) {
  const [profile, setProfile] = useState<TravelerProfile>(() => initialProfile ?? emptyProfile());
  const [beatIndex, setBeatIndex] = useState(() =>
    startAtReveal ? SEQUENCE.indexOf("reveal") : 0,
  );
  const [result, setResult] = useState<DesignResult | null>(() =>
    startAtReveal && initialProfile ? designExperience(initialProfile) : null,
  );
  const beat = SEQUENCE[beatIndex];


  const update = (patch: Partial<TravelerProfile>) => {
    setProfile((p) => ({ ...p, ...patch }));
  };

  const next = useCallback(() => {
    setBeatIndex((i) => Math.min(SEQUENCE.length - 1, i + 1));
  }, []);
  const back = useCallback(() => {
    setBeatIndex((i) => Math.max(0, i - 1));
  }, []);

  // Auto-advance reward beats (skippable by tap).
  const rewardTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!REWARD_BEATS.has(beat)) return;
    const ms =
      beat === "thinking"       ? 1500 :
      beat === "reward-map"     ? 2600 :
      beat === "reward-image"   ? 2100 :
      beat === "reward-insight" ? 1900 :
      beat === "story-opener"   ? 2000 :
      beat === "story-group"    ? 1800 :
                                  2000;
    if (rewardTimer.current) window.clearTimeout(rewardTimer.current);
    rewardTimer.current = window.setTimeout(() => {
      if (beat === "thinking") {
        // Compose the final result at the very last moment.
        const archetype = deriveArchetype(profile);
        const r = designExperience({ ...profile, archetype });
        setResult(r);
      }
      setBeatIndex((i) => Math.min(SEQUENCE.length - 1, i + 1));
    }, ms);
    return () => {
      if (rewardTimer.current) window.clearTimeout(rewardTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  // Live preview drives reward-map beat.
  const preview: JourneyPreview = useMemo(() => previewJourney(profile), [profile]);

  // Atmospheric backdrop — shifts with intent.
  const atmo = profile.intent ? INTENT_ATMOSPHERE[profile.intent] : null;
  const atmosphereBg = atmo
    ? `radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, ${atmo.tintA} ${atmo.mix}%, var(--ivory)) 0%, var(--ivory) 55%), radial-gradient(80% 60% at 80% 100%, color-mix(in oklab, ${atmo.tintB} 35%, transparent) 0%, transparent 60%)`
    : `radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--sand) 35%, var(--ivory)) 0%, var(--ivory) 60%)`;

  const totalBeats = SEQUENCE.length;
  const progress = Math.round((beatIndex / (totalBeats - 1)) * 100);
  const showChrome = beat !== "intro" && beat !== "reveal";

  return (
    <div
      className="studio-v2 relative min-h-screen w-full overflow-x-hidden"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      <div className="studio-v2__atmosphere" aria-hidden style={{ background: atmosphereBg }} />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        {showChrome ? (
          <span
            className="text-[11px] uppercase tracking-[0.32em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
          >
            Studio · your journey
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          {showChrome && <AmbientToggle />}
          <button
            onClick={onExit}
            aria-label="Exit studio"
            className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-[color:var(--sand)] focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {showChrome && (
        <div className="relative z-10 px-5 sm:px-8" aria-hidden>
          <div
            className="h-[2px] w-full rounded-full"
            style={{ background: "color-mix(in oklab, var(--charcoal) 8%, transparent)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%`, background: "var(--gold)" }}
            />
          </div>
          <div className="mt-3">
            <MemoryDeck
              profile={profile}
              onJump={(idx) => setBeatIndex(idx)}
              beatIndexFor={(key) => Math.max(0, SEQUENCE.indexOf(key as Beat))}
            />
          </div>
        </div>
      )}

      <main
        key={beat}
        className="studio-v2-reveal relative z-10 mx-auto w-full max-w-3xl px-5 pb-28 pt-6 sm:px-8 sm:pt-10"
      >
        {beat === "intro" && (
          <IntroBeat onBegin={next} />
        )}

        {beat === "name" && (
          <NameBeat
            initial={profile.name ?? ""}
            onSubmit={(name) => {
              update({ name: name.trim() || undefined });
              next();
            }}
            onSkip={next}
          />
        )}

        {beat === "story-opener" && (
          <StoryBeat
            line={storyOpener(profile.name)}
            onSkip={next}
          />
        )}

        {beat === "choice-intent" && (
          <ChoiceBeat
            eyebrow="Atmosphere"
            title={
              <>
                How should it{" "}
                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
                  feel
                </span>
                ?
              </>
            }
            helper="Choose the atmosphere closest to what you have in mind."
            onBack={back}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {INTENT_OPTIONS.map((opt) => (
                <PhotoOptionCard
                  key={opt.id}
                  active={profile.intent === opt.id}
                  label={opt.label}
                  sub={opt.sub}
                  image={INTENT_IMAGE[opt.id].src}
                  alt={INTENT_IMAGE[opt.id].alt}
                  onClick={() => {
                    update(applyIntent(profile, opt.id as IntentAtmosphere));
                    window.setTimeout(next, 320);
                  }}
                />
              ))}
            </div>
          </ChoiceBeat>
        )}

        {beat === "reward-image" && profile.intent && (
          <RewardImageBeat intent={profile.intent} onSkip={next} />
        )}

        {beat === "choice-pace" && (
          <ChoiceBeat
            eyebrow="Rhythm"
            title="Set the rhythm."
            helper="How dense should the day feel?"
            onBack={back}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PACE_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.id}
                  active={profile.pace === opt.id}
                  label={opt.label}
                  sub={opt.sub}
                  onClick={() => {
                    update(applyPace(profile, opt.id as PaceV2));
                    window.setTimeout(next, 280);
                  }}
                />
              ))}
            </div>
          </ChoiceBeat>
        )}

        {beat === "reward-insight" && (
          <InsightBeat line={profile.pace ? storyAfterPace(profile.pace) : "A rhythm is forming."} onSkip={next} />
        )}

        {beat === "choice-priorities" && (
          <ChoiceBeat
            eyebrow="Priorities"
            title="What pulls you in?"
            helper="Tap to add. Tap again to mark essential."
            onBack={back}
            footer={
              <ContinueButton
                label="Continue"
                onClick={next}
                disabled={Object.keys(profile.priorityWeights).length === 0}
              />
            }
          >
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const w = profile.priorityWeights[opt.id as PriorityKey];
                const nextW =
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
                      if (nextW === undefined) delete pw[opt.id as PriorityKey];
                      else pw[opt.id as PriorityKey] = nextW;
                      update({ priorityWeights: pw });
                    }}
                  />
                );
              })}
            </div>
          </ChoiceBeat>
        )}

        {beat === "reward-map" && (
          <RewardMapBeat preview={preview} onSkip={next} />
        )}

        {beat === "choice-group" && (
          <ChoiceBeat
            eyebrow="Guests"
            title="Who is travelling."
            helper="We tailor pacing and comfort to the group."
            onBack={back}
            footer={<ContinueButton label="Continue" onClick={next} />}
          >
            <GroupForm value={profile.group} onChange={(g) => update({ group: g })} />
          </ChoiceBeat>
        )}

        {beat === "story-group" && (
          <StoryBeat line={storyAfterGroup(profile.group)} onSkip={next} />
        )}

        {beat === "choice-duration" && (
          <ChoiceBeat
            eyebrow="Duration"
            title={<>How long should it <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>last</span>?</>}
            helper="A focused chapter, a full arc, or a woven journey."
            onBack={back}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DURATION_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.id}
                  active={profile.duration === opt.id}
                  label={opt.label}
                  sub={opt.sub}
                  onClick={() => {
                    update({
                      duration: opt.id,
                      durationDays: opt.id === "multi-day" ? (profile.durationDays ?? 3) : undefined,
                    });
                    window.setTimeout(next, 280);
                  }}
                />
              ))}
            </div>
            {profile.duration === "multi-day" && (
              <div className="mt-6 flex items-center justify-between rounded-[2px] border px-4 py-3"
                   style={{ borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)" }}>
                <span className="text-[13px]" style={{ color: "var(--charcoal)" }}>How many days?</span>
                <div className="flex items-center gap-3">
                  <StepBtn label="−" onClick={() => update({ durationDays: Math.max(2, (profile.durationDays ?? 3) - 1) })} />
                  <span className="w-6 text-center text-[15px] tabular-nums">{profile.durationDays ?? 3}</span>
                  <StepBtn label="+" onClick={() => update({ durationDays: Math.min(10, (profile.durationDays ?? 3) + 1) })} />
                </div>
              </div>
            )}
          </ChoiceBeat>
        )}

        {beat === "choice-enhancements" && (
          <ChoiceBeat
            eyebrow="Enhancements"
            title={<>Add a <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>signature</span> touch.</>}
            helper="Optional layers, confirmed by a local before booking."
            onBack={back}
            footer={<ContinueButton label="Continue" onClick={next} />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ENHANCEMENT_OPTIONS.map((opt) => {
                const active = profile.enhancements.includes(opt.id);
                return (
                  <OptionCard
                    key={opt.id}
                    active={active}
                    label={opt.label}
                    sub={opt.sub}
                    onClick={() => {
                      const set = new Set(profile.enhancements);
                      if (active) set.delete(opt.id);
                      else set.add(opt.id);
                      update({ enhancements: Array.from(set) as EnhancementKey[] });
                    }}
                  />
                );
              })}
            </div>
          </ChoiceBeat>
        )}

        {beat === "choice-tier" && (
          <ChoiceBeat
            eyebrow="Experience tier"
            title={<>Choose your <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>level</span>.</>}
            helper="Pricing is confirmed at reveal — no surprises."
            onBack={back}
          >
            <div className="grid grid-cols-1 gap-3">
              {TIER_OPTIONS.map((opt) => {
                const active = (profile.group?.luxuryTier ?? "elevated") === opt.id;
                return (
                  <OptionCard
                    key={opt.id}
                    active={active}
                    label={opt.label}
                    sub={opt.sub}
                    onClick={() => {
                      const g: GroupProfile = profile.group ?? {
                        adults: 2, children: 0, teens: 0, mobility: "none",
                        occasion: "none", decisionStyle: "collaborative", luxuryTier: opt.id as LuxuryTier,
                      };
                      update({ group: { ...g, luxuryTier: opt.id as LuxuryTier } });
                      window.setTimeout(next, 280);
                    }}
                  />
                );
              })}
            </div>
          </ChoiceBeat>
        )}

        {beat === "choice-ops" && (
          <ChoiceBeat
            eyebrow="Logistics"
            title="A few practicalities."
            helper="Optional. Sensible defaults stand in."
            onBack={back}
            footer={<ContinueButton label="Design my day" onClick={next} />}
          >
            <OpsForm value={profile.ops} onChange={(ops) => update({ ops })} />
          </ChoiceBeat>
        )}

        {beat === "thinking" && (
          <ThinkingBeat />
        )}

        {beat === "reveal" && result && (
          <section key="reveal">
            <RevealStory profile={profile} region={result.region} />


            <Reveal result={result} />
          </section>
        )}
      </main>

      {CHOICE_BEATS.has(beat) && beatIndex > 1 && (
        <LivingStoryStrip profile={profile} preview={preview} />
      )}

      <PersistentChatFab profile={profile} />
    </div>
  );
}

// ─── beat components ─────────────────────────────────────────────────────

function IntroBeat({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="relative min-h-[78vh] flex flex-col justify-center">
      {/* Cinematic ambient layer — subtle warm gold wash, no imagery, brand-safe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-2rem] -top-10 -bottom-10"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 32%, color-mix(in oklab, var(--gold-soft) 45%, transparent) 0%, transparent 70%), radial-gradient(80% 50% at 100% 100%, color-mix(in oklab, var(--teal-2) 22%, transparent) 0%, transparent 65%)",
        }}
      />
      <p
        className="studio-v2-reveal relative text-[10.5px] uppercase tracking-[0.36em]"
        style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 600 }}
      >
        Portugal — designed for you
      </p>
      <h1
        className="studio-v2-reveal delay-1 relative mt-5 text-[36px] leading-[1.05] sm:text-[54px]"
        style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
      >
        Begin your Portugal{" "}
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
          story
        </span>
        .
      </h1>
      <p
        className="studio-v2-reveal delay-2 relative mt-5 text-[15px] leading-[1.55] max-w-[28ch]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
      >
        Each choice writes the next line. By the end you'll have a day shaped around you — map, rhythm and moments already in place.
      </p>
      <div className="studio-v2-reveal delay-3 relative mt-10">
        <ContinueButton label="Begin" onClick={onBegin} />
      </div>
      <p
        className="studio-v2-reveal delay-4 relative mt-6 text-[11px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
        }}
      >
        Designed with a local. Signed by you.
      </p>
    </section>
  );
}

function NameBeat({
  initial, onSubmit, onSkip,
}: { initial: string; onSubmit: (name: string) => void; onSkip: () => void }) {
  const [v, setV] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <section className="min-h-[60vh] flex flex-col justify-center">
      <Eyebrow>Your story</Eyebrow>
      <Headline>What should we call this story?</Headline>
      <Helper>Optional. We use it only to personalise your written journey.</Helper>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}
        className="mt-6"
      >
        <input
          ref={inputRef}
          type="text"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="e.g. Maria"
          maxLength={40}
          className="w-full rounded-[2px] border bg-transparent px-4 py-4 text-[18px] focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: "color-mix(in oklab, var(--charcoal) 20%, transparent)",
            color: "var(--charcoal)",
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: 600,
          }}
        />
        <div className="mt-6 flex items-center gap-4">
          <ContinueButton label={v.trim() ? "Continue" : "Begin"} onClick={() => onSubmit(v)} />
          {!v.trim() && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[11.5px] uppercase tracking-[0.28em] min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              skip
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function StoryBeat({ line, onSkip }: { line: string; onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Continue"
      className="block w-full min-h-[60vh] text-left focus-visible:outline-none"
    >
      <div className="flex min-h-[60vh] flex-col justify-center">
        <p
          className="studio-v2-reveal text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
        >
          Chapter
        </p>
        <p
          className="studio-v2-reveal delay-1 mt-5 text-[26px] leading-[1.2] sm:text-[34px]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "var(--charcoal)",
          }}
        >
          {line}
        </p>
        <p
          className="studio-v2-reveal delay-3 mt-8 text-[11px] uppercase tracking-[0.28em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 45%, transparent)" }}
        >
          tap to continue
        </p>
      </div>
    </button>
  );
}

function InsightBeat({ line, onSkip }: { line: string; onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Continue"
      className="block w-full min-h-[55vh] text-left focus-visible:outline-none"
    >
      <div className="flex min-h-[55vh] flex-col justify-center">
        <div
          className="studio-v2-reveal inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
          </span>
          AI insight
        </div>
        <p
          className="studio-v2-reveal delay-1 mt-5 text-[20px] leading-[1.35] sm:text-[24px]"
          style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 500 }}
        >
          {line}
        </p>
      </div>
    </button>
  );
}

function RewardImageBeat({
  intent, onSkip,
}: { intent: IntentAtmosphere; onSkip: () => void }) {
  const atmo = INTENT_ATMOSPHERE[intent];
  const img = INTENT_IMAGE[intent];
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Continue"
      className="block w-full focus-visible:outline-none"
    >
      <figure
        className="studio-v2-reveal relative -mx-5 sm:-mx-8 overflow-hidden"
        style={{ height: "62vh", minHeight: 360, background: "var(--sand)" }}
      >
        <img
          src={img.src}
          alt={img.alt}
          width={1024}
          height={1024}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.92)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 40%, color-mix(in oklab, var(--charcoal) 70%, transparent) 100%)",
          }}
        />
        <figcaption className="absolute inset-x-5 bottom-6 sm:inset-x-8">
          <p
            className="text-[10.5px] uppercase tracking-[0.32em]"
            style={{ color: "color-mix(in oklab, var(--gold) 85%, var(--ivory))" }}
          >
            {INTENT_OPTIONS.find((o) => o.id === intent)?.label}
          </p>
          <p
            className="mt-2 text-[20px] leading-[1.3] sm:text-[26px]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "var(--ivory)",
            }}
          >
            {atmo.whisper}
          </p>
        </figcaption>
      </figure>
      <p
        className="studio-v2-reveal delay-2 mt-4 text-[11px] uppercase tracking-[0.28em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
      >
        tap to continue
      </p>
    </button>
  );
}

function RewardMapBeat({
  preview, onSkip,
}: { preview: JourneyPreview; onSkip: () => void }) {
  return (
    <section className="studio-v2-reveal">
      <Eyebrow>Route taking shape</Eyebrow>
      <Headline>The map begins to draw itself.</Headline>
      <div
        className="relative mt-6 -mx-5 sm:-mx-8 overflow-hidden border-y"
        style={{
          height: "48vh",
          minHeight: 320,
          borderColor: "color-mix(in oklab, var(--charcoal) 8%, transparent)",
          background: "var(--sand)",
        }}
        aria-label="Live route preview"
      >
        <Suspense
          fallback={
            <div
              className="absolute inset-0 grid place-items-center text-[10.5px] uppercase tracking-[0.24em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              shaping route…
            </div>
          }
        >
          <BuilderMap
            stops={preview.stops}
            regionCenter={preview.regionCenter}
            regionKey={preview.region}
            emotionalMode
            chrome={false}
          />
        </Suspense>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(to top, color-mix(in oklab, var(--ivory) 92%, transparent) 8%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-3 left-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
          </span>
          {regionShort(preview.region)} · {preview.stops.length} stops
        </div>
      </div>
      <div className="mt-6">
        <ContinueButton label="Continue" onClick={onSkip} />
      </div>
    </section>
  );
}

function ThinkingBeat() {
  return (
    <section className="min-h-[55vh] flex flex-col justify-center">
      <div className="flex items-center gap-2">
        <ShimmerDot delay={0} />
        <ShimmerDot delay={120} />
        <ShimmerDot delay={240} />
      </div>
      <p
        className="studio-v2-reveal delay-1 mt-5 text-[22px] leading-[1.3]"
        style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 500 }}
      >
        Composing your journey…
      </p>
      <p
        className="studio-v2-reveal delay-2 mt-2 text-[13px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
        }}
      >
        Matching atmosphere, pace and priorities to a feasible day.
      </p>
    </section>
  );
}

function ShimmerDot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        background: "var(--gold)",
        animation: "studioV2Pulse 1.2s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

function RevealStory({
  profile, region,
}: { profile: TravelerProfile; region: string }) {
  const who = profile.name?.trim() ? `${profile.name.trim()}'s` : "Your";
  const hero = profile.intent ? INTENT_IMAGE[profile.intent] : undefined;
  const tier = tierLabel(profile.group?.luxuryTier);
  const livePreview = useMemo(() => previewJourney(profile), [profile]);


  // AI tone layer — one editorial title + subtitle from Lovable Gateway.
  // Fails silently to the static framing if anything goes wrong.
  const sessionId = useBuilderSessionId();
  const compose = useServerFn(composeStudioMoment);
  const [ai, setAi] = useState<{ title: string; subtitle: string } | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const topPriority = Object.keys(profile.priorityWeights)[0] ?? null;
    const groupShape = profile.group
      ? profile.group.adults <= 2 && profile.group.children === 0 && profile.group.teens === 0
        ? "couple"
        : (profile.group.children + profile.group.teens > 0 ? "family" : "group")
      : null;
    compose({
      data: {
        sessionId,
        mode: "proposal",
        locale: "en",
        mood: profile.intent ?? null,
        who: groupShape,
        intention: topPriority,
        journeyType: profile.duration === "multi-day" ? "multi" : "day",
        travellerName: profile.name?.trim() || null,
        narrativeStage: "reveal",
        confidence: 1,
        acceptedCount: Object.keys(profile.priorityWeights).length,
      },
    })
      .then((r) => {
        if (cancelled || r.mode !== "proposal") return;
        setAi({ title: r.title, subtitle: r.subtitle });
      })
      .catch(() => { /* silent — static framing remains */ });
    return () => { cancelled = true; };
  }, [sessionId, compose, profile]);

  return (
    <section className="mb-10">
      {/* Hero image — real, editorial, no overlay text */}
      {hero && (
        <div
          className="studio-v2-reveal relative -mx-5 sm:-mx-8 mb-8 overflow-hidden"
          style={{ aspectRatio: "18 / 10" }}
        >
          <img
            src={hero.src}
            alt={hero.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 55%, color-mix(in oklab, var(--charcoal) 28%, transparent) 100%)",
            }}
          />
        </div>
      )}

      {/* Live route — real stops, drawn on map */}
      {livePreview.stops.length >= 2 && (
        <div
          className="studio-v2-reveal -mx-5 sm:-mx-8 mb-8 overflow-hidden relative w-full h-[36vh] min-h-[240px] max-h-[360px] border-y"
          style={{
            borderColor: "color-mix(in oklab, var(--charcoal) 8%, transparent)",
            background: "var(--sand)",
          }}
        >
          <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.24em]" style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}>Drawing your route…</div>}>
            <BuilderMap
              stops={livePreview.stops}
              regionCenter={livePreview.regionCenter}
              regionKey={livePreview.region}
              emotionalMode
              chrome={false}
            />
          </Suspense>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--ivory) 70%, transparent) 100%)",
            }}
          />
        </div>
      )}


      <p
        className="text-[10.5px] uppercase tracking-[0.36em]"
        style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 600 }}
      >
        {who} signature Portugal experience
      </p>
      {ai ? (
        <>
          <h2
            className="mt-4 text-[28px] leading-[1.05] sm:text-[36px]"
            style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>YES —</span>{" "}
            {ai.title}.
          </h2>
          <p
            className="mt-5 text-[19px] leading-[1.4] sm:text-[22px]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "var(--charcoal)",
            }}
          >
            {ai.subtitle}
          </p>
        </>
      ) : (
        <>
          <h2
            className="mt-4 text-[28px] leading-[1.05] sm:text-[36px]"
            style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            YES —{" "}
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
              you have just created
            </span>{" "}
            your Signature Portugal Experience.
          </h2>
          <p
            className="mt-5 text-[19px] leading-[1.4] sm:text-[22px]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "var(--charcoal)",
            }}
          >
            {revealFraming(profile.intent, region)}
          </p>
        </>
      )}
      <ul
        className="mt-6 space-y-2 text-[14px] leading-relaxed"
        style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
      >
        {profile.intent && <li>· {storyAfterIntent(profile.intent)}</li>}
        {profile.pace   && <li>· {storyAfterPace(profile.pace)}</li>}
        {profile.group  && <li>· {storyAfterGroup(profile.group)}</li>}
      </ul>

      {/* Experience Investment — no invented prices, tier label only */}
      <div
        className="mt-8 rounded-[2px] border p-5"
        style={{
          borderColor: "color-mix(in oklab, var(--gold) 32%, transparent)",
          background: "color-mix(in oklab, var(--sand) 40%, transparent)",
        }}
      >
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))", fontWeight: 600 }}
        >
          Experience investment
        </p>
        <p
          className="mt-2 text-[17px] leading-[1.3]"
          style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600, color: "var(--charcoal)" }}
        >
          {tier} tier · all-inclusive · private throughout
        </p>
        <p
          className="mt-1 text-[12.5px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
          }}
        >
          Final investment is confirmed at reveal — no surprises.
        </p>
      </div>

      {/* Trust band — micro, factual */}
      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center"
      >
        {["500+ travellers", "Private only", "Designed by locals", "Instant confirmation"].map((t) => (
          <span
            key={t}
            className="text-[10.5px] uppercase tracking-[0.28em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
          >
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── reusable chrome ─────────────────────────────────────────────────────

function ChoiceBeat({
  eyebrow, title, helper, children, onBack, footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  helper: string;
  children: React.ReactNode;
  onBack: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <section>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Headline>{title}</Headline>
      <Helper>{helper}</Helper>
      <div className="mt-6">{children}</div>
      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] uppercase tracking-[0.28em] min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
        >
          ← Back
        </button>
        {footer}
      </div>
    </section>
  );
}

function ContinueButton({
  label, onClick, disabled,
}: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-2.5 rounded-[2px] px-7 py-3.5 text-[12.5px] tracking-[0.22em] transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: "var(--charcoal)",
        color: "var(--ivory)",
        minHeight: 48,
        minWidth: 184,
        fontFamily: "var(--font-sans, Inter), sans-serif",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {label}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px]"
        aria-hidden
      />
    </button>
  );
}

// ─── reveal action trio ──────────────────────────────────────────────────

function RevealActions({
  name,
  profile,
  region,
  archetype,
}: {
  name?: string;
  profile?: TravelerProfile;
  region?: string;
  archetype?: string;
}) {
  const saveSession = useServerFn(createStudioSession);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const onSave = async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    try {
      if (profile) {
        const r = await saveSession({
          data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            profile: profile as any,
            region,
            archetype,
          },
        });
        const url = `${window.location.origin}/s/${r.shareToken}`;
        setShareUrl(url);
        try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
        try { window.localStorage.setItem("yes.studio-v2.last-share", url); } catch { /* */ }
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };
  const saved = saveState === "saved";

  const waMsg = name?.trim()
    ? `Olá! Sou ${name.trim()} e acabei de desenhar a minha experiência no Studio. Gostaria de a refinar com um local designer.`
    : "Olá! Acabei de desenhar uma experiência no Studio. Gostaria de a refinar com um local designer.";
  return (
    <div className="mt-12 flex flex-col gap-3">
      {/* 1 — Primary: Secure Your Experience (gold) */}
      <button
        type="button"
        className="group inline-flex items-center justify-center gap-2.5 rounded-[2px] px-6 py-4 transition-all focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "color-mix(in oklab, var(--gold) 92%, var(--charcoal))",
          color: "var(--charcoal)",
          minHeight: 56,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          boxShadow: "0 8px 24px -12px color-mix(in oklab, var(--gold) 60%, transparent)",
        }}
      >
        Secure your experience
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-[3px]" aria-hidden />
      </button>

      {/* 2 — Secondary: Save My Experience (ghost) */}
      <button
        type="button"
        onClick={onSave}
        className="inline-flex items-center justify-center gap-2.5 rounded-[2px] border px-6 py-3.5 transition-all focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "transparent",
          color: "var(--charcoal)",
          borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
          minHeight: 48,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
        {saveState === "saving"
          ? "Saving…"
          : saved
          ? (shareUrl ? "Saved · link copied" : "Saved")
          : saveState === "error"
          ? "Try again"
          : "Save my experience"}
      </button>
      {saved && shareUrl && (
        <p
          className="text-center text-[11px] tracking-[0.18em] uppercase break-all"
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)", fontWeight: 600 }}
        >
          {shareUrl.replace(/^https?:\/\//, "")}
        </p>
      )}


      {/* 3 — Tertiary: Refine with a Local Designer (text) */}
      <a
        href={whatsappHref(waMsg)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-2 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
        style={{
          color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
          minHeight: 44,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 600,
          fontSize: 11.5,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
        }}
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        Refine with a local designer
      </a>

      <p
        className="mt-2 text-center text-[12px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
        }}
      >
        A local designer confirms every timing before booking.
      </p>
    </div>
  );
}







// ─── live journey layer ───────────────────────────────────────────────────
//
// Sticky cinematic map that reflects the current profile in real time.
// The InsightStrip floats over its lower edge during transitions.

function JourneyLayer({
  preview, insight, insightVisible,
}: { preview: JourneyPreview; insight: string; insightVisible: boolean }) {
  return (
    <div
      className="relative w-full h-[42vh] min-h-[260px] max-h-[420px] overflow-hidden border-y"
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 8%, transparent)",
        background: "var(--sand)",
      }}
      aria-label="Live journey preview"
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center text-[10.5px] uppercase tracking-[0.24em] font-semibold" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
            shaping route…
          </div>
        }
      >
        <BuilderMap
          stops={preview.stops}
          regionCenter={preview.regionCenter}
          regionKey={preview.region}
          emotionalMode
          chrome={false}
        />
      </Suspense>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--ivory) 55%, transparent), transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--ivory) 92%, transparent) 8%, transparent 70%)",
        }}
      />

      <div
        className="absolute top-3 left-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
      >
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
        </span>
        {regionShort(preview.region)} · {preview.stops.length} stops
      </div>

      <div
        className="absolute inset-x-4 bottom-4 transition-all duration-[520ms] ease-out motion-reduce:transition-none"
        style={{
          opacity: insightVisible ? 1 : 0,
          transform: insightVisible ? "translateY(0)" : "translateY(8px)",
        }}
        aria-live="polite"
      >
        <div
          className="rounded-[2px] border px-3.5 py-2.5 text-[12.5px] leading-snug backdrop-blur-md"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)",
            background: "color-mix(in oklab, var(--ivory) 88%, transparent)",
            color: "var(--charcoal)",
            boxShadow: "0 6px 20px color-mix(in oklab, var(--charcoal) 12%, transparent)",
          }}
        >
          {insight}
        </div>
      </div>
    </div>
  );
}

function regionShort(r: string): string {
  switch (r) {
    case "arrabida":     return "Arrábida";
    case "lisbon-coast": return "Atlantic edge";
    case "alentejo":     return "Alentejo";
    case "centro":       return "Centro";
    default:             return r;
  }
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
      className="group relative flex min-h-[92px] flex-col items-start gap-1.5 px-5 py-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: active
          ? "color-mix(in oklab, var(--sand) 70%, transparent)"
          : "color-mix(in oklab, var(--ivory) 60%, transparent)",
        borderLeft: active
          ? "2px solid var(--gold)"
          : "2px solid color-mix(in oklab, var(--charcoal) 8%, transparent)",
        boxShadow: active
          ? "0 1px 0 color-mix(in oklab, var(--charcoal) 6%, transparent)"
          : "none",
      }}
    >
      <span
        className="text-[16px] leading-snug transition-colors duration-300"
        style={{
          fontFamily: "var(--font-display, Montserrat), sans-serif",
          fontWeight: active ? 700 : 600,
          color: "var(--charcoal)",
        }}
      >
        {label}
      </span>
      <span
        className="text-[12.5px] leading-snug"
        style={{
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
          fontFamily: "var(--font-sans, Inter), sans-serif",
        }}
      >
        {sub}
      </span>
    </button>
  );
}

function PhotoOptionCard({
  active, label, sub, image, alt, onClick,
}: {
  active: boolean;
  label: string;
  sub: string;
  image: string;
  alt: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group relative block w-full overflow-hidden text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2"
      style={{
        aspectRatio: "16 / 10",
        outline: active
          ? "2px solid var(--gold)"
          : "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
        outlineOffset: 0,
      }}
    >
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        style={{ filter: active ? "saturate(1)" : "saturate(0.88)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--charcoal) 78%, transparent) 0%, color-mix(in oklab, var(--charcoal) 18%, transparent) 55%, transparent 100%)",
        }}
      />
      <div className="absolute inset-x-4 bottom-3">
        <span
          className="block text-[15px] leading-tight"
          style={{
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: active ? 700 : 600,
            color: "var(--ivory)",
            letterSpacing: "-0.005em",
          }}
        >
          {label}
        </span>
        <span
          className="mt-1 block text-[11.5px] leading-snug"
          style={{
            color: "color-mix(in oklab, var(--ivory) 82%, transparent)",
            fontFamily: "var(--font-sans, Inter), sans-serif",
          }}
        >
          {sub}
        </span>
      </div>
      {active && (
        <span
          aria-hidden
          className="absolute right-3 top-3 inline-flex h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--gold)", boxShadow: "0 0 0 4px color-mix(in oklab, var(--gold) 30%, transparent)" }}
        />
      )}
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
      className="inline-flex items-center rounded-full border px-4 text-[13px] transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2"
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

type VariantKey = "lighter" | "signature" | "richer";

function Reveal({ result }: { result: DesignResult }) {
  const { score, archetype, region } = result;
  const [variant, setVariant] = useState<VariantKey>("signature");

  const day =
    variant === "lighter" ? result.variants.lighter :
    variant === "richer"  ? result.variants.richer  :
    result.day;

  const [reasoningOpen, setReasoningOpen] = useState(false);

  return (
    <div>
      <Eyebrow>Your experience</Eyebrow>
      <Headline>A {paceLabel(result.profile.pace)} day in {regionLabel(region)}.</Headline>
      <p
        className="mt-4 text-[14.5px] leading-relaxed"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
        }}
      >
        {revealFraming(result.profile.intent, region)}
      </p>
      <Helper>
        {day.stops.length} stops · about {fmtMinutes(day.totals.dayMin)} total.
      </Helper>

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

      <button
        type="button"
        onClick={() => setReasoningOpen((o) => !o)}
        className="mt-8 flex items-center gap-2 text-[11.5px] uppercase tracking-[0.28em] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
        aria-expanded={reasoningOpen}
      >
        {reasoningOpen ? "Hide" : "See"} the reasoning
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{ transform: reasoningOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        />
      </button>

      {reasoningOpen && (
        <div className="mt-4 space-y-6">
          <div
            className="rounded-[2px] border p-5"
            style={{
              borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
              background: "color-mix(in oklab, var(--sand) 35%, transparent)",
            }}
          >
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.28em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              Designed for the {archetypeLabel(archetype)}
            </p>
            <ScoreRow label="Overall match" value={score.total} primary />
            <ScoreRow label="Fit"        value={score.fit} />
            <ScoreRow label="Pacing"     value={score.pacing} />
            <ScoreRow label="Logistics"  value={score.logistics} />
          </div>

          <div>
            <p
              className="mb-2 text-[10.5px] uppercase tracking-[0.28em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              Day intensity
            </p>
            <div
              className="inline-flex rounded-full border p-1"
              style={{ borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)" }}
              role="tablist"
              aria-label="Day intensity"
            >
              {(["lighter", "signature", "richer"] as VariantKey[]).map((v) => {
                const active = variant === v;
                return (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setVariant(v)}
                    className="rounded-full px-4 py-1.5 text-[12px] tracking-[0.18em] lowercase transition min-h-[36px]"
                    style={{
                      background: active ? "var(--charcoal)" : "transparent",
                      color: active ? "var(--ivory)" : "color-mix(in oklab, var(--charcoal) 70%, transparent)",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {result.upsells.length > 0 && (
            <div>
              <p
                className="text-[10.5px] uppercase tracking-[0.32em]"
                style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
              >
                Worth considering
              </p>
              <ul className="mt-3 space-y-3">
                {result.upsells.map((u) => (
                  <li
                    key={u.stop.id}
                    className="rounded-[2px] border p-4"
                    style={{
                      borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
                      background: "color-mix(in oklab, var(--sand) 30%, transparent)",
                    }}
                  >
                    <p
                      className="text-[14px]"
                      style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
                    >
                      {u.stop.name}
                    </p>
                    <p
                      className="mt-1 text-[12.5px] italic"
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
                      }}
                    >
                      {u.reason}
                    </p>
                    <p
                      className="mt-1.5 text-[11px] uppercase tracking-[0.22em]"
                      style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                    >
                      {fmtMinutes(u.stop.dwellMin)} on site
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}



      <RevealActions
        name={result.profile.name}
        profile={result.profile}
        region={result.region}
        archetype={result.archetype}
      />



      {import.meta.env.DEV && (
        <details className="mt-10 text-[12px]" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
          <summary className="cursor-pointer">Operational data (dev)</summary>
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
      )}
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
