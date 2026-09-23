import { lazy, Suspense, useEffect, useRef, useState } from "react";

const HubBookingPicker = lazy(() =>
  import("@/components/booking/HubBookingPicker").then((module) => ({
    default: module.HubBookingPicker,
  })),
);

export function DeferredHubBookingPicker({ tourIds }: { tourIds: readonly string[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      setReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="min-h-[420px]">
      {ready ? (
        <Suspense
          fallback={
            <div
              className="min-h-[420px] animate-pulse bg-[color:var(--sand)] motion-reduce:animate-none"
              aria-hidden="true"
            />
          }
        >
          <HubBookingPicker tourIds={tourIds} />
        </Suspense>
      ) : null}
    </div>
  );
}