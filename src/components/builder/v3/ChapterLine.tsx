import { useEffect, useState } from "react";

/**
 * Editorial chapter line that fades in at the top of the scene.
 * Georgia italic, ivory on charcoal veil.
 */
interface Props {
  text: string | null;
}

export function ChapterLine({ text }: Props) {
  const [shown, setShown] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!text) {
      setVisible(false);
      return;
    }
    setVisible(false);
    const t1 = window.setTimeout(() => setShown(text), 220);
    const t2 = window.setTimeout(() => setVisible(true), 260);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [text]);

  if (!shown) return null;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none select-none transition-all duration-[300ms] ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <p
        className="font-serif italic text-[color:var(--ivory)] text-[18px] sm:text-[22px] leading-[1.35] tracking-[-0.005em] max-w-[28ch] drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {shown}
      </p>
    </div>
  );
}
