import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — emotional seduction engine prototype.
 *
 * Reads aesthetic taste, not categories.
 *
 * The world transforms continuously around the traveller. Tempo (slow
 * lingering vs fast tapping) and silent taste accumulation reshape scene
 * affinity, light, sound and pacing. The drift converges — around 34s —
 * on a single taste signature: a world that matches the traveller's
 * aesthetic instincts, named in a place.
 *
 * Internal phase names (1/2/3) are NEVER exposed in the UI.
 */

type Register = "horizon" | "stone" | "candle" | "table" | "vineyard" | "harbour";

/** Internal phase — wide → intimate → arrival. Code-only. */
type Phase = 1 | 2 | 3;

/** Aesthetic identities the world might converge on. Felt worlds, not categories. */
type Signature =
  | "storm-atlantic-lunch"
  | "monastery-silence"
  | "candlelit-stone"
  | "tiled-courtyard-rain"
  | "fisherman-dawn"
  | "vineyard-shadow"
  | "linen-and-salt";

/** Fine-grained sensory axes — silently profile the traveller's taste. */
type Taste =
  | "salt-on-linen"
  | "lime-on-stone"
  | "cool-tile"
  | "weathered-wood"
  | "cork-and-clay"
  | "storm-light"
  | "low-gold-light"
  | "candle-warmth"
  | "monastery-silver"
  | "long-lunch"
  | "table-late"
  | "wine-sun-down"
  | "bread-and-pause"
  | "fisherman-dawn"
  | "old-world"
  | "quiet-refined"
  | "raw-honest"
  | "artisan";

/**
 * HumanTag — second hidden metadata layer. Observed human moments, not
 * adjectives. These bias scene sequencing, ambient tint and convergence
 * language so the world feels inhabited, not curated.
 */
type HumanTag =
  | "old-men-playing-cards"
  | "window-laughter"
  | "late-lunch-energy"
  | "kitchen-noise"
  | "market-chaos"
  | "slow-waiter"
  | "rain-on-stone"
  | "fisherman-fatigue"
  | "sunburnt-tablecloth"
  | "half-empty-wine-bottle"
  | "cat-on-doorstep"
  | "distant-fado-radio"
  | "basil-on-windowsill"
  | "paper-napkin-wind"
  | "scratched-wine-glass"
  | "purple-wine-stain"
  | "table-late";

type DriftScene = {
  id: string;
  videoUrl: string;
  register: Register;
  phases: Phase[];
  /**
   * Observational fragments (wide) — observed human moments, not poetry.
   * Specific objects, gestures, sounds. Never adjectives about "beauty".
   */
  observe: string[];
  /**
   * Personal fragments (intimate) — quiet "tu", still anchored in a
   * concrete human detail (a glass, a chair, a window left open).
   */
  intimate: string[];
  tempo: "slow" | "fast" | "any";
  place: string;
  /** Primary taste signature this scene pulls toward. */
  signature: Signature;
  /** Supporting taste tags — accumulate silently as the world senses. */
  tastes: Taste[];
  /** Human-presence tags — what's actually happening, not how it looks. */
  human: HumanTag[];
};

const SCENES: DriftScene[] = [
  {
    id: "arrabida-coast",
    videoUrl: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    register: "horizon",
    phases: [1, 2],
    observe: [
      "guardanapos de papel a levantar com o vento",
      "uma garrafa de vinho branco a meio, suada do gelo",
    ],
    intimate: [
      "ninguém pediu a conta — ainda",
      "fica. o empregado já não está com pressa",
    ],
    tempo: "slow",
    place: "Arrábida",
    signature: "storm-atlantic-lunch",
    tastes: ["salt-on-linen", "storm-light", "long-lunch", "quiet-refined"],
    human: ["paper-napkin-wind", "half-empty-wine-bottle", "late-lunch-energy", "slow-waiter"],
  },
  {
    id: "cabo-roca",
    videoUrl: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    register: "horizon",
    phases: [1],
    observe: [
      "um casal calado há vinte minutos, a olhar a mesma linha de mar",
      "o vento bate nos casacos e mais nada se ouve",
    ],
    intimate: [
      "respira. aqui ninguém te vai interromper",
      "esta pedra já viu pessoas como tu sentarem-se exactamente aqui",
    ],
    tempo: "slow",
    place: "Cabo da Roca",
    signature: "monastery-silence",
    tastes: ["monastery-silver", "storm-light", "old-world", "quiet-refined"],
    human: ["fisherman-fatigue", "rain-on-stone"],
  },
  {
    id: "hidden-street",
    videoUrl: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    register: "stone",
    phases: [1, 2],
    observe: [
      "alguém a regar manjericão enquanto risos escapam de uma janela aberta",
      "um gato a dormir num degrau morno depois da chuva",
    ],
    intimate: [
      "esta rua não está em mapa nenhum — e ainda bem",
      "alguém deixou esta porta entreaberta. entra, ou não",
    ],
    tempo: "any",
    place: "Setúbal velha",
    signature: "tiled-courtyard-rain",
    tastes: ["cool-tile", "lime-on-stone", "old-world", "artisan"],
    human: ["basil-on-windowsill", "window-laughter", "cat-on-doorstep", "rain-on-stone"],
  },
  {
    id: "viewpoint",
    videoUrl: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    register: "vineyard",
    phases: [2],
    observe: [
      "uma nódoa roxa de vinho num lenço de mesa branco",
      "fado baixinho num rádio velho, do outro lado da vinha",
    ],
    intimate: [
      "fica para a última luz — ainda há vinho no copo",
      "este lado da serra fica melhor sem pressa",
    ],
    tempo: "slow",
    place: "Serra da Arrábida",
    signature: "vineyard-shadow",
    tastes: ["low-gold-light", "wine-sun-down", "quiet-refined", "weathered-wood"],
    human: ["purple-wine-stain", "sunburnt-tablecloth", "distant-fado-radio", "late-lunch-energy"],
  },
  {
    id: "candle-table",
    videoUrl: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    register: "table",
    phases: [2, 3],
    observe: [
      "copos de vinho riscados de tantas mãos antigas",
      "barulho de cozinha, dois homens a discutir futebol em voz alta",
    ],
    intimate: [
      "a mesa já tinha o teu lugar antes de tu saberes",
      "fica até a vela ficar curta — não vão fechar por ti",
    ],
    tempo: "slow",
    place: "Azeitão",
    signature: "candlelit-stone",
    tastes: ["candle-warmth", "weathered-wood", "bread-and-pause", "old-world"],
    human: ["scratched-wine-glass", "kitchen-noise", "old-men-playing-cards", "late-lunch-energy"],
  },
  {
    id: "celebration",
    videoUrl: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    register: "candle",
    phases: [2, 3],
    observe: [
      "uma garrafa a meio na mesa do lado, e um lugar vazio à tua espera",
      "vozes próximas, vela quase no fim, ninguém a olhar para o relógio",
    ],
    intimate: [
      "foste convidado para esta mesa — não foi engano",
      "fica até a última vela apagar. ninguém vai notar a hora",
    ],
    tempo: "any",
    place: "uma taberna a sul",
    signature: "candlelit-stone",
    tastes: ["candle-warmth", "cork-and-clay", "table-late", "raw-honest"],
    human: ["half-empty-wine-bottle", "window-laughter", "distant-fado-radio", "table-late"],
  },
  {
    id: "sesimbra",
    videoUrl: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    register: "harbour",
    phases: [1, 2, 3],
    observe: [
      "pescadores a beber café preto sem dizer nada, redes ainda molhadas",
      "uma praça de mercado a acordar — caixotes, gritos, peixe no gelo",
    ],
    intimate: [
      "fica para o primeiro barco voltar — vais querer ver",
      "este porto não pergunta de onde vens",
    ],
    tempo: "fast",
    place: "Sesimbra",
    signature: "fisherman-dawn",
    tastes: ["raw-honest", "salt-on-linen", "fisherman-dawn", "artisan"],
    human: ["fisherman-fatigue", "market-chaos", "kitchen-noise"],
  },
];

/**
 * Signature → arrival couplet. Inevitable, simple, slightly dangerous.
 * Never epic. Never "your soul". One observed detail + one place sentence.
 */
const SIGNATURE_LINES: Record<Signature, { taste: string; place: (p: string) => string }> = {
  "storm-atlantic-lunch": {
    taste: "Almoços que duram demais. Guardanapos a voar. Ninguém com pressa.",
    place: (p) => `É em ${p} que tu não vais pedir a conta.`,
  },
  "monastery-silence": {
    taste: "Vento, pedra, e horas que ninguém te cobra.",
    place: (p) => `É em ${p} que tu paras de falar.`,
  },
  "candlelit-stone": {
    taste: "Vela curta, copo riscado, vozes que se demoram na mesa do lado.",
    place: (p) => `É em ${p} que a noite te apanha.`,
  },
  "tiled-courtyard-rain": {
    taste: "Manjericão na janela, risos cá fora, uma porta entreaberta.",
    place: (p) => `É em ${p} que tu te perdes — de propósito.`,
  },
  "fisherman-dawn": {
    taste: "Café preto às seis, redes molhadas, ninguém te pergunta nada.",
    place: (p) => `É em ${p} que o dia começa antes de ti.`,
  },
  "vineyard-shadow": {
    taste: "Uma nódoa de vinho num lenço branco — o almoço durou demais.",
    place: (p) => `É na ${p} que tu ficas até a luz baixar.`,
  },
  "linen-and-salt": {
    taste: "Linho, sal, uma mesa pequena onde já ninguém te interrompe.",
    place: (p) => `É à beira de ${p} que tu te demoras.`,
  },
};

interface Props {
  onExit?: () => void;
}

/** Timeline — first convergence lands at ≈34s. Phase names never exposed. */
const PHASE_I_MS = 10000;
const PHASE_II_MS = 16000;
const PHASE_III_HOLD_MS = 8000;
const ARRIVAL_DURATION_MS = 14000;

const LEAN_MS_BY_PHASE: Record<Phase, number> = { 1: 3200, 2: 2400, 3: 1800 };
const PASSIVE_MS_BY_PHASE: Record<Phase, number> = { 1: 6500, 2: 5200, 3: 4600 };
const TEMPO_WINDOW_MS = 1400;

type LeanRecord = {
  scene: DriftScene;
  dwellMs: number;
  phase: Phase;
};

export function StudioDrift({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>(1);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [fragment, setFragment] = useState<string | null>(null);
  const [leans, setLeans] = useState<LeanRecord[]>([]);
  const [tempo, setTempo] = useState<"slow" | "fast" | "neutral">("neutral");
  const [arriving, setArriving] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const enterAtRef = useRef<number>(Date.now());
  const lingeringRef = useRef(false);
  const lastTapAtRef = useRef<number>(0);
  const tapBurstRef = useRef<number>(0);
  const passiveTimerRef = useRef<number | null>(null);
  const leanTimerRef = useRef<number | null>(null);

  const scene = SCENES[sceneIdx % SCENES.length];

  /** Live taste profile — what the world has sensed so far. */
  const tasteProfile = useMemo(() => {
    const map = new Map<Taste, number>();
    for (const l of leans) {
      const weight = l.phase === 3 ? 2.4 : l.phase === 2 ? 1.6 : 1;
      for (const t of l.scene.tastes) {
        map.set(t, (map.get(t) ?? 0) + weight);
      }
    }
    return map;
  }, [leans]);

  const clearSceneTimers = useCallback(() => {
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
    if (leanTimerRef.current) window.clearTimeout(leanTimerRef.current);
    passiveTimerRef.current = null;
    leanTimerRef.current = null;
  }, []);

  /** Pick next scene — biased by phase, tempo AND taste affinity. */
  const chooseNext = useCallback(
    (currentRegister: Register, forPhase: Phase) => {
      const candidates = SCENES.filter((s) => s.phases.includes(forPhase) && s.register !== currentRegister);
      const pool = candidates.length > 0 ? candidates : SCENES.filter((s) => s.register !== currentRegister);
      const scored = pool.map((s) => {
        let score = 1;
        if (tempo === "slow" && s.tempo === "slow") score += 1.6;
        if (tempo === "fast" && s.tempo === "fast") score += 1.6;
        if (tempo === "slow" && s.tempo === "fast") score -= 1.0;
        // Taste affinity — the world drifts toward what's resonated.
        const tasteAffinity = s.tastes.reduce((acc, t) => acc + (tasteProfile.get(t) ?? 0), 0);
        score += tasteAffinity * 0.6;
        // Late phase narrows to intimate registers.
        if (forPhase === 3 && (s.register === "table" || s.register === "candle" || s.register === "harbour")) {
          score += 1.2;
        }
        return { scene: s, score };
      });
      const total = scored.reduce((acc, x) => acc + Math.max(0.1, x.score), 0);
      let r = Math.random() * total;
      for (const x of scored) {
        r -= Math.max(0.1, x.score);
        if (r <= 0) return SCENES.indexOf(x.scene);
      }
      return SCENES.indexOf(scored[0].scene);
    },
    [tempo, tasteProfile],
  );

  const advance = useCallback(
    (forPhase: Phase = phase) => {
      setSceneIdx((idx) => chooseNext(SCENES[idx].register, forPhase));
    },
    [chooseNext, phase],
  );

  // Phase timeline — drift always progresses. Names never surfaced.
  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setPhase(2);
      advance(2);
    }, PHASE_I_MS);
    const t2 = window.setTimeout(() => {
      setPhase(3);
      advance(3);
    }, PHASE_I_MS + PHASE_II_MS);
    const t3 = window.setTimeout(() => {
      setArriving(true);
    }, PHASE_I_MS + PHASE_II_MS + PHASE_III_HOLD_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-scene cycle.
  useEffect(() => {
    if (arriving) return;
    enterAtRef.current = Date.now();
    lingeringRef.current = false;
    setFragment(null);
    clearSceneTimers();

    const holdMs =
      tempo === "slow"
        ? PASSIVE_MS_BY_PHASE[phase] + 1400
        : tempo === "fast"
          ? PASSIVE_MS_BY_PHASE[phase] - 1200
          : PASSIVE_MS_BY_PHASE[phase];

    passiveTimerRef.current = window.setTimeout(() => {
      if (!lingeringRef.current) advance(phase);
    }, holdMs);

    leanTimerRef.current = window.setTimeout(() => {
      if (lingeringRef.current) {
        const dwellMs = Date.now() - enterAtRef.current;
        setLeans((prev) => [...prev, { scene, dwellMs, phase }]);
        const pool = phase === 1 ? scene.observe : scene.intimate;
        setFragment(pool[Math.floor(Math.random() * pool.length)]);
      }
    }, LEAN_MS_BY_PHASE[phase]);

    return clearSceneTimers;
  }, [sceneIdx, scene, advance, clearSceneTimers, arriving, phase, tempo]);

  const ensureAudio = useCallback(() => {
    if (!audioStarted) setAudioStarted(true);
  }, [audioStarted]);

  const onPressStart = useCallback(() => {
    ensureAudio();
    lingeringRef.current = true;
    const now = Date.now();
    const gap = now - lastTapAtRef.current;
    lastTapAtRef.current = now;
    if (gap < TEMPO_WINDOW_MS) {
      tapBurstRef.current += 1;
      if (tapBurstRef.current >= 2) setTempo("fast");
    } else {
      tapBurstRef.current = 0;
      if (gap > 6000) setTempo("slow");
    }
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
  }, [ensureAudio]);

  const onPressEnd = useCallback(() => {
    lingeringRef.current = false;
  }, []);

  const onSceneTap = useCallback(() => {
    if (fragment !== null) advance(phase);
  }, [fragment, advance, phase]);

  // Atmosphere tint — narrows phase by phase and shifts with tempo + dominant taste light.
  const atmosphereTint = useMemo(() => {
    const teal = "color-mix(in oklab, var(--teal) 18%, transparent)";
    const gold = "color-mix(in oklab, var(--gold) 18%, transparent)";
    const ivory = "color-mix(in oklab, var(--ivory) 9%, transparent)";
    const warm = "color-mix(in oklab, var(--gold-soft, var(--gold)) 22%, transparent)";

    // Late phase = warm intimacy. Light bias also responds to taste profile.
    const stormWeight = tasteProfile.get("storm-light") ?? 0;
    const goldWeight = (tasteProfile.get("low-gold-light") ?? 0) + (tasteProfile.get("candle-warmth") ?? 0);
    const silverWeight = tasteProfile.get("monastery-silver") ?? 0;

    if (phase === 3) {
      return `radial-gradient(ellipse at 50% 75%, ${warm} 0%, transparent 58%)`;
    }
    if (phase === 2) {
      if (goldWeight > stormWeight && goldWeight > silverWeight) {
        return `radial-gradient(ellipse at 50% 78%, ${gold} 0%, transparent 58%)`;
      }
      if (silverWeight > stormWeight) {
        return `radial-gradient(ellipse at 50% 78%, ${ivory} 0%, transparent 60%)`;
      }
      return `radial-gradient(ellipse at 50% 78%, ${teal} 0%, transparent 58%)`;
    }
    return tempo === "slow"
      ? `radial-gradient(ellipse at 50% 80%, ${teal} 0%, transparent 60%)`
      : `radial-gradient(ellipse at 50% 80%, ${ivory} 0%, transparent 50%)`;
  }, [phase, tempo, tasteProfile]);

  if (arriving) {
    return <DriftArrival leans={leans} fallback={scene} onExit={onExit} />;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" style={{ touchAction: "manipulation" }}>
      <SceneVideo key={scene.id} src={scene.videoUrl} />

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-[background] duration-[2200ms] ease-out"
        style={{ background: atmosphereTint, mixBlendMode: "soft-light" }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-opacity duration-[2200ms]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.34) 95%), linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.50) 100%)",
          opacity: phase === 3 ? 1 : phase === 2 ? 0.85 : 0.7,
        }}
      />

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

      {fragment !== null && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[14] pointer-events-none animate-in fade-in duration-[1600ms]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 58%, color-mix(in oklab, var(--gold) 26%, transparent) 0%, transparent 55%)",
            mixBlendMode: "soft-light",
          }}
        />
      )}

      {fragment !== null && (
        <div className="absolute inset-x-0 bottom-[16%] z-20 flex flex-col items-center px-8 text-center pointer-events-none animate-in fade-in duration-[1400ms]">
          <span aria-hidden="true" className="mb-4 block h-px w-6 bg-[color:var(--gold)]/70" />
          <p
            className="italic text-[19px] sm:text-[22px] leading-[1.45] text-[color:var(--ivory)] max-w-[26ch]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 22px rgba(0,0,0,0.7)",
            }}
          >
            {fragment}
          </p>
        </div>
      )}

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

      {audioStarted && <AmbientAudio tempo={tempo} phase={phase} />}
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
      className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-[1600ms]"
      style={{ filter: "saturate(0.93) contrast(1.02)" }}
    />
  );
}

function AmbientAudio({ tempo, phase }: { tempo: "slow" | "fast" | "neutral"; phase: Phase }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const subGainRef = useRef<GainNode | null>(null);

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
    filter.frequency.value = 440;
    filter.Q.value = 0.7;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start();
    noiseGain.gain.linearRampToValueAtTime(0.075, ctx.currentTime + 2.5);

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 58;
    const subGain = ctx.createGain();
    subGain.gain.value = 0;
    sub.connect(subGain).connect(ctx.destination);
    sub.start();

    filterRef.current = filter;
    subGainRef.current = subGain;

    return () => {
      try {
        noiseGain.gain.cancelScheduledValues(ctx.currentTime);
        subGain.gain.cancelScheduledValues(ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
        subGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
        window.setTimeout(() => {
          noise.stop();
          sub.stop();
          void ctx.close();
        }, 1000);
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    const f = filterRef.current;
    if (!ctx || !f) return;
    const tempoBias = tempo === "slow" ? -90 : tempo === "fast" ? 280 : 0;
    const phaseBias = phase === 3 ? 140 : phase === 2 ? 70 : 0;
    const target = Math.max(220, 480 + tempoBias + phaseBias);
    f.frequency.cancelScheduledValues(ctx.currentTime);
    f.frequency.linearRampToValueAtTime(target, ctx.currentTime + 2.2);
  }, [tempo, phase]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const sub = subGainRef.current;
    if (!ctx || !sub) return;
    const target = phase === 3 ? 0.038 : 0;
    sub.gain.cancelScheduledValues(ctx.currentTime);
    sub.gain.linearRampToValueAtTime(target, ctx.currentTime + 3);
  }, [phase]);

  return null;
}

/**
 * DriftArrival — convergence beat.
 *
 * Aggregates the traveller's silent taste profile (weighted by phase) into
 * a single dominant signature. The world holds on the scene that best
 * embodies that signature, and lands a two-line acknowledgement:
 *   · a taste-identity line — the aesthetic the world sensed
 *   · a place line of inevitability — "É em X que tu paras."
 *
 * Not a CTA. Not a proposal card. A destiny acknowledged.
 */
function DriftArrival({
  leans,
  fallback,
  onExit,
}: {
  leans: LeanRecord[];
  fallback: DriftScene;
  onExit?: () => void;
}) {
  const { signature, sceneForBackdrop } = useMemo(() => {
    if (leans.length === 0) {
      return { signature: fallback.signature, sceneForBackdrop: fallback };
    }
    // Weight each scene by phase, then sum into both signature and taste tallies.
    const sigScore = new Map<Signature, number>();
    const sceneScore = new Map<string, { score: number; scene: DriftScene }>();
    for (const l of leans) {
      const w = l.phase === 3 ? 2.6 : l.phase === 2 ? 1.7 : 1;
      const contribution = l.dwellMs * w;
      sigScore.set(l.scene.signature, (sigScore.get(l.scene.signature) ?? 0) + contribution);
      const prev = sceneScore.get(l.scene.id);
      sceneScore.set(l.scene.id, { score: (prev?.score ?? 0) + contribution, scene: l.scene });
    }
    const dominantSig = [...sigScore.entries()].sort((a, b) => b[1] - a[1])[0][0];
    // Backdrop = the scene with the strongest pull that matches the dominant signature
    // (so the taste line and the image agree).
    const matching = [...sceneScore.values()].filter((x) => x.scene.signature === dominantSig);
    const backdrop =
      matching.sort((a, b) => b.score - a.score)[0]?.scene ??
      SCENES.find((s) => s.signature === dominantSig) ??
      fallback;
    return { signature: dominantSig, sceneForBackdrop: backdrop };
  }, [leans, fallback]);

  const couplet = SIGNATURE_LINES[signature];

  const [showTaste, setShowTaste] = useState(false);
  const [showPlace, setShowPlace] = useState(false);
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShowTaste(true), 1200);
    const t2 = window.setTimeout(() => setShowPlace(true), 4400);
    const t3 = window.setTimeout(() => setShowExit(true), ARRIVAL_DURATION_MS - 3800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <SceneVideo src={sceneForBackdrop.videoUrl} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 70%, color-mix(in oklab, var(--gold) 14%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.48) 55%, rgba(0,0,0,0.74) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <span aria-hidden="true" className="mb-7 block h-px w-10 bg-[color:var(--gold)]/85" />

        {showTaste && (
          <p
            className="italic text-[19px] sm:text-[24px] leading-[1.45] text-[color:var(--ivory)] max-w-[28ch] animate-in fade-in slide-in-from-bottom-2 duration-[1800ms]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 22px rgba(0,0,0,0.65)",
            }}
          >
            {couplet.taste}
          </p>
        )}

        {showPlace && (
          <p
            className="mt-7 text-[20px] sm:text-[26px] font-semibold leading-[1.2] tracking-[-0.01em] text-[color:var(--ivory)] max-w-[24ch] animate-in fade-in slide-in-from-bottom-1 duration-[1600ms]"
            style={{
              fontFamily: "Montserrat, system-ui, sans-serif",
              textShadow: "0 1px 22px rgba(0,0,0,0.6)",
            }}
          >
            {couplet.place(sceneForBackdrop.place)}
          </p>
        )}

        {showExit && onExit && (
          <button
            type="button"
            onClick={onExit}
            className="mt-12 text-[12px] tracking-[0.14em] uppercase text-[color:var(--ivory)]/80 hover:text-[color:var(--ivory)] border-b border-[color:var(--gold)]/70 hover:border-[color:var(--gold)] pb-1 transition-colors duration-500 animate-in fade-in duration-[2000ms]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            quero ir
          </button>
        )}
      </div>
    </div>
  );
}
