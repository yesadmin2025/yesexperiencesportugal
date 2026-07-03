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

export interface ContactReceivedProps {
  firstName?: string | null
  message?: string | null
}

const TEAL = '#295B61'
const GOLD = '#C9A96A'
const CHARCOAL = '#2E2E2E'
const IVORY = '#FAF8F3'

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' } as const
const container = { maxWidth: 560, margin: '0 auto', padding: '32px 28px' } as const
const eyebrow = {
  color: GOLD,
  fontSize: 11,
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  fontFamily: 'Arial, Helvetica, sans-serif',
  margin: '0 0 16px',
}
const h1 = { color: TEAL, fontSize: 26, lineHeight: 1.25, margin: '0 0 20px', fontWeight: 400 }
const body = { color: CHARCOAL, fontSize: 15, lineHeight: 1.65, margin: '0 0 14px' }
const quote = {
  color: CHARCOAL,
  fontSize: 14,
  lineHeight: 1.6,
  fontStyle: 'italic' as const,
  padding: '14px 18px',
  backgroundColor: IVORY,
  borderLeft: `3px solid ${GOLD}`,
  margin: '20px 0',
}
const hr = { borderColor: '#eee', margin: '28px 0' }
const signoff = { color: TEAL, fontSize: 14, margin: '20px 0 0', fontStyle: 'italic' as const }

const ContactReceived: React.FC<ContactReceivedProps> = ({ firstName, message }) => (
  <Html lang="en">
    <Head />
    <Preview>We've received your message — a local Travel Designer will reply shortly.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>YES Experiences · Portugal</Text>
        <Heading style={h1}>
          {firstName ? `Thank you, ${firstName}.` : 'Thank you.'}
        </Heading>
        <Text style={body}>
          Your message has reached our Travel Designers in Portugal. We read every note
          personally and will reply within one business day — often much sooner.
        </Text>
        {message ? (
          <>
            <Text style={{ ...body, color: '#7a7a7a', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '18px 0 6px' }}>
              What you told us
            </Text>
            <Text style={quote}>"{message}"</Text>
          </>
        ) : null}
        <Text style={body}>
          In the meantime, feel free to keep dreaming — proposals under Sintra sunsets,
          Alentejo vineyards, private wild beaches. When we reply, we'll shape it around you.
        </Text>
        <Hr style={hr} />
        <Text style={body}>
          Warmly,
        </Text>
        <Text style={signoff}>— The YES team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactReceived,
  subject: (data: Record<string, unknown>) => {
    const name = typeof data.firstName === 'string' ? data.firstName : null
    return name ? `${name}, we've received your message` : "We've received your message"
  },
  displayName: 'Contact form — client confirmation',
  previewData: {
    firstName: 'Sofia',
    message: 'Planning a surprise proposal in Sintra for late September, party of 2.',
  },
} satisfies TemplateEntry
