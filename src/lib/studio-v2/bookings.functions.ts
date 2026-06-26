/**
 * Studio v2 — bespoke booking drafts.
 *
 * Persists the refined custom itinerary (real stops from `builder_stops`)
 * with a secret `draft_token`. The Secure CTA opens `/checkout/$token`,
 * which is the only way to retrieve a draft (no enumeration possible).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function randomToken(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const stopSchema = z.object({
  key: z.string().min(1).max(96),
  region_key: z.string().max(64),
  label: z.string().max(200),
  blurb: z.string().max(2000).nullable().optional(),
  tag: z.string().max(64).nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  duration_minutes: z.number().int().min(0).max(480),
  source_tour_keys: z.array(z.string().max(96)).max(20).default([]),
});

const createSchema = z.object({
  profile: z.record(z.string(), z.any()),
  region: z.string().max(32).optional(),
  archetype: z.string().max(32).optional(),
  stops: z.array(stopSchema).min(1).max(12),
  totalMinutes: z.number().int().min(0).max(2880),
  totalDriveMinutes: z.number().int().min(0).max(720),
  totalKm: z.number().int().min(0).max(2000),
});

export const createCustomBookingDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data }) => {
    const draftToken = randomToken(24);
    const { error } = await supabaseAdmin.from("studio_v2_bookings").insert({
      draft_token: draftToken,
      profile: data.profile,
      region: data.region ?? null,
      archetype: data.archetype ?? null,
      stops: data.stops,
      total_minutes: data.totalMinutes,
      total_drive_minutes: data.totalDriveMinutes,
      total_km: data.totalKm,
      status: "draft",
    });
    if (error) throw new Error(error.message);
    return { draftToken };
  });

const getSchema = z.object({ draftToken: z.string().min(8).max(96) });

export const getCustomBookingDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("studio_v2_bookings")
      .select(
        "draft_token, profile, region, archetype, stops, total_minutes, total_drive_minutes, total_km, status, contact_name, contact_email, contact_phone, preferred_date, guests, notes, created_at",
      )
      .eq("draft_token", data.draftToken)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { draft: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { draft: row as any };
  });

const confirmSchema = z.object({
  draftToken: z.string().min(8).max(96),
  contactName: z.string().min(1).max(120),
  contactEmail: z.string().email().max(160),
  contactPhone: z.string().max(40).optional(),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  guests: z.number().int().min(1).max(40),
  notes: z.string().max(2000).optional(),
});

export const confirmCustomBookingDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => confirmSchema.parse(input))
  .handler(async ({ data }) => {
    // Load the draft (need stops/timings for the confirmation email).
    const { data: draft, error: loadErr } = await supabaseAdmin
      .from("studio_v2_bookings")
      .select(
        "draft_token, region, archetype, stops, total_minutes, total_drive_minutes, total_km, status",
      )
      .eq("draft_token", data.draftToken)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!draft) throw new Error("Draft not found.");

    const { error } = await supabaseAdmin
      .from("studio_v2_bookings")
      .update({
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone ?? null,
        preferred_date: data.preferredDate ?? null,
        guests: data.guests,
        notes: data.notes ?? null,
        status: "submitted",
      })
      .eq("draft_token", data.draftToken)
      .eq("status", "draft");
    if (error) throw new Error(error.message);

    // Fire-and-forget confirmation email; never block the booking on email.
    try {
      const { sendTransactionalInternal } = await import("@/lib/email/send-internal.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stops = ((draft.stops as any[]) ?? []).map((s) => ({
        label: String(s?.label ?? ""),
        tag: s?.tag ?? null,
        duration_minutes: typeof s?.duration_minutes === "number" ? s.duration_minutes : undefined,
      }));
      await sendTransactionalInternal({
        templateName: "booking-confirmation",
        recipientEmail: data.contactEmail,
        idempotencyKey: `booking-confirm-${data.draftToken}`,
        templateData: {
          contactName: data.contactName,
          preferredDate: data.preferredDate ?? null,
          guests: data.guests,
          region: draft.region ?? null,
          archetype: draft.archetype ?? null,
          totalMinutes: draft.total_minutes ?? 0,
          totalDriveMinutes: draft.total_drive_minutes ?? 0,
          totalKm: draft.total_km ?? 0,
          stops,
          notes: data.notes ?? null,
        },
      });
    } catch (e) {
      console.error("[bookings] failed to enqueue confirmation email", e);
    }

    return { ok: true };
  });
