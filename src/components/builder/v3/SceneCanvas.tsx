// SceneCanvas — premium cinematic scene player.
//
// Replaces the abrupt <video src> swap with:
//   · cross-dissolve between previous and current scene (1.6s)
//   · supports both <video> loops and still images with Ken Burns drift
//   · always-on film grain + warm vignette overlay
//
// Respects prefers-reduced-motion (grain pulse off, ken burns frozen).

import { useEffect, useRef, useState } from "react";

export type SceneSource =
  | { kind: "video"; src: string }
  | { kind: "still"; src: string; ken?: "push" | "pull" | "drift" };

interface Props {
  source: SceneSource;
  /** Tone tint via CSS blend, layered above the scene but below grain. */
  tint?: string;
}

export function SceneCanvas({ source, tint }: Props) {
  // Keep the previous layer mounted long enough to cross-dissolve.
  const [layers, setLayers] = useState<{ id: number; source: SceneSource }[]>(
    () => [{ id: 0, source }],
  );
  const idRef = useRef(0);
  const prevKeyRef = useRef<string>(srcKey(source));

  useEffect(() => {
    const key = srcKey(source);
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    idRef.current += 1;
    const nextId = idRef.current;
    setLayers((prev) => [...prev.slice(-1), { id: nextId, source }]);
    const cleanup = window.setTimeout(() => {
      setLayers((prev) => prev.filter((l) => l.id === nextId));
    }, 1800);
    return () => window.clearTimeout(cleanup);
  }, [source]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {layers.map((layer, i) => (
        <div
          key={layer.id}
          className="absolute inset-0 transition-opacity duration-[1600ms] ease-out"
          style={{ opacity: i === layers.length - 1 ? 1 : 0 }}
        >
          {layer.source.kind === "video" ? (
            <video
              src={layer.source.src}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[drift-kenburns_28s_ease-in-out_infinite_alternate]"
              style={{ filter: "saturate(0.92) contrast(1.04) brightness(0.96)" }}
            />
          ) : (
            <img
              src={layer.source.src}
              alt=""
              loading="eager"
              decoding="async"
              className={
                "absolute inset-0 h-full w-full object-cover motion-safe:animate-[drift-kenburns_28s_ease-in-out_infinite_alternate]"
              }
              style={{
                filter: "saturate(0.92) contrast(1.04) brightness(0.94)",
                transformOrigin:
                  layer.source.ken === "push"
                    ? "50% 60%"
                    : layer.source.ken === "pull"
                      ? "50% 40%"
                      : "40% 50%",
              }}
            />
          )}
        </div>
      ))}
      {tint && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: tint, mixBlendMode: "soft-light" }}
        />
      )}
      {/* Warm cinematic vignette + film grain overlay (always on). */}
      <div className="drift-filmgrain absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.42) 100%)",
        }}
      />
    </div>
  );
}

function srcKey(s: SceneSource): string {
  return `${s.kind}:${s.src}`;
}
