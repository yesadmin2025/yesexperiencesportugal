import { useEffect, useState } from "react";

/**
 * Transient AI whisper — a single Georgia italic line that fades in/out
 * above the itinerary. Used for pacing advisor sussurros. Non-blocking,
 * non-modal, never demands a click.
 */
interface Props {
  text: string | null;
  /** ms to keep visible before fading out. */
  ttl?: number;
  onDismiss?: () => void;
}

export function WhisperLayer({ text, ttl = 5200, onDismiss }: Props) {
  const [shown, setShown] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!text) {
      setVisible(false);
      const t = window.setTimeout(() => setShown(null), 220);
      return () => window.clearTimeout(t);
    }
    setShown(text);
    const tIn = window.setTimeout(() => setVisible(true), 40);
    const tOut = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        setShown(null);
        onDismiss?.();
      }, 240);
    }, ttl);
    return () => {
      window.clearTimeout(tIn);
      window.clearTimeout(tOut);
    };
  }, [text, ttl, onDismiss]);

  if (!shown) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full bg-[color:var(--charcoal)]/85 backdrop-blur px-4 py-2 border border-[color:var(--gold)]/30 transition-all duration-[220ms] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)] animate-pulse"
        aria-hidden="true"
      />
      <p
        className="font-serif italic text-[12.5px] text-[color:var(--ivory)] leading-tight max-w-[42ch]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {shown}
      </p>
    </div>
  );
}
