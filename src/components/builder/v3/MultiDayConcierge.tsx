import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import type { StudioDict, StudioLocale } from "@/hooks/useStudioLocale";
import type { Intention, Mood, Who } from "@/components/builder/types";
import { BUILDER_WA_NUMBER } from "@/components/builder/types";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import { useStudioLocale } from "@/hooks/useStudioLocale";
import { composeStudioMoment } from "@/server/studioNarrative.functions";

/**
 * MultiDayConcierge — the deeper Portugal. NOT a fallback, NOT a contact
 * form. The cinematic world continues; the traveller crosses into a
 * quieter, more private room of the Studio.
 *
 * Design intent:
 *   · No "Concierge" badge, no Sparkles icon, no MessageCircle icon, no
 *     trust bullets — all read as customer-support chrome.
 *   · No memory chips — re-exposing the selections breaks intimacy. The
 *     single AI editor line carries continuity instead.
 *   · One quiet name handoff (if a name was offered) — never theatrical.
 *   · One confident CTA. No alternates competing for attention.
 *
 * The CTA still routes to WhatsApp (existing infra), but the surface and
 * language never read as "contact our team."
 */

interface Props {
  t: StudioDict;
  mood: Mood | null;
  who: Who | null;
  intention: Intention | null;
  travellerName: string | null;
  onBack: () => void;
}

const HERO_CLIP = "/__l5e/assets-v1/501885a8-7399-4591-99fc-1c410b24c428/scene-route-portugal.mp4";

/** Single, localized name handoff line. Used at most once, never repeated. */
function nameHandoff(name: string, locale: StudioLocale): string {
  switch (locale) {
    case "pt":
      return `${name}, isto merece mais do que um único dia.`;
    case "es":
      return `${name}, esto merece más que un solo día.`;
    case "fr":
      return `${name}, ceci mérite plus qu'une seule journée.`;
    default:
      return `${name}, this deserves more than a single day.`;
  }
}

/** Quiet invitation eyebrow — replaces the "Concierge" sales badge. */
function invitationLabel(locale: StudioLocale): string {
  switch (locale) {
    case "pt": return "Por convite";
    case "es": return "Por invitación";
    case "fr": return "Sur invitation";
    default:   return "By invitation";
  }
}

/** One-line invitation above the handwritten-note field. Never "Describe…". */
function notePrompt(locale: StudioLocale): string {
  switch (locale) {
    case "pt": return "Por onde queres começar?";
    case "es": return "¿Por dónde quieres empezar?";
    case "fr": return "Par où veux-tu commencer ?";
    default:   return "What should we begin with?";
  }
}

/** Soft placeholder — feels like a margin in a private notebook. */
function notePlaceholder(locale: StudioLocale): string {
  switch (locale) {
    case "pt": return "uma manhã lenta, uma costa, alguém a chegar de longe…";
    case "es": return "una mañana lenta, una costa, alguien que llega de lejos…";
    case "fr": return "un matin lent, une côte, quelqu'un qui arrive de loin…";
    default:   return "a slow morning, a coastline, someone arriving from afar…";
  }
}

/** Single quiet contact line. No "WhatsApp" / no "email" labels. */
function contactPlaceholder(locale: StudioLocale): string {
  switch (locale) {
    case "pt": return "como te encontramos · email ou número";
    case "es": return "cómo te encontramos · email o número";
    case "fr": return "comment te joindre · e-mail ou numéro";
    default:   return "where to reach you · email or number";
  }
}

/** Confirm label after the note is written. Editorial, never "Send". */
function sendLabel(locale: StudioLocale): string {
  switch (locale) {
    case "pt": return "Continuar em privado";
    case "es": return "Continuar en privado";
    case "fr": return "Continuer en privé";
    default:   return "Continue privately";
  }
}

export function MultiDayConcierge({
  t,
  mood,
  who,
  intention,
  travellerName,
  onBack,
}: Props) {
  const sessionId = useBuilderSessionId();
  const { locale } = useStudioLocale();
  const composeFn = useServerFn(composeStudioMoment);
  const [editorLine, setEditorLine] = useState<string | null>(null);
  const firedRef = useRef(false);
  const [layer, setLayer] = useState<1 | 2 | 3>(1);

  /* Private-editor voice — single quiet AI line under the title. Fires
     once per mount, never repeats. Reduced-motion users see fallback copy. */
  useEffect(() => {
    if (!sessionId || firedRef.current) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    firedRef.current = true;
    let cancelled = false;
    composeFn({
      data: {
        sessionId,
        mode: "narrative",
        locale,
        mood,
        who,
        intention,
        journeyType: "multi",
        narrativeStage: "recognition",
        confidence: 0.7,
        acceptedCount: 0,
      },
    })
      .then((r) => {
        if (cancelled) return;
        if (r.mode === "narrative" && r.fragment) setEditorLine(r.fragment);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId, locale, mood, who, intention, composeFn]);

  /* Cinematic unfold — title, then editor voice, then quiet invitation.
     Slower than the rest of the Studio on purpose: multi-day = stillness. */
  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setLayer(3);
      return;
    }
    const t2 = window.setTimeout(() => setLayer((l) => (l < 2 ? 2 : l)), 2200);
    const t3 = window.setTimeout(() => setLayer((l) => (l < 3 ? 3 : l)), 3800);
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const handoff = travellerName ? nameHandoff(travellerName, locale) : null;

  /* Handwritten-note moment — the input never appears as a form. It opens
     after the traveller chooses to begin, then submits invisibly through
     WhatsApp (existing channel). No labels, no field chrome, no CRM. */
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (noteOpen) {
      // Soft focus after the fade settles; never abrupt.
      const id = window.setTimeout(() => noteRef.current?.focus({ preventScroll: true }), 520);
      return () => window.clearTimeout(id);
    }
  }, [noteOpen]);

  const canSend = note.trim().length > 1 && contact.trim().length > 2;

  const handleSend = () => {
    if (!canSend) return;
    // Mechanism stays invisible — compose a single private message.
    const body = [
      travellerName ? `— ${travellerName}` : null,
      note.trim(),
      "",
      contact.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    const href = `https://wa.me/${BUILDER_WA_NUMBER}?text=${encodeURIComponent(body)}`;
    window.open(href, "_blank", "noopener");
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[color:var(--charcoal)] animate-in fade-in duration-[1100ms]">
      {/* Cinematic backdrop continues — same world, quieter room. */}
      <video
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        style={{ opacity: 0.4, filter: "saturate(0.74) contrast(1.02) brightness(0.62)" }}
      >
        <source src={HERO_CLIP} type="video/mp4" />
      </video>
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[color:var(--charcoal)]/65 via-[color:var(--charcoal)]/45 to-[color:var(--charcoal)]/92"
      />

      <div className="relative z-10 flex flex-col h-full px-7 pt-6 pb-[max(env(safe-area-inset-bottom),2rem)]">
        {/* Quiet back — low contrast, never competes */}
        <button
          type="button"
          onClick={onBack}
          className="self-start inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--ivory)]/50 hover:text-[color:var(--ivory)]/85 transition-colors"
          style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
        >
          <ArrowLeft size={11} />
          {t.conciergeBack}
        </button>

        <div className="flex-1 flex flex-col justify-center max-w-[34ch] mx-auto text-center gap-7">
          {/* Editorial hairline — replaces the Sparkles/Concierge badge */}
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-[1200ms]">
            <span
              aria-hidden="true"
              className="block h-px w-10 bg-[color:var(--gold)]/70"
            />
            <p
              className="text-[10px] uppercase tracking-[0.36em] font-bold text-[color:var(--gold)]"
              style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
            >
              {invitationLabel(locale)}
            </p>

            <h2
              className="text-[26px] sm:text-[32px] font-semibold leading-[1.1] tracking-[-0.012em] text-[color:var(--ivory)] text-balance"
              style={{
                fontFamily: "Montserrat, system-ui, sans-serif",
                textShadow: "0 1px 22px rgba(0,0,0,0.55)",
              }}
            >
              {t.conciergeTitle}
            </h2>

            <p
              className="italic text-[15.5px] sm:text-[17px] leading-[1.55] text-[color:var(--ivory)]/82 max-w-[32ch] text-balance"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                textShadow: "0 1px 18px rgba(0,0,0,0.5)",
              }}
            >
              {t.conciergeSub}
            </p>
          </div>

          {/* Beat 2 — single AI editor line OR the localized name handoff.
              Carries continuity without re-exposing chips. */}
          <div
            className={`min-h-[64px] flex flex-col items-center justify-center gap-3 transition-opacity duration-[1100ms] ${
              layer >= 2 ? "opacity-100" : "opacity-0"
            }`}
            aria-live="polite"
          >
            {handoff && (
              <p
                className="italic text-[15px] sm:text-[16.5px] leading-[1.55] text-[color:var(--ivory)]/88 max-w-[30ch] text-balance"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {handoff}
              </p>
            )}
            {editorLine && (
              <p
                className="italic text-[13.5px] sm:text-[14.5px] leading-[1.55] text-[color:var(--ivory)]/62 max-w-[32ch] text-balance"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {editorLine}
              </p>
            )}
          </div>

          {/* Beat 3 — quiet invitation. Tap opens a handwritten-note moment
              in-place; the mechanism (WhatsApp) stays invisible. */}
          <div
            className={`flex flex-col items-stretch gap-5 transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              layer >= 3
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <span
              aria-hidden="true"
              className="block h-px w-6 bg-[color:var(--ivory)]/25 mx-auto"
            />

            {!noteOpen ? (
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className="mx-auto inline-flex items-center justify-center min-h-[54px] rounded-[2px] bg-[color:var(--ivory)] hover:bg-[color:var(--gold-soft)] text-[color:var(--charcoal)] px-8 py-3 text-[12px] uppercase tracking-[0.28em] font-bold transition-colors shadow-[0_14px_38px_rgba(0,0,0,0.4)]"
                style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
              >
                {t.conciergeBegin}
              </button>
            ) : (
              <div className="flex flex-col gap-5 animate-in fade-in duration-[900ms] text-left">
                {/* Handwritten note — feels like a margin in a private
                    notebook. No label, no border-box, just a baseline. */}
                <label className="flex flex-col gap-2">
                  <span
                    className="text-[12.5px] italic text-[color:var(--ivory)]/80 text-center"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {notePrompt(locale)}
                  </span>
                  <textarea
                    ref={noteRef}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={notePlaceholder(locale)}
                    className="w-full bg-transparent text-[color:var(--ivory)] placeholder:text-[color:var(--ivory)]/35 italic text-[15.5px] leading-[1.6] py-2 px-0 resize-none border-0 border-b border-[color:var(--ivory)]/25 focus:border-[color:var(--gold)]/70 focus:outline-none focus:ring-0 transition-colors"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  />
                </label>

                {/* Single contact line — no email/whatsapp labels, no icons. */}
                <label className="sr-only" htmlFor="md-contact">
                  {contactPlaceholder(locale)}
                </label>
                <input
                  id="md-contact"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={contactPlaceholder(locale)}
                  className="w-full bg-transparent text-[color:var(--ivory)] placeholder:text-[color:var(--ivory)]/35 text-[13px] tracking-[0.04em] py-2 px-0 border-0 border-b border-[color:var(--ivory)]/25 focus:border-[color:var(--gold)]/70 focus:outline-none focus:ring-0 transition-colors"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="mx-auto mt-1 inline-flex items-center justify-center min-h-[52px] rounded-[2px] bg-[color:var(--ivory)] hover:bg-[color:var(--gold-soft)] disabled:bg-[color:var(--ivory)]/35 disabled:cursor-not-allowed text-[color:var(--charcoal)] px-7 py-3 text-[12px] uppercase tracking-[0.28em] font-bold transition-colors shadow-[0_14px_38px_rgba(0,0,0,0.4)]"
                  style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
                >
                  {sendLabel(locale)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
