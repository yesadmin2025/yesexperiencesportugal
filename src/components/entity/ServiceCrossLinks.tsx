import { Link } from "@tanstack/react-router";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

export interface ServiceCrossLink {
  to: string;
  label: string;
  description: string;
}

/**
 * Descriptive internal links between the distinct YES service entities
 * (Signatures · Studio · Travel Designer · Moments · Corporate · Trade).
 *
 * Presentation-only: anchors carry the search intent of the destination so
 * crawlers can read the relationship between services rather than treating
 * the site as one day-tour catalogue.
 */
export function ServiceCrossLinks({
  eyebrow = "Also part of YES",
  title,
  links,
  tone = "sand",
}: {
  eyebrow?: string;
  title: string;
  links: ServiceCrossLink[];
  tone?: "ivory" | "sand";
}) {
  return (
    <section
      className={`reveal py-16 md:py-24 ${
        tone === "sand" ? "bg-[color:var(--sand)]" : "bg-[color:var(--ivory)]"
      }`}
    >
      <div className="container-x max-w-3xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <SectionTitle size="compact" spacing="normal">
          {title}
        </SectionTitle>
        <ul className="mt-8 space-y-6">
          {links.map((l) => (
            <li key={l.to + l.label}>
              <Link
                to={l.to as never}
                className="tap inline-flex min-h-[44px] items-center font-display text-lg text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded-sm"
              >
                {l.label}
              </Link>
              <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
                {l.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
