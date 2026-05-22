import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, Sparkles } from "lucide-react";

/**
 * The single conversational input. Lives at the bottom of the scene as a
 * floating ivory translúcid sheet that expands when focused.
 *
 * No labels, no fields — just a Georgia italic textarea with a rotating
 * placeholder. Optional voice input via Web Speech API (silent fallback).
 */

interface Props {
  busy?: boolean;
  /** Show the composer in collapsed pill state until tapped. */
  collapsed?: boolean;
  onExpand?: () => void;
  onSubmit: (text: string) => void;
}

const PLACEHOLDERS = [
  "fim-de-semana romântico, vinho e mar, sem pressa…",
  "um dia para celebrar com a família, junto à costa…",
  "algo lento no Alentejo, gastronomia e silêncio…",
  "uma fuga curta a sós, com mistério e mapa…",
  "vinhos do Douro com amigos, ritmo solto…",
];

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
};

export function NarrativeComposer({ busy, collapsed, onExpand, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (collapsed) return;
    const id = window.setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length),
      4500,
    );
    return () => window.clearInterval(id);
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed) {
      window.setTimeout(() => textareaRef.current?.focus(), 250);
    }
  }, [collapsed]);

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      const r = new Ctor();
      r.lang = "pt-PT";
      r.interimResults = false;
      r.continuous = false;
      r.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) setText((t) => (t ? `${t} ${transcript}` : transcript));
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      recognitionRef.current = r;
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSubmit(trimmed);
    setText("");
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur px-4 py-2.5 text-[12px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-[color:var(--gold)]/40 hover:border-[color:var(--gold)] transition-colors min-h-[44px]"
        aria-label="Abrir composer narrativo"
      >
        <Sparkles size={14} className="text-[color:var(--gold)]" />
        Diz mais
      </button>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-[6px] bg-[color:var(--ivory)]/95 backdrop-blur-md border border-[color:var(--ivory)]/60 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] overflow-hidden">
      <div className="p-4 sm:p-5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            } else if (e.key === "Enter" && !e.shiftKey && !text.includes("\n")) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          rows={2}
          maxLength={500}
          className="w-full resize-none bg-transparent border-0 outline-none text-[16px] sm:text-[17px] leading-[1.45] text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal)]/40 placeholder:italic font-serif italic"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          aria-label="Conta-me esta viagem"
          disabled={busy}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--charcoal)]/45 font-semibold">
            narra · escreve · adiciona
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startListening}
              className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full border transition-all ${
                listening
                  ? "border-[color:var(--gold)] bg-[color:var(--gold)]/15 text-[color:var(--gold)]"
                  : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]/70 hover:border-[color:var(--gold)]/60 hover:text-[color:var(--gold)]"
              }`}
              aria-label={listening ? "Parar gravação" : "Falar"}
              aria-pressed={listening}
            >
              <Mic size={16} />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !text.trim()}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full bg-[color:var(--charcoal)] px-5 py-2 text-[12px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] disabled:opacity-50 hover:bg-[color:var(--teal)] transition-colors"
              aria-label="Enviar"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {busy ? "A ouvir…" : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
