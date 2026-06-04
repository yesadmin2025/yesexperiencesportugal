/**
 * ThreePathsSection — homepage path-choice surface.
 *
 * Three cards mirroring the WhyYes editorial card pattern for full
 * homepage uniformity: number + icon row, eyebrow label, serif headline
 * with italic emphasis, body, and a strategic CTA line. No bespoke
 * styling — all canonical tokens and shared classes.
 */

import { Link } from "@tanstack/react-router";
import { BookOpen, Wand2, Compass, Sparkles, type LucideIcon } from "lucide-react";

type Path = {
  num: string;
  Icon: LucideIcon;
  label: string;
  title: React.ReactNode;
  body: React.ReactNode;
  cta: string;
  href: string;
  external?: boolean;
};

const PATHS: Path[] = [
  {
    num: "01",
    Icon: BookOpen,
    label: "Signature Experiences",
    title: (
      <>
        Curated private days, <span className="italic">yours to tailor.</span>
      </>
    ),
    body: (
      <>
        Flagship private experiences across Lisbon, Sintra, Arrábida and Sesimbra. Book as designed, or adjust the details that matter to you.
      </>
    ),
    cta: "Explore Signature Experiences",
    href: "/experiences",
  },
  {
    num: "02",
    Icon: Wand2,
    label: "Experience Studio",
    title: (
      <>
        Design a day, <span className="italic">reserve in minutes.</span>
      </>
    ),
    body: (
      <>
        An intelligent builder: shape mood, pace and priorities. See the real route, real timings and live price — then confirm instantly. No forms, no waiting.
      </>
    ),
    cta: "Open the Studio",
    href: "/studio-v2",
  },
  {
    num: "03",
    Icon: Compass,
    label: "Travel Designer",
    title: (
      <>
        Bespoke journeys, <span className="italic">shaped end to end.</span>
      </>
    ),
    body: (
      <>
        A local travel designer plans the full journey — multi-day routes, regional pacing, accommodations and recommendations. Delivered as a private travel file, not a booking.
      </>
    ),
    cta: "Plan your journey",
    href: "/multi-day",
  },
  {
    num: "04",
    Icon: Sparkles,
    label: "Proposals · Celebrations · Corporate",
    title: (
      <>
        For milestones <span className="italic">and private groups.</span>
      </>
    ),
    body: (
      <>
        Privately designed and managed experiences for proposals, celebrations and corporate gatherings — coordinated locally, with full discretion.
      </>
    ),
    cta: "Tell us what you have in mind",
    href: "/proposals",
  },
];

export function ThreePathsSection() {
  return (
    <section
      id="three-paths"
      aria-labelledby="three-paths-title"
      className="he-section-rule section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x">
        <div className="reveal max-w-2xl mx-auto text-center mb-10 md:mb-14">
          <span className="he-eyebrow-bar mb-5">Four ways to experience YES</span>
          <h2
            id="three-paths-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.6rem] leading-[1.1] md:leading-[1.0] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            Four ways to{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              experience Portugal.
            </span>
          </h2>
          <p className="mt-5 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
            Choose a curated Signature, design a day in the Studio, commission a bespoke journey, or plan a private occasion.
          </p>
          <span aria-hidden="true" className="gold-rule mt-8 md:mt-9 mx-auto block max-w-[3rem]" />
        </div>

        <ul className="he-stagger max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 list-none p-0">
          {PATHS.map((p) => {
            const cardClass =
              "reveal-stagger he-card-lift group relative flex flex-col rounded-[6px] border border-[#EAE2D6] bg-[color:var(--ivory)] p-5 md:p-7 shadow-[0_1px_2px_rgba(46,46,46,0.04)] overflow-hidden no-underline";

            const Inner = (
              <>
                <span aria-hidden="true" className="gold-rule absolute left-0 top-0" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 bottom-0 h-px w-full origin-left scale-x-0 bg-[color:var(--gold)]/55 transition-transform duration-500 ease-out group-hover:scale-x-100"
                />
                <div className="flex items-start justify-between gap-4 pr-1">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--ivory)] transition-all duration-300 group-hover:border-[color:var(--gold)]/60 group-hover:scale-[1.05]">
                    <p.Icon
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="text-[color:var(--teal)] transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="serif text-[1.9rem] md:text-[2.1rem] leading-none text-[color:var(--gold)] font-light tabular-nums">
                    {p.num}
                  </span>
                </div>
                <span className="mt-4 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
                  {p.label}
                </span>
                <h3 className="serif mt-2.5 text-[1.3rem] md:text-[1.6rem] leading-[1.22] md:leading-[1.18] text-[color:var(--charcoal)] font-medium">
                  {p.title}
                </h3>
                <p className="mt-3 text-[14px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-[1.6] flex-grow">
                  {p.body}
                </p>
                <span className="he-pull mt-4 serif italic text-[14px] md:text-[15px] leading-[1.45] text-[color:var(--charcoal)] inline-flex items-center gap-2">
                  {p.cta}
                  <span
                    aria-hidden="true"
                    className="not-italic transition-transform duration-300 ease-out group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </>
            );

            if (p.external) {
              return (
                <li key={p.label} className="contents">
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClass}
                  >
                    {Inner}
                  </a>
                </li>
              );
            }
            return (
              <li key={p.label} className="contents">
                <Link to={p.href} className={cardClass}>
                  {Inner}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default ThreePathsSection;
