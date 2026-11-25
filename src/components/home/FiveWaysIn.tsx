/** Compact proof strip; first-time visitors go directly to bookable products.
 * Legacy export/anchor retained for existing deep links. Returning guests
 * keep their privacy-safe Studio draft recovery.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CtaMotionArrow } from "@/components/ui/CtaButton";
import { SITE_RATING_LABEL } from "@/config/trust-certificate";

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

export function FiveWaysIn() {
  const [draftSummary, setDraftSummary] = useState<ReadonlyArray<string>>([]);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

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
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="five-paths" aria-label="Guest confidence" className="home-quick-trust bg-[color:var(--sand)] border-b border-[color:var(--border)] py-2 md:py-3">
      <div className="container-x">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-0 text-center text-[13px] leading-relaxed text-[color:var(--charcoal)]">
          <a href="#reviews" className="inline-flex min-h-[44px] items-center gap-2 font-medium underline decoration-[color:var(--gold)]/60 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]">
            <span aria-hidden="true" className="text-[color:var(--gold)]">★★★★★</span>
            {SITE_RATING_LABEL}
          </a>
          <span>Private experiences · Local experts</span>
        </div>
        {hasDraft && (
          <div className="reveal mx-auto mt-5 max-w-6xl border border-[color:var(--border)] bg-[color:var(--sand)] px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-[12px] uppercase tracking-[0.2em] font-semibold text-[color:var(--teal)]">
                Your Studio draft is waiting
              </p>
              {draftSummary.length > 0 && (
                <p className="mt-1.5 text-[14px] leading-[1.55] text-[color:var(--charcoal)]">
                  {draftSummary.join(" · ")}
                </p>
              )}
            </div>
            <Link
              to="/studio"
              data-testid="home-smart-start-resume"
              data-smart-start-recommended="true"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.16em] font-semibold text-[color:var(--teal)] underline decoration-[color:var(--gold)]/70 underline-offset-4 sm:mt-0"
            >
              Resume your draft <CtaMotionArrow />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
