/**
 * /admin/bookings — the single bookings workspace.
 *
 * One view (List | Calendar) with quick ranges and a drawer for detail. The
 * technical panels that used to sit here as tabs (matching report, sources)
 * now live under Settings → Connections & automation. The per-day brief
 * calendar and calendar subscription stay available under "More".
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsBookingsHub, type QuickRange } from "@/components/admin/ops/OpsBookingsHub";
import { BookingsAvailabilityCalendar } from "@/components/admin/BookingsAvailabilityCalendar";
import { CalendarSubscribePanel } from "@/components/admin/CalendarSubscribePanel";

const FOCUS: QuickRange[] = ["today", "week", "future", "attention"];

export const Route = createFileRoute("/admin/bookings/")({
  validateSearch: (search: Record<string, unknown>): { focus?: QuickRange; open?: string } => ({
    ...(typeof search["focus"] === "string" && FOCUS.includes(search["focus"] as QuickRange)
      ? { focus: search["focus"] as QuickRange }
      : {}),
    ...(typeof search["open"] === "string" && /^[0-9a-f-]{36}$/i.test(search["open"]) ? { open: search["open"] } : {}),
  }),
  component: AdminBookingsPage,
  head: () => ({
    meta: [{ title: "Bookings · YES Operations" }, { name: "description", content: "Private operations view of Studio and Signature reservations." }, { property: "og:title", content: "Bookings · YES Operations" }, { property: "og:description", content: "Private operations view of Studio and Signature reservations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-red-700">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function AdminBookingsPage() {
  const { focus, open } = Route.useSearch();
  return (
    <AdminShell eyebrow="All channels" title="Bookings">
      <OpsBookingsHub initialRange={focus ?? (open ? "future" : "week")} initialOpen={open ?? null} />

      <details className="group mt-12 border-t border-[color:var(--charcoal)]/[0.07]">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-3 text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] [&::-webkit-details-marker]:hidden">
          More · day briefs and calendar subscription
          <span aria-hidden className="transition-transform duration-200 group-open:rotate-90">›</span>
        </summary>
        <div className="pb-6">
          <BookingsAvailabilityCalendar />
          <CalendarSubscribePanel />
        </div>
      </details>
    </AdminShell>
  );
}
