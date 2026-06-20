import { useEffect, useRef, useState } from "react";
import { Waves, VolumeX } from "lucide-react";

/**
 * AmbientToggle — small discreet header control that adds a soft
 * Atlantic-wave layer to the journey. Off by default, respects
 * prefers-reduced-motion, persists choice in localStorage.
 *
 * No external audio assets — uses Web Audio API to generate a gentle
 * filtered noise wash. Cheap, brand-safe, no third-party dependencies.
 */

const STORAGE_KEY = "yes.studio-v2.ambient";

export function AmbientToggle() {
  const [on, setOn] = useState(false);
  const [supported, setSupported] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ src?: AudioBufferSourceNode; gain?: GainNode }>({});

  // Hydrate from storage + respect reduced-motion.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSupported(false);
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "on") setOn(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Start / stop the audio graph.
  useEffect(() => {
    if (!supported) return;
    if (!on) {
      const n = nodesRef.current;
      try {
        n.gain?.gain.linearRampToValueAtTime(0, (ctxRef.current?.currentTime ?? 0) + 0.4);
      } catch {
        /* */
      }
      window.setTimeout(() => {
        try {
          n.src?.stop();
        } catch {
          /* */
        }
        try {
          ctxRef.current?.close();
        } catch {
          /* */
        }
        ctxRef.current = null;
        nodesRef.current = {};
      }, 500);
      return;
    }
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        setSupported(false);
        return;
      }
      const ctx = new Ctx();
      ctxRef.current = ctx;
      // 4s pink-ish noise buffer, looped, low-passed → reads as distant surf.
      const bufLen = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + 0.05 * white;
        b1 = 0.96 * b1 + 0.1 * white;
        b2 = 0.9 * b2 + 0.2 * white;
        ch[i] = (b0 + b1 + b2) * 0.18;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 520;
      // Slow LFO on gain — the breath of the swell.
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
      src.connect(lp).connect(gain).connect(ctx.destination);
      src.start();
      gain.gain.linearRampToValueAtTime(0.085, ctx.currentTime + 1.2);
      nodesRef.current = { src, gain };
    } catch {
      setSupported(false);
    }
    return () => {
      try {
        nodesRef.current.src?.stop();
      } catch {
        /* */
      }
      try {
        ctxRef.current?.close();
      } catch {
        /* */
      }
      ctxRef.current = null;
      nodesRef.current = {};
    };
  }, [on, supported]);

  if (!supported) return null;

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Mute ambient sound" : "Play Atlantic ambient"}
      className="grid h-11 w-11 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2"
      style={{
        color: on
          ? "color-mix(in oklab, var(--gold) 88%, var(--charcoal))"
          : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
      }}
    >
      {on ? <Waves className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
