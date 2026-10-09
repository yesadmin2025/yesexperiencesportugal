/**
 * Admin-entered bookings (phone, email, partner or walk-in). One row in
 * `bookings` — the same source of truth as website/partner bookings — then the
 * existing least-busy-free-guide auto-assignment.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signatureTours } from "@/data/signatureTours";
import { isCanonicalPaymentHost } from "@/lib/payments-environment";

const input = z.object({
  tourId: z.string().trim().max(120).optional().nullable(),
  tourTitle: z.string().trim().max(200).optional().nullable(),
  date: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  pickup: z.string().trim().min(2).max(300),
  guests: z.number().int().min(1).max(50),
  language: z.string().trim().max(40).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  channel: z.enum(["DIRECT", "VIATOR", "GETYOURGUIDE", "BOKUN"]),
  reference: z.string().trim().max(120).optional().nullable(),
  amountEuros: z.number().min(0).max(100000),
  paid: z.boolean(),
});

export const createManualBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || isAdmin !== true) throw new Error("Forbidden");

    const tour = data.tourId ? signatureTours.find((t) => t.id === data.tourId) : null;
    const title = tour?.title ?? data.tourTitle ?? null;
    if (!title) throw new Error("Choose a tour or type its name.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        booking_type: "signature",
        source: "ADMIN",
        source_channel: data.channel,
        external_booking_ref: data.reference || null,
        source_tour_id: tour?.id ?? null,
        tour_title: title,
        preferred_date: data.date,
        start_time: data.startTime || null,
        pickup_location: data.pickup,
        guests: data.guests,
        language: data.language || null,
        customer_name: data.name,
        customer_email: data.email.toLowerCase(),
        customer_phone: data.phone || null,
        client_notes: data.notes || null,
        amount_total: Math.round(data.amountEuros * 100),
        currency: "eur",
        status: data.paid ? "paid" : "pending",
        payment_status: data.paid ? "PAID" : null,
        metadata: { created_by: context.userId, created_via: "admin_manual" },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: gid, error: autoErr } = await context.supabase.rpc("ops_auto_assign_guide", { _booking_id: row.id });
    if (autoErr) console.error("auto-assign failed", autoErr.message);
    if (gid) { try { const { dispatchGuideAssignmentEmails } = await import("@/lib/guide-notify.server"); await dispatchGuideAssignmentEmails(row.id); } catch (e) { console.error("guide notify failed", e); } }
    return { id: row.id as string, assignedGuideId: (gid as string | null) ?? null };
  });
