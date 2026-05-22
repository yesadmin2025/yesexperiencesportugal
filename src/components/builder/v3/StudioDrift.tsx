import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — emotional seduction engine prototype.
 *
 * NOT a configurator. NOT an ambient art piece. NOT a mood gallery.
 *
 * A 70–90s responsive cinematic story in three acts. Portugal arrives
 * continuously and transforms in response to the traveller's rhythm. The
 * world narrows — wide horizons soften into intimate corners, observation
 * becomes address, and the drift converges on a single named destination
 * that feels like it was waiting for them.
 *
 * Acts:
 *   I  · WIDE       (≈0–22s)   horizons, sea wind, observational fragments
 *   II · INTIMATE   (≈22–55s)  streets, tables, candle-light; fragments
 *                              turn personal; pacing tightens; tension lifts
 *   III · ARRIVAL   (≈55–80s)  the world converges on one place; a single
 *                              line of inevitability — "Foi para X que o
 *                              teu silêncio te levou."
 *
 * The world reads tempo (slow lingering vs fast tapping) to bias scene
 * affinity and tint, but acts always progress — there is no "freely
 * wandering forever". Something forms around them.
 */

type Register = "horizon" | "stone" | "candle" | "table" | "vineyard" | "harbour";

type Act = 1 | 2 | 3;

type DriftScene = {
  id: string;
  videoUrl: string;
  register: Register;
  /** Which act this scene is eligible for. */
  acts: Act[];
  /** Observational fragments (act I) — pure sensory, no "you". */
  observe: string[];
  /** Personal fragments (act II) — quiet address, "tu" form. */
  intimate: string[];
  /** Tempo affinity. */
  tempo: "slow" | "fast" | "any";
  /** Place name used by the final convergence line. */
  place: string;
  /** Convergence line — read at the arrival moment if this scene wins. */
  convergence: string;
};

const SCENES: DriftScene[] = [
  {
    id: "arrabida-coast",
    videoUrl: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    register: "horizon",
    acts: [1, 2],
    observe: ["o vento traz sal", "a água respira devagar"],
    intimate: ["fica mais um pouco", "ninguém te chama de volta"],
    tempo: "slow",
    place: "Arrábida",
    convergence: "Foi para a Arrábida que o teu silêncio te levou.",
  },
  {
    id: "cabo-roca",
    videoUrl: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    register: "horizon",
    acts: [1],
    observe: ["o Atlântico abre-se sem fim", "aqui acaba a terra"],
    intimate: ["respira fundo", "este lugar guarda-te"],
    tempo: "slow",
    place: "Cabo da Roca",
    convergence: "Foi até ao fim da terra que tu vieste.",
  },
  {
    id: "hidden-street",
    videoUrl: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    register: "stone",
    acts: [1, 2],
    observe: ["azulejos antigos, cal nas paredes", "passos sobre pedra húmida"],
    intimate: ["esta rua não está no mapa", "alguém deixou esta porta aberta para ti"],
    tempo: "any",
    place: "Setúbal velha",
    convergence: "Foi numa rua sem nome que tu te encontraste.",
  },
  {
    id: "viewpoint",
    videoUrl: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    register: "vineyard",
    acts: [2],
    observe: ["pinheiros, sombra fresca", "luz baixa sobre a baía"],
    intimate: ["fica para a luz da tarde", "este é o teu lado da serra"],
    tempo: "slow",
    place: "Serra da Arrábida",
    convergence: "Foi à sombra dos pinheiros que tu paraste.",
  },
  {
    id: "candle-table",
    videoUrl: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    register: "table",
    acts: [2, 3],
    observe: ["pão partido devagar", "vinho da casa, copo simples"],
    intimate: ["a mesa estava à tua espera", "senta-te, não há pressa"],
    tempo: "slow",
    place: "Azeitão",
    convergence: "Foi para uma mesa em Azeitão que o dia te conduziu.",
  },
  {
    id: "celebration",
    videoUrl: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    register: "candle",
    acts: [2, 3],
    observe: ["velas baixas, vozes próximas", "o fogo agrada à pedra"],
    intimate: ["foste convidado, mesmo sem o saber", "fica até a última vela apagar"],
    tempo: "any",
    place: "uma noite a sul",
    convergence: "Foi uma noite a sul que te ficou na pele.",
  },
  {
    id: "sesimbra",
    videoUrl: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    register: "harbour",
    acts: [1, 2, 3],
    observe: ["barcos a regressar", "cheiro a sardinha grelhada"],
    intimate: ["o porto fala devagar contigo", "fica para ver as luzes acenderem-se"],
    tempo: "fast",
    place: "Sesimbra",
    convergence: "Foi em Sesimbra que o mar te deixou ficar.",
  },
];

interface Props {
  onExit?: () => void;
}

/** Act durations (system-decided — drift always progresses). */
const ACT_I_MS = 22000;
const ACT_II_MS = 33000;
const ACT_III_HOLD_MS = 9000; // arrival breath before final line
const ARRIVAL_DURATION_MS = 14000;

/** Lean (linger) thresholds — shorter in later acts so tension keeps lifting. */
const LEAN_MS_BY_ACT: Record<Act, number> = { 1: 3600, 2: 2800, 3: 2200 };
/** Passive advance — pace tightens act by act. */
const PASSIVE_MS_BY_ACT: Record<Act, number> = { 1: 9000, 2: 7000, 3: 5500 };
const TEMPO_WINDOW_MS = 1400;

export function StudioDrift({ onExit }: Props) {
  const [act, setAct] = useState<Act>(1);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [fragment, setFragment] = useState<string | null>(null);
  const [leans, setLeans] = useState<Array<{ register: Register; place: string; dwellMs: number; act: Act }>>([]);
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

  const clearSceneTimers = useCallback(() => {
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
    if (leanTimerRef.current) window.clearTimeout(leanTimerRef.current);
    passiveTimerRef.current = null;
    leanTimerRef.current = null;
  }, []);

  /** Pick the next scene biased by current act, tempo, and accumulated affinity. */
  const chooseNext = useCallback(
    (currentRegister: Register, forAct: Act) => {
      const candidates = SCENES.filter((s) => s.acts.includes(forAct) && s.register !== currentRegister);
      const pool = candidates.length > 0 ? candidates : SCENES.filter((s) => s.register !== currentRegister);
      const scored = pool.map((s) => {
        let score = 1;
        if (tempo === "slow" && s.tempo === "slow") score += 2;
        if (tempo === "fast" && s.tempo === "fast") score += 2;
        if (tempo === "slow" && s.tempo === "fast") score -= 1.2;
        // Affinity: previously leaned-on registers attract their kin.
        const sameReg = leans.filter((l) => l.register === s.register).length;
        score += sameReg * 0.8;
        // Act III narrows aggressively toward intimate registers.
        if (forAct === 3 && (s.register === "table" || s.register === "candle" || s.register === "harbour")) {
          score += 1.4;
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
    [tempo, leans],
  );

  const advance = useCallback(
    (forAct: Act = act) => {
      setSceneIdx((idx) => chooseNext(SCENES[idx].register, forAct));
    },
    [chooseNext, act],
  );

  // Act timeline — drift always progresses. There is no infinite wander.
  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setAct(2);
      advance(2);
    }, ACT_I_MS);
    const t2 = window.setTimeout(() => {
      setAct(3);
      advance(3);
    }, ACT_I_MS + ACT_II_MS);
    const t3 = window.setTimeout(() => {
      setArriving(true);
    }, ACT_I_MS + ACT_II_MS + ACT_III_HOLD_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // Mount-once timeline.
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
      tempo === "slow" ? PASSIVE_MS_BY_ACT[act] + 1800 : tempo === "fast" ? PASSIVE_MS_BY_ACT[act] - 1500 : PASSIVE_MS_BY_ACT[act];

    passiveTimerRef.current = window.setTimeout(() => {
      if (!lingeringRef.current) advance(act);
    }, holdMs);

    leanTimerRef.current = window.setTimeout(() => {
      if (lingeringRef.current) {
        const dwellMs = Date.now() - enterAtRef.current;
        setLeans((prev) => [...prev, { register: scene.register, place: scene.place, dwellMs, act }]);
        // Fragment register evolves with the act — observation → address.
        const pool = act === 1 ? scene.observe : scene.intimate;
        setFragment(pool[Math.floor(Math.random() * pool.length)]);
      }
    }, LEAN_MS_BY_ACT[act]);

    return clearSceneTimers;
  }, [sceneIdx, scene, advance, clearSceneTimers, arriving, act, tempo]);

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
      if (gap > 6500) setTempo("slow");
    }
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
  }, [ensureAudio]);

  const onPressEnd = useCallback(() => {
    lingeringRef.current = false;
  }, []);

  const onSceneTap = useCallback(() => {
    if (fragment !== null) advance(act);
  }, [fragment, advance, act]);

  // Atmosphere tint — narrows act by act and shifts with tempo.
  const atmosphereTint = useMemo(() => {
    const teal = "color-mix(in oklab, var(--teal) 18%, transparent)";
    const gold = "color-mix(in oklab, var(--gold) 18%, transparent)";
    const ivory = "color-mix(in oklab, var(--ivory) 9%, transparent)";
    const warm = "color-mix(in oklab, var(--gold-soft, var(--gold)) 22%, transparent)";

    if (act === 3) {
      // Convergence — warm, intimate.
      return `radial-gradient(ellipse at 50% 75%, ${warm} 0%, transparent 58%)`;
    }
    if (act === 2) {
      return tempo === "fast"
        ? `radial-gradient(ellipse at 50% 78%, ${gold} 0%, transparent 55%)`
        : `radial-gradient(ellipse at 50% 78%, ${teal} 0%, transparent 58%)`;
    }
    return tempo === "slow"
      ? `radial-gradient(ellipse at 50% 80%, ${teal} 0%, transparent 60%)`
      : `radial-gradient(ellipse at 50% 80%, ${ivory} 0%, transparent 50%)`;
  }, [act, tempo]);

  if (arriving) {
    return <DriftArrival leans={leans} scene={scene} onExit={onExit} />;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" style={{ touchAction: "manipulation" }}>
      <SceneVideo key={scene.id} src={scene.videoUrl} />

      {/* Tempo/act-aware atmospheric tint — the world transforms continuously */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-[background] duration-[2400ms] ease-out"
        style={{ background: atmosphereTint, mixBlendMode: "soft-light" }}
      />

      {/* Vignette deepens with act — pulling the eye inward over time */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-opacity duration-[2400ms]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.35) 95%), linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.50) 100%)",
          opacity: act === 3 ? 1 : act === 2 ? 0.85 : 0.7,
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

      {/* Lean bloom — a single warm breath when the world senses presence */}
      {fragment !== null && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[14] pointer-events-none animate-in fade-in duration-[1800ms]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 58%, color-mix(in oklab, var(--gold) 26%, transparent) 0%, transparent 55%)",
            mixBlendMode: "soft-light",
          }}
        />
      )}

      {/* Sensory fragment — italic Portuguese; register evolves with act */}
      {fragment !== null && (
        <div className="absolute inset-x-0 bottom-[16%] z-20 flex flex-col items-center px-8 text-center pointer-events-none animate-in fade-in duration-[1600ms]">
          <span aria-hidden="true" className="mb-4 block h-px w-6 bg-[color:var(--gold)]/70" />
          <p
            className="italic text-[19px] sm:text-[22px] leading-[1.45] text-[color:var(--ivory)] max-w-[24ch]"
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

      {audioStarted && <AmbientAudio tempo={tempo} act={act} />}
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
 * AmbientAudio — synthesised Atlantic-wind drone. Brightens with tempo and
 * warms in act III (a soft sub-bass layer wakens for arrival).
 */
function AmbientAudio({ tempo, act }: { tempo: "slow" | "fast" | "neutral"; act: Act }) {
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
    filter.frequency.value = 420;
    filter.Q.value = 0.7;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start();
    noiseGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 3);

    // Sub layer — wakens only in act III.
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
    const actBias = act === 3 ? 120 : act === 2 ? 60 : 0;
    const target = Math.max(220, 460 + tempoBias + actBias);
    f.frequency.cancelScheduledValues(ctx.currentTime);
    f.frequency.linearRampToValueAtTime(target, ctx.currentTime + 2.5);
  }, [tempo, act]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const sub = subGainRef.current;
    if (!ctx || !sub) return;
    const target = act === 3 ? 0.035 : 0;
    sub.gain.cancelScheduledValues(ctx.currentTime);
    sub.gain.linearRampToValueAtTime(target, ctx.currentTime + 3.5);
  }, [act]);

  return null;
}

/**
 * DriftArrival — the convergence beat.
 *
 * Picks the single place the traveller's drift converged on (heaviest dwell,
 * weighted by act — leans in act II/III count more, because that's where
 * intimacy formed). Holds on that backdrop and lands one line of
 * inevitability — "Foi para X que o teu silêncio te levou."
 *
 * Not a CTA. Not a proposal card. A destiny acknowledged.
 */
function DriftArrival({
  leans,
  scene,
  onExit,
}: {
  leans: Array<{ register: Register; place: string; dwellMs: number; act: Act }>;
  scene: DriftScene;
  onExit?: () => void;
}) {
  const winner = useMemo(() => {
    if (leans.length === 0) return scene;
    const weighted = new Map<string, { score: number; scene: DriftScene }>();
    for (const l of leans) {
      const s = SCENES.find((x) => x.register === l.register && x.place === l.place);
      if (!s) continue;
      const actWeight = l.act === 3 ? 2.4 : l.act === 2 ? 1.6 : 1;
      const score = l.dwellMs * actWeight;
      const prev = weighted.get(s.id);
      weighted.set(s.id, { score: (prev?.score ?? 0) + score, scene: s });
    }
    if (weighted.size === 0) return scene;
    return [...weighted.values()].sort((a, b) => b.score - a.score)[0].scene;
  }, [leans, scene]);

  const [showLine, setShowLine] = useState(false);
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShowLine(true), 1400);
    const t2 = window.setTimeout(() => setShowExit(true), ARRIVAL_DURATION_MS - 4000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <SceneVideo src={winner.videoUrl} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 70%, color-mix(in oklab, var(--gold) 14%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.48) 55%, rgba(0,0,0,0.74) 100%)",
          mixBlendMode: "normal",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <span aria-hidden="true" className="mb-7 block h-px w-10 bg-[color:var(--gold)]/85" />

        {showLine && (
          <p
            className="italic text-[22px] sm:text-[30px] leading-[1.35] text-[color:var(--ivory)] max-w-[26ch] animate-in fade-in slide-in-from-bottom-2 duration-[2000ms]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 24px rgba(0,0,0,0.65)",
            }}
          >
            {winner.convergence}
          </p>
        )}

        {showExit && onExit && (
          <button
            type="button"
            onClick={onExit}
            className="mt-14 text-[12px] tracking-[0.14em] uppercase text-[color:var(--ivory)]/80 hover:text-[color:var(--ivory)] border-b border-[color:var(--gold)]/70 hover:border-[color:var(--gold)] pb-1 transition-colors duration-500 animate-in fade-in duration-[2200ms]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            quero ir
          </button>
        )}
      </div>
    </div>
  );
}
