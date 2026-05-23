import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — ambient psychological Portugal.
 *
 * Architecturally separate from the Studio builder. There are no steps,
 * no phases, no chapters, no "arrival". The world is a living attraction
 * field. Scenes are weighted by an evolving gravity vector. Lingering
 * tightens the field. Silence lets it drift. Nothing concludes.
 *
 * Core primitives:
 *   · Motif        — a recurring sensory atom (amber, salt, stone, candle,
 *                    rain, vine, harbour, basil, fado, linen, bread).
 *   · Scene        — a video, a place, and a small bouquet of motifs.
 *   · Gravity      — accumulated weight per motif. Grows when the
 *                    traveller lingers on a scene carrying that motif.
 *   · Memory       — motifs that have already pulled the traveller appear
 *                    again later as ambient tint, sound colour, and
 *                    occasional drifting word — never as captions of the
 *                    current scene.
 *
 * No labels. No buttons. The world itself is the surface.
 */

// ─────────────────────────────────────────────────────────────────────────
// Sensory vocabulary
// ─────────────────────────────────────────────────────────────────────────

type Motif =
  | "amber"     // candle, lamp, late sun
  | "salt"      // Atlantic, linen, wind
  | "stone"     // tiled alleys, walls, monasteries
  | "candle"    // intimate flame, wax, table
  | "rain"      // wet tile, umbrellas, doors entreabertas
  | "vine"      // shadow, dusk, slow wine
  | "harbour"   // diesel, dawn, fishermen
  | "linen"     // long table, napkin in wind
  | "fado"      // sound bleeding through walls
  | "basil"     // window, kitchen warmth
  | "bread";    // unfinished, on the table

type Scene = {
  id: string;
  video: string;
  place: string;
  motifs: Motif[];
  /** Fragments are drifting memory, not captions. Surfaced rarely. */
  drift: string[];
};

const SCENES: Scene[] = [
  {
    id: "arrabida-coast",
    video: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    place: "Arrábida",
    motifs: ["salt", "linen", "vine"],
    drift: ["o linho a mexer", "sal no copo", "a luz a baixar sem aviso"],
  },
  {
    id: "cabo-roca",
    video: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    place: "Cabo da Roca",
    motifs: ["salt", "stone"],
    drift: ["dois copos numa muralha", "um casaco esquecido", "ninguém combinou o silêncio"],
  },
  {
    id: "hidden-street",
    video: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    place: "Setúbal velha",
    motifs: ["rain", "stone", "basil"],
    drift: ["azulejo molhado", "riso vindo de cima", "um gato num degrau morno"],
  },
  {
    id: "viewpoint",
    video: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    place: "Serra da Arrábida",
    motifs: ["vine", "fado", "amber"],
    drift: ["nódoa roxa no lenço branco", "fado de outra sala", "ouro baixo na vinha"],
  },
  {
    id: "candle-table",
    video: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    place: "Azeitão",
    motifs: ["candle", "amber", "bread"],
    drift: ["cera derretida", "uma cadeira puxada para trás", "pão por acabar"],
  },
  {
    id: "celebration",
    video: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    place: "uma taberna a sul",
    motifs: ["candle", "amber", "fado", "linen"],
    drift: ["batom no copo de vinho", "risos de outra sala", "o tempo a demorar-se"],
  },
  {
    id: "sesimbra",
    video: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    place: "Sesimbra",
    motifs: ["harbour", "salt", "rain"],
    drift: ["gasóleo na maresia", "chapéu de chuva à porta", "cozinha que ainda não abriu"],
  },
];

// Motif → ambient tint that bleeds across the entire world once
// remembered. These are deliberately soft — they are not the scene,
// they are the scene's afterimage.
const MOTIF_TINT: Record<Motif, string> = {
  amber:   "radial-gradient(ellipse at 50% 78%, color-mix(in oklab, var(--gold) 26%, transparent) 0%, transparent 60%)",
  candle:  "radial-gradient(ellipse at 50% 82%, color-mix(in oklab, var(--gold-soft, var(--gold)) 30%, transparent) 0%, transparent 55%)",
  salt:    "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--ivory) 16%, transparent) 0%, transparent 65%)",
  linen:   "radial-gradient(ellipse at 50% 70%, color-mix(in oklab, var(--ivory) 12%, transparent) 0%, transparent 60%)",
  stone:   "radial-gradient(ellipse at 30% 60%, color-mix(in oklab, var(--teal) 16%, transparent) 0%, transparent 65%)",
  rain:    "radial-gradient(ellipse at 60% 45%, color-mix(in oklab, var(--teal-2, var(--teal)) 18%, transparent) 0%, transparent 65%)",
  vine:    "radial-gradient(ellipse at 50% 80%, color-mix(in oklab, var(--gold) 20%, transparent) 0%, transparent 55%)",
  harbour: "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--teal) 20%, transparent) 0%, transparent 65%)",
  fado:    "radial-gradient(ellipse at 40% 60%, color-mix(in oklab, var(--gold-soft, var(--gold)) 14%, transparent) 0%, transparent 65%)",
  basil:   "radial-gradient(ellipse at 70% 55%, color-mix(in oklab, var(--ivory) 10%, transparent) 0%, transparent 60%)",
  bread:   "radial-gradient(ellipse at 50% 75%, color-mix(in oklab, var(--gold) 14%, transparent) 0%, transparent 55%)",
};

// ─────────────────────────────────────────────────────────────────────────
// Tunings
// ─────────────────────────────────────────────────────────────────────────

const PASSIVE_DRIFT_MS = 7200;     // if untouched, the world slides on
const LINGER_TIGHTEN_MS = 1100;    // press held this long = the world notices
const MEMORY_DECAY_PER_MS = 0.00004;
const MEMORY_MAX = 6;              // cap so the world never saturates

interface Props {
  onExit?: () => void;
}

export function StudioDrift({ onExit }: Props) {
  const [sceneIdx, setSceneIdx] = useState(() => Math.floor(Math.random() * SCENES.length));
  /** Drifting word — surfaces rarely, often from MEMORY rather than the current scene. */
  const [drift, setDrift] = useState<string | null>(null);
  const [driftAt, setDriftAt] = useState(0);
  const [audioOn, setAudioOn] = useState(false);

  /** Gravity vector — motif → accumulated weight. Decays with time. */
  const gravityRef = useRef<Map<Motif, number>>(new Map());
  /** Tick to re-render when gravity changes meaningfully. */
  const [, setTick] = useState(0);

  const enterAtRef = useRef<number>(Date.now());
  const pressedAtRef = useRef<number | null>(null);
  const lingeringRef = useRef(false);
  const passiveTimerRef = useRef<number | null>(null);
  const lingerTimerRef = useRef<number | null>(null);
  const driftTimerRef = useRef<number | null>(null);
  /** Last scene change wall-clock — used to decay gravity gracefully. */
  const lastTickRef = useRef<number>(Date.now());

  const scene = SCENES[sceneIdx];

  // Decay gravity continuously so old attractions soften.
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
   * Pick the next scene by attraction, not by sequence.
   * — bias toward scenes sharing motifs the world has accumulated
   * — but never re-pick the same scene back-to-back
   * — and keep a small chance for genuine wandering, so the world
   *   never feels like a recommendation engine.
   */
  const pickNext = useCallback(() => {
    decayGravity();
    const g = gravityRef.current;
    const pool = SCENES.filter((s) => s.id !== scene.id);

    // Pure wander 14% of the time — keeps freedom from feeling steered.
    if (Math.random() < 0.14) {
      return SCENES.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    }

    const scored = pool.map((s) => {
      const affinity = s.motifs.reduce((acc, m) => acc + (g.get(m) ?? 0), 0);
      // base 1 so cold-start still drifts smoothly
      return { s, w: 1 + affinity * 1.4 };
    });
    const total = scored.reduce((acc, x) => acc + x.w, 0);
    let r = Math.random() * total;
    for (const x of scored) {
      r -= x.w;
      if (r <= 0) return SCENES.indexOf(x.s);
    }
    return SCENES.indexOf(scored[0].s);
  }, [scene.id, decayGravity]);

  const clearTimers = useCallback(() => {
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
    if (lingerTimerRef.current) window.clearTimeout(lingerTimerRef.current);
    if (driftTimerRef.current) window.clearTimeout(driftTimerRef.current);
    passiveTimerRef.current = null;
    lingerTimerRef.current = null;
    driftTimerRef.current = null;
  }, []);

  // Per-scene cycle. No phase logic — purely "this scene, then drift on".
  useEffect(() => {
    enterAtRef.current = Date.now();
    lingeringRef.current = false;
    pressedAtRef.current = null;
    setDrift(null);

    // The longer the world already knows you, the slower it moves.
    const memoryWeight = [...gravityRef.current.values()].reduce((a, b) => a + b, 0);
    const slow = Math.min(2600, memoryWeight * 220);
    const holdMs = PASSIVE_DRIFT_MS + slow;

    passiveTimerRef.current = window.setTimeout(() => {
      if (!lingeringRef.current) setSceneIdx(pickNext());
    }, holdMs);

    // A drifting word may surface — sometimes from this scene, sometimes
    // from a remembered motif. Never reliable, never a caption.
    const driftDelay = 2400 + Math.random() * 2600;
    driftTimerRef.current = window.setTimeout(() => {
      if (Math.random() < 0.55) {
        const fromMemory = pickMemoryDrift();
        const line =
          fromMemory ?? scene.drift[Math.floor(Math.random() * scene.drift.length)];
        setDrift(line);
        setDriftAt(Date.now());
      }
    }, driftDelay);

    return clearTimers;
    // pickNext changes with gravity, but we want this effect to fire only
    // on scene change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIdx]);

  /** Pick a drift line from a previously-loved scene (memory recurrence). */
  const pickMemoryDrift = useCallback((): string | null => {
    const g = gravityRef.current;
    if (g.size === 0) return null;
    // weight scenes by overlap with remembered motifs
    const others = SCENES.filter((s) => s.id !== scene.id);
    const scored = others
      .map((s) => ({ s, w: s.motifs.reduce((a, m) => a + (g.get(m) ?? 0), 0) }))
      .filter((x) => x.w > 0.5);
    if (scored.length === 0) return null;
    const total = scored.reduce((a, x) => a + x.w, 0);
    let r = Math.random() * total;
    for (const x of scored) {
      r -= x.w;
      if (r <= 0) return x.s.drift[Math.floor(Math.random() * x.s.drift.length)];
    }
    return null;
  }, [scene.id]);

  // ── Interaction: press to linger, release to let go. No taps, no swipes.
  const onPressStart = useCallback(() => {
    if (!audioOn) setAudioOn(true);
    pressedAtRef.current = Date.now();
    lingeringRef.current = true;
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);

    // After LINGER_TIGHTEN_MS, the world quietly notices.
    lingerTimerRef.current = window.setTimeout(() => {
      reinforce(scene.motifs, 1.2);
    }, LINGER_TIGHTEN_MS);
  }, [audioOn, reinforce, scene.motifs]);

  const onPressEnd = useCallback(() => {
    const held = pressedAtRef.current ? Date.now() - pressedAtRef.current : 0;
    pressedAtRef.current = null;
    lingeringRef.current = false;
    if (lingerTimerRef.current) window.clearTimeout(lingerTimerRef.current);

    // Short brush — partial reinforcement (curiosity, not commitment).
    if (held > 250 && held < LINGER_TIGHTEN_MS) {
      reinforce(scene.motifs, 0.4);
    }

    // After a linger, the world drifts on within a beat.
    passiveTimerRef.current = window.setTimeout(() => {
      setSceneIdx(pickNext());
    }, held > LINGER_TIGHTEN_MS ? 1800 : 3400);
  }, [reinforce, scene.motifs, pickNext]);

  // ── Ambient memory tint — top 2 remembered motifs paint the world.
  const memoryTints = useMemo(() => {
    const g = gravityRef.current;
    const sorted = [...g.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 2).map(([motif, weight]) => ({
      bg: MOTIF_TINT[motif],
      opacity: Math.min(0.85, 0.25 + weight * 0.18),
    }));
    // tick refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id, drift]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      style={{ touchAction: "manipulation" }}
    >
      <SceneVideo key={scene.id} src={scene.video} />

      {/* Memory layers — afterimage of motifs the world has already noticed. */}
      {memoryTints.map((t, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-[2600ms] ease-out"
          style={{ background: t.bg, opacity: t.opacity, mixBlendMode: "soft-light" }}
        />
      ))}

      {/* Cinematic vignette — constant, anonymous. No phase logic. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.38) 96%), linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.52) 100%)",
        }}
      />

      {/* The world is the interface. */}
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

      {/* A drifting word — visible briefly, then forgotten. */}
      {drift && (
        <DriftWord key={driftAt} text={drift} />
      )}

      {/* Almost invisible escape. Always present, never inviting. */}
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
// Internal pieces
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
      className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-[1800ms]"
      style={{ filter: "saturate(0.93) contrast(1.02)" }}
    />
  );
}

function DriftWord({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setShown(true), 60);
    const t2 = window.setTimeout(() => setShown(false), 4200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-[22%] z-20 flex justify-center px-8 pointer-events-none"
    >
      <p
        className="italic text-[16px] sm:text-[19px] leading-[1.5] text-[color:var(--ivory)] max-w-[24ch] text-center transition-all duration-[1400ms] ease-out"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          textShadow: "0 1px 22px rgba(0,0,0,0.7)",
          opacity: shown ? 0.9 : 0,
          transform: shown ? "translateY(0)" : "translateY(6px)",
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
 * Warm motifs (amber, candle, fado) brighten + warm the low pass.
 * Cool motifs (salt, harbour, rain, stone) cool it down.
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
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    filterRef.current = filter;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2.6);

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
        const target = Math.max(220, 420 + warm * 60 - cool * 40);
        f.frequency.setTargetAtTime(target, c.currentTime, 1.4);
      }
      raf = window.setTimeout(tick, 800) as unknown as number;
    };
    tick();

    return () => {
      window.clearTimeout(raf);
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
  }, [gravity]);

  return null;
}
