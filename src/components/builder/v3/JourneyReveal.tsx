import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * JourneyReveal — cinematic interlude between "all three chosen" and the
 * emergence of suggestions. Lasts ~1.8s, then calls onDone.
 *
 * Shows the awakening cue with a slow shimmer + breathing glow, signaling
 * to the user that Portugal is responding to their choices.
 */
interface Props {
  cue: string;
  onDone: () => void;
}

export function JourneyReveal({ cue, onDone }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShow(true), 40);
    const t2 = window.setTimeout(onDone, 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[color:var(--charcoal)]/55 backdrop-blur-md animate-in fade-in duration-500">
      <div
        className={`flex flex-col items-center gap-4 px-6 text-center transition-all duration-[800ms] ease-out ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <Sparkles
          size={22}
          className="text-[color:var(--gold)] animate-pulse"
          style={{ animationDuration: "2.2s" }}
        />
        <p
          className="font-serif italic text-[22px] sm:text-[26px] leading-tight text-[color:var(--ivory)] max-w-[22ch]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {cue}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)]/70 animate-pulse" style={{ animationDelay: "180ms" }} />
          <span className="block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)]/40 animate-pulse" style={{ animationDelay: "360ms" }} />
        </div>
      </div>
    </div>
  );
}
