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

export interface LegacyDomainReadyProps {
  hosts?: Array<{
    host: string
    status?: number | null
    verdict?: string
    aRecords?: string[]
  }>
  detectedAt?: string
}

const container = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '24px',
  fontFamily: 'Inter, Arial, sans-serif',
} as const
const h1 = { color: '#295B61', fontSize: 20, margin: '0 0 12px' } as const
const label = {
  color: '#666',
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}
const value = { color: '#111', fontSize: 14, margin: '2px 0 12px' }

const Email: React.FC<LegacyDomainReadyProps> = ({ hosts = [], detectedAt }) => (
  <Html>
    <Head />
    <Preview>Legacy domains now serving 410 Gone</Preview>
    <Body style={{ backgroundColor: '#ffffff', margin: 0 }}>
      <Container style={container}>
        <Heading style={h1}>✓ Legacy domains a servir 410 Gone</Heading>
        <Text style={{ color: '#333', fontSize: 14 }}>
          A monitorização automática detetou que todos os domínios legacy estão agora a
          responder com <strong>HTTP 410 Gone</strong> sem cabeçalho Location — a
          configuração DNS propagou e o Google vai começar a desindexar os URLs antigos.
        </Text>

        <Section style={{ marginTop: 16 }}>
          <Text style={label}>Detetado a</Text>
          <Text style={value}>{detectedAt ?? new Date().toISOString()}</Text>

          {hosts.map((h) => (
            <div key={h.host} style={{ marginTop: 12 }}>
              <Text style={label}>{h.host}</Text>
              <Text style={value}>
                HTTP {h.status ?? '—'} · {h.verdict ?? ''}
                {h.aRecords && h.aRecords.length > 0
                  ? ` · A → ${h.aRecords.join(', ')}`
                  : ''}
              </Text>
            </div>
          ))}
        </Section>

        <Text style={{ color: '#666', fontSize: 12, marginTop: 16 }}>
          Próximos passos: acompanhar a desindexação em Search Console (Removals já
          submetidos) e confirmar que a pesquisa Google por "Yes Experiences" deixa de
          mostrar o Business Profile antigo nas próximas 2–6 semanas.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: '✓ Legacy domains now serving 410 Gone',
  displayName: 'Legacy domain ready',
  to: 'info@yesexperiencesportugal.com',
} satisfies TemplateEntry
