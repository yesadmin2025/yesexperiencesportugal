/**
 * ThreePathsSection — homepage path-choice surface.
 *
 * Three calm cards introducing the ways to experience Portugal:
 * Day experiences, Bespoke Travel Designer (highlighted), Occasions.
 * No prices, no "book/buy" copy — confident, restrained, brand-true.
 */

import { Link } from "@tanstack/react-router";

type Path = {
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
      style={{ background: "#FAF8F3" }}
      className="three-paths-section"
    >
      <style>{`
        .three-paths-section {
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
          gap: 20px;
        }
        @media (min-width: 900px) {
          .three-paths-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 28px;
          }
        }
        .path-card {
          padding: 36px 32px;
          border-radius: 10px;
          border-left: 3px solid #C9A96A;
          background: #FFFFFF;
          transition: transform 250ms ease, box-shadow 250ms ease;
          display: flex;
          flex-direction: column;
        }
        .path-card--bespoke {
          background: #F4EFE7;
          border-left-color: #295B61;
        }
        .path-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        @media (prefers-reduced-motion: reduce) {
          .path-card { transition: none; }
          .path-card:hover { transform: none; }
        }


        .path-body {
          font-family: Inter, system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.65;
          color: rgba(46, 46, 46, 0.72);
          margin-bottom: 24px;
          flex-grow: 1;
        }
        .path-cta {
          font-family: Inter, system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #295B61;
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
        .path-cta__arrow {
          display: inline-block;
          transition: transform 200ms ease;
        }
        .path-cta:hover { color: #C9A96A; }
        .path-cta:hover .path-cta__arrow { transform: translateX(4px); }
        @media (prefers-reduced-motion: reduce) {
          .path-cta, .path-cta__arrow { transition: none; }
          .path-cta:hover .path-cta__arrow { transform: none; }
        }
      `}</style>

      <div className="three-paths-inner">
        <h2 id="three-paths-title" className="three-paths-title">
          However you want <em>to experience Portugal.</em>
        </h2>


        <div className="three-paths-grid">
          {PATHS.map((p) => {
            const cardClass =
              p.variant === "bespoke" ? "path-card path-card--bespoke" : "path-card";
            const Inner = (
              <>
                <div className="path-label">{p.label}</div>
                <h3 className="path-title">{p.title}</h3>
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
