// Stripe webhook → records the booking in Supabase, attempts Bokun push for Signatures.
// One endpoint serves BOTH sandbox and live; both webhook secrets are tried so Stripe
// can post from either mode to the same URL.
//
// Required secrets:
//   STRIPE_LIVE_API_KEY, STRIPE_SANDBOX_API_KEY        (already set)
//   STRIPE_WEBHOOK_SECRET_LIVE                          (whsec_… from live endpoint)
//   STRIPE_WEBHOOK_SECRET_SANDBOX                       (whsec_… from sandbox endpoint)
//   BOKUN_ACCESS_KEY, BOKUN_SECRET_KEY                  (already set)

import Stripe from "https://esm.sh/stripe@22.0.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import {
  getActivityAvailabilities,
  reserveAndConfirm,
  confirmReservation,
  releaseReservation,
  type AvailabilitySlot,
} from "../_shared/bokun.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400, headers: corsHeaders });

  const rawBody = await req.text();

  // Try live first, then sandbox; whichever verifies wins and sets the env.
  const candidates: Array<{ env: StripeEnv; secret: string | undefined }> = [
    { env: "live", secret: Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE") },
    { env: "live", secret: Deno.env.get("STRIPE_WEBHOOK_SECRET") },
    { env: "sandbox", secret: Deno.env.get("STRIPE_WEBHOOK_SECRET_SANDBOX") },
  ];

  let event: Stripe.Event | null = null;
  let stripeEnv: StripeEnv | null = null;
  let lastError = "";
  for (const c of candidates) {
    if (!c.secret) continue;
    try {
      const stripe = createStripeClient(c.env);
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, c.secret);
      stripeEnv = c.env;
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const logEvent = async (row: Record<string, unknown>) => {
    try {
      await admin.from("stripe_webhook_events").insert(row);
    } catch (e) {
      console.error("Failed to log webhook event:", e);
    }
  };

  if (!event || !stripeEnv) {
    const diag = candidates
      .map((c, i) => {
        const s = c.secret ?? "";
        const name = [
          "STRIPE_WEBHOOK_SECRET_LIVE",
          "STRIPE_WEBHOOK_SECRET",
          "STRIPE_WEBHOOK_SECRET_SANDBOX",
        ][i];
        return `${name}: ${s ? `present len=${s.length} prefix=${s.slice(0, 8)}` : "missing"}`;
      })
      .join(" | ");
    const sigPrefix = sig.slice(0, 40);
    console.error(
      "Webhook signature verification failed:",
      lastError,
      "| diag:",
      diag,
      "| sig:",
      sigPrefix,
      "| bodyLen:",
      rawBody.length,
    );
    await logEvent({
      verified: false,
      status_code: 400,
      error_message: lastError || "signature verification failed",
      metadata: { diag, sig_prefix: sigPrefix, body_len: rawBody.length },
    });
    return new Response(`Invalid signature: ${lastError}`, { status: 400, headers: corsHeaders });
  }

  const sessionPreview = event.data.object as Stripe.Checkout.Session;
  const baseLog = {
    event_id: event.id,
    event_type: event.type,
    stripe_env: stripeEnv,
    verified: true,
    session_id: sessionPreview?.id ?? null,
    payment_status: sessionPreview?.payment_status ?? null,
    amount_total: sessionPreview?.amount_total ?? null,
    currency: sessionPreview?.currency ?? null,
    customer_email:
      sessionPreview?.customer_details?.email ?? sessionPreview?.customer_email ?? null,
    booking_type: (sessionPreview?.metadata?.booking_type as string) ?? null,
    metadata: sessionPreview?.metadata ?? null,
  };

  // Expired Stripe Checkout Session: atomically release any provisional Bókun
  // reservation for this quote. The conditional UPDATE (state = 'checkout-created')
  // acts as a single-writer claim — duplicate expiry deliveries update 0 rows and
  // never call releaseReservation twice, and an expiry that arrives after a
  // successful confirmation (state = 'confirmed') is a no-op.
  if (event.type === "checkout.session.expired") {
    const expiredSession = event.data.object as Stripe.Checkout.Session;
    const quoteId = (expiredSession.metadata as Record<string, string> | null)?.quote_id ?? null;
    await logEvent({ ...baseLog, status_code: 200, error_message: "checkout.session.expired" });
    if (!quoteId) {
      return new Response(
        JSON.stringify({ received: true, ignored: "expired_no_quote_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const nowIso = new Date().toISOString();
    const { data: claimed } = await admin
      .from("booking_quotes")
      .update({ state: "expired", expired_at: nowIso })
      .eq("quote_id", quoteId)
      .eq("state", "checkout-created")
      .select("quote_id, bokun_reservation_id")
      .maybeSingle();
    if (!claimed) {
      return new Response(
        JSON.stringify({ received: true, released: false, reason: "not_in_checkout_created" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!claimed.bokun_reservation_id) {
      return new Response(
        JSON.stringify({ received: true, released: false, reason: "no_reservation_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let releaseResult: { status: string; code?: string; at: string };
    try {
      const ok = await releaseReservation(String(claimed.bokun_reservation_id));
      releaseResult = { status: ok ? "released" : "already_expired", at: nowIso };
    } catch (e) {
      // releaseReservation is best-effort/never-throws; guard for safety.
      const msg = e instanceof Error ? e.message : String(e);
      releaseResult = { status: "failed", code: msg.slice(0, 120), at: nowIso };
    }
    await admin
      .from("booking_quotes")
      .update({ bokun_release_result: releaseResult })
      .eq("quote_id", claimed.quote_id);
    return new Response(
      JSON.stringify({ received: true, released: true, result: releaseResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Idempotency: ignore non-checkout events quickly.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    await logEvent({ ...baseLog, status_code: 200, error_message: "ignored (non-checkout)" });
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    await logEvent({
      ...baseLog,
      status_code: 200,
      error_message: `unpaid: ${session.payment_status}`,
    });
    return new Response(JSON.stringify({ received: true, status: session.payment_status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await logEvent({ ...baseLog, status_code: 200 });

  const meta = (session.metadata ?? {}) as Record<string, string>;
  const rawBookingType = meta.booking_type ?? "builder";
  const isV3 = rawBookingType === "booking-quote-v3";
  const flow = (meta.flow ?? "").toLowerCase(); // signature | tailored | tailor | studio
  const bookingType = (isV3 ? (flow === "studio" ? "studio" : "signature") : rawBookingType) as
    | "signature"
    | "builder"
    | "moment"
    | "studio";

  const guests = isV3
    ? Math.max(1, Number(meta.guests_total ?? 1))
    : Math.max(1, Number(meta.guests ?? 1));
  const dateExact = (meta.date_exact ?? "").trim() || null;
  const tourId = isV3
    ? (meta.commercial_product_key ?? meta.tour_id ?? null)
    : (meta.tour_id ?? null);
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const customerName = session.customer_details?.name ?? null;
  const customerPhone = session.customer_details?.phone ?? null;
  const amountTotal = session.amount_total ?? null;
  const currency = (session.currency ?? "eur").toLowerCase();

  // Upsert booking — unique on stripe_session_id.
  const { data: existing } = await admin
    .from("bookings")
    .select("id, bokun_status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  let bookingId = existing?.id as string | undefined;

  const baseRow = {
    booking_type: bookingType,
    source_tour_id: tourId,
    customer_email: customerEmail,
    customer_name: customerName,
    customer_phone: customerPhone,
    guests,
    preferred_date: dateExact,
    amount_total: amountTotal,
    currency,
    status: "paid",
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    metadata: {
      ...meta,
      stripe_env: stripeEnv,
      event_id: event.id,
      quote_contract: isV3 ? "booking-quote-v3" : "legacy",
    },
  } as const;

  if (!bookingId) {
    const { data: ins, error: insErr } = await admin
      .from("bookings")
      .insert(baseRow)
      .select("id")
      .single();
    if (insErr) {
      console.error("Failed to insert booking:", insErr);
      return new Response(`DB insert error: ${insErr.message}`, {
        status: 500,
        headers: corsHeaders,
      });
    }
    bookingId = ins.id as string;
  } else {
    await admin.from("bookings").update(baseRow).eq("id", bookingId);
  }

  // v3 unified flows (signature / tailored / studio) all push to Bokun.
  // Legacy builder/moment paths remain Stripe-only.
  if (!isV3 && (bookingType !== "signature" || !tourId)) {
    return new Response(JSON.stringify({ ok: true, bookingId, bokun: "skipped" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Avoid double-push if a previous attempt already succeeded.
  if (existing?.bokun_status === "confirmed") {
    return new Response(JSON.stringify({ ok: true, bookingId, bokun: "already_confirmed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Attempt Bokun push (non-blocking for Stripe — we always 200 after recording).
  let bokunResult: {
    status: string;
    booking_id?: string;
    confirmation?: string;
    error?: string;
  } = { status: "skipped" };

  // Non-2xx override for retryable Bókun-confirm failures: Stripe's redelivery
  // is our durable retry, so we must NOT ack 200 when confirmation failed.
  let retryHttpStatus: number | null = null;

  try {
    // v3 booking-quote flow: three-phase state machine with recoverable lease.
    //   reserved | checkout-created  →  paid  →  confirming  →  confirmed
    // Only the webhook winning the atomic paid→confirming claim calls Bókun.
    // Concurrent duplicates return 503 so Stripe redelivers if the active
    // worker crashes; a stale `confirming` lease may be reclaimed exactly
    // once by a conditional atomic update.
    if (isV3) {
      const CONFIRM_LEASE_MS = 3 * 60 * 1000; // 3 minutes
      const quoteId = meta.quote_id ?? null;
      let expectedTotalEur: number | null = null;
      let storedQuoteRow: Record<string, unknown> | null = null;

      if (quoteId) {
        const { data: q } = await admin
          .from("booking_quotes")
          .select("*")
          .eq("quote_id", quoteId)
          .maybeSingle();
        storedQuoteRow = q ?? null;
        if (q?.final_total_eur != null) expectedTotalEur = Number(q.final_total_eur);
      }

      // Parity: Stripe amount (in cents) must equal final_total_eur.
      if (expectedTotalEur != null && amountTotal != null) {
        const expectedCents = Math.round(expectedTotalEur * 100);
        if (amountTotal !== expectedCents) {
          bokunResult = {
            status: "needs_review",
            error: `amount_parity_mismatch:stripe=${amountTotal}c expected=${expectedCents}c`,
          };
          throw new Error(bokunResult.error);
        }
      }

      const bokunReservationId =
        (storedQuoteRow?.bokun_reservation_id as string | null) ??
        meta.bokun_reservation_id ??
        null;

      const mirrorAlreadyConfirmed = async () => {
        if (!storedQuoteRow?.bokun_reservation_id) return;
        await admin
          .from("bookings")
          .update({
            bokun_status: "confirmed",
            bokun_booking_id: String(storedQuoteRow.bokun_reservation_id),
            bokun_reservation_id: String(storedQuoteRow.bokun_reservation_id),
            quote_id: String(storedQuoteRow.quote_id),
            final_total_eur: Number(storedQuoteRow.final_total_eur),
            bokun_base_subtotal_eur:
              (storedQuoteRow.bokun_base_subtotal_eur as number | null) ?? null,
            database_addon_subtotal_eur:
              (storedQuoteRow.database_addon_subtotal_eur as number | null) ?? null,
          })
          .eq("id", bookingId);
      };

      if (!quoteId) {
        bokunResult = { status: "needs_review", error: "no_quote_id_in_metadata" };
      } else if (!bokunReservationId) {
        bokunResult = { status: "needs_review", error: "no_reservation_id_on_quote" };
      } else {
        const nowIso = new Date().toISOString();

        // ── Phase A: atomic reserved|checkout-created → paid.
        await admin
          .from("booking_quotes")
          .update({ state: "paid", paid_at: nowIso })
          .eq("quote_id", quoteId)
          .in("state", ["reserved", "checkout-created"])
          .select("quote_id")
          .maybeSingle();

        // Re-read authoritative state after Phase A.
        const { data: current } = await admin
          .from("booking_quotes")
          .select(
            "quote_id, state, bokun_reservation_id, final_total_eur, bokun_base_subtotal_eur, database_addon_subtotal_eur, confirming_at, confirm_attempts",
          )
          .eq("quote_id", quoteId)
          .maybeSingle();

        const currentState = current?.state as string | undefined;

        if (currentState === "confirmed") {
          await mirrorAlreadyConfirmed();
          return new Response(
            JSON.stringify({ ok: true, bookingId, bokun: "already_confirmed", idempotent: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (
          currentState === "expired" ||
          currentState === "cancelled" ||
          currentState === "failed"
        ) {
          bokunResult = {
            status: "needs_review",
            error: `quote_state_terminal:${currentState}`,
          };
        } else if (currentState !== "paid" && currentState !== "confirming") {
          bokunResult = {
            status: "needs_review",
            error: `quote_state_unexpected:${String(currentState)}`,
          };
        } else {
          // ── Phase B: single-writer claim paid → confirming.
          type ClaimRow = {
            bokun_reservation_id: string;
            final_total_eur: number | null;
            bokun_base_subtotal_eur: number | null;
            database_addon_subtotal_eur: number | null;
          };
          let claimed: ClaimRow | null = null;

          if (currentState === "paid") {
            const { data } = await admin
              .from("booking_quotes")
              .update({
                state: "confirming",
                confirming_at: new Date().toISOString(),
                confirm_attempts: (current?.confirm_attempts ?? 0) + 1,
              })
              .eq("quote_id", quoteId)
              .eq("state", "paid")
              .select(
                "bokun_reservation_id, final_total_eur, bokun_base_subtotal_eur, database_addon_subtotal_eur",
              )
              .maybeSingle();
            claimed = (data as ClaimRow | null) ?? null;
          }

          if (!claimed) {
            const leaseAgeMs = current?.confirming_at
              ? Date.now() - new Date(current.confirming_at as string).getTime()
              : Infinity;
            const isStale = leaseAgeMs >= CONFIRM_LEASE_MS;

            if (!isStale) {
              retryHttpStatus = 503;
              bokunResult = {
                status: "confirm_in_flight",
                error: `lease_active_age_ms=${Math.round(leaseAgeMs)}`,
              };
            } else {
              // Stale lease: exactly one webhook wins this conditional update.
              const { data: reclaimed } = await admin
                .from("booking_quotes")
                .update({
                  confirming_at: new Date().toISOString(),
                  confirm_attempts: (current?.confirm_attempts ?? 0) + 1,
                })
                .eq("quote_id", quoteId)
                .eq("state", "confirming")
                .eq("confirming_at", current!.confirming_at as string)
                .select(
                  "bokun_reservation_id, final_total_eur, bokun_base_subtotal_eur, database_addon_subtotal_eur",
                )
                .maybeSingle();
              if (reclaimed) {
                claimed = reclaimed as ClaimRow;
              } else {
                retryHttpStatus = 503;
                bokunResult = {
                  status: "confirm_in_flight",
                  error: "lease_reclaimed_by_other_worker",
                };
              }
            }
          }

          if (claimed) {
            try {
              const confirmed = await confirmReservation(String(claimed.bokun_reservation_id));

              // ── Phase C: confirming → confirmed. Conditional so we only
              // clear the lease we own.
              await admin
                .from("booking_quotes")
                .update({
                  state: "confirmed",
                  bokun_reservation_status: "confirmed",
                  confirmed_at: new Date().toISOString(),
                  confirming_at: null,
                  last_error: null,
                })
                .eq("quote_id", quoteId)
                .eq("state", "confirming");

              bokunResult = {
                status: "confirmed",
                booking_id: confirmed.bookingId,
                confirmation: confirmed.confirmationCode,
              };

              await admin
                .from("bookings")
                .update({
                  quote_id: quoteId,
                  bokun_reservation_id: String(claimed.bokun_reservation_id),
                  final_total_eur: expectedTotalEur,
                  bokun_base_subtotal_eur:
                    (claimed.bokun_base_subtotal_eur as number | null) ?? null,
                  database_addon_subtotal_eur:
                    (claimed.database_addon_subtotal_eur as number | null) ?? null,
                })
                .eq("id", bookingId);
            } catch (e) {
              // Retryable failure: revert confirming → paid, clear lease,
              // record sanitised error, return non-2xx so Stripe retries.
              // We never release the Bókun reservation here.
              const rawMsg = e instanceof Error ? e.message : String(e);
              const sanitised = rawMsg.slice(0, 240);
              await admin
                .from("booking_quotes")
                .update({
                  state: "paid",
                  confirming_at: null,
                  bokun_reservation_status: "confirm_failed",
                  last_error: sanitised,
                })
                .eq("quote_id", quoteId)
                .eq("state", "confirming");
              retryHttpStatus = 502;
              bokunResult = { status: "confirm_failed", error: sanitised };
            }
          }
        }
      }

    } else {
      // Legacy path (pre-reservation-spine): reserve+confirm at webhook time.
      // Retained for older Stripe sessions still in flight.
      let bokunProductId: string | null = null;
      const { data: mapping } = await admin
        .from("tour_bokun_mapping")
        .select("bokun_product_id")
        .eq("tour_id", tourId)
        .maybeSingle();
      bokunProductId = mapping?.bokun_product_id ?? null;

      if (!bokunProductId) {
        bokunResult = { status: "needs_review", error: "No Bokun mapping for this tour" };
      } else if (!dateExact) {
        bokunResult = { status: "needs_review", error: "Customer did not select an exact date" };
      } else {
        const slots = (await getActivityAvailabilities(
          bokunProductId,
          dateExact,
        )) as AvailabilitySlot[];
        const usable = slots.filter((s) => (s.availabilityCount ?? 1) >= guests);
        const lockedId = Number(meta.bokun_availability_id ?? 0);
        const lockedSlot =
          lockedId > 0 ? (usable.find((s) => Number(s.id) === lockedId) ?? null) : null;
        let chosen: AvailabilitySlot | null = lockedSlot;
        let ambiguousReason: string | null = null;
        if (!chosen) {
          if (usable.length === 0) {
            ambiguousReason = `No Bokun availability on ${dateExact} for ${guests} guests`;
          } else if (usable.length === 1) {
            chosen = usable[0];
          } else {
            ambiguousReason = `Multiple Bokun slots on ${dateExact} (${usable.length}) — pick one manually`;
          }
        }
        if (!chosen) {
          bokunResult = { status: "needs_review", error: ambiguousReason ?? "No slot resolved" };
        } else {
          const slot = chosen;
          const categoriesJson = meta.pricing_categories_json ?? "";
          type PricedCategory = { c: string; q: number; b?: string; u?: number; f?: number };
          let requested: PricedCategory[] = [];
          if (categoriesJson) {
            try {
              const parsed = JSON.parse(categoriesJson);
              if (Array.isArray(parsed)) {
                requested = parsed.filter(
                  (p): p is PricedCategory =>
                    p && typeof p.c === "string" && Number.isFinite(p.q),
                );
              }
            } catch { /* fall through */ }
          }
          const slotCatById = new Map<string, { id: number; title: string }>();
          for (const c of slot.pricingCategories ?? []) slotCatById.set(String(c.id), c);
          let pricingCategoryBookings: Array<{ pricingCategoryId: number; quantity: number }> = [];
          let missingCategory: string | null = null;
          if (requested.length) {
            for (const r of requested) {
              if (r.q <= 0) continue;
              const slotCat = slotCatById.get(r.c);
              const isFree = r.f === 1 || (r.u ?? 1) === 0;
              if (!slotCat) {
                if (!isFree) { missingCategory = r.b ?? r.c; break; }
                continue;
              }
              pricingCategoryBookings.push({
                pricingCategoryId: Number(slotCat.id),
                quantity: r.q,
              });
            }
          } else {
            const cat = slot.pricingCategories?.[0];
            if (!cat) missingCategory = "any";
            else pricingCategoryBookings = [{ pricingCategoryId: Number(cat.id), quantity: guests }];
          }
          if (missingCategory) {
            bokunResult = {
              status: "needs_review",
              error: `Slot missing required pricing category (${missingCategory}) — no Adult substitution`,
            };
          } else if (!pricingCategoryBookings.length) {
            bokunResult = { status: "needs_review", error: "No pricing category bookings resolved" };
          } else {
            const [firstName, ...rest] = (customerName ?? "Guest Guest").split(" ");
            const lastName = rest.join(" ") || "—";
            const isTailored =
              meta.tailored === "1" || flow === "tailored" || flow === "tailor";
            const stopsLine = meta.stops ? ` · Stops: ${meta.stops.replace(/\|/g, ", ")}` : "";
            const tailorPrefix = isTailored ? "[TAILORED — operator to verify stop changes] " : "";
            const r = await reserveAndConfirm({
              productId: bokunProductId,
              availabilityId: slot.id,
              startTime: slot.startTime,
              date: slot.date,
              pricingCategoryBookings,
              customer: {
                firstName,
                lastName,
                email: customerEmail ?? "noreply@yesexperiencesportugal.com",
                phoneNumber: customerPhone ?? undefined,
                language: "EN",
              },
              externalBookingReference: session.id,
              notes: `${tailorPrefix}YES booking · ${meta.pickup ?? ""} · ${meta.journey_title ?? ""}${stopsLine}`.slice(0, 500),
            });
            bokunResult = {
              status: isTailored ? "needs_review" : "confirmed",
              booking_id: r.bookingId,
              confirmation: r.confirmationCode,
              error: isTailored ? "Tailored itinerary — verify stop changes in Bokun" : undefined,
            };
          }
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Bokun push failed:", msg);
    if (bokunResult.status === "skipped") bokunResult = { status: "failed", error: msg };
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

  // Fire-and-forget: send branded checkout confirmation email with receipt link.
  // Non-blocking so a failure here never breaks Stripe delivery.
  try {
    if (customerEmail) {
      const stripe = createStripeClient(stripeEnv);
      let receiptUrl: string | null = null;
      try {
        const piId = typeof session.payment_intent === "string" ? session.payment_intent : null;
        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId, {
            expand: ["latest_charge"],
          });
          const ch = pi.latest_charge;
          if (ch && typeof ch !== "string") {
            receiptUrl = ch.receipt_url ?? null;
          }
        }
      } catch (e) {
        console.warn("receipt_url lookup failed:", e instanceof Error ? e.message : e);
      }

      const amountFormatted =
        amountTotal != null
          ? new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: currency.toUpperCase(),
            }).format(amountTotal / 100)
          : null;

      const siteUrl = Deno.env.get("SITE_URL") ?? "https://yesexperiencesportugal.com";
      const internalSecret = Deno.env.get("EMAIL_INTERNAL_SECRET");

      if (internalSecret) {
        const payload = {
          recipientEmail: customerEmail,
          sessionId: session.id,
          customerName,
          tourTitle: meta.journey_title || meta.tour_title || tourId || null,
          bookingType,
          dateExact,
          guests,
          amountFormatted,
          bookingRef: session.id,
          bokunConfirmation: bokunResult.confirmation ?? null,
          receiptUrl,
          bookingStatusUrl: `${siteUrl}/booking-confirmed?session_id=${encodeURIComponent(session.id)}`,
          pickup: meta.pickup || null,
        };
        const resp = await fetch(`${siteUrl}/api/public/hooks/checkout-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${internalSecret}`,
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          console.warn(
            "checkout-email hook non-2xx:",
            resp.status,
            await resp.text().catch(() => ""),
          );
        }
      } else {
        console.warn("EMAIL_INTERNAL_SECRET not configured — skipping receipt email");
      }
    }
  } catch (e) {
    console.error("send checkout email failed:", e instanceof Error ? e.message : e);
  }

  return new Response(JSON.stringify({ ok: true, bookingId, bokun: bokunResult }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
