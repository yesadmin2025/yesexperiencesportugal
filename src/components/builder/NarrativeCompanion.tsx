import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, X, MessageCircle } from "lucide-react";
import { parseNarrative } from "@/server/builderNarrative.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { Intention, Mood, Pace, Who } from "./types";

interface NarrativeApplied {
  mood?: Mood | null;
  who?: Who | null;
  intention?: Intention | null;
  pace?: Pace | null;
}

interface CompanionMessage {
  id: string;
  role: "you" | "guide";
  text: string;
  rationale?: string | null;
}

interface NarrativeCompanionProps {
  step: number;
  mood?: Mood;
  who?: Who;
  intention?: Intention;
  pace?: Pace;
  narrative?: string | null;
  onApply: (parsed: NarrativeApplied) => void;
}

const STEP_HINTS: Record<number, string> = {
  1: "Tell me how this trip should feel.",
  2: "Who is travelling with you?",
  3: "What pulls you in — wine, coast, heritage?",
  4: "Slow mornings or full days?",
  5: "Want to refine the rhythm before we shape the route?",
  6: "Add a wish at any moment — I'll re-shape it.",
};

/**
 * Persistent narrative companion — a soft, always-available conversational
 * dock that lives across every builder step. The traveller can narrate
 * preferences at any moment and the guide listens, mapping their words to
 * the canonical builder enums (never inventing stops or regions).
 */
export function NarrativeCompanion({
  step,
  mood,
  who,
  intention,
  pace,
  narrative,
  onApply,
}: NarrativeCompanionProps) {
  const sessionId = useBuilderSessionId();
  const parse = useServerFn(parseNarrative);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const seededRef = useRef(false);

  // Seed the first guide line
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    setMessages([
      {
        id: "seed",
        role: "guide",
        text: STEP_HINTS[1] ?? "Narrate your trip whenever you'd like.",
      },
    ]);
  }, []);

  // When AI narrative for the current real route updates, gently echo it as a
  // guide line (only once per narrative string).
  const lastNarrativeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!narrative || narrative === lastNarrativeRef.current) return;
    lastNarrativeRef.current = narrative;
    setMessages((prev) => [
      ...prev,
      { id: `n-${Date.now()}`, role: "guide", text: narrative },
    ]);
  }, [narrative]);

  // Step-aware prompt (changes the chip subtitle, not the message log)
  const stepHint = STEP_HINTS[step] ?? "I'm listening.";

  useEffect(() => {
    if (open) {
      // small delay so the textarea is mounted
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  async function submit() {
    if (!sessionId) return;
    const t = text.trim();
    if (t.length < 4) {
      setError("A few more words, please.");
      return;
    }
    setLoading(true);
    setError(null);
    const userMsg: CompanionMessage = {
      id: `u-${Date.now()}`,
      role: "you",
      text: t,
    };
    setMessages((prev) => [...prev, userMsg]);
    setText("");
    try {
      const out = await parse({ data: { narrative: t, sessionId } });
      if (out.source === "rate_limited") {
        setError("Too many tries — pause a moment.");
        return;
      }
      const patch: NarrativeApplied = {
        mood: out.mood ?? null,
        who: out.who ?? null,
        intention: out.intention ?? null,
        pace: out.pace ?? null,
      };
      const anything =
        patch.mood || patch.who || patch.intention || patch.pace;
      if (anything) onApply(patch);
      setMessages((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          role: "guide",
          text:
            out.rationale ??
            (anything
              ? "I've shaped that into your journey."
              : "I heard you — keep narrating."),
          rationale: out.rationale ?? null,
        },
      ]);
    } catch {
      setError("Couldn't read your story — try a simpler line.");
    } finally {
      setLoading(false);
    }
  }

  // Hide on step 0 (entry) and 7 (review owns its own AI panels)
  if (step === 0 || step === 7) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[88px] z-40 flex justify-center px-3 sm:bottom-[96px] sm:justify-end sm:pr-5"
      aria-live="polite"
    >
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto group inline-flex max-w-[92vw] items-center gap-2 rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)]/95 px-4 py-2.5 text-[12px] text-[color:var(--charcoal)] shadow-[0_10px_30px_-12px_rgba(46,46,46,0.35)] backdrop-blur transition-all hover:-translate-y-px hover:border-[color:var(--gold)]/60"
          aria-label="Open narrative companion"
        >
          <Sparkles
            className="h-3.5 w-3.5 text-[color:var(--gold)] transition-transform group-hover:scale-110"
            aria-hidden
          />
          <span className="font-serif italic truncate max-w-[60vw] sm:max-w-none">
            {stepHint}
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/50 group-hover:text-[color:var(--gold)]">
            AI
          </span>
        </button>
      )}

      {open && (
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] shadow-[0_24px_60px_-20px_rgba(46,46,46,0.45)] overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 border-b border-[color:var(--charcoal)]/8">
            <MessageCircle
              className="h-4 w-4 text-[color:var(--gold)]"
              aria-hidden
            />
            <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/70">
              Narrate your trip
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/50 hover:text-[color:var(--charcoal)]"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-[40vh] overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "guide"
                    ? "flex items-start gap-2"
                    : "flex items-start gap-2 justify-end"
                }
              >
                {m.role === "guide" && (
                  <Sparkles
                    className="h-3 w-3 mt-1.5 shrink-0 text-[color:var(--gold)]"
                    aria-hidden
                  />
                )}
                <p
                  className={
                    m.role === "guide"
                      ? "font-serif italic text-[14px] leading-snug text-[color:var(--charcoal)]/85"
                      : "rounded-2xl bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-3 py-1.5 text-[13px] leading-snug max-w-[80%]"
                  }
                >
                  {m.text}
                </p>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[12px] text-[color:var(--charcoal)]/60 font-serif italic">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Listening…
              </div>
            )}
          </div>

          <div className="border-t border-[color:var(--charcoal)]/8 p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/50 mb-1.5">
              {stepHint}
            </p>
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={2}
              maxLength={500}
              placeholder="Add a wish, mood, or moment…"
              className="w-full rounded-xl border border-[color:var(--charcoal)]/15 bg-white px-3 py-2 text-[14px] leading-snug text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal)]/40 focus:border-[color:var(--gold)] focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]/40"
              disabled={loading}
            />
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="text-[10px] text-[color:var(--charcoal)]/50">
                {text.length}/500
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={loading || text.trim().length < 4}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--charcoal)] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] transition-all hover:bg-[color:var(--teal)] disabled:opacity-50 disabled:hover:bg-[color:var(--charcoal)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Shaping
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Shape it
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-[12px] text-[color:var(--charcoal)]/70 font-serif italic">
                {error}
              </p>
            )}
            {(mood || who || intention || pace) && (
              <p className="mt-2 text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/45">
                Listening with:{" "}
                {[mood, who, intention, pace].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
