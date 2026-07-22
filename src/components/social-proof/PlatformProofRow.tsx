/**
 * PlatformProofRow — compact, verifiable per-platform proof strip.
 *
 * Renders one chip per review platform (Tripadvisor · Google · Viator) with
 * its OWN rating, review count and a clickable logo pointing to the official
 * listing. No combined total is shown here — the sum lives in copy paired
 * with "across verified platforms".
 *
 * Presentational only. All data comes from `src/config/review-platforms.ts`
 * so updates never touch component code.
 */
import { Star } from "lucide-react";
import { PlatformBadge, type Platform } from "@/components/PlatformBadge";
import { REVIEW_PLATFORMS, type ReviewPlatform } from "@/config/review-platforms";

interface Props {
  /** Optional visual variant — matches the surrounding surface. */
  tone?: "light" | "dark";
  className?: string;
  /** Tiny "verified {date}" hint under each chip. Off by default. */
  showVerifiedDate?: boolean;
  /** Horizontal alignment of the chip row. Defaults to "center". */
  align?: "start" | "center";
}

function formatVerifiedDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function Chip({ p, tone, showVerifiedDate }: { p: ReviewPlatform; tone: "light" | "dark"; showVerifiedDate: boolean }) {
  const textColor = tone === "dark" ? "text-[color:var(--ivory)]" : "text-[color:var(--charcoal)]";
  const subColor = tone === "dark" ? "text-[color:var(--ivory)]/60" : "text-[color:var(--charcoal-soft)]";
  const borderColor = tone === "dark" ? "border-[color:var(--ivory)]/15" : "border-[color:var(--charcoal)]/12";
  const bg = tone === "dark" ? "bg-[color:var(--ivory)]/[0.04]" : "bg-white";

  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${p.name} reviews for YES Experiences Portugal (${p.rating.toFixed(1)} stars, ${p.reviewCount}+ reviews) — opens in new tab`}
      title={`Verified ${formatVerifiedDate(p.lastVerifiedAt)}`}
      className={[
        "group inline-flex items-center gap-2 rounded-full border px-3 py-2",
        "min-h-11 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2",
        tone === "dark" ? "focus-visible:ring-offset-[color:var(--charcoal)]" : "focus-visible:ring-offset-[color:var(--ivory)]",
        "transition-colors duration-200",
        borderColor,
        bg,
        "hover:border-[color:var(--gold)]",
      ].join(" ")}
    >
      <span className="inline-flex h-4 w-auto items-center">
        <PlatformBadge platform={p.id as Platform} className="h-4" />
      </span>
      <span className={`inline-flex items-center gap-1 text-[12px] font-medium tabular-nums ${textColor}`}>
        <Star size={11} fill="currentColor" strokeWidth={0} className="text-[color:var(--gold)]" />
        {p.rating.toFixed(1)}
      </span>
      <span className={`text-[11.5px] tabular-nums ${subColor}`}>
        {p.reviewCount}+ reviews
      </span>
      {showVerifiedDate && (
        <span className={`hidden sm:inline text-[10px] uppercase tracking-[0.14em] ${subColor}`}>
          · verified {formatVerifiedDate(p.lastVerifiedAt)}
        </span>
      )}
    </a>
  );
}

export function PlatformProofRow({ tone = "light", className = "", showVerifiedDate = false, align = "center" }: Props) {
  const justify = align === "start" ? "justify-start" : "justify-center";
  return (
    <div
      role="group"
      aria-label="Verified review platforms"
      className={`flex flex-wrap items-center ${justify} gap-2 sm:gap-3 ${className}`}
    >
      {REVIEW_PLATFORMS.map((p) => (
        <Chip key={p.id} p={p} tone={tone} showVerifiedDate={showVerifiedDate} />
      ))}
    </div>
  );
}

export default PlatformProofRow;
