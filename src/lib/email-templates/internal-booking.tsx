import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface InternalBookingProps {
  customerName?: string | null
  customerEmail?: string | null
  tourTitle?: string | null
  bookingType?: string | null
  dateExact?: string | null
  guests?: number | null
  amountFormatted?: string | null
  bookingRef?: string | null
  bokunConfirmation?: string | null
  pickup?: string | null
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' } as const
const container = { maxWidth: 620, margin: '0 auto', padding: '28px 24px' } as const
const h1 = { color: '#295B61', fontSize: 20, margin: '0 0 6px' }
const sub = { color: '#C9A96A', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' as const, margin: '0 0 20px' }
const row = { margin: '0 0 14px' }
const label = { color: '#888', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' as const, margin: '0 0 3px' }
const value = { color: '#111', fontSize: 14, margin: 0, lineHeight: 1.55 }

const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label: l, value: v }) =>
  v == null || v === '' ? null : (
    <Section style={row}>
      <Text style={label}>{l}</Text>
      <Text style={value}>{String(v)}</Text>
    </Section>
  )

const InternalBooking: React.FC<InternalBookingProps> = (p) => (
  <Html lang="en">
    <Head />
    <Preview>New booking — {p.tourTitle ?? 'YES experience'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New booking confirmed</Heading>
        <Text style={sub}>Stripe payment · Bókun mapped</Text>

        <Field label="Guest" value={p.customerName} />
        <Field label="Email" value={p.customerEmail} />
        <Field label="Experience" value={p.tourTitle} />
        <Field label="Type" value={p.bookingType} />
        <Field label="Date" value={p.dateExact} />
        <Field label="Guests" value={p.guests ?? null} />
        <Field label="Amount" value={p.amountFormatted} />
        <Field label="Pickup" value={p.pickup} />
        <Field label="Stripe session" value={p.bookingRef} />
        <Field label="Bókun confirmation" value={p.bokunConfirmation} />

        <Text style={{ ...value, color: '#666', fontSize: 12, marginTop: 22 }}>
          The guest has already received the branded receipt. Bókun should have notified you
          separately — cross-check the confirmation code above.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InternalBooking,
  subject: (data: Record<string, unknown>) => {
    const t = typeof data.tourTitle === 'string' ? data.tourTitle : 'a YES experience'
    return `New booking · ${t}`
  },
  displayName: 'Internal — new booking',
  previewData: {
    customerName: 'Sofia Martins',
    customerEmail: 'sofia@example.com',
    tourTitle: 'Private Sintra & Cascais Tour from Lisbon',
    bookingType: 'signature',
    dateExact: '2026-08-14',
    guests: 2,
    amountFormatted: '€ 690,00',
    bookingRef: 'cs_live_a1b2c3',
    bokunConfirmation: 'BK-000123',
  },
} satisfies TemplateEntry
