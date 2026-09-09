/**
 * Homepage hero — the continuous YES cinematic film with chapter overlays,
 * over a conversion-first composition.
 *
 * ONE uninterrupted <video> (HERO_FILM, ~27.1s) is the visual source of
 * truth — never a carousel, never stacked clips. HERO_SCENES supplies the
 * chapter overlay timeline: restrained editorial lines that cross-fade as
 * the film advances.
 *
 * Conversion never waits for the film: the brand stanza, proposition and
 * both CTAs compose in well under 2s. Reduced motion and `?hero=last`
 * render the final actionable state immediately.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
import { HERO_FILM, HERO_SCENES, scaleHeroTimeline } from "@/content/hero-scenes-manifest";

/** Cinematic pace: stanza breathes in, full actionable state by ~2.2s. */
const LINE1_DELAY_MS = 480;
const LINE2_DELAY_MS = 1180;
const COMPOSE_DELAY_MS = 1900;
const FADE_MS = 980;
const COMPOSE_FADE_MS = 760;

const EASE = "cubic-bezier(0.22,0.61,0.36,1)";

/** Chapters that actually carry copy (the two silent frames stay silent). */
const CHAPTERS = HERO_SCENES.filter((s) => s.main.length > 0 || !!s.support);
const LAST_CHAPTER_ID = CHAPTERS[CHAPTERS.length - 1]?.id ?? "";

function shouldSkipIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("hero") === "last") return true;
  } catch {
    /* ignore */
  }
  try {
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function revealStyle(on: boolean, ms: number): React.CSSProperties {
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : "translateY(16px)",
    filter: on ? "blur(0px)" : "blur(3px)",
    willChange: "opacity, transform, filter",
    transition: `opacity ${ms}ms ${EASE}, transform ${ms}ms ${EASE}, filter ${ms}ms ${EASE}`,
  };
}

const ARROW = (
  <svg
    className="hero-cta__arrow"
    width="11"
    height="8"
    viewBox="0 0 14 10"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1 5h11M8.5 1.8L12.2 5l-3.7 3.2"
      stroke="currentColor"
      strokeWidth="0.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Tracks which chapter of the continuous film is on screen. */
function useHeroChapter(videoRef: React.RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [activeId, setActiveId] = useState<string>(CHAPTERS[0]?.id ?? "");

  useEffect(() => {
    if (!enabled) {
      setActiveId(LAST_CHAPTER_ID);
      return;
    }
    let raf = 0;
    const started = performance.now();
    const tick = () => {
      const v = videoRef.current;
      const duration =
        v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : HERO_FILM.durationSeconds;
      const windows = scaleHeroTimeline(duration);
      // If the film cannot play (codec refusal, data saver), the chapters
      // still advance on an internal clock so the story never freezes.
      const playing = !!v && !v.paused && v.currentTime > 0;
      const t = playing ? v.currentTime : ((performance.now() - started) / 1000) % duration;
      const win = windows.find((w) => t >= w.startTime && t < w.endTime);
      if (win) setActiveId((prev) => (prev === win.id ? prev : win.id));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, videoRef]);

  return activeId;
}

export function CinematicHero() {
  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [composed, setComposed] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeChapter = useHeroChapter(videoRef, cinematic);



  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const kick = () => void v.play().catch(() => {});
    kick();
    v.addEventListener("loadeddata", kick);
    return () => v.removeEventListener("loadeddata", kick);
  }, []);

  useEffect(() => {
    if (shouldSkipIntro()) {
      setLine1(true);
      setLine2(true);
      setComposed(true);
      return;
    }
    setCinematic(true);
    const t1 = window.setTimeout(() => setLine1(true), LINE1_DELAY_MS);
    const t2 = window.setTimeout(() => setLine2(true), LINE2_DELAY_MS);
    const t3 = window.setTimeout(() => setComposed(true), COMPOSE_DELAY_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  return (
    <section
      data-section="hero"
      data-hero-cinematic="true"
      data-hero-ready="false"
      aria-label="YES Experiences Portugal"
      className="hero-cinematic relative min-h-[100svh] w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)]"
    >
      <div className="hero-story-stage absolute inset-0 z-0">
        <picture className="absolute inset-0 block h-full w-full">
          <source
            media="(max-width: 767px)"
            srcSet={HERO_FILM.posterMobile}
            type="image/webp"
          />
          <img
            src={HERO_FILM.poster}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </picture>

        <video
          ref={videoRef}
          data-hero-film
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_FILM.poster}
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
          <source
            src={HERO_FILM.src720}
            media="(max-width: 767px)"
            type="video/mp4"
          />
          <source
            src={HERO_FILM.src1080}
            type="video/mp4"
          />
        </video>

        {/* Restrained grading so copy is AA readable without crushing the film. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,18,16,0.46)_0%,rgba(16,18,16,0.30)_30%,rgba(16,18,16,0.44)_58%,rgba(16,18,16,0.72)_84%,rgba(16,18,16,0.84)_100%)]"
        />
      </div>

      <div className="relative z-10 flex min-h-[100svh] items-center px-5 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+3rem))] pt-24 sm:px-8 sm:items-end md:items-center md:pb-12 md:pt-24 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl text-left md:mx-auto md:text-center">
            {/* Chapter overlay — the film's story, cross-fading with restraint. */}
            <div
              data-hero-chapters
              aria-hidden="true"
              className="relative mb-6 hidden h-[54px] sm:block"
            >
              {CHAPTERS.map((chapter) => (
                <div
                  key={chapter.id}
                  data-hero-chapter={chapter.id}
                  data-hero-chapter-active={activeChapter === chapter.id ? "true" : "false"}
                  className="absolute inset-x-0 top-0 md:mx-auto"
                  style={{
                    opacity: activeChapter === chapter.id ? 1 : 0,
                    transition: `opacity 600ms ${EASE}`,
                    pointerEvents: "none",
                  }}
                >
                  {chapter.main.length > 0 && (
                    <p className="font-serif text-[17px] italic leading-[1.35] text-[#F7E6C8]/90 sm:text-[19px]">
                      {chapter.main.join(" ")}
                    </p>
                  )}
                  {chapter.support && (
                    <p className="mt-1 text-[12px] leading-[1.4] text-white/70">
                      {chapter.support}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p
              data-hero-field="eyebrow"
              className="hero-promise text-[10.5px] font-medium uppercase tracking-[0.2em] text-[color:var(--gold-soft)] sm:text-[11px]"
              style={revealStyle(composed, COMPOSE_FADE_MS)}
            >
              {HERO_COPY.eyebrow}
            </p>

            <h1
              data-hero-stanza="true"
              data-mixed-emphasis="exempt"
              className="hero-h1 mt-5 font-serif text-[clamp(2.4rem,6vw,5.2rem)] font-normal italic leading-[0.98] tracking-normal text-[color:var(--gold-soft)] [text-shadow:0_2px_18px_color-mix(in_oklab,var(--charcoal-deep)_55%,transparent)]"
            >
              <span
                className="hero-title-line block font-serif italic font-normal m-0"
                data-hero-field="headlineLine1"
                style={revealStyle(line1, FADE_MS)}
              >
                {HERO_PHRASES[0]}
              </span>
              <span
                className="hero-title-line block font-serif italic font-normal mt-3 sm:mt-4"
                data-hero-field="headlineLine2"
                style={revealStyle(line2, FADE_MS)}
              >
                {HERO_PHRASES[1]}
              </span>
            </h1>

            <p
              data-hero-field="subheadline"
              className="mt-6 max-w-2xl text-[15px] leading-[1.65] text-[color:var(--ivory)] sm:text-[17px] md:mx-auto"
              style={revealStyle(composed, COMPOSE_FADE_MS)}
            >
              {HERO_COPY.subheadline}
            </p>

            <div
              className="hero-cta-group mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center md:justify-center"
              data-hero-composed={composed ? "true" : "false"}
              style={{
                ...revealStyle(composed, COMPOSE_FADE_MS),
                filter: undefined,
                pointerEvents: composed ? "auto" : "none",
              }}
            >
              <Link
                to="/studio-v3"
                data-hero-field="primaryCta"
                data-analytics="hero_open_studio"
                data-analytics-placement="hero"
                className="hero-cta group inline-flex min-h-[54px] w-full max-w-[340px] items-center justify-between whitespace-nowrap px-6 py-[15px] text-[11px] uppercase tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:max-w-[340px] sm:px-7 sm:text-[11.5px] hero-cta--primary"
              >
                <span className="hero-cta__sheen" aria-hidden="true" />
                <span className="relative z-10 inline-flex items-center gap-2.5">
                  {HERO_COPY.primaryCta}
                  {ARROW}
                </span>
              </Link>
              <Link
                to="/experiences"
                data-hero-field="secondaryCta"
                data-analytics="hero_choose_experience"
                data-analytics-placement="hero"
                className="hero-cta group inline-flex min-h-[48px] w-full max-w-[340px] items-center justify-between whitespace-nowrap px-1 py-3 text-[10.5px] uppercase tracking-[0.14em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:max-w-[340px] sm:px-1 sm:text-[11px] hero-cta--ghost"
              >
                <span className="hero-cta__sheen" aria-hidden="true" />
                <span className="relative z-10 inline-flex items-center gap-2.5">
                  {HERO_COPY.secondaryCta}
                  {ARROW}
                </span>
              </Link>
            </div>

            <div
              className="mt-3 flex flex-col text-[12.5px] leading-[1.55] text-[color:var(--gold-soft)] md:items-center"
              style={revealStyle(composed, COMPOSE_FADE_MS)}
            >
              <Link
                to="/multi-day"
                data-hero-field="brandLine"
                className="inline-flex min-h-[44px] items-center text-[#F1D8AB] underline decoration-[color:var(--gold)]/80 underline-offset-4 hover:text-white"
              >
                {HERO_COPY.brandLine}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        data-hero-copy-version={HERO_COPY_VERSION}
        data-hero-eyebrow={HERO_COPY.eyebrow}
        data-hero-headline={`${HERO_COPY.headlineLine1} ${HERO_COPY.headlineLine2}`}
        data-hero-subheadline={HERO_COPY.subheadline}
        data-hero-primary-cta={HERO_COPY.primaryCta}
        data-hero-secondary-cta={HERO_COPY.secondaryCta}
        data-hero-brand-line={HERO_COPY.brandLine}
        data-testid="hero-copy-version"
        aria-hidden="true"
        className="sr-only"
      />
      <script
        type="application/json"
        data-probe-field="hero-copy-json"
        data-testid="hero-copy-json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            version: HERO_COPY_VERSION,
            copy: HERO_COPY,
            phrases: HERO_PHRASES,
          }),
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=document.currentScript&&document.currentScript.closest('[data-hero-cinematic]');if(!s)return;var q=new URLSearchParams(location.search);var reduced=matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;if(q.get('hero')==='last'||reduced)s.setAttribute('data-hero-ready','true')}catch(e){}})();`,
        }}
      />
    </section>
  );
}
