import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface CheckoutUnfinishedProps {
  customerName?: string | null;
  experienceName?: string | null;
  dateExact?: string | null;
  resumeUrl?: string | null;
}

const CheckoutUnfinished = ({ customerName, experienceName, dateExact, resumeUrl }: CheckoutUnfinishedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your reservation was not completed — no payment was taken.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>YES Experiences · Reservation status</Text>
        <Heading style={heading}>
          {customerName ? `${customerName}, ` : ""}your reservation is not confirmed yet.
        </Heading>
        <Text style={bodyText}>
          The payment step closed before it was completed, so no payment was taken and the day is not
          reserved. If you still want it, you can pick up where you left off.
        </Text>
        {experienceName || dateExact ? (
          <Section style={card}>
            {experienceName ? <Text style={value}>{experienceName}</Text> : null}
            {dateExact ? <Text style={detail}>Date · {dateExact}</Text> : null}
          </Section>
        ) : null}
        {resumeUrl ? (
          <Button href={resumeUrl} style={button}>
            Return to your reservation
          </Button>
        ) : null}
        <Hr style={rule} />
        <Text style={bodyText}>
          If something did not work, or you have a question about the day, reply to this email and we
          will help personally.
        </Text>
        <Text style={signoff}>— YES Experiences Portugal</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: CheckoutUnfinished,
  subject: (data: Record<string, unknown>) =>
    `Your reservation is not confirmed yet${typeof data.experienceName === "string" ? ` — ${data.experienceName}` : ""}`,
  displayName: "Unfinished reservation notice",
  previewData: {
    customerName: "Sofia",
    experienceName: "Arrábida Wine Experience",
    dateExact: "2026-10-30",
    resumeUrl: "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive",
  } satisfies CheckoutUnfinishedProps,
} satisfies TemplateEntry;

export default CheckoutUnfinished;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" } as const;
const container = { maxWidth: 560, margin: "0 auto", padding: "32px 28px" } as const;
const eyebrow = { color: "#C9A96A", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 18px" } as const;
const heading = { color: "#2E2E2E", fontFamily: "Georgia, serif", fontSize: 26, lineHeight: 1.2, margin: "0 0 18px" } as const;
const bodyText = { color: "#2E2E2E", fontSize: 15, lineHeight: 1.65, margin: "0 0 20px" } as const;
const card = { backgroundColor: "#F4EFE7", padding: "20px 22px", borderRadius: 4, margin: "24px 0" } as const;
const value = { color: "#295B61", fontFamily: "Georgia, serif", fontSize: 19, margin: "0 0 12px" } as const;
const detail = { color: "#2E2E2E", fontSize: 13, lineHeight: 1.55, margin: "4px 0" } as const;
const button = { backgroundColor: "#295B61", color: "#FAF8F3", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" as const, fontWeight: 700, padding: "14px 22px", borderRadius: 2, textDecoration: "none" } as const;
const rule = { borderColor: "#E7DECD", margin: "28px 0" } as const;
const signoff = { color: "#295B61", fontSize: 14, fontWeight: 700, margin: "24px 0 0" } as const;
