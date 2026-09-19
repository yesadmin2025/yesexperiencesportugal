/**
 * Homepage decision block.
 *
 * Conversion rule: five first-class services, each with a clear intent.
 * Signature and Studio lead the commercial paths; Travel Designer,
 * Proposals and Corporate remain equally discoverable.
 * No pricing, inventory, routing or checkout truth lives here.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaMotionArrow } from "@/components/ui/CtaButton";
import { Scene } from "@/components/motion/Scene";
import { CTA_LABELS } from "@/content/cta-vocabulary";
import { HOME_PATH_DESTINATIONS, useHomePathDestinations, type HomePathId } from "@/content/home-path-images";
import { ResponsiveEditorialImage, type EditorialImageSource } from "@/components/ui/ResponsiveEditorialImage";

type Path = {
  id: "signature" | "studio" | "designer" | "proposals" | "corporate";
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  analyticsEvent: string;
  image: EditorialImageSource;
  routeLabel: string;
};

const PATHS: ReadonlyArray<Path> = [
  {
    id: "studio",
    eyebrow: "One custom day",
    title: "Shape a day around you",
    body: "Mood, pace and people — see the real route and live price, then confirm your private day instantly.",
    cta: CTA_LABELS.studio,
    href: "/studio-v3",
    analyticsEvent: "home_path_studio_click",
    image: HOME_PATH_DESTINATIONS.studio.image,
    routeLabel: HOME_PATH_DESTINATIONS.studio.routeLabel,
  },
  {
    id: "signature",
    eyebrow: "Ready to book",
    title: "A private day, ready to go",
    body: "Reserve a proven private day as it is or tailor the details — with the real price and instant confirmation.",
    cta: CTA_LABELS.signatureDiscovery,
    href: "/experiences",
    analyticsEvent: "home_path_signature_click",
    image: HOME_PATH_DESTINATIONS.signature.image,
    routeLabel: HOME_PATH_DESTINATIONS.signature.routeLabel,
  },
  {
    id: "designer",
    eyebrow: "Several days",
    title: "Plan a whole Portugal journey",
    body: "A local Travel Designer shapes the route, pace, stays and logistics around the way you travel.",
    cta: CTA_LABELS.travelDesigner,
    href: "/multi-day",
    analyticsEvent: "home_path_designer_click",
    image: HOME_PATH_DESTINATIONS.designer.image,
    routeLabel: HOME_PATH_DESTINATIONS.designer.routeLabel,
  },
  {
    id: "proposals",
    eyebrow: "Proposals & celebrations",
    title: "A private moment, planned discreetly",
    body: "Proposals, anniversaries and milestone days shaped around the people and setting that matter.",
    cta: CTA_LABELS.moments,
    href: "/proposal-in-portugal",
    analyticsEvent: "home_secondary_moments_click",
    image: HOME_PATH_DESTINATIONS.proposals.image,
    routeLabel: HOME_PATH_DESTINATIONS.proposals.routeLabel,
  },
  {
    id: "corporate",
    eyebrow: "Corporate & private groups",
    title: "Bring people together in Portugal",
    body: "Off-sites, incentives, client hosting and private group days with the practical details handled.",
    cta: CTA_LABELS.corporate,
    href: "/corporate",
    analyticsEvent: "home_secondary_corporate_click",
    image: HOME_PATH_DESTINATIONS.corporate.image,
    routeLabel: HOME_PATH_DESTINATIONS.corporate.routeLabel,
  },
] as const;

const FEELING_LABELS: Readonly<Record<string, string>> = {
  coastal: "Coastal",
  "wine-food": "Wine & food",
  hidden: "Hidden Portugal",
  romance: "Romantic",
  culture: "Culture",
  adventure: "Adventure",
  "slow-luxury": "Slow luxury",
  faith: "Faith",
  "hands-on": "Hands-on",
};

const COMPANION_LABELS: Readonly<Record<string, string>> = {
  solo: "Solo",
  couple: "Couple",
  family: "Family",
  friends: "Friends",
  celebration: "Celebration",
  proposal: "Proposal",
  corporate: "Group",
};

const RHYTHM_LABELS: Readonly<Record<string, string>> = {
  slow: "Slow",
  balanced: "Balanced",
  full: "Full day",
  immersive: "Immersive",
};

export function FourWaysIn() {
  const managedDestinations = useHomePathDestinations();
  const managedPaths = new Map(managedDestinations.map((path) => [path.id, path]));
  const [draftSummary, setDraftSummary] = useState<ReadonlyArray<string>>([]);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    void import("@/lib/studio-v3/draftSnapshot")
      .then(({ STUDIO_V3_DURABLE_DRAFT_KEY, parseDurableStudioDraft }) => {
        if (cancelled) return;
        let raw: string | null = null;
        try {
          raw = window.localStorage.getItem(STUDIO_V3_DURABLE_DRAFT_KEY);
        } catch {
          return;
        }
        const draft = parseDurableStudioDraft(raw);
        if (!draft || cancelled) return;

        const labels = [
          draft.state.feeling ? FEELING_LABELS[draft.state.feeling] : null,
          draft.state.companions ? COMPANION_LABELS[draft.state.companions] : null,
          draft.state.rhythm ? RHYTHM_LABELS[draft.state.rhythm] : null,
        ].filter((label): label is string => Boolean(label));

        setHasDraft(true);
        setDraftSummary(labels.slice(0, 3));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="three-paths"
      aria-labelledby="choose-path-title"
      className="section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x">
        <div className="reveal mx-auto max-w-2xl text-center">
          <Eyebrow className="mb-5">Where to begin</Eyebrow>
          <h2
            id="choose-path-title"
            className="serif text-[1.8rem] sm:text-[2.1rem] lg:text-[2.95rem] leading-[1.12] lg:leading-[1.02] tracking-[-0.014em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            Five ways <span className="italic font-normal text-[color:var(--teal)]">into Portugal.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] md:text-[17px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            Begin with a private day, design your own, plan a full journey, or bring us a moment that matters.
          </p>
        </div>

        <Scene
          data-testid="home-smart-start"
          className="five-ways-story mx-auto mt-10 max-w-6xl md:mt-14"
        >
          {PATHS.map((path, index) => (
            <PathCard
              key={path.id}
              path={{
                ...path,
                title: managedPaths.get(path.id as HomePathId)?.title || path.title,
                routeLabel: managedPaths.get(path.id as HomePathId)?.routeLabel || path.routeLabel,
                image: managedPaths.get(path.id as HomePathId)?.image ?? path.image,
              }}
              index={index}
            />
          ))}
        </Scene>

        {hasDraft && (
          <div className="reveal mx-auto mt-5 max-w-6xl border border-[color:var(--border)] bg-[color:var(--sand)] px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[color:var(--teal)]">
                Your Studio draft is waiting
              </p>
              {draftSummary.length > 0 && (
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[color:var(--charcoal)]">
                  {draftSummary.join(" · ")}
                </p>
              )}
            </div>
            <Link
              to="/studio-v3"
              data-testid="home-smart-start-resume"
              data-smart-start-recommended="true"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.16em] font-semibold text-[color:var(--teal)] underline decoration-[color:var(--gold)]/70 underline-offset-4 sm:mt-0"
            >
              Resume your draft <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}

function PathCard({ path, index }: { path: Path; index: number }) {
  return (
    <Link
      to={path.href}
      data-home-primary-path={path.id}
      data-analytics={path.analyticsEvent}
      className={`five-ways-card five-ways-card--${path.id} scene-item group no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2`}
    >
      <div className="five-ways-image">
        <ResponsiveEditorialImage
          image={path.image}
          sizes={path.id === "studio" ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 768px) 40vw, 100vw"}
          className="h-full w-full object-cover"
        />
        <span className="five-ways-route">{path.routeLabel}</span>
      </div>
      <div className="five-ways-copy">
      <div className="five-ways-kicker flex items-center justify-between gap-4">
        <span className="text-[11.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)]">
          {String(index + 1).padStart(2, "0")} · {path.eyebrow}
        </span>
      </div>

      <h3 className="five-ways-title serif mt-7 text-[1.35rem] md:text-[1.5rem] leading-[1.18] font-medium text-[color:var(--charcoal)]">
        {path.title}
      </h3>
      <p className="five-ways-body mt-3 text-[15px] md:text-[16px] leading-[1.7] text-[color:var(--charcoal-soft)]">
        {path.body}
      </p>
      {/* Visible label + arrow — the whole card remains the action, but the
          destination is readable at a glance before clicking. The arrow is
          pushed to the right so every card's arrow aligns across the row. */}
      <span className="five-ways-action mt-auto pt-7 flex w-full min-h-[44px] items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--teal)]">
          {path.cta}
        </span>
        <CtaMotionArrow className="home-way-arrow" />
      </span>
      </div>
    </Link>
  );
}
