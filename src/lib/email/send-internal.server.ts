/**
 * Internal transactional email dispatch — server-only.
 *
 * For server-to-server triggers (server functions, webhooks) that do not have
 * an end-user JWT and therefore cannot call /lovable/email/transactional/send.
 *
 * Mirrors the same pipeline: suppression check, unsubscribe token, render,
 * enqueue into pgmq `transactional_emails`. The shared queue dispatcher
 * (process-email-queue) handles the actual send, retries, and rate limits.
 */
import * as React from 'react'
import { render } from 'react-email'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'yesexperiencesportugal'
const SENDER_DOMAIN = 'notify.yesexperiencesportugal.com'
const FROM_DOMAIN = 'notify.yesexperiencesportugal.com'

function redact(email: string): string {
  const [l, d] = email.split('@')
  if (!l || !d) return '***'
  return `${l[0]}***@${d}`
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SendInternalArgs {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, unknown>
  idempotencyKey?: string
}

export async function sendTransactionalInternal(
  args: SendInternalArgs,
): Promise<{ ok: boolean; reason?: string }> {
  const { templateName, recipientEmail, templateData = {}, idempotencyKey } = args
  const supabase = supabaseAdmin
  const messageId = crypto.randomUUID()
  const idemKey = idempotencyKey || messageId

  const template = TEMPLATES[templateName]
  if (!template) {
    console.error('[email/internal] template not found', { templateName })
    return { ok: false, reason: 'template_not_found' }
  }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) return { ok: false, reason: 'no_recipient' }
  const normalizedEmail = effectiveRecipient.toLowerCase()

  // Suppression check (fail-closed).
  const { data: suppressed, error: supErr } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (supErr) {
    console.error('[email/internal] suppression check failed', { error: supErr })
    return { ok: false, reason: 'suppression_check_failed' }
  }
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })
    return { ok: false, reason: 'email_suppressed' }
  }

  // Unsubscribe token (one per address).
  let unsubscribeToken: string | undefined
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else if (!existing) {
    const t = generateToken()
    await supabase
      .from('email_unsubscribe_tokens')
      .upsert({ token: t, email: normalizedEmail }, { onConflict: 'email', ignoreDuplicates: true })
    const { data: stored } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    unsubscribeToken = stored?.token
  } else {
    return { ok: false, reason: 'email_suppressed' }
  }

  // Render template.
  const element = React.createElement(template.component, templateData as Record<string, unknown>)
  const html = await render(element)
  const plainText = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData as Record<string, unknown>)
      : template.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const { error: enqErr } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idemKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (enqErr) {
    console.error('[email/internal] enqueue failed', { error: enqErr, recipient: redact(effectiveRecipient) })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return { ok: false, reason: 'enqueue_failed' }
  }

  return { ok: true }
}
