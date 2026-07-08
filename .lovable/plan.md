# Accidental-text audit — findings and fixes

Scope covered: Homepage, `/experiences`, `/studio-v3`, `/multi-day`
(Travel Designer), `/about`, `/corporate`, `/proposals` (Moments),
`/local-stories` + article template, `/contact`, footer, navbar,
mobile viewport (393×588), plus SEO-only surfaces (JSON-LD, `llms.txt`,
sitemap, head metadata).

Method: rendered-HTML scan of each route via curl at localhost,
plus source grep for common accidental patterns (`Lorem`, `Ipsum`,
`Placeholder`, `TODO`, `FIXME`, `WIP`, `Draft`, `Test`, `Sample`,
`Coming soon`, missing spaces after `.`/`,`, superlatives, competitor
comparisons, duplicated CTA fragments, `null`/`undefined` leaks,
stray CSS text nodes).

**Result:** the site is mostly clean — no `Lorem`, no `TODO`
strings in visible copy, no `day.Add`-style missing-space bugs, no
"Photos Fast Crisp"-style stray labels, no duplicated CTA
fragments beyond legitimate nav/footer repetition. Four real issues
found (three SEO-only, one user-visible), plus one code comment
worth cleaning.

---

## Findings

### 1. Superlative + competitor claim in JSON-LD FAQ (SEO-only) — VIOLATES BRAND RULE

**Where:** `src/content/faq-data.ts:11` and `:23`.
Rendered only in the homepage FAQPage JSON-LD block (`src/routes/index.tsx:263`) — **not** visible on screen; the on-page FAQ (`src/components/FAQ.tsx`) uses different, compliant copy.

**Current wording (line 11 answer):**
> "…the **first real-time private tour builder in Portugal**. … It is a service YES pioneered and, at time of writing, **no other Portuguese tour operator offers a comparable in-house real-time builder**."

**Current wording (line 23 answer):**
> "Studio designs a private day in real time … — **Portugal's first real-time private tour builder**."

**Why it's a problem:** the core memory constraint `constraints/yes-canonical-rules` and the memory entry rejecting "ONLY interactive builder in Portuguese tourism" both forbid competitor comparisons and superlative first-in-market claims. This copy is currently being served to Google as structured data.

**Visible?** No (JSON-LD only; SEO-visible).

**Exact recommended correction:**
- Line 11 answer → *"Yes — through the YES Experience Studio. You choose the mood, rhythm and route, see the live price update as you go, and reserve instantly. Designed in real time, with you — no form, no back-and-forth, no travel agent in the middle."*
- Line 23 answer → *"Signature is a private day, already designed by YES. Studio designs a private day in real time around your mood, group and rhythm. Travel Designer is a full Portugal journey, designed around you and delivered as a travel file."*

**Files to edit:** `src/content/faq-data.ts` (lines 10–12 and 22–24).

---

### 2. `public/llms.txt` links to two non-existent routes

**Where:** `public/llms.txt` lines 12 and 15.

**Current:**
```
- [Moments](/moments): Proposals, anniversaries and private celebrations.
- [FAQ](/faq): Common questions about booking, pricing and logistics.
```

Both URLs return **HTTP 404** (confirmed against localhost). The real routes are `/proposals` (Moments) and — for FAQ — there is no dedicated route; the FAQ lives as a section on the homepage.

**Visible?** No to human users, **yes** to LLM/AI crawlers (`llms.txt` is their primary map of the site). Serving broken links here means AI answers about "Moments" or "FAQ" will point to 404s.

**Exact recommended correction:**
```
- [Moments](/proposals): Proposals, anniversaries and private celebrations.
- [FAQ](/#faq): Common questions about booking, pricing and logistics.
```
(Adjust the FAQ fragment to whatever anchor id the homepage FAQ actually exposes; if there's no anchor, drop the FAQ bullet.)

**Files to edit:** `public/llms.txt` (lines 12, 15).

---

### 3. `public/llms.txt` links through a known 301 redirect

**Where:** `public/llms.txt:21`.

**Current:** `- [Best Day Trips from Lisbon](/local-stories/best-day-trips-from-lisbon)`

`/local-stories/best-day-trips-from-lisbon` is redirected in `beforeLoad` to `/day-trips-from-lisbon` (dedicated SEO route). Pointing external crawlers at the redirect wastes a hop and — for LLM crawlers that don't follow redirects — misses the canonical page.

**Visible?** No to users; SEO/LLM-visible.

**Exact recommended correction:**
`- [Best Day Trips from Lisbon](/day-trips-from-lisbon)`

**Files to edit:** `public/llms.txt` (line 21).

---

### 4. Visible dead UI element: "Need help? Ask YES (coming soon)"

**Where:** `src/components/studio-v3/StudioV3.tsx:2276–2310`.

A `<button>` rendered on most Studio v3 phases (all phases except early, `interests`, `considerations`, `map`, `storyboard`) is:
- **Visible** (dimmed to `opacity: 55%` but rendered on-screen).
- **Disabled** (`disabled` attr, `cursor-not-allowed`).
- Announces to screen readers as *"Need help? Ask YES (coming soon)"*.

The comment at line 2275 confirms it: `TODO: Later phase — connect Ask YES help link to official contact channel.` A "coming soon" placeholder feature is shipping in production on a conversion-critical flow.

**Visible?** **Yes** — dim, but present at the bottom of the Studio during most of the flow, and announced to assistive tech with the "coming soon" caveat.

**Exact recommended correction (pick one — I'll ask before editing):**

(a) **Enable it** — swap the disabled `<button>` for an `<a href={whatsappHref()} target="_blank" rel="noopener noreferrer">` that opens the same WhatsApp support flow used elsewhere on the site (memory: WhatsApp = allowed as optional support). Keep label "Need help? Ask YES." Drop `(coming soon)` and the `disabled` attribute. Remove the TODO comment.

(b) **Hide it** — remove the entire block (lines 2271–2310) until the feature is wired. Cleanest option per the Studio philosophy memory ("interface progressively disappears").

Recommendation: **(a)** — the whisper affordance is valuable at low-confidence phases, and WhatsApp support is already the site-wide help channel. If you'd rather stay strict to "no help affordance in Studio v3 yet", go with (b).

**Files to edit:** `src/components/studio-v3/StudioV3.tsx` (lines 2271–2310, plus the `whatsappHref` import if going with option a — already imported project-wide).

---

### 5. Minor: leftover `TODO` code comment (dev-visible only)

**Where:** `src/components/studio-v3/StudioV3.tsx:2275`.
Not rendered to the DOM, but relates to finding #4 above and disappears when #4 is fixed. No separate edit needed.

**Visible?** No (source-only).

---

## What was checked and is clean

- No `Lorem`/`Ipsum`/`Placeholder`/`Dummy`/`Sample text`/`Example text` anywhere in JSX text nodes.
- No `TODO`/`FIXME`/`XXX`/`HACK` inside rendered strings (only inside code comments, which don't ship to the DOM).
- No `null`/`undefined` leaking into text nodes on any audited route.
- No missing-space patterns of the form `word.Word`, `day.Add`, etc. — grep on rendered HTML across 8 routes returned zero hits.
- No stray dev/debug labels rendered — all debug overlays (`HeroCopyDiff`, `HeroColorDebugOverlay`, `CtaScrollDebugOverlay`, `HeroChapterDebugOverlay`, `MotionQaPanel`, `useStudioDebug`) are correctly gated behind `?hero-debug` / `?debug-cta` / `?scroll-debug` / `?debug` URL params and don't render for normal visitors.
- No duplicated CTA text beyond legitimate nav/footer repetition (navbar × mobile drawer × footer main × footer legal = expected 4× per link).
- No broken punctuation (double spaces, `,.`, `..`, dangling em-dashes) in rendered text across the 8 routes checked.
- Input `placeholder=` attributes on forms (checkout, admin, auth) are legitimate UX text, not accidental leftover copy.
- The seemingly-orphan text nodes `> day.<`, `> · reserve when ready<` etc. in the raw HTML dump are the trailing halves of headlines split by inline `<SectionTitle.Em>` emphasis spans — normal JSX composition, correctly recombined visually.

---

## Summary table

| # | Issue | File | Visible? | Fix effort |
|---|---|---|---|---|
| 1 | Superlative/competitor claim in FAQ JSON-LD (×2) | `src/content/faq-data.ts` L10–24 | SEO only | Copy swap |
| 2 | `llms.txt` links to 404 routes `/moments`, `/faq` | `public/llms.txt` L12, L15 | AI crawlers | Path swap |
| 3 | `llms.txt` links through a 301 redirect | `public/llms.txt` L21 | AI crawlers | Path swap |
| 4 | Dead "Ask YES (coming soon)" button in Studio | `src/components/studio-v3/StudioV3.tsx` L2271–2310 | **Yes** | Enable or hide |

**Not modifying anything yet — awaiting your go-ahead.** For finding #4, please confirm whether to (a) wire it to WhatsApp support or (b) hide the block entirely.
