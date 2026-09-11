import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface BookingCancelledProps {
  customerName?: string | null;
  experienceName?: string | null;
  dateExact?: string | null;
  amountFormatted?: string | null;
  bookingRef?: string | null;
  refundStatus?: string | null;
}

const BookingCancelled = ({
  customerName,
  experienceName,
  dateExact,
  amountFormatted,
  bookingRef,
  refundStatus,
}: BookingCancelledProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your YES Experiences booking has been cancelled and refunded.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>YES Experiences · Booking update</Text>
        <Heading style={heading}>
          {customerName ? `${customerName}, ` : ""}your cancellation is confirmed.
        </Heading>
        <Text style={bodyText}>
          We have cancelled your booking and submitted the refund to your original payment method.
          Your bank may need several working days to show it on your statement.
        </Text>
        <Section style={card}>
          {experienceName ? <Text style={value}>{experienceName}</Text> : null}
          {dateExact ? <Text style={detail}>Date · {dateExact}</Text> : null}
          {amountFormatted ? <Text style={detail}>Refund · {amountFormatted}</Text> : null}
          {bookingRef ? <Text style={detail}>Reference · {bookingRef}</Text> : null}
          {refundStatus ? <Text style={detail}>Status · {refundStatus}</Text> : null}
        </Section>
        <Hr style={rule} />
        <Text style={bodyText}>
          If you would prefer a different date, reply to this email. We will help personally.
        </Text>
        <Text style={signoff}>— YES Experiences Portugal</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BookingCancelled,
  subject: (data: Record<string, unknown>) =>
    `Cancellation confirmed${typeof data.experienceName === "string" ? ` — ${data.experienceName}` : ""}`,
  displayName: "Booking cancellation and refund",
  previewData: {
    customerName: "Sofia",
    experienceName: "Arrábida Wine Experience",
    dateExact: "2026-10-14",
    amountFormatted: "€420.00",
    bookingRef: "YES-EXAMPLE",
    refundStatus: "Submitted",
  } satisfies BookingCancelledProps,
} satisfies TemplateEntry;

export default BookingCancelled;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" } as const;
const container = { maxWidth: 560, margin: "0 auto", padding: "32px 28px" } as const;
const eyebrow = { color: "#C9A96A", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" as const, fontWeight: 700, margin: "0 0 18px" } as const;
const heading = { color: "#2E2E2E", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 26, lineHeight: 1.2, margin: "0 0 18px" } as const;
const bodyText = { color: "#2E2E2E", fontSize: 15, lineHeight: 1.65, margin: "0 0 20px" } as const;
const card = { backgroundColor: "#F4EEE2", padding: "20px 22px", borderRadius: 4, margin: "24px 0" } as const;
const value = { color: "#295B61", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 19, margin: "0 0 12px" } as const;
const detail = { color: "#2E2E2E", fontSize: 13, lineHeight: 1.55, margin: "4px 0" } as const;
const rule = { borderColor: "#E7DECD", margin: "28px 0" } as const;
const signoff = { color: "#295B61", fontSize: 14, fontWeight: 700, margin: "24px 0 0" } as const;