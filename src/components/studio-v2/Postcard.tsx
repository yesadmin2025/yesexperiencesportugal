/**
 * Studio v2 — Postcard from your day.
 *
 * Triggered ONCE, after MapReveal collapses, before the user lands on the
 * editable itinerary. The role is desire + keepsake + viral surface — a
 * single cinematic frame that the traveller can keep, share or carry
 * forward. Not a configurator screen.
 *
 * Composition (Studio philosophy: restraint > features):
 *   eyebrow ──── A postcard from your day
 *   hero image (real atmosphere, soft ken-burns, gold rule)
 *   italic headline   ─ {Name}'s Portugal
 *                       — {regional whisper}
 *   three lines        sequenced narrative (storyFinalLines)
 *   stops list         numbered, hair-thin gold connector
 *   actions            Share · WhatsApp · Continue
 *   closer             "Yours to keep. Yours to share."
 *
 * No parallax. No animated blobs. Motion ≤ 220ms outside the
 * sequenced-reveal cadence. Reduced-motion: instant reveal, no transform.
 * A11y: dialog, ESC closes, primary CTA focus-visible, 44×44 hit areas.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, Share2, X } from "lucide-react";

interface PostcardStop {
  key: string;
  label: string;
  duration_minutes?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  /** Hero atmosphere image — real photography from INTENT_IMAGE. */
  hero?: { src: string; alt: string };
  /** Eyebrow + sequenced lines + closer (italic Georgia). */
  eyebrow?: string;
  headlineOwner?: string;          // "Your" | "Maria's"
  headlineWhisper: string;         // "Arrábida, the Atlantic close enough to taste"
  lines: string[];                 // storyFinalLines() output
  closer?: string;
  stops: PostcardStop[];
  /** Invitation URL for share. May be null while the session is being created. */
  shareUrl: string | null;
  /** WhatsApp deep-link href for the local-designer hand-off. */
  whatsappHref: string;
  /** Analytics hook. */
  onShare?: (channel: "native" | "copy" | "whatsapp") => void;
}

export function Postcard({
  open, onClose, onContinue,
  hero,
  eyebrow = "A postcard from your day",
  headlineOwner = "Your",
  headlineWhisper,
  lines,
  closer = "Yours to keep. Yours to share.",
  stops,
  shareUrl,
  whatsappHref,
  onShare,
}: Props) {
  const [phase, setPhase] = useState<"hidden" | "in" | "shown" | "out">("hidden");
  const [visibleLines, setVisibleLines] = useState(0);
  const [copied, setCopied] = useState(false);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!open) { setPhase("hidden"); setVisibleLines(0); closedRef.current = false; return; }
    closedRef.current = false;
    setPhase("in");
    setVisibleLines(0);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const inMs = reduced ? 0 : 480;
    const t1 = window.setTimeout(() => setPhase("shown"), inMs);
    const timers: number[] = [];
    if (reduced) {
      setVisibleLines(lines.length);
    } else {
      lines.forEach((_, i) => {
        timers.push(window.setTimeout(
          () => setVisibleLines((v) => Math.max(v, i + 1)),
          inMs + 320 + i * 720,
        ));
      });
    }
    return () => {
      window.clearTimeout(t1);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [open, lines]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    setPhase("out");
    window.setTimeout(onClose, 360);
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    const title = "A day in Portugal — drafted for me";
    const text = `${headlineOwner} Portugal — ${headlineWhisper}.`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> })
          .share({ title, text, url: shareUrl });
        onShare?.("native");
        return;
      }
    } catch { /* fall through to copy */ }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onShare?.("copy");
      window.setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  };

  if (!open && phase === "hidden") return null;
  const visible = phase === "in" || phase === "shown";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="A postcard from your day"
      className="fixed inset-0 z-[125] overflow-y-auto"
      style={{
        background: "var(--ivory)",
        opacity: visible ? 1 : 0,
        transition: "opacity 460ms cubic-bezier(.22,.61,.36,1)",
      }}
    >
      {/* Dismiss — discreet, top-right, 44×44 */}
      <button
        type="button"
        onClick={close}
        aria-label="Close postcard"
        className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "color-mix(in oklab, var(--charcoal) 6%, transparent)",
          color: "var(--charcoal)",
        }}
      >
        <X className="h-4 w-4" />
      </button>

      <article
        className="mx-auto flex w-full max-w-[640px] flex-col px-6 pb-10 pt-14"
        style={{
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "transform 520ms cubic-bezier(.22,.61,.36,1)",
        }}
      >
        {/* Eyebrow */}
        <p
          className="text-center text-[10.5px] font-bold uppercase tracking-[0.36em]"
          style={{ color: "var(--gold)" }}
        >
          {eyebrow}
        </p>

        {/* Hero */}
        {hero && (
          <div
            className="relative mt-7 overflow-hidden"
            style={{ aspectRatio: "4 / 5", borderRadius: 2 }}
          >
            <img
              src={hero.src}
              alt={hero.alt}
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                transform: visible ? "scale(1.02)" : "scale(1)",
                transition: "transform 4200ms cubic-bezier(.22,.61,.36,1)",
                filter: "saturate(0.92)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 55%, color-mix(in oklab, var(--charcoal) 32%, transparent) 100%)",
              }}
            />
          </div>
        )}

        {/* Gold rule */}
        <div
          aria-hidden
          className="mx-auto mt-7 h-px w-12"
          style={{ background: "color-mix(in oklab, var(--gold) 65%, transparent)" }}
        />

        {/* Headline */}
        <h2
          className="mt-6 text-center text-[1.85rem] leading-[1.08] tracking-[-0.01em] sm:text-[2.15rem]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "var(--charcoal)",
          }}
        >
          <span style={{ fontWeight: 600 }}>{headlineOwner} Portugal</span>
          <br />
          <span
            className="italic"
            style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)", fontWeight: 400 }}
          >
            — {headlineWhisper}.
          </span>
        </h2>

        {/* Sequenced narrative */}
        <div className="mx-auto mt-8 flex max-w-[34ch] flex-col items-center gap-2 text-center">
          {lines.map((line, i) => {
            const shown = i < visibleLines;
            return (
              <p
                key={`${i}-${line}`}
                className="text-[15px] leading-[1.45] sm:text-[16px]"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 520ms cubic-bezier(.22,.61,.36,1), transform 520ms cubic-bezier(.22,.61,.36,1)",
                }}
              >
                {line}
              </p>
            );
          })}
        </div>

        {/* Stops — numbered, hair-thin gold connector */}
        {stops.length > 0 && (
          <ol className="mx-auto mt-10 flex w-full max-w-[28rem] flex-col gap-3">
            {stops.map((s, i) => (
              <li
                key={s.key}
                className="flex items-baseline gap-3"
                style={{
                  opacity: visibleLines >= lines.length ? 1 : 0,
                  transform: visibleLines >= lines.length ? "translateY(0)" : "translateY(4px)",
                  transition: `opacity 480ms ${280 + i * 90}ms cubic-bezier(.22,.61,.36,1), transform 480ms ${280 + i * 90}ms cubic-bezier(.22,.61,.36,1)`,
                }}
              >
                <span
                  className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.28em] tabular-nums"
                  style={{ color: "var(--gold)", minWidth: "1.5rem" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="flex-1 text-[14px] leading-[1.35]"
                  style={{
                    fontFamily: "var(--font-sans, Inter), sans-serif",
                    color: "var(--charcoal)",
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </span>
                {typeof s.duration_minutes === "number" && s.duration_minutes > 0 && (
                  <span
                    className="shrink-0 text-[10.5px] uppercase tracking-[0.2em]"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                  >
                    {formatDur(s.duration_minutes)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}

        {/* Closer */}
        <p
          className="mt-10 text-center text-[12px] font-semibold uppercase tracking-[0.32em]"
          style={{
            color: "color-mix(in oklab, var(--gold) 78%, var(--charcoal))",
            opacity: visibleLines >= lines.length ? 1 : 0,
            transition: "opacity 620ms cubic-bezier(.22,.61,.36,1)",
          }}
        >
          {closer}
        </p>

        {/* Actions — share / whatsapp / continue */}
        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { onContinue(); close(); }}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[2px] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
          >
            Open your itinerary
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={handleShare}
            disabled={!shareUrl}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[2px] border px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            style={{
              background: "transparent",
              color: "var(--charcoal)",
              borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
            }}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            {copied ? "Link copied" : shareUrl ? "Share this draft" : "Preparing…"}
          </button>

          <p
            className="mt-1 text-center text-[11px] leading-[1.5]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            A local designer is one tap away on the next screen —{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onShare?.("whatsapp")}
              className="underline-offset-2 hover:underline"
              style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
            >
              or message now
            </a>
            .
          </p>
        </div>
      </article>
    </div>
  );
}

function formatDur(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
