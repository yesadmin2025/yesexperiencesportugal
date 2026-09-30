# Simplify the Guide App around assigned work

## What will change
- Make `/guide` the **My Tours** home with two visible sections: **Today** and the next 10 **Upcoming** assignments.
- Redesign each tour card around the concrete date and pickup time, followed by tour, guest, pax, pickup, status, relevant contact/map actions, and one **View tour details** button.
- Replace the current Calendar-first screen with **Schedule**, defaulting to a chronological list grouped by month and date; keep the calendar as an optional toggle on that same screen.
- Reduce bottom navigation to four direct tabs: **My Tours**, **Schedule**, **Availability**, **Profile**. Remove **More** and the duplicate **All my tours** destination.
- Surface unread operational alerts as a compact banner on My Tours, linking directly to the related tour when possible.
- Keep the existing clean tour detail page, improving missing-data wording only where needed.

## Preserved
- Guide-only sign-in, row-level data isolation, safe guide data fields, and zero financial information.
- Assignment, booking, availability, notification, and conflict logic.
- The separate Guide PWA manifest and `/guide` launch behavior.
- Existing routes remain compatible where needed; no emails, booking changes, assignment changes, or publication.

## Verification
- Run the focused Guide App tests and the project type/build checks.
- Verify `/guide`, Schedule list/calendar, tour details, and four-tab navigation at 393px with no horizontal overflow or runtime errors.
- Confirm the first screen clearly shows **My Tours**, **Today**, and **Upcoming** with the required operational fields and empty states.
