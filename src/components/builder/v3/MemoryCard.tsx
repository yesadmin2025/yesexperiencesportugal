import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Share2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createJourney } from "@/server/builderJourneys.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { StudioStop } from "@/hooks/useStudioState";
import type { Pace } from "@/components/builder/types";
import { regionLabel } from "@/hooks/useStudioState";
import type { BuilderRegionKey } from "@/components/builder/RegionStep";
import type { StudioProposal } from "@/components/builder/types";

/**
 * MemoryCard — the emotional landing of the Studio (the reveal).
 *
 * Built as a three-layer cinematic unfolding, NOT a generated trip output:
 *
 *   Layer 1 · Arrival (0 → ~1.6s)
 *     Full-bleed hero · proposal title · proposal subtitle · region whisper.
 *     Nothing else. Editorial pause — opening a luxury travel journal spread.
 *
 *   Layer 2 · Editorial timeline (~1.6 → ~3.4s)
 *     Time-coded sensory lines fade in one by one — typography only, no cards,
 *     no borders, no icons. Real stop labels are whispered below in small caps
 *     so committed names exist for booking without breaking the editorial spell.
 *
 *   Layer 3 · Subtle structure (~3.4s+)
 *     A single confident CTA ("When you're ready") and quiet secondary text
 *     links (concierge · view on the map · share). No trust grid, no chips,
 *     no dashboard chrome. The interface disappears as confidence rises.
 *
 * Map remains hidden inside this scene by design — "View on the map" closes
 * the card to return to the living Studio map (logistics brain stays away
 * until the traveller asks for it).
 */

interface Props {
  stops: StudioStop[];
  regionKey: BuilderRegionKey;
  pace: Pace;
  totalMinutes: number;
  /** Optional region/chapter fallback subtitle if no proposal exists. */
  chapter: string | null;
  /** Optional editorial closer line (currently mirrors chapter). */
  farewell: string | null;
  /** Editorial identity composed once, near the reveal. Source of truth. */
  proposal: StudioProposal | null;
  onClose: () => void;
}

const HERO_CLIP = "/__l5e/assets-v1/501885a8-7399-4591-99fc-1c410b24c428/scene-route-portugal.mp4";

const WHATSAPP_NUMBER = "351912345678"; // placeholder — replace when live

/* ── Editorial timeline helpers ─────────────────────────────────────────── */

/** Sensory lines per intention tag — Portuguese, editorial, sensory anchor. */
const SENSORY_BY_TAG: Record<string, string> = {
  wine: "uma mesa longa à sombra das vinhas, vinho a chegar devagar",
  gastronomy: "pão partido sem pressa, conversa que estica a tarde",
  coast: "a luz a virar prata sobre o Atlântico, sem pressa de partir",
  nature: "vento dos pinhais, pedra fresca, o tempo a abrandar",
  heritage: "azulejos ainda mornos da manhã, a cidade a acordar devagar",
  wellness: "silêncio, linho, o corpo a encontrar o seu próprio ritmo",
  romantic: "um pátio com um único limoeiro, candeeiros baixos",
  family: "uma mesa generosa, pratos a passar de mão em mão",
};
const SENSORY_FALLBACKS = [
  "uma travessia tranquila, o rio largo na luz da tarde",
  "cobre e barro à mesa, a tarde a estender-se",
  "sombra de figueiras, conversa sem hora marcada",
  "sardinhas em papel oleado, o cais já fresco",
];

function sensoryLine(stop: StudioStop, blurb: string | null, i: number): string {
  // Prefer the curated blurb when it exists — it's the editorial truth.
  if (blurb && blurb.trim().length > 0) return blurb.trim();
  const tag = stop.tag?.trim().toLowerCase();
  if (tag && SENSORY_BY_TAG[tag]) return SENSORY_BY_TAG[tag];
  return SENSORY_FALLBACKS[i % SENSORY_FALLBACKS.length];
}

/** Compute timeline anchors starting at 09:30, +20min drive between stops. */
function buildTimeline(stops: StudioStop[]): { time: string; stop: StudioStop }[] {
  let cursor = 9 * 60 + 30;
  return stops.map((stop, i) => {
    if (i > 0) cursor += 20;
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    const time = `${hh}:${mm}`;
    cursor += stop.duration_minutes;
    return { time, stop };
  });
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function MemoryCard({
  stops,
  regionKey,
  pace,
  chapter,
  proposal,
  onClose,
}: Props) {
  const sessionId = useBuilderSessionId();
  const create = useServerFn(createJourney);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [layer, setLayer] = useState<1 | 2 | 3>(1);
  const [shareOpen, setShareOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return null;
    return `${window.location.origin}/i/${token}`;
  }, [token]);

  const timeline = useMemo(() => buildTimeline(stops), [stops]);

  // Title + subtitle — proposal is the source of truth; chapter is the
  // calm editorial fallback only when no proposal has been composed.
  const title = proposal?.title ?? chapter ?? regionLabel(regionKey);
  const subtitle =
    proposal?.subtitle ??
    `${regionLabel(regionKey)}, em ${stops.length} momentos.`;

  // ── Layered unfold ────────────────────────────────────────────────────
  // Beat 1 (Arrival): ~2.2s of stillness — proposal identity alone.
  // Beat 2 (The day emerges): editorial timeline fades in line by line.
  // Beat 3 (Desire): single confident CTA + quiet secondary links.
  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setLayer(3);
      return;
    }
    const t2 = window.setTimeout(() => setLayer((l) => (l < 2 ? 2 : l)), 2200);
    const t3 = window.setTimeout(
      () => setLayer((l) => (l < 3 ? 3 : l)),
      2200 + 260 * Math.max(timeline.length, 1) + 700,
    );
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [timeline.length]);

  // ── Persist the journey (silent, for share + reserve) ────────────────
  useEffect(() => {
    if (!sessionId || stops.length === 0) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    create({
      data: {
        sessionId,
        state: {
          days: [
            {
              id: "d1",
              regionKey,
              stopKeys: stops.map((s) => s.key),
              label: regionLabel(regionKey),
            },
          ],
          activeDayId: "d1",
          guests: 2,
          pace,
        },
      },
    })
      .then((r) => {
        if (cancelled) return;
        setToken(r.shareToken);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Não foi possível guardar a história.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, create, stops, regionKey, pace]);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const nativeShare = async () => {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: title,
          text: subtitle,
          url: shareUrl,
        });
      } catch {
        /* user dismissed */
      }
    } else {
      void copy();
    }
  };

  const handleReserve = () => {
    setReserving(true);
    if (shareUrl) {
      window.location.href = `${shareUrl}?reserve=1`;
    } else {
      setReserving(false);
    }
  };


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-50 overflow-y-auto animate-in fade-in duration-[900ms]"
      style={{ background: "oklch(0.10 0.02 240 / 0.92)" }}
    >
      {/* Quiet close — top right, low contrast, gets out of the way */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-[color:var(--ivory)]/10 text-[color:var(--ivory)]/70 hover:bg-[color:var(--ivory)]/20 hover:text-[color:var(--ivory)] backdrop-blur transition-colors"
        aria-label="Fechar"
      >
        <X size={18} />
      </button>

      {/* ── LAYER 1 · ARRIVAL ───────────────────────────────────────────
          Full-bleed hero with proposal identity. Held in silence for
          ~1.6s before the timeline emerges. */}
      <section
        className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Cinematic backdrop */}
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          style={{ filter: "saturate(0.86) contrast(1.04) brightness(0.62)" }}
        >
          <source src={HERO_CLIP} type="video/mp4" />
        </video>
        {/* Deep gradient veil — bottom-weighted so copy sits in calm space */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[color:var(--charcoal)]/55 via-[color:var(--charcoal)]/45 to-[color:var(--charcoal)]"
        />

        {/* Proposal identity — the editorial spread */}
        <div className="relative z-10 w-full max-w-2xl px-6 pt-24 pb-10 flex flex-col items-center text-center gap-6 animate-in fade-in slide-in-from-bottom-2 duration-[1200ms] ease-out">
          <span
            aria-hidden="true"
            className="block h-px w-10 bg-[color:var(--gold)]/75"
          />
          <p
            className="text-[10px] uppercase tracking-[0.34em] font-bold text-[color:var(--gold)]"
            style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
          >
            {regionLabel(regionKey)}
          </p>
          <h1
            className="text-[30px] sm:text-[42px] font-semibold leading-[1.04] tracking-[-0.014em] text-[color:var(--ivory)] max-w-[20ch] text-balance"
            style={{
              fontFamily: "Montserrat, system-ui, sans-serif",
              textShadow: "0 2px 26px rgba(0,0,0,0.5)",
            }}
          >
            {title}
          </h1>
          <p
            className="italic text-[16.5px] sm:text-[20px] leading-[1.5] text-[color:var(--ivory)]/88 max-w-[34ch] text-balance"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: "0 1px 18px rgba(0,0,0,0.5)",
            }}
          >
            {subtitle}
          </p>
          {/* Quiet hairline anchor */}
          <span
            aria-hidden="true"
            className="block h-px w-6 bg-[color:var(--ivory)]/30 mt-2"
          />
        </div>

        {/* ── LAYER 2 · THE DAY EMERGES ───────────────────────────────
            Editorial sequencing. No cards, no borders, no tag pills,
            no tourism metadata. Serif numbering, restrained spacing,
            atmospheric rhythm. Reads like a travel essay. */}
        {timeline.length > 0 && (
          <ol
            className={`relative z-10 w-full max-w-xl px-7 sm:px-10 pb-16 flex flex-col gap-11 transition-opacity duration-[1400ms] ${
              layer >= 2 ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {timeline.map(({ time, stop }, i) => (
              <li
                key={stop.key}
                className="grid grid-cols-[58px_1fr] gap-x-5 sm:gap-x-7 transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity"
                style={{
                  opacity: layer >= 2 ? 1 : 0,
                  transform: layer >= 2 ? "translateY(0)" : "translateY(8px)",
                  transitionDelay: layer >= 2 ? `${i * 260}ms` : "0ms",
                }}
              >
                <span
                  className="italic text-[15px] sm:text-[16px] leading-[1.2] text-[color:var(--ivory)]/55 pt-[3px] tabular-nums"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  aria-hidden="true"
                >
                  {time}
                </span>
                <p
                  className="italic text-[17.5px] sm:text-[20px] leading-[1.5] text-[color:var(--ivory)]/92 text-balance"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {sensoryLine(stop, stop.blurb, i)}
                </p>
              </li>
            ))}
          </ol>
        )}

        {/* ── LAYER 3 · SUBTLE STRUCTURE ──────────────────────────────
            Single confident CTA + quiet secondary links. No trust grid,
            no chips, no dashboard chrome. */}
        <div
          className={`relative z-10 w-full max-w-md px-6 pb-[max(env(safe-area-inset-bottom),2rem)] flex flex-col items-center gap-5 transition-all duration-[900ms] ease-out ${
            layer >= 3
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3 pointer-events-none"
          }`}
        >
          <span
            aria-hidden="true"
            className="block h-px w-8 bg-[color:var(--ivory)]/25 mb-2"
          />

          <button
            type="button"
            onClick={handleReserve}
            disabled={busy || reserving || !shareUrl}
            className="w-full inline-flex items-center justify-center min-h-[54px] rounded-[2px] bg-[color:var(--ivory)] hover:bg-[color:var(--gold-soft)] disabled:bg-[color:var(--ivory)]/60 disabled:cursor-wait text-[color:var(--charcoal)] px-6 py-3 text-[12.5px] uppercase tracking-[0.28em] font-bold transition-colors shadow-[0_14px_38px_rgba(0,0,0,0.35)]"
            style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
          >
            {reserving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                A abrir
              </span>
            ) : busy ? (
              <span className="inline-flex items-center gap-2 text-[color:var(--charcoal)]/55">
                <Loader2 size={14} className="animate-spin" />
                A guardar
              </span>
            ) : (
              "Quando estiveres pronto"
            )}
          </button>

          {/* Quiet secondary actions — text links only, reduced to two.
              The concierge path stays available elsewhere; the reveal is
              not the moment for visible alternatives. */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] uppercase tracking-[0.26em] font-semibold text-[color:var(--ivory)]/55 hover:text-[color:var(--ivory)] transition-colors"
              style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
            >
              Ver o trajeto
            </button>
            <button
              type="button"
              onClick={() => setShareOpen((o) => !o)}
              className="text-[11px] uppercase tracking-[0.26em] font-semibold text-[color:var(--ivory)]/40 hover:text-[color:var(--ivory)]/80 transition-colors"
              style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
              aria-expanded={shareOpen}
            >
              Guardar para mais tarde
            </button>
          </div>

          {/* Share drawer — only appears on explicit request */}
          {shareOpen && (
            <div className="w-full pt-2 flex items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-1 duration-500">
              {busy ? (
                <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[color:var(--ivory)]/55">
                  <Loader2 size={12} className="animate-spin" />
                  A guardar
                </span>
              ) : error ? (
                <span className="text-[11px] tracking-[0.2em] uppercase text-red-300/80">
                  {error}
                </span>
              ) : shareUrl ? (
                <>
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--ivory)]/70 hover:text-[color:var(--ivory)] transition-colors"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copiado" : "Copiar link"}
                  </button>
                  <span aria-hidden className="h-3 w-px bg-[color:var(--ivory)]/20" />
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--ivory)]/70 hover:text-[color:var(--ivory)] transition-colors"
                  >
                    <Share2 size={12} />
                    Partilhar
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
