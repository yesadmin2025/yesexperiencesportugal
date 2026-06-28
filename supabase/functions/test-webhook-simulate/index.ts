// Admin-only: simulate a checkout.session.completed event to validate the
// booking insert + Bokun push pipeline without configuring Stripe Dashboard.
//
// Auth: requires a signed-in user with the `admin` role in user_roles.
// Body: { tour_id?: string, date_exact?: string, guests?: number,
//         customer_email?: string, customer_name?: string,
//         booking_type?: 'signature'|'builder'|'moment',
//         skip_bokun?: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getActivityAvailabilities,
  reserveAndConfirm,
  type AvailabilitySlot,
} from "../_shared/bokun.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify caller is an admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user)
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return new Response("Forbidden", { status: 403, headers: corsHeaders });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }

  const bookingType = (body.booking_type as string) ?? "signature";
  const tourId = (body.tour_id as string) ?? "arrabida-boat";
  const guests = Math.max(1, Number(body.guests ?? 2));
  const dateExact =
    (body.date_exact as string) ??
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const customerEmail = (body.customer_email as string) ?? userData.user.email ?? "test@yesexperiencesportugal.com";
  const customerName = (body.customer_name as string) ?? "Test Customer";
  const skipBokun = body.skip_bokun === true;
  const checkOnly = body.check_only === true;

  // PREVIEW MODE: just query Bokun availability and return — no booking insert.
  if (checkOnly) {
    try {
      const { data: mapping } = await admin
        .from("tour_bokun_mapping")
        .select("bokun_product_id")
        .eq("tour_id", tourId)
        .maybeSingle();
      if (!mapping?.bokun_product_id) {
        return new Response(
          JSON.stringify({ ok: true, preview: true, mapped: false, slots: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const slots = (await getActivityAvailabilities(
        mapping.bokun_product_id,
        dateExact,
      )) as AvailabilitySlot[];
      const usable = slots.filter((s) => (s.availabilityCount ?? 1) >= guests);
      return new Response(
        JSON.stringify({
          ok: true,
          preview: true,
          mapped: true,
          bokun_product_id: mapping.bokun_product_id,
          tour_id: tourId,
          date: dateExact,
          guests,
          slot_count: slots.length,
          usable_count: usable.length,
          slots: slots.map((s) => ({
            id: s.id,
            startTime: s.startTime,
            date: s.date,
            availabilityCount: s.availabilityCount,
            enough_capacity: (s.availabilityCount ?? 1) >= guests,
            pricing_category: s.pricingCategories?.[0]?.title ?? null,
            pricing_categories: (s.pricingCategories ?? []).map((c) => ({
              id: c.id,
              title: c.title,
            })),
          })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e) {
      return new Response(
        JSON.stringify({
          ok: false,
          preview: true,
          error: e instanceof Error ? e.message : String(e),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }


  const fakeSessionId = `cs_test_sim_${crypto.randomUUID().replace(/-/g, "")}`;
  const meta = {
    booking_type: bookingType,
    tour_id: tourId,
    guests: String(guests),
    date_exact: dateExact,
    stripe_env: "simulated",
    event_id: `evt_sim_${crypto.randomUUID().slice(0, 8)}`,
    simulated_by: userData.user.email ?? userData.user.id,
  };

  const baseRow = {
    booking_type: bookingType,
    source_tour_id: tourId,
    customer_email: customerEmail,
    customer_name: customerName,
    customer_phone: null,
    guests,
    preferred_date: dateExact,
    amount_total: 50000, // €500.00 simulated
    currency: "eur",
    status: "paid",
    stripe_session_id: fakeSessionId,
    stripe_payment_intent_id: null,
    metadata: meta,
  };

  const { data: ins, error: insErr } = await admin
    .from("bookings")
    .insert(baseRow)
    .select("id")
    .single();
  if (insErr) {
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const bookingId = ins.id as string;

  let bokunResult: { status: string; booking_id?: string; confirmation?: string; error?: string } = {
    status: "skipped",
  };

  if (!skipBokun && bookingType === "signature") {
    try {
      const { data: mapping } = await admin
        .from("tour_bokun_mapping")
        .select("bokun_product_id")
        .eq("tour_id", tourId)
        .maybeSingle();
      if (!mapping?.bokun_product_id) {
        bokunResult = { status: "needs_review", error: "No Bokun mapping for this tour" };
      } else {
        const slots = (await getActivityAvailabilities(
          mapping.bokun_product_id,
          dateExact,
        )) as AvailabilitySlot[];
        const usable = slots.filter((s) => (s.availabilityCount ?? 1) >= guests);
        const requestedSlotId = body.availability_id != null ? Number(body.availability_id) : null;
        let chosen: AvailabilitySlot | undefined;
        if (requestedSlotId != null) {
          chosen = usable.find((s) => s.id === requestedSlotId);
          if (!chosen) {
            bokunResult = {
              status: "needs_review",
              error: `Selected slot ${requestedSlotId} not available for ${guests} guests on ${dateExact}`,
            };
          }
        } else if (usable.length === 0) {
          bokunResult = {
            status: "needs_review",
            error: `No Bokun availability on ${dateExact} for ${guests} guests`,
          };
        } else if (usable.length > 1) {
          bokunResult = {
            status: "needs_review",
            error: `Multiple Bokun slots on ${dateExact} (${usable.length}) — pick one manually`,
          };
        } else {
          chosen = usable[0];
        }
        if (chosen) {
          const slot = chosen;
          const requestedCatId = body.pricing_category_id != null ? Number(body.pricing_category_id) : null;
          const cat =
            (requestedCatId != null
              ? slot.pricingCategories?.find((c) => c.id === requestedCatId)
              : undefined) ?? slot.pricingCategories?.[0];
          if (!cat) {
            bokunResult = { status: "needs_review", error: "Bokun slot has no pricing category" };
          } else {
            // SAFETY: simulation should not create a live Bokun booking unless
            // the caller explicitly asks. Default = dry run.
            if (body.really_book_bokun === true) {
              const [firstName, ...rest] = customerName.split(" ");
              const lastName = rest.join(" ") || "—";
              const r = await reserveAndConfirm({
                productId: mapping.bokun_product_id,
                availabilityId: slot.id,
                startTime: slot.startTime,
                date: slot.date,
                guests,
                pricingCategoryId: cat.id,
                customer: {
                  firstName,
                  lastName,
                  email: customerEmail,
                  language: "EN",
                },
                externalBookingReference: fakeSessionId,
                notes: "YES Studio · SIMULATION via /admin/bookings",
              });
              bokunResult = {
                status: "confirmed",
                booking_id: r.bookingId,
                confirmation: r.confirmationCode,
              };
            } else {
              bokunResult = {
                status: "needs_review",
                error: `DRY RUN — slot OK (id=${slot.id}, ${slot.availabilityCount} seats). Pass really_book_bokun:true to actually reserve.`,
              };
            }
          }
        }
      }
    } catch (e) {
      bokunResult = { status: "failed", error: e instanceof Error ? e.message : String(e) };
    }
  }

  await admin
    .from("bookings")
    .update({
      bokun_status: bokunResult.status,
      bokun_booking_id: bokunResult.booking_id ?? null,
      bokun_confirmation_code: bokunResult.confirmation ?? null,
      bokun_error: bokunResult.error ?? null,
      bokun_last_attempt_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  return new Response(
    JSON.stringify({
      ok: true,
      bookingId,
      stripe_session_id: fakeSessionId,
      bokun: bokunResult,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
