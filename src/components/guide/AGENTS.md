# Guide App rules

- Guide App access labels come only from `src/lib/guide-access.ts`, and linking uses `guide_claim_account` (one active profile per confirmed email, unique email/user indexes); Admin and the Guide App describe access identically and no one can claim another profile.
- Guide assignments are final (no guide accept/decline); availability + DB clash guards are the decision point, and every new/updated/removed assignment writes one `ops_notifications` row that `dispatchGuideAssignmentEmails` emails once (claimed via `emailed_at`, keyed by notification id) so retries never duplicate.
