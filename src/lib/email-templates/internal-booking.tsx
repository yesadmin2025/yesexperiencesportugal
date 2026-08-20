import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface InternalBookingProps {
  customerName?: string | null;
  customerEmail?: string | null;
  tourTitle?: string | null;
  experienceName?: string | null;
  bookingType?: string | null;
  dateExact?: string | null;
  guests?: number | null;
  compositionSummary?: string | null;

  amountFormatted?: string | null;
  bookingRef?: string | null;
  bookingId?: string | null;
  adminUrl?: string | null;
  durationLabel?: string | null;

  pickup?: string | null;
  startTime?: string | null;
  language?: string | null;
  customerPhone?: string | null;
  itinerary?: Array<{
    order?: number | null;
    label: string;
    durationMinutes?: number | null;
    note?: string | null;
  }> | null;
  includedItems?: string[] | null;
  addOnLabels?: string[] | null;
  removedOptions?: string[] | null;
  customerNotes?: string[] | null;
}

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" } as const;
const container = { maxWidth: 620, margin: "0 auto", padding: "28px 24px" } as const;
const h1 = { color: "#295B61", fontSize: 20, margin: "0 0 6px" };
const sub = {
  color: "#C9A96A",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  margin: "0 0 20px",
};
const row = { margin: "0 0 14px" };
const label = {
  color: "#888",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  margin: "0 0 3px",
};
const value = { color: "#111", fontSize: 14, margin: 0, lineHeight: 1.55 };
const button = {
  backgroundColor: "#295B61",
  color: "#ffffff",
  fontSize: 14,
  padding: "12px 22px",
  borderRadius: 4,
  textDecoration: "none",
  display: "inline-block",
};

const Field: React.FC<{ label: string; value?: string | number | null }> = ({
  label: l,
  value: v,
}) =>
  v == null || v === "" ? null : (
    <Section style={row}>
      <Text style={label}>{l}</Text>
      <Text style={value}>{String(v)}</Text>
    </Section>
  );

const ListField: React.FC<{ label: string; items?: string[] | null }> = ({ label: l, items }) =>
  !items || items.length === 0 ? null : (
    <Section style={row}>
      <Text style={label}>{l}</Text>
      {items.map((item, i) => (
        <Text key={i} style={value}>
          • {item}
        </Text>
      ))}
    </Section>
  );

const InternalBooking: React.FC<InternalBookingProps> = (p) => {
  const experience = p.experienceName || p.tourTitle || "YES experience";
  return (
    <Html lang="en">
      <Head />
      <Preview>New booking — {experience}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New booking confirmed</Heading>
          <Text style={sub}>Stripe payment confirmed</Text>

          <Field label="Booking reference" value={p.bookingRef} />
          <Field label="Guest" value={p.customerName} />
          <Field label="Email" value={p.customerEmail} />
          <Field label="Experience" value={experience} />
          <Field label="Type" value={p.bookingType} />
          <Field label="Booking date" value={p.dateExact} />
          <Field label="Duration" value={p.durationLabel} />
          <Field label="Guests" value={p.compositionSummary ?? p.guests ?? null} />
          <Field label="Total paid" value={p.amountFormatted} />
          <Field label="Pickup" value={p.pickup} />
          <Field label="Start time" value={p.startTime} />
          <Field label="Phone" value={p.customerPhone} />
          <Field label="Language" value={p.language} />
          <ListField
            label="Designed itinerary"
            items={(p.itinerary ?? []).map(
              (s, i) =>
                `${s.order ?? i + 1}. ${s.label}` +
                (s.durationMinutes ? ` · ${s.durationMinutes} min` : "") +
                (s.note ? ` — ${s.note}` : ""),
            )}
          />
          <ListField label="Included" items={p.includedItems} />
          <ListField label="Add-ons" items={p.addOnLabels} />
          <ListField label="Removed options" items={p.removedOptions} />
          <ListField label="Customer notes" items={p.customerNotes} />

          {p.adminUrl ? (
            <Section style={{ margin: "26px 0 6px" }}>
              <Button href={p.adminUrl} style={button}>
                Open booking in Admin
              </Button>
            </Section>
          ) : null}

          <Text style={{ ...value, color: "#666", fontSize: 12, marginTop: 22 }}>
            The guest has already received the branded receipt. Reach out to confirm the final
            logistics with the local host.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: InternalBooking,
  subject: (data: Record<string, unknown>) => {
    const t =
      typeof data.experienceName === "string" && data.experienceName
        ? data.experienceName
        : typeof data.tourTitle === "string"
          ? data.tourTitle
          : "a YES experience";
    const d = typeof data.dateExact === "string" && data.dateExact ? ` · ${data.dateExact}` : "";
    return `New booking · ${t}${d}`;
  },
  displayName: "Internal — new booking",
  previewData: {
    customerName: "Sofia Martins",
    customerEmail: "sofia@example.com",
    experienceName: "Private Sintra & Cascais Tour from Lisbon",
    tourTitle: "Private Sintra & Cascais Tour from Lisbon",
    bookingType: "signature",
    dateExact: "2026-08-14",
    guests: 2,
    durationLabel: "Full day · ~9h",
    amountFormatted: "€ 690,00",
    bookingRef: "cs_live_a1b2c3",
    adminUrl:
      "https://yesexperiencesportugal.com/admin/bookings/00000000-0000-0000-0000-000000000000",
    startTime: "09:00",
    customerPhone: "+351 911 889 000",
    itinerary: [
      { order: 1, label: "Pena Palace", durationMinutes: 90 },
      { order: 2, label: "Quinta da Regaleira", durationMinutes: 75 },
    ],
    includedItems: ["Private driver-guide", "Hotel pickup & drop-off"],
    addOnLabels: ["Private photographer · €120 pp"],
    removedOptions: ["Included lunch removed (−€15 per person)"],
    customerNotes: ["Dietary: one vegetarian"],
  },
} satisfies TemplateEntry;
