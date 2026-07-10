# Legacy domain migration — Hybrid 301s, GBP kept severed

Decision (per your answers):

- Enforce redirects **in Lovable** (`src/start.ts`), not on WordPress. WP host is decommissioned; DNS for `yesexperiences.pt` + `www.yesexperiences.pt` moves to Lovable.
- Do **per-path 301** so link equity transfers.
- **Do NOT** file Google Search Console Change of Address, and do NOT reference the old GBP anywhere — that is what keeps the deprecated Google Business Profile severed while still collecting link equity.

This replaces the current 410 Gone middleware.

---

## Why this can work (and where the risk is)

- **Change of Address** in GSC is the strongest "these are the same entity" signal for local/GBP. Skipping it plus never linking or citing the old GBP means Google is far less likely to auto-migrate GBP signals along with the 301s.
- Web-search PageRank still transfers via 301 without CoA — CoA is a search-console-side property migration, not the redirect itself.
- Residual risk: Google may still merge some entity signals because both sites share brand name + NAP-adjacent copy. Mitigation below (step 4).

---

## Implementation (in Lovable, one edit)

### 1. Replace `src/lib/legacy-domain-redirect.ts`

- Keep the module name and `LEGACY_HOSTS`.
- Export a new `LEGACY_REDIRECT_MAP: Record<string, string>` (exact old path → new path).
- Export `buildLegacy301Response(request: Request): Response | null` that:
  - Case-insensitive host match against `LEGACY_HOSTS`, otherwise return null.
  - Normalize incoming path: lowercase, strip trailing slash (except `/`), drop query for lookup.
  - Look up in `LEGACY_REDIRECT_MAP`.
  - **Hit** → 301 to `https://yesexperiencesportugal.com${target}` with `Cache-Control: public, max-age=86400` and `X-Robots-Tag: noindex` (safety net for the legacy URL itself while it drops out of index).
  - **Miss** → 410 Gone (reuse the current retired-domain body). No blanket homepage redirect — that's the soft-404 trap you called out.
- Deprecate the current `buildLegacyGoneResponse` export by re-exporting `buildLegacy301Response` under the same name so `src/start.ts` keeps working with a one-line update.

### 2. Update `src/start.ts`

Point `legacyDomainGone` middleware at `buildLegacy301Response`. Update the comment block to reflect the hybrid policy (301 content, 410 fallback, no CoA, no GBP reference).

### 3. Update `src/__tests__/legacy-domain-redirect.test.ts`

Cover:
- Known WP path → 301 with correct `Location` and status.
- Unknown legacy path → 410.
- Canonical host request → null (middleware passes through).
- Trailing slash + uppercase path normalize to the same mapping.
- Query string preserved on the redirected `Location`.

### 4. Keep GBP severed (non-code, must-do)

- Do NOT click "Address change" in GSC.
- In Google Business Profile Manager, mark the OLD listing tied to `yesexperiences.pt` as **permanently closed** (or remove ownership if that listing is already dead). The new brand is a separate GBP for `yesexperiencesportugal.com`.
- Do not import old GBP reviews, photos, or place ID into the new site. `src/config/business-nap.ts` already contains only the new NAP — keep it that way.
- `robots.txt`, sitemap, and canonicals already point only at `yesexperiencesportugal.com` — verified. Nothing to change.

### 5. DNS + verification

- Repoint `yesexperiences.pt` and `www.yesexperiences.pt` A/AAAA (or CNAME) to Lovable per the custom-domain instructions. Add both apex and `www` in Lovable's Domains panel, mark canonical domain as `yesexperiencesportugal.com` (unchanged).
- After DNS propagates, curl each legacy URL from the mapping and confirm `HTTP/1.1 301` + correct `Location`. A shell one-liner is included in the "Verification" section below.

### 6. Keep the 301s live ≥12 months

They live in `src/lib/legacy-domain-redirect.ts` — no expiry. Add a code comment `// Do NOT remove before <today + 12 months>` next to the map.

---

## Redirect map (draft — needs your confirmation on WP slugs)

Alias set I can commit today with high confidence:

```text
/                             → /
/about                        → /about
/about-us                     → /about
/contact                      → /contact
/contact-us                   → /contact
/faqs                         → /faq
/faq                          → /faq
/tours                        → /experiences
/experiences                  → /experiences
/day-tours                    → /day-tours
/multi-day                    → /multi-day
/private-tours                → /private-tours-portugal
/luxury-tours                 → /luxury-tours-portugal
/blog                         → /local-stories
/blog/*                       → /local-stories       (fallback; specific posts mapped case-by-case)
/proposal                     → /proposal-in-portugal
/corporate                    → /corporate
/press                        → /press
/privacy                      → /privacy
/privacy-policy               → /privacy
/terms                        → /terms
/terms-and-conditions         → /terms
/cookies                      → /cookies
```

For `/tour/<slug>` I need your old WP slugs. Current Signature IDs on the new site (target URLs are `/tours/<id>`):

```text
arrabida-wine-allinclusive
wild-beaches-picnic
arrabida-boat
tiles-workshop
azeitao-cheese
sintra-cascais
troia-comporta
evora-alentejo
tomar-coimbra
fatima-nazare-obidos
roman-heritage-alentejo
southwest-vicentine-coast
```

Nearest-Signature fallback rules (when the WP slug has no exact match):

- Any Arrábida / Setúbal / Azeitão wine slug → `arrabida-wine-allinclusive`
- Any Sintra / Cascais slug → `sintra-cascais`
- Any Évora / Alentejo wine slug → `evora-alentejo`
- Any Comporta / Tróia / south beach slug → `troia-comporta`
- Any Fátima / Nazaré / Óbidos slug → `fatima-nazare-obidos`
- Anything else tour-shaped → `/experiences`

I'll bake these into the map as specific entries, not a wildcard, so each URL returns a real 301 (not a regex catch-all).

---

## Verification (post-deploy)

Run once DNS is live:

```bash
for path in / /about /about-us /contact /faqs /tour/arrabida-wine-tour /tours /blog; do
  echo "=== $path ==="
  curl -sI "https://yesexperiences.pt$path" | grep -iE 'HTTP|location'
done
```

Expected: every mapped path → `HTTP/1.1 301` + `location: https://yesexperiencesportugal.com/<target>`. Unmapped paths → `HTTP/1.1 410`.

Optional but recommended: submit the legacy sitemap one last time in GSC (old property) so Google re-crawls quickly and picks up the 301s. **Do not** touch Change of Address.

---

## What I need from you before I switch to build mode

1. **Confirm the alias set above** or paste the actual WP slug list (a `wp-cli post list --post_type=tour --field=name` output, or a raw list of URLs) so I can build the exact 1:1 map.
2. **Confirm DNS repoint is scheduled** for `yesexperiences.pt` + `www.yesexperiences.pt` to Lovable. The middleware is inert until DNS points here.
3. **Confirm the GBP severance action** (old listing marked closed) is already done or will be done in parallel — this is the part that keeps the hybrid strategy actually hybrid.
