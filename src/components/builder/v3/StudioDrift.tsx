import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — subconscious recognition engine.
 *
 * The world does not adapt. It tightens.
 *
 * Every scene carries three simultaneous layers:
 *   1. ENVIRONMENTAL SIGNAL — physical atmosphere (salt, tile, stone heat)
 *   2. HUMAN TRACE         — evidence people existed here emotionally
 *   3. EMOTIONAL IMPLICATION — what this place quietly does to people
 *
 * The engine never asks "what category". It watches:
 *   - hesitation before a press
 *   - tap velocity (restless vs open)
 *   - revisits to the same register (subconscious pull)
 *   - contradiction between chosen surface and human-trace gravity
 *
 * The reveal is not a recommendation. It is a conclusion.
 * "It was always X." — observed, not proposed.
 */

type Register = "horizon" | "stone" | "candle" | "table" | "vineyard" | "harbour";
type Phase = 1 | 2 | 3;

type Gravity =
  | "intimacy-through-distance"
  | "silence-as-shelter"
  | "long-table-as-home"
  | "rain-as-permission"
  | "dawn-as-honesty"
  | "shadow-as-slowness";

type Trace =
  | "lipstick-on-wineglass"
  | "chair-pulled-back"
  | "unfinished-bread"
  | "wet-umbrella"
  | "handwritten-menu"
  | "burned-candle-wax"
  | "laughter-other-room"
  | "kitchen-noise-behind-door"
  | "paper-napkin-wind"
  | "cat-on-doorstep"
  | "half-empty-bottle"
  | "purple-stain-linen"
  | "basil-on-window"
  | "fado-other-room"
  | "two-coffee-cups"
  | "scratched-glass";

type DriftScene = {
  id: string;
  videoUrl: string;
  register: Register;
  phases: Phase[];
  /** Environmental signal — pure physical atmosphere. */
  env: string;
  /** Human trace — evidence of people, never the people themselves. */
  trace: string[];
  /** Emotional implication — what this place does, never adjective. */
  implication: string;
  /** What this scene quietly proves about the traveller, if they linger. */
  gravity: Gravity[];
  /** Traces that bias scoring. */
  traces: Trace[];
  tempo: "slow" | "fast" | "any";
  place: string;
};

/**
 * Every scene below carries the 3 layers. Copy stays observational —
 * never inspirational, never "discover" / "experience" / "hidden".
 */
const SCENES: DriftScene[] = [
  {
    id: "arrabida-coast",
    videoUrl: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    register: "horizon",
    phases: [1, 2],
    env: "sal no ar, linho a mexer com o vento",
    trace: [
      "guardanapos de papel a levantar de uma mesa que ninguém arrumou",
      "uma garrafa a meio, suada do gelo",
    ],
    implication: "aqui o almoço fica na mesa até a luz baixar",
    gravity: ["long-table-as-home", "shadow-as-slowness"],
    traces: ["paper-napkin-wind", "half-empty-bottle"],
    tempo: "slow",
    place: "Arrábida",
  },
  {
    id: "cabo-roca",
    videoUrl: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    register: "horizon",
    phases: [1],
    env: "vento atlântico, pedra fria de manhã",
    trace: [
      "dois copos de café numa muralha — ninguém à volta",
      "um casaco esquecido no banco de pedra",
    ],
    implication: "aqui as pessoas calam-se sem combinar",
    gravity: ["silence-as-shelter", "intimacy-through-distance"],
    traces: ["two-coffee-cups"],
    tempo: "slow",
    place: "Cabo da Roca",
  },
  {
    id: "hidden-street",
    videoUrl: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    register: "stone",
    phases: [1, 2],
    env: "azulejo molhado depois da chuva, sino distante",
    trace: [
      "manjericão na janela, riso de uma cozinha lá em cima",
      "um gato a dormir num degrau morno",
    ],
    implication: "estranhos ficam familiares neste tipo de rua",
    gravity: ["rain-as-permission", "long-table-as-home"],
    traces: ["basil-on-window", "laughter-other-room", "cat-on-doorstep"],
    tempo: "any",
    place: "Setúbal velha",
  },
  {
    id: "viewpoint",
    videoUrl: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    register: "vineyard",
    phases: [2],
    env: "sombra de vinha, ouro baixo, cal quente",
    trace: [
      "uma nódoa roxa de vinho num lenço branco",
      "fado baixinho a vir de outra sala",
    ],
    implication: "aqui as conversas baixam de tom sem aviso",
    gravity: ["shadow-as-slowness", "long-table-as-home"],
    traces: ["purple-stain-linen", "fado-other-room"],
    tempo: "slow",
    place: "Serra da Arrábida",
  },
  {
    id: "candle-table",
    videoUrl: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    register: "table",
    phases: [2, 3],
    env: "calor de vela, madeira velha, vidro riscado",
    trace: [
      "uma cadeira ligeiramente puxada para trás, à tua espera",
      "pão por acabar, cera derretida no castiçal",
    ],
    implication: "este tipo de mesa amolece pessoas guardadas",
    gravity: ["long-table-as-home", "shadow-as-slowness"],
    traces: ["chair-pulled-back", "unfinished-bread", "burned-candle-wax", "scratched-glass"],
    tempo: "slow",
    place: "Azeitão",
  },
  {
    id: "celebration",
    videoUrl: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    register: "candle",
    phases: [2, 3],
    env: "luz quente baixa, vela curta, vinho no copo do lado",
    trace: [
      "risos a sair de outra sala, prato por levantar",
      "uma marca de batom no copo de vinho",
    ],
    implication: "o tempo demora-se mais aqui — ninguém comenta",
    gravity: ["long-table-as-home", "intimacy-through-distance"],
    traces: ["laughter-other-room", "lipstick-on-wineglass", "half-empty-bottle"],
    tempo: "any",
    place: "uma taberna a sul",
  },
  {
    id: "sesimbra",
    videoUrl: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    register: "harbour",
    phases: [1, 2, 3],
    env: "cheiro de gasóleo e maresia, vidros frios de manhã",
    trace: [
      "um chapéu de chuva molhado encostado à porta",
      "barulho de cozinha de um restaurante ainda fechado",
    ],
    implication: "este porto não pergunta de onde vens",
    gravity: ["dawn-as-honesty", "silence-as-shelter"],
    traces: ["wet-umbrella", "kitchen-noise-behind-door"],
    tempo: "fast",
    place: "Sesimbra",
  },
];

/**
 * Each Gravity → an inevitable couplet. Three lines of observed detail,
 * then the place sentence. No "we think". No "for you". The system has
 * already concluded.
 */
const GRAVITY_LINES: Record<Gravity, { lines: string[]; arrival: (p: string) => string }> = {
  "intimacy-through-distance": {
    lines: [
      "Ficaste no silêncio mais tempo do que o costume.",
      "Mas eram as cozinhas com riso que te paravam.",
      "Procuras intimidade — só não pela porta da frente.",
    ],
    arrival: (p) => `Foi sempre ${p}.`,
  },
  "silence-as-shelter": {
    lines: [
      "O vento não te incomodou.",
      "A vela curta também não.",
      "Há sítios onde o silêncio te protege em vez de te deixar só.",
    ],
    arrival: (p) => `É em ${p} que tu paras de te explicar.`,
  },
  "long-table-as-home": {
    lines: [
      "O almoço ficou na mesa tempo a mais.",
      "O sal pousou no linho branco.",
      "Ninguém aqui apressa a tarde.",
    ],
    arrival: (p) => `Foi sempre ${p}.`,
  },
  "rain-as-permission": {
    lines: [
      "Demoraste-te em portas entreabertas.",
      "Em janelas com manjericão e riso por trás.",
      "A chuva é só a desculpa.",
    ],
    arrival: (p) => `É em ${p} que tu entras sem bater.`,
  },
  "dawn-as-honesty": {
    lines: [
      "Voltaste duas vezes ao porto antes do sol.",
      "Para o café preto, o gasóleo, os homens que não falam.",
      "Há uma honestidade que só existe às seis da manhã.",
    ],
    arrival: (p) => `É em ${p} que o teu dia começa antes de ti.`,
  },
  "shadow-as-slowness": {
    lines: [
      "Ficaste com a sombra da vinha mais tempo do que com o mar.",
      "Com a nódoa roxa no lenço branco.",
      "Com o ouro baixo da última hora.",
    ],
    arrival: (p) => `É na ${p} que tu deixas a luz baixar.`,
  },
};

interface Props {
  onExit?: () => void;
}

/** Timeline — first convergence lands at ≈34s. Names never exposed. */
const PHASE_I_MS = 10000;
const PHASE_II_MS = 16000;
const PHASE_III_HOLD_MS = 8000;
const ARRIVAL_DURATION_MS = 16000;

const LEAN_MS_BY_PHASE: Record<Phase, number> = { 1: 3200, 2: 2400, 3: 1800 };
const PASSIVE_MS_BY_PHASE: Record<Phase, number> = { 1: 6500, 2: 5200, 3: 4600 };
const TEMPO_WINDOW_MS = 1400;
/** A press that lands within this window of arrival = hesitation. */
const HESITATION_MS = 900;

type LeanRecord = {
  scene: DriftScene;
  dwellMs: number;
  phase: Phase;
  /** Did the traveller hover/hold the world before committing? */
  hesitated: boolean;
};

export function StudioDrift({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>(1);
  const [sceneIdx, setSceneIdx] = useState(0);
  /**
   * Atmospheric fragment surfaced only on lean. We rotate which of the 3
   * layers we expose (env / trace / implication) so the world never feels
   * like a captioned image.
   */
  const [fragment, setFragment] = useState<string | null>(null);
  const [leans, setLeans] = useState<LeanRecord[]>([]);
  const [tempo, setTempo] = useState<"slow" | "fast" | "neutral">("neutral");
  const [arriving, setArriving] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const enterAtRef = useRef<number>(Date.now());
  const lingeringRef = useRef(false);
  const hesitationStartedRef = useRef<number | null>(null);
  const lastTapAtRef = useRef<number>(0);
  const tapBurstRef = useRef<number>(0);
  const passiveTimerRef = useRef<number | null>(null);
  const leanTimerRef = useRef<number | null>(null);
  /** Subconscious pull — how many times the traveller has visited each register. */
  const visitCountRef = useRef<Map<Register, number>>(new Map());

  const scene = SCENES[sceneIdx % SCENES.length];

  /** Emotional gravity profile — weighted by phase, dwell and hesitation. */
  const gravityProfile = useMemo(() => {
    const map = new Map<Gravity, number>();
    for (const l of leans) {
      const phaseW = l.phase === 3 ? 2.4 : l.phase === 2 ? 1.6 : 1;
      // Hesitation = unresolved desire. It counts double.
      const hesW = l.hesitated ? 1.8 : 1;
      // Dwell already reflects how much they let it work on them.
      const dwellW = Math.min(2.2, l.dwellMs / 2200);
      const w = phaseW * hesW * dwellW;
      for (const g of l.scene.gravity) {
        map.set(g, (map.get(g) ?? 0) + w);
      }
    }
    return map;
  }, [leans]);

  const traceProfile = useMemo(() => {
    const map = new Map<Trace, number>();
    for (const l of leans) {
      const w = l.phase === 3 ? 2.4 : l.phase === 2 ? 1.6 : 1;
      for (const t of l.scene.traces) {
        map.set(t, (map.get(t) ?? 0) + w);
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

  /** Pick next scene — phase + tempo + gravity + trace + revisit pull. */
  const chooseNext = useCallback(
    (currentRegister: Register, forPhase: Phase) => {
      const candidates = SCENES.filter(
        (s) => s.phases.includes(forPhase) && s.register !== currentRegister,
      );
      const pool = candidates.length > 0 ? candidates : SCENES.filter((s) => s.register !== currentRegister);
      const scored = pool.map((s) => {
        let score = 1;
        if (tempo === "slow" && s.tempo === "slow") score += 1.6;
        if (tempo === "fast" && s.tempo === "fast") score += 1.6;
        if (tempo === "slow" && s.tempo === "fast") score -= 1.0;
        // Gravity pull.
        const gravityAffinity = s.gravity.reduce((acc, g) => acc + (gravityProfile.get(g) ?? 0), 0);
        score += gravityAffinity * 0.8;
        // Trace pull.
        const traceAffinity = s.traces.reduce((acc, t) => acc + (traceProfile.get(t) ?? 0), 0);
        score += traceAffinity * 0.5;
        // Subconscious revisit pull — the world quietly returns to registers
        // the traveller keeps coming back to, even if they didn't "choose" them.
        const visits = visitCountRef.current.get(s.register) ?? 0;
        if (visits >= 2) score += 0.9;
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
    [tempo, gravityProfile, traceProfile],
  );

  const advance = useCallback(
    (forPhase: Phase = phase) => {
      setSceneIdx((idx) => chooseNext(SCENES[idx].register, forPhase));
    },
    [chooseNext, phase],
  );

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
    hesitationStartedRef.current = null;
    setFragment(null);
    clearSceneTimers();

    // Track subconscious revisits.
    const v = visitCountRef.current;
    v.set(scene.register, (v.get(scene.register) ?? 0) + 1);

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
        const hesitated =
          hesitationStartedRef.current !== null &&
          Date.now() - hesitationStartedRef.current > HESITATION_MS;
        setLeans((prev) => [...prev, { scene, dwellMs, phase, hesitated }]);
        // Rotate which layer surfaces: trace (most often), env, or implication.
        const roll = Math.random();
        let line: string;
        if (roll < 0.55) {
          line = scene.trace[Math.floor(Math.random() * scene.trace.length)];
        } else if (roll < 0.85) {
          line = scene.implication;
        } else {
          line = scene.env;
        }
        setFragment(line);
      }
    }, LEAN_MS_BY_PHASE[phase]);

    return clearSceneTimers;
  }, [sceneIdx, scene, advance, clearSceneTimers, arriving, phase, tempo]);

  const ensureAudio = useCallback(() => {
    if (!audioStarted) setAudioStarted(true);
  }, [audioStarted]);

  const onPressStart = useCallback(() => {
    ensureAudio();
    // Capture hesitation: time between arrival and first press.
    if (hesitationStartedRef.current === null) {
      hesitationStartedRef.current = enterAtRef.current;
    }
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

  // Atmosphere tint — narrows with phase, gravity colours the light.
  const atmosphereTint = useMemo(() => {
    const teal = "color-mix(in oklab, var(--teal) 18%, transparent)";
    const gold = "color-mix(in oklab, var(--gold) 18%, transparent)";
    const ivory = "color-mix(in oklab, var(--ivory) 9%, transparent)";
    const warm = "color-mix(in oklab, var(--gold-soft, var(--gold)) 22%, transparent)";

    const longTableW = gravityProfile.get("long-table-as-home") ?? 0;
    const silenceW = gravityProfile.get("silence-as-shelter") ?? 0;
    const shadowW = gravityProfile.get("shadow-as-slowness") ?? 0;

    if (phase === 3) {
      return `radial-gradient(ellipse at 50% 75%, ${warm} 0%, transparent 58%)`;
    }
    if (phase === 2) {
      if (longTableW > silenceW && longTableW >= shadowW) {
        return `radial-gradient(ellipse at 50% 78%, ${gold} 0%, transparent 58%)`;
      }
      if (silenceW > longTableW) {
        return `radial-gradient(ellipse at 50% 78%, ${ivory} 0%, transparent 60%)`;
      }
      return `radial-gradient(ellipse at 50% 78%, ${teal} 0%, transparent 58%)`;
    }
    return tempo === "slow"
      ? `radial-gradient(ellipse at 50% 80%, ${teal} 0%, transparent 60%)`
      : `radial-gradient(ellipse at 50% 80%, ${ivory} 0%, transparent 50%)`;
  }, [phase, tempo, gravityProfile]);

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

      {/* The world itself is the only interaction surface — no buttons,
          no captions, no UI affordances. Press = linger. */}
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

      {fragment !== null && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[14] pointer-events-none animate-in fade-in duration-[1600ms]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 58%, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 55%)",
            mixBlendMode: "soft-light",
          }}
        />
      )}

      {fragment !== null && (
        <div className="absolute inset-x-0 bottom-[18%] z-20 flex flex-col items-center px-8 text-center pointer-events-none animate-in fade-in duration-[1600ms]">
          <p
            className="italic text-[17px] sm:text-[20px] leading-[1.5] text-[color:var(--ivory)]/95 max-w-[26ch]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 22px rgba(0,0,0,0.7)",
            }}
          >
            {fragment}
          </p>
        </div>
      )}

      {/* Exit: nearly invisible. Only present for escape, never inviting. */}
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label="sair"
          className="absolute top-4 left-4 z-30 h-6 w-6 rounded-full bg-[color:var(--ivory)]/10 hover:bg-[color:var(--ivory)]/25 transition-colors"
        />
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
 * DriftArrival — conclusion, not recommendation.
 *
 * Detects emotional gravity (not category), surfaces three observed
 * fragments of evidence, then names the place as inevitability.
 * "Foi sempre Arrábida." — the system noticed something hidden.
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
  const { gravity, sceneForBackdrop } = useMemo(() => {
    if (leans.length === 0) {
      return { gravity: fallback.gravity[0], sceneForBackdrop: fallback };
    }
    const gScore = new Map<Gravity, number>();
    const sceneScore = new Map<string, { score: number; scene: DriftScene }>();
    for (const l of leans) {
      const phaseW = l.phase === 3 ? 2.6 : l.phase === 2 ? 1.7 : 1;
      const hesW = l.hesitated ? 1.6 : 1;
      const contribution = l.dwellMs * phaseW * hesW;
      for (const g of l.scene.gravity) {
        gScore.set(g, (gScore.get(g) ?? 0) + contribution);
      }
      const prev = sceneScore.get(l.scene.id);
      sceneScore.set(l.scene.id, { score: (prev?.score ?? 0) + contribution, scene: l.scene });
    }
    const dominant = [...gScore.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const matching = [...sceneScore.values()].filter((x) => x.scene.gravity.includes(dominant));
    const backdrop =
      matching.sort((a, b) => b.score - a.score)[0]?.scene ??
      SCENES.find((s) => s.gravity.includes(dominant)) ??
      fallback;
    return { gravity: dominant, sceneForBackdrop: backdrop };
  }, [leans, fallback]);

  const couplet = GRAVITY_LINES[gravity];

  const [step, setStep] = useState(0); // 0..3 lines, 4 = arrival, 5 = exit
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    couplet.lines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i + 1), 1400 + i * 2600));
    });
    timers.push(window.setTimeout(() => setStep(couplet.lines.length + 1), 1400 + couplet.lines.length * 2600 + 1400));
    timers.push(window.setTimeout(() => setShowExit(true), ARRIVAL_DURATION_MS - 2400));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [couplet]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <SceneVideo src={sceneForBackdrop.videoUrl} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 70%, color-mix(in oklab, var(--gold) 14%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.56) 55%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="flex flex-col gap-4 max-w-[30ch]">
          {couplet.lines.map((line, i) => (
            <p
              key={i}
              className="italic text-[17px] sm:text-[20px] leading-[1.5] text-[color:var(--ivory)] transition-all duration-[1400ms] ease-out"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                textShadow: "0 1px 22px rgba(0,0,0,0.65)",
                opacity: step > i ? 0.92 : 0,
                transform: step > i ? "translateY(0)" : "translateY(6px)",
              }}
            >
              {line}
            </p>
          ))}
        </div>

        <p
          className="mt-10 text-[22px] sm:text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-[color:var(--ivory)] max-w-[24ch] transition-all duration-[1600ms] ease-out"
          style={{
            fontFamily: "Montserrat, system-ui, sans-serif",
            textShadow: "0 1px 22px rgba(0,0,0,0.65)",
            opacity: step > couplet.lines.length ? 1 : 0,
            transform: step > couplet.lines.length ? "translateY(0)" : "translateY(8px)",
          }}
        >
          {couplet.arrival(sceneForBackdrop.place)}
        </p>

        {showExit && onExit && (
          <button
            type="button"
            onClick={onExit}
            className="mt-12 text-[12px] tracking-[0.14em] uppercase text-[color:var(--ivory)]/80 hover:text-[color:var(--ivory)] border-b border-[color:var(--gold)]/70 hover:border-[color:var(--gold)] pb-1 transition-colors duration-500 animate-in fade-in duration-[2000ms]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            sim
          </button>
        )}
      </div>
    </div>
  );
}
