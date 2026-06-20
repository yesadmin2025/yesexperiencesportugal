import { useCallback, useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, Share2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createJourney } from "@/lib/builderJourneys.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { RouteUI, RoutedStopUI } from "./types";

interface Props {
  route: RouteUI;
  stops: RoutedStopUI[];
  guests: number;
}

/**
 * Export + share panel — generates a public landing URL for the current
 * itinerary, lets the guest copy/share/print it as a PDF-ready document.
 */
export function ShareExport({ route, stops, guests }: Props) {
  const sessionId = useBuilderSessionId();
  const create = useServerFn(createJourney);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (!shareToken || typeof window === "undefined") return null;
    return `${window.location.origin}/i/${shareToken}`;
  }, [shareToken]);

  const generate = useCallback(async () => {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await create({
        data: {
          sessionId,
          state: {
            days: [
              {
                id: "d1",
                regionKey: route.region.key,
                stopKeys: stops.map((s) => s.key),
                label: route.region.label,
              },
            ],
            activeDayId: "d1",
            guests,
            pace: route.pace,
          },
        },
      });
      setShareToken(res.shareToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o link.");
    } finally {
      setBusy(false);
    }
  }, [create, sessionId, route, stops, guests]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  const nativeShare = useCallback(async () => {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Roteiro · ${route.region.label}`,
          text: "O meu roteiro YES Experiences Portugal",
          url: shareUrl,
        });
      } catch {
        /* user dismissed */
      }
    } else {
      void copyLink();
    }
  }, [shareUrl, route.region.label, copyLink]);

  const openLanding = useCallback(() => {
    if (!shareUrl) return;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [shareUrl]);

  return (
    <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
        Exportar & partilhar
      </p>
      <p className="mt-2 text-[12.5px] leading-snug text-[color:var(--charcoal)]/70">
        Gera uma página elegante do teu roteiro para partilhar com quem viaja contigo, ou exporta
        como PDF.
      </p>

      {!shareToken && (
        <button
          type="button"
          onClick={generate}
          disabled={busy || !sessionId}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)] bg-[color:var(--charcoal)] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ivory)] transition-colors hover:bg-[color:var(--teal)] disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" />A gerar…
            </>
          ) : (
            <>
              <Share2 size={14} />
              Gerar página partilhável
            </>
          )}
        </button>
      )}

      {error && <p className="mt-3 text-[11.5px] text-red-700/80">{error}</p>}

      {shareToken && shareUrl && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--sand)]/40 px-3 py-2">
            <span className="truncate text-[11.5px] font-mono text-[color:var(--charcoal)]/80">
              {shareUrl}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center justify-center gap-1.5 rounded-[2px] border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={nativeShare}
              className="inline-flex items-center justify-center gap-1.5 rounded-[2px] border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
            >
              <Share2 size={13} />
              Partilhar
            </button>
            <button
              type="button"
              onClick={openLanding}
              className="inline-flex items-center justify-center gap-1.5 rounded-[2px] border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
            >
              <ExternalLink size={13} />
              Abrir
            </button>
            <a
              href={`${shareUrl}?print=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-[2px] border border-[color:var(--gold)]/60 bg-[color:var(--gold)]/10 px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[color:var(--charcoal)] hover:bg-[color:var(--gold)]/20 transition-colors"
            >
              <Download size={13} />
              PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
