import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface AttendanceReminderProps {
  firstName?: string | null;
  experienceName?: string | null;
  dateLabel?: string | null;
  portalUrl?: string | null;
}

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" } as const;
const container = { maxWidth: 600, margin: "0 auto", padding: "32px 24px" } as const;
const h1 = { color: "#295B61", fontFamily: "Georgia, serif", fontSize: 26, lineHeight: 1.25, margin: "0 0 14px" };
const body = { color: "#2E2E2E", fontSize: 15, lineHeight: 1.6, margin: "0 0 14px" };
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

const AttendanceReminder = ({ firstName, experienceName, dateLabel, portalUrl }: AttendanceReminderProps) => (
  <Html lang="en">
    <Head />
    <Preview>Please confirm you'll be there</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{firstName ? `${firstName}, see you soon` : "See you soon"}</Heading>
        <Text style={body}>
          Your {experienceName ?? "YES day"}
          {dateLabel ? ` on ${dateLabel}` : ""} is two days away. Please confirm you'll be there and
          check your pickup point and guest names, so your guide has everything ready.
        </Text>
        {portalUrl ? (
          <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
            <Button href={portalUrl} style={button}>
              Confirm attendance
            </Button>
          </Section>
        ) : null}
        <Text style={{ ...body, fontSize: 13, color: "#5A5A5A" }}>
          Questions? Simply reply to this email. — YES Experiences Portugal
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AttendanceReminder,
  subject: "Please confirm your YES day",
  displayName: "Guest — confirm attendance (48h)",
  previewData: {
    firstName: "Sofia",
    experienceName: "Private Sintra & Cascais Tour from Lisbon",
    dateLabel: "2026-10-10",
    portalUrl: "https://yesexperiencesportugal.com/itinerary?session_id=cs_live_example",
  },
} satisfies TemplateEntry;
