## Goal

Two additions to the Studio V3 post-composer flow, both on the Checkout Summary screen:

1. **Auto-send the Signature Story email** when the user proceeds from Guest Details (email captured) — triggered on email-field blur, so by the time they land on Checkout Summary the story is already on its way.
2. **One-page PDF download** of their Final Signature Day, rendered client-side from live state on the Checkout Summary screen.

Instant-confirmation language only. No "to be confirmed" strings anywhere new.

---

## 1. Signature Story email (auto-send on email blur)

**New template** `src/lib/email-templates/signature-story.tsx`
- React Email component in the existing brand style (teal / gold / ivory / charcoal, Fraunces-safe fallbacks, `Body` bg `#ffffff`).
- Structure: hero title "Your story in Portugal" → one-line proposal → chaptered narrative from `finalTimelineEntries` (chapter title + short body) → small "See what's included" section (inclusions listed) → footer with pickup city, guests, date. **No price** in the story email (price lives in Checkout Summary + booking confirmation only). No unsubscribe text — footer is auto-appended.
- Props typed as `SignatureStoryEmailProps` (title, dateLabel, guests, pickupLabel, chapters[], inclusions[]).
- Registered in `src/lib/email-templates/registry.ts` under `signature-story`.

**New server function** `src/lib/emails/sendSignatureStoryEmail.functions.ts`
- `createServerFn({ method: 'POST' })` + `requireSupabaseAuth`-free (public — guest may be unauthenticated during Studio flow).
- `inputValidator`: Zod schema for `{ email, snapshot: { title, dateLabel, guests, pickupLabel, chapters, inclusions } }`.
- Handler calls `sendTransactionalInternal({ templateName: 'signature-story', recipientEmail: email, idempotencyKey: 'signature-story-<hash>', templateData: snapshot })`. Hash = stable hash of email + tourId + dateExact so repeat blurs dedupe at the `email_send_log` layer.
- Returns `{ ok: true }` even on suppression (silent) — never surfaces provider errors to guest.

**Trigger in `GuestDetailsStep.tsx`**
- On email `<input>` `onBlur`: if `isEmail(email)` and email changed since last send, debounce 400 ms then call the server fn with a `snapshot` frozen from current `state` (title, date, guests, pickup, chapters derived from `finalTimelineEntries`, inclusions from tour).
- Guard: `sentEmailRef` avoids re-firing for the same address in the same session. No spinner, no toast (silent). Optional tiny "Story sent to your email" inline confirmation under the email field once resolved.
- Snapshot builder lives in `src/components/studio-v3/signatureStorySnapshot.ts` (pure, unit-testable). Consumes `StudioV3State` + resolved tour.

**Why blur, not on Checkout Summary submit:** the user specified email-blur (debounced) in an earlier round; keeps story arriving in inbox while they're still on the summary.

---

## 2. Checkout Summary one-page PDF

**Library:** `@react-pdf/renderer` (client-side, no server load, no attachment plumbing needed).

**New component** `src/components/studio-v3/signatureOnePagerPdf.tsx`
- `@react-pdf` `Document` with a single `Page` (A4). Brand palette hard-coded (teal `#295B61`, gold `#C9A96A`, charcoal `#2E2E2E`, ivory `#FAF8F3`).
- Layout (top→bottom, one page, no overflow):
  1. Small "YES Experiences" wordmark + thin gold rule.
  2. Title (journey title) + one-line proposal.
  3. Date · Guests · Pickup city · Language row.
  4. **Inclusions** list (bulleted, ≤ 8 items).
  5. **Your additions** list with per-item price (if any).
  6. Total price (large) + per-guest sub-line.
  7. Footer: "Instant confirmation the moment you reserve." + support email.
- **No story narrative** in the PDF — that lives in the email. This matches the earlier decision: "PDF summary only … story narrative is sent automatically once the client enters the email address."

**Integration in `CheckoutSummary.tsx`**
- New ghost `CtaButton` "Download one-pager (PDF)" placed between the summary card and the sticky CTA bar, above the guest-details recap.
- On click: dynamic `import('@react-pdf/renderer')` + import of `signatureOnePagerPdf` (keeps the ~200 KB PDF lib out of the initial Studio bundle), call `pdf(<SignatureOnePager …/>).toBlob()`, then trigger a download with filename `signature-day-<slug>-<YYYY-MM-DD>.pdf`.
- Loading state on the button while generating; error → toast "Couldn't generate PDF, please try again."

**Install:** `bun add @react-pdf/renderer`.

---

## Files

**New**
- `src/lib/email-templates/signature-story.tsx`
- `src/lib/emails/sendSignatureStoryEmail.functions.ts`
- `src/components/studio-v3/signatureStorySnapshot.ts` (+ unit test)
- `src/components/studio-v3/signatureOnePagerPdf.tsx`

**Edited**
- `src/lib/email-templates/registry.ts` — register `signature-story`.
- `src/components/studio-v3/GuestDetailsStep.tsx` — email-blur trigger + debounce + inline "sent" confirmation.
- `src/components/studio-v3/CheckoutSummary.tsx` — PDF download button + dynamic import handler.
- `package.json` — `@react-pdf/renderer`.

**Not touched:** `StudioV3.tsx` state machine, phase order, curation, price math, Stripe flow, existing booking-confirmation email.

---

## Out of scope
- Server-generated PDF or emailing the PDF as attachment (email carries the story; PDF is client download).
- Save-my-signature persistence (already covered in prior FinalRevealStory work; separate concern).
- Date-availability gating in Refine.

---

## Open questions
1. **Story email — send silently or show a tiny "Story sent to your email ✓" line under the email field?** Recommend the tiny confirmation (reduces "did it work?" anxiety, still calm).
2. **PDF wordmark — use existing brand SVG asset if one exists, or text-only wordmark for v1?** Recommend text-only (Fraunces-safe fallback in `@react-pdf` is Times; safer than embedding a font for one asset).