import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { SiteLayout } from "@/components/SiteLayout";
import { FAQ } from "@/components/FAQ";
import { CtaButton } from "@/components/ui/CtaButton";

import heroImg from "@/assets/hero-coast.jpg";

// Real Viator-sourced tour photography used by the Occasions / Signature
// cards on this page. Hero-scene imagery is declared in the manifest at
// `src/content/hero-scenes-manifest.ts` (single source of truth, feeds
// both the route and the credits modal).
import imgArrabidaViewpoint from "@/assets/tours/arrabida-wine-allinclusive/viewpoint.jpg";
import imgArrabidaWineLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgSintraCaboDaRoca from "@/assets/tours/sintra-cascais/cabo-da-roca.jpg";

import {
  Star,
  MessageCircle,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import { StudioLivePreview } from "@/components/home/StudioLivePreview";
import { CinematicHero } from "@/components/home/CinematicHero";
import { ThreePathsSection } from "@/components/home/ThreePathsSection";
import { RecentJourney } from "@/components/home/RecentJourney";
// PathfinderQuiz removed from homepage (component file kept).
import { getScrollDebugFlags, useScrollDebugFlags } from "@/lib/scroll-debug";

import { HERO_COPY, HERO_COPY_VERSION } from "@/content/hero-copy";
import { signatureTours, isValidTourId } from "@/data/signatureTours";

/* ──────────────────────────────────────────────────────────────────
 * Featured Signature tours — exactly 4 real tours, in display order.
 * Each id MUST exist in `signatureTours` (validated below).
 * ────────────────────────────────────────────────────────────── */
const FEATURED_TOUR_IDS = [
  "arrabida-wine-allinclusive",
  "sintra-cascais",
  "arrabida-boat",
  "troia-comporta",
] as const;

/* ──────────────────────────────────────────────────────────────────
 * HERO — cinematic 5-scene storytelling sequence (mobile-first).
 *
 * Each scene shows ONE main message + ONE short supporting line, on a
 * single real Viator-sourced image. Scenes auto-advance every 5s with
 * a slow crossfade + soft Ken Burns drift. CTAs and microcopy appear
 * ONLY on scene 5 (the action scene).
 *
 * Scene 5's visible copy intentionally aligns with the approved
 * HERO_COPY lock — it carries the canonical H1 / subheadline / CTAs /
 * microcopy / brand line. `?hero=last` (used by the e2e copy lock and
 * visual-regression specs) freezes the sequence on scene 5 so all
 * approved strings are simultaneously rendered for byte-exact and
 * visibility assertions.
 *
 * No invented stops. Imagery is real Viator-sourced operation
 * photography. AI is not used to shape any of these strings.
 * ────────────────────────────────────────────────────────────── */
const HERO_SCENE_DURATION_MS = 5200;
// Slowed further (0.86 → 0.78) so the closing "Build it live / Confirm
// instantly" beat holds visibly through the Portugal-map close instead
// of finishing before it. Same media element governs every viewport.
const HERO_FILM_PLAYBACK_RATE = 0.6;

/* ──────────────────────────────────────────────────────────────────
 * Cinematic horizontal storytelling hero — 5 scenes, each a short
 * "chapter" of a Portugal film. Background pans slowly right→left
 * (drift-left) like a film reel; only the OPENING scene shows the
 * canonical H1, and only the FINAL scene reveals CTAs. Every other
 * scene shows ONE short cinematic line + ONE supporting microline.
 * Imagery is real Viator-sourced operation photography only.
 * ────────────────────────────────────────────────────────────── */
/**
 * Cinematic 5-scene story. Each scene = ONE real Portugal image +
 * one cinematic headline (with intentional line breaks) + one short
 * supporting microline. CTAs appear ONLY on scene 5.
 *
 * `main` is an array so we can render line breaks the same way an
 * editorial film would title-card a chapter — each line lands as its
 * own beat, not a run-on sentence.
 *
 * Imagery is real Viator-sourced operation photography only — no
 * stock, no AI faces, no generic clichés.
 */
/**
 * Cinematic hero sequence is now declared in
 * `src/content/hero-scenes-manifest.ts` — single source of truth that
 * also feeds the credits modal. Adding/replacing a scene clip happens
 * THERE, not here, so attribution stays in sync with what's rendered.
 */


const signatures = FEATURED_TOUR_IDS
  .filter((id) => isValidTourId(id))
  .map((id) => signatureTours.find((t) => t.id === id)!)
  .map((t) => ({
    id: t.id,
    title: t.title,
    img: t.img,
    line: t.blurb,
    pace: t.pace,
    region: t.region,
    priceFrom: t.priceFrom,
    durationHours: t.durationHours,
    // First 3 real highlights from the matching Viator-sourced catalog.
    // Never fabricated — sourced from `signatureTours[].highlights`.
    highlights: t.highlights.slice(0, 3),
  }));

/* ──────────────────────────────────────────────────────────────────
 * Moments / Groups preview — Multi-day, Proposals, Celebrations,
 * Corporate collapsed into a single band (see groupsAndCelebrations).
 * ────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────
 * Moments / Groups preview — Multi-day, Celebrations, Corporate
 * collapsed into a single 3-card band.
 * ────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────
 * Occasions band — Proposals · Celebrations · Corporate & Groups ·
 * Multi-Day. Each block carries the four required elements:
 *   1. strong headline (`title`)
 *   2. short emotional value (`pull`)
 *   3. practical value (`line` body + `detail` + `handles`)
 *   4. local guidance / logistics note (`trust`)
 *   + CTA (`cta` + `to`)
 * Copy is approved verbatim — do not paraphrase without explicit ask.
 * Each block uses its OWN real Viator-sourced image (no duplicates,
 * no stock, no invented imagery).
 * ────────────────────────────────────────────────────────────── */
const groupsAndCelebrations = [
  {
    id: "proposals",
    eyebrow: "Proposals",
    title: "A private moment, held with care.",
    line: (
      <>
        From location to timing, every detail is arranged{" "}
        <span className="kw">discreetly</span>, with local knowledge that protects the surprise.
      </>
    ),
    pull: "Composed for the moment, never templated.",
    detail: "Discreet · location of your choosing",
    handles: [
      "Location scouting",
      "Timing optimisation",
      "Full discretion",
    ],
    trust: "Planned end to end with our local team.",
    cta: "Plan a Proposal",
    to: "/proposals",
    img: imgArrabidaViewpoint,
  },
  {
    id: "celebrations",
    eyebrow: "Celebrations",
    title: "For days worth remembering.",
    line: (
      <>
        Birthdays, anniversaries and family gatherings shaped around{" "}
        <span className="kw">your people</span> and your pace.
      </>
    ),
    pull: "Your people, your pace.",
    detail: "Private host · any group size",
    handles: [
      "Group coordination",
      "Multi-activity planning",
      "Personal touches",
    ],
    trust: "Coordinated by a local host who knows how the day connects.",
    cta: "Plan a Celebration",
    to: "/proposals",
    img: imgArrabidaWineLunch,
  },
  {
    id: "corporate",
    eyebrow: "Corporate",
    title: "Corporate days, handled with the same care.",
    line: (
      <>
        Incentives, off-sites and client hospitality — venues, transport and timing woven into one{" "}
        <span className="kw">effortless</span> day, with the same attention we bring to a proposal.
      </>
    ),
    pull: "Run locally. Delivered seamlessly.",
    detail: "Any group size · invoice & DMC support",
    handles: [
      "Full logistics management",
      "Transport coordination",
      "Invoice & DMC support",
    ],
    trust: "Real driving times, real venues, real partners.",
    cta: "Plan a Corporate Day",
    to: "/corporate",
    img: imgSintraCaboDaRoca,
  },
] as const;


/* ──────────────────────────────────────────────────────────────────
 * Route definition — keeps headers, head meta and HERO_COPY_VERSION
 * exposure intact so existing locks (X-Hero-Copy-Version,
 * yes-hero-copy-version meta tag) keep passing.
 * ────────────────────────────────────────────────────────────── */
export const Route = createFileRoute("/")({
  headers: () => ({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
    "X-Hero-Copy-Version": HERO_COPY_VERSION,
  }),
  head: () => ({
    meta: [
      { title: "YES experiences Portugal — Portugal is the stage. You write the story." },
      { name: "yes-hero-copy-version", content: HERO_COPY_VERSION },
      { name: "description", content: "Private experiences in Portugal — Signature days, an Experience Studio that designs and reserves in minutes, bespoke multi-day journeys, and private occasions in Lisbon, Sintra, Arrábida and Sesimbra. 700+ five-star reviews." },
      {
        property: "og:title",
        content: "Portugal is the stage. You write the story. — YES experiences",
      },
      { property: "og:description", content: "Private experiences in Portugal — Signature days, Experience Studio with live pricing and instant reservation, bespoke multi-day journeys, and private occasions in Lisbon, Sintra, Arrábida and Sesimbra." },
      {
        property: "twitter:title",
        content: "Portugal is the stage. You write the story. — YES experiences",
      },
      { property: "twitter:description", content: "Private experiences in Portugal — Signature days, Experience Studio with live pricing and instant reservation, bespoke multi-day journeys, and private occasions in Lisbon, Sintra, Arrábida and Sesimbra." },
      { property: "og:image", content: `https://yesexperiencesportugal.com${heroImg}` },
      { property: "twitter:image", content: `https://yesexperiencesportugal.com${heroImg}` },
      { property: "og:url", content: "https://yesexperiencesportugal.com/" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/" },
      // Preload the hero film poster — it's the LCP element on the
      // homepage. Marking it fetchpriority=high lets the browser pull
      // the bytes in parallel with critical CSS instead of waiting for
      // the <video> tag to be discovered during layout.
      {
        rel: "preload",
        as: "image",
        href: "/video/film/yes-hero-poster.jpg",
        fetchPriority: "high",
      },
    ],

  }),
  component: HomePage,
});

/* ════════════════════════════════════════════════════════════════
 * HOMEPAGE — 8 sections (structural pass: dedup + reorder)
 * 1. Hero
 * 2. Social proof — trust strip
 * 3. Why YES — editorial manifesto (5 blocks)
 * 4. Experience Studio preview (Builder)
 * 5. Real Signature Experiences preview
 * 6. Proposals / Celebrations / Corporate / Multi-Day (combined band)
 * 7. FAQ
 * 8. Final CTA — Talk to a local
 * ════════════════════════════════════════════════════════════ */
function HomePage() {
  const scrollDebug = useScrollDebugFlags();

  // Mark this scope so e2e visual-regression / copy-lock helpers can
  // still detect "the homepage's hero copy is rendered" — copy probes
  // live inside <CinematicHero/>, the new single-element hero.


  // Homepage motion controller — `[data-motion]` / `.motion-in`.
  // See src/lib/home-motion.ts for the full contract. This is the
  // single source of truth for visible scroll motion on the homepage.
  // Auto-tags legacy `.reveal` / `.reveal-stagger` / `.section-enter`
  // elements with `data-motion`, so this controller wins on the
  // homepage without per-component edits.
  useEffect(() => {
    let dispose: (() => void) | undefined;
    import("@/lib/home-motion").then(({ startHomeMotion }) => {
      dispose = startHomeMotion();
    });
    return () => {
      dispose?.();
    };
  }, []);

  // ── Hash navigation ────────────────────────────────────────────────
  // Two cooperating effects:
  //   1. Deep-link handler: on mount (and on subsequent hashchange via
  //      in-page anchor clicks), resolves aliases, smooth-scrolls to the
  //      target, and sets a shared lock so the observer below doesn't
  //      overwrite the hash mid-animation.
  //   2. Hash sync observer: as the user scrolls, replaces the URL hash
  //      with whichever tracked section is "most under" the anchor line —
  //      a fixed line ~14% down the viewport (just below the navbar).
  //      We use a distance-to-anchor-line metric instead of raw
  //      intersectionRatio so short sections (e.g. trust bar) don't beat
  //      tall ones (e.g. Builder) just because they're 100% visible.
  //
  // The lock is a module-scoped `useRef` shared between effects via a
  // closure variable in component scope.

  const TRACKED_IDS = [
    "reviews",
    "three-paths",
    "builder",
    "studio",
    "signatures",
    "multi-day",
    "occasions",
    "faq",
    "final-cta",
  ] as const;

  const HASH_ALIASES: Record<string, string> = {
    // Builder / Studio — Studio is its own anchor inside the builder section
    build: "builder",
    builder: "builder",
    studio: "studio",
    "experience-studio": "studio",
    // Signatures
    signature: "signatures",
    signatures: "signatures",
    "multi-day": "multi-day",
    multiday: "multi-day",
    journey: "multi-day",
    journeys: "multi-day",
    occasion: "occasions",
    occasions: "occasions",
    groups: "occasions",
    group: "occasions",
    proposal: "occasions",
    proposals: "occasions",
    celebration: "occasions",
    celebrations: "occasions",
    corporate: "occasions",
    // Reviews / trust
    review: "reviews",
    reviews: "reviews",
    // Final CTA
    "final-cta": "final-cta",
    final: "final-cta",
    book: "final-cta",
    talk: "final-cta",
    contact: "final-cta",
  };

  // Shared "don't sync the hash right now" lock. Held while a programmatic
  // smooth-scroll is in flight. Stored on window so both effects see the
  // same value without prop-drilling a ref.
  // Using a numeric timestamp (ms since epoch) — observer reads
  // performance.now() and skips while the lock is in the future.
  const getLockKey = () => "__yesHashSyncLockUntil";

  // Effect 1 — deep-link handling (runs on mount + on hashchange events
  // triggered by clicks on in-page anchors that point to a tracked id).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (getScrollDebugFlags().disableHashSync) return;

    const resolveTarget = (raw: string): HTMLElement | null => {
      if (!raw) return null;
      const key = raw.toLowerCase();
      const aliased = HASH_ALIASES[key] ?? key;
      return (
        document.getElementById(aliased) ?? document.getElementById(key)
      );
    };

    let cancelled = false;
    let timer = 0;

    // Single, simple deep-link handler.
    //
    // Previous version stacked three smooth-scroll systems (CSS
    // scroll-behavior + global anchor handler + scrollIntoView here)
    // plus corrective re-scrolls at 500ms / 1400ms / on every img.load /
    // on document.fonts.ready. That caused the page to snap back after
    // the user started scrolling.
    //
    // Now: one smooth scroll, no corrections. The global
    // installSmoothAnchorScroll handler (SiteLayout) covers click-driven
    // jumps with the proper navbar offset; this effect only handles
    // initial mount + hashchange (programmatic). We poll briefly for the
    // target to exist (lazy chunks/images), do ONE scroll, and stop.
    const scrollToHash = (rawHash: string, smooth: boolean) => {
      // Lock the scroll-spy briefly so it doesn't fight us during the
      // initial smooth scroll.
      (window as unknown as Record<string, number>)[getLockKey()] =
        performance.now() + 900;

      let tries = 0;
      const tick = () => {
        if (cancelled) return;
        const el = resolveTarget(rawHash);
        if (el) {
          const reduce =
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
          // Compute target with navbar offset so we land cleanly under the
          // fixed header instead of clipping under it.
          const navOffset =
            window.innerWidth >= 1024 ? 96 : window.innerWidth >= 768 ? 88 : 80;
          const scrollMt =
            parseFloat(window.getComputedStyle(el).scrollMarginTop || "0") || 0;
          const offset = Math.max(scrollMt, navOffset);
          const top = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({
            top: Math.max(0, top),
            behavior: smooth && !reduce ? "smooth" : "auto",
          });

          // Force-reveal the section once so deep-linked anchors don't
          // land on opacity:0 content (IO race on mount). Transform/opacity
          // only — no layout shift.
          const scope: ParentNode = el.querySelector(
            ".reveal, .reveal-stagger",
          )
            ? el
            : (el.closest("section") ?? el);
          scope
            .querySelectorAll<HTMLElement>(
              ".reveal:not(.is-visible), .reveal-stagger:not(.is-visible), .section-enter:not(.is-visible)",
            )
            .forEach((node) => node.classList.add("is-visible"));

          // Canonicalise URL hash.
          const canonical =
            HASH_ALIASES[rawHash.toLowerCase()] ?? rawHash.toLowerCase();
          if (canonical && `#${canonical}` !== window.location.hash) {
            window.history.replaceState(
              window.history.state,
              "",
              window.location.pathname + window.location.search + `#${canonical}`,
            );
          }
          return;
        }
        // Section not in DOM yet (lazy chunk). Poll briefly.
        if (++tries < 20) {
          timer = window.setTimeout(tick, 80);
        }
      };
      timer = window.setTimeout(tick, 60);
    };

    const initial = window.location.hash?.slice(1);
    if (initial) scrollToHash(initial, true);

    const onHashChange = () => {
      const h = window.location.hash?.slice(1);
      if (h) scrollToHash(h, true);
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHashChange);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2 — REMOVED PERMANENTLY.
  // Previously synced the URL hash to the currently visible section as the
  // user scrolled. This was identified as a likely contributor to scroll
  // instability (rAF + IO + history.replaceState during native scroll). It
  // is intentionally not replaced. Anchor link clicks still work via
  // Effect 1 + the global smooth-anchor-scroll handler.

  // Effect 3 — homepage-only parallax driver. Writes `--parallax-y` to
  // every `.he-parallax` / `.he-parallax-counter` element via rAF on
  // scroll. Disabled for prefers-reduced-motion. Caps travel so it
  // stays "everyday", never woozy.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) return;
    if (getScrollDebugFlags().disableMobileStudioMotion && window.innerWidth < 768) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".he-parallax, .he-parallax-counter",
      ),
    );
    if (!els.length) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        // Skip when fully off-screen.
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        // Normalised position: -1 (above viewport) → 0 (centred) → 1 (below).
        const center = rect.top + rect.height / 2;
        const t = (center - vh / 2) / vh; // ~ -1..1 across viewport
        // Cap travel on tablet/desktop only. Mobile parallax is disabled.
        const cap = 28;
        const y = Math.max(-cap, Math.min(cap, t * cap * -1));
        el.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
      }
    };
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <SiteLayout>
       <div className="home-energy">
       {/* 1 — HERO (cinematic continuous film, full-bleed, timed reveals).
           See <CinematicHero/>; HERO_COPY locks live inside it. */}
       <CinematicHero />



      {/* 2 — TRUST STRIP
          Restrained: review count, real platforms, one short line about
          private guides + real local knowledge. No avatars carousel, no
          repeated review block. This is the SINGLE review surface on the
          page (per "no repeated review sections" guardrail). */}
      <section
        id="reviews"
        className="he-trust-rule section-enter bg-[color:var(--ivory)] border-b border-[color:var(--border)] py-12 md:py-20 scroll-mt-24 md:scroll-mt-28"
        aria-labelledby="trust-bar-title"
      >
        <h2 id="trust-bar-title" className="sr-only">
          700+ five-star reviews across major platforms
        </h2>
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
              <p
                className="flex items-center justify-center md:justify-start gap-1 text-[color:var(--gold)]"
                role="img"
                aria-label="Rated 5 out of 5 stars"
              >
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="he-trust-star" size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" focusable="false" />
                ))}
              </p>
              <p className="serif text-[color:var(--charcoal)] leading-[1.15] font-normal">
                <span className="serif text-[1.85rem] md:text-[2.4rem] font-medium tabular-nums">700+</span>
                <span className="ml-2 italic text-[1.1rem] md:text-[1.3rem]">five-star reviews</span>
                <span className="block md:inline text-[10.5px] md:text-[11.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)] md:ml-3 mt-1.5 md:mt-0">
                  Across Google · Tripadvisor · Viator · GetYourGuide · Trustpilot
                </span>
              </p>
            </div>
            <ul
              className="he-stagger flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-3 md:gap-x-8 list-none p-0 h-6 md:h-7 opacity-95"
              aria-label="Featured on Google, Tripadvisor, Viator, GetYourGuide and Trustpilot"
            >
              {(["google", "tripadvisor", "viator", "getyourguide", "trustpilot"] as const).map((p) => (
                <li key={p} className="reveal-stagger h-full flex items-center">
                  <PlatformBadge platform={p} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ThreePathsSection />

      {/* 3 — THREE PATHS + EXPERIENCE STUDIO (promoted)
          Promoted up the page so the Builder reads as the core
          innovation, not just another tile. The section opens with a
          compact Three-paths primer (Signature / Tailored / Studio)
          so users immediately understand the three distinct ways to
          shape Portugal — then drops into the live Studio device.
          Mobile order: paths primer → headline → live preview → CTA.
          Desktop: text rail left, preview right. One CTA only
          ("Open the Studio"). The "Ask a local" duplicate has been
          removed; local guidance lives in the reassurance line, the
          FAQ closer, and the Final CTA. */}
      <section
        id="builder"
        className="he-section-rule section-enter section-y-lg bg-[color:var(--sand)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
        aria-labelledby="studio-title"
      >
        <div className="container-x">
          {/* Inner anchor target for /#studio — sits right before the
              "Create it live." rail so deep-links land on the Studio
              block, not the wider builder eyebrow. scroll-mt matches
              the same offset used elsewhere on the page. */}
          <div
            id="studio"
            aria-hidden="true"
            className="scroll-mt-24 md:scroll-mt-28"
          />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center max-w-6xl mx-auto w-full min-w-0">
            {/* On mobile: text rail (with the headline) renders FIRST so
                the user reads "Create it live." before seeing the
                device. On desktop the rail returns to the left so the
                reading flow stays natural. */}
            <div className="reveal lg:col-span-5 lg:order-1 order-1">
              <span className="he-eyebrow-bar mb-5">
                <span className="live-dot" aria-hidden="true" />
                Experience Studio
              </span>
              <h2
                id="studio-title"
                className="serif mt-3 text-[2.1rem] sm:text-[2.5rem] md:text-[3.8rem] leading-[1.05] md:leading-[0.96] tracking-[-0.02em] text-[color:var(--charcoal)] font-medium"
              >
                Design your day. <span className="italic font-normal text-[color:var(--teal)]">Reserve in minutes.</span>
              </h2>
              <p className="mt-5 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.7] max-w-md font-normal">
                Choose <span className="kw">mood</span>, group and rhythm. The Studio draws a <span className="kw">real route</span>, real timings and a live price — then confirms instantly. The only path on the page that reserves in a single tap.
              </p>

              {/* Three Studio inputs — small index, signposts the
                  live chips at the top of the preview device. */}
              <ol className="mt-7 grid grid-cols-3 gap-1.5 max-w-md" aria-label="Three Studio inputs">
                {["Mood", "Who", "Rhythm"].map((label, i) => (
                  <li key={label} className="flex flex-col gap-1.5">
                    <span aria-hidden="true" className="block h-[3px] bg-[color:var(--gold)]" />
                    <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal)] tabular-nums">
                      0{i + 1} · {label}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-4">
                <CtaButton to="/studio-v2" variant="primary">
                  Start designing
                </CtaButton>
              </div>

              {/* Conversion microcopy — under-CTA trust trio. */}
              <p className="mt-4 inline-flex items-center gap-2 text-[12.5px] md:text-[13px] leading-[1.55] text-[color:var(--charcoal)] max-w-md">
                <span aria-hidden="true" className="block h-px w-5 bg-[color:var(--gold)]" />
                <span className="font-medium">About 90 seconds · 11 quick steps · live pricing.</span>
              </p>

              {/* Reassurance line — direct conversion language. */}
              <p className="mt-3 inline-flex items-start gap-2 text-[12.5px] md:text-[13px] leading-[1.6] text-[color:var(--charcoal-soft)] max-w-md">
                <MessageCircle size={13} aria-hidden="true" className="mt-[3px] shrink-0 text-[color:var(--teal)]" />
                <span>Instant reservation · cancel free up to 48h · <span className="font-medium text-[color:var(--charcoal)]">a local replies on WhatsApp.</span></span>
              </p>
            </div>

            <div className="he-parallax-counter lg:col-span-7 lg:order-2 order-2">
              <StudioLivePreview />
            </div>
          </div>
        </div>
      </section>





      {/* 5a — PathfinderQuiz removed from homepage (file kept). */}


      {/* 5 — SIGNATURE EXPERIENCES PREVIEW
          Up to 4 real Signature tours. Each card uses the tour's real
          hero image (sourced from the matching Viator page), real title
          and real blurb from `signatureTours`. No vague taglines, no
          repeated labels. */}
      <section
        id="signatures"
        className="he-section-rule section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
        aria-labelledby="signatures-title"
      >
        <div className="container-x">
          <div className="reveal text-center max-w-2xl mx-auto mb-10 md:mb-14">
            <span className="he-eyebrow-bar mb-5">Signature experiences</span>
            <h2 id="signatures-title" className="serif mt-3 text-[1.8rem] sm:text-[2.1rem] md:text-[2.95rem] leading-[1.12] md:leading-[1.02] tracking-[-0.014em] text-[color:var(--charcoal)] font-medium">
              Signature days, <span className="italic font-normal text-[color:var(--teal)]">ready when you are.</span>
            </h2>
            <p className="mt-4 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
              Loved by hundreds. Book one as it is, or refine the details that matter to you.
            </p>
          </div>

          {/* Mobile: full-bleed editorial cover carousel. Uses
              snap-proximity (NOT mandatory) so the horizontal strip
              never grabs vertical page scroll near snap points — that
              was the main source of "jumpy" feel on Android. Each card
              is 84vw so the next card peeks. `overscroll-x-contain`
              + `[contain:layout_paint]` isolate the strip from the
              page so its own scroll never reflows neighbours.
              Tablet+: keeps the calm 2/4-col grid. */}
          <ul
            className={[
              scrollDebug.staticMobileCarousels
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : "flex sm:grid sm:grid-cols-2 lg:grid-cols-4 -mx-5 px-5 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible overscroll-x-contain sm:overscroll-auto [contain:layout_paint] sm:[contain:none] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
              "he-stagger gap-5 md:gap-7 list-none p-0",
            ].join(" ")}
            aria-label="Signature experiences"
          >
            {signatures.map((t) => {
              return (
                <li
                  key={t.id}
                  className={
                    scrollDebug.staticMobileCarousels
                      ? "reveal-stagger w-full"
                      : "reveal-stagger shrink-0 w-[84vw] sm:w-auto sm:shrink"
                  }
                >
                  {/* Card is a structured composition (NOT a single link) so
                      we can expose two distinct CTAs — Book + Tailor — and
                      a short list of REAL highlights pulled from the
                      Viator-sourced catalog. No invented copy. */}
                  <article
                    className="he-card-lift group relative flex flex-col h-full overflow-hidden rounded-[6px] border border-[color:var(--border)] bg-[color:var(--ivory)] transition-all duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-[color:var(--charcoal)]/30 hover:shadow-[0_18px_40px_-22px_rgba(46,46,46,0.32)]"
                  >
                    {/* Cover — clickable to detail page */}
                    <Link
                      to="/tours/$tourId"
                      params={{ tourId: t.id }}
                      className="he-image-cinema he-image-rise relative block aspect-[4/5] overflow-hidden bg-[color:var(--card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                      aria-label={`Open ${t.title}`}
                    >
                      <img
                        src={t.img}
                        alt={t.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.05]"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent"
                      />
                      {/* Top row: region + price */}
                      <div className="absolute inset-x-0 top-0 p-4 md:p-5 flex items-start justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-[0.28em] text-white/85 drop-shadow-sm">
                          {t.region}
                        </span>
                        <span className="inline-flex items-baseline gap-1 rounded-full bg-[color:var(--ivory)]/95 px-2.5 py-1 text-[color:var(--charcoal)] shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
                          <span className="text-[10.5px] uppercase tracking-[0.2em] font-semibold">
                            From
                          </span>
                          <span className="serif text-[14px] leading-none">
                            €{t.priceFrom}
                          </span>
                        </span>
                      </div>
                      {/* Bottom: real title + real duration */}
                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-white">
                        <h3 className="serif text-[1.35rem] md:text-[1.5rem] leading-[1.18] text-white text-balance">
                          {t.title}
                        </h3>
                        <span className="mt-2 inline-block text-[11px] uppercase tracking-[0.22em] text-white/85">
                          {t.durationHours} · Private
                        </span>
                      </div>
                    </Link>

                    {/* Body — real teaser + real highlights + dual CTAs */}
                    <div className="flex flex-col gap-4 p-5 md:p-6">
                      <p className="text-[13.5px] leading-[1.55] text-[color:var(--charcoal)]">
                        {t.line}
                      </p>

                      {/* Real highlights — pulled directly from the
                          tour's `highlights` array. Capped at 3 for
                          card-level legibility. */}
                      {t.highlights.length > 0 && (
                        <ul className="flex flex-col gap-1.5 text-[12.5px] leading-[1.5] text-[color:var(--charcoal)]">
                          {t.highlights.map((h) => (
                            <li key={h} className="flex items-start gap-2">
                              <span
                                aria-hidden="true"
                                className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]"
                              />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Dual CTAs — Reserve (confirm as designed) +
                          Make it yours (open the same day for refinement).
                          "Make it yours" is the brand-aligned phrasing
                          for the Tailored path: adjustments INSIDE one
                          Signature, never a different tour. */}
                      <div className="mt-auto flex flex-col xs:flex-row gap-2.5 pt-1">
                        <CtaButton
                          to="/tours/$tourId"
                          params={{ tourId: t.id }}
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          aria-label={`Reserve ${t.title}`}
                        >
                          Reserve this day
                        </CtaButton>
                        <CtaButton
                          to="/tours/$tourId/tailor"
                          params={{ tourId: t.id }}
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          aria-label={`Make ${t.title} yours`}
                        >
                          Make it yours
                        </CtaButton>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          {/* Mobile-only swipe hint */}
          <p className={scrollDebug.staticMobileCarousels ? "hidden" : "sm:hidden mt-4 text-center text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal)]"}>
            Swipe to explore
          </p>

          <div className="mt-12 md:mt-14 text-center">
            <CtaButton to="/experiences" variant="ghost" size="sm">
              See every Signature
            </CtaButton>
          </div>
        </div>
      </section>

      {/* 5b — RECENT JOURNEY (multi-day proof)
          Real anonymized 15-day private journey from Lisbon to the
          Costa Vicentina — proof, not promise. Lives right after
          Signatures so multi-day appears naturally as the next scale
          up from a Signature day. */}
      <RecentJourney />



      {/* 6 — PROPOSALS / CELEBRATIONS / CORPORATE / MULTI-DAY
          One combined editorial band — Proposals, Celebrations,
          Corporate & Groups, and Multi-Day routes — so every "bigger
          occasion" path lives together with clear hierarchy. */}
      <section
        id="occasions"
        className="he-section-rule section-enter section-y bg-[color:var(--sand)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
        aria-labelledby="groups-title"
      >
        <div className="container-x">
          <div className="reveal text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <span className="he-eyebrow-bar mb-5">Proposals · Celebrations · Corporate</span>
            <h2 id="groups-title" className="serif mt-3 text-[1.8rem] sm:text-[2.1rem] md:text-[2.95rem] leading-[1.12] md:leading-[1.02] tracking-[-0.014em] text-[color:var(--charcoal)] font-medium">
              Moments that deserve <span className="italic font-normal text-[color:var(--teal)]">a setting.</span>
            </h2>
            <p className="mt-4 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
              Three occasions, one standard of care. Proposals planned in secret, celebrations woven around your people, and corporate days delivered with the same attention to detail.
            </p>
          </div>

          {/* Three premium feature blocks — alternating image/text on
              tablet+, stacked image-then-text on mobile. Each block:
              animated category label, soft gold divider, bold serif
              headline, body with one highlighted phrase, italic pull
              line, gold detail line, CTA with arrow nudge. */}
          <div className="max-w-6xl mx-auto flex flex-col gap-12 md:gap-16">
            {groupsAndCelebrations.map((m, i) => {
              const reverse = i % 2 === 1;
              return (
                <article
                  key={m.eyebrow}
                  id={m.id}
                  className="reveal-stagger he-seq group grid grid-cols-1 md:grid-cols-12 gap-7 md:gap-12 items-center scroll-mt-24 md:scroll-mt-28"
                >
                  {/* Image side */}
                  <Link
                    to={m.to}
                    aria-label={m.cta}
                    onMouseMove={(e) => {
                      // Pointer-aware micro-tilt: max ±2.5deg, dampened.
                      const el = e.currentTarget as HTMLElement;
                      const r = el.getBoundingClientRect();
                      const px = (e.clientX - r.left) / r.width - 0.5;
                      const py = (e.clientY - r.top) / r.height - 0.5;
                      el.style.setProperty("--tilt-y", `${(px * 5).toFixed(2)}deg`);
                      el.style.setProperty("--tilt-x", `${(-py * 4).toFixed(2)}deg`);
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.setProperty("--tilt-y", "0deg");
                      el.style.setProperty("--tilt-x", "0deg");
                    }}
                    className={
                      "he-tilt relative block md:col-span-7 overflow-hidden rounded-[2px] border border-[color:var(--border)] bg-[color:var(--card)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 " +
                      (reverse ? "md:order-2" : "md:order-1")
                    }
                  >
                    <div className="he-image-cinema he-image-rise relative aspect-[4/3] md:aspect-[5/4] overflow-hidden">
                      <img
                        src={m.img}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.05]"
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal-deep)]/40 via-[color:var(--charcoal-deep)]/10 to-transparent" />
                      {/* Subtle animated category label — soft pulsing
                          gold dot signals "live / curated", and the pill
                          lifts gently on hover. */}
                      <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal)] shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
                        <span aria-hidden="true" className="live-dot" />
                        {m.eyebrow}
                      </span>
                    </div>
                  </Link>

                  {/* Text side */}
                  <div
                    className={
                      "md:col-span-5 flex flex-col pt-1 md:pt-0 " +
                      (reverse ? "md:order-1" : "md:order-2")
                    }
                  >
                    {/* Soft gold divider — animates from left on reveal */}
                    <span aria-hidden="true" className="gold-rule mb-4 md:mb-5 max-w-[3rem] md:max-w-[3.5rem]" />
                    {(() => {
                      const accent =
                        m.id === "proposals" ? "var(--gold)" :
                        m.id === "celebrations" ? "var(--teal-2)" :
                        m.id === "corporate" ? "var(--teal)" :
                        "var(--charcoal)";
                      return (
                        <>
                          <span className="inline-flex items-center gap-2.5 text-[10.5px] md:text-[10.5px] uppercase tracking-[0.24em] md:tracking-[0.3em] font-semibold text-[color:var(--charcoal-soft)]">
                            <span aria-hidden="true" className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: accent }} />
                            {m.eyebrow}
                          </span>
                          <h3 className="serif mt-3 text-[1.6rem] md:text-[2.1rem] leading-[1.14] md:leading-[1.08] tracking-[-0.014em] text-[color:var(--charcoal)] font-medium">
                            {m.title}
                          </h3>
                          <p className="mt-4 md:mt-4 text-[14.5px] md:text-[16px] leading-[1.65] md:leading-[1.7] text-[color:var(--charcoal-soft)]">
                            {m.line}
                          </p>
                          <p className="mt-4 md:mt-4 text-[13.5px] md:text-[14.5px] leading-[1.55] text-[color:var(--charcoal-soft)]">
                            {m.pull}
                          </p>
                          <p className="mt-5 md:mt-5 inline-flex items-center gap-2.5 text-[10.5px] md:text-[10.5px] uppercase tracking-[0.22em] md:tracking-[0.26em] font-semibold text-[color:var(--charcoal-soft)]">
                            <span aria-hidden="true" className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: accent }} />
                            {m.detail}
                          </p>
                          {/* What we handle — checklist of concrete deliverables.
                              Editorial, not form-y: tight serif label, gold/teal
                              ticks per accent, no boxes. */}
                          <p className="mt-7 md:mt-6 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
                            What we handle
                          </p>
                          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 list-none p-0">
                            {m.handles.map((h) => (
                              <li
                                key={h}
                                className="flex items-start gap-2 text-[13px] leading-[1.55] text-[color:var(--charcoal)]"
                              >
                                <span
                                  aria-hidden="true"
                                  className="mt-[2px] inline-flex shrink-0 items-center justify-center font-bold text-[12px]"
                                  style={{ color: accent }}
                                >
                                  ✓
                                </span>
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      );
                    })()}
                    <CtaButton
                      to={m.to}
                      variant="primary"
                      className="mt-7 md:mt-6 self-start"
                    >
                      {m.cta}
                    </CtaButton>
                    <p className="mt-3 text-[11.5px] leading-[1.55] text-[color:var(--charcoal-soft)]/85 font-normal">
                      {m.trust}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>


      {/* 7 — FAQ
          Reuses the shared FAQ component, which renders its own
          labelled landmark with visible expandable answers. The wrapper
          section below carries the spacing class the lock checks; the
          inner FAQ component carries aria-labelledby="faq-title". */}
      <section
        id="faq"
        className="he-section-rule section-enter section-y scroll-mt-24 md:scroll-mt-28 relative"
        aria-labelledby="faq-title"
      >
        <FAQ />
      </section>

      {/* 8 — FINAL CTA — Talk to a local
          Distinct from the hero CTAs (Explore Signatures / Build) — this
          is the human escape hatch. No duplicate CTA band; one purpose,
          one button. */}
      <section
        id="final-cta"
        className="section-y relative overflow-hidden bg-[color:var(--sand)] text-[color:var(--charcoal)] scroll-mt-24 md:scroll-mt-28"
        aria-labelledby="final-cta-title"
      >
        {/* Warm ivory→sand wash so the section reads as a chapter, not a
            block. Decorative + aria-hidden. No animation. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--ivory) 92%, transparent), transparent 70%)",
          }}
        />

        <div className="container-x relative">
          {/* Chapter divider above the card — gold dot + flanking rules */}
          <div className="reveal max-w-md mx-auto mb-10 md:mb-14" aria-hidden="true">
            <div className="chapter-divider"><span className="dot" /></div>
          </div>

          {/* Final CTA card — deep teal with champagne-gold hairline,
              gold top rule and a soft warm shadow. Editorial radius. */}
          <div className="reveal mx-auto max-w-2xl">
            <div
              className="relative overflow-hidden rounded-[6px] bg-[color:var(--ivory)] text-[color:var(--charcoal)] px-6 py-10 sm:px-10 sm:py-12 md:px-14 md:py-14 text-center"
              style={{
                border: "1px solid color-mix(in oklab, var(--gold-deep) 55%, transparent)",
                boxShadow:
                  "0 1px 0 0 color-mix(in oklab, var(--gold) 22%, transparent) inset, " +
                  "0 24px 60px -28px color-mix(in oklab, var(--charcoal) 18%, transparent), " +
                  "0 12px 28px -18px color-mix(in oklab, var(--charcoal-deep) 14%, transparent)",
              }}
            >
              {/* Soft warm wash — ivory to sand for editorial depth */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 90% at 90% 0%, color-mix(in oklab, var(--sand) 55%, transparent), transparent 60%), " +
                    "radial-gradient(60% 80% at 5% 100%, color-mix(in oklab, var(--sand) 40%, transparent), transparent 65%)",
                }}
              />
              {/* Gold top rule — short, centered, the editorial signature */}
              <div
                aria-hidden="true"
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-24 md:w-32"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--gold-warm) 50%, transparent)",
                  opacity: 0.9,
                }}
              />

              <div className="relative">
                <span className="he-eyebrow-bar mb-5">
                  <MessageCircle aria-hidden="true" />
                  Prefer a conversation
                </span>
              <h2
                id="final-cta-title"
                className="serif mt-3 text-[2.1rem] sm:text-[2.5rem] md:text-[3.8rem] leading-[1.05] md:leading-[0.96] tracking-[-0.02em] text-[color:var(--charcoal)] font-medium"
              >
                  Ready to design your{" "}
                  <span className="italic font-normal text-[color:var(--teal)]">
                    Portugal?
                  </span>
                </h2>
                <p className="mt-5 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.7] max-w-md mx-auto">
                  Build it live in the Studio, choose a Signature, or write to a local.
                </p>
                <div className="reveal-stagger mt-9 flex flex-col sm:flex-row gap-y-4 gap-x-4 justify-center items-stretch sm:items-center">
                  <CtaButton to="/studio-v2" variant="primary">
                    Open the Studio
                  </CtaButton>
                  <CtaButton to="/contact" variant="ghost">
                    Write to a Local
                  </CtaButton>
                </div>
                <p className="serif mt-6 text-[13px] italic text-[color:var(--charcoal-soft)]">
                  A local replies within the day — usually within the hour.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </SiteLayout>
  );
}
