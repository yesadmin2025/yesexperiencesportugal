/**
 * "Where to next" block for Journal guides.
 *
 * Implements the internal linking plan: hub → siblings → Signature → Studio,
 * with every link tagged so the guide that produced a click (and later a
 * booking) is recorded. Presentation only; all targets come from the
 * article data via resolveGuideNextSteps().
 */

import { Link } from "@tanstack/react-router";

import {
  guideRefSearch,
  recordGuideLinkClick,
  type GuideLinkKind,
} from "@/lib/guide-attribution";
import { resolveGuideNextSteps } from "@/lib/internal-linking";
import type { LocalStoryArticle } from "@/content/local-stories-articles";

const linkClass =
  "underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--teal)] transition-colors";

export function useGuideLinkTracker(guideSlug: string) {
  return (slot: string, kind: GuideLinkKind, destination: string) => () =>
    recordGuideLinkClick({ guideSlug, slot, kind, destination });
}

export function GuideNextSteps({ article }: { article: LocalStoryArticle }) {
  const next = resolveGuideNextSteps(article);
  const onClick = useGuideLinkTracker(article.slug);

  return (
    <section
      aria-label="Where to go next"
      data-testid="guide-next-steps"
      className="mt-16 pt-10 border-t border-[color:var(--gold-soft)]/40 reveal"
    >
      <span className="block text-center font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-ink)] mb-8">
        Where to next
      </span>

      <div className="grid gap-8 sm:grid-cols-2 text-[15px] leading-[1.8] text-[color:var(--charcoal)]">
        {next.hub && (
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mb-2">
              Start here
            </p>
            <Link
              to="/local-stories/$slug"
              params={{ slug: next.hub.path.replace("/local-stories/", "") }}
              search={guideRefSearch(article.slug, "next_hub")}
              className={linkClass}
              onClick={onClick("next_hub", "guide", next.hub.path)}
            >
              {next.hub.label}
            </Link>
          </div>
        )}

        {next.signatureSlug && (
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mb-2">
              Book this day
            </p>
            <Link
              to="/tours/$tourId"
              params={{ tourId: next.signatureSlug }}
              search={guideRefSearch(article.slug, "next_signature")}
              className={linkClass}
              onClick={onClick("next_signature", "signature", `/tours/${next.signatureSlug}`)}
            >
              {article.ctaLabel}
            </Link>
          </div>
        )}

        <div>
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mb-2">
            Design your own
          </p>
          <Link
            to="/studio-v3"
            search={guideRefSearch(article.slug, "next_studio")}
            className={linkClass}
            onClick={onClick("next_studio", "studio", "/studio-v3")}
          >
            {next.studioLead}
          </Link>
        </div>

        {next.siblings.length > 0 && (
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mb-2">
              Keep reading
            </p>
            <ul className="space-y-2">
              {next.siblings.map((s) => (
                <li key={s.path}>
                  <Link
                    to="/local-stories/$slug"
                    params={{ slug: s.path.replace("/local-stories/", "") }}
                    search={guideRefSearch(article.slug, "next_sibling")}
                    className={linkClass}
                    onClick={onClick("next_sibling", "guide", s.path)}
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
