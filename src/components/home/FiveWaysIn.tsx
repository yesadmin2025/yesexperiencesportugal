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
import { BookOpen, Compass, Sparkles, Users, Wand2, type LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaMotionArrow } from "@/components/ui/CtaButton";
import { Scene } from "@/components/motion/Scene";

type Path = {
  id: "signature" | "studio" | "designer" | "proposals" | "corporate";
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  titleLead: string;
  titleEmphasis: string;
  body: string;
  cta: string;
  href: string;
  analyticsEvent: string;
};

const PATHS: ReadonlyArray<Path> = [
  {
    id: "signature",
    Icon: BookOpen,
    eyebrow: "Signature experiences",
    title: "Private days, already designed by YES.",
    titleLead: "Private days,",
    titleEmphasis: "already designed by YES.",
    body: "Choose one of our private experiences and enjoy it as designed, or tailor a few details.",
    cta: "Explore Signatures",
    href: "/experiences",
    analyticsEvent: "home_path_signature_click",
  },
  {
    id: "studio",
    Icon: Wand2,
    eyebrow: "Studio",
    title: "Your day, designed by you.",
    titleLead: "Your day,",
    titleEmphasis: "designed by you.",
    body: "Choose the mood, rhythm and route in real time. See the live price and reserve instantly, with local support if you need it.",
    cta: "Open the Studio",
    href: "/studio-v3",
    analyticsEvent: "home_path_studio_click",
  },
  {
    id: "designer",
    Icon: Compass,
    eyebrow: "Travel designer",
    title: "Full Portugal journeys, designed for you.",
    titleLead: "Full Portugal journeys,",
    titleEmphasis: "designed for you.",
    body: "From a few days to a full journey across Portugal, shaped around your time, rhythm and interests.",
    cta: "Begin with a designer",
    href: "/multi-day",
    analyticsEvent: "home_path_designer_click",
  },
  {
    id: "proposals",
    Icon: Sparkles,
    eyebrow: "Moments",
    title: "Proposals & celebrations, held with care.",
    titleLead: "Proposals & celebrations,",
    titleEmphasis: "held with care.",
    body: "The proposal on the cliff, the anniversary in a vineyard, the birthday nobody forgets — quietly composed, precisely held.",
    cta: "Share the occasion",
    href: "/proposal-in-portugal",
    analyticsEvent: "home_secondary_moments_click",
  },
  {
    id: "corporate",
    Icon: Users,
    eyebrow: "Corporate & groups",
    title: "Team days, incentives & private groups.",
    titleLead: "Team days, incentives",
    titleEmphasis: "& private groups.",
    body: "From intimate boards to full incentives — transport, venues and timing handled with a single point of contact.",
    cta: "Plan a group day",
    href: "/corporate",
    analyticsEvent: "home_secondary_corporate_click",
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

export function FiveWaysIn() {
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
      id="five-paths"
      aria-labelledby="choose-path-title"
      className="five-ways-section section-enter pt-16 pb-10 md:pt-20 md:pb-14 bg-[color:var(--sand)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x">
        <Scene className="home-major-intro home-story-intro mx-auto max-w-2xl text-center">
          <div className="scene-atmosphere"><Eyebrow flank className="mb-5">Where to begin</Eyebrow></div>
          <SectionTitle id="choose-path-title" className="five-ways-heading scene-title">
            Five ways to <SectionTitle.Em>shape your Portugal.</SectionTitle.Em>
          </SectionTitle>
        </Scene>

        <Scene
          data-testid="home-smart-start"
          className="five-ways-story mx-auto mt-8 max-w-6xl md:mt-10"
        >
          {PATHS.map((path, index) => (
            <PathCard
              key={path.id}
              path={path}
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
              Resume your draft <CtaMotionArrow />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}

function PathCard({ path, index }: { path: Path; index: number }) {
  const Icon = path.Icon;
  return (
    <Link
      to={path.href}
      data-home-primary-path={path.id}
      data-analytics={path.analyticsEvent}
      className={`five-ways-card five-ways-card--${path.id} scene-item group no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2`}
    >
      <div className="five-ways-copy">
        <div className="five-ways-kicker flex items-start justify-between gap-4">
          <span className="five-ways-icon" aria-hidden="true"><Icon size={19} strokeWidth={1.7} /></span>
          <span className="five-ways-number">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <p className="five-ways-eyebrow mt-5">{path.eyebrow}</p>
        <h3 className="five-ways-title editorial-title-safe t-h3 mt-3 font-normal text-[color:var(--charcoal)]">
          {path.title === `${path.titleLead} ${path.titleEmphasis}` ? (
            <>{path.titleLead} <em className="font-normal text-[color:var(--teal)]">{path.titleEmphasis}</em></>
          ) : path.title}
        </h3>
        <p className="five-ways-body mt-3 text-[14px] leading-[1.65] text-[color:var(--charcoal-soft)] md:text-[15px]">
          {path.body}
        </p>
        <span className="five-ways-action mt-auto flex min-h-[44px] w-full items-center justify-between gap-3 pt-5">
          <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--teal)]">
            {path.cta}
          </span>
          <CtaMotionArrow />
        </span>
      </div>
    </Link>
  );
}
