/**
 * GuestQuotes — homepage social proof row.
 *
 * A clean, single-line trust statement: review count plus a row of
 * official platform marks. No invented quotes, no repeated review blocks.
 */
import { Star } from "lucide-react";
import { PlatformBadge, type Platform } from "@/components/PlatformBadge";

const PLATFORMS: Platform[] = ["google", "tripadvisor", "viator", "getyourguide"];

export function GuestQuotes() {
  return (
    <div className="mt-10 md:mt-14 text-center">
      <div className="inline-flex items-center gap-1.5 text-[color:var(--gold)]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </div>

      <p className="serif mt-3 text-[1.85rem] md:text-[2.4rem] leading-[1.15] text-[color:var(--charcoal)] font-medium">
        <span className="tabular-nums">700+</span>
        <span className="ml-2">five-star reviews</span>
        <span className="italic font-normal text-[color:var(--teal)]"> across platforms.</span>
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

