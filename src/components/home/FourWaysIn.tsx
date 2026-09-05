/**
 * FourWaysIn — homepage "where to begin" section.
 *
 * Conversion hierarchy:
 *   1. Signature = choose a ready private day
 *   2. Studio = create one private day
 *   3. Travel Designer = compose a multi-day journey
 * Moments and Corporate remain available as secondary occasion paths.
 */

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

export function FourWaysIn() {
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
            Choose how you want to{" "}
            <span className="italic font-normal text-[color:var(--teal)]">shape Portugal.</span>
          </h2>
          <p className="mt-5 text-[15px] md:text-[16px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Pick a private day already designed, build one live in the Studio, or let a Travel Designer compose the full journey.
          </p>
          <span aria-hidden="true" className="gold-rule mt-8 md:mt-9 mx-auto block max-w-[3rem]" />
        </div>

        <ul className="he-stagger max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 list-none p-0">
          {PRIMARY_PATHS.map((path, index) => (
            <li key={path.label} className="contents">
              <PathCard path={path} index={index} primary />
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
                <PathCard path={path} index={index + PRIMARY_PATHS.length} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PathCard({ path, index, primary = false }: { path: Path; index: number; primary?: boolean }) {
  return (
    <Link
      to={path.href}
      data-analytics={path.analyticsEvent}
      data-analytics-placement="five_ways"
      style={{ transitionDelay: `${index * 60}ms` }}
      className={[
        "fw-card reveal-stagger he-card-lift group relative flex flex-col rounded-[6px] bg-[color:var(--ivory)] overflow-hidden no-underline transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
        primary
          ? "border border-[color:var(--gold)]/35 p-6 md:p-7 shadow-[0_8px_28px_-24px_rgba(46,46,46,0.25)] hover:border-[color:var(--gold)]/65 hover:shadow-[0_20px_42px_-25px_rgba(41,91,97,0.25)]"
          : "border border-[#EAE2D6] p-5 md:p-6 shadow-[0_1px_2px_rgba(46,46,46,0.04)] hover:border-[color:var(--gold)]/50 hover:shadow-[0_16px_36px_-25px_rgba(46,46,46,0.18)]",
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

      <span className="relative mt-4 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] font-semibold text-[color:var(--teal)]">
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
