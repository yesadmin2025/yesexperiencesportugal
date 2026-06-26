import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'Unsubscribe · YES Experiences Portugal' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: UnsubscribePage,
})

type State =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'already' }
  | { kind: 'confirm' }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

function UnsubscribePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const t = url.searchParams.get('token')
    setToken(t)
    if (!t) {
      setState({ kind: 'invalid' })
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) {
          setState({ kind: 'invalid' })
          return
        }
        if (json.valid === false && json.reason === 'already_unsubscribed') {
          setState({ kind: 'already' })
        } else if (json.valid) {
          setState({ kind: 'confirm' })
        } else {
          setState({ kind: 'invalid' })
        }
      })
      .catch(() => setState({ kind: 'invalid' }))
  }, [])

  const onConfirm = async () => {
    if (!token) return
    setState({ kind: 'submitting' })
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await r.json().catch(() => ({}))
      if (json.success) setState({ kind: 'done' })
      else if (json.reason === 'already_unsubscribed') setState({ kind: 'already' })
      else setState({ kind: 'error', message: json.error ?? 'Something went wrong.' })
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Network error.',
      })
    }
  }

  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16"
      style={{ background: 'var(--ivory)', color: 'var(--charcoal)' }}
    >
      <p
        className="text-[10.5px] uppercase tracking-[0.32em]"
        style={{ color: 'color-mix(in oklab, var(--gold) 82%, var(--charcoal))', fontWeight: 700 }}
      >
        YES Experiences · Email preferences
      </p>

      {state.kind === 'loading' && (
        <Heading>Checking your link…</Heading>
      )}

      {state.kind === 'invalid' && (
        <>
          <Heading>This link is no longer valid.</Heading>
          <Body>
            The unsubscribe link may have expired or been used already. If you
            keep receiving emails you don't want, just reply to any of them and
            we'll remove you by hand.
          </Body>
        </>
      )}

      {state.kind === 'already' && (
        <>
          <Heading>You're already unsubscribed.</Heading>
          <Body>
            We won't send you any more emails from YES Experiences. Thanks for
            letting us know.
          </Body>
        </>
      )}

      {state.kind === 'confirm' && (
        <>
          <Heading>Unsubscribe from YES Experiences emails?</Heading>
          <Body>
            Confirm below and we'll stop sending you booking, journey and
            follow-up emails. You can always book again from our site.
          </Body>
          <button
            type="button"
            onClick={onConfirm}
            className="mt-6 inline-flex items-center justify-center rounded-[2px] px-6 py-4"
            style={{
              background: 'color-mix(in oklab, var(--gold) 92%, var(--charcoal))',
              color: 'var(--charcoal)',
              minHeight: 56,
              fontFamily: 'var(--font-sans, Inter), sans-serif',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Confirm unsubscribe
          </button>
        </>
      )}

      {state.kind === 'submitting' && <Heading>Processing…</Heading>}

      {state.kind === 'done' && (
        <>
          <Heading>You're unsubscribed.</Heading>
          <Body>
            We've removed you from our list. We're sorry to see you go — your
            inbox is sacred and we respect that.
          </Body>
        </>
      )}

      {state.kind === 'error' && (
        <>
          <Heading>Something went wrong.</Heading>
          <Body>{state.message}</Body>
        </>
      )}
    </main>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="mt-3 text-[28px] leading-[1.1] sm:text-[34px]"
      style={{ fontFamily: 'var(--font-display, Montserrat), sans-serif', fontWeight: 700 }}
    >
      {children}
    </h1>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-4 text-[15px] leading-[1.55]"
      style={{ color: 'color-mix(in oklab, var(--charcoal) 75%, transparent)' }}
    >
      {children}
    </p>
  )
}
