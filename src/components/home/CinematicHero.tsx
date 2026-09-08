/**
 * Homepage hero — "One Breath".
 *
 * One continuous sunset-road film, full-bleed, a single centered two-line
 * H1 and exactly two refined CTAs. No eyebrow, no explanatory subheadline,
 * no review row, no third link: the atmosphere carries the brand and the
 * two choices carry conversion.
 *
 * The CTAs are revealed quickly (~1.6s) so the page stays cinematic without
 * costing conversion. Reduced-motion users and `?hero=last` see them
 * immediately. The SR/SEO hero-copy probes and the HERO_COPY version
 * contract are preserved untouched.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";

const HERO_CLIP = {
  srcMobile: "/__l5e/assets-v1/ff4f2c39-2fde-42f1-9b4a-7230c692f1e9/hero-sunset-road-720.mp4",
  srcDesktop: "/__l5e/assets-v1/422f19b8-dad0-4ae0-b952-e4fc9a048abe/hero-sunset-road-1080.mp4",
  srcMobileHevc:
    "/__l5e/assets-v1/07f8da30-1c73-4d49-a615-19beccd6bc17/hero-sunset-road-720.hevc.mp4",
  srcMobileAv1:
    "/__l5e/assets-v1/5b4b22ae-6087-461f-b6bb-2befd85ae8de/hero-sunset-road-720.av1.mp4",
  posterWebp: "/video/hero-sunset-road-poster.webp",
  posterWebpMobile: "/video/hero-sunset-road-poster-720.webp",
} as const;

/** Maximum time before the CTAs are usable. Kept well under 1.8s. */
const CTA_REVEAL_MS = 1600;

export function CinematicHero() {
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forcedLast = new URLSearchParams(window.location.search).get("hero") === "last";

    if (reduced || forcedLast) {
      setCtaVisible(true);
      return;
    }

    const timer = window.setTimeout(() => setCtaVisible(true), CTA_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section
      data-section="hero"
      data-hero-cinematic="true"
      aria-label="YES Experiences Portugal"
      className="relative min-h-[100svh] w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)]"
    >
      <div className="hero-story-stage absolute inset-0 z-0">
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(max-width: 767px)" srcSet={HERO_CLIP.posterWebpMobile} />
          <img
            src={HERO_CLIP.posterWebp}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
        </picture>

        <video
          data-hero-film
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_CLIP.posterWebp}
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
          <source
            media="(max-width: 767px)"
            src={HERO_CLIP.srcMobileAv1}
            type="video/mp4; codecs=av01"
          />
          <source
            media="(max-width: 767px)"
            src={HERO_CLIP.srcMobileHevc}
            type="video/mp4; codecs=hvc1"
          />
          <source media="(max-width: 767px)" src={HERO_CLIP.srcMobile} type="video/mp4" />
          <source src={HERO_CLIP.srcDesktop} type="video/mp4" />
        </video>

        {/* Restrained cinematic grade: a soft top-to-bottom fall and a
          quiet vignette. No glassmorphism, no decorative noise. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,18,16,0.34)_0%,rgba(16,18,16,0.16)_38%,rgba(16,18,16,0.44)_78%,rgba(16,18,16,0.62)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_50%,transparent_38%,rgba(12,14,12,0.42)_100%)]"
        />
      </div>

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-6 pb-[max(4rem,calc(env(safe-area-inset-bottom)+3rem))] pt-28 sm:px-8 md:pb-16 md:pt-24">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h1
            data-hero-stanza="true"
            className="font-serif text-[clamp(2.5rem,7.2vw,5rem)] font-normal italic leading-[1.02] tracking-[-0.02em] text-[#F3E3C6] [text-shadow:0_2px_22px_rgba(0,0,0,0.42)]"
          >
            <span className="block font-serif italic font-normal m-0">
              {HERO_PHRASES[0]}
            </span>
            <span className="block font-serif italic font-normal mt-3 sm:mt-4">
              {HERO_PHRASES[1]}
            </span>
          </h1>

          <div
            data-hero-composed="true"
            data-hero-cta-visible={ctaVisible ? "true" : "false"}
            className={[
              "mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row sm:gap-4",
              "transition-opacity duration-700 ease-out motion-reduce:transition-none",
              ctaVisible ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <Link
              to="/studio-v3"
              data-hero-field="primaryCta"
              data-analytics="hero_open_studio"
              data-analytics-placement="hero"
              className="hero-cta hero-cta--primary group inline-flex min-h-[44px] w-full max-w-[320px] items-center justify-center whitespace-nowrap px-6 py-[14px] text-[11px] uppercase sm:w-auto sm:text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
            >
              {HERO_COPY.primaryCta}
            </Link>
            <Link
              to="/experiences"
              data-hero-field="secondaryCta"
              data-analytics="hero_choose_experience"
              data-analytics-placement="hero"
              className="hero-cta hero-cta--ghost group inline-flex min-h-[44px] w-full max-w-[320px] items-center justify-center whitespace-nowrap px-6 py-[14px] text-[11px] uppercase sm:w-auto sm:text-[11.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
            >
              {HERO_COPY.secondaryCta}
            </Link>
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
        data-hero-microcopy={HERO_COPY.microcopy}
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
