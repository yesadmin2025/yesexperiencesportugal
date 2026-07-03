/**
 * Public contact form endpoint.
 *
 * Anonymous (no JWT) — safe because it:
 *   1. Validates input server-side with Zod
 *   2. Persists to public.contact_messages (RLS-protected insert policy)
 *   3. Sends one confirmation email to the guest
 *   4. Sends notification emails to every YES team recipient
 *
 * Emails go through the internal transactional pipeline (pgmq queue,
 * suppression check, retries) — same as the Stripe checkout receipt.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TEAM_NOTIFICATION_RECIPIENTS } from '@/lib/email/team-recipients'

const contactSchema = z.object({
  first: z.string().trim().min(1).max(80),
  last: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  message: z.string().trim().min(10).max(4000),
  source: z.string().trim().max(80).optional(),
  locale: z.string().trim().max(20).nullable().optional(),
  userAgent: z.string().trim().max(500).nullable().optional(),
})

export const Route = createFileRoute('/api/public/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown
        try {
          raw = await request.json()
        } catch {
          return Response.json({ ok: false, error: 'bad_json' }, { status: 400 })
        }

        const parsed = contactSchema.safeParse(raw)
        if (!parsed.success) {
          return Response.json(
            {
              ok: false,
              error: 'validation_failed',
              issues: parsed.error.issues.map((i) => i.message),
            },
            { status: 400 },
          )
        }
        const data = parsed.data

        // Load server-only Supabase admin client (route file is client-reachable).
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { sendTransactionalInternal } = await import('@/lib/email/send-internal.server')

        // Persist first — this is the source of truth even if emails fail.
        const submittedAt = new Date().toISOString()
        const { error: insertError, data: inserted } = await supabaseAdmin
          .from('contact_messages')
          .insert({
            first_name: data.first,
            last_name: data.last,
            email: data.email,
            message: data.message,
            source: data.source ?? 'contact-page',
            locale: data.locale ?? null,
            user_agent: data.userAgent ?? null,
          })
          .select('id')
          .maybeSingle()

        if (insertError) {
          console.error('[contact] insert failed', { error: insertError })
          return Response.json({ ok: false, error: 'persist_failed' }, { status: 500 })
        }

        const leadId = inserted?.id ?? crypto.randomUUID()

        // Fire-and-forget emails: never block or fail the user submission on delivery.
        const templateData = {
          firstName: data.first,
          lastName: data.last,
          email: data.email,
          message: data.message,
          source: data.source ?? 'contact-page',
          locale: data.locale ?? null,
          userAgent: data.userAgent ?? null,
          submittedAt,
        }

        try {
          // Client confirmation
          await sendTransactionalInternal({
            templateName: 'contact-received',
            recipientEmail: data.email,
            idempotencyKey: `contact-received-${leadId}`,
            templateData,
          })

          // Team notifications — one send per recipient so bounces are isolated.
          await Promise.all(
            TEAM_NOTIFICATION_RECIPIENTS.map((recipient) =>
              sendTransactionalInternal({
                templateName: 'internal-lead',
                recipientEmail: recipient,
                idempotencyKey: `internal-lead-${leadId}-${recipient}`,
                templateData,
              }),
            ),
          )
        } catch (e) {
          console.error('[contact] email dispatch failed (non-fatal)', {
            error: e instanceof Error ? e.message : e,
          })
        }

        return Response.json({ ok: true })
      },
    },
  },
})
