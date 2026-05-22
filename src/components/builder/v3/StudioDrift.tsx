import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — environmental emotional drift prototype.
 *
 * NOT a configurator. NOT an onboarding flow. NOT a wizard.
 *
 * A 60–90s living cinematic Portugal that senses the traveller through
 * interaction rhythm alone:
 *   · slow lingering   → quieter pacing, longer holds, coastal/contemplative
 *   · fast tapping     → spontaneous register, brisk movement, market warmth
 *   · returning twice  → intimacy deepens (stone, candle, table)
 *
 * No questions, no chips, no forms. The world reacts. Atmosphere narrows.
 * The traveller leaves feeling Portugal sensed them — not the other way
 * around.
 *
 * End state is NOT a proposal. It is a held breath: a single line that
 * acknowledges what was felt, and a quiet way out.
 */

type Register = "atlantic" | "tiled" | "vineyard" | "table" | "wind" | "warmth";

type DriftScene = {
  id: string;
  videoUrl: string;
  register: Register;
  /** Sensory fragments in Portuguese — surface only when traveller lingers. */
  fragments: string[];
  /** Tempo affinity — which interaction rhythm this scene rewards. */
  tempo: "slow" | "fast" | "any";
};

const SCENES: DriftScene[] = [
  {
    id: "arrabida-coast",
    videoUrl: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    register: "atlantic",
    fragments: ["o vento traz sal", "a água respira devagar"],
    tempo: "slow",
  },
  {
    id: "hidden-street",
    videoUrl: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    register: "tiled",
    fragments: ["azulejos antigos, cal nas paredes", "passos sobre pedra húmida"],
    tempo: "any",
  },
  {
    id: "azeitao-table",
    videoUrl: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    register: "table",
    fragments: ["pão partido devagar", "vinho da casa, copo simples"],
    tempo: "slow",
  },
  {
    id: "cabo-roca",
    videoUrl: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    register: "wind",
    fragments: ["o Atlântico abre-se sem fim", "ninguém fala alto aqui"],
    tempo: "slow",
  },
  {
    id: "arrabida-viewpoint",
    videoUrl: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    register: "vineyard",
    fragments: ["pinheiros, sombra fresca", "luz baixa sobre a baía"],
    tempo: "slow",
  },
  {
    id: "sesimbra-port",
    videoUrl: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    register: "warmth",
    fragments: ["barcos a regressar", "cheiro a sardinha grelhada"],
    tempo: "fast",
  },
];

/** Final reflections — never a proposal. Just an emotional acknowledgement. */
const REGISTER_CLOSING: Record<Register, string> = {
  atlantic: "ouviste o Atlântico, e ele ouviu-te.",
  tiled: "perdeste-te, e isso era o caminho.",
  vineyard: "ficaste para a luz baixa.",
  table: "uma mesa ficou à tua espera.",
  wind: "estiveste no fim do mundo conhecido.",
  warmth: "o porto regressou contigo.",
};

interface Props {
  onExit?: () => void;
}

/** Lean = traveller stays with a scene past this. */
const LEAN_MS = 3600;
/** Passive drift pace — slower than v3 to allow atmosphere to land. */
const PASSIVE_ADVANCE_MS = 8500;
/** Fast-tap window — taps within this window count as "spontaneous tempo". */
const TEMPO_WINDOW_MS = 1400;
/** Prototype ends after roughly this duration (system-decided). */
const PROTOTYPE_DURATION_MS = 78000;

export function StudioDrift({ onExit }: Props) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [fragmentIdx, setFragmentIdx] = useState<number | null>(null);
  const [leans, setLeans] = useState<Array<{ register: Register; dwellMs: number }>>([]);
  const [tempo, setTempo] = useState<"slow" | "fast" | "neutral">("neutral");
  const [closing, setClosing] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const enterAtRef = useRef<number>(Date.now());
  const startAtRef = useRef<number>(Date.now());
  const lingeringRef = useRef(false);
  const lastTapAtRef = useRef<number>(0);
  const tapBurstRef = useRef<number>(0);
  const passiveTimerRef = useRef<number | null>(null);
  const leanTimerRef = useRef<number | null>(null);

  const scene = SCENES[sceneIdx % SCENES.length];

  const clearTimers = useCallback(() => {
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
    if (leanTimerRef.current) window.clearTimeout(leanTimerRef.current);
    passiveTimerRef.current = null;
    leanTimerRef.current = null;
  }, []);

  /** Choose next scene biased by current tempo + recent register affinity. */
  const chooseNext = useCallback(
    (currentRegister: Register) => {
      // Pool of candidates excluding current scene.
      const pool = SCENES.filter((s) => s.register !== currentRegister);
      // Score by tempo affinity.
      const scored = pool.map((s) => {
        let score = 1;
        if (tempo === "slow" && s.tempo === "slow") score += 2;
        if (tempo === "fast" && s.tempo === "fast") score += 2;
        if (tempo === "slow" && s.tempo === "fast") score -= 1;
        // Affinity bonus: scenes matching registers the traveller leaned on.
        const affinity = leans.filter((l) => l.register === s.register).length;
        score += affinity * 0.7;
        return { scene: s, score };
      });
      // Weighted random pick to keep the world unpredictable.
      const total = scored.reduce((acc, x) => acc + Math.max(0.1, x.score), 0);
      let r = Math.random() * total;
      for (const x of scored) {
        r -= Math.max(0.1, x.score);
        if (r <= 0) return SCENES.indexOf(x.scene);
      }
      return SCENES.indexOf(scored[0].scene);
    },
    [tempo, leans],
  );

  const advance = useCallback(() => {
    setSceneIdx((idx) => chooseNext(SCENES[idx].register));
  }, [chooseNext]);

  // Per-scene lifecycle: passive advance + lean capture.
  useEffect(() => {
    if (closing) return;
    enterAtRef.current = Date.now();
    lingeringRef.current = false;
    setFragmentIdx(null);
    clearTimers();

    // Slow tempo → hold scenes longer. Fast tempo → drift quicker.
    const holdMs =
      tempo === "slow" ? PASSIVE_ADVANCE_MS + 2500 : tempo === "fast" ? PASSIVE_ADVANCE_MS - 2200 : PASSIVE_ADVANCE_MS;

    passiveTimerRef.current = window.setTimeout(() => {
      if (!lingeringRef.current) advance();
    }, holdMs);

    leanTimerRef.current = window.setTimeout(() => {
      if (lingeringRef.current) {
        const dwellMs = Date.now() - enterAtRef.current;
        setLeans((prev) => [...prev, { register: scene.register, dwellMs }]);
        setFragmentIdx(Math.floor(Math.random() * scene.fragments.length));
      }
    }, LEAN_MS);

    return clearTimers;
  }, [sceneIdx, scene, advance, clearTimers, closing, tempo]);

  // System-decided closing — the prototype gracefully resolves.
  useEffect(() => {
    if (closing) return;
    const t = window.setTimeout(() => setClosing(true), PROTOTYPE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [closing]);

  /** First interaction starts the ambient audio bed (browsers require gesture). */
  const ensureAudio = useCallback(() => {
    if (audioStarted) return;
    setAudioStarted(true);
  }, [audioStarted]);

  const onPressStart = useCallback(() => {
    ensureAudio();
    lingeringRef.current = true;
    // Track tap tempo — bursts of fast taps shift the world spontaneous.
    const now = Date.now();
    const gap = now - lastTapAtRef.current;
    lastTapAtRef.current = now;
    if (gap < TEMPO_WINDOW_MS) {
      tapBurstRef.current += 1;
      if (tapBurstRef.current >= 2) setTempo("fast");
    } else {
      tapBurstRef.current = 0;
      // Long gap implies contemplative pace.
      if (gap > 6000) setTempo("slow");
    }
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
  }, [ensureAudio]);

  const onPressEnd = useCallback(() => {
    lingeringRef.current = false;
  }, []);

  const onSceneTap = useCallback(() => {
    // Tap on a scene that has already whispered = drift onward.
    if (fragmentIdx !== null) advance();
  }, [fragmentIdx, advance]);

  // Atmosphere tint shifts with tempo — slow = cooler Atlantic mist,
  // fast = warmer paprika edge.
  const atmosphereTint = useMemo(() => {
    if (tempo === "slow") {
      return "radial-gradient(ellipse at 50% 80%, color-mix(in oklab, var(--teal) 18%, transparent) 0%, transparent 60%)";
    }
    if (tempo === "fast") {
      return "radial-gradient(ellipse at 50% 80%, color-mix(in oklab, var(--gold) 16%, transparent) 0%, transparent 55%)";
    }
    return "radial-gradient(ellipse at 50% 80%, color-mix(in oklab, var(--ivory) 8%, transparent) 0%, transparent 50%)";
  }, [tempo]);

  if (closing) {
    return <DriftClosing leans={leans} scene={scene} onExit={onExit} />;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" style={{ touchAction: "manipulation" }}>
      <SceneVideo key={scene.id} src={scene.videoUrl} />

      {/* Tempo-aware atmospheric tint — the world's mood narrows */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-[background] duration-[2200ms] ease-out"
        style={{ background: atmosphereTint, mixBlendMode: "soft-light" }}
      />

      {/* Gentle vignette for legibility — never a chatbot veil */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.48) 100%)",
        }}
      />

      {/* Invisible interaction surface */}
      <button
        type="button"
        aria-label="Stay with this moment"
        className="absolute inset-0 z-10 cursor-default outline-none"
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onTouchCancel={onPressEnd}
        onClick={onSceneTap}
      />

      {/* Lean bloom — a single warm breath when the traveller is sensed */}
      {fragmentIdx !== null && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[14] pointer-events-none animate-in fade-in duration-[1800ms]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 58%, color-mix(in oklab, var(--gold) 24%, transparent) 0%, transparent 55%)",
            mixBlendMode: "soft-light",
          }}
        />
      )}

      {/* Sensory fragment — Portuguese, italic, surfaces only after a lean */}
      {fragmentIdx !== null && (
        <div className="absolute inset-x-0 bottom-[16%] z-20 flex flex-col items-center px-8 text-center pointer-events-none animate-in fade-in duration-[1600ms]">
          <span aria-hidden="true" className="mb-4 block h-px w-6 bg-[color:var(--gold)]/70" />
          <p
            className="italic text-[19px] sm:text-[22px] leading-[1.45] text-[color:var(--ivory)] max-w-[24ch]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 22px rgba(0,0,0,0.7)",
            }}
          >
            {scene.fragments[fragmentIdx]}
          </p>
        </div>
      )}

      {/* Quiet exit — no chrome, no progress bar, no step counter */}
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label="Sair"
          className="absolute top-5 left-5 z-30 text-[12px] tracking-[0.08em] uppercase text-[color:var(--ivory)]/55 hover:text-[color:var(--ivory)]/90 transition-colors"
          style={{ fontFamily: "Inter, system-ui, sans-serif", textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
        >
          sair
        </button>
      )}

      {/* Ambient audio bed — only mounts once gesture has been received */}
      {audioStarted && <AmbientAudio tempo={tempo} />}
    </div>
  );
}

/* ---------------- internal helpers ---------------- */

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
      className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-[1800ms]"
      style={{ filter: "saturate(0.93) contrast(1.02)" }}
    />
  );
}

/**
 * AmbientAudio — a low Atlantic-wind drone synthesised via WebAudio.
 * No external assets needed, no autoplay blocking (mounts after gesture).
 * Tempo shifts the timbre subtly: slow = deeper, fast = brighter.
 */
function AmbientAudio({ tempo }: { tempo: "slow" | "fast" | "neutral" }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    ctxRef.current = ctx;

    // Pink-ish noise via short looping buffer.
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();

    // Fade in over 3s.
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 3);

    filterRef.current = filter;
    gainRef.current = gain;

    return () => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
        window.setTimeout(() => {
          noise.stop();
          void ctx.close();
        }, 1000);
      } catch {
        // ignore
      }
    };
  }, []);

  // React to tempo shifts — slow drops the filter, fast lifts it.
  useEffect(() => {
    const ctx = ctxRef.current;
    const f = filterRef.current;
    if (!ctx || !f) return;
    const target = tempo === "slow" ? 320 : tempo === "fast" ? 720 : 480;
    f.frequency.cancelScheduledValues(ctx.currentTime);
    f.frequency.linearRampToValueAtTime(target, ctx.currentTime + 2.5);
  }, [tempo]);

  return null;
}

/**
 * DriftClosing — NOT a proposal. NOT an itinerary preview.
 * One line acknowledging what the world sensed, then stillness.
 */
function DriftClosing({
  leans,
  scene,
  onExit,
}: {
  leans: Array<{ register: Register; dwellMs: number }>;
  scene: DriftScene;
  onExit?: () => void;
}) {
  const dominant: Register = useMemo(() => {
    if (leans.length === 0) return scene.register;
    const counts = new Map<Register, number>();
    for (const l of leans) counts.set(l.register, (counts.get(l.register) ?? 0) + l.dwellMs);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [leans, scene.register]);

  const backdrop = SCENES.find((s) => s.register === dominant) ?? scene;
  const line = REGISTER_CLOSING[dominant];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <SceneVideo src={backdrop.videoUrl} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <span aria-hidden="true" className="mb-7 block h-px w-10 bg-[color:var(--gold)]/75" />

        <p
          className="italic text-[22px] sm:text-[28px] leading-[1.4] text-[color:var(--ivory)] max-w-[26ch] animate-in fade-in slide-in-from-bottom-2 duration-[1800ms]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 1px 22px rgba(0,0,0,0.6)",
          }}
        >
          {line}
        </p>

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="mt-14 text-[12px] tracking-[0.12em] uppercase text-[color:var(--ivory)]/70 hover:text-[color:var(--ivory)] transition-colors duration-500 animate-in fade-in duration-[2600ms]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            voltar ao silêncio
          </button>
        )}
      </div>
    </div>
  );
}
