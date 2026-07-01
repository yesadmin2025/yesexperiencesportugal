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

export interface StripeWebhookAlertProps {
  reason?: string | null
  endpoint?: string | null
  validStatus?: number | null
  invalidStatus?: number | null
  secretPresent?: boolean | null
  secretPrefixOk?: boolean | null
  checkedAt?: string | null
}

const container = { maxWidth: 560, margin: '0 auto', padding: '24px', fontFamily: 'Inter, Arial, sans-serif' } as const
const h1 = { color: '#B42318', fontSize: 20, margin: '0 0 12px' } as const
const label = { color: '#666', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const value = { color: '#111', fontSize: 14, margin: '2px 0 12px' }

const Alert: React.FC<StripeWebhookAlertProps> = (p) => (
  <Html>
    <Head />
    <Preview>Stripe webhook health check failed</Preview>
    <Body style={{ backgroundColor: '#FAF8F3', margin: 0 }}>
      <Container style={container}>
        <Heading style={h1}>⚠ Stripe webhook health check failed</Heading>
        <Text style={{ color: '#333', fontSize: 14 }}>
          The periodic Stripe webhook verification just failed. Real payment events may not be
          processed until this is resolved.
        </Text>

        <Section style={{ marginTop: 16 }}>
          <Text style={label}>Reason</Text>
          <Text style={value}>{p.reason ?? 'unknown'}</Text>

          <Text style={label}>Endpoint</Text>
          <Text style={value}>{p.endpoint ?? '—'}</Text>

          <Text style={label}>Valid signature response</Text>
          <Text style={value}>HTTP {p.validStatus ?? '—'}</Text>

          <Text style={label}>Forged signature response</Text>
          <Text style={value}>HTTP {p.invalidStatus ?? '—'}</Text>

          <Text style={label}>Secret configured</Text>
          <Text style={value}>
            present: {String(p.secretPresent ?? false)} · prefix ok: {String(p.secretPrefixOk ?? false)}
          </Text>

          <Text style={label}>Checked at</Text>
          <Text style={value}>{p.checkedAt ?? new Date().toISOString()}</Text>
        </Section>

        <Text style={{ color: '#666', fontSize: 12, marginTop: 16 }}>
          Open /admin/payments-env and re-run the webhook self-test. If it still fails, rotate
          STRIPE_WEBHOOK_SECRET_LIVE using the signing secret from the current live Stripe
          webhook endpoint.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: Alert,
  subject: '⚠ Stripe webhook health check failed',
  displayName: 'Stripe webhook alert',
  to: 'info@yesexperiencesportugal.com',
}
