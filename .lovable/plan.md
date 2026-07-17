## Admin photo upload page

Build a private `/admin/photos` page so you can add photos to any tour straight from your iPhone — pick from your gallery, upload, reorder, set cover, done. No cloud folders, no middleman.

### What you'll see and do

1. Sign in at `/auth` with **nidiadealmeida85@gmail.com** — that email is granted the `admin` role automatically.
2. Open `/admin/photos` (linked from your account menu when signed in as admin).
3. Pick a tour from a dropdown (Southwest Vicentine Coast, Sintra, Douro, etc.).
4. Tap **Add photos** → iPhone opens your Photos gallery → multi-select 50+ at once → they upload with progress bars.
5. Thumbnails appear in a grid: drag to reorder, tap ⭐ to set cover, tap 🗑 to delete, edit alt text inline.
6. Changes save live to the tour gallery — public tour page updates immediately.

### What happens behind the scenes

- Private `tour-photos` storage bucket + new `tour_gallery_photos` table (tour_id, storage_path, alt, sort_order, is_cover).
- HEIC photos from iPhone auto-convert to JPEG in the browser; every photo is resized to max 2400px and compressed (~85% quality) before upload — keeps galleries fast without you thinking about it.
- Alt text auto-suggested from tour name + index, editable.
- `admin` role stored in the existing `user_roles` table (safe pattern, no privilege escalation).
- `getTourGallery` reads from `tour_gallery_photos` first; falls back to the current curated Viator/local images when a tour has none uploaded yet — so nothing breaks and Southwest Vicentine Coast keeps the 5 Viator photos I wired earlier until you replace them.
- All upload/delete/reorder endpoints are `createServerFn` with `requireSupabaseAuth` + admin role check — no one else can touch your galleries.

### Out of scope (for v1)

- No public user uploads.
- No AI cropping or auto alt-text.
- No bulk import from Google Drive / iCloud.

### After approval

I'll build it in one pass, then walk you through: sign in → open `/admin/photos` → upload the Southwest Vicentine Coast photos first as a test.
