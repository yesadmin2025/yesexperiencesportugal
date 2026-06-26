import * as React from 'react'
import {
  Body,
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

export interface BookingConfirmationProps {
  contactName?: string
  preferredDate?: string | null
  guests?: number
  region?: string | null
  archetype?: string | null
  totalMinutes?: number
  totalDriveMinutes?: number
  totalKm?: number
  stops?: Array<{ label: string; tag?: string | null; duration_minutes?: number }>
  notes?: string | null
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

function formatHours(min?: number): string {
  if (!min) return '—'
  const h = Math.round((min / 60) * 10) / 10
  return `${h} h`
}

const BookingConfirmation = ({
  contactName,
  preferredDate,
  guests,
  region,
  totalMinutes,
  totalDriveMinutes,
  totalKm,
  stops = [],
  notes,
}: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your bespoke day in Portugal is in our hands — {stops.length} stops, {formatHours(totalMinutes)} crafted for you.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>YES Experiences · Bespoke day · Received</Text>

        <Heading style={h1}>
          {contactName ? `${contactName}, ` : ''}your day is in our hands.
        </Heading>

        <Text style={lede}>
          A local designer will confirm timings and finalise availability within
          a few hours. We'll reply to the email you used to book.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Date</Text>
          <Text style={cardValue}>{formatDate(preferredDate)}</Text>
          <Hr style={hr} />
          <Text style={cardLabel}>Guests</Text>
          <Text style={cardValue}>{`${guests ?? 2} ${(guests ?? 2) === 1 ? 'guest' : 'guests'}`}</Text>
          {region ? (
            <>
              <Hr style={hr} />
              <Text style={cardLabel}>Region</Text>
              <Text style={cardValue}>{region}</Text>
            </>
          ) : null}
          <Hr style={hr} />
          <Text style={cardLabel}>Shape of the day</Text>
          <Text style={cardValue}>
            {`${stops.length} real stops · ${formatHours(totalMinutes)} experience${totalDriveMinutes ? ` · ${totalDriveMinutes} min driving` : ''}${totalKm ? ` · ${totalKm} km` : ''}`}
          </Text>
        </Section>

        {stops.length > 0 ? (
          <>
            <Text style={sectionTitle}>Your itinerary</Text>
            <Section>
              {stops.map((s, i) => (
                <Section key={i} style={stopRow}>
                  <Text style={stopIndex}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={stopLabel}>{s.label}</Text>
                  {s.tag ? <Text style={stopTag}>{s.tag}</Text> : null}
                  {s.duration_minutes ? (
                    <Text style={stopMeta}>{`${s.duration_minutes} min`}</Text>
                  ) : null}
                </Section>
              ))}
            </Section>
          </>
        ) : null}

        {notes ? (
          <>
            <Text style={sectionTitle}>Your notes</Text>
            <Section style={notesBox}>
              <Text style={notesText}>{notes}</Text>
            </Section>
          </>
        ) : null}

        <Hr style={{ ...hr, margin: '32px 0 20px' }} />
        <Text style={footer}>
          You'll receive a follow-up with confirmed timings and the secure payment
          link before any charge. If anything looks off, just reply to this email.
        </Text>
        <Text style={signoff}>— YES Experiences Portugal</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmation,
  subject: (data: Record<string, unknown>) => {
    const name = typeof data.contactName === 'string' ? data.contactName.split(' ')[0] : null
    return name
      ? `${name}, your bespoke day in Portugal is received`
      : 'Your bespoke day in Portugal is received'
  },
  displayName: 'Bespoke booking confirmation',
  previewData: {
    contactName: 'Sofia Martins',
    preferredDate: '2026-08-14',
    guests: 2,
    region: 'Lisbon · Sintra',
    totalMinutes: 480,
    totalDriveMinutes: 95,
    totalKm: 142,
    stops: [
      { label: 'Private pickup at your hotel', tag: 'Begin', duration_minutes: 15 },
      { label: 'Quinta da Regaleira gardens', tag: 'Wander', duration_minutes: 90 },
      { label: 'Lunch at a hidden adega', tag: 'Taste', duration_minutes: 75 },
      { label: 'Cabo da Roca cliffs', tag: 'Breathe', duration_minutes: 45 },
    ],
    notes: 'We celebrate our anniversary — a quiet view at sunset would mean everything.',
  } satisfies BookingConfirmationProps,
} satisfies TemplateEntry

export default BookingConfirmation

// Styles — keep Body background white per Lovable email rules.
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
  margin: '0 0 28px',
} as const
const card = {
  backgroundColor: SAND,
  padding: '20px 22px',
  borderRadius: '2px',
  margin: '0 0 28px',
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
const stopRow = {
  padding: '12px 0',
  borderBottom: `1px solid ${GOLD}33`,
} as const
const stopIndex = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '10.5px',
  letterSpacing: '0.22em',
  color: GOLD,
  fontWeight: 700 as const,
  margin: '0 0 2px',
} as const
const stopLabel = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '16px',
  color: CHARCOAL,
  fontWeight: 600 as const,
  margin: '0 0 2px',
} as const
const stopTag = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: TEAL,
  margin: '0 0 0',
} as const
const stopMeta = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '12px',
  color: `${CHARCOAL}99`,
  margin: '2px 0 0',
} as const
const notesBox = {
  borderLeft: `2px solid ${GOLD}`,
  padding: '4px 0 4px 14px',
  margin: '0 0 24px',
} as const
const notesText = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  color: CHARCOAL,
  margin: 0,
} as const
const footer = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
  lineHeight: 1.55,
  color: `${CHARCOAL}cc`,
  margin: '0 0 14px',
} as const
const signoff = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  color: TEAL,
  margin: 0,
} as const
