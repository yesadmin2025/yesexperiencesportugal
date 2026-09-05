import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  ITINERARY_FLEXIBILITY_NOTE,
  CONFIRMATION_SUFFICIENCY_NOTE,
} from "@/lib/booking-snapshot-contract";
import { CANCELLATION, PHONE_DISPLAY, WHATSAPP_NUMBER } from "@/config/business-nap";

import {
  summarizeJourneyLines,
  type CheckoutJourneyLine,
  type JourneyBand,
} from "@/lib/checkout/journeyDisplay";

export interface CheckoutReceiptProps {
  customerName?: string | null;
  tourTitle?: string | null;
  bookingType?: "signature" | "builder" | "moment" | string | null;
  dateExact?: string | null;
  guests?: number | null;
  /** Adults 18+. When present alongside `minorAges`, the receipt renders
   *  the full per-minor breakdown mirroring the on-page summary. */
  adults?: number | null;
  minorAges?: number[] | null;
  /** Per-adult EUR at the resolved tier — used to derive band unit prices.
   *  When absent, only qty rows are shown, no per-band euro amounts. */
  perPaxAdultEur?: number | null;
  amountFormatted?: string | null;
  bookingRef?: string | null;

  receiptUrl?: string | null;
  bookingStatusUrl?: string | null;
  pickup?: string | null;
  /** Local start time captured at checkout, e.g. "09:00". */
  startTime?: string | null;
  durationLabel?: string | null;
  /** The designed day, stop by stop (frozen booking snapshot). */
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
  /** Online, readable version of the attached itinerary PDF. */
  itineraryUrl?: string | null;
  /** Direct download of the itinerary PDF tied to this booking reference. */
  pdfUrl?: string | null;
  /** Self-service page: view, adjust or cancel this booking. */
  manageUrl?: string | null;
  /** Public page of the Signature experience behind this booking. */
  experienceUrl?: string | null;
}



/**
 * Age-band multipliers — imported from the single source of truth in
 * `src/data/signatureTourPricing.ts` so email totals stay byte-identical
 * to the on-page summary.
 */
import { AGE_BAND_PCT, ageBand as ageBandRaw } from "@/data/signatureTourPricing";

function ageBand(age: number): JourneyBand | null {
  const b = ageBandRaw(age);
  return b === "adult" ? null : b;
}

/** Rebuild the same `CheckoutJourneyLine[]` shape the on-page summary uses. */
function buildJourneyLines(
  adults: number,
  minorAges: number[],
  perPaxAdultEur: number,
): CheckoutJourneyLine[] {
  const lines: CheckoutJourneyLine[] = [];
  for (let i = 0; i < adults; i++) {
    lines.push({ kind: "adult", band: "adult", age: null, unitEur: perPaxAdultEur, qty: 1 });
  }
  for (const rawAge of minorAges) {
    const band = ageBand(rawAge);
    if (!band) continue;
    const unitEur = Math.round(perPaxAdultEur * AGE_BAND_PCT[band]);
    lines.push({ kind: "minor", band, age: Math.floor(rawAge), unitEur, qty: 1 });
  }
  return lines;
}

function formatEurInline(n: number): string {
  return `€${Math.round(n).toLocaleString("en-GB")}`;
}

const TEAL = "#295B61";
const GOLD = "#C9A96A";
const CHARCOAL = "#2E2E2E";
const SAND = "#F4EEE2";

function formatDate(iso?: string | null): string {
  if (!iso) return "To be confirmed";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function labelForType(t?: string | null): string {
  if (t === "signature") return "Signature experience";
  if (t === "builder") return "Studio · Your day, designed";
  if (t === "moment") return "Moment";
  return "Experience";
}

const CheckoutReceipt = ({
  customerName,
  tourTitle,
  bookingType,
  dateExact,
  guests,
  adults,
  minorAges,
  perPaxAdultEur,
  amountFormatted,
  bookingRef,
  receiptUrl,
  bookingStatusUrl,
  pickup,
  startTime,
  durationLabel,
  itinerary,
  includedItems,
  addOnLabels,
  removedOptions,
  customerNotes,
  itineraryUrl,
  pdfUrl,
  manageUrl,
  experienceUrl,

}: CheckoutReceiptProps) => {
  const firstName = customerName ? customerName.split(" ")[0] : null;
  const g = guests ?? 2;
  const hasComposition = typeof adults === "number" && adults >= 1 && Array.isArray(minorAges);
  const hasMinors = hasComposition && (minorAges ?? []).length > 0;
  const hasAdultRate = typeof perPaxAdultEur === "number" && perPaxAdultEur > 0;
  // Reuse the SAME aggregation the on-page summary calls
  // (`PriceBreakdownRows` → `summarizeJourneyLines`) so every label, unit
  // and subtotal in the email matches the checkout screen byte-for-byte.
  const compositionRows =
    hasComposition && hasAdultRate
      ? summarizeJourneyLines(buildJourneyLines(adults!, minorAges ?? [], perPaxAdultEur!))
      : [];
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Payment received — ${tourTitle ?? "your YES experience"} on ${formatDate(dateExact)}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>YES Experiences · Payment confirmed</Text>

          <Heading style={h1}>
            {firstName ? `Obrigada, ${firstName}. ` : "Obrigada. "}
            Your booking is confirmed.
          </Heading>

          <Text style={lede}>
            Payment received. A local host from our team will reach out shortly with the final
            logistics. Below is your receipt and the key details.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>{labelForType(bookingType)}</Text>
            <Text style={cardValueLg}>{tourTitle ?? "Your YES experience"}</Text>
            <Hr style={hr} />
            <Text style={cardLabel}>Date</Text>
            <Text style={cardValue}>{formatDate(dateExact)}</Text>
            <Hr style={hr} />
            <Text style={cardLabel}>{hasMinors ? "Travellers" : "Guests"}</Text>
            {hasMinors && compositionRows.length > 0 ? (
              <>
                {compositionRows.map((row) => (
                  <Text key={row.key} style={cardValue}>
                    {row.qty > 1
                      ? `${row.label} (${formatEurInline(row.unitEur)} × ${row.qty})`
                      : row.label}
                    {` — ${formatEurInline(row.subtotalEur)}`}
                  </Text>
                ))}
              </>
            ) : (
              <Text style={cardValue}>{`${g} ${g === 1 ? "guest" : "guests"}`}</Text>
            )}
            {pickup ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Pickup</Text>
                <Text style={cardValue}>{pickup}</Text>
              </>
            ) : null}
            {startTime ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Start time</Text>
                <Text style={cardValue}>{startTime}</Text>
              </>
            ) : null}
            {durationLabel ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Duration</Text>
                <Text style={cardValue}>{durationLabel}</Text>
              </>
            ) : null}

            {amountFormatted ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Total paid</Text>
                <Text style={cardValueLg}>{amountFormatted}</Text>
              </>
            ) : null}

            {bookingRef ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Booking reference</Text>
                <Text style={mono}>{bookingRef}</Text>
              </>
            ) : null}
          </Section>

          {itinerary && itinerary.length > 0 ? (
            <>
              <Text style={sectionTitle}>Your day, stop by stop</Text>
              <Section style={{ margin: "0 0 24px" }}>
                {itinerary.map((stop, i) => (
                  <Text key={`${stop.label}-${i}`} style={body}>
                    <strong>{`${stop.order ?? i + 1}. ${stop.label}`}</strong>
                    {stop.note ? (
                      <>
                        <br />
                        {stop.note}
                      </>
                    ) : null}
                  </Text>
                ))}
                <Text style={{ ...body, fontSize: "13px", color: "#5A5A5A" }}>
                  {ITINERARY_FLEXIBILITY_NOTE}
                </Text>
              </Section>
            </>
          ) : null}

          {includedItems && includedItems.length > 0 ? (
            <>
              <Text style={sectionTitle}>Included</Text>
              <Section style={{ margin: "0 0 24px" }}>
                {includedItems.map((item, i) => (
                  <Text key={`inc-${i}`} style={body}>
                    • {item}
                  </Text>
                ))}
              </Section>
            </>
          ) : null}

          {addOnLabels && addOnLabels.length > 0 ? (
            <>
              <Text style={sectionTitle}>Add-ons</Text>
              <Section style={{ margin: "0 0 24px" }}>
                {addOnLabels.map((item, i) => (
                  <Text key={`add-${i}`} style={body}>
                    • {item}
                  </Text>
                ))}
              </Section>
            </>
          ) : null}

          {removedOptions && removedOptions.length > 0 ? (
            <>
              <Text style={sectionTitle}>Adjusted for you</Text>
              <Section style={{ margin: "0 0 24px" }}>
                {removedOptions.map((item, i) => (
                  <Text key={`rem-${i}`} style={body}>
                    • {item}
                  </Text>
                ))}
              </Section>
            </>
          ) : null}

          {customerNotes && customerNotes.length > 0 ? (
            <>
              <Text style={sectionTitle}>Your notes</Text>
              <Section style={{ margin: "0 0 24px" }}>
                {customerNotes.map((item, i) => (
                  <Text key={`note-${i}`} style={body}>
                    • {item}
                  </Text>
                ))}
              </Section>
            </>
          ) : null}

          {itineraryUrl || pdfUrl || manageUrl || experienceUrl ? (
            <>
              <Text style={sectionTitle}>Your booking</Text>
              <Section style={{ margin: "0 0 24px" }}>
                {itineraryUrl ? (
                  <Text style={{ ...body, margin: "0 0 8px" }}>
                    <Link href={itineraryUrl} style={link}>
                      View your itinerary online
                    </Link>
                  </Text>
                ) : null}
                {pdfUrl ? (
                  <Text style={{ ...body, margin: "0 0 8px" }}>
                    <Link href={pdfUrl} style={link}>
                      Download the itinerary (PDF)
                    </Link>
                  </Text>
                ) : null}
                {manageUrl ? (
                  <Text style={{ ...body, margin: "0 0 8px" }}>
                    <Link href={manageUrl} style={link}>
                      Manage or cancel this booking
                    </Link>
                  </Text>
                ) : null}
                {experienceUrl ? (
                  <Text style={{ ...body, margin: "0 0 8px" }}>
                    <Link href={experienceUrl} style={link}>
                      Revisit the experience page
                    </Link>
                  </Text>
                ) : null}
                {bookingRef ? (
                  <Text style={{ ...body, margin: "8px 0 0", fontSize: "13px", color: "#5A5A5A" }}>
                    Keep this reference at hand: <strong>{bookingRef}</strong>
                  </Text>
                ) : null}
              </Section>
            </>
          ) : null}

          {receiptUrl ? (
            <Section style={{ textAlign: "center" as const, margin: "0 0 20px" }}>
              <Button href={receiptUrl} style={btnPrimary}>
                View your receipt
              </Button>
            </Section>
          ) : null}

          {manageUrl || bookingStatusUrl ? (
            <Section style={{ textAlign: "center" as const, margin: "0 0 28px" }}>
              <Button href={manageUrl || bookingStatusUrl!} style={btnGhost}>
                {manageUrl ? "Manage my booking" : "View booking details"}
              </Button>
            </Section>
          ) : null}


          <Text style={sectionTitle}>Before the day</Text>
          <Text style={body}>
            • Comfortable shoes — several stops involve cobbles or a short slope.
            <br />
            • Sun protection and a light layer: the coast can be breezy even in summer.
            <br />
            • A photo ID for each traveller, and a car seat request in advance if you need one.
            <br />
            • Let us know about allergies or dietary needs at least two days before, so the kitchens
            and cellars can prepare.
          </Text>

          <Text style={sectionTitle}>On the morning</Text>
          <Text style={body}>
            Running late, changed room, or can&apos;t find your host? Message or call us on{" "}
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} style={link}>
              WhatsApp {PHONE_DISPLAY}
            </a>{" "}
            — the fastest way to reach a real person on the day.
          </Text>

          <Text style={sectionTitle}>Cancellation</Text>
          <Text style={body}>
            {bookingType === "signature" ? CANCELLATION.signature.en : CANCELLATION.custom.en} To
            change or cancel, simply reply to this email with your booking reference.
          </Text>

          <Text style={sectionTitle}>What happens next</Text>
          <Text style={body}>
            1. A YES host will confirm the final pickup time and driver introduction by email or
            WhatsApp.
            <br />
            2. On the day, meet your host at the pickup point — everything else is taken care of.
            <br />
            3. Anything to adjust before then? Simply reply to this email.
          </Text>
          <Text style={{ ...body, fontSize: "13px", color: "#5A5A5A" }}>
            {CONFIRMATION_SUFFICIENCY_NOTE}
          </Text>


          <Hr style={{ ...hr, margin: "32px 0 20px" }} />
          <Text style={footer}>
            Questions? Reply to this email or write to{" "}
            <a href="mailto:info@yesexperiencesportugal.com" style={link}>
              info@yesexperiencesportugal.com
            </a>
            .
          </Text>
          <Text style={signoff}>— YES Experiences Portugal</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: CheckoutReceipt,
  subject: (data: Record<string, unknown>) => {
    const tour = typeof data.tourTitle === "string" ? data.tourTitle : "your YES experience";
    return `Payment confirmed · ${tour}`;
  },
  displayName: "Checkout receipt & booking details",
  previewData: {
    customerName: "Sofia Martins",
    tourTitle: "Arrábida Wine · All-inclusive Signature",
    bookingType: "signature",
    dateExact: "2026-08-14",
    guests: 4,
    adults: 2,
    minorAges: [13, 8],
    perPaxAdultEur: 250,
    amountFormatted: "€ 813,00",
    bookingRef: "cs_live_a1b2c3",
    receiptUrl: "https://pay.stripe.com/receipts/example",
    bookingStatusUrl:
      "https://yesexperiencesportugal.com/booking-confirmed?session_id=cs_live_a1b2c3",
    pickup: "Hotel Ritz Lisbon",
  } satisfies CheckoutReceiptProps,
} satisfies TemplateEntry;

export default CheckoutReceipt;

// Styles — Body background stays #ffffff per Lovable email rules.
const main = {
  backgroundColor: "#ffffff",
  fontFamily: 'Georgia, "Times New Roman", serif',
} as const;
const container = { padding: "32px 28px", maxWidth: "560px" } as const;
const eyebrow = {
  fontFamily: "Arial, sans-serif",
  fontSize: "11px",
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: GOLD,
  fontWeight: 700 as const,
  margin: "0 0 18px",
} as const;
const h1 = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "26px",
  lineHeight: 1.18,
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: "0 0 16px",
} as const;
const lede = {
  fontFamily: "Arial, sans-serif",
  fontSize: "15px",
  lineHeight: 1.6,
  color: CHARCOAL,
  margin: "0 0 24px",
} as const;
const card = {
  backgroundColor: SAND,
  padding: "20px 22px",
  borderRadius: "2px",
  margin: "0 0 24px",
} as const;
const cardLabel = {
  fontFamily: "Arial, sans-serif",
  fontSize: "10.5px",
  letterSpacing: "0.24em",
  textTransform: "uppercase" as const,
  color: TEAL,
  fontWeight: 600 as const,
  margin: "0 0 4px",
} as const;
const cardValue = {
  fontFamily: "Arial, sans-serif",
  fontSize: "15px",
  color: CHARCOAL,
  fontWeight: 600 as const,
  margin: "0 0 4px",
} as const;
const cardValueLg = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "17px",
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: "0 0 4px",
} as const;
const mono = {
  fontFamily: '"Courier New", monospace',
  fontSize: "13px",
  color: CHARCOAL,
  margin: "0 0 4px",
} as const;
const hr = {
  border: "none",
  borderTop: `1px solid ${GOLD}40`,
  margin: "12px 0",
} as const;
const sectionTitle = {
  fontFamily: "Arial, sans-serif",
  fontSize: "11px",
  letterSpacing: "0.24em",
  textTransform: "uppercase" as const,
  color: TEAL,
  fontWeight: 700 as const,
  margin: "4px 0 12px",
} as const;
const body = {
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
  lineHeight: 1.7,
  color: CHARCOAL,
  margin: "0 0 20px",
} as const;
const btnPrimary = {
  backgroundColor: TEAL,
  color: "#ffffff",
  padding: "13px 26px",
  borderRadius: "2px",
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  fontWeight: 700 as const,
  textDecoration: "none" as const,
} as const;
const btnGhost = {
  backgroundColor: "#ffffff",
  color: TEAL,
  padding: "12px 24px",
  borderRadius: "2px",
  border: `1px solid ${TEAL}`,
  fontFamily: "Arial, sans-serif",
  fontSize: "12px",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  fontWeight: 700 as const,
  textDecoration: "none" as const,
} as const;
const footer = {
  fontFamily: "Arial, sans-serif",
  fontSize: "13px",
  lineHeight: 1.55,
  color: `${CHARCOAL}cc`,
  margin: "0 0 14px",
} as const;
const link = { color: TEAL, textDecoration: "underline" } as const;
const signoff = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "14px",
  fontStyle: "italic" as const,
  color: TEAL,
  margin: 0,
} as const;
