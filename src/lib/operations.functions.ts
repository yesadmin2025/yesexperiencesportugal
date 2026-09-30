/**
 * Operations (admin) — scheduling, assignment, notes, availability.
 * Every call runs as the signed-in admin (RLS + in-function admin checks);
 * conflicts are enforced by the database, never by this layer.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canonicalizeAll, type ActiveAssignment, type RawBooking } from "@/lib/ops/booking-read-model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

function fail(error: { message?: string } | null) {
  if (error) throw new Error(error.message ?? "Request failed");
}

export const getOperationsBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ from: z.string().date(), to: z.string().date() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [bookings, guides, assignments, availability, recurring, notes, notifications, issues, log] =
      await Promise.all([
        sb
          .from("bookings")
          .select(
            "id, tour_title, source_tour_id, preferred_date, start_time, guests, customer_name, pickup_location, language, status, payment_status, source_channel, stripe_session_id, external_booking_ref, metadata, cancelled_at, client_notes, assigned_guide_id",
          )
          .gte("preferred_date", data.from)
          .lte("preferred_date", data.to)
          .in("status", ["paid", "pending"])
          .order("preferred_date", { ascending: true }),
        sb
          .from("guides")
          .select("id, name, email, phone, whatsapp, languages, active, user_id, vehicle_available, vehicle_capacity")
          .order("name"),
        sb
          .from("tour_assignments")
          .select("*")
          .is("removed_at", null)
          .gte("start_at", `${data.from}T00:00:00Z`)
          .lte("start_at", `${data.to}T23:59:59Z`),
        sb
          .from("guide_availability")
          .select("*")
          .lte("start_at", `${data.to}T23:59:59Z`)
          .gte("end_at", `${data.from}T00:00:00Z`),
        sb.from("guide_recurring_availability").select("*"),
        sb.from("operational_notes").select("*").order("created_at", { ascending: false }).limit(500),
        sb.from("ops_notifications").select("*").order("created_at", { ascending: false }).limit(300),
        sb.from("guide_issue_reports").select("*").eq("status", "open").order("created_at", { ascending: false }),
        sb.from("operational_activity_log").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
    for (const r of [bookings, guides, assignments, availability, recurring, notes, notifications, issues, log]) fail(r.error);
    const bookingRows = (bookings.data ?? []) as unknown as RawBooking[];
    const ids = bookingRows.map((b) => b.id);
    const active = ids.length
      ? await sb.from("tour_assignments").select("id, booking_id, guide_id, status").is("removed_at", null).in("booking_id", ids)
      : { data: [], error: null };
    fail(active.error);
    return {
      bookings: canonicalizeAll(bookingRows, (active.data ?? []) as ActiveAssignment[]),
      guides: guides.data ?? [],
      assignments: assignments.data ?? [],
      availability: availability.data ?? [],
      recurring: recurring.data ?? [],
      notes: notes.data ?? [],
      notifications: notifications.data ?? [],
      issues: issues.data ?? [],
      log: log.data ?? [],
    };
  });

export const assignGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid(), guideId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: assignmentId, error } = await context.supabase.rpc("ops_assign_guide", {
      _booking_id: data.bookingId,
      _guide_id: data.guideId,
    });
    fail(error);

    // Notify the guide once per new assignment (email if an address exists;
    // the in-app notification is written by the database). Operational only.
    let emailed = false;
    let whatsappUrl: string | null = null;
    try {
      const { dispatchGuideAssignmentEmails } = await import("@/lib/guide-notify.server");
      emailed = (await dispatchGuideAssignmentEmails(data.bookingId)) > 0;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { guideNotifyMessage } = await import("@/lib/guide-notify");
      const [{ data: guide }, { data: row }] = await Promise.all([
        supabaseAdmin.from("guides").select("phone, whatsapp").eq("id", data.guideId).maybeSingle(),
        supabaseAdmin.from("bookings").select("preferred_date, start_time, tour_title, source_tour_id, customer_name, guests, pickup_location").eq("id", data.bookingId).maybeSingle(),
      ]);
      const digits = (guide?.whatsapp || guide?.phone || "").replace(/\D/g, "");
      if (digits && row) {
        const { text } = guideNotifyMessage("assignment_new", {
          assignmentId: (assignmentId as string | null) ?? null, preferredDate: row.preferred_date, startTime: row.start_time,
          tourTitle: row.tour_title ?? row.source_tour_id, guestName: row.customer_name, guests: row.guests, pickup: row.pickup_location,
        });
        whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
      }
    } catch (e) {
      console.error("assignment notification failed", e);
    }
    return { ok: true, emailed, whatsappUrl };
  });

export const removeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("ops_remove_assignment", { _booking_id: data.bookingId });
    fail(error);
    try { const { dispatchGuideAssignmentEmails } = await import("@/lib/guide-notify.server"); await dispatchGuideAssignmentEmails(data.bookingId); } catch (e) { console.error("guide notify failed", e); }
    return { ok: true };
  });

export const addOperationalNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        bookingId: z.string().uuid(),
        note: z.string().trim().min(1).max(4000),
        priority: z.enum(["normal", "important", "critical"]),
        notify: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("ops_add_note", {
      _booking_id: data.bookingId,
      _note: data.note,
      _priority: data.priority,
      _notify: data.notify,
    });
    fail(error);
    return { ok: true };
  });

export const setGuideAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        guideId: z.string().uuid(),
        date: z.string().date(),
        status: z.enum(["available", "unavailable", "vacation", "partial"]),
        note: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const start = `${data.date}T00:00:00+00:00`;
    const next = new Date(`${data.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const end = next.toISOString();
    fail((await sb.from("guide_availability").delete().eq("guide_id", data.guideId).eq("start_at", start)).error);
    fail(
      (
        await sb.from("guide_availability").insert({
          guide_id: data.guideId,
          start_at: start,
          end_at: end,
          status: data.status,
          note: data.note ?? null,
          created_by: context.userId,
        })
      ).error,
    );
    return { ok: true };
  });

export const resolveIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    fail(
      (
        await context.supabase
          .from("guide_issue_reports")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("id", data.id)
      ).error,
    );
    return { ok: true };
  });

export const resendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const { data: a, error } = await sb
      .from("tour_assignments")
      .select("id, guide_id")
      .eq("booking_id", data.bookingId)
      .is("removed_at", null)
      .maybeSingle();
    fail(error);
    if (!a) throw new Error("No guide assigned");
    fail(
      (
        await sb.from("ops_notifications").insert({
          guide_id: a.guide_id,
          booking_id: data.bookingId,
          assignment_id: a.id,
          notification_type: "reminder",
          title: "Please confirm your tour",
        })
      ).error,
    );
    return { ok: true };
  });
