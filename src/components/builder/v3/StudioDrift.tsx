import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — an adaptive emotional travel narrative.
 *
 * Drift is a living story unfolding around the traveller while the system
 * progressively learns who they are. It is not a film, not a quiz, not a
 * configurator. It is a guided drift through Portugal that quietly gathers
 * a profile from atmosphere choices, pauses, attractions and micro
 * decisions — and slowly narrows toward something inevitable.
 *
 * Architecture
 * ────────────
 *   The experience moves through six chapters. Each chapter combines:
 *     · an ambient drift moment (passive, atmospheric, no demand)
 *     · a soft prompt where two or three scenes pull the eye, and the
 *       chosen one teaches the system one explicit dimension of the
 *       traveller (companionship, energy, style, social register)
 *     · whispered narration that evolves from distant to intimate
 *
 *   Underneath, motif gravity decays and reinforces from every interaction
 *   — taps, holds, dwell time — so the world slowly tints toward what the
 *   traveller actually responds to, not what they say.
 *
 *   The final chapter is a convergence: one scene composed from everything
 *   the system noticed, with a hint that the next door is waiting.
 *
 * Constraints
 * ───────────
 *   · Mobile-first (393px target). Two-up scene tiles, large tap areas.
 *   · No form fields, no chips, no labels on the tiles themselves.
 *   · Portuguese microcopy, lowercase, italic Georgia, brief.
 *   · Respect prefers-reduced-motion (callers may gate).
 */

// ─────────────────────────────────────────────────────────────────────────
// Profile + sensory vocabulary
// ─────────────────────────────────────────────────────────────────────────

type Motif =
  | "amber"
  | "salt"
  | "stone"
  | "candle"
  | "rain"
  | "vine"
  | "harbour"
  | "linen"
  | "fado"
  | "basil"
  | "bread";

type Companions = "solo" | "couple" | "group";
type Energy = "slow" | "vivid";
type Style = "coast" | "heritage" | "wine" | "table";
type Social = "intimate" | "shared";

interface Profile {
  companions?: Companions;
  energy?: Energy;
  style?: Style;
  social?: Social;
}

type Scene = {
  id: string;
  video: string;
  motifs: Motif[];
  /** Half-seen physical traces. Surface rarely, never as a caption. */
  traces: string[];
};

const SCENES: Record<string, Scene> = {
  arrabidaCoast: {
    id: "arrabida-coast",
    video: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    motifs: ["salt", "linen", "vine"],
    traces: ["sal seco no canto da boca", "uma toalha de linho a levantar"],
  },
  caboRoca: {
    id: "cabo-roca",
    video: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    motifs: ["salt", "stone"],
    traces: ["pedra rachada debaixo da mão", "vento que entra pela manga"],
  },
  hiddenStreet: {
    id: "hidden-street",
    video: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    motifs: ["rain", "stone", "basil"],
    traces: ["azulejo molhado", "manjerico de uma janela aberta"],
  },
  viewpoint: {
    id: "viewpoint",
    video: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    motifs: ["vine", "fado", "amber"],
    traces: ["pó da vinha nos sapatos", "fado vindo da cozinha ao lado"],
  },
  candleTable: {
    id: "candle-table",
    video: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    motifs: ["candle", "amber", "bread"],
    traces: ["cera a descer pelo castiçal", "miolo de pão quente"],
  },
  celebration: {
    id: "celebration",
    video: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    motifs: ["candle", "amber", "fado", "linen"],
    traces: ["vidro a tocar vidro devagar", "risos de outra sala"],
  },
  sesimbra: {
    id: "sesimbra",
    video: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    motifs: ["harbour", "salt", "rain"],
    traces: ["gasóleo e maresia no mesmo ar", "mãos a embrulhar peixe em papel"],
  },
};

const MOTIF_TINT: Record<Motif, string> = {
  amber:   "radial-gradient(ellipse at 50% 78%, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 62%)",
  candle:  "radial-gradient(ellipse at 50% 82%, color-mix(in oklab, var(--gold-soft, var(--gold)) 26%, transparent) 0%, transparent 58%)",
  salt:    "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--ivory) 14%, transparent) 0%, transparent 65%)",
  linen:   "radial-gradient(ellipse at 50% 70%, color-mix(in oklab, var(--ivory) 10%, transparent) 0%, transparent 60%)",
  stone:   "radial-gradient(ellipse at 30% 60%, color-mix(in oklab, var(--teal) 14%, transparent) 0%, transparent 65%)",
  rain:    "radial-gradient(ellipse at 60% 45%, color-mix(in oklab, var(--teal-2, var(--teal)) 16%, transparent) 0%, transparent 65%)",
  vine:    "radial-gradient(ellipse at 50% 80%, color-mix(in oklab, var(--gold) 18%, transparent) 0%, transparent 58%)",
  harbour: "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--teal) 18%, transparent) 0%, transparent 65%)",
  fado:    "radial-gradient(ellipse at 40% 60%, color-mix(in oklab, var(--gold-soft, var(--gold)) 12%, transparent) 0%, transparent 65%)",
  basil:   "radial-gradient(ellipse at 70% 55%, color-mix(in oklab, var(--ivory) 9%, transparent) 0%, transparent 60%)",
  bread:   "radial-gradient(ellipse at 50% 75%, color-mix(in oklab, var(--gold) 12%, transparent) 0%, transparent 58%)",
};

// ─────────────────────────────────────────────────────────────────────────
// Chapter graph — narrative spine of the drift
// ─────────────────────────────────────────────────────────────────────────

type ChapterKind = "drift" | "choice" | "convergence";

interface DriftChapter {
  kind: "drift";
  id: string;
  /** Distant → intimate. Whispered, lowercase, never imperative. */
  whisper: string;
  /** Scenes that play in soft succession. */
  scenes: Scene[];
  /** Auto-advance after this many ms unless held. */
  holdMs: number;
}

interface ChoiceOption {
  scene: Scene;
  /** Soft hint that fades in after a beat. Lowercase, italic, brief. */
  hint: string;
  /** What this choice teaches the system. */
  imprint: Partial<Profile>;
  /** Extra motif gravity gained by picking this. */
  reinforce: Motif[];
}

interface ChoiceChapter {
  kind: "choice";
  id: string;
  /** Question never appears as text. This is the inner question. */
  inner: string;
  /** Whisper shown briefly before options resolve. */
  whisper: string;
  options: ChoiceOption[];
}

interface ConvergenceChapter {
  kind: "convergence";
  id: string;
}

type Chapter = DriftChapter | ChoiceChapter | ConvergenceChapter;

const CHAPTERS: Chapter[] = [
  {
    kind: "drift",
    id: "opening",
    whisper: "portugal já está acordada. respira primeiro.",
    scenes: [SCENES.arrabidaCoast, SCENES.hiddenStreet],
    holdMs: 7800,
  },
  {
    kind: "choice",
    id: "companionship",
    inner: "companhia",
    whisper: "onde te imaginas, agora",
    options: [
      {
        scene: SCENES.caboRoca,
        hint: "só, com o vento",
        imprint: { companions: "solo" },
        reinforce: ["stone", "salt"],
      },
      {
        scene: SCENES.candleTable,
        hint: "à mesa, a dois",
        imprint: { companions: "couple" },
        reinforce: ["candle", "amber"],
      },
      {
        scene: SCENES.celebration,
        hint: "entre os teus",
        imprint: { companions: "group" },
        reinforce: ["fado", "linen"],
      },
    ],
  },
  {
    kind: "drift",
    id: "settling",
    whisper: "portugal está a reparar em ti",
    scenes: [SCENES.viewpoint],
    holdMs: 6200,
  },
  {
    kind: "choice",
    id: "energy",
    inner: "ritmo",
    whisper: "que ritmo te assenta hoje",
    options: [
      {
        scene: SCENES.viewpoint,
        hint: "devagar, com vista",
        imprint: { energy: "slow" },
        reinforce: ["vine", "amber"],
      },
      {
        scene: SCENES.sesimbra,
        hint: "vivo, com mãos",
        imprint: { energy: "vivid" },
        reinforce: ["harbour", "salt"],
      },
    ],
  },
  {
    kind: "choice",
    id: "style",
    inner: "tropismo",
    whisper: "o que te puxa primeiro",
    options: [
      {
        scene: SCENES.arrabidaCoast,
        hint: "a costa",
        imprint: { style: "coast" },
        reinforce: ["salt", "linen"],
      },
      {
        scene: SCENES.hiddenStreet,
        hint: "as ruas antigas",
        imprint: { style: "heritage" },
        reinforce: ["stone", "basil"],
      },
      {
        scene: SCENES.viewpoint,
        hint: "a vinha",
        imprint: { style: "wine" },
        reinforce: ["vine", "fado"],
      },
    ],
  },
  {
    kind: "drift",
    id: "narrowing",
    whisper: "a paisagem está a apertar à tua volta",
    scenes: [SCENES.viewpoint, SCENES.candleTable],
    holdMs: 6800,
  },
  {
    kind: "choice",
    id: "social",
    inner: "registo",
    whisper: "e quando a noite chega",
    options: [
      {
        scene: SCENES.candleTable,
        hint: "uma mesa só vossa",
        imprint: { social: "intimate" },
        reinforce: ["candle", "amber", "bread"],
      },
      {
        scene: SCENES.celebration,
        hint: "vidro a tocar vidro",
        imprint: { social: "shared" },
        reinforce: ["fado", "linen", "amber"],
      },
    ],
  },
  { kind: "convergence", id: "convergence" },
];

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  onExit?: () => void;
  /** Fired when the convergence reveals and the traveller asks to continue. */
  onContinue?: (profile: Profile) => void;
}

export function StudioDrift({ onExit, onContinue }: Props) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [profile, setProfile] = useState<Profile>({});
  const [audioOn, setAudioOn] = useState(false);
  const gravityRef = useRef<Map<Motif, number>>(new Map());
  const [, setTick] = useState(0);

  const chapter = CHAPTERS[chapterIdx];

  const reinforce = useCallback((motifs: Motif[], amount: number) => {
    const g = gravityRef.current;
    for (const m of motifs) {
      g.set(m, Math.min(8, (g.get(m) ?? 0) + amount));
    }
    setTick((t) => t + 1);
  }, []);

  const advance = useCallback(() => {
    setChapterIdx((i) => Math.min(i + 1, CHAPTERS.length - 1));
  }, []);

  const onPick = useCallback(
    (opt: ChoiceOption) => {
      if (!audioOn) setAudioOn(true);
      setProfile((p) => ({ ...p, ...opt.imprint }));
      reinforce(opt.reinforce, 1.4);
      window.setTimeout(advance, 900);
    },
    [audioOn, reinforce, advance],
  );

  const memoryTints = useMemo(() => {
    const g = gravityRef.current;
    return [...g.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([m, w]) => ({
        bg: MOTIF_TINT[m],
        opacity: Math.min(0.7, 0.2 + w * 0.12),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdx, gravityRef.current.size]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      style={{ touchAction: "manipulation" }}
    >
      {chapter.kind === "drift" && (
        <DriftPhase
          key={chapter.id}
          chapter={chapter}
          onDone={advance}
          onLinger={(motifs) => reinforce(motifs, 0.6)}
          onAudio={() => !audioOn && setAudioOn(true)}
        />
      )}

      {chapter.kind === "choice" && (
        <ChoicePhase
          key={chapter.id}
          chapter={chapter}
          onPick={onPick}
        />
      )}

      {chapter.kind === "convergence" && (
        <ConvergencePhase
          profile={profile}
          gravity={gravityRef.current}
          onContinue={() => onContinue?.(profile)}
        />
      )}

      {memoryTints.map((t, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-[2400ms] ease-out"
          style={{ background: t.bg, opacity: t.opacity, mixBlendMode: "soft-light" }}
        />
      ))}

      {/* progress — almost invisible, four dashes that slowly fill */}
      <Progress index={chapterIdx} total={CHAPTERS.length} />

      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label="sair"
          className="absolute top-4 left-4 z-40 h-6 w-6 rounded-full bg-[color:var(--ivory)]/10 hover:bg-[color:var(--ivory)]/25 transition-colors"
        />
      )}

      {audioOn && <AmbientAudio gravity={gravityRef.current} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Drift phase — passive atmosphere with a whisper
// ─────────────────────────────────────────────────────────────────────────

function DriftPhase({
  chapter,
  onDone,
  onLinger,
  onAudio,
}: {
  chapter: DriftChapter;
  onDone: () => void;
  onLinger: (motifs: Motif[]) => void;
  onAudio: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const scene = chapter.scenes[idx];

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (idx < chapter.scenes.length - 1) setIdx((i) => i + 1);
      else onDone();
    }, chapter.holdMs);
    const soft = window.setTimeout(() => onLinger(scene.motifs), chapter.holdMs * 0.55);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(soft);
    };
  }, [idx, chapter, onDone, onLinger, scene.motifs]);

  return (
    <>
      <SceneVideo src={scene.video} />
      <Vignette />
      <button
        type="button"
        aria-label=" "
        className="absolute inset-0 z-10 cursor-default outline-none"
        onMouseDown={onAudio}
        onTouchStart={onAudio}
      />
      <Whisper key={`w-${chapter.id}-${idx}`} text={chapter.whisper} delay={1400} hold={4200} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Choice phase — two or three scene tiles, no labels, soft hints
// ─────────────────────────────────────────────────────────────────────────

function ChoicePhase({
  chapter,
  onPick,
}: {
  chapter: ChoiceChapter;
  onPick: (opt: ChoiceOption) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShowHints(true), 2400);
    return () => window.clearTimeout(t);
  }, []);

  const handlePick = (opt: ChoiceOption) => {
    if (picked) return;
    setPicked(opt.scene.id);
    onPick(opt);
  };

  return (
    <>
      <Whisper text={chapter.whisper} delay={400} hold={2200} />
      <div className="absolute inset-0 z-10 flex flex-col">
        {chapter.options.map((opt) => {
          const isPicked = picked === opt.scene.id;
          const isDimmed = picked !== null && !isPicked;
          return (
            <button
              key={opt.scene.id}
              type="button"
              onClick={() => handlePick(opt)}
              className="relative flex-1 overflow-hidden outline-none transition-all duration-[1100ms] ease-out group"
              style={{
                opacity: isDimmed ? 0.15 : 1,
                transform: isPicked ? "scale(1.02)" : "scale(1)",
              }}
            >
              <video
                src={opt.scene.video}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: "saturate(0.94) contrast(1.03)" }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 transition-opacity duration-700"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.08) 70%, rgba(0,0,0,0.46) 100%)",
                }}
              />
              {/* soft hairline between tiles */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px"
                style={{ background: "color-mix(in oklab, var(--ivory) 18%, transparent)" }}
              />
              <span
                className="absolute inset-x-0 bottom-6 z-10 block text-center italic text-[color:var(--ivory)] transition-all duration-[1600ms]"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "15px",
                  letterSpacing: "0.01em",
                  textShadow: "0 1px 18px rgba(0,0,0,0.7)",
                  opacity: showHints ? 0.82 : 0,
                  transform: showHints ? "translateY(0)" : "translateY(6px)",
                }}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Convergence — one composed scene + a door
// ─────────────────────────────────────────────────────────────────────────

function ConvergencePhase({
  profile,
  gravity,
  onContinue,
}: {
  profile: Profile;
  gravity: Map<Motif, number>;
  onContinue?: () => void;
}) {
  const scene = useMemo(() => pickConvergenceScene(profile, gravity), [profile, gravity]);
  const line = useMemo(() => composeReveal(profile), [profile]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 3800);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <SceneVideo src={scene.video} />
      <Vignette stronger />
      <div className="absolute inset-x-0 bottom-[26%] z-20 px-8 text-center pointer-events-none">
        <p
          className="italic text-[color:var(--ivory)] mx-auto max-w-[24ch]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "19px",
            lineHeight: 1.55,
            letterSpacing: "0.005em",
            textShadow: "0 1px 22px rgba(0,0,0,0.78)",
            opacity: 0.92,
          }}
        >
          {line}
        </p>
      </div>
      {onContinue && (
        <div
          className="absolute inset-x-0 bottom-10 z-30 flex justify-center transition-opacity duration-[1600ms]"
          style={{ opacity: ready ? 1 : 0, pointerEvents: ready ? "auto" : "none" }}
        >
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-3 rounded-full text-[13px] tracking-[0.18em] uppercase text-[color:var(--ivory)] border border-[color:var(--ivory)]/40 hover:border-[color:var(--ivory)]/80 hover:bg-[color:var(--ivory)]/5 transition-all duration-500"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            continuar
          </button>
        </div>
      )}
    </>
  );
}

function pickConvergenceScene(profile: Profile, gravity: Map<Motif, number>): Scene {
  // Prefer the scene whose motifs align most with accumulated gravity, but
  // honour explicit choices first.
  if (profile.social === "intimate") return SCENES.candleTable;
  if (profile.social === "shared") return SCENES.celebration;
  if (profile.style === "coast") return SCENES.arrabidaCoast;
  if (profile.style === "heritage") return SCENES.hiddenStreet;
  if (profile.style === "wine") return SCENES.viewpoint;
  // Fallback by gravity.
  const all = Object.values(SCENES);
  const scored = all.map((s) => ({
    s,
    w: s.motifs.reduce((a, m) => a + (gravity.get(m) ?? 0), 0),
  }));
  scored.sort((a, b) => b.w - a.w);
  return scored[0].s;
}

function composeReveal(profile: Profile): string {
  // Brief, lowercase, never a list. Hints at a shape, doesn't name it.
  const c = profile.companions;
  const e = profile.energy;
  const s = profile.style;
  const so = profile.social;

  if (so === "intimate" && (c === "couple" || c === "solo")) {
    return "uma mesa pequena, à luz baixa, está quase pronta para vocês.";
  }
  if (so === "shared" || c === "group") {
    return "há uma sala onde já se ouvem copos. portugal está a guardar-vos lugar.";
  }
  if (s === "coast" && e === "slow") {
    return "o mar de arrábida está a desacelerar para te receber.";
  }
  if (s === "wine") {
    return "uma vinha em silêncio, ao fim da tarde — é por aí que se entra.";
  }
  if (s === "heritage") {
    return "uma rua antiga, ainda molhada, está à tua espera mais lá para baixo.";
  }
  if (e === "vivid") {
    return "o porto está vivo, com mãos a trabalhar. portugal está pronto para ti.";
  }
  return "portugal já sabe por onde te levar. basta abrir a próxima porta.";
}

// ─────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────

function SceneVideo({ src }: { src: string }) {
  return (
    <video
      key={src}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-[2200ms]"
      style={{ filter: "saturate(0.92) contrast(1.02)" }}
    />
  );
}

function Vignette({ stronger = false }: { stronger?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        background: stronger
          ? "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.50) 92%), linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.62) 100%)"
          : "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.36) 96%), linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.50) 100%)",
      }}
    />
  );
}

function Whisper({
  text,
  delay = 600,
  hold = 3600,
}: {
  text: string;
  delay?: number;
  hold?: number;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setShown(true), delay);
    const t2 = window.setTimeout(() => setShown(false), delay + hold);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [delay, hold]);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-[14%] z-30 flex justify-center px-8 pointer-events-none"
    >
      <p
        className="italic text-[color:var(--ivory)] max-w-[24ch] text-center transition-all duration-[1600ms] ease-out"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "16px",
          lineHeight: 1.5,
          letterSpacing: "0.005em",
          textShadow: "0 1px 22px rgba(0,0,0,0.74)",
          opacity: shown ? 0.78 : 0,
          transform: shown ? "translateY(0)" : "translateY(-6px)",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div
      aria-hidden="true"
      className="absolute top-4 right-4 z-40 flex gap-1.5"
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="block h-px transition-all duration-700"
          style={{
            width: i === index ? "18px" : "10px",
            background:
              i <= index
                ? "color-mix(in oklab, var(--ivory) 70%, transparent)"
                : "color-mix(in oklab, var(--ivory) 18%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Ambient audio — drone whose timbre is shaped by motif gravity
// ─────────────────────────────────────────────────────────────────────────

function AmbientAudio({ gravity }: { gravity: Map<Motif, number> }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    ctxRef.current = ctx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.7;
    filterRef.current = filter;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3.2);

    let raf = 0;
    const tick = () => {
      const f = filterRef.current;
      const c = ctxRef.current;
      if (f && c) {
        let warm = 0;
        let cool = 0;
        for (const [m, w] of gravity) {
          if (m === "amber" || m === "candle" || m === "fado" || m === "vine" || m === "bread") warm += w;
          else cool += w;
        }
        const target = Math.max(220, 380 + warm * 55 - cool * 38);
        f.frequency.setTargetAtTime(target, c.currentTime, 1.8);
      }
      raf = window.setTimeout(tick, 900) as unknown as number;
    };
    tick();

    return () => {
      window.clearTimeout(raf);
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
        window.setTimeout(() => {
          noise.stop();
          void ctx.close();
        }, 1200);
      } catch {
        // ignore
      }
    };
  }, [gravity]);

  return null;
}
