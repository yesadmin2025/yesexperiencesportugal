import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createJourney } from "@/server/builderJourneys.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { StudioStop } from "@/hooks/useStudioState";
import type { Pace } from "@/components/builder/types";
import { fmtMinutes } from "@/components/builder/types";
import { regionLabel } from "@/hooks/useStudioState";
import type { BuilderRegionKey } from "@/components/builder/RegionStep";

/**
 * Closing scene — cinematic "Memory Card" that doubles as the booking close.
 *
 * Now that the traveller has shaped their journey, this is where:
 *   1. Real stop names finally appear (they're committed; names help reserve)
 *   2. A single, dominant primary CTA invites them to reserve instantly
 *   3. Trust signals reduce hesitation (instant confirmation, local guide, flex cancel)
 *   4. WhatsApp is a secondary fallback for high-touch travellers
 *
 * Designed for conversion without breaking the cinematic spell.
 */

interface Props {
  stops: StudioStop[];
  regionKey: BuilderRegionKey;
  pace: Pace;
  totalMinutes: number;
  chapter: string | null;
  farewell: string | null;
  onClose: () => void;
}

const HERO_CLIP = "/__l5e/assets-v1/501885a8-7399-4591-99fc-1c410b24c428/scene-route-portugal.mp4";

const WHATSAPP_NUMBER = "351912345678"; // placeholder — replace when live

function emotionalMoment(stop: StudioStop, index: number): string {
  const tag = stop.tag?.trim().toLowerCase();
  const byTag: Record<string, string> = {
    wine: "Provar devagar, sem pressa.",
    gastronomy: "Sentar à mesa com tempo.",
    coast: "Seguir a luz junto ao mar.",
    nature: "Respirar onde tudo abranda.",
    heritage: "Entrar numa história antiga.",
    wellness: "Abrir espaço para silêncio.",
  };
  if (tag && byTag[tag]) return byTag[tag];
  return [
    "Um momento que se revela sem pressa.",
    "Uma pausa escolhida pelo ritmo da viagem.",
    "Uma sensação que guia o próximo gesto.",
  ][index % 3];
}

export function MemoryCard({
  stops,
  regionKey,
  pace,
  totalMinutes,
  chapter,
  farewell,
  onClose,
}: Props) {
  const sessionId = useBuilderSessionId();
  const create = useServerFn(createJourney);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reserving, setReserving] = useState(false);

  const shareUrl = useMemo(() => {
    if (!token || typeof window === "undefined") return null;
    return `${window.location.origin}/i/${token}`;
  }, [token]);

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
          title: `Roteiro · ${regionLabel(regionKey)}`,
          text: chapter ?? "O meu roteiro YES Experiences Portugal",
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
    // For now, route the user to the share page where booking flow lives.
    // Once live Stripe embedded checkout is wired, swap this for the
    // EmbeddedCheckout call so the user never leaves the cinematic world.
    if (shareUrl) {
      window.location.href = `${shareUrl}?reserve=1`;
    } else {
      setReserving(false);
    }
  };

  const handleWhatsApp = () => {
    const summary = stops
      .map((s, i) => `${i + 1}. ${s.label}`)
      .join("%0A");
    const text = encodeURIComponent(
      `Olá! Gostava de reservar este roteiro em ${regionLabel(regionKey)}:`,
    );
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}%0A%0A${summary}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="A tua história"
      className="absolute inset-0 z-50 overflow-y-auto animate-in fade-in duration-700"
      style={{ background: "oklch(0.12 0.02 240 / 0.85)", backdropFilter: "blur(10px)" }}
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-[color:var(--ivory)]/15 text-[color:var(--ivory)] hover:bg-[color:var(--ivory)]/25 backdrop-blur transition-colors"
        aria-label="Fechar"
      >
        <X size={18} />
      </button>

      <article className="w-full max-w-xl mx-auto bg-[color:var(--ivory)] rounded-[6px] shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden my-6 sm:my-10 mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-[700ms] ease-out">
        {/* Cinematic hero */}
        <div className="relative h-[200px] sm:h-[260px] overflow-hidden bg-[color:var(--charcoal)]">
          <video
            aria-hidden="true"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "saturate(0.86) contrast(1.04) brightness(0.78)" }}
          >
            <source src={HERO_CLIP} type="video/mp4" />
          </video>
          <span className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal)] via-[color:var(--charcoal)]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <p className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.34em] font-bold text-[color:var(--gold)]">
              <Sparkles size={11} />
              A tua viagem
            </p>
            <h2
              className="mt-2 font-serif italic text-[22px] sm:text-[28px] leading-[1.18] text-[color:var(--ivory)] max-w-[26ch]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {chapter ?? `${regionLabel(regionKey)}, em ${stops.length} momentos.`}
            </h2>
            <p className="mt-2 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)]/85">
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} className="text-[color:var(--gold)]" />
                {regionLabel(regionKey)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} className="text-[color:var(--gold)]" />
                {fmtMinutes(totalMinutes)}
              </span>
            </p>
          </div>
        </div>

        {/* Moments with real names */}
        <ol className="divide-y divide-[color:var(--charcoal)]/8">
          {stops.map((s, i) => (
            <li key={s.key} className="px-5 sm:px-7 py-4 flex items-start gap-4">
              <span
                className="font-serif italic text-[color:var(--gold)] text-[22px] leading-none min-w-[24px] pt-0.5"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[color:var(--charcoal)] leading-tight">
                  {s.label}
                </p>
                <p
                  className="mt-1 text-[12.5px] italic text-[color:var(--charcoal)]/65 leading-snug"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {s.blurb ?? emotionalMoment(s, i)}
                </p>
                <p className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/45 font-semibold">
                  {fmtMinutes(s.duration_minutes)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {farewell && farewell !== chapter && (
          <p
            className="px-5 sm:px-7 py-4 font-serif italic text-[13px] text-[color:var(--charcoal)]/70 leading-relaxed border-t border-[color:var(--charcoal)]/10"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {farewell}
          </p>
        )}

        {/* Trust row */}
        <ul className="px-5 sm:px-7 py-3 bg-[color:var(--sand)]/40 border-t border-[color:var(--charcoal)]/10 grid grid-cols-3 gap-2 text-center">
          <li className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[color:var(--charcoal)]/75 leading-tight">
            <ShieldCheck size={14} className="mx-auto mb-1 text-[color:var(--teal)]" />
            Confirmação imediata
          </li>
          <li className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[color:var(--charcoal)]/75 leading-tight">
            <Sparkles size={14} className="mx-auto mb-1 text-[color:var(--gold)]" />
            Guia local
          </li>
          <li className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[color:var(--charcoal)]/75 leading-tight">
            <Check size={14} className="mx-auto mb-1 text-[color:var(--teal)]" />
            Cancelamento flexível
          </li>
        </ul>

        {/* Primary CTA — single dominant action */}
        <div className="px-5 sm:px-7 py-5 bg-[color:var(--ivory)] border-t border-[color:var(--charcoal)]/10 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleReserve}
            disabled={busy || reserving || !shareUrl}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-[3px] bg-[color:var(--charcoal)] hover:bg-[color:var(--teal)] disabled:bg-[color:var(--charcoal)]/50 text-[color:var(--ivory)] px-5 py-3 text-[13px] uppercase tracking-[0.22em] font-bold transition-colors shadow-[0_10px_28px_rgba(0,0,0,0.3)]"
          >
            {reserving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-[color:var(--gold)]" />}
            {reserving ? "A abrir reserva…" : "Reservar agora"}
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[3px] border border-[color:var(--charcoal)]/20 bg-transparent text-[color:var(--charcoal)] px-4 py-2 text-[11.5px] uppercase tracking-[0.2em] font-semibold hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
          >
            <MessageCircle size={13} />
            Falar com um concierge
          </button>
        </div>

        {/* Share row — secondary */}
        <footer className="px-5 sm:px-7 py-4 bg-[color:var(--sand)]/30 border-t border-[color:var(--charcoal)]/10">
          {busy ? (
            <p className="inline-flex items-center gap-2 text-[11.5px] text-[color:var(--charcoal)]/65 font-medium">
              <Loader2 size={13} className="animate-spin" />
              A guardar a tua história…
            </p>
          ) : error ? (
            <p className="text-[11.5px] text-red-700/80">{error}</p>
          ) : shareUrl ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-[2px] bg-transparent px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)]/70 hover:text-[color:var(--charcoal)] transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copiado" : "Copiar link"}
              </button>
              <button
                type="button"
                onClick={nativeShare}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-[2px] bg-transparent px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)]/70 hover:text-[color:var(--charcoal)] transition-colors"
              >
                <Share2 size={12} />
                Partilhar
              </button>
            </div>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
