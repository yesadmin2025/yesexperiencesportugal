import { Link } from "@tanstack/react-router";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { fmtDate, fmtPax, type GuideTour } from "./guide-data";

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

export function TourCard({ t }: { t: GuideTour; big?: boolean }) {
  const b = tourBadge(t);
  return (
    <article className="border border-border p-4 space-y-3">
      <div className="flex justify-between gap-3 items-start">
        <h3 className="min-w-0 font-[family-name:var(--font-editorial)] text-[22px] leading-tight">{t.tour_title ?? "Tour"}</h3>
        <span className={`shrink-0 text-[11px] px-2 py-0.5 ${b.cls}`}>{b.label}</span>
      </div>
      <TourEssentials t={t} />
      {t.client_notes && <p className="text-sm border-l-2 border-[color:var(--gold)] pl-2">Has special requests — see Tour Details</p>}
      <GuestActions t={t} />
      <Link
        to="/guide/tours/$assignmentId"
        params={{ assignmentId: t.assignment_id }}
        className="flex min-h-12 items-center justify-center border border-[color:var(--charcoal)] text-[12px] uppercase tracking-[0.18em]"
      >
        Open Tour Details →
      </Link>
    </article>
  );
}
