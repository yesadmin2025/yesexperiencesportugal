# Homepage refinement — remove bridges, tighten copy, fix fonts

## 1. Remove all "bridge whisper" transition phrases

The italic lead-ins between sections feel like template filler ("So — here is how a Portugal with us begins.", "And when none of them is quite it —", "Or begin with a day already loved by hundreds.", etc.). They read as narration the brand doesn't need.

**Action:** delete every `.bridge-whisper` instance on the homepage. The transition becomes the negative space between sections — gold rule + eyebrow do the work.

Locations to clean:
- `src/routes/index.tsx` — 5 bridge-whisper paragraphs (Hero→Trust, Studio intro, Signatures intro, Occasions intro, FAQ→Final CTA closer)
- `src/components/home/ThreePathsSection.tsx` — 1 bridge-whisper above eyebrow

Keep the `.bridge-whisper` utility class in `styles.css` for now (other routes may use it), just stop using it on the homepage.

## 2. Tighten the section copy itself

Right now the eyebrow + H2 + lede stack repeats the same idea three times in different words. Trim each to one clear thought.

**Four Doors section** (ThreePathsSection)
- H2: "Four ways in. One conversation." → keep
- Lede currently: "Whichever door you choose, the same hands shape what happens next — a curated day, a live build, a multi-day story, or an occasion staged with care."
- Rewrite to one short line: *"Same hands. Four ways to begin."* — and let the four cards speak.

**Signatures section**
- Eyebrow "Signature experiences" → "Signature"
- H2 "Signature days, ready when you are." → "Days already loved."
- Drop the supporting lede entirely (the cards explain themselves).

**Occasions section** — eyebrow + H2 only, no lede paragraph.

**Final CTA** — replace the stat closer ("…as 700+ travellers were this year") with a single quiet line.

## 3. Font audit — kill the template feel

The italic transitions look templated because they're set in Georgia (system serif). Georgia is fine inside a Montserrat headline as emphasis, but as a standalone italic paragraph on ivory it reads generic.

**Rules going forward (homepage):**
- Georgia italic appears **only inside H1/H2** as the teal emphasis span. Never as standalone body text.
- All standalone supporting text = Inter, upright, `--charcoal-soft`.
- Card CTAs ("Browse", "Open the Studio", etc.) — currently rendered in Georgia italic via `.he-pull`. Switch to Inter, 13px, uppercase tracking, semibold + arrow. Matches eyebrow voice and removes the second "serif italic" voice that was competing with the H2 italic.
- The "or make it yours →" link under each Signature card — switch from Georgia italic to Inter, lowercase, regular, with the gold arrow. Quieter, less precious.

## 4. Replace `.he-pull` italic with a single CTA voice

Today the homepage has three "click here" voices:
1. Big primary button (Inter, uppercase) — Hero, Signature
2. `.he-pull` Georgia italic + arrow — ThreePaths cards
3. Plain underline links

Collapse to two: primary button + a single quiet text link (Inter, 12.5px, uppercase tracking, gold arrow). Use the quiet link everywhere a card needs a soft CTA.

## 5. Verify after changes

- Scroll the homepage on mobile (393px) — sections should flow without italic interruptions
- Confirm no Georgia italic appears outside H1/H2 emphasis spans
- Confirm card CTAs all share the same Inter voice
- Update memory: homepage italic policy → "Georgia italic ONLY inside H1/H2. No standalone italic paragraphs. No `.bridge-whisper` on homepage."

## Technical notes

- Files touched: `src/routes/index.tsx`, `src/components/home/ThreePathsSection.tsx`, `mem://index.md`, `mem://design/homepage-emphasis.md`
- No structural changes, no new components, no new sections
- Reduced-motion behavior unchanged
- No test snapshots should break; if `homepage-structure.spec.ts` asserts on the removed bridge phrases I'll update the spec to match
