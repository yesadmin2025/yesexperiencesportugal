/**
 * Homepage hero — restored "One Breath" composition.
 *
 * The held coastal-road film is the dominant element. Copy lives in
 * separate vertical zones with real negative space between them:
 *   eyebrow  → open sky above the stanza
 *   stanza   → upper-middle, at the historical ~30vh position
 *   support  → its own breathing room below the stanza
 *   CTAs     → anchored low, as in the original composition
 *
 * The eyebrow and support line are independent overlays inside space the
 * original composition already left empty — they never reflow the original
 * stanza or low CTA block. Reduced motion and `?hero=last` render the final
 * actionable state immediately.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
import { HERO_FILM } from "@/content/hero-scenes-manifest";

/** Cinematic pace: opposing phrases cross the frame, then copy and actions settle. */
const TEXT_FADE_MS = 1450;
const CTA_FADE_MS = 1000;
const EASE = "cubic-bezier(0.22,1,0.36,1)";

function storyLineStyle(delayMs: number): React.CSSProperties {
  return {
    ...stanzaStyle,
    animation: `heroApprovedReveal ${TEXT_FADE_MS}ms ${EASE} ${delayMs}ms both`,
  };
}

/** The approved stanza treatment — Fraunces 400 with italic reserved for gold emphasis. */
const stanzaStyle: React.CSSProperties = {
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: "0",
};

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

export function CinematicHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // iOS/Safari can refuse autoplay in Low Power Mode even for muted inline
    // video. Keep the poster underneath, hide the browser's native play
    // overlay until playback genuinely starts, and retry on the first user
    // gesture. This keeps the hero cinematic instead of looking broken.
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;

    try {
      const small = window.matchMedia?.("(max-width: 767px)").matches;
      if (small && !v.currentSrc.includes(HERO_FILM.src720)) {
        v.src = HERO_FILM.src720;
        v.load();
      }
    } catch {
      /* keep the declarative sources */
    }

    const markPlaying = () => setVideoStarted(true);
    const kick = () => {
      const attempt = v.play();
      if (attempt && typeof attempt.catch === "function") {
        void attempt.catch(() => {
          // Poster remains visible. A real user gesture below retries play.
        });
      }
    };
    const retryOnIntent = () => kick();
    const retryOnVisible = () => {
      if (document.visibilityState === "visible") kick();
    };

    kick();
    v.addEventListener("playing", markPlaying);
    v.addEventListener("loadeddata", kick);
    v.addEventListener("canplay", kick);
    window.addEventListener("pointerdown", retryOnIntent, { passive: true, once: true });
    window.addEventListener("touchstart", retryOnIntent, { passive: true, once: true });
    window.addEventListener("scroll", retryOnIntent, { passive: true, once: true });
    document.addEventListener("visibilitychange", retryOnVisible);

    return () => {
      v.removeEventListener("playing", markPlaying);
      v.removeEventListener("loadeddata", kick);
      v.removeEventListener("canplay", kick);
      window.removeEventListener("pointerdown", retryOnIntent);
      window.removeEventListener("touchstart", retryOnIntent);
      window.removeEventListener("scroll", retryOnIntent);
      document.removeEventListener("visibilitychange", retryOnVisible);
    };
  }, []);

  return (
    <section
      data-section="hero"
      data-hero-cinematic="true"
      aria-label="YES Experiences Portugal"
      className="hero-cinematic relative w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)] md:mt-[84px] md:min-h-[calc(100svh-84px)] lg:mt-[96px] lg:min-h-[calc(100svh-96px)]"
    >
      {/* ── Held cinematic film ─────────────────────────────────────── */}
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
            className={`hero-film-fallback h-full w-full object-cover ${videoStarted ? "" : "hero-film-fallback--active"}`}
          />
        </picture>

        <video
          ref={videoRef}
          data-hero-film
          autoPlay
          muted
          loop
          playsInline
          // Metadata preload keeps LCP light; autoplay recovery retries on real user intent.
          preload="metadata"
          poster={HERO_FILM.poster}
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          className={`hero-film-video absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoStarted ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        >
          <source
            src={HERO_FILM.src720}
            media="(max-width: 767px)"
            type="video/mp4"
          />
          <source src={HERO_FILM.src1080} type="video/mp4" />
        </video>

        {/* Original grading: lifted blacks, gentle vignette, mobile stanza band. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(38, 30, 22, 0.06)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.34) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[30%] h-[40%] md:hidden pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* The approved composition has only two visual zones: the central
          two-line statement and the low action pair. */}
      <div className="hero-cinematic-layout absolute inset-0 z-10 grid px-5 sm:px-10 md:px-16">
      <div className="hero-stanza-zone flex min-w-0 items-center justify-center">
        <div className="w-full text-center">
          <h1
            data-hero-stanza="true"
            data-mixed-emphasis="exempt"
            className="hero-h1 m-0 text-center font-serif"
          >
            <span className="hero-title-mask block px-[0.08em] pb-[0.12em]">
              <span
                className="hero-title-line block font-serif italic font-normal m-0 text-[color:var(--gold-soft)]"
                data-hero-field="headlineLine1"
                style={storyLineStyle(500)}
              >
                {HERO_PHRASES[0]}
              </span>
            </span>
            <span className="hero-title-mask mt-1 block px-[0.08em] pb-[0.16em] sm:mt-1.5">
              <span
                className="hero-title-line block font-serif italic font-normal text-[color:var(--gold-soft)]"
                data-hero-field="headlineLine2"
                style={storyLineStyle(1700)}
              >
                {HERO_PHRASES[1]}
              </span>
            </span>
          </h1>
        </div>
      </div>

      {/* Original low CTA anchor. */}
      <div
        className="hero-cta-group z-20 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
        data-hero-composed="true"
        style={{
          opacity: 1,
          animation: `heroApprovedReveal ${CTA_FADE_MS}ms ${EASE} 3100ms both`,
          pointerEvents: "auto",
        }}
      >
        <Link
          to="/studio"
          data-hero-field="primaryCta"
          data-analytics="hero_open_studio"
          data-analytics-placement="hero"
        className="hero-cta hero-cta--primary group inline-flex min-h-[44px] min-w-[196px] items-center justify-center whitespace-nowrap px-7 text-[11px] uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:min-w-[206px] sm:text-[11px]"
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
          className="hero-cta hero-cta--ghost group inline-flex min-h-[44px] min-w-[196px] items-center justify-center whitespace-nowrap px-7 text-[11px] uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:min-w-[206px] sm:text-[11px]"
        >
          <span className="hero-cta__sheen" aria-hidden="true" />
          <span className="relative z-10">{HERO_COPY.secondaryCta}</span>
        </Link>
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
    </section>
  );
}
