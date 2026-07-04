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

export interface WelcomeProps {
  contactName?: string
}

const TEAL = '#295B61'
const GOLD = '#C9A96A'
const CHARCOAL = '#2E2E2E'
const SAND = '#F4EEE2'

const Welcome = ({ contactName }: WelcomeProps) => {
  const first = contactName ? contactName.split(' ')[0] : null
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to YES Experiences — Portugal, felt from the inside.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>YES Experiences · Welcome</Text>

          <Heading style={h1}>
            {first ? `${first}, welcome.` : 'Welcome.'}
          </Heading>

          <Text style={lede}>
            You've just opened the door to a different Portugal — the one locals
            keep for themselves. Quiet viewpoints, private tables, family
            adegas, sunsets that feel arranged for you.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>What happens next</Text>
            <Text style={cardValue}>
              A local designer from our team is finalising your day. You'll hear
              from us shortly with confirmed timings and the secure payment
              link. Nothing is charged until you approve it.
            </Text>
          </Section>

          <Text style={sectionTitle}>The YES promise</Text>
          <Section>
            <Section style={row}>
              <Text style={rowIndex}>01</Text>
              <Text style={rowLabel}>Real people, real places</Text>
              <Text style={rowMeta}>
                Every stop, driver and host is chosen by us — never a random supplier.
              </Text>
            </Section>
            <Section style={row}>
              <Text style={rowIndex}>02</Text>
              <Text style={rowLabel}>Designed around you</Text>
              <Text style={rowMeta}>
                We adjust pace, food and moments to your rhythm — not the other way around.
              </Text>
            </Section>
            <Section style={row}>
              <Text style={rowIndex}>03</Text>
              <Text style={rowLabel}>Discreet, never generic</Text>
              <Text style={rowMeta}>
                Small groups, private access, and time to breathe between moments.
              </Text>
            </Section>
          </Section>

          <Hr style={{ ...hr, margin: '32px 0 20px' }} />
          <Text style={footer}>
            If anything feels unclear, just reply to this email — a real person
            reads every message.
          </Text>
          <Text style={signoff}>— YES Experiences Portugal</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Welcome,
  subject: (data: Record<string, unknown>) => {
    const name = typeof data.contactName === 'string' ? data.contactName.split(' ')[0] : null
    return name ? `${name}, welcome to YES Experiences` : 'Welcome to YES Experiences'
  },
  displayName: 'Welcome to YES',
  previewData: { contactName: 'Sofia Martins' } satisfies WelcomeProps,
} satisfies TemplateEntry

export default Welcome

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
  fontSize: '28px',
  lineHeight: 1.18,
  color: CHARCOAL,
  fontWeight: 700 as const,
  margin: '0 0 16px',
} as const
const lede = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '15px',
  lineHeight: 1.65,
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
  margin: '0 0 6px',
} as const
const cardValue = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '14.5px',
  lineHeight: 1.6,
  color: CHARCOAL,
  margin: 0,
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
const row = {
  padding: '12px 0',
  borderBottom: `1px solid ${GOLD}33`,
} as const
const rowIndex = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '10.5px',
  letterSpacing: '0.22em',
  color: GOLD,
  fontWeight: 700 as const,
  margin: '0 0 2px',
} as const
const rowLabel = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '16px',
  color: CHARCOAL,
  fontWeight: 600 as const,
  margin: '0 0 2px',
} as const
const rowMeta = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
  lineHeight: 1.55,
  color: `${CHARCOAL}cc`,
  margin: '2px 0 0',
} as const
const hr = {
  border: 'none',
  borderTop: `1px solid ${GOLD}40`,
  margin: '12px 0',
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
