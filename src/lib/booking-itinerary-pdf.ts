/**
 * Builds the downloadable itinerary PDF that is attached to BOTH confirmation
 * emails (guest receipt and internal team alert), straight from the frozen
 * booking snapshot fields.
 *
 * Deliberately time-free: stops are ordered, never clock-stamped, because the
 * pacing of the day adapts on the ground.
 */
import { renderSimplePdf, type PdfLine } from "@/lib/pdf/simple-pdf";
import { ITINERARY_FLEXIBILITY_NOTE, CONFIRMATION_SUFFICIENCY_NOTE } from "@/lib/booking-snapshot-contract";

const TEAL: [number, number, number] = [0.16, 0.36, 0.38];
const GOLD: [number, number, number] = [0.79, 0.66, 0.42];
const CHARCOAL: [number, number, number] = [0.18, 0.18, 0.18];
const MUTED: [number, number, number] = [0.42, 0.42, 0.42];

export interface ItineraryPdfInput {
  experienceName?: string | null;
  customerName?: string | null;
  dateLabel?: string | null;
  guestsLabel?: string | null;
  pickup?: string | null;
  durationLabel?: string | null;
  bookingRef?: string | null;
  amountFormatted?: string | null;
  /** Ordered stops — durations intentionally ignored. */
  itinerary?: Array<{ order?: number | null; label: string; note?: string | null }> | null;
  includedItems?: string[] | null;
  addOnLabels?: string[] | null;
  removedOptions?: string[] | null;
  customerNotes?: string[] | null;
}

function section(lines: PdfLine[], title: string, items: string[] | null | undefined) {
  if (!items || items.length === 0) return;
  lines.push({ text: title.toUpperCase(), font: "bold", size: 9.5, color: GOLD, spaceBefore: 16 });
  lines.push({ rule: true, spaceBefore: 4 });
  for (const item of items) {
    lines.push({ text: `•  ${item}`, size: 10.5, color: CHARCOAL, spaceBefore: 2 });
  }
}

export function buildItineraryPdfBase64(input: ItineraryPdfInput): string {
  const experience = input.experienceName || "Your YES experience";
  const lines: PdfLine[] = [];

  lines.push({ text: "YES EXPERIENCES PORTUGAL", font: "bold", size: 9.5, color: GOLD });
  lines.push({ text: "Your designed day", font: "bold", size: 22, color: TEAL, spaceBefore: 10 });
  lines.push({ text: experience, size: 13, color: CHARCOAL, spaceBefore: 6 });
  lines.push({ rule: true, spaceBefore: 12 });

  const facts: Array<[string, string | null | undefined]> = [
    ["Guest", input.customerName],
    ["Date", input.dateLabel],
    ["Travellers", input.guestsLabel],
    ["Pickup", input.pickup],
    ["Duration", input.durationLabel],
    ["Total paid", input.amountFormatted],
    ["Booking reference", input.bookingRef],
  ];
  for (const [label, value] of facts) {
    if (!value) continue;
    lines.push({ text: `${label}:  ${value}`, size: 10.5, color: CHARCOAL, spaceBefore: 2 });
  }

  const stops = (input.itinerary ?? []).filter((s) => s && s.label);
  if (stops.length > 0) {
    lines.push({
      text: "YOUR DAY, STOP BY STOP",
      font: "bold",
      size: 9.5,
      color: GOLD,
      spaceBefore: 20,
    });
    lines.push({ rule: true, spaceBefore: 4 });
    stops.forEach((stop, i) => {
      lines.push({
        text: `${stop.order ?? i + 1}.  ${stop.label}`,
        font: "bold",
        size: 11.5,
        color: TEAL,
        spaceBefore: 8,
      });
      if (stop.note) {
        lines.push({ text: stop.note, size: 10.5, color: CHARCOAL, spaceBefore: 2 });
      }
    });
  }

  section(lines, "Included", input.includedItems);
  section(lines, "Add-ons", input.addOnLabels);
  section(lines, "Adjusted for you", input.removedOptions);
  section(lines, "Your notes", input.customerNotes);

  lines.push({ rule: true, spaceBefore: 22 });
  lines.push({ text: ITINERARY_FLEXIBILITY_NOTE, size: 10, color: MUTED, spaceBefore: 8 });
  lines.push({ text: CONFIRMATION_SUFFICIENCY_NOTE, size: 10, color: MUTED, spaceBefore: 6 });
  lines.push({
    text: "info@yesexperiencesportugal.com  ·  yesexperiencesportugal.com",
    size: 10,
    color: TEAL,
    spaceBefore: 12,
  });

  return renderSimplePdf(lines);
}

export function itineraryPdfFilename(bookingRef?: string | null): string {
  const ref = (bookingRef || "booking").replace(/[^a-zA-Z0-9_-]/g, "").slice(-10) || "booking";
  return `YES-itinerary-${ref}.pdf`;
}
