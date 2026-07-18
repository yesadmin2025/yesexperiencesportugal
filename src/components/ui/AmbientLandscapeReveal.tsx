/**
 * AmbientLandscapeReveal — replaces the static 3-up strip.
 *
 * Shows ONE landscape at a time inside an editorial panel with a slow
 * cinematic zoom + crossfade. Auto-advances every 6s; pauses on hover
 * and when off-screen; reduced-motion users navigate manually.
 *
 * Same data + admin-override contract as AmbientLandscapeStrip so
 * /admin/image-swap keeps working without changes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { buildResponsiveSrc } from "@/lib/responsive-image";
import { useEditorialOverrides, type EditorialModuleKey } from "@/lib/editorial-overrides";
import type { AmbientPhoto } from "@/components/ui/AmbientLandscapeStrip";

const AUTO_INTERVAL_MS = 6000;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Props {
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
  photos: AmbientPhoto[];
  moduleKey?: EditorialModuleKey;
}

export function AmbientLandscapeReveal({
  eyebrow,
  title,
  intro,
  photos,
  moduleKey,
}: Props) {
  const effective = useEditorialOverrides(
    moduleKey ?? ("corporate_ambient" as EditorialModuleKey),
    photos,
  );
  const rendered = moduleKey ? effective : photos;

  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [hovering, setHovering] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = sectionRef.current;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const advance = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + rendered.length) % rendered.length);
    },
    [rendered.length],
  );

  useEffect(() => {
    if (reduced || !inView || hovering || rendered.length < 2) return;
    const id = window.setInterval(() => advance(1), AUTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced, inView, hovering, rendered.length, advance]);

  // Preload the next slide so the crossfade is seamless.
  const nextIndex = useMemo(
    () => (rendered.length ? (index + 1) % rendered.length : 0),
    [index, rendered.length],
  );
  useEffect(() => {
    if (!rendered.length) return;
    const img = new Image();
    img.src = rendered[nextIndex].src;
  }, [rendered, nextIndex]);

  if (!rendered.length) return null;

  return (
    <section
      ref={sectionRef}
      className="py-14 md:py-24 bg-[color:var(--ivory)] reveal"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      data-testid="ambient-landscape-reveal"
    >
      <div className="container-x">
        <div className="max-w-2xl">
          <Eyebrow icon={<MapPin strokeWidth={1.8} />}>{eyebrow}</Eyebrow>
          <span className="gold-rule mt-4 max-w-[64px]" aria-hidden="true" />
          <SectionTitle size="compact" spacing="loose">
            {title}
          </SectionTitle>
          {intro ? (
            <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              {intro}
            </p>
          ) : null}
        </div>

        <div className="mt-10 md:mt-14 relative">
          <div
            className="relative w-full overflow-hidden bg-[color:var(--sand)] aspect-[4/5] md:aspect-[16/9]"
            aria-roledescription="carousel"
            aria-live={reduced ? "polite" : "off"}
          >
            {rendered.map((p, i) => {
              const isActive = i === index;
              const r = buildResponsiveSrc(p.src, { sizes: "hero" });
              return (
                <figure
                  key={`${p.src}-${i}`}
                  className={`absolute inset-0 ambient-reveal-slide ${
                    isActive ? "is-active" : ""
                  }`}
                  aria-hidden={!isActive}
                >
                  <img
                    src={r.src}
                    srcSet={r.srcSet}
                    sizes={r.sizes}
                    alt={p.alt}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={isActive ? "high" : "low"}
                    decoding="async"
                    width={1920}
                    height={1080}
                    className={`w-full h-full object-cover ambient-reveal-zoom ${
                      isActive ? "is-active" : ""
                    }`}
                  />
                  <figcaption className="absolute left-0 right-0 bottom-0 px-5 md:px-8 py-4 md:py-5 bg-gradient-to-t from-[color:var(--charcoal)]/70 via-[color:var(--charcoal)]/25 to-transparent">
                    <span className="block text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--ivory)]/85">
                      {i + 1} · {rendered.length}
                    </span>
                    <span className="mt-1 block serif text-[1.05rem] md:text-[1.2rem] text-[color:var(--ivory)] leading-tight">
                      {p.caption}
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          {rendered.length > 1 && (
            <>
              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2" role="tablist" aria-label="Choose landscape">
                  {rendered.map((p, i) => (
                    <button
                      key={`dot-${i}`}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Show ${p.caption}`}
                      onClick={() => setIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === index
                          ? "w-8 bg-[color:var(--gold)]"
                          : "w-3 bg-[color:var(--charcoal)]/20 hover:bg-[color:var(--charcoal)]/40"
                      }`}
                    />
                  ))}
                </div>
                <div className="hidden md:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => advance(-1)}
                    aria-label="Previous landscape"
                    className="inline-flex items-center justify-center w-11 h-11 border border-[color:var(--charcoal)]/15 hover:border-[color:var(--charcoal)]/40 text-[color:var(--charcoal)] transition-colors"
                  >
                    <ChevronLeft size={16} strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => advance(1)}
                    aria-label="Next landscape"
                    className="inline-flex items-center justify-center w-11 h-11 border border-[color:var(--charcoal)]/15 hover:border-[color:var(--charcoal)]/40 text-[color:var(--charcoal)] transition-colors"
                  >
                    <ChevronRight size={16} strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
