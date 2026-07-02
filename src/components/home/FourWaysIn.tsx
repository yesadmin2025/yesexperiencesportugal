/**
 * FourWaysIn — homepage "where to begin" section.
 *
 * Five paths, equal hierarchy. Signature Experiences, Studio, Moments,
 * Corporate & Groups, Travel Designer. 2×2 bento on mobile, 5-col
 * editorial row on desktop.
 *
 * Component name kept for import stability; the visible header is
 * "Five ways to shape your Portugal."
 */

import { Link } from "@tanstack/react-router";
import { BookOpen, Wand2, Sparkles, Compass, Users, type LucideIcon } from "lucide-react";

type Path = {
  num: string;
  Icon: LucideIcon;
  label: string;
  title: React.ReactNode;
  body: string;
  cta: string;
  href: string;
};

const PATHS: Path[] = [
  {
    num: "01",
    Icon: BookOpen,
    label: "Signature Experiences",
    title: (
      <>
        Ready private days,{" "}
        <span className="italic font-normal text-[color:var(--teal)]">yours to shape.</span>
      </>
    ),
    body: "Flagship private days across Lisbon, Sintra, Arrábida and beyond — reserve as they are, or tailor inside the Signature you choose.",
    cta: "Reserve or tailor",
    href: "/experiences",
  },
  {
    num: "02",
    Icon: Wand2,
    label: "Studio",
    title: (
      <>
        Design your private day{" "}
        <span className="italic font-normal text-[color:var(--teal)]">in real time.</span>
      </>
    ),
    body: "Choose the mood, route and rhythm. See the price live, then reserve instantly when it feels right.",
    cta: "Build your private day",
    href: "/studio-v3",
  },
  {
    num: "03",
    Icon: Sparkles,
    label: "Moments",
    title: (
      <>
        Proposals & celebrations,{" "}
        <span className="italic font-normal text-[color:var(--teal)]">held with care.</span>
      </>
    ),
    body: "Engagements, anniversaries, birthdays and private celebrations — quietly handled, with local hands behind every detail.",
    cta: "Tell us the occasion",
    href: "/proposals",
  },
  {
    num: "04",
    Icon: Users,
    label: "Corporate & Groups",
    title: (
      <>
        Team days, incentives{" "}
        <span className="italic font-normal text-[color:var(--teal)]">& private groups.</span>
      </>
    ),
    body: "Corporate days, client hospitality and private groups of any size — transport, suppliers and timing handled end to end.",
    cta: "Plan a group day",
    href: "/corporate",
  },
  {
    num: "05",
    Icon: Compass,
    label: "Travel Designer",
    title: (
      <>
        A full private journey,{" "}
        <span className="italic font-normal text-[color:var(--teal)]">written around you.</span>
      </>
    ),
    body: "Any length, any shape — honeymoons, family journeys, celebrations and multi-day Portugal. Composed by a local Travel Designer.",
    cta: "Begin with a designer",
    href: "/multi-day",
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
          <span className="he-eyebrow-bar mb-5">Where to begin</span>
          <h2
            id="four-ways-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.6rem] leading-[1.1] md:leading-[1.0] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            Five ways to{" "}
            <span className="italic font-normal text-[color:var(--teal)]">shape your Portugal.</span>
          </h2>
          <span aria-hidden="true" className="gold-rule mt-8 md:mt-9 mx-auto block max-w-[3rem]" />
        </div>

        <ul className="he-stagger max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 md:gap-4 list-none p-0">
          {PATHS.map((p) => (
            <li key={p.label} className="contents">
              <Link
                to={p.href}
                className="reveal-stagger he-card-lift group relative flex flex-col rounded-[6px] border border-[#EAE2D6] bg-[color:var(--ivory)] p-5 md:p-7 shadow-[0_1px_2px_rgba(46,46,46,0.04)] overflow-hidden no-underline"
              >
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
                <span className="mt-4 inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--teal)]">
                  {p.label}
                </span>
                <h3 className="serif mt-2.5 text-[1.3rem] md:text-[1.6rem] leading-[1.22] md:leading-[1.18] text-[color:var(--charcoal)] font-medium">
                  {p.title}
                </h3>
                <p className="mt-3 text-[14px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-[1.6] flex-grow">
                  {p.body}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]">
                  {p.cta}
                  <span
                    aria-hidden="true"
                    className="text-[color:var(--gold)] transition-transform duration-300 ease-out group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default FourWaysIn;
