import { Link } from "@tanstack/react-router";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { fmtDate, fmtPax, type GuideTour } from "./guide-data";
import { Button } from "@/components/ui/button";

export function tourBadge(t: GuideTour) {
  if (t.booking_cancelled) return { label: "Cancelled", cls: "bg-muted text-muted-foreground" };
  if (t.status === "changed") return { label: "Updated", cls: "bg-[color:var(--gold)]/25 text-[color:var(--charcoal)]" };
  if (t.guide_confirmed_at) return { label: "Confirmed", cls: "bg-[color:var(--teal)]/10 text-[color:var(--teal)]" };
  return { label: "Please confirm", cls: "bg-destructive/10 text-destructive" };
}

const digits = (p: string) => p.replace(/[^+\d]/g, "");

/** Call / WhatsApp / Open in Maps — only the buttons whose data exists. */
export function GuestActions({ t }: { t: GuideTour }) {
  const phone = t.guest_phone ? digits(t.guest_phone) : "";
  const pickup = t.pickup_location?.trim();
  if (!phone && !pickup) return null;
  const btn = "flex min-h-12 flex-1 items-center justify-center gap-1.5 border px-2 text-[12px] font-medium";
  return (
    <div className="flex gap-2">
      {phone && (
        <a href={`tel:${phone}`} className={`${btn} border-[color:var(--teal)] bg-[color:var(--teal)] text-primary-foreground`}>
          <Phone className="h-4 w-4" aria-hidden />Call
        </a>
      )}
      {phone && (
        <a href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className={`${btn} border-[color:var(--teal)] text-[color:var(--teal)]`}>
          <MessageCircle className="h-4 w-4" aria-hidden />WhatsApp
        </a>
      )}
      {pickup && (
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickup)}`} target="_blank" rel="noopener noreferrer" className={`${btn} border-border`}>
          <MapPin className="h-4 w-4" aria-hidden />Maps
        </a>
      )}
    </div>
  );
}

export function TourEssentials({ t }: { t: GuideTour }) {
  const pax = fmtPax(t.pax_breakdown);
  const rows: [string, string][] = [
    ["Date", fmtDate(t.tour_date)],
    ["Pickup time", t.start_time ?? "To be confirmed"],
    ["Pickup", t.pickup_location ?? "To be confirmed"],
    ...(t.dropoff_location ? ([["Drop-off", t.dropoff_location]] as [string, string][]) : []),
    ["Guest", t.guest_full_name || t.guest_first_name || "Not added yet"],
    ["Guests", t.guests != null ? `${t.guests}${pax ? ` (${pax})` : ""}` : "Not added yet"],
    ...(t.guest_phone ? ([["Phone", t.guest_phone]] as [string, string][]) : []),
    ...(t.language ? ([["Language", t.language]] as [string, string][]) : []),
  ];
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 py-2">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function compactDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const weekday = value.toLocaleDateString("en-GB", { weekday: "short" });
  const dayMonth = value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${weekday}, ${dayMonth}`;
}

/** A calm work-list row. Contact and map actions intentionally live on Tour Details. */
export function TourCard({ t }: { t: GuideTour }) {
  const b = tourBadge(t);
  const guest = t.guest_full_name || t.guest_first_name || "Guest name not added";
  const pax = t.guests != null ? `${t.guests} ${t.guests === 1 ? "guest" : "guests"}` : "Guest count not added";
  return (
    <article className="space-y-2.5 border-b border-border py-5 first:pt-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="min-w-0 font-[family-name:var(--font-editorial)] text-[22px] font-medium leading-tight text-foreground">
          {compactDate(t.tour_date)} · {t.start_time?.slice(0, 5) ?? "Time not set"}
        </p>
        <span className={`shrink-0 text-[11px] px-2 py-0.5 ${b.cls}`}>{b.label}</span>
      </div>
      <h3 className="text-[17px] font-semibold leading-snug">{t.tour_title ?? "Tour name not added"}</h3>
      <p className="text-sm text-foreground">{guest} · {pax}</p>
      <p className="break-words text-sm text-muted-foreground">{t.pickup_location?.trim() || "Pickup location not added"}</p>
      <Button asChild variant="outline" className="mt-1 min-h-11 w-full rounded-none text-[12px] uppercase tracking-[0.14em]">
        <Link to="/guide/tours/$assignmentId" params={{ assignmentId: t.assignment_id }}>View details</Link>
      </Button>
    </article>
  );
}
