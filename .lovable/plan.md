# Studio v2 Builder Flow Upgrades

Scope: `/studio-v2` only. Frontend-first, with one Supabase table + one server function for the resumable email draft.

## 1. Progress bar — start at 20%

- In the Studio v2 stepper (StudioV2 + `StudioConversionHud`), clamp the progress so step 1 reads as 20% minimum.
- Implementation: change the percent calc from `step / total` to `0.2 + 0.8 * ((step - 1) / (total - 1))` (still 100% at the end).
- Keep ARIA `aria-valuenow` aligned with the displayed %.

## 2. Persistent builder chrome (every step)

Add a single `StudioBuilderChrome` component rendered by `StudioV2` around the active scene:

- **Host card** (`HostCard`): small round avatar + "Your host in Sesimbra — Tiago" + WhatsApp link.
  - Desktop ≥ md: pinned right rail (sticky, top of content area).
  - Mobile: collapsible strip pinned just under the top bar.
- **WhatsApp CTA** (always visible): `https://wa.me/351911889992?text=...` — uses brand gold pill button, accessible label.
- **Price strip** (`LivePriceStrip`): sticky bottom bar showing "from €<X> / guest" derived live from current draft (mood, region, duration, group size, add-ons). Updates on every state change. Reduced-motion safe.

Tokens only — `--gold`, `--charcoal`, `--ivory`. Mobile-first (393px verified).

## 3. Autosave to localStorage

- New hook `useStudioDraft()` wrapping the existing studio state (`useStudioState`).
- Debounced (250ms) write of the full draft to `localStorage` under key `yes:studio-v2:draft:v1`.
- On mount, hydrate from localStorage if present and no server-loaded draft.
- Clear key after successful booking/handoff.

## 4. "Email me my draft" (step 3+)

- New Supabase table `studio_drafts` (id uuid PK, email text, draft jsonb, resume_token text unique, created_at, expires_at default now()+30 days).
- RLS: insert/select via service role only; resume endpoint is a server function that reads by token.
- Server function `emailStudioDraft` (TanStack `createServerFn`): validates email + draft, inserts row, generates token, sends transactional email containing `https://yesexperiencesportugal.com/studio?resume=<token>`.
- Email setup: scaffold app emails infra + `studio-draft-resume` template.
- Studio v2 reads `?resume=` on mount; if present, calls `loadStudioDraft({token})` server fn to hydrate state.
- Button visible from step index ≥ 2 (third step), inline in chrome.

## 5. Real-catalogue Studio output

Create `src/lib/studio-v2/catalogueMapping.ts` mapping `(mood, region, duration)` → a canonical Signature tour blueprint pulled from `src/data/signatureTours.ts`, with these mappings:

| Mood | Region | Base tour | Add-ons |
|---|---|---|---|
| Wine & food | Arrábida / Setúbal | Arrábida Private Wine Tour (3 wineries + market + Sesimbra view + traditional lunch) | tile-painting workshop, extra tasting |
| Coastal & beaches | Arrábida | Arrábida & Sesimbra Boat Tour | — |
| Coastal & beaches | Comporta / Tróia | Tróia & Comporta Tour | dolphin-watching |
| Active | Arrábida | Arrábida coastal active tour | — |
| Hands-on culture | (any) | Azeitão cheese & tiles workshop + wine tasting + Sesimbra | — |

- Half-day: condense to 4–5h, ~60% of full-day price, drop last 1–2 chapters, keep core anchor.
- Output renders chapter-by-chapter with real stop names (Azeitão, Sesimbra, Portinho da Arrábida) and realistic timing windows (e.g. 09:30–11:00 Azeitão market).
- Refine stage stays: user can swap/remove chapters, toggle add-ons; price strip recomputes.

## 6. Files

**New**
- `src/components/studio-v2/chrome/StudioBuilderChrome.tsx`
- `src/components/studio-v2/chrome/HostCard.tsx`
- `src/components/studio-v2/chrome/LivePriceStrip.tsx`
- `src/components/studio-v2/chrome/WhatsappCta.tsx`
- `src/components/studio-v2/chrome/EmailDraftButton.tsx`
- `src/hooks/useStudioDraft.ts`
- `src/lib/studio-v2/catalogueMapping.ts`
- `src/lib/studio-v2/pricing.ts`
- `src/lib/studio-v2/draft.functions.ts` (emailStudioDraft, loadStudioDraft)
- `src/lib/email-templates/studio-draft-resume.tsx`

**Edited**
- `src/components/studio-v2/StudioV2.tsx` — mount chrome, wire draft hook, resume param
- `src/components/builder/v3/StudioConversionHud.tsx` — 20% floor on progress
- `src/components/studio-v2/LivingItinerary.tsx` — consume catalogueMapping
- `src/lib/email-templates/registry.ts` — register new template
- Asset: small host avatar JPG in `src/assets/studio/host-tiago.jpg`

**Migration**
- `studio_drafts` table + RLS + grants (service_role only).

## 7. Out of scope

- Real payments/booking truth — site stays in test mode.
- Marketing emails — only the single transactional resume email.
- Desktop-first redesign — mobile remains source of truth (393px), desktop adapted.

Confirm and I'll ship it.
