# Owner-Only Diagnostic MCP — Plan v3 (no changes made)

Owner UID masked as `32558…35e42` throughout. The exact UID appears only inside the Phase-0B migration SQL (submitted for approval, never committed as literal in application source or docs).

## A. Corrected bootstrap flow

Three sequential phases with an owner checkpoint between 0A and 0B. The two-factor gate used in 0A is deliberately weaker than the final three-factor gate — it exists only to let the owner confirm identity so the allow-list can be populated. It is removed the moment 0B ships.

```
Phase 0A  ── temporary identity confirmation
   │        Tool: get_current_mcp_identity
   │        Guard: OAuth + admin role (no allow-list check)
   │        Data: caller's own claims + one caller-scoped role read
   ▼
Owner checkpoint
   │        Owner signs in via OAuth consent, calls the tool once,
   │        reads the masked UID it returns, and confirms it matches
   │        the sole current admin (32558…35e42).
   ▼
Phase 0B  ── allow-list + audit tables + guard hardening
   │        Migration: create mcp_owner_allowlist, mcp_owner_audit_log,
   │        insert confirmed UID. Remove get_current_mcp_identity from
   │        src/lib/mcp/index.ts. Ship the three-factor requireOwner guard.
   ▼
Phase 1   ── seven read-only diagnostic tools
   │        Every tool: OAuth + admin role + exact allow-list match.
   ▼
Phase 2   ── separately approved (RPCs, resolver extraction, cache-only route,
             reduced system health).
```

Safety property: no business-data tool is ever installed while the guard is running in the weaker two-factor mode. `get_current_mcp_identity` returns only masked identity fields and is deleted before Phase 1 ships.

## B. Corrected table permissions (Phase 0B migration)

Both tables: **no privileges** for `authenticated` or `anon`; `service_role` only; RLS enabled; **no policies**. Application access happens exclusively through the owner-gated server handler using `supabaseAdmin`, after `requireOwner` has already validated OAuth + admin role + allow-list membership.

```sql
-- Allow-list
create table public.mcp_owner_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  added_at timestamptz not null default now()
);
revoke all on public.mcp_owner_allowlist from public, anon, authenticated;
grant all on public.mcp_owner_allowlist to service_role;
alter table public.mcp_owner_allowlist enable row level security;
-- intentionally no policies

-- Audit log
create table public.mcp_owner_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_name text not null,
  called_at timestamptz not null default now(),
  duration_ms integer,
  success boolean not null,
  result_bytes integer,
  error_code text
);
revoke all on public.mcp_owner_audit_log from public, anon, authenticated;
grant all on public.mcp_owner_audit_log to service_role;
alter table public.mcp_owner_audit_log enable row level security;
-- intentionally no policies

-- Owner UID insert (single row; UID redacted from this plan)
insert into public.mcp_owner_allowlist (user_id, note)
values ('<confirmed-owner-uid>', 'yesexperiences owner — MCP diagnostic');
```

The earlier proposed `for select to authenticated using (…subquery on mcp_owner_allowlist…)` policy is dropped: authenticated has no privilege on that table, so the subquery would fail; the policy was internally inconsistent. Audit reads happen through the server handler only.

## C. Corrected Phase-1 tool schemas

Common wrapper on every response:
```
{ ok: boolean, tool: string, generatedAt: string, data?: T, error?: { code: string, message: string } }
```
All timestamps ISO-8601 UTC. Every list uses hard `.limit()`. Every string field returned is either a fixed enum or a value derived from a whitelisted column. No raw rows.

1. `get_current_mcp_permissions`
   - Input: `{}` (Zod `.strict()`).
   - Data returned:
     ```
     { authenticated: true, maskedUserId, verifiedEmailMasked, role: "admin",
       allowListed: true, lastAuditAt: string | null, auditCount24h: number }
     ```
   - Access: caller-scoped RLS for the role read; **service-role read** (via `supabaseAdmin`) for allow-list presence and audit stats — only after `requireOwner` has succeeded.

2. `get_owner_diagnostic_snapshot`
   - Input: `{}`.
   - Data: `{ counts: { tours, priceTiers, wiredStops, unwiredStops, activeBookings24h, quotes24h, funnelEvents24h, clientErrors24h }, lastImportedTourAt, lastBookingAt, lastErrorAt }`.
   - Access: service-role scalar aggregates; no PII.

3. `list_internal_tours`
   - Input: `{ region?: string, limit?: 1..100 }`.
   - Data: `{ tours: Array<{ id, title, region, durationHours, priceFromEur, tier, stopsCount, imageUrlPresent: boolean, catalogueRecordPresent: true, publicationStatus: "not_recorded", lastUpdatedAt }>, total }`.
   - No `publishedOnly` input. Nothing claims presence == published.

4. `get_tour_pricing_config`
   - Input: `{ tourId: string }`.
   - Data: `{ tourId, tierRecordPresent: boolean, tiers: jsonb | null, tierUpdatedAt, addOns: Array<{ id, label, pricingUnit, unitEur, active }>, availableAddOns: Array<{ addOnId, scope, active, sortOrder }>, warnings: string[] }`.

5. `get_tour_wiring`
   - Input: `{ tourId: string }`.
   - Data: `{ tourId, stops: Array<{ position, stopCanonical, variantBucket, durationMinutes, optional, stopRecordPresent, geoPresent, operationalPresent, lat?: number, lng?: number, region }>, compatibilityHits: Array<{ stopA, stopB, cooccurrenceCount }>, warnings: string[] }`.
   - Static project data (`stopGeo`, `stopOperational`) is consumed via **top-of-file ES imports** and mapped into explicitly constructed fields. No filename, path, or arbitrary-file input. No source-code content is returned.

6. `get_data_gaps_report`
   - Input: `{}`.
   - Data: `{ toursWithoutTiers: string[], toursWithoutWiring: string[], wiringWithoutStops: Array<{ tourId, stopCanonical }>, stopsMissingGeo: string[], stopsMissingOperational: string[], addOnsWiredButInactive: Array<{ tourId, addOnId }>, warnings: string[] }`. All arrays capped.

7. `get_recent_sanitized_errors`
   - Input: `{ since?: ISO-8601 string, limit?: 1..100 }`.
   - Data: `{ clientErrors: Array<{ createdAt, route, source, severity, messagePreview }>, aiErrors: Array<{ createdAt, provider, model, feature, errorCode }>, failedWebhooks: Array<{ receivedAt, eventType, statusCode, errorCodePreview }> }`.
   - Never returns `stack`, `user_agent`, `session_id`, `customer_email`, raw `metadata`, or full messages. `messagePreview` = first 140 chars, regex-scrubbed of `@`-emails / phone digits / 24-char hex tokens.

Phase-0A tool schema:

- `get_current_mcp_identity` — input `{}`; data `{ authenticated: true, maskedUserId, role: "admin", verifiedEmailMasked }`. Guard: OAuth + admin role only. No allow-list, no service-role except the standard `has_role` RPC (SECURITY DEFINER; already granted to `authenticated`).

## D. Exact Phase-0A files (no migration)

Created:
- `src/lib/mcp/lib/redact.ts` — `maskUid(uuid) → "32558…35e42"`, `maskEmail`, `maskPhone`, `safeError`. Pure functions, no I/O.
- `src/lib/mcp/lib/rate-limit.ts` — in-memory per-uid rate limit for the identity tool (10/min).
- `src/lib/mcp/lib/two-factor-guard.ts` — `requireAdmin(ctx)`: checks `ctx.isAuthenticated()`, then `has_role` via `supabaseForUser(ctx)`. Returns `{ ok, uid, email }` or `{ ok:false, code, message }`. No service-role, no allow-list.
- `src/lib/mcp/tools/owner/get-current-mcp-identity.ts` — Phase-0A tool. Reads `ctx.getUserEmail()` (verified by OAuth), applies `maskUid` and `maskEmail`, returns four fields above. `annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }`. Zod `.strict()` empty input.

Edited:
- `src/lib/mcp/index.ts` — append `getCurrentMcpIdentityTool` to the `tools` array.

Auto-regenerated (never hand-edited): `.lovable/mcp/manifest.json` via `app_mcp_server--extract_mcp_manifest`.

Owner checkpoint (no files): owner authorises MCP client through `/.lovable/oauth/consent`, calls `get_current_mcp_identity` once, reports the masked UID. Only when it matches `32558…35e42` do we proceed.

## E. Exact Phase-0B files and migration

Migration (single file, requires approval):
1. `create table public.mcp_owner_allowlist …` + `revoke all from public,anon,authenticated` + `grant all to service_role` + RLS enabled, no policies.
2. `create table public.mcp_owner_audit_log …` + same revoke/grant + RLS enabled, no policies.
3. `insert into public.mcp_owner_allowlist (user_id, note) values ('<confirmed-owner-uid>', 'yesexperiences owner — MCP diagnostic');` — UID injected into the SQL body only, never into TypeScript or docs.

Created:
- `src/lib/mcp/lib/owner-guard.ts` — three-factor `requireOwner(ctx)`:
  1. `ctx.isAuthenticated()`,
  2. `has_role(uid,'admin')` via caller-scoped client,
  3. allow-list membership via `supabaseAdmin.from('mcp_owner_allowlist').select('user_id').eq('user_id', uid).maybeSingle()`.
  Returns `{ ok, uid, userClient }` or a deny result. No tool ever imports `supabaseAdmin` itself.
- `src/lib/mcp/lib/audit.ts` — `recordAudit({ uid, toolName, durationMs, success, resultBytes, errorCode })` inserts via `supabaseAdmin`; wrapped in try/catch so audit failure never fails the tool call. Never writes payloads.

Edited:
- `src/lib/mcp/index.ts` — **remove** `getCurrentMcpIdentityTool` from the array (temporary tool retired the moment Phase 1 lands in the same PR).

Deleted:
- `src/lib/mcp/lib/two-factor-guard.ts`
- `src/lib/mcp/tools/owner/get-current-mcp-identity.ts`

Auto-regenerated: `.lovable/mcp/manifest.json` — no longer advertises the identity tool.

## F. Exact Phase-1 files

Created:
- `src/lib/mcp/tools/owner/get-current-mcp-permissions.ts`
- `src/lib/mcp/tools/owner/get-owner-diagnostic-snapshot.ts`
- `src/lib/mcp/tools/owner/list-internal-tours.ts`
- `src/lib/mcp/tools/owner/get-tour-pricing-config.ts`
- `src/lib/mcp/tools/owner/get-tour-wiring.ts` (top-level imports from `@/data/stopGeo` and `@/data/stopOperational`; no path input)
- `src/lib/mcp/tools/owner/get-data-gaps-report.ts`
- `src/lib/mcp/tools/owner/get-recent-sanitized-errors.ts`

Every tool body:
```ts
const guard = await requireOwner(ctx);
if (!guard.ok) return deny(guard);
const started = Date.now();
try {
  const data = await work(guard);           // uses supabaseAdmin, explicit columns, .limit()
  const bytes = JSON.stringify(data).length;
  await recordAudit({ uid: guard.uid, toolName: NAME, durationMs: Date.now()-started, success: true, resultBytes: bytes });
  return ok(data);
} catch (err) {
  await recordAudit({ uid: guard.uid, toolName: NAME, durationMs: Date.now()-started, success: false, errorCode: safeError(err).code });
  return fail(err);
}
```

Edited:
- `src/lib/mcp/index.ts` — add the seven tools to `tools`.

Auto-regenerated: `.lovable/mcp/manifest.json`.

Phase 2 (deferred, separate approvals): pure `resolveQuote` extraction from `supabase/functions/create-builder-checkout/index.ts`, RPCs `mcp_owner_get_journey_diag` / `mcp_owner_get_checkout_diag` / `mcp_owner_get_email_diag` (PII masked inside Postgres), cache-only `preview_route` (zero outbound calls), reduced `get_system_health` returning `{ mcpRuntimeReachable: true, publicWebsiteStatus: "unknown", buildStatus: "not_recorded", testStatus: "not_recorded", deployedCommit: "not_recorded", edgeFunctionInventory: "not_recorded", integrations: { stripeConfigured: boolean, emailConfigured: boolean, mapboxConfigured: boolean } }` — booleans computed from `Boolean(process.env.X)` inside the server; never returns names, prefixes, or values.

## G. Tests

Phase-0A (`src/lib/mcp/__tests__/phase-0a/`):
- `identity-guard.test.ts` — 401 unauth; 403 authed non-admin; success returns exactly the four masked fields and nothing else.
- `identity-no-business-data.test.ts` — static import scan of `get-current-mcp-identity.ts` forbids references to `imported_tours`, `booking_quotes`, `bookings`, `studio_v3_leads`, `email_send_log`, `stripe_webhook_events`, `client_error_logs`, `supabaseAdmin`, `client.server`.
- `identity-masking.test.ts` — UID and email in the response match `^[0-9a-f]{5}…[0-9a-f]{5}$` and `^.\*\*\*@.+$`; full UID/email are never present in the JSON.
- `identity-rate-limit.test.ts` — 11th call/min is rejected.
- `identity-tool-registered-alone.test.ts` — asserts Phase-0A `src/lib/mcp/index.ts` `tools` contains only `[echo, list_my_signature_journeys, get_signature_journey, get_current_mcp_identity]`.

Phase-0B / Phase-1 (`src/lib/mcp/__tests__/phase-1/`):
- `owner-guard.test.ts` — all four rejection paths (unauth, non-admin, admin-not-in-allowlist, allow-list row removed at runtime); success only when all three factors hold.
- `identity-tool-removed.test.ts` — asserts `get_current_mcp_identity` no longer imported anywhere and not in the manifest.
- `no-writes.test.ts` — static scan of `src/lib/mcp/tools/owner/` fails on `.insert(|.update(|.delete(|.upsert(`; the only allowed `.rpc(` is `has_role`.
- `no-side-effects.test.ts` — greps forbid `stripe`, `resend`, `sendEmail`, Mapbox/OSRM HTTP calls, `fetch(` outside `supabaseAdmin`.
- `service-role-scope.test.ts` — `supabaseAdmin` imported only in `owner-guard.ts` and `audit.ts`; tool files import `requireOwner`, never the admin client directly.
- `pii-redaction.test.ts` — snapshot every Phase-1 tool response against a seeded fixture; regex asserts no `@`-emails, no phone-shaped digit runs, no 24-char hex tokens, no `stack`, no `user_agent`, no `metadata` key, no full UIDs other than the caller's own masked form.
- `input-strict.test.ts` — Zod `.strict()` rejects unknown props; `limit` clamped; `since` parsed as ISO-8601.
- `rate-limit.test.ts` — per-(uid,tool) 10/min and global 120/min per uid.
- `audit-logged.test.ts` — one `mcp_owner_audit_log` row per call (success and failure); rows contain no payload; audit failure never fails the tool call.
- `allowlist-forgery.test.ts` — spoofed `user_id` in tool input cannot bypass the guard.
- `no-publication-claim.test.ts` — `list_internal_tours` output always has `publicationStatus === "not_recorded"` and no `published`/`active`/`visibility` field.
- `wiring-no-path-input.test.ts` — `get_tour_wiring` Zod schema rejects any key other than `tourId`.
- `uid-not-in-source.test.ts` — repo grep for the confirmed UID literal finds it only in the migration file, and 0 matches under `src/`, `docs/`, `.lovable/`.

## H. Confirmation

- No file has been modified.
- No database row has been modified.
- No migration has run.
- No edge function has been deployed.
- No MCP manifest entry, route, or permission has changed.
- Awaiting owner approval to execute Phase 0A. The confirmed UID will be supplied inside the Phase-0B migration SQL only; masked (`32558…35e42`) everywhere else.
