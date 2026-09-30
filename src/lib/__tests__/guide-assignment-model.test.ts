import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { guideNotifyMessage } from "@/lib/guide-notify";
import { guideAssignmentAttention } from "@/lib/guide-access";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const migrations = readdirSync(resolve(process.cwd(), "supabase/migrations")).map((f) => read(`supabase/migrations/${f}`)).join("\n");
const FINANCE = /price|amount|€|eur\b|payment|stripe|voucher|margin|total/i;

// ---- In-memory stand-in for the database used by the email dispatcher ----
type Notif = { id: string; guide_id: string; booking_id: string; assignment_id: string; notification_type: string; emailed_at: string | null; email_status?: string };
const db = { notifs: [] as Notif[], sends: [] as Array<{ to: string; key: string; text: string }>, log: 0 };
const table = (name: string) => {
  const f: Record<string, unknown> = {}; let patch: Record<string, unknown> | null = null;
  const rows = () => db.notifs.filter((n) => Object.entries(f).every(([k, v]) => (v === "__null" ? (n as never)[k] == null : Array.isArray(v) ? v.includes((n as never)[k]) : (n as never)[k] === v)));
  const q: Record<string, unknown> = {
    select: () => q, eq: (k: string, v: unknown) => { f[k] = v; return q; }, is: (k: string) => { f[k] = "__null"; return q; },
    in: (k: string, v: unknown[]) => { f[k] = v; return q; },
    update: (p: Record<string, unknown>) => { patch = p; return q; },
    insert: async () => { db.log++; return {}; },
    maybeSingle: async () => ({ data: name === "guides" ? { email: "guide@example.com" } : { preferred_date: "2026-10-12", start_time: "09:00", tour_title: "Sintra day", customer_name: "Ana", guests: 2, pickup_location: "Hotel Avenida", amount_total: 99900 } }),
    then: (res: (v: unknown) => void) => {
      const hit = name === "ops_notifications" ? rows() : [];
      if (patch) hit.forEach((n) => Object.assign(n, patch));
      res({ data: hit.map((n) => ({ ...n })) });
    },
  };
  return q;
};
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (n: string) => table(n) } }));
vi.mock("@/lib/email/send-internal.server", () => ({
  sendTransactionalInternal: async (a: { recipientEmail: string; idempotencyKey: string; rendered: { text: string } }) => {
    db.sends.push({ to: a.recipientEmail, key: a.idempotencyKey, text: a.rendered.text }); return { ok: true };
  },
}));

const queue = (id: string, type: string, guide = "g1") =>
  db.notifs.push({ id, guide_id: guide, booking_id: "b1", assignment_id: `a-${id}`, notification_type: type, emailed_at: null });

describe("Assignments are final — guides are notified, never asked", () => {
  beforeEach(() => { db.notifs = []; db.sends = []; db.log = 0; });

  it("available guide assignment is immediately scheduled (no confirmation step)", () => {
    const fn = migrations.slice(migrations.lastIndexOf("FUNCTION public.ops_assign_guide"));
    expect(fn).toMatch(/INSERT INTO public\.tour_assignments/);
    expect(read("src/lib/guide-access.ts")).toMatch(/return "Scheduled"/);
  });

  it("unavailable or clashing guide is blocked by the database", () => {
    expect(migrations).toMatch(/marked unavailable for this tour/);
    expect(migrations).toMatch(/already has another tour at this time/);
  });

  it("a new assignment sends exactly one email; retries do not duplicate", async () => {
    const { dispatchGuideAssignmentEmails } = await import("@/lib/guide-notify.server");
    queue("n1", "assignment_new");
    await dispatchGuideAssignmentEmails("b1");
    await dispatchGuideAssignmentEmails("b1");
    expect(db.sends).toHaveLength(1);
    expect(db.sends[0].key).toBe("guide-notif-n1");
  });

  it("same-guide re-assign is a no-op in the database (no second notification)", () => {
    expect(migrations).toMatch(/IF old\.guide_id = _guide_id THEN RETURN old\.id; END IF;/);
  });

  it("reassignment notifies old guide (removed) and new guide (new)", async () => {
    const { dispatchGuideAssignmentEmails } = await import("@/lib/guide-notify.server");
    queue("r1", "assignment_removed", "old"); queue("r2", "assignment_new", "new");
    await dispatchGuideAssignmentEmails("b1");
    expect(db.sends.map((s) => s.text.split("\n")[0])).toEqual(["Tour removed from your schedule", "New tour assigned"]);
    expect(migrations).toMatch(/SET removed_at = now\(\), status = 'removed' WHERE id = old\.id/);
  });

  it("material schedule change and cancellation queue one notice each", () => {
    expect(migrations).toMatch(/'assignment_updated', 'Assignment updated'/);
    expect(migrations).toMatch(/AFTER UPDATE OF preferred_date, start_time, pickup_location, status, cancelled_at/);
    expect(migrations).toMatch(/'removed_on_cancel'/);
  });

  it("notifications carry operational facts only", () => {
    for (const kind of ["assignment_new", "assignment_updated", "assignment_removed"] as const) {
      const m = guideNotifyMessage(kind, { assignmentId: "x", preferredDate: "2026-10-12", startTime: "09:00:00", tourTitle: "Sintra day", guestName: "Ana", guests: 2, pickup: "Hotel Avenida" });
      expect(m.text).not.toMatch(FINANCE);
      expect(m.subject).not.toMatch(FINANCE);
    }
    expect(guideNotifyMessage("assignment_new", { assignmentId: "x", preferredDate: null, startTime: null, tourTitle: null, guestName: null, guests: null, pickup: null }).text).toMatch(/guide\/tours\/x/);
  });

  it("Guide App has no confirm/decline controls", () => {
    const src = read("src/routes/guide.tours.$assignmentId.tsx") + read("src/components/guide/TourCard.tsx");
    expect(src).not.toMatch(/guide_confirm_assignment|guide_decline_assignment|Confirm assignment|Decline|Please confirm/);
    expect(src).toMatch(/guide_report_issue/);
  });

  it("Operations has no awaiting-confirmation logic", () => {
    const src = read("src/routes/admin.index.tsx") + read("src/components/admin/ops/BookingListRow.tsx") + read("src/routes/admin.bookings.$id.tsx") + read("src/routes/admin.guides.$id.tsx");
    expect(src).not.toMatch(/not confirmed|Guide declined|awaiting guide confirmation|assignment_status === "confirmed"/i);
    expect(guideAssignmentAttention({ guide_id: null })).toEqual(["No guide"]);
    expect(guideAssignmentAttention({ guide_id: null, legacy_guide_id: "g" })).toEqual(["Assignment conflict — reassign"]);
    expect(guideAssignmentAttention({ guide_id: "g" }, { active: false, email: "" })).toEqual(["Guide inactive", "Guide has no email — cannot be notified"]);
    expect(guideAssignmentAttention({ guide_id: "g" }, { active: true, email: "a@b.c" })).toEqual([]);
  });
});
