# YES Admin vNext — Signature content authority

Status: implementation contract before any production DDL or content migration.

## Why this exists

The current project correctly declares `signatureToursSourceOfTruth.ts` as the canonical operational/editorial source, but `signatureTours.ts` still duplicates substantial public content. Pricing already has a stronger authority in `tour_price_tiers` and availability already has `tour_operating_rules`.

Admin vNext must remove duplication, not create a third place to maintain the same facts.

## Authority boundaries

| Concern | Canonical authority | Admin behaviour |
| --- | --- | --- |
| Public Signature content | New versioned Signature content store, seeded from current SoT | Draft → preview → publish |
| Structured itinerary | New child rows tied to Signature content revision | Reorder/edit structured moments |
| Price tiers | Existing `tour_price_tiers` | Edit exact 1–8 pax rates |
| Public “from” price | Derived from approved tier 8 | Never edited separately |
| Availability | Existing `tour_operating_rules` | Weekdays, blackout dates, lead hours |
| Studio/Tailor add-on commercial catalogue | Existing code catalogue + server structural whitelist until reconciled | Do not use stale `tour_available_add_ons` as SoT |
| Media | Existing gallery/media authority | Reuse, do not duplicate binary metadata |
| Stripe/payment methods | Stripe Dashboard/dynamic PMs | No Admin hard-coded method toggles |

## Proposed content schema

Do not store the entire product as one opaque JSON document. Keep the editable product understandable and validateable.

### `signature_experience_content`

One row per Signature and revision.

Suggested fields:

- `id uuid primary key`
- `tour_id text not null`
- `revision integer not null`
- `status text check in ('draft','published','archived')`
- `title text not null`
- `duration_label text not null`
- `overview text not null`
- `pickup_summary text null`
- `languages text[] not null default '{}'`
- `cancellation_summary text null`
- `highlights text[] not null default '{}'`
- `inclusions text[] not null default '{}'`
- `exclusions text[] not null default '{}'`
- `created_at timestamptz not null default now()`
- `created_by uuid null`
- `published_at timestamptz null`
- `published_by uuid null`

Constraints:

- one published revision per `tour_id`;
- draft may coexist with published revision;
- public reads published only;
- no pricing or availability columns in this table.

### `signature_itinerary_chapters`

Structured child rows for one content revision.

Suggested fields:

- `id uuid primary key`
- `content_id uuid not null`
- `sort_order integer not null`
- `label text not null`
- `description text not null`
- `duration_minutes integer null`
- `travel_to_next_minutes integer null`
- `optional boolean not null default false`
- `stop_type text not null`
- `is_default boolean not null default true`
- `pool_id text null`
- `admission_included boolean null`
- `own_expense boolean null`
- `canonical_stop_key text null`

`stop_type` must preserve the existing structured semantics from the current Source of Truth, including core, pass-by, optional, alternative-pool, beach-option and conditional.

Named supplier candidates may remain canonical internally. Public projection rules continue to genericise unresolved winery pools.

### `signature_content_publish_log`

Append-only publish history for rollback/audit.

Suggested fields:

- `id uuid primary key`
- `tour_id text not null`
- `from_revision integer null`
- `to_revision integer not null`
- `published_at timestamptz not null default now()`
- `published_by uuid null`
- `snapshot jsonb not null`

The snapshot is for audit/rollback, not the primary editable authority.

## Admin workflow

1. Open `/admin/experiences`.
2. Choose a Signature.
3. Edit a draft without changing the published site.
4. Preview using the same public presentation adapters.
5. Validation before publish:
   - required fields present;
   - itinerary orders unique/contiguous;
   - alternative pools have valid `pool_id` / pick contract;
   - unresolved winery pool public projection contains no supplier identity;
   - no pricing fields embedded in content;
   - no duplicate Source-of-Truth conflicts.
6. Publish atomically.
7. Public cache invalidates.
8. Previous published revision remains in publish log for rollback.

## Migration sequence

### Phase C1 — parity harness

Before DB writes, build a pure adapter that converts current `signatureToursSourceOfTruth.ts` into the proposed row model and back into the existing public `TourContent` shape. Snapshot every current Signature and prove parity.

### Phase C2 — schema + RLS

Create tables and policies:

- public may read only published revisions;
- admin may create/update drafts and publish;
- public cannot write;
- publish operation should be transactional/server-controlled.

### Phase C3 — seed

One-time seed from the current canonical SoT. Do not seed from `signatureTours.ts`, imported legacy tours, builder tables or stale add-on tables.

### Phase C4 — public adapter

Public content resolver:

1. published DB revision when present;
2. current code SoT only as temporary migration fallback;
3. never merge field-by-field from both authorities.

### Phase C5 — remove duplicate code truth

After all Signatures have DB parity and production smoke tests pass:

- reduce `signatureTours.ts` to technical/catalogue metadata that genuinely belongs there;
- remove editable public copy duplicated from the new content store;
- eliminate hand-maintained `priceFrom` once all public generic-price callers derive tier 8 through the pricing authority.

## Explicit non-goals

- Do not migrate pricing into the content tables.
- Do not migrate availability into the content tables.
- Do not promote `tour_available_add_ons` as current truth without reconciling its legacy IDs/eligibility.
- Do not expose `cutoff_local_time` in Admin until checkout actually implements its semantics.
- Do not make supplier names customer promises merely because internal itinerary rows know the supplier identity.
- Do not auto-publish on every keystroke.

## Release gates

No production switchover until:

- every current Signature round-trips through the DB adapter without semantic drift;
- public winery-pool privacy tests stay green;
- Signature/Tailor/Studio route and pricing tests stay green;
- JSON-LD uses the same published public projection;
- Admin RLS is verified with admin and anonymous sessions;
- preview/publish/rollback works on one canary Signature before bulk migration.
