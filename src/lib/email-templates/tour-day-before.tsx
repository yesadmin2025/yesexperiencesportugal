import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { ITINERARY_FLEXIBILITY_NOTE } from "@/lib/booking-snapshot-contract";

export interface TourDayBeforeProps {
  firstName?: string | null;
  experienceName?: string | null;
  dateLabel?: string | null;
  startTime?: string | null;
  pickup?: string | null;
  durationLabel?: string | null;
  guestsLabel?: string | null;
  itinerary?: Array<{ order?: number | null; label: string; note?: string | null }> | null;
  includedItems?: string[] | null;
  itineraryUrl?: string | null;
}

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" } as const;
const container = { maxWidth: 600, margin: "0 auto", padding: "32px 24px" } as const;
const eyebrow = {
  color: "#C9A96A",
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  margin: "0 0 10px",
};
const h1 = { color: "#295B61", fontFamily: "Georgia, serif", fontSize: 26, lineHeight: 1.25, margin: "0 0 14px" };
const body = { color: "#2E2E2E", fontSize: 15, lineHeight: 1.6, margin: "0 0 14px" };
const label = {
  color: "#888",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  margin: "0 0 3px",
};
const value = { color: "#2E2E2E", fontSize: 15, margin: "0 0 14px", lineHeight: 1.5 };
const h2 = { color: "#295B61", fontFamily: "Georgia, serif", fontSize: 18, margin: "22px 0 10px" };
const li = { color: "#2E2E2E", fontSize: 14, lineHeight: 1.55, margin: "0 0 6px" };
const button = {
  backgroundColor: "#295B61",
  color: "#ffffff",
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  padding: "14px 24px",
  borderRadius: 2,
  textDecoration: "none",
  display: "inline-block",
};
const hr = { borderColor: "#EDE6DA", margin: "24px 0" };
const muted = { color: "#777", fontSize: 12, lineHeight: 1.55, margin: "0 0 8px" };

const Field = ({ l, v }: { l: string; v?: string | null }) =>
  v ? (
    <>
      <Text style={label}>{l}</Text>
      <Text style={value}>{v}</Text>
    </>
  ) : null;

const TourDayBefore = (p: TourDayBeforeProps) => {
  const experience = p.experienceName || "your YES day";
  const itinerary = p.itinerary ?? [];
  const included = p.includedItems ?? [];
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Tomorrow: {experience}{p.startTime ? ` · pickup ${p.startTime}` : ""}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>YES Experiences Portugal · Tomorrow</Text>
          <Heading style={h1}>{p.firstName ? `${p.firstName}, your day is tomorrow` : "Your day is tomorrow"}</Heading>
          <Text style={body}>Here is everything you need for {experience}. Your local host will meet you at the pickup point.</Text>

          <Section>
            <Field l="Date" v={p.dateLabel} />
            <Field l="Pickup time" v={p.startTime} />
            <Field l="Pickup point" v={p.pickup} />
            <Field l="Duration" v={p.durationLabel} />
            <Field l="Guests" v={p.guestsLabel} />
          </Section>

          {itinerary.length > 0 ? (
            <Section>
              <Heading as="h2" style={h2}>Your itinerary</Heading>
              {itinerary.map((s, i) => (
                <Text key={i} style={li}>
                  {s.order ?? i + 1}. {s.label}
                  {s.note ? ` — ${s.note}` : ""}
                </Text>
              ))}
            </Section>
          ) : null}

          {included.length > 0 ? (
            <Section>
              <Heading as="h2" style={h2}>What's included</Heading>
              {included.map((item, i) => (
                <Text key={i} style={li}>• {item}</Text>
              ))}
            </Section>
          ) : null}

          {p.itineraryUrl ? (
            <Section style={{ margin: "26px 0 6px" }}>
              <Button href={p.itineraryUrl} style={button}>View your itinerary</Button>
            </Section>
          ) : null}

          <Hr style={hr} />
          <Text style={muted}>{ITINERARY_FLEXIBILITY_NOTE}</Text>
          <Text style={muted}>Questions or running late? Simply reply to this email or write to info@yesexperiencesportugal.com.</Text>
          <Text style={{ ...muted, color: "#295B61" }}>See you tomorrow — YES Experiences Portugal</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: TourDayBefore,
  subject: (data: Record<string, unknown>) => {
    const t = typeof data.experienceName === "string" && data.experienceName ? data.experienceName : "your YES day";
    const time = typeof data.startTime === "string" && data.startTime ? ` · pickup ${data.startTime}` : "";
    return `Tomorrow: ${t}${time}`;
  },
  displayName: "Guest — day before tour",
  previewData: {
    firstName: "Sofia",
    experienceName: "Private Sintra & Cascais Tour from Lisbon",
    dateLabel: "2026-10-10",
    startTime: "09:00",
    pickup: "Hotel Avenida Palace, Lisbon",
    durationLabel: "Full day · ~9h",
    guestsLabel: "2 guests",
    itinerary: [
      { order: 1, label: "Pena Palace" },
      { order: 2, label: "Quinta da Regaleira" },
    ],
    includedItems: ["Private driver-guide", "Hotel pickup & drop-off"],
    itineraryUrl: "https://yesexperiencesportugal.com/itinerary?session_id=cs_live_example",
  },
} satisfies TemplateEntry;
