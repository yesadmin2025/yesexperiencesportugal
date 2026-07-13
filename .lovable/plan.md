## Root cause

The screenshots are from the published custom domain, while the latest preview already has the corrected 16:9 Signature hero. One overflow remains in the collection itself: the mobile tour grid has no explicit shrinkable column. CSS Grid therefore sizes its implicit column to the longest CTA/title (`~520px`) inside a `361px` content area, making every card, image, title, and CTA extend off-screen. The previous `overflow-x: clip` rule only masked that oversized layout and is not reliably propagated by iOS Safari.

## Fix

1. **Constrain the Signature collection grid at its source**
   - Give the mobile collection an explicit `minmax(0, 1fr)` column.
   - Add `min-w-0`, `w-full`, and `max-w-full` to card/article and relevant link/content wrappers so long titles and CTA labels wrap within the viewport instead of defining the column width.
   - Apply the same correction to English and Portuguese collection routes.

2. **Make shared Signature CTAs intrinsically mobile-safe**
   - Update the shared CTA primitive/pair so labels can wrap, arrows stay fixed-size, and full-width stacked buttons never impose a content-based minimum width.
   - Preserve the current desktop layout and visual design.

3. **Use an iOS-safe document overflow guard**
   - Replace the root-level `overflow-x: clip` safeguard with the Safari-compatible guard while retaining clipping on internal decorative/image frames.
   - This is secondary protection; the actual oversized grid will still be fixed rather than hidden.

4. **Lock the Signature detail hero alignment**
   - Keep the corrected mobile 16:9 hero, 16px gutters, title spacing, meta grid, and stacked full-width CTAs.
   - Add explicit shrink constraints to the hero content so navigation from the collection cannot carry any oversized layout into the detail page.

5. **Regression validation at real phone widths**
   - Add mobile tests for 320px, 360px, and 393px covering `/experiences`, `/pt/experiences`, and the Arrábida Signature detail.
   - Assert `scrollWidth <= clientWidth`, every card/title/CTA remains within the viewport, and collection → detail navigation resets at the left edge.
   - Verify the 393×588 rendered screenshot against the supplied iPhone examples.

Publishing to the custom domain is a separate final step; after the fix is verified in preview, it must be published before `yesexperiencesportugal.com` will show it.