/**
 * Guides directory + guide-brief dispatch.
 *
 * Admin-only. The brief is assembled server-side from the stored booking
 * record so a price can never leak into it, and every dispatch is audited on
 * the booking's metadata.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  buildGuideBrief,
  guideBriefHtml,
  guideBriefText,
  guideDayText,
  type GuideBrief,
  type GuideBriefRow,
} from "@/lib/guide-brief";
import { signatureTours } from "@/data/signatureTours";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

const tourTitle = (id: string | null) =>
  (id ? signatureTours.find((t) => t.id === id)?.title : null) ?? null;

export const listGuides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("guides")
      .select("id, name, email, phone, notes, active")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { guides: data ?? [] };
  });

const guideInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().default(true),
});

export const saveGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => guideInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      active: data.active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("guides").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("guides")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("guides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BRIEF_COLUMNS =
  "id, source_tour_id, customer_name, customer_email, customer_phone, guests, preferred_date, notes, status, stripe_session_id, booking_details";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asBriefRow = (row: any): GuideBriefRow => row as GuideBriefRow;

/** Preview text for one booking or for a whole date. Never contains money. */
export const getGuideBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bookingId: z.string().uuid().optional(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        tourId: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.bookingId) {
      const { data: row, error } = await supabaseAdmin
        .from("bookings")
        .select(BRIEF_COLUMNS)
        .eq("id", data.bookingId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Booking not found.");
      const brief = buildGuideBrief(asBriefRow(row), tourTitle(row.source_tour_id));
      return { title: `${brief.experience} · ${brief.date}`, text: guideBriefText(brief), count: 1 };
    }

    if (!data.date) throw new Error("Choose a booking or a date.");
    let query = supabaseAdmin
      .from("bookings")
      .select(BRIEF_COLUMNS)
      .eq("preferred_date", data.date)
      .in("status", ["paid", "pending"]);
    if (data.tourId) query = query.eq("source_tour_id", data.tourId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const briefs: GuideBrief[] = (rows ?? []).map((row) =>
      buildGuideBrief(asBriefRow(row), tourTitle(row.source_tour_id)),
    );
    if (briefs.length === 0) throw new Error("No reservations on this date.");
    return {
      title: `Guide brief · ${data.date}`,
      text: briefs.length === 1 ? guideBriefText(briefs[0]!) : guideDayText(data.date, briefs),
      count: briefs.length,
    };
  });

const sendInput = z.object({
  bookingId: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tourId: z.string().max(120).optional(),
  guideId: z.string().uuid().optional(),
  guideName: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200),
});

/** Emails the brief to the guide through the internal mail pipeline. */
export const sendGuideBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const selectRows = async () => {
      if (data.bookingId) {
        const { data: row, error } = await supabaseAdmin
          .from("bookings")
          .select(BRIEF_COLUMNS)
          .eq("id", data.bookingId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return row ? [row] : [];
      }
      if (!data.date) throw new Error("Choose a booking or a date.");
      let query = supabaseAdmin
        .from("bookings")
        .select(BRIEF_COLUMNS)
        .eq("preferred_date", data.date)
        .in("status", ["paid", "pending"]);
      if (data.tourId) query = query.eq("source_tour_id", data.tourId);
      const { data: rows, error } = await query;
      if (error) throw new Error(error.message);
      return rows ?? [];
    };

    const rows = await selectRows();
    if (rows.length === 0) throw new Error("Nothing to send for this selection.");
    const briefs = rows.map((row) => buildGuideBrief(asBriefRow(row), tourTitle(row.source_tour_id)));
    const dateLabel = data.date ?? briefs[0]!.date;
    const title =
      briefs.length === 1 ? `${briefs[0]!.experience} · ${briefs[0]!.date}` : `Guide brief · ${dateLabel}`;
    const text = briefs.length === 1 ? guideBriefText(briefs[0]!) : guideDayText(dateLabel, briefs);

    const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
    const keySeed = `${data.bookingId ?? `${dateLabel}-${data.tourId ?? "all"}`}-${data.email}-${briefs.length}`;
    const result = await sendTransactionalInternal({
      templateName: "guide-brief",
      recipientEmail: data.email,
      idempotencyKey: `guide-brief-${keySeed}`,
      rendered: { subject: title, html: guideBriefHtml(title, text), text },
    });

    // Audit each reservation the guide was briefed on.
    const entry = {
      at: new Date().toISOString(),
      by: context.userId,
      to: data.email,
      guide_id: data.guideId ?? null,
      guide_name: data.guideName ?? null,
      channel: "email",
    };
    for (const row of rows) {
      const { data: current } = await supabaseAdmin
        .from("bookings")
        .select("metadata")
        .eq("id", row.id)
        .maybeSingle();
      const previous =
        current?.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
          ? (current.metadata as Record<string, unknown>)
          : {};
      const prior = Array.isArray(previous["guide_dispatches"])
        ? (previous["guide_dispatches"] as Json[])
        : [];
      await supabaseAdmin
        .from("bookings")
        .update({
          metadata: { ...previous, guide_dispatches: [...prior, entry] } as Json,
        })
        .eq("id", row.id);
    }

    return { ok: result.ok, count: briefs.length };
  });
