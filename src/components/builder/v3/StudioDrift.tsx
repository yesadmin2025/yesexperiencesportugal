import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * StudioDrift — radical prototype that replaces the question→answer Studio
 * with a pure dwell + gaze experience.
 *
 * Philosophy (locked, see mem://design/studio-philosophy):
 *   · No questions. No chips. No forms. No visible flow.
 *   · Portugal arrives as atmosphere — fishing harbours, azulejos, vineyard
 *     shadows, sea wind — BEFORE any conscious "choice".
 *   · The Studio senses rhythm: scenes the traveller lingers on are
 *     remembered. The world narrows emotionally around them.
 *   · Only 3 explicit micro-leans are ever required — and each is a single
 *     tap to "stay here", never a category to pick.
 *   · The reveal arrives the moment the Studio has sensed enough
 *     (system-decided) OR when the traveller summons it via a quiet,
 *     always-present "quando estiveres pronto" affordance.
 *
 * This is a self-contained prototype: no server functions, no booking
 * backend, no recommendation scoring. The intelligence lives entirely in
 * pacing, atmosphere selection, and the language of the final reflection.
 */

type Sensory = {
  /** Tiny Portuguese sensory whisper that surfaces after a lean. */
  pt: string;
  /** Soft English fallback (italic, never primary). */
  en: string;
};

type DriftScene = {
  id: string;
  videoUrl: string;
  /** Region/atmosphere echoed back at reveal — not surfaced during drift. */
  echo: string;
  /** Sensory whispers that bloom when traveller leans in. */
  whispers: Sensory[];
  /** Atmospheric register for the final composed reflection. */
  register: "atlantic" | "tiled" | "vineyard" | "table" | "wind" | "warmth";
};

const SCENES: DriftScene[] = [
  {
    id: "arrabida-coast",
    videoUrl: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    echo: "a costa baixa, sem pressa",
    whispers: [
      { pt: "o vento traz sal", en: "the wind carries salt" },
      { pt: "a água respira devagar", en: "the water breathes slowly" },
    ],
    register: "atlantic",
  },
  {
    id: "hidden-street",
    videoUrl: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    echo: "uma rua que ninguém te indicou",
    whispers: [
      { pt: "azulejos antigos, cal nas paredes", en: "old tiles, lime on the walls" },
      { pt: "passos sobre pedra húmida", en: "footsteps on damp stone" },
    ],
    register: "tiled",
  },
  {
    id: "azeitao-table",
    videoUrl: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    echo: "uma mesa preparada com tempo",
    whispers: [
      { pt: "pão partido devagar", en: "bread broken slowly" },
      { pt: "vinho da casa, copo simples", en: "house wine, a simple glass" },
    ],
    register: "table",
  },
  {
    id: "cabo-roca",
    videoUrl: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    echo: "o sítio onde a terra acaba",
    whispers: [
      { pt: "o Atlântico abre-se sem fim", en: "the Atlantic opens, endless" },
      { pt: "ninguém fala alto aqui", en: "no one speaks loudly here" },
    ],
    register: "wind",
  },
  {
    id: "arrabida-viewpoint",
    videoUrl: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    echo: "uma vista que pede silêncio",
    whispers: [
      { pt: "pinheiros, sombra fresca", en: "pines, cool shadow" },
      { pt: "luz baixa sobre a baía", en: "low light over the bay" },
    ],
    register: "vineyard",
  },
  {
    id: "sesimbra",
    videoUrl: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    echo: "um porto pequeno, real",
    whispers: [
      { pt: "barcos a regressar", en: "boats returning" },
      { pt: "cheiro a sardinha grelhada", en: "the smell of grilled sardines" },
    ],
    register: "warmth",
  },
];

/** Soft reflections composed from accumulated leans. */
const REGISTER_LINES: Record<DriftScene["register"], { title: string; subtitle: string }> = {
  atlantic: {
    title: "Um dia que respira com o Atlântico.",
    subtitle: "sem pressa, com vento salgado e horas que se alargam",
  },
  tiled: {
    title: "Um dia para perder-te de propósito.",
    subtitle: "ruas estreitas, azulejos, e silêncios que sabem a verdade",
  },
  vineyard: {
    title: "Um dia desenhado por sombra e luz.",
    subtitle: "pinheiros, vinha, e uma vista que pede que fiques",
  },
  table: {
    title: "Um dia que termina à mesa.",
    subtitle: "pão partido devagar, vinho da casa, uma conversa que se demora",
  },
  wind: {
    title: "Um dia no fim do mundo conhecido.",
    subtitle: "o cabo, o vento, e o Atlântico a abrir-se sem fim",
  },
  warmth: {
    title: "Um dia que cheira a porto.",
    subtitle: "barcos a regressar, fogo lento, e sardinha sobre brasa",
  },
};

/**
 * Compose a single reflection from the registers the traveller dwelled on.
 * If multiple registers, the strongest (most dwell time) wins, and the
 * subtitle quietly braids in a second note.
 */
function composeReflection(
  leans: Array<{ register: DriftScene["register"]; dwellMs: number }>,
): { title: string; subtitle: string } {
  if (leans.length === 0) {
    return REGISTER_LINES.atlantic;
  }
  const byRegister = new Map<DriftScene["register"], number>();
  for (const l of leans) {
    byRegister.set(l.register, (byRegister.get(l.register) ?? 0) + l.dwellMs);
  }
  const ranked = [...byRegister.entries()].sort((a, b) => b[1] - a[1]);
  const primary = REGISTER_LINES[ranked[0][0]];
  if (ranked.length < 2) return primary;
  const secondary = REGISTER_LINES[ranked[1][0]];
  // Braid: keep primary title, append the most evocative noun-phrase from
  // the secondary subtitle (everything after the first comma).
  const braid = secondary.subtitle.split(",").slice(1).join(",").trim();
  return {
    title: primary.title,
    subtitle: braid ? `${primary.subtitle} — e ${braid}` : primary.subtitle,
  };
}

interface Props {
  onExit?: () => void;
}

/** A lean is captured when the traveller stays with a scene past this threshold. */
const LEAN_THRESHOLD_MS = 3800;
/** System auto-advances if no engagement after this. */
const PASSIVE_ADVANCE_MS = 9000;
/** Auto-reveal once this many leans accumulated. */
const REVEAL_AT_LEANS = 3;

export function StudioDrift({ onExit }: Props) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [leans, setLeans] = useState<Array<{ register: DriftScene["register"]; dwellMs: number }>>([]);
  const [whisperIdx, setWhisperIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [summonVisible, setSummonVisible] = useState(false);

  const enterAtRef = useRef<number>(Date.now());
  const lingeringRef = useRef(false);
  const passiveTimerRef = useRef<number | null>(null);
  const leanTimerRef = useRef<number | null>(null);
  const summonTimerRef = useRef<number | null>(null);

  const scene = SCENES[sceneIdx % SCENES.length];

  const clearTimers = useCallback(() => {
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
    if (leanTimerRef.current) window.clearTimeout(leanTimerRef.current);
    passiveTimerRef.current = null;
    leanTimerRef.current = null;
  }, []);

  const advance = useCallback(() => {
    setSceneIdx((i) => (i + 1) % SCENES.length);
  }, []);

  // Reset per-scene timers + whispers when the scene changes.
  useEffect(() => {
    if (revealed) return;
    enterAtRef.current = Date.now();
    lingeringRef.current = false;
    setWhisperIdx(null);
    clearTimers();

    // Quiet auto-advance if the traveller doesn't engage.
    passiveTimerRef.current = window.setTimeout(() => {
      if (!lingeringRef.current) advance();
    }, PASSIVE_ADVANCE_MS);

    // Lean timer — if traveller is lingering past threshold, capture it.
    leanTimerRef.current = window.setTimeout(() => {
      if (lingeringRef.current) {
        const dwellMs = Date.now() - enterAtRef.current;
        setLeans((prev) => [...prev, { register: scene.register, dwellMs }]);
        // Surface a whisper softly after the lean is captured.
        setWhisperIdx(Math.floor(Math.random() * scene.whispers.length));
      }
    }, LEAN_THRESHOLD_MS);

    return clearTimers;
  }, [sceneIdx, scene, advance, clearTimers, revealed]);

  // Reveal trigger — system-decided once enough leans gathered.
  useEffect(() => {
    if (revealed) return;
    if (leans.length >= REVEAL_AT_LEANS) {
      const t = window.setTimeout(() => setRevealed(true), 2200);
      return () => window.clearTimeout(t);
    }
  }, [leans.length, revealed]);

  // Traveller-summoned reveal — quiet affordance appears after 18s of drift.
  useEffect(() => {
    if (revealed) return;
    summonTimerRef.current = window.setTimeout(() => setSummonVisible(true), 18000);
    return () => {
      if (summonTimerRef.current) window.clearTimeout(summonTimerRef.current);
    };
  }, [revealed]);

  // Tap/hold begins a lean. Release before threshold = no lean, scene
  // continues drifting. Holding past threshold captures the moment.
  const onPressStart = useCallback(() => {
    lingeringRef.current = true;
    // Cancel passive advance — the traveller is here, in this place.
    if (passiveTimerRef.current) window.clearTimeout(passiveTimerRef.current);
  }, []);

  const onPressEnd = useCallback(() => {
    lingeringRef.current = false;
  }, []);

  const onSceneTap = useCallback(() => {
    // Single tap on a scene that's already whispered = move to next.
    if (whisperIdx !== null) {
      advance();
    }
  }, [whisperIdx, advance]);

  const reflection = useMemo(() => composeReflection(leans), [leans]);

  if (revealed) {
    return <DriftReveal scene={scene} reflection={reflection} leans={leans} onExit={onExit} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      style={{ touchAction: "manipulation" }}
    >
      {/* Atmosphere — full-bleed scene */}
      <SceneVideo key={scene.id} src={scene.videoUrl} />

      {/* Gentle vignette so whisper text stays legible without a chatbot veil */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Invisible interaction surface — press to linger, tap to drift on */}
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

      {/* Lean indicator — a single soft gold breath that blooms when
          the traveller has been here long enough to count as a lean. */}
      <LeanBloom active={whisperIdx !== null} />

      {/* Sensory whisper — surfaces only after a lean. Portuguese first. */}
      {whisperIdx !== null && (
        <div
          className="absolute inset-x-0 bottom-[14%] z-20 flex flex-col items-center px-8 text-center pointer-events-none animate-in fade-in duration-[1400ms]"
        >
          <span
            aria-hidden="true"
            className="mb-4 block h-px w-6 bg-[color:var(--gold)]/70"
          />
          <p
            className="italic text-[19px] sm:text-[22px] leading-[1.45] text-[color:var(--ivory)] max-w-[24ch]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 22px rgba(0,0,0,0.7)",
            }}
          >
            {scene.whispers[whisperIdx].pt}
          </p>
        </div>
      )}

      {/* Quiet leans dial — three near-invisible marks in the top edge.
          No "step 2 of 6". Just three breaths filling, slowly. */}
      <div
        aria-hidden="true"
        className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex gap-2.5"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-[3px] w-5 rounded-full transition-all duration-700"
            style={{
              background:
                i < leans.length
                  ? "color-mix(in oklab, var(--gold) 85%, transparent)"
                  : "color-mix(in oklab, var(--ivory) 22%, transparent)",
            }}
          />
        ))}
      </div>

      {/* Traveller-summoned reveal — quiet, always-present once earned. */}
      {summonVisible && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute bottom-6 right-6 z-30 italic text-[13px] tracking-[0.04em] text-[color:var(--ivory)]/65 hover:text-[color:var(--ivory)]/95 transition-colors duration-500 animate-in fade-in duration-[1800ms]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 1px 12px rgba(0,0,0,0.6)",
          }}
        >
          quando estiveres pronto
        </button>
      )}

      {/* Exit — a single hairline back, top-left, no chrome. */}
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label="Leave the Studio"
          className="absolute top-5 left-5 z-30 text-[12px] tracking-[0.08em] uppercase text-[color:var(--ivory)]/55 hover:text-[color:var(--ivory)]/90 transition-colors"
          style={{ fontFamily: "Inter, system-ui, sans-serif", textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
        >
          voltar
        </button>
      )}
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
      style={{ filter: "saturate(0.92) contrast(1.02)" }}
    />
  );
}

function LeanBloom({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-[15] pointer-events-none animate-in fade-in duration-[1600ms]"
      style={{
        background:
          "radial-gradient(ellipse at 50% 60%, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 55%)",
        mixBlendMode: "soft-light",
      }}
    />
  );
}

function DriftReveal({
  scene,
  reflection,
  leans,
  onExit,
}: {
  scene: DriftScene;
  reflection: { title: string; subtitle: string };
  leans: Array<{ register: DriftScene["register"]; dwellMs: number }>;
  onExit?: () => void;
}) {
  // Choose the scene the traveller leaned into most as the reveal backdrop.
  const dominantRegister = useMemo(() => {
    if (leans.length === 0) return scene.register;
    const counts = new Map<DriftScene["register"], number>();
    for (const l of leans) counts.set(l.register, (counts.get(l.register) ?? 0) + l.dwellMs);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [leans, scene.register]);

  const backdrop = SCENES.find((s) => s.register === dominantRegister) ?? scene;
  const echoes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const l of leans) {
      const s = SCENES.find((x) => x.register === l.register);
      if (s && !seen.has(s.echo)) {
        seen.add(s.echo);
        out.push(s.echo);
      }
    }
    return out.slice(0, 3);
  }, [leans]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <SceneVideo src={backdrop.videoUrl} />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-7 text-center">
        <span aria-hidden="true" className="mb-7 block h-px w-10 bg-[color:var(--gold)]/75" />

        <h2
          className="text-[28px] sm:text-[38px] font-semibold leading-[1.05] tracking-[-0.012em] text-[color:var(--ivory)] max-w-[22ch] animate-in fade-in slide-in-from-bottom-2 duration-[1400ms]"
          style={{
            fontFamily: "Montserrat, system-ui, sans-serif",
            textShadow: "0 1px 22px rgba(0,0,0,0.6)",
          }}
        >
          {reflection.title}
        </h2>

        <p
          className="mt-5 italic text-[17px] sm:text-[20px] leading-[1.5] text-[color:var(--ivory)]/90 max-w-[34ch] animate-in fade-in duration-[2000ms]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            textShadow: "0 1px 18px rgba(0,0,0,0.55)",
          }}
        >
          {reflection.subtitle}
        </p>

        {echoes.length > 0 && (
          <ul
            className="mt-10 flex flex-col gap-2 text-[14px] tracking-[0.02em] text-[color:var(--ivory)]/70 animate-in fade-in duration-[2400ms]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 14px rgba(0,0,0,0.55)",
            }}
          >
            {echoes.map((e) => (
              <li key={e} className="italic">
                {e}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onExit}
          className="mt-12 text-[12px] tracking-[0.14em] uppercase text-[color:var(--ivory)]/75 hover:text-[color:var(--ivory)] transition-colors duration-500 border-b border-[color:var(--gold)]/60 hover:border-[color:var(--gold)] pb-1"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          ler isto como uma jornada
        </button>
      </div>
    </div>
  );
}
