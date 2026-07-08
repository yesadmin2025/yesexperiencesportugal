# Cancellation Copy Audit

## 1. All locations where cancellation is mentioned (user-facing)

| # | File | Line | Surface | Current wording |
|---|------|------|---------|-----------------|
| A | `src/routes/terms.tsx` | 56–61 | Legal — Terms | "Free cancellation up to **48 hours** before … Cancellations made within 48 hours are non-refundable." |
| B | `src/routes/about.tsx` | 325–328 | About → "Policies, briefly" | "**Free cancellation** up to **24h** before the experience, full refund." |
| C | `src/content/seo-faq.ts` | 36–37 | Signature FAQ (JSON-LD + rendered) | "Free cancellation up to **24 hours** … Inside 24 hours the booking is non-refundable." |
| D | `src/components/studio-v3/SignaturePriceCard.tsx` | 1254 | Studio v3 price card badge | "Free cancellation **48h**" |
| E | `src/components/studio-v3/SignaturePriceCard.tsx` | 1308 | Studio v3 CTA subline | "Secure checkout · Cancel free for **48h**" |
| F | `src/components/studio-v3/SignaturePriceCard.tsx` | 1364 | Studio v3 secondary CTA subline | "Secure checkout · Free cancellation **48h**" |
| G | `src/components/studio-v2/DraftMapPreview.tsx` | 418 | Studio v2 draft chip | "Instant confirmation · cancel **48h**" |
| H | `src/components/studio-v2/conversion/FinalBookingPanel.tsx` | 347 | Studio v2 final booking reassurance | "Free cancellation up to **48h** · Pay securely …" |
| I | `src/components/home/StudioLivePreview.tsx` | 376 | Home Studio preview chip | "Instantly booked · cancel **48h**" |

FAQ data (`src/content/faq-data.ts`) and i18n dictionaries contain **no** cancellation copy — only the SEO FAQ file does.

## 2. Inconsistencies found

1. **Two different windows quoted as policy:** Terms and all Studio surfaces say **48h**; About and the Signature FAQ (rendered + JSON-LD) say **24h**. This is the material issue — the SEO FAQ is machine-readable by Google, so the 24h number is being published as a structured claim while Terms legally commits to 48h.
2. **"Free cancellation" stated as universal** on About, FAQ and Studio surfaces — but Studio/Tailored/custom-built days may realistically carry different supplier terms (Bokun operators, restaurant deposits, private charters). Copy currently makes no distinction between Signature and Studio.
3. **Micro-chips on Studio v2/v3/home** ("cancel 48h", "Cancel free for 48h") assert a firm number in the pre-checkout surface where terms are actually variable — the exact risk the user flagged.
4. **No pointer to "shown before checkout"** anywhere except (implicitly) the checkout page itself. There is no general disclaimer the legal team can rely on.

## 3. Recommended final wording per section

Two approved patterns (from the brief):
- **General (G):** *"Cancellation terms are shown before checkout and may vary by experience type."*
- **Product-specific (P):** *"Signature days usually include free cancellation up to 24h before the experience. Studio and custom-built experiences show final cancellation terms before checkout."*

| # | Surface | Recommended wording | Pattern |
|---|---------|---------------------|---------|
| A | Terms — Cancellations section | Rewrite to: *"Cancellation terms are shown before checkout and may vary by experience type. Signature days usually include free cancellation up to 24 hours before the experience start time; cancellations made inside that window are non-refundable. Studio and custom-built experiences display their specific cancellation terms at checkout, as these depend on the partners and reservations involved. We will always do our best to reschedule when possible."* | P + G, expanded legal form |
| B | About "Policies, briefly" — cancellation bullet | *"**Cancellation** — Signature days usually include free cancellation up to 24h before the experience. Studio and custom-built days show final cancellation terms before checkout."* | P |
| C | SEO FAQ — Signature ("What's your cancellation policy?") | *"Signature day tours usually include free cancellation up to 24 hours before the experience start time for a full refund. Cancellations made within 24 hours are non-refundable. Studio and custom-built experiences show their specific cancellation terms before checkout."* | P (keeps Signature-specific answer, adds Studio caveat) |
| D | Studio v3 price card badge | *"Cancellation terms at checkout"* (drop "48h") | G, compact |
| E | Studio v3 primary CTA subline | *"Secure checkout · Cancellation terms shown before you pay"* | G |
| F | Studio v3 secondary CTA subline | *"Secure checkout · Cancellation terms shown before you pay"* | G |
| G | Studio v2 draft chip | *"Instant confirmation · terms at checkout"* | G, compact |
| H | Studio v2 FinalBookingPanel reassurance | *"Cancellation terms shown before checkout · Pay securely · Book now or shape it with a local — your choice."* | G |
| I | Home StudioLivePreview chip | *"Instantly booked · terms at checkout"* | G, compact |

Also add a **new Signature FAQ entry** (optional, low risk) mirroring wording C so the Signature-specific promise stays discoverable.

## 4. Files / components to edit

1. `src/routes/terms.tsx` — replace the Cancellations paragraph (lines 56–61).
2. `src/routes/about.tsx` — replace the cancellation bullet (lines 325–328).
3. `src/content/seo-faq.ts` — update `SIGNATURE_FAQ` entry (lines 35–38); no change to STUDIO_FAQ / TRAVEL_DESIGNER_FAQ (they don't mention cancellation and shouldn't start).
4. `src/components/studio-v3/SignaturePriceCard.tsx` — three copy strings at lines 1254, 1308, 1364.
5. `src/components/studio-v2/DraftMapPreview.tsx` — chip at line 418.
6. `src/components/studio-v2/conversion/FinalBookingPanel.tsx` — reassurance line at 347.
7. `src/components/home/StudioLivePreview.tsx` — chip at line 376.

No design, layout, component structure or unrelated copy changes. All edits are string-only inside existing nodes, so no styling regressions and no impact on Studio flow, motion, or CTAs.

## 5. Risk level

- **Legal/compliance risk of current state:** **Medium-high.** Terms commit to 48h, but About + JSON-LD SEO FAQ publicly promise 24h — a customer could screenshot either surface and hold us to the shorter/longer window. Studio pre-checkout chips also assert a firm cancellation window before the actual supplier terms are known.
- **Risk of proposed change:** **Low.** Purely copy-level, all strings live in leaf text nodes, no schema/behavior changes. SEO impact minimal — Signature FAQ keeps the same question and 24h answer, only adds the Studio caveat. JSON-LD stays valid.
- **Recommended follow-up (out of scope for this plan):** confirm with the operator (a) the true Signature window (24h vs 48h — Terms and About currently disagree, needs one canonical number before I write the strings above), and (b) that the checkout page actually renders per-experience cancellation terms before payment. If either is not true, the "shown before checkout" phrasing must be adjusted.

**Blocking question before I implement:** should Signature's canonical free-cancellation window be **24h** or **48h**? Everything above assumes 24h (matches About + current SEO FAQ + the wording you suggested); if it's 48h, I'll swap the number in surfaces A, B and C only.
