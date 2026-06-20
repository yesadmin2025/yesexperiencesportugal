import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/qa/hero")({
  head: () => ({
    meta: [
      { title: "QA · Hero stagger & video — internal" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Internal QA harness for the cinematic hero across breakpoints.",
      },
    ],
  }),
  component: HeroQAPage,
});

type Frame = { label: string; w: number; tier: "xs" | "sm" | "md" | "lg" };

const FRAMES: Frame[] = [
  { label: "320 (xs floor)", w: 320, tier: "xs" },
  { label: "360 (xs)", w: 360, tier: "xs" },
  { label: "375 (xs upper)", w: 375, tier: "xs" },
  { label: "390 (sm)", w: 390, tier: "sm" },
  { label: "414 (sm)", w: 414, tier: "sm" },
  { label: "768 (md)", w: 768, tier: "md" },
  { label: "1024 (md)", w: 1024, tier: "md" },
  { label: "1280 (lg)", w: 1280, tier: "lg" },
];

function HeroQAPage() {
  const [debug, setDebug] = useState(true);
  const [forceFallback, setForceFallback] = useState(false);
  const [bust, setBust] = useState(0);

  const heightFor = (w: number) => Math.round(w * 1.78); // ~9:16-ish viewport

  const buildSrc = (w: number) => {
    const params = new URLSearchParams();
    if (debug) params.set("heroDebug", "1");
    if (forceFallback) params.set("heroVideoFail", "1");
    params.set("v", String(bust));
    return `/?${params.toString()}#qa-${w}`;
  };

  return (
    <main className="min-h-screen bg-[var(--ivory)] text-[var(--charcoal)]">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[var(--ivory)]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">
              Hero QA · stagger × video × breakpoints
            </h1>
            <p className="text-[12px] text-black/60">
              Each frame loads <code>/</code> at its own width. Story cascade should always start at
              the same moment relative to viewport entry, regardless of video state.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
              heroDebug=1
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={forceFallback}
                onChange={(e) => setForceFallback(e.target.checked)}
              />
              force poster fallback
            </label>
            <button
              type="button"
              onClick={() => setBust((n) => n + 1)}
              className="rounded border border-black/15 bg-white px-2.5 py-1 hover:bg-black/5"
            >
              Reload all
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {FRAMES.map((f) => (
            <figure key={f.w} className="rounded-md border border-black/10 bg-white shadow-sm">
              <figcaption className="flex items-center justify-between border-b border-black/10 px-3 py-2 text-[11px] font-mono text-black/70">
                <span>
                  {f.label} · <span className="uppercase tracking-wider">{f.tier}</span>
                </span>
                <span>{heightFor(f.w)}h</span>
              </figcaption>
              <div className="overflow-auto bg-black/5 p-2">
                <iframe
                  key={`${f.w}-${bust}`}
                  src={buildSrc(f.w)}
                  title={`Hero @ ${f.w}px`}
                  width={f.w}
                  height={heightFor(f.w)}
                  className="block border-0 bg-white"
                  loading="lazy"
                />
              </div>
            </figure>
          ))}
        </div>

        <section className="mt-8 rounded-md border border-black/10 bg-white p-4 text-[12.5px] leading-relaxed text-black/80">
          <h2 className="mb-2 text-[13px] font-semibold">What to confirm</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Cada beat aparece sozinho: eyebrow → headline L1 → headline L2 → subheadline → CTA
              primário → CTA secundário → microcopy.
            </li>
            <li>
              Easing único <code>var(--ease-premium)</code> em todas as larguras.
            </li>
            <li>≤379px usa o tier xs (delays mais espaçados).</li>
            <li>
              Vídeo entra no mobile; se não, poster fica visível e a sequência continua igual.
            </li>
            <li>
              Painel <code>hero debug</code> regista <code>play-attempt</code>,{" "}
              <code>play-success</code>/<code>play-failed</code>, <code>story-trigger</code>,{" "}
              <code>story-active</code>.
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}
