# Low-risk shared performance cleanup

## Scope
Inspect the 13 specified pages for shared loading problems, then fix only concrete, low-risk issues with meaningful expected speed benefits.

- Preserve all text, metadata, canonical addresses, schema, and intentional noindex directives.
- Preserve visual identity, hero quality, Studio/Tailor logic, prices, checkout, and booking behavior.
- Prefer centralized corrections to below-the-fold media loading, redundant high-priority requests, missing image space reservation, or safely deferrable noncritical work.
- Do not create pages, replace imagery, redesign, or publish.

## Technical approach
Audit shared image/video components and route usage first. Make the smallest corrections supported by source and browser evidence; avoid broad code splitting or dependency changes that could affect interactions.

## Verification
Run focused loading/SEO-safety tests and inspect the automatic preview build. Check representative pages, including Travel Designer and Studio, on mobile and desktop for working images, stable layout, preserved content, and usable controls. Report exact files, causes addressed, tests, and any remaining limitations; do not promise a measured PageSpeed increase without a new audit.