import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, Share2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createJourney } from "@/server/builderJourneys.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { StudioStop } from "@/hooks/useStudioState";
import type { Pace } from "@/components/builder/types";
import { fmtMinutes } from "@/components/builder/types";
import { regionLabel } from "@/hooks/useStudioState";
import type { BuilderRegionKey } from "@/components/builder/RegionStep";

/**
 * Closing scene — the editorial "memory card". Replaces ReviewScreen entirely.
 * Auto-generates a share token on mount; offers copy/share/print + return.
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

function memoryPhrase(stop: StudioStop, index: number): string {
  const tag = stop.tag?.trim().toLowerCase();
  const byTag: Record<string, string> = {
    wine: "Um momento para provar devagar.",
    gastronomy: "Uma mesa para ficar sem pressa.",
    coast: "Uma pausa junto à luz do mar.",
    nature: "Um intervalo para respirar fundo.",
    heritage: "Uma entrada discreta na história.",
    wellness: "Um espaço aberto para silêncio.",
  };
  if (tag && byTag[tag]) return byTag[tag];
  return [
    "Um momento que se revela sem pressa.",
    "Uma sensação que guia o próximo gesto.",
    "Uma pausa escolhida pelo ritmo da viagem.",
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="A tua história"
      className="absolute inset-0 z-50 grid place-items-center px-4 py-8 overflow-y-auto"
      style={{ background: "oklch(0.15 0.02 240 / 0.7)", backdropFilter: "blur(6px)" }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-[color:var(--ivory)]/15 text-[color:var(--ivory)] hover:bg-[color:var(--ivory)]/25 transition-colors"
        aria-label="Fechar"
      >
        <X size={18} />
      </button>
      <article className="w-full max-w-xl bg-[color:var(--ivory)] rounded-[4px] shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="px-6 sm:px-8 py-7 border-b border-[color:var(--charcoal)]/10">
          <p className="text-[10px] uppercase tracking-[0.32em] font-bold text-[color:var(--gold)]">
            A tua história
          </p>
          <h2
            className="mt-3 font-serif italic text-[24px] sm:text-[30px] leading-[1.2] text-[color:var(--charcoal)]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {chapter ?? `${regionLabel(regionKey)}, em ${stops.length} momentos.`}
          </h2>
          <p className="mt-3 text-[12px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/55">
            {regionLabel(regionKey)} · {fmtMinutes(totalMinutes)} · ritmo {pace === "relaxed" ? "tranquilo" : pace === "full" ? "pleno" : "equilibrado"}
          </p>
        </header>
        <ol className="divide-y divide-[color:var(--charcoal)]/8">
          {stops.map((s, i) => (
            <li key={s.key} className="px-6 sm:px-8 py-4 flex items-start gap-4">
              <span
                className="font-serif italic text-[color:var(--gold)] text-[22px] leading-none min-w-[24px]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[color:var(--charcoal)] leading-tight">
                  Momento {i + 1}
                </p>
                <p
                  className="mt-1 text-[12.5px] italic text-[color:var(--charcoal)]/65 leading-snug"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {memoryPhrase(s, i)}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {farewell && (
          <p
            className="px-6 sm:px-8 py-5 font-serif italic text-[13.5px] text-[color:var(--charcoal)]/70 leading-relaxed border-t border-[color:var(--charcoal)]/10"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {farewell}
          </p>
        )}
        <footer className="px-6 sm:px-8 py-5 bg-[color:var(--sand)]/40 border-t border-[color:var(--charcoal)]/10">
          {busy ? (
            <p className="inline-flex items-center gap-2 text-[12px] text-[color:var(--charcoal)]/65 font-medium">
              <Loader2 size={14} className="animate-spin" />
              A guardar a tua história…
            </p>
          ) : error ? (
            <p className="text-[12px] text-red-700/80">{error}</p>
          ) : shareUrl ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-[2px] border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={nativeShare}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-[2px] border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
              >
                <Share2 size={13} />
                Partilhar
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-[2px] border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
              >
                <ExternalLink size={13} />
                Abrir
              </a>
              <a
                href={`${shareUrl}?print=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-[2px] border border-[color:var(--gold)]/60 bg-[color:var(--gold)]/10 px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:bg-[color:var(--gold)]/20 transition-colors"
              >
                <Download size={13} />
                PDF
              </a>
            </div>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
