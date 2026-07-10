## Plan

Replace `public/travel-file-sample/page-01.jpg` with the uploaded image (`user-uploads://IMG_6215-2.jpeg`) — the already-redacted cover the user prepared on their phone (logo removed, guest name blanked, dates line clean).

### Steps

1. Copy `user-uploads://IMG_6215-2.jpeg` to `public/travel-file-sample/page-01.jpg` (overwrite).
2. Leave pages 2–23 untouched.
3. Leave the redaction script and gallery components unchanged — no code edits needed.

### Notes

- The gallery in `RecentJourney.tsx` and `multi-day.tsx` already references `page-01.jpg`, so the new cover will show up immediately.
- Aspect ratio of the upload (~1240×1755, ≈1:1.41) matches the other page JPGs, so no layout change is required.