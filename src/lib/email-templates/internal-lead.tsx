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

export interface InternalLeadProps {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  message?: string | null
  source?: string | null
  locale?: string | null
  userAgent?: string | null
  submittedAt?: string | null
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' } as const
const container = { maxWidth: 620, margin: '0 auto', padding: '28px 24px' } as const
const h1 = { color: '#295B61', fontSize: 20, margin: '0 0 6px' }
const sub = { color: '#666', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 20px' }
const row = { margin: '0 0 14px' }
const label = { color: '#888', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' as const, margin: '0 0 3px' }
const value = { color: '#111', fontSize: 14, margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' as const }

const InternalLead: React.FC<InternalLeadProps> = (p) => (
  <Html lang="en">
    <Head />
    <Preview>New contact form submission — {p.firstName ?? ''} {p.lastName ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New contact submission</Heading>
        <Text style={sub}>YES Experiences · lead notification</Text>

        <Section style={row}>
          <Text style={label}>Name</Text>
          <Text style={value}>{[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}</Text>
        </Section>
        <Section style={row}>
          <Text style={label}>Email</Text>
          <Text style={value}>{p.email ?? '—'}</Text>
        </Section>
        <Section style={row}>
          <Text style={label}>Message</Text>
          <Text style={value}>{p.message ?? '—'}</Text>
        </Section>
        <Section style={row}>
          <Text style={label}>Source</Text>
          <Text style={value}>{p.source ?? '—'}</Text>
        </Section>
        <Section style={row}>
          <Text style={label}>Locale</Text>
          <Text style={value}>{p.locale ?? '—'}</Text>
        </Section>
        <Section style={row}>
          <Text style={label}>Submitted</Text>
          <Text style={value}>{p.submittedAt ?? new Date().toISOString()}</Text>
        </Section>
        {p.userAgent ? (
          <Section style={row}>
            <Text style={label}>User agent</Text>
            <Text style={{ ...value, color: '#666', fontSize: 12 }}>{p.userAgent}</Text>
          </Section>
        ) : null}

        <Text style={{ ...value, color: '#666', fontSize: 12, marginTop: 20 }}>
          Reply directly to the guest's email above. This lead is also stored in the
          contact_messages table.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InternalLead,
  subject: (data: Record<string, unknown>) => {
    const first = typeof data.firstName === 'string' ? data.firstName : ''
    const last = typeof data.lastName === 'string' ? data.lastName : ''
    const who = [first, last].filter(Boolean).join(' ') || 'guest'
    return `New contact — ${who}`
  },
  displayName: 'Internal — new contact lead',
  previewData: {
    firstName: 'Sofia',
    lastName: 'Martins',
    email: 'sofia@example.com',
    message: 'We are 4 friends looking for a private wine day in Alentejo in October.',
    source: 'contact-page',
    locale: 'en-GB',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry
