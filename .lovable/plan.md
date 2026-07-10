# Contact form upgrade + response-time standardization

## 1. `/contact` form (src/routes/contact.tsx) — max 5 fields
Replace the current 4-field layout with a 5-field form, keeping the current minimalist `Field` styling (underline inputs, uppercase eyebrow labels, teal focus):

1. First name + Last name (existing, grouped on one row — counts as one visual row but two schema fields; keep as-is)
2. Email (existing)
3. **New:** "What can we help you plan?" — required `<select>` styled like `Field` (border-bottom, transparent bg). Options:
   - A private day
   - The Studio
   - A multi-day journey
   - A proposal or celebration
   - A corporate/group day
   - Something else
4. **New:** "When are you travelling?" — optional native `<input type="date">` (min = today), styled to match.
5. "What are you dreaming of?" (existing textarea)

Total = 5 fields max as counted by the user (name pair, email, request type, date, message). Add a new `SelectField` and `DateField` (or extend `Field`) inside the file — no new components elsewhere.

Extend `contactSchema` with `requestType` (enum, required) and `travelDate` (optional ISO date string, `.optional()`), and include both in the POST body to `/api/public/contact` (fields are additive; backend ignores unknown keys safely — no server edits in this plan).

## 2. Response-time copy — single site-wide message
Standardize to: **"A local usually replies within a few hours."**

- `src/routes/contact.tsx` line 115–116: replace "We'll respond within one business day." → new copy.
- `src/routes/index.tsx` line 975: replace "A local usually replies within the hour." → new copy (aligns homepage + contact per user request).

Leave unchanged (different context, not the promise the user flagged):
- `checkout.$token.tsx`, `booking-confirmation.tsx`, `EmbeddedConfirmationSheet.tsx` — post-booking confirmation timing, already say "within a few hours".
- `contact-received.tsx` email template still says "within one business day" — update to "within a few hours" for consistency with the site promise.
- `privacy.tsx` "30 days" is a legal GDPR clause, untouched.

## 3. Analytics
On successful submit, replace the current `gaGenerateLead({ leadSource: "contact_form", method: "email" })` call with a direct dataLayer push carrying the selected request type:

```ts
window.dataLayer?.push({
  event: "generate_lead",
  lead_source: "contact_form",
  request_type: parsed.data.requestType, // e.g. "private_day"
  method: "email",
});
```

Implement by extending `gaGenerateLead` in `src/lib/analytics-ga4.ts` to accept an optional `requestType` and forward it as `request_type` — keeps one code path, non-breaking for existing callers (WhatsApp / tailor).

Request-type values sent to GA use snake_case slugs (`private_day`, `studio`, `multi_day`, `proposal`, `corporate`, `other`) with the human labels shown in the UI.

## 4. Guardrails
- No palette changes: reuse `--teal`, `--charcoal`, `--sand`, `--gold` tokens already on the page.
- No new components, no layout shift beyond the two added fields inserted between Email and Message.
- Native `<select>` and `<input type="date">` styled with the existing `Field` border-bottom pattern for consistency with the minimalist form.
- Mobile-first: inputs stay full-width, 16px base to avoid iOS zoom.

## Files touched
- `src/routes/contact.tsx` — schema + 2 new fields + copy + analytics payload
- `src/routes/index.tsx` — one line copy change
- `src/lib/analytics-ga4.ts` — add optional `requestType` param
- `src/lib/email-templates/contact-received.tsx` — align email to "within a few hours"
