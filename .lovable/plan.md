# Final SERP positioning cleanup

## Scope
- Change only the homepage search title and shared meta/OG/Twitter description to the exact supplied wording; keep the Hero unchanged.
- Normalize current public-facing `YES experiences Portugal` strings to `YES Experiences Portugal` in metadata, schema, accessibility labels, generated public text, and other live customer-facing copy. Preserve URLs, slugs, identifiers, user reviews, and historical quotations.
- Remove any live retired `700+` review proof only if found, using the existing review certificate source rather than duplicating values.
- Preserve the existing WebSite, Organization, site-name, canonical/hreflang/sitemap/robots, and first-party-only Product review schema contracts.

## Technical details
- Update the existing homepage constants and their focused regression expectations.
- Update only files confirmed by the public-output audit; adjust current-output tests where their exact expectations intentionally lock corrected casing.
- Confirm WebSite is emitted once with the required name and alternates, Organization has the required name, and root `og:site_name` is exact.

## Validation
- Run the TypeScript check, focused SEO/meta/schema tests, the full test suite, and the production build.
- Fetch rendered homepage HTML and verify title, description, OG/Twitter description, site name, and a single WebSite node.
- Re-scan current public source/output for inconsistent casing and retired `700+` proof.
- Record the final commit SHA and do not publish.

## Explicitly untouched
Visuals, motion, layout, Hero copy and actions, prices, booking, Stripe, Studio, tour facts, canonical/hreflang/sitemaps/robots, database, security, admin, integrations, and emails.
