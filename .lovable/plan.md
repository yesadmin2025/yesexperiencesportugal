# Surgical correction plan — premium real imagery, visible motion, no duplication

## Confirmed issues
- The English Corporate page uses the same `winery-group-orange-tree` photo that appears on the homepage, so the repetition is real.
- Corporate service imagery is based on 1280px derivatives; the darker cellar photographs are then cropped into tall 4:5 frames, which amplifies blur and makes them feel low quality on high-density iPhone screens.
- English Corporate/Proposal technically animate, but the current 22–26s movement from scale 1.00 to 1.06 is too subtle to register while scrolling and there is no crossfade sequence.
- Portuguese Corporate still uses static tour images and does not share the responsive image or motion implementation.
- The old `corporate_moments` and `multi_day_moments` sets remain in the admin registry even though they are not rendered publicly; this creates misleading duplicate management.

## 1. Curate by context — real photos only
- Keep the existing image slots; add no bottom strips or new decorative sections.
- Corporate: select unique owner/admin-upload photographs that clearly show teams, hosted wine activity and facilitated group experiences. Remove the homepage group photo from Corporate and retire the two weak/dark cellar crops from this surface.
- Proposal: keep its slots distinct from Homepage and Corporate, prioritising intimate hosted moments rather than corporate groups.
- Multi-day: keep the existing real travel-file presentation; improve its current image rendering/motion rather than introducing another gallery.
- Enforce exact-source uniqueness across Homepage Guest Moments, Corporate and Proposal with a regression test.

## 2. Preserve genuine iPhone-level detail
- Rebuild responsive AVIF/WebP variants from the highest-resolution original real files, not from existing 1280px derivatives.
- Generate 640, 960, 1280, 1600, 1920 and source-capped large variants; never upscale beyond the original pixel dimensions.
- Use high-quality AVIF/WebP settings and correct `srcSet`/`sizes` so DPR 2–3 phones receive the sharpest legitimate source.
- Change Corporate/Proposal mobile media from forced portrait crop to a stable landscape/editorial ratio, with per-image focal positioning where needed. This avoids enlarging and cutting landscape cellar photographs into blurry 4:5 windows.
- Preserve source-photo character: no AI, no stock, no invented enhancement and no HDR-style processing.

## 3. One image at a time with visible cinematic life
- Upgrade the existing editorial image component into a two-frame sequence for each existing slot: the primary real photo plus one context-matched real alternate.
- Use a restrained but clearly visible cycle: crossfade one image at a time, with continuous 14–18s Ken Burns zoom/pan and opposing focal movement between frames.
- Start the sequence when the block enters the viewport so movement is visible during normal mobile scrolling; do not autoplay off-screen.
- Apply the same component to Corporate EN/PT and Proposal. Enhance the existing Multi-day travel-file frame with the same viewport-aware motion, without adding a new module.
- Respect `prefers-reduced-motion` by showing one still, sharp image.

## 4. Align English and Portuguese surfaces
- Make `/corporate` and `/pt/corporate` consume the same curated image records, responsive variants, focal positions and cinematic component.
- Keep language-specific copy unchanged.
- Update each page’s social image to a real, contextually correct Corporate image that is not reused as a homepage moment.

## 5. Clean the admin model
- Remove the obsolete `corporate_moments` and `multi_day_moments` modules from the image-swap registry/type labels so the admin only exposes slots that actually render.
- Keep `corporate_services` and `proposal_services` editable; extend each slot record to carry its real alternate and focal data without adding page slots.
- Update duplicate detection to compare only active public modules, preventing false “Ambient/Moments” duplication reports.

## 6. Mobile verification before completion
- Validate at iPhone-size viewport first, then tablet/desktop.
- Capture the initial frame and a later frame for Homepage Guest Moments, Corporate EN/PT, Proposal and Multi-day to prove that crossfade and pan/zoom are visibly running.
- Inspect rendered `currentSrc`, intrinsic dimensions and CSS crop ratio to confirm high-DPI images are selected without upscaling.
- Run targeted tests for: no cross-page duplicate sources, no retired/generated/ambient images, reduced-motion fallback, valid responsive sources and no extra public image sections.

## Acceptance criteria
- No Corporate image repeats a Homepage Guest Moments image.
- No generated, invented or stock photography is used.
- Corporate’s blurry cellar images are replaced with real, context-relevant, sharper material.
- EN and PT Corporate have identical image quality and motion behaviour.
- Each existing page slot shows one image at a time with an observable crossfade and continuous Ken Burns movement.
- No extra section is added to Corporate, Proposal, Moments or Multi-day.
- iPhone rendering uses the best genuine resolution available and never fabricates pixels by upscaling.