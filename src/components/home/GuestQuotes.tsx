/**
 * GuestQuotes — homepage social proof row.
 *
 * Reads the global review aggregate from Supabase (sum across all
 * platforms + first-party). Falls back to "700+" text until per-tour
 * counts are entered in /admin/reviews. No invented numbers — when the
 * DB is empty, the fallback string is shown without a digit claim.
 */
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PlatformBadge, type Platform } from "@/components/PlatformBadge";
import { getGlobalReviewStats, type GlobalStats } from "@/lib/reviews.functions";

const PLATFORMS: Platform[] = ["google", "tripadvisor", "viator", "getyourguide"];

export function GuestQuotes() {
  const fn = useServerFn(getGlobalReviewStats);
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fn({})
      .then((s) => !cancelled && setStats(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fn]);

  const hasReal = stats && stats.total_reviews >= 25;
  const count = hasReal ? stats!.total_reviews : null;
  const avg = hasReal && stats!.average_rating ? stats!.average_rating : null;

  return (
    <div className="mt-10 md:mt-14 text-center">
      <div className="inline-flex items-center gap-1.5 text-[color:var(--gold)]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </div>

      <p className="serif mt-3 text-[1.85rem] md:text-[2.4rem] leading-[1.15] text-[color:var(--charcoal)] font-medium">
        {count ? (
          <>
            <span className="tabular-nums">{count.toLocaleString("en-US")}</span>
            <span className="ml-2">reviews</span>
            {avg && (
              <span className="ml-2 text-[color:var(--charcoal)]/75">· {avg.toFixed(1)}★</span>
            )}
            <span className="italic font-normal text-[color:var(--teal)]"> across platforms.</span>
          </>
        ) : (
          <>
            <span className="tabular-nums">700+</span>
            <span className="ml-2">five-star reviews</span>
            <span className="italic font-normal text-[color:var(--teal)]"> across platforms.</span>
          </>
        )}
      </p>

      <ul
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-5 h-6 md:h-7 list-none p-0"
        aria-label="Featured on Google, Tripadvisor, Viator and GetYourGuide"
      >
        {PLATFORMS.map((p) => (
          <li key={p} className="h-full flex items-center">
            <PlatformBadge platform={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GuestQuotes;
