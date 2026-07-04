import { cn } from "@/lib/utils";

/**
 * BookingCtaSkeleton — a lightweight, CTA-adjacent shimmer used while the
 * booking step is preparing (e.g. Stripe session, final details, or route
 * calculation). It mirrors the height and shape of the primary conversion CTA
 * so the area feels responsive rather than empty, without competing with the
 * real button when it returns.
 *
 * Brand-only tokens, reduced-motion safe.
 */
interface BookingCtaSkeletonProps {
  className?: string;
  label?: string;
}

export function BookingCtaSkeleton({
  className,
  label = "Preparing your secure booking…",
}: BookingCtaSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "flex w-full max-w-[420px] flex-col items-center gap-3 rounded-[2px] border border-[color:var(--charcoal)]/8 bg-[color:var(--ivory)] p-4 shadow-sm",
        className,
      )}
    >
      {/* CTA-shaped shimmer */}
      <div className="relative w-full overflow-hidden rounded-[2px] bg-[color:var(--sand)]">
        <div className="h-[52px] w-full" />
        <Shimmer />
      </div>

      {/* Micro trust line shimmer */}
      <div className="relative w-3/4 overflow-hidden rounded-[2px] bg-[color:var(--sand)]">
        <div className="h-3 w-full" />
        <Shimmer />
      </div>

      <p className="text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/55">
        {label}
      </p>
    </div>
  );
}

function Shimmer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -translate-x-full motion-safe:animate-[shimmer_1.4s_infinite]"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--ivory) 55%, transparent) 50%, transparent 100%)",
      }}
    />
  );
}
