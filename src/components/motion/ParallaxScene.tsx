import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { subscribeScroll } from "@/lib/motion/scroll-driver";

/**
 * ParallaxScene — Motion v4.
 *
 * Provides scroll progress (-1 → 1) to child ParallaxLayer instances via
 * context. Uses the global scroll-driver (single rAF) — never a per-scene
 * listener. Respects prefers-reduced-motion.
 *
 * Not tied to viewport width: mobile receives a reduced cap, not zero motion.
 */
type SceneCtx = { progress: number };
const Ctx = createContext<SceneCtx>({ progress: 0 });

interface ParallaxSceneProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "figure" | "header";
}

export function ParallaxScene({
  children,
  className,
  as: Tag = "div",
}: ParallaxSceneProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const rafPending = useRef(false);
  const nextProgress = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const unsub = subscribeScroll(el, (p) => {
      nextProgress.current = p;
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        setProgress(nextProgress.current);
      });
    });
    return unsub;
  }, []);

  return (
    <Ctx.Provider value={{ progress }}>
      <Tag ref={ref as never} className={cn("motion-scene", className)}>
        {children}
      </Tag>
    </Ctx.Provider>
  );
}

interface ParallaxLayerProps {
  children: ReactNode;
  depth?: "back" | "mid" | "fore";
  className?: string;
  as?: "div" | "figure" | "span" | "header";
}

const DEPTH_MULT: Record<NonNullable<ParallaxLayerProps["depth"]>, number> = {
  // Multiplier applied to progress. Sign flips create counter-motion.
  back: -40, // furthest, biggest translate (opposite to scroll)
  mid: 18,
  fore: -8,
};

export function ParallaxLayer({
  children,
  depth = "back",
  className,
  as: Tag = "div",
}: ParallaxLayerProps) {
  const { progress } = useContext(Ctx);
  const y = progress * DEPTH_MULT[depth];
  const style: CSSProperties = {
    // Use CSS var so per-media caps can clamp via CSS if needed.
    ["--parallax-y" as string]: `${y.toFixed(2)}px`,
  };
  return (
    <Tag
      className={cn("motion-parallax-layer", `depth-${depth}`, className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
