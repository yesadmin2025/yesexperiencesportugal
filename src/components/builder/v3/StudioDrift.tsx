import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — a living travel world.
 *
 * Not a quiz, not a recommendation engine, not a slideshow, not an AI
 * poetry generator. The world exists whether the visitor moves or not.
 * Scenes appear like accidental fragments of real places. Nothing is
 * announced. Nothing is explained. The visitor is never asked anything.
 *
 * System priorities, in order:
 *   1. silence       — the default state is quiet, long, unhurried
 *   2. implication   — meaning leaks through texture, never captions
 *   3. texture       — physical traces (salt, wax, stone, bread)
 *   4. memory        — what held the eye softly returns later
 *   5. rhythm        — breath between fragments, not pacing
 *   6. human detail  — overheard, half-seen, never narrated
 *
 * The visitor is never evaluated, categorised, guided, or asked.
 */

// ─────────────────────────────────────────────────────────────────────────
// Sensory atoms
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

type Scene = {
  id: string;
  video: string;
  motifs: Motif[];
  /** Observed traces. Rarely surfaced. Never used as captions. */
  traces: string[];
};

const SCENES: Scene[] = [
  {
    id: "arrabida-coast",
    video: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    motifs: ["salt", "linen", "vine"],
    traces: [
      "sal seco no canto da boca",
      "uma toalha de linho a levantar",
      "o copo já morno",
      "ninguém com pressa de sair da mesa",
    ],
  },
  {
    id: "cabo-roca",
    video: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    motifs: ["salt", "stone"],
    traces: [
      "pedra rachada debaixo da mão",
      "um casaco emprestado",
      "vento que entra pela manga",
      "dois copos pousados no muro",
    ],
  },
  {
    id: "hidden-street",
    video: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    motifs: ["rain", "stone", "basil"],
    traces: [
      "azulejo molhado",
      "manjerico de uma janela aberta",
      "tachos lá em cima",
      "passos a colar à calçada",
    ],
  },
  {
    id: "viewpoint",
    video: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    motifs: ["vine", "fado", "amber"],
    traces: [
      "pó da vinha nos sapatos",
      "uma nódoa roxa no lenço",
      "fado vindo da cozinha ao lado",
      "madeira velha a ranger",
    ],
  },
  {
    id: "candle-table",
    video: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    motifs: ["candle", "amber", "bread"],
    traces: [
      "cera a descer pelo castiçal",
      "miolo de pão quente",
      "chávena de barro a aquecer os dedos",
      "uma cadeira puxada para trás",
    ],
  },
  {
    id: "celebration",
    video: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    motifs: ["candle", "amber", "fado", "linen"],
    traces: [
      "vidro a tocar vidro devagar",
      "batom no rebordo do copo",
      "risos de outra sala",
      "um guardanapo dobrado mal",
    ],
  },
  {
    id: "sesimbra",
    video: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    motifs: ["harbour", "salt", "rain"],
    traces: [
      "gasóleo e maresia no mesmo ar",
      "mãos a embrulhar peixe em papel",
      "vento do ferry na camisa",
      "um chapéu de chuva a escorrer",
    ],
  },
];

// Motif → ambient afterimage. Soft, never the foreground.
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
// Rhythm
// ─────────────────────────────────────────────────────────────────────────

/** Long. The world is not in a hurry. */
const SCENE_MIN_MS = 11000;
const SCENE_MAX_MS = 16000;
/** Just looking at one scene reinforces its motifs gently. */
const SOFT_REINFORCE_AFTER_MS = 4200;
/** A held gaze tightens the gravity. */
const LINGER_TIGHTEN_MS = 1400;
/** Memory decays slowly enough to leave an afterimage across scenes. */
const MEMORY_DECAY_PER_MS = 0.00003;
const MEMORY_MAX = 6;
/** Traces are rare. Most scenes pass in silence. */
const TRACE_APPEARANCE_PROBABILITY = 0.35;

interface Props {
  onExit?: () => void;
}

export function StudioDrift({ onExit }: Props) {
  const [sceneIdx, setSceneIdx] = useState(() => Math.floor(Math.random() * SCENES.length));
  const [trace, setTrace] = useState<string | null>(null);
  const [traceAt, setTraceAt] = useState(0);
  const [audioOn, setAudioOn] = useState(false);

  const gravityRef = useRef<Map<Motif, number>>(new Map());
  const [, setTick] = useState(0);

  const pressedAtRef = useRef<number | null>(null);
  const lingeringRef = useRef(false);
  const passiveTimerRef = useRef<number | null>(null);
  const lingerTimerRef = useRef<number | null>(null);
  const softReinforceTimerRef = useRef<number | null>(null);
  const traceTimerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  const scene = SCENES[sceneIdx];

  const decayGravity = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastTickRef.current;
    lastTickRef.current = now;
    const g = gravityRef.current;
    for (const [k, v] of g) {
      const next = v - elapsed * MEMORY_DECAY_PER_MS;
      if (next <= 0.02) g.delete(k);
      else g.set(k, next);
    }
  }, []);

  const reinforce = useCallback((motifs: Motif[], amount: number) => {
    decayGravity();
    const g = gravityRef.current;
    for (const m of motifs) {
      g.set(m, Math.min(MEMORY_MAX, (g.get(m) ?? 0) + amount));
    }
    setTick((t) => t + 1);
  }, [decayGravity]);

  /**
   * Pick by attraction. Never the same scene twice. A small share of pure
   * wandering keeps the world from feeling steered.
   */
  const pickNext = useCallback(() => {
    decayGravity();
    const g = gravityRef.current;
    const pool = SCENES.filter((s) => s.id !== scene.id);
    if (Math.random() < 0.18) {
      return SCENES.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    }
    const scored = pool.map((s) => {
      const affinity = s.motifs.reduce((acc, m) => acc + (g.get(m) ?? 0), 0);
      return { s, w: 1 + affinity * 1.3 };
    });
    const total = scored.reduce((acc, x) => acc + x.w, 0);
    let r = Math.random() * total;
    for (const x of scored) {
      r -= x.w;
      if (r <= 0) return SCENES.indexOf(x.s);
    }
    return SCENES.indexOf(scored[0].s);
  }, [scene.id, decayGravity]);

  const pickMemoryTrace = useCallback((): string | null => {
    const g = gravityRef.current;
    if (g.size === 0) return null;
    const others = SCENES.filter((s) => s.id !== scene.id);
    const scored = others
      .map((s) => ({ s, w: s.motifs.reduce((a, m) => a + (g.get(m) ?? 0), 0) }))
      .filter((x) => x.w > 0.5);
    if (scored.length === 0) return null;
    const total = scored.reduce((a, x) => a + x.w, 0);
    let r = Math.random() * total;
    for (const x of scored) {
      r -= x.w;
      if (r <= 0) return x.s.traces[Math.floor(Math.random() * x.s.traces.length)];
    }
    return null;
  }, [scene.id]);

  const clearTimers = useCallback(() => {
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
    if (lingerTimerRef.current) window.clearTimeout(lingerTimerRef.current);
    if (softReinforceTimerRef.current) window.clearTimeout(softReinforceTimerRef.current);
    if (traceTimerRef.current) window.clearTimeout(traceTimerRef.current);
    passiveTimerRef.current = null;
    lingerTimerRef.current = null;
    softReinforceTimerRef.current = null;
    traceTimerRef.current = null;
  }, []);

  // Per-scene rhythm. The world breathes. It does not progress.
  useEffect(() => {
    lingeringRef.current = false;
    pressedAtRef.current = null;
    setTrace(null);

    // Just being there reinforces motifs softly — looking is also choosing,
    // but invisibly, without asking.
    softReinforceTimerRef.current = window.setTimeout(() => {
      reinforce(scene.motifs, 0.35);
    }, SOFT_REINFORCE_AFTER_MS);

    // Hold time slows the more the world already knows you.
    const memoryWeight = [...gravityRef.current.values()].reduce((a, b) => a + b, 0);
    const slow = Math.min(4000, memoryWeight * 320);
    const base = SCENE_MIN_MS + Math.random() * (SCENE_MAX_MS - SCENE_MIN_MS);
    const holdMs = base + slow;

    passiveTimerRef.current = window.setTimeout(() => {
      if (!lingeringRef.current) setSceneIdx(pickNext());
    }, holdMs);

    // Most scenes pass without a single word. When a trace surfaces, it is
    // often a memory of an earlier scene, not a label for this one.
    if (Math.random() < TRACE_APPEARANCE_PROBABILITY) {
      const traceDelay = 3600 + Math.random() * 4200;
      traceTimerRef.current = window.setTimeout(() => {
        const fromMemory = pickMemoryTrace();
        const line =
          fromMemory ?? scene.traces[Math.floor(Math.random() * scene.traces.length)];
        setTrace(line);
        setTraceAt(Date.now());
      }, traceDelay);
    }

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIdx]);

  // Invisible interaction. The visitor never sees a button, never taps,
  // never swipes. If they happen to hold, the world quietly notices.
  const onPressStart = useCallback(() => {
    if (!audioOn) setAudioOn(true);
    pressedAtRef.current = Date.now();
    lingeringRef.current = true;
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);

    lingerTimerRef.current = window.setTimeout(() => {
      reinforce(scene.motifs, 1.1);
    }, LINGER_TIGHTEN_MS);
  }, [audioOn, reinforce, scene.motifs]);

  const onPressEnd = useCallback(() => {
    const held = pressedAtRef.current ? Date.now() - pressedAtRef.current : 0;
    pressedAtRef.current = null;
    lingeringRef.current = false;
    if (lingerTimerRef.current) window.clearTimeout(lingerTimerRef.current);

    if (held > 300 && held < LINGER_TIGHTEN_MS) {
      reinforce(scene.motifs, 0.35);
    }

    passiveTimerRef.current = window.setTimeout(() => {
      setSceneIdx(pickNext());
    }, held > LINGER_TIGHTEN_MS ? 2600 : 4200);
  }, [reinforce, scene.motifs, pickNext]);

  const memoryTints = useMemo(() => {
    const g = gravityRef.current;
    const sorted = [...g.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 2).map(([motif, weight]) => ({
      bg: MOTIF_TINT[motif],
      opacity: Math.min(0.78, 0.22 + weight * 0.16),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id, trace]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      style={{ touchAction: "manipulation" }}
    >
      <SceneVideo key={scene.id} src={scene.video} />

      {memoryTints.map((t, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-[3200ms] ease-out"
          style={{ background: t.bg, opacity: t.opacity, mixBlendMode: "soft-light" }}
        />
      ))}

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.36) 96%), linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.50) 100%)",
        }}
      />

      <button
        type="button"
        aria-label=" "
        className="absolute inset-0 z-10 cursor-default outline-none"
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onTouchCancel={onPressEnd}
      />

      {trace && <Trace key={traceAt} text={trace} />}

      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label="sair"
          className="absolute top-4 left-4 z-30 h-6 w-6 rounded-full bg-[color:var(--ivory)]/10 hover:bg-[color:var(--ivory)]/25 transition-colors"
        />
      )}

      {audioOn && <AmbientAudio gravity={gravityRef.current} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pieces
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
      className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-[2400ms]"
      style={{ filter: "saturate(0.92) contrast(1.02)" }}
    />
  );
}

/**
 * Trace — half-seen observation. Lowercase, no punctuation, brief.
 * Never a caption of the current scene; often a memory.
 */
function Trace({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setShown(true), 80);
    const t2 = window.setTimeout(() => setShown(false), 4600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-[24%] z-20 flex justify-center px-8 pointer-events-none"
    >
      <p
        className="italic text-[15px] sm:text-[18px] leading-[1.55] text-[color:var(--ivory)] max-w-[22ch] text-center transition-all duration-[1800ms] ease-out"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          textShadow: "0 1px 22px rgba(0,0,0,0.72)",
          opacity: shown ? 0.82 : 0,
          transform: shown ? "translateY(0)" : "translateY(8px)",
          letterSpacing: "0.005em",
        }}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * AmbientAudio — drone whose timbre is shaped by gravity, not by phase.
 */
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
    gain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 3.4);

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
