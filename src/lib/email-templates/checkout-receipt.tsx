import * as React from 'react'
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
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface CheckoutReceiptProps {
  customerName?: string | null
  tourTitle?: string | null
  bookingType?: 'signature' | 'builder' | 'moment' | string | null
  dateExact?: string | null
  guests?: number | null
  amountFormatted?: string | null
  bookingRef?: string | null
  bokunConfirmation?: string | null
  receiptUrl?: string | null
  bookingStatusUrl?: string | null
  pickup?: string | null
}

const TEAL = '#295B61'
const GOLD = '#C9A96A'
const CHARCOAL = '#2E2E2E'
const SAND = '#F4EEE2'

function formatDate(iso?: string | null): string {
  if (!iso) return 'To be confirmed'
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function labelForType(t?: string | null): string {
  if (t === 'signature') return 'Signature experience'
  if (t === 'builder') return 'Studio · Your day, designed'
  if (t === 'moment') return 'Moment'
  return 'Experience'
}

const CheckoutReceipt = ({
  customerName,
  tourTitle,
  bookingType,
  dateExact,
  guests,
  amountFormatted,
  bookingRef,
  bokunConfirmation,
  receiptUrl,
  bookingStatusUrl,
  pickup,
}: CheckoutReceiptProps) => {
  const firstName = customerName ? customerName.split(' ')[0] : null
  const g = guests ?? 2
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Payment received — ${tourTitle ?? 'your YES experience'} on ${formatDate(dateExact)}.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>YES Experiences · Payment confirmed</Text>

          <Heading style={h1}>
            {firstName ? `Obrigada, ${firstName}. ` : 'Obrigada. '}
            Your booking is confirmed.
          </Heading>

          <Text style={lede}>
            Payment received. A local host from our team will reach out shortly
            with the final logistics. Below is your receipt and the key details.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>{labelForType(bookingType)}</Text>
            <Text style={cardValueLg}>{tourTitle ?? 'Your YES experience'}</Text>
            <Hr style={hr} />
            <Text style={cardLabel}>Date</Text>
            <Text style={cardValue}>{formatDate(dateExact)}</Text>
            <Hr style={hr} />
            <Text style={cardLabel}>Guests</Text>
            <Text style={cardValue}>{`${g} ${g === 1 ? 'guest' : 'guests'}`}</Text>
            {pickup ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Pickup</Text>
                <Text style={cardValue}>{pickup}</Text>
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
            {bokunConfirmation ? (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Operator confirmation</Text>
                <Text style={mono}>{bokunConfirmation}</Text>
              </>
            ) : null}
          </Section>

          {receiptUrl ? (
            <Section style={{ textAlign: 'center' as const, margin: '0 0 20px' }}>
              <Button href={receiptUrl} style={btnPrimary}>
                View your receipt
              </Button>
            </Section>
          ) : null}

          {bookingStatusUrl ? (
            <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
              <Button href={bookingStatusUrl} style={btnGhost}>
                View booking details
              </Button>
            </Section>
          ) : null}

          <Text style={sectionTitle}>What happens next</Text>
          <Text style={body}>
            1. A YES host will confirm the final pickup time and driver
            introduction by email or WhatsApp.
            <br />
            2. On the day, meet your host at the pickup point — everything else
            is taken care of.
            <br />
            3. Anything to adjust before then? Simply reply to this email.
          </Text>

          <Hr style={{ ...hr, margin: '32px 0 20px' }} />
          <Text style={footer}>
            Questions? Reply to this email or write to
            {' '}
            <a href="mailto:info@yesexperiencesportugal.com" style={link}>
              info@yesexperiencesportugal.com
            </a>
            .
          </Text>
          <Text style={signoff}>— YES Experiences Portugal</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CheckoutReceipt,
  subject: (data: Record<string, unknown>) => {
    const tour = typeof data.tourTitle === 'string' ? data.tourTitle : 'your YES experience'
    return `Payment confirmed · ${tour}`
  },
  displayName: 'Checkout receipt & booking details',
  previewData: {
    customerName: 'Sofia Martins',
    tourTitle: 'Arrábida Wine · All-inclusive Signature',
    bookingType: 'signature',
    dateExact: '2026-08-14',
    guests: 2,
    amountFormatted: '€ 690,00',
    bookingRef: 'cs_live_a1b2c3',
    bokunConfirmation: 'YES-12345',
    receiptUrl: 'https://pay.stripe.com/receipts/example',
    bookingStatusUrl: 'https://yesexperiencesportugal.com/booking-confirmed?session_id=cs_live_a1b2c3',
    pickup: 'Hotel Ritz Lisbon',
  } satisfies CheckoutReceiptProps,
} satisfies TemplateEntry

export default CheckoutReceipt

// Styles — Body background stays #ffffff per Lovable email rules.
const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' } as const
const container = { padding: '32px 28px', maxWidth: '560px' } as const
const eyebrow = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: GOLD,
  fontWeight: 700 as const,
  margin: '0 0 18px',
} as const
const h1 = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '26px',
  lineHeight: 1.18,
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: '0 0 16px',
} as const
const lede = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '15px',
  lineHeight: 1.6,
  color: CHARCOAL,
  margin: '0 0 24px',
} as const
const card = {
  backgroundColor: SAND,
  padding: '20px 22px',
  borderRadius: '2px',
  margin: '0 0 24px',
} as const
const cardLabel = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '10.5px',
  letterSpacing: '0.24em',
  textTransform: 'uppercase' as const,
  color: TEAL,
  fontWeight: 600 as const,
  margin: '0 0 4px',
} as const
const cardValue = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '15px',
  color: CHARCOAL,
  fontWeight: 600 as const,
  margin: '0 0 4px',
} as const
const cardValueLg = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '17px',
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: '0 0 4px',
} as const
const mono = {
  fontFamily: '"Courier New", monospace',
  fontSize: '13px',
  color: CHARCOAL,
  margin: '0 0 4px',
} as const
const hr = {
  border: 'none',
  borderTop: `1px solid ${GOLD}40`,
  margin: '12px 0',
} as const
const sectionTitle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.24em',
  textTransform: 'uppercase' as const,
  color: TEAL,
  fontWeight: 700 as const,
  margin: '4px 0 12px',
} as const
const body = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  lineHeight: 1.7,
  color: CHARCOAL,
  margin: '0 0 20px',
} as const
const btnPrimary = {
  backgroundColor: TEAL,
  color: '#ffffff',
  padding: '13px 26px',
  borderRadius: '2px',
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  fontWeight: 700 as const,
  textDecoration: 'none' as const,
} as const
const btnGhost = {
  backgroundColor: '#ffffff',
  color: TEAL,
  padding: '12px 24px',
  borderRadius: '2px',
  border: `1px solid ${TEAL}`,
  fontFamily: 'Arial, sans-serif',
  fontSize: '12px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  fontWeight: 700 as const,
  textDecoration: 'none' as const,
} as const
const footer = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
  lineHeight: 1.55,
  color: `${CHARCOAL}cc`,
  margin: '0 0 14px',
} as const
const link = { color: TEAL, textDecoration: 'underline' } as const
const signoff = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  color: TEAL,
  margin: 0,
} as const
