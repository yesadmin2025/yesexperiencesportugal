## Why it says "not embedded"

Trustindex only registers a domain when **their own loader script** runs on the page. Our footer currently shows a hand-built replica of the certificate (no third-party JS), so their dashboard will always report "The domain list empty".

## One thing I need from you

The widget ID is cut off in the screenshot — I can read `…r-cert.js?5b4acfc688a54881970649b49a5` but the first characters of the ID are hidden. Paste the full URL (or just the `?` value) from **Copy embed code** and I'll wire it in. Everything below is ready to go the moment I have it. 

<script defer async src='[https://cdn.trustindex.io/loader-cert.js?5b4acfc688a54881970649b49a5'></script>](https://cdn.trustindex.io/loader-cert.js?5b4acfc688a54881970649b49a5'></script>)

## What I'll build

### 1. `src/components/trust/TrustindexWidget.tsx` (new)

- Loads `https://cdn.trustindex.io/loader-cert.js?<ID>` **once**, `defer async`, only after the footer scrolls into view (IntersectionObserver) — so it never touches LCP or the mobile sticky CTA.
- Renders inside a reserved-height container so there is **zero layout shift** when the certificate paints.
- Respects cookie consent: script only loads once consent state allows third-party scripts (reuses the existing consent hook), and it never blocks the page if it fails.
- Trustindex's default is a *fixed floating* badge — I'll pin it into the footer container (their embed supports inline placement) and suppress the floating variant, so it can't collide with the sticky booking CTA.

### 2. Premium footer treatment

The vendor widget is green/black by default. To keep it feeling like YES and not a bolted-on ad:

- It sits on a small ivory plate inside a quiet gold hairline frame, same plate language already used for the Livro de Reclamações seal.
- Slightly reduced scale on mobile so both seals still share **one line** at 320 / 393 / 768 px (existing `flex-nowrap` row).
- Muted opacity at rest, full opacity on hover/focus — discreet, not shouty.

### 3. Static seal stays as fallback + elsewhere

- If the script is blocked (ad-blocker, consent declined, network), our existing `TrustindexBadge` renders instead, so the footer is never empty.
- The compact static seal keeps being used on any other surface where we want trust without third-party JS.

### 4. Security header

`public/_headers` CSP currently blocks `cdn.trustindex.io`. I'll add it to `script-src` (and `img-src`/`connect-src` if the widget needs it) — narrowly, nothing else opens up.

### 5. Data stays in sync

`src/config/trust-certificate.ts` remains the single source of truth for the JSON-LD `aggregateRating` (4.9 · 1000). Existing regression test keeps badge ↔ JSON-LD aligned.

### 6. Verification

- Playwright pass at 320 / 393 / 768 px: both seals on one line, no clipping, no CLS.
- Confirm in your Trustindex dashboard that `yesexperiencesportugal.com` appears under "Widget appearances" after publish.

## Technical notes

Widget ID goes in `src/config/trust-certificate.ts` as `widgetId`, so it's updatable in one place. Loading is lazy + consent-gated, so Core Web Vitals budgets in `e2e/core-web-vitals.spec.ts` stay green.