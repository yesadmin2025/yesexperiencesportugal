/**
 * FourWaysIn — homepage "where to begin" section.
 *
 * Sprint A v5 — replaces ThreePathsSection. Four cards, equal
 * hierarchy. Three instant-booking paths (Signature / Tailored /
 * Studio) and one human-led path (Travel Designer). Each card uses
 * a DISTINCT booking verb — never "Reserve instantly" repeated, never
 * a "when available" qualifier.
 *
 * Layout: 2×2 bento on mobile, 4-column editorial row on desktop.
 * Reuses the existing reveal-stagger / he-card-lift primitives so it
 * blends with the rest of the homepage without bespoke styling.
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
    label: "Signature & Tailored",
    title: (
      <>
        Ready private days, <span className="italic">yours to shape.</span>
      </>
    ),
    body: "Flagship journeys across Lisbon, Sintra, Arrábida and beyond — reserve as they are, or tailor inside the Signature you choose.",
    cta: "Reserve or tailor",
    href: "/experiences",
  },
  {
    num: "02",
    Icon: Wand2,
    label: "Studio",
    title: (
      <>
        Design your day <span className="italic">in real time, with us.</span>
      </>
    ),
    body: "A living canvas — choose stops, see the route, watch the price. Hold your date when it feels right.",
    cta: "Build your private day",
    href: "/studio-v3",
  },
  {
    num: "03",
    Icon: Sparkles,
    label: "Moments",
    title: (
      <>
        Proposals & celebrations, <span className="italic">staged quietly.</span>
      </>
    ),
    body: "Engagements, anniversaries, birthdays and private celebrations — staged quietly, with local hands behind every detail.",
    cta: "Tell us the occasion",
    href: "/proposals",
  },
  {
    num: "04",
    Icon: Users,
    label: "Corporate & Groups",
    title: (
      <>
        Team days, incentives <span className="italic">& private groups.</span>
      </>
    ),
    body: "Corporate days, client hospitality and private groups of any size — transport, suppliers and logistics handled end to end.",
    cta: "Plan a group day",
    href: "/corporate",
  },
  {
    num: "05",
    Icon: Compass,
    label: "Travel Designer",
    title: (
      <>
        A full private journey, <span className="italic">written around you.</span>
      </>
    ),
    body: "Any length, any shape — weddings, honeymoons, family journeys, multi-day Portugal. Composed by a designer.",
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
            Four ways into Portugal.
          </h2>
          <span aria-hidden="true" className="gold-rule mt-8 md:mt-9 mx-auto block max-w-[3rem]" />
        </div>

        <ul className="he-stagger max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 list-none p-0">
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
