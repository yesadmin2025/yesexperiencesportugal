import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, X } from "lucide-react";
import { parseNarrative } from "@/lib/builderNarrative.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { Intention, Mood, Pace, Who } from "./types";

interface NarrativeApplied {
  mood?: Mood | null;
  who?: Who | null;
  intention?: Intention | null;
  pace?: Pace | null;
}

interface NarrativeIntroProps {
  onApply: (parsed: NarrativeApplied) => void;
  applied?: boolean;
  onReset?: () => void;
}

/**
 * Optional conversational entry above the Mood grid.
 * The traveller describes the trip in one sentence; AI maps it to the
 * canonical builder enums (mood/who/intention/pace) and pre-selects them.
 * Never invents stops, regions, or prices.
 */
export function NarrativeIntro({ onApply, applied, onReset }: NarrativeIntroProps) {
  const sessionId = useBuilderSessionId();
  const parse = useServerFn(parseNarrative);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);

  if (applied) {
    return (
      <div className="mt-4 mb-2 inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--ivory)] px-3 py-1.5 text-[12px] text-[color:var(--charcoal)] shadow-[0_1px_0_rgba(46,46,46,0.04)]">
        <Sparkles className="h-3 w-3 text-[color:var(--gold)]" aria-hidden />
        <span className="font-serif italic">{rationale ?? "Pre-filled from your story"}</span>
        {onReset && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setRationale(null);
              setOpen(false);
              onReset();
            }}
            className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[color:var(--charcoal)]/50 hover:text-[color:var(--charcoal)]"
            aria-label="Clear narrative selections"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-4 mb-2 inline-flex items-center gap-2 rounded-full border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3.5 py-2 text-[12px] text-[color:var(--charcoal)] transition-all hover:border-[color:var(--gold)]/60 hover:-translate-y-px"
      >
        <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)]" aria-hidden />
        <span className="font-serif italic">Tell me your trip in one sentence</span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/50 group-hover:text-[color:var(--gold)]">
          AI
        </span>
      </button>
    );
  }

  async function submit() {
    if (!sessionId) return;
    const t = text.trim();
    if (t.length < 4) {
      setError("A few more words, please.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const out = await parse({ data: { narrative: t, sessionId } });
      if (out.source === "rate_limited") {
        setError("Too many tries — please pause a moment.");
        return;
      }
      onApply({
        mood: out.mood ?? null,
        who: out.who ?? null,
        intention: out.intention ?? null,
        pace: out.pace ?? null,
      });
      setRationale(out.rationale ?? null);
    } catch {
      setError("Could not read your story — try a simpler line.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 mb-2 rounded-2xl border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-4 shadow-[0_1px_0_rgba(46,46,46,0.04)]">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-[color:var(--gold)]" aria-hidden />
        <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/70">
          Narrate your trip
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--charcoal)]/50 hover:text-[color:var(--charcoal)]"
          aria-label="Close narrative input"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="font-serif italic text-[14px] leading-snug text-[color:var(--charcoal)]/80 mb-3">
        One sentence. Mood, company, pace — we'll listen and pre-shape it.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Romantic weekend, wine and sea, no rush…"
        className="w-full rounded-xl border border-[color:var(--charcoal)]/15 bg-white px-3 py-2.5 text-[15px] leading-snug text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal)]/40 focus:border-[color:var(--gold)] focus:outline-none focus:ring-1 focus:ring-[color:var(--gold)]/40"
        disabled={loading}
      />
      <div className="flex items-center justify-between gap-3 mt-3">
        <span className="text-[11px] text-[color:var(--charcoal)]/50">{text.length}/500</span>
        <button
          type="button"
          onClick={submit}
          disabled={loading || text.trim().length < 4}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--charcoal)] px-4 py-2 text-[12px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] transition-all hover:bg-[color:var(--teal)] disabled:opacity-50 disabled:hover:bg-[color:var(--charcoal)]"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Listening
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
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
    </div>
  );
}
