/**
 * Per-booking guide briefing.
 *
 * Structured sections built from the booking row (normalised operational
 * columns first, frozen checkout snapshot second) plus the tour source of
 * truth for itinerary, inclusions and exclusions. Money never appears here —
 * no totals, no rates, no payment data — and nothing is invented: unknown
 * operational facts read "to confirm".
 */
import { buildGuideBrief, type GuideBriefRow } from "@/lib/guide-brief";

const TO_CONFIRM = "to confirm";

export type BriefBookingRow = GuideBriefRow & {
  tour_title?: string | null;
  start_time?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  language?: string | null;
  pax_breakdown?: Record<string, number> | null;
  extras?: unknown;
  inclusions?: unknown;
  exclusions?: unknown;
  client_notes?: string | null;
  operational_notes?: string | null;
  source_channel?: string | null;
  external_booking_ref?: string | null;
};

export type BriefSection = { heading: string; lines: string[] };

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const text = (value: unknown, fallback = TO_CONFIRM): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export function buildBookingBriefSections(
  row: BriefBookingRow,
  tour?: { title?: string; stops?: Array<{ label?: string; name?: string }>; inclusions?: string[]; exclusions?: string[] } | null,
): BriefSection[] {
  const base = buildGuideBrief(row, row.tour_title ?? tour?.title ?? null);

  const party = row.pax_breakdown
    ? Object.entries(row.pax_breakdown)
        .map(([key, count]) => `${count} ${key}`)
        .join(", ")
    : base.party;

  const stops = base.stops.length
    ? base.stops
    : (tour?.stops ?? [])
        .map((stop) => text(stop.label ?? stop.name, ""))
        .filter(Boolean);

  const inclusions = asList(row.inclusions).length ? asList(row.inclusions) : (tour?.inclusions ?? []);
  const exclusions = asList(row.exclusions).length ? asList(row.exclusions) : (tour?.exclusions ?? []);
  const extras = asList(row.extras);

  const sections: BriefSection[] = [
    {
      heading: "Guest",
      lines: [
        `Name: ${text(row.customer_name ?? base.guestName)}`,
        `Guests: ${party || TO_CONFIRM}`,
        `Phone: ${text(row.customer_phone ?? base.guestPhone)}`,
        `Email: ${text(row.customer_email)}`,
        `Language: ${text(row.language ?? base.language)}`,
      ],
    },
    {
      heading: "Meeting",
      lines: [
        `Date: ${text(row.preferred_date ?? base.date)}`,
        `Start time: ${text(row.start_time ?? base.startTime)}`,
        `Pick-up: ${text(row.pickup_location ?? base.pickup)}`,
        `Drop-off: ${text(row.dropoff_location, "same as pick-up unless agreed")}`,
      ],
    },
    {
      heading: "Experience",
      lines: [
        `Tour: ${text(row.tour_title ?? base.experience)}`,
        `Duration: ${text(base.duration)}`,
        ...(stops.length ? stops.map((stop, index) => `${index + 1}. ${stop}`) : [`Itinerary: ${TO_CONFIRM}`]),
      ],
    },
    {
      heading: "Included / not included",
      lines: [
        ...(inclusions.length ? inclusions.map((entry) => `Included: ${entry}`) : [`Included: ${TO_CONFIRM}`]),
        ...exclusions.map((entry) => `Not included: ${entry}`),
        ...extras.map((entry) => `Booked extra: ${entry}`),
      ],
    },
    {
      heading: "Notes & instructions",
      lines: [
        `Guest notes: ${text(row.client_notes ?? row.notes, "none")}`,
        `Operational notes: ${text(row.operational_notes, "none")}`,
        `Reference: ${text(row.external_booking_ref ?? base.reference)}`,
        `Channel: ${text(row.source_channel, "website")}`,
      ],
    },
  ];

  return sections;
}

export function briefSectionsToText(sections: BriefSection[]): string {
  return sections
    .map((section) => [section.heading.toUpperCase(), ...section.lines].join("\n"))
    .join("\n\n");
}
