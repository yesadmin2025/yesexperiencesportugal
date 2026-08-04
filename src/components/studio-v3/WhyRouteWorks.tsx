/**
 * WhyRouteWorks — 4 short bullets explaining why the resolved route is
 * coherent (geography, rhythm, timing, fit).
 *
 * Step 6 of the post-builder plan. Content-only, presentational.
 * Reasons are produced upstream by `explainCurationDecisions()` (added in a
 * later step); this component only renders what it's given. No AI copy is
 * generated here — voice/tone only, never invented facts (see memory rule).
 *
 * Caps at 4 bullets by design; extras are ignored so the section stays
 * scannable inside the 4–6 viewport budget (see plan §E).
 */

import * as React from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

export interface WhyRouteWorksProps {
  readonly reasons: ReadonlyArray<string>;
  readonly className?: string;
  readonly testId?: string;
  /** Non-personal id of the recommended Signature, for analytics only. */
  readonly tourId?: string | null;
}

const MAX_REASONS = 4;

export function WhyRouteWorks({ reasons, className, testId, tourId }: WhyRouteWorksProps) {
  const shown = reasons.slice(0, MAX_REASONS).filter((r) => r.trim().length > 0);
  const reasonCount = shown.length;
  React.useEffect(() => {
    if (reasonCount === 0) return;
    void import("@/lib/analytics-ga4").then((m) =>
      m.gaStudioRecommendationRevealed({ tourId: tourId ?? null, reasonCount }),
    );
  }, [tourId, reasonCount]);
  if (!shown.length) return null;
  return (
    <section
      aria-label="Why this route works"
      data-testid={testId ?? "studio-v3-why-route-works"}
      className={cn("w-full py-6", className)}
    >
      <Eyebrow>Why this route works</Eyebrow>
      <ul className="mt-3 flex flex-col gap-2.5">
        {shown.map((reason, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[13.5px] leading-[1.55]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 88%, transparent)" }}
          >
            <span
              aria-hidden
              className="mt-[8px] shrink-0 rounded-full"
              style={{ width: 5, height: 5, background: "var(--gold)" }}
            />
            <span className="[text-wrap:pretty]">{reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default WhyRouteWorks;
