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
import { BookOpen, Wand2, Compass, Sparkles, Users, ArrowRight, type LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";

type Path = {
  id: "signature" | "studio" | "designer" | "proposals" | "corporate";
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  analyticsEvent: string;
};

const PATHS: ReadonlyArray<Path> = [
  {
    id: "signature",
    Icon: BookOpen,
    eyebrow: "Ready to book",
    title: "A private day, ready to go",
    body: "Start from a route we drive every week, then tailor only the details that matter to you.",
    cta: "Explore private days",
    href: "/experiences",
    analyticsEvent: "home_path_signature_click",
  },
  {
    id: "studio",
    Icon: Wand2,
    eyebrow: "One custom day",
    title: "Shape a day around you",
    body: "Mood, pace and people — see the real route and the live price before you reserve.",
    cta: "Design your day",
    href: "/studio-v3",
    analyticsEvent: "home_path_studio_click",
  },
  {
    id: "designer",
    Icon: Compass,
    eyebrow: "Several days",
    title: "Plan a whole Portugal journey",
    body: "A local Travel Designer shapes the route, pace, stays and logistics around the way you travel.",
    cta: "Plan your Portugal journey",
    href: "/multi-day",
    analyticsEvent: "home_path_designer_click",
  },
  {
    id: "proposals",
    Icon: Sparkles,
    eyebrow: "Proposals & celebrations",
    title: "A private moment, planned discreetly",
    body: "Proposals, anniversaries and milestone days shaped around the people and setting that matter.",
    cta: "Plan your proposal",
    href: "/proposal-in-portugal",
    analyticsEvent: "home_secondary_moments_click",
  },
  {
    id: "corporate",
    Icon: Users,
    eyebrow: "Corporate & private groups",
    title: "Bring people together in Portugal",
    body: "Off-sites, incentives, client hosting and private group days with the practical details handled.",
    cta: "Plan a private group day",
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

export function FourWaysIn() {
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
      className="he-section-rule section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x">
        <div className="reveal mx-auto max-w-2xl text-center">
          <Eyebrow className="mb-5">Where to begin</Eyebrow>
          <h2
            id="choose-path-title"
            className="serif text-[2rem] sm:text-[2.4rem] md:text-[3.25rem] leading-[1.08] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            Five ways <span className="italic font-normal text-[color:var(--teal)]">into Portugal.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] md:text-[17px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            Begin with a private day, design your own, plan a full journey, or bring us a moment that matters.
          </p>
        </div>

        <div
          data-testid="home-smart-start"
          className="reveal mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:gap-5 lg:grid-cols-6"
        >
          {PATHS.map((path, index) => (
            <PathCard key={path.id} path={path} featured={index < 3} />
          ))}
        </div>

        {hasDraft && (
          <div className="reveal mx-auto mt-5 max-w-6xl rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
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

function PathCard({ path, featured }: { path: Path; featured: boolean }) {
  const Icon = path.Icon;
  return (
    <Link
      to={path.href}
      data-home-primary-path={path.id}
      data-analytics={path.analyticsEvent}
      className={`${featured ? "lg:col-span-2" : "lg:col-span-3"} group flex min-h-[238px] flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--sand)] p-6 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--gold)]/70 hover:shadow-[0_18px_40px_-30px_rgba(46,46,46,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 md:p-7`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--gold)]/45 bg-[color:var(--ivory)] text-[color:var(--teal)]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="text-[11.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--teal)]">
          {path.eyebrow}
        </span>
      </div>

      <h3 className="serif mt-7 text-[1.55rem] md:text-[1.7rem] leading-[1.15] font-medium text-[color:var(--charcoal)]">
        {path.title}
      </h3>
      <p className="mt-3 text-[15px] md:text-[16px] leading-[1.7] text-[color:var(--charcoal-soft)]">
        {path.body}
      </p>
      <span className="mt-auto pt-7 inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.15em] font-semibold text-[color:var(--teal)] group-hover:text-[color:var(--charcoal)]">
        {path.cta} <ArrowRight size={14} aria-hidden="true" />
      </span>
    </Link>
  );
}
