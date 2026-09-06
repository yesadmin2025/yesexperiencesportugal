/**
 * FourWaysIn — homepage "where to begin" section.
 *
 * Conversion hierarchy:
 *   1. Signature = choose a ready private day
 *   2. Studio = create one private day
 *   3. Travel Designer = compose a multi-day journey
 * Moments and Corporate remain available as secondary occasion paths.
 *
 * The Smart Start layer translates traveller intent into those product paths.
 * It is deterministic and presentational only: no pricing, inventory, route,
 * availability or checkout logic lives here.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Wand2, Sparkles, Compass, Users, type LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";

type Path = {
  num: string;
  Icon: LucideIcon;
  label: string;
  title: React.ReactNode;
  body: string;
  cta: string;
  href: string;
  analyticsEvent: string;
};

type SmartIntentId = "ready-day" | "create-day" | "journey" | "moment" | "group";

type SmartIntent = {
  id: SmartIntentId;
  prompt: string;
  product: string;
  reason: string;
  cta: string;
  href: string;
};

const PRIMARY_PATHS: Path[] = [
  {
    num: "01",
    Icon: BookOpen,
    label: "Signature Experiences",
    title: (
      <>
        Private days,{" "}
        <span className="italic font-normal text-[color:var(--teal)]">
          already designed by YES.
        </span>
      </>
    ),
    body: "Choose one of our private experiences and enjoy it as designed, or tailor a few details.",
    cta: "Explore Signatures",
    href: "/experiences",
    analyticsEvent: "five_ways_signature_click",
  },
  {
    num: "02",
    Icon: Wand2,
    label: "Studio",
    title: (
      <>
        Your day,{" "}
        <span className="italic font-normal text-[color:var(--teal)]">designed by you.</span>
      </>
    ),
    body: "Choose the mood, rhythm and route in real time. See the live price and reserve instantly, with local support if you need it.",
    cta: "Open the Studio",
    href: "/studio-v3",
    analyticsEvent: "five_ways_studio_click",
  },
  {
    num: "03",
    Icon: Compass,
    label: "Travel Designer",
    title: (
      <>
        Full Portugal journeys,{" "}
        <span className="italic font-normal text-[color:var(--teal)]">designed for you.</span>
      </>
    ),
    body: "From a few days to a full journey across Portugal, shaped around your time, rhythm and interests.",
    cta: "Begin with a designer",
    href: "/multi-day",
    analyticsEvent: "five_ways_travel_designer_click",
  },
];

const SECONDARY_PATHS: Path[] = [
  {
    num: "04",
    Icon: Sparkles,
    label: "Moments",
    title: (
      <>
        Proposals & celebrations,{" "}
        <span className="italic font-normal text-[color:var(--teal)]">held with care.</span>
      </>
    ),
    body: "The proposal on the cliff, the anniversary in a vineyard, the birthday nobody forgets — quietly composed, precisely held.",
    cta: "Share the occasion",
    href: "/proposal-in-portugal",
    analyticsEvent: "five_ways_moments_click",
  },
  {
    num: "05",
    Icon: Users,
    label: "Corporate & Groups",
    title: (
      <>
        Team days, incentives{" "}
        <span className="italic font-normal text-[color:var(--teal)]">& private groups.</span>
      </>
    ),
    body: "From intimate boards to full incentives — transport, venues and timing handled with a single point of contact.",
    cta: "Plan a group day",
    href: "/corporate",
    analyticsEvent: "five_ways_corporate_click",
  },
];

const SMART_INTENTS: ReadonlyArray<SmartIntent> = [
  {
    id: "ready-day",
    prompt: "One private day — I want a strong option ready",
    product: "Signature Experiences",
    reason:
      "You want one private day without building from zero. Start with a proven YES day, then tailor only the details that matter.",
    cta: "See the Signature days",
    href: "/experiences",
  },
  {
    id: "create-day",
    prompt: "One private day — I want it shaped around me",
    product: "Experience Studio",
    reason:
      "You want one day, but not a preset. The Studio reads mood, company, interests and rhythm, then composes a real route with a live price.",
    cta: "Start in the Studio",
    href: "/studio-v3",
  },
  {
    id: "journey",
    prompt: "Several days in Portugal",
    product: "Portugal Travel Designer",
    reason:
      "Several days create decisions between places, driving, stays and pace. A human Travel Designer is the strongest place to begin.",
    cta: "Begin my journey",
    href: "/multi-day",
  },
  {
    id: "moment",
    prompt: "A proposal, anniversary or celebration",
    product: "Moments",
    reason:
      "Here the occasion is the brief. Start with the moment, then location, timing and discreet logistics can be designed around it.",
    cta: "Plan the moment",
    href: "/proposal-in-portugal",
  },
  {
    id: "group",
    prompt: "A company, incentive or private group",
    product: "Corporate & Groups",
    reason:
      "Group size changes transport, timing and venue choices. Start with the operational layer so the experience stays effortless for everyone.",
    cta: "Plan the group",
    href: "/corporate",
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
  const [selectedIntentId, setSelectedIntentId] = useState<SmartIntentId | null>(null);
  const [draftSummary, setDraftSummary] = useState<ReadonlyArray<string>>([]);
  const [hasDraft, setHasDraft] = useState(false);

  const selectedIntent = SMART_INTENTS.find((intent) => intent.id === selectedIntentId) ?? null;
  const recommendedHref = selectedIntent?.href ?? (hasDraft ? "/studio-v3" : null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    // Lazy-load the Studio draft parser after the homepage is interactive.
    // This keeps Studio persistence code out of the initial homepage bundle.
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
      .catch(() => {
        // Storage recovery is a convenience. The homepage must remain fully
        // usable when the optional Studio chunk or browser storage is blocked.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="three-paths"
      aria-labelledby="four-ways-title"
      className="he-section-rule section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x">
        <div className="reveal max-w-2xl mx-auto text-center mb-10 md:mb-14">
          <Eyebrow className="mb-5">Where to begin</Eyebrow>
          <h2
            id="four-ways-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.4rem] leading-[1.1] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            Tell us what you are planning.{" "}
            <span className="italic font-normal text-[color:var(--teal)]">We will point you in.</span>
          </h2>
          <p className="mt-5 text-[15px] md:text-[16px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Start with your intention, not a product name. One answer is enough to find the right YES path.
          </p>
          <span aria-hidden="true" className="gold-rule mt-8 md:mt-9 mx-auto block max-w-[3rem]" />
        </div>

        <div
          data-testid="home-smart-start"
          className="reveal mx-auto mb-10 md:mb-12 max-w-6xl overflow-hidden rounded-[6px] border border-[color:var(--gold)]/40 bg-[color:var(--sand)] shadow-[0_18px_46px_-38px_rgba(46,46,46,0.34)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="p-5 sm:p-6 md:p-8 lg:p-9">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--teal)]">
                  Quick match
                </p>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  One tap · no form
                </span>
              </div>

              <h3 className="serif mt-3 text-[1.5rem] sm:text-[1.75rem] leading-[1.2] text-[color:var(--charcoal)] font-medium">
                What are you planning?
              </h3>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="group" aria-label="Choose what you are planning">
                {SMART_INTENTS.map((intent) => {
                  const selected = selectedIntentId === intent.id;
                  return (
                    <a
                      key={intent.id}
                      href={intent.href}
                      // No click interception: a tap always navigates natively
                      // and immediately, even before hydration. The preview
                      // panel is driven by hover/focus (desktop + keyboard).
                      onMouseEnter={() => setSelectedIntentId(intent.id)}
                      onFocus={() => setSelectedIntentId(intent.id)}
                      aria-current={selected ? "true" : undefined}
                      data-smart-start-intent={intent.id}
                      data-analytics="smart_start_intent_selected"
                      data-analytics-intent={intent.id}
                      className={[
                        "flex min-h-[52px] items-center rounded-[4px] border px-4 py-3 text-left text-[13px] sm:text-[13.5px] leading-[1.45] font-medium no-underline transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2",
                        selected
                          ? "border-[color:var(--teal)] bg-[color:var(--ivory)] text-[color:var(--charcoal)] shadow-[0_8px_24px_-20px_rgba(41,91,97,0.65)]"
                          : "border-[color:var(--border)] bg-[color:var(--ivory)]/70 text-[color:var(--charcoal)] hover:border-[color:var(--gold)]/70 hover:bg-[color:var(--ivory)]",
                      ].join(" ")}
                    >
                      {intent.prompt}
                    </a>
                  );
                })}
              </div>
            </div>

            <div
              className="flex min-h-[255px] flex-col justify-center border-t border-[color:var(--gold)]/25 bg-[color:var(--charcoal)] p-5 sm:p-6 md:p-8 lg:min-h-0 lg:border-l lg:border-t-0 lg:p-9"
              aria-live="polite"
            >
              {selectedIntent ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[color:var(--gold)]">
                    Best starting point
                  </p>
                  <h3 className="serif mt-3 text-[1.7rem] sm:text-[2rem] leading-[1.12] text-[color:var(--ivory)] font-medium">
                    {selectedIntent.product}
                  </h3>
                  <p className="mt-4 max-w-xl text-[13.5px] sm:text-[14.5px] leading-[1.65] text-[color:var(--ivory)]/78">
                    {selectedIntent.reason}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <Link
                      to={selectedIntent.href}
                      data-testid="home-smart-start-recommendation"
                      data-analytics="smart_start_recommendation_click"
                      data-analytics-intent={selectedIntent.id}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-[3px] bg-[color:var(--gold)] px-5 py-3 text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ivory)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
                    >
                      {selectedIntent.cta}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelectedIntentId(null)}
                      className="inline-flex min-h-[44px] items-center px-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)]/68 hover:text-[color:var(--ivory)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    >
                      Change answer
                    </button>
                  </div>
                </>
              ) : hasDraft ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[color:var(--gold)]">
                    Welcome back
                  </p>
                  <h3 className="serif mt-3 text-[1.7rem] sm:text-[2rem] leading-[1.12] text-[color:var(--ivory)] font-medium">
                    Your Studio day is still here.
                  </h3>
                  <p className="mt-4 text-[13.5px] sm:text-[14.5px] leading-[1.65] text-[color:var(--ivory)]/78">
                    {draftSummary.length > 0
                      ? `You were shaping: ${draftSummary.join(" · ")}. Pick up exactly where you left it.`
                      : "Your privacy-safe draft is saved locally on this device. Pick up exactly where you left it."}
                  </p>
                  <Link
                    to="/studio-v3"
                    data-testid="home-smart-start-resume"
                    data-analytics="smart_start_resume_studio"
                    className="mt-6 inline-flex min-h-[46px] w-fit items-center justify-center rounded-[3px] bg-[color:var(--gold)] px-5 py-3 text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ivory)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
                  >
                    Continue my Studio day
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[color:var(--gold)]">
                    Your route into YES
                  </p>
                  <h3 className="serif mt-3 text-[1.7rem] sm:text-[2rem] leading-[1.12] text-[color:var(--ivory)] font-medium">
                    Start with the trip, not the menu.
                  </h3>
                  <p className="mt-4 max-w-xl text-[13.5px] sm:text-[14.5px] leading-[1.65] text-[color:var(--ivory)]/78">
                    Choose the sentence that sounds most like you. We will recommend the cleanest starting point, and you can still browse every option below.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
            Or browse every way in
          </p>
        </div>

        <ul className="he-stagger max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 list-none p-0">
          {PRIMARY_PATHS.map((path, index) => (
            <li key={path.label} className="contents">
              <PathCard
                path={path}
                index={index}
                primary
                recommended={recommendedHref === path.href}
              />
            </li>
          ))}
        </ul>

        <div className="mt-8 md:mt-10 max-w-4xl mx-auto border-t border-[color:var(--border)] pt-7 md:pt-8">
          <p className="mb-5 text-center text-[12px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
            Planning for an occasion or a group?
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 list-none p-0">
            {SECONDARY_PATHS.map((path, index) => (
              <li key={path.label} className="contents">
                <PathCard
                  path={path}
                  index={index + PRIMARY_PATHS.length}
                  recommended={recommendedHref === path.href}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PathCard({
  path,
  index,
  primary = false,
  recommended = false,
}: {
  path: Path;
  index: number;
  primary?: boolean;
  recommended?: boolean;
}) {
  return (
    <Link
      to={path.href}
      data-analytics={path.analyticsEvent}
      data-analytics-placement="five_ways"
      data-smart-start-recommended={recommended ? "true" : "false"}
      style={{ transitionDelay: `${index * 60}ms` }}
      className={[
        "fw-card reveal-stagger he-card-lift group relative flex flex-col rounded-[6px] bg-[color:var(--ivory)] overflow-hidden no-underline transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
        primary
          ? "border border-[color:var(--gold)]/35 p-6 md:p-7 shadow-[0_8px_28px_-24px_rgba(46,46,46,0.25)] hover:border-[color:var(--gold)]/65 hover:shadow-[0_20px_42px_-25px_rgba(41,91,97,0.25)]"
          : "border border-[color:var(--border)] p-5 md:p-6 shadow-[0_1px_2px_rgba(46,46,46,0.04)] hover:border-[color:var(--gold)]/50 hover:shadow-[0_16px_36px_-25px_rgba(46,46,46,0.18)]",
        recommended
          ? "ring-2 ring-[color:var(--teal)] ring-offset-2 ring-offset-[color:var(--ivory)]"
          : "",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[600ms] ease-out group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(70% 60% at 30% 0%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 70%)",
        }}
      />
      <span aria-hidden="true" className="gold-rule absolute left-0 top-0" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 bottom-0 h-px w-full origin-left scale-x-0 bg-[color:var(--gold)]/70 transition-transform duration-[600ms] ease-out group-hover:scale-x-100"
      />

      <div className="relative flex items-start justify-between gap-4 pr-1">
        <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/35 bg-[color:var(--ivory)] transition-all duration-300 group-hover:border-[color:var(--gold)]/75 group-hover:scale-[1.04]">
          <path.Icon
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-[color:var(--teal)] transition-transform duration-300 ease-out group-hover:translate-x-0.5"
          />
        </span>
        <span
          className="font-serif italic text-[2.9rem] md:text-[3.2rem] leading-none tabular-nums transition-all duration-500 ease-out group-hover:-translate-y-1"
          style={{ color: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
        >
          {path.num}
        </span>
      </div>

      {recommended ? (
        <span className="relative mt-4 w-fit rounded-full bg-[color:var(--teal)] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-semibold text-[color:var(--ivory)]">
          Best fit
        </span>
      ) : null}

      <span className={`relative ${recommended ? "mt-2.5" : "mt-4"} inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] font-semibold text-[color:var(--teal)]`}>
        {path.label}
      </span>
      <h3 className="relative serif mt-2.5 text-[1.3rem] md:text-[1.6rem] leading-[1.22] md:leading-[1.18] text-[color:var(--charcoal)] font-medium">
        {path.title}
      </h3>
      <p className="relative mt-3 text-[14px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-[1.6] flex-grow">
        {path.body}
      </p>
      <span className="relative mt-5 inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--charcoal)]">
        {path.cta}
        <span
          aria-hidden="true"
          className="text-[color:var(--gold)] transition-transform duration-300 ease-out group-hover:translate-x-1.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}

export default FourWaysIn;
