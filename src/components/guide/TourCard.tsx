import { Link } from "@tanstack/react-router";
import type { GuideTour } from "./guide-data";

export function tourBadge(t: GuideTour) {
  if (t.booking_cancelled) return { label: "Cancelled", cls: "bg-muted text-muted-foreground" };
  if (t.status === "changed") return { label: "Updated", cls: "bg-[color:var(--gold)]/25 text-[color:var(--charcoal)]" };
  if (t.guide_confirmed_at) return { label: "Confirmed", cls: "bg-[color:var(--teal)]/10 text-[color:var(--teal)]" };
  return { label: "Please confirm", cls: "bg-destructive/10 text-destructive" };
}

export function TourCard({ t, big }: { t: GuideTour; big?: boolean }) {
  const b = tourBadge(t);
  return (
    <Link
      to="/guide/tours/$assignmentId"
      params={{ assignmentId: t.assignment_id }}
      className={`block border border-border p-4 ${big ? "space-y-2" : ""}`}
    >
      <div className="flex justify-between gap-3 items-start">
        <p className={`font-[family-name:var(--font-editorial)] ${big ? "text-[24px]" : "text-[18px]"} leading-tight`}>{t.tour_title ?? "Tour"}</p>
        <span className={`shrink-0 text-[11px] px-2 py-0.5 ${b.cls}`}>{b.label}</span>
      </div>
      <p className="text-sm mt-1">
        <strong className="font-medium">{t.start_time ?? "Time tbc"}</strong> · {t.guests ?? "?"} guests · {t.language ?? "EN"}
      </p>
      {t.pickup_location && <p className="text-sm text-muted-foreground">Pickup: {t.pickup_location}</p>}
      {t.client_notes && <p className="text-sm border-l-2 border-[color:var(--gold)] pl-2 mt-1">Special request</p>}
    </Link>
  );
}
