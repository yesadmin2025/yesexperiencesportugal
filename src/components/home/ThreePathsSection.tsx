/**
 * ThreePathsSection — homepage path-choice surface.
 *
 * Three calm cards introducing the ways to experience Portugal:
 * Day experiences, Bespoke Travel Designer (highlighted), Occasions.
 * No prices, no "book/buy" copy — confident, restrained, brand-true.
 */

import { Link } from "@tanstack/react-router";

type Path = {
  num: string;
  label: string;
  title: React.ReactNode;
  body: string;
  cta: string;
  href: string;
  external?: boolean;
  variant: "default" | "bespoke";
};

const BESPOKE_WHATSAPP =
  "https://wa.me/351911889992?text=Ol%C3%A1%21%20Gostaria%20de%20planear%20uma%20viagem%20pela%20vossa%20equipa";

const PATHS: Path[] = [
  {
    num: "01",
    label: "Day experiences",
    title: (
      <>
        A private day,
        <br />
        shaped around you.
      </>
    ),
    body:
      "Choose a ready-made Signature, or design your own day from scratch. Private, local, and yours from the first hour to the last.",
    cta: "Explore days",
    href: "/experiences",
    variant: "default",
  },
  {
    num: "02",
    label: "Bespoke travel designer",
    title: (
      <>
        Some stories need
        <br />
        more than one day.
      </>
    ),
    body:
      "A local shapes your Portugal — region by region, at your pace. It starts with a conversation, and ends with a journey that feels like it was made for you.",
    cta: "Start the conversation",
    href: BESPOKE_WHATSAPP,
    external: true,
    variant: "bespoke",
  },
  {
    num: "03",
    label: "Occasions",
    title: (
      <>
        Proposals, celebrations
        <br />
        and private groups.
      </>
    ),
    body:
      "From a quiet moment by the sea to a day for a group of twenty — planned with local care, and complete discretion.",
    cta: "Tell us what you have in mind",
    href: "/proposals",
    variant: "default",
  },
];

export function ThreePathsSection() {
  return (
    <section
      aria-labelledby="three-paths-title"
      className="three-paths-section"
    >
      <style>{`
        .three-paths-section {
          background: var(--ivory);
          padding: 56px 0;
        }
        @media (min-width: 768px) {
          .three-paths-section { padding: 88px 0; }
        }
        .three-paths-inner {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .three-paths-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 900px) {
          .three-paths-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }
        .path-card {
          position: relative;
          overflow: hidden;
          padding: 24px 20px 22px;
          min-height: 254px;
          border-radius: 6px;
          border: 1px solid color-mix(in oklab, var(--gold-soft) 62%, transparent);
          background: var(--ivory);
          color: var(--charcoal);
          box-shadow: 0 1px 2px rgba(46, 46, 46, 0.04);
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
          display: flex;
          flex-direction: column;
          text-decoration: none;
        }
        .path-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--gold);
        }
        .path-card--bespoke {
          background: var(--sand);
          border-color: color-mix(in oklab, var(--teal) 42%, var(--gold-soft));
        }
        .path-card--bespoke::before {
          background: var(--teal);
        }
        .path-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(in oklab, var(--gold) 62%, transparent);
          box-shadow: 0 16px 36px rgba(20, 21, 24, 0.08);
        }
        .path-card:focus-visible {
          outline: 2px solid var(--teal);
          outline-offset: 3px;
        }
        .path-card--bespoke:hover {
          border-color: color-mix(in oklab, var(--teal) 58%, var(--gold-soft));
        }
        @media (prefers-reduced-motion: reduce) {
          .path-card { transition: none; }
          .path-card:hover { transform: none; }
        }
        .path-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          font-family: var(--font-sans);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.24em;
          color: var(--charcoal);
          margin-bottom: 16px;
          font-weight: 600;
        }
        .path-label__text {
          min-width: 0;
        }
        .path-label__num {
          flex: 0 0 auto;
          font-family: var(--font-serif);
          font-size: 1.45rem;
          line-height: 1;
          font-style: italic;
          font-weight: 400;
          letter-spacing: 0;
          color: var(--gold);
        }
        .path-body {
          font-family: var(--font-sans);
          font-size: 14.5px;
          line-height: 1.65;
          color: var(--charcoal-soft);
          margin: 0 0 24px;
          flex-grow: 1;
        }
        .path-cta {
          font-family: var(--font-sans);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--teal);
          background: none;
          border: none;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          transition: color 200ms ease;
          align-self: flex-start;
        }
        @media (min-width: 768px) {
          .path-card { padding: 28px 24px 26px; min-height: 294px; }
          .path-body { font-size: 15px; line-height: 1.7; }
        }
        .path-cta__arrow {
          display: inline-block;
          transition: transform 200ms ease;
        }
        .path-cta:hover { color: var(--gold); }
        .path-cta:hover .path-cta__arrow { transform: translateX(4px); }
        @media (prefers-reduced-motion: reduce) {
          .path-cta, .path-cta__arrow { transition: none; }
          .path-cta:hover .path-cta__arrow { transform: none; }
        }

      `}</style>

      <div className="three-paths-inner">
        <div className="text-center max-w-[640px] mx-auto mb-10 md:mb-14">
          <span className="he-eyebrow-bar mb-5">Ways to experience</span>
          <h2
            id="three-paths-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.6rem] leading-[1.1] md:leading-[1.0] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium"
          >
            However you want{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              to experience Portugal.
            </span>
          </h2>
        </div>



        <div className="three-paths-grid he-stagger">
          {PATHS.map((p) => {
            const cardClass =
              p.variant === "bespoke" ? "path-card path-card--bespoke reveal-stagger" : "path-card reveal-stagger";
            const Inner = (
              <>
                <div className="path-label">
                  <span className="path-label__text">{p.label}</span>
                  <span className="path-label__num" aria-hidden="true">{p.num}</span>
                </div>
                <h3 className="serif text-[1.35rem] md:text-[1.6rem] leading-[1.22] md:leading-[1.18] tracking-[-0.012em] text-[color:var(--charcoal)] font-medium mb-3.5">
                  {p.title}
                </h3>

                <p className="path-body">{p.body}</p>
                <span className="path-cta">
                  {p.cta} <span className="path-cta__arrow" aria-hidden="true">→</span>
                </span>
              </>
            );

            if (p.external) {
              return (
                <a
                  key={p.label}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClass}
                >
                  {Inner}
                </a>
              );
            }
            return (
              <Link key={p.label} to={p.href} className={cardClass}>
                {Inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ThreePathsSection;
