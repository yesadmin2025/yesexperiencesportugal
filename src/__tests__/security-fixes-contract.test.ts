/**
 * Security fixes contract guardrail.
 *
 * Locks in the three security fixes from commit 811dfbf29 so they cannot
 * be silently reverted:
 *
 *  1. stripe-webhook-health: the "alerted" flag may only be written to the
 *     health-check row created by the current request (scoped by its id) —
 *     never to older, caller-reachable records.
 *  2. ops_booking_window(uuid): EXECUTE is revoked from PUBLIC, anon and
 *     authenticated — only privileged roles may call it.
 *  3. tour_assignments RLS: guides only see their own assignments that have
 *     not been removed (removed_at IS NULL).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

const webhookHealthSrc = fs.readFileSync(
  path.join(ROOT, "src/routes/api/public/hooks/stripe-webhook-health.ts"),
  "utf8",
);

const migrationSrc = fs.readFileSync(
  path.join(
    ROOT,
    "drizzle/migrations/0006_restrict_booking_window_and_removed_assignments.sql",
  ),
  "utf8",
);

describe("stripe-webhook-health alert scoping", () => {
  it("flags only the row created by the current request", () => {
    expect(webhookHealthSrc).toContain('if (alerted && inserted?.id)');
    expect(webhookHealthSrc).toMatch(
      /\.update\(\{\s*alerted:\s*true\s*\}\)\s*\.eq\("id",\s*inserted\.id\)/,
    );
  });

  it("never updates health rows without an id filter", () => {
    const updates = webhookHealthSrc.match(/\.update\(\{[^}]*\}\)[^;]*;/g) ?? [];
    for (const stmt of updates) {
      expect(stmt).toContain('.eq("id"');
    }
  });
});

describe("ops_booking_window execution restriction", () => {
  it("revokes EXECUTE from PUBLIC, anon and authenticated", () => {
    expect(migrationSrc).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.ops_booking_window\(uuid\) FROM PUBLIC, anon, authenticated;/,
    );
  });
});

describe("tour_assignments RLS hides removed assignments", () => {
  it("recreates the guide read policy with removed_at IS NULL", () => {
    expect(migrationSrc).toMatch(
      /DROP POLICY IF EXISTS "Guide reads own assignments" ON public\.tour_assignments;/,
    );
    expect(migrationSrc).toMatch(
      /CREATE POLICY "Guide reads own assignments" ON public\.tour_assignments FOR SELECT TO authenticated USING \(guide_id = public\.current_guide_id\(\) AND removed_at IS NULL\)/,
    );
  });
});
