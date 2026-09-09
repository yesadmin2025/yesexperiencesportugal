/**
 * Homepage decision block.
 *
 * Conversion rule: three primary choices only.
 *   1. Signature = choose a ready private day
 *   2. Studio = build one private day around you
 *   3. Travel Designer = plan several days with a local designer
 *
 * Moments and Corporate remain available, but deliberately secondary.
 * No pricing, inventory, routing or checkout truth lives here.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Wand2, Compass, Sparkles, Users, ArrowRight, type LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";

type Path = {
  id: "signature" | "studio" | "designer";
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
    title: "Choose a private day",
    body: "Start with a proven YES route, then tailor only the details that matter to you.",
    cta: "Browse private days",
    href: "/experiences",
    analyticsEvent: "home_path_signature_click",
  },
  {
    id: "studio",
    Icon: Wand2,
    eyebrow: "One custom day",
    title: "Design it in the Studio",
    body: "Choose your mood, group and rhythm. See a real route and live price before you reserve.",
    cta: "Open the Studio",
    href: "/studio-v3",
    analyticsEvent: "home_path_studio_click",
  },
  {
    id: "designer",
    Icon: Compass,
    eyebrow: "Several days",
    title: "Plan a Portugal journey",
    body: "A local Travel Designer shapes the route, pace, stays and logistics around the way you travel.",
    cta: "Start with a designer",
    href: "/multi-day",
    analyticsEvent: "home_path_designer_click",
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
            Choose how you <span className="italic font-normal text-[color:var(--teal)]">want to travel.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] md:text-[17px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            One private day ready to book, one built around you, or several days planned with a local designer.
          </p>
        </div>

        <div
          data-testid="home-smart-start"
          className="reveal mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:gap-5"
        >
          {PATHS.map((path) => (
            <PathCard key={path.id} path={path} />
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

        <div className="reveal mx-auto mt-10 max-w-6xl border-t border-[color:var(--border)] pt-7 md:mt-12 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <p className="serif text-[1.2rem] md:text-[1.35rem] font-medium text-[color:var(--charcoal)]">
              Planning something special or a group?
            </p>
            <p className="mt-1 text-[14px] leading-[1.6] text-[color:var(--charcoal-soft)]">
              Mark a milestone beautifully, or let us shape a private day for your team.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 md:mt-0">
            <Link
              to="/proposal-in-portugal"
              data-analytics="home_secondary_moments_click"
              className="inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.15em] font-semibold text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
            >
              <Sparkles size={15} aria-hidden="true" /> Plan a private moment <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <Link
              to="/corporate"
              data-analytics="home_secondary_corporate_click"
              className="inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.15em] font-semibold text-[color:var(--teal)] hover:text-[color:var(--charcoal)]"
            >
              <Users size={15} aria-hidden="true" /> Design a team day <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PathCard({ path }: { path: Path }) {
  const Icon = path.Icon;
  return (
    <Link
      to={path.href}
      data-home-primary-path={path.id}
      data-analytics={path.analyticsEvent}
      className="group flex min-h-[255px] flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--sand)] p-6 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--gold)]/70 hover:shadow-[0_18px_40px_-30px_rgba(46,46,46,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 md:p-7"
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
