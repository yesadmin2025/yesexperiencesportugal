/**
 * Builder step skeletons — reserved-aspect-ratio placeholders that prevent
 * layout shift while images, route data, and narratives are loading on mobile.
 *
 * Brand-only tokens (sand / charcoal). 220ms shimmer via tailwind animate-pulse.
 */

interface MoodGridSkeletonProps {
  count?: number;
}

export function MoodGridSkeleton({ count = 5 }: MoodGridSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading mood options"
      className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="aspect-[4/5] w-full rounded-[2px] border border-[color:var(--charcoal)]/10 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sand)_85%,transparent)_0%,color-mix(in_oklab,var(--charcoal)_15%,transparent)_100%)] animate-pulse"
        />
      ))}
    </div>
  );
}

export function StopListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Shaping your route" className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-[2px] border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-3"
        >
          <div className="h-20 w-20 shrink-0 rounded-[2px] bg-[color:var(--sand)]/70 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-[color:var(--charcoal)]/10 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-[color:var(--charcoal)]/10 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-[color:var(--charcoal)]/8 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
