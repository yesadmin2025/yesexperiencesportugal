import { useState, type FormEvent } from "react";

/**
 * NameWhisper — a single quiet step inserted between mood and depth.
 *
 * Restrained, editorial, never theatrical. The name is stored locally and
 * surfaces at most twice in the entire session (reveal line + proposal
 * subtitle). Skip is a first-class option — magic comes from restraint.
 */
interface Props {
  prompt: string;
  placeholder: string;
  acceptLabel: string;
  skipLabel: string;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}

export function NameWhisper({
  prompt,
  placeholder,
  acceptLabel,
  skipLabel,
  onSubmit,
  onSkip,
}: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      onSkip();
      return;
    }
    onSubmit(trimmed.slice(0, 40));
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[color:var(--charcoal)] animate-in fade-in duration-[900ms]">
      <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--charcoal)] via-[color:var(--charcoal)] to-[color:var(--charcoal)]/95" />

      <div className="relative z-10 w-full max-w-md px-6 text-center animate-in fade-in slide-in-from-bottom-1 duration-[1100ms]">
        <h2
          className="font-serif italic text-[24px] sm:text-[30px] leading-[1.2] text-[color:var(--ivory)]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {prompt}
        </h2>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col items-center gap-4">
          <input
            type="text"
            inputMode="text"
            autoComplete="given-name"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={40}
            aria-label={prompt}
            className="w-full bg-transparent border-0 border-b border-[color:var(--gold)]/40 focus:border-[color:var(--gold)] outline-none text-center text-[22px] italic text-[color:var(--ivory)] placeholder:text-[color:var(--ivory)]/30 py-3 transition-colors"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          />

          <button
            type="submit"
            className="inline-flex items-center justify-center min-h-[44px] rounded-full bg-[color:var(--ivory)] hover:bg-[color:var(--gold)] text-[color:var(--charcoal)] px-6 py-2 text-[11px] uppercase tracking-[0.24em] font-bold transition-colors"
          >
            {acceptLabel}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center min-h-[36px] px-3 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)]/50 hover:text-[color:var(--ivory)]/85 transition-colors"
          >
            {skipLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
