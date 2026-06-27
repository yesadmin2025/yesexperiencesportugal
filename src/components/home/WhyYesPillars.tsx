/**
 * WhyYesPillars — four-pillar editorial manifesto.
 *
 * Sits below FourWaysIn on the homepage. Same numbered editorial
 * rhythm as the FourWaysIn cards (no images, text-only) so the page
 * reads as one continuous editorial spread. Real YES voice — no
 * generic "shape the story" template prose, no invented claims.
 */

type Pillar = {
  num: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    num: "01",
    eyebrow: "You decide",
    title: (
      <>
        Your rhythm, <span className="italic font-normal text-[color:var(--teal)]">your day.</span>
      </>
    ),
    body: "Choose the pace, the stops and the feeling. Nothing locked, nothing templated — every Signature can be tailored, every Studio day designed from scratch.",
  },
  {
    num: "02",
    eyebrow: "Local from the start",
    title: (
      <>
        Real locals, <span className="italic font-normal text-[color:var(--teal)]">not call centres.</span>
      </>
    ),
    body: "Routes, timings and the hidden details that change a day are shaped by people who live here — not a script written abroad.",
  },
  {
    num: "03",
    eyebrow: "Any occasion",
    title: (
      <>
        Private days, proposals, <span className="italic font-normal text-[color:var(--teal)]">corporate moments.</span>
      </>
    ),
    body: "Engagements, anniversaries, family gatherings, off-sites and full multi-day journeys — staged with the same quiet care.",
  },
  {
    num: "04",
    eyebrow: "Four ways to shape it",
    title: (
      <>
        Reserve, tailor, design — <span className="italic font-normal text-[color:var(--teal)]">or hand it to a designer.</span>
      </>
    ),
    body: "Book a Signature in minutes, tailor it inside, design from scratch in the Studio, or let a Travel Designer compose the whole journey.",
  },
];

export function WhyYesPillars() {
  return (
    <section
      id="why-yes"
      aria-labelledby="why-yes-title"
      className="he-section-rule section-enter section-y bg-[color:var(--sand)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x">
        <div className="reveal max-w-2xl mx-auto text-center mb-10 md:mb-14">
          <span className="he-eyebrow-bar mb-5">Why YES</span>
          <h2
            id="why-yes-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.2rem] leading-[1.12] md:leading-[1.04] tracking-[-0.016em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            Portugal feels different{" "}
            <span className="italic font-normal text-[color:var(--teal)]">to everyone.</span>
          </h2>
          <p className="mt-5 md:mt-6 text-[14px] md:text-[15px] leading-[1.62] text-[color:var(--charcoal-soft)] max-w-xl mx-auto">
            YES began with one person and one belief — that Portugal is best shown the way a local
            would show a friend. Real places, real people, nothing staged.
          </p>
          <span aria-hidden="true" className="gold-rule mt-8 md:mt-9 mx-auto block max-w-[3rem]" />
        </div>

        <ul className="he-stagger max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 list-none p-0">
          {PILLARS.map((p) => (
            <li
              key={p.num}
              className="reveal-stagger he-card-lift group relative flex flex-col rounded-[6px] border border-[#EAE2D6] bg-[color:var(--ivory)] p-5 md:p-7 shadow-[0_1px_2px_rgba(46,46,46,0.04)] overflow-hidden"
            >
              <span aria-hidden="true" className="gold-rule absolute left-0 top-0" />
              <div className="flex items-start justify-between gap-4 pr-1">
                <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--teal)]">
                  {p.eyebrow}
                </span>
                <span className="serif text-[1.9rem] md:text-[2.1rem] leading-none text-[color:var(--gold)] font-light tabular-nums">
                  {p.num}
                </span>
              </div>
              <h3 className="serif mt-4 text-[1.3rem] md:text-[1.55rem] leading-[1.22] md:leading-[1.18] text-[color:var(--charcoal)] font-medium">
                {p.title}
              </h3>
              <p className="mt-3 text-[14px] md:text-[14.5px] text-[color:var(--charcoal-soft)] leading-[1.6]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default WhyYesPillars;
