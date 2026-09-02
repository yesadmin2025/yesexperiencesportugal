// Stripe sandbox checkout for Studio V3 Signature reveal.
// Prices are resolved SERVER-SIDE from public.tour_price_tiers (the same
// source the admin editor writes to). The client cannot influence price.

import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { isStudioCheckoutDateAllowed } from "../_shared/studio-booking-date.ts";
import { checkTourOperatingRule } from "../_shared/tour-operating-rules.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  tourId: string;
  tourTitle: string;
  guests: number;
  /**
   * Optional traveller composition. When BOTH `adults` and `minorAges`
   * are supplied, the server prices the booking with the owner-approved
   * uniform age bands (adult 18+ 100%, youth 11–17 75%, child 3–10 50%,
   * infant 0–2 free) and IGNORES `priceFromEur` except as the anchor
   * fallback when no tier row exists. When absent, legacy adult-only
   * pricing is used (`guests * per_pax`) — this keeps existing call
   * sites working until the Studio UI captures composition.
   *
   * Any minor age outside 0..17 (or non-integer) triggers a 400 —
   * there is NO fallback that silently prices a minor as an adult.
   */
  adults?: number;
  minorAges?: number[];
  stopLabels?: string[];
  /** Real included items from VIATOR_META[tourId].included — used as the
   *  truthful description source. Client-owned so the edge fn stays
   *  decoupled from src/ data files. */
  includedItems?: string[];
  pickupLabel?: string;
  dateExact?: string | null;
  journeyTitle?: string | null;
  customerEmail?: string;
  returnUrl: string; // success url (we append session_id)
  cancelUrl?: string;
  environment: StripeEnv;
  /** Anchor "from" EUR if no tier data exists. */
  priceFromEur: number;
  /** True when the booking comes from the Tailor flow (stop changes applied). */
  tailored?: boolean;
  /** Number of principal stops the guest removed in Tailor. Used to apply
   *  the SSOT tailor reduction to the resolved per-pax price. */
  principalsRemoved?: number;
  /** Stable ids of the removed core stops — lets the server re-derive the
   *  −5% ladder itself and exclude the dedicated included-lunch stop. */
  skippedCoreStopIds?: string[];

  /** Tailor: guest added the +€35pp lunch (only on lunch-excluded Signatures). */
  tailorLunchAdded?: boolean;
  /** Tailor: wineries selected beyond the Signature baseline (+€20pp each). */
  tailorExtraWineries?: number;
  /** Stable blueprint stop ids the composed day traded away. Structural
   *  EVIDENCE for the 4th-winery entitlement — never a boolean, never a
   *  euro amount. Validated against the server whitelist. */
  tradedStopIds?: string[];
  /** Tailor: guest removed the included lunch (−€15pp, Arrábida Wine only).
   *  Boolean intent only — the euro amount is always derived server-side. */
  tailorLunchRemoved?: boolean;
  /** Which surface initiated checkout. Drives copy in Stripe Checkout. */
  flow?: "studio" | "signature" | "tailor";

  /** Stripe Checkout UI mode. Defaults to "hosted" (full-page redirect). */
  uiMode?: "hosted" | "embedded";
  /** Stable client-side hash of the composed journey — mirrored into
   *  Stripe metadata so the confirmation trail and the story email can
   *  be reconciled against the exact revision the guest approved. */
  journeyRevision?: string;
  /** Forwarded from FinalDetailsDialog. */
  guestDetails?: {
    startTime?: string | null;
    [key: string]: unknown;
  };
  /** Optional reveal add-ons chosen by the traveller. Priced flat per booking. */
  addOns?: Array<{
    id: string;
    label: string;
    priceEur: number;
    durationMinutes?: number;
  }>;
  /** DISPLAY-ONLY. Booked itinerary as shown to the guest. Never priced. */
  itinerary?: Array<{ label: string; durationMinutes?: number; note?: string }>;
  /** DISPLAY-ONLY. Human labels of options the guest removed in Tailor. */
  removedOptions?: string[];
  /** DISPLAY-ONLY. Duration label shown at checkout ("Full day · ~9h"). */
  durationLabel?: string;
}

import {
  AGE_BAND_PCT,
  ageBand,
  serverLunchRemovalEur,
  serverTailorSupplementsEur,
  TAILOR_LUNCH_REMOVAL_ELIGIBLE,
  serverAddOnLine,
  serverAddOnsChargedTotalEur,
  serverAddOnAllowedForTour,
  serverPrincipalRemovalCount,

  tailorFinalPerPax,
  type AgeBand,
} from "../_shared/pricing.ts";

type Flow = "studio" | "signature" | "tailor";

const VALID_FLOWS: Flow[] = ["studio", "signature", "tailor"];

function resolveFlow(body: Body): Flow {
  if (body.flow === "studio" || body.flow === "signature" || body.flow === "tailor")
    return body.flow;
  return body.tailored ? "tailor" : "signature";
}

/**
 * Validate `flow` against `tailored`. Returns an error message or null.
 * - Unknown flow values are rejected.
 * - `tailor` requires `tailored === true`.
 * - `studio` / `signature` require `tailored !== true`.
 */
function validateFlow(body: Body): string | null {
  if (body.flow !== undefined) {
    if (typeof body.flow !== "string" || !VALID_FLOWS.includes(body.flow as Flow)) {
      return `Invalid flow: must be one of ${VALID_FLOWS.join(", ")}`;
    }
    if (body.flow === "tailor" && body.tailored !== true) {
      return "Flow mismatch: 'tailor' requires tailored=true";
    }
    if ((body.flow === "studio" || body.flow === "signature") && body.tailored === true) {
      return `Flow mismatch: '${body.flow}' cannot be used with tailored=true`;
    }
  }
  return null;
}

const FLOW_COPY: Record<Flow, { label: string; eyebrow: string; submit: string }> = {
  studio: {
    label: "YES Studio",
    eyebrow: "Built moment by moment",
    submit: "Instant confirmation by email.",
  },
  signature: {
    label: "YES Signature",
    eyebrow: "Reserved as designed",
    submit: "Instant confirmation by email.",
  },
  tailor: {
    label: "YES Tailored",
    eyebrow: "Tailored stops applied",
    submit: "Instant confirmation by email.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body !== "object") return jsonError("Invalid body", 400);
    if (!body.tourId || typeof body.tourId !== "string" || body.tourId.length > 80)
      return jsonError("Invalid tourId", 400);
    if (!body.tourTitle || typeof body.tourTitle !== "string" || body.tourTitle.length > 160)
      return jsonError("Invalid title", 400);
    if (!Number.isInteger(body.guests) || body.guests < 1 || body.guests > 12)
      return jsonError("Guests must be between 1 and 12", 400);
    if (!Number.isFinite(body.priceFromEur) || body.priceFromEur < 50 || body.priceFromEur > 5000)
      return jsonError("Invalid price anchor", 400);
    if (body.environment !== "sandbox" && body.environment !== "live")
      return jsonError("Invalid environment", 400);

    const flowError = validateFlow(body);
    if (flowError) return jsonError(flowError, 400);

    const checkoutFlow = resolveFlow(body);
    if (checkoutFlow === "studio" && !isStudioCheckoutDateAllowed(body.dateExact)) {
      return jsonError("Selected Studio date is not available", 409);
    }

    const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";

    const allowOrigin =
      validateReturnOrigin(body.returnUrl) &&
      (uiMode === "embedded" || (body.cancelUrl ? validateReturnOrigin(body.cancelUrl) : true));
    if (!allowOrigin) return jsonError("Return URL not allowed", 400);

    // Resolve per-pax EUR server-side from tour_price_tiers.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Server-authoritative operating-rule gate — runs BEFORE any Stripe
    // session is created. No row => no new restriction (production has
    // zero rows today). `cutoff_local_time` is deliberately not enforced.
    // The Studio 3-day gate above stays independent; whichever is stricter
    // wins naturally.
    const operatingGate = await checkTourOperatingRule({
      tourId: body.tourId,
      dateExact: body.dateExact ?? null,
      lookup: async (tourId) => {
        const { data, error } = await admin
          .from("tour_operating_rules")
          .select("weekdays,blackout_dates,min_lead_hours,cutoff_local_time")
          .eq("tour_id", tourId)
          .maybeSingle();
        if (error) return { error };
        return { row: data };
      },
    });
    if (operatingGate.status === "rejected") {
      return jsonError(`date_unavailable:${operatingGate.reason}`, 409);
    }
    if (operatingGate.status === "unavailable") {
      return jsonError("availability_check_unavailable", 503);
    }


    const { data: tierRow } = await admin
      .from("tour_price_tiers")
      .select("tiers")
      .eq("tour_id", body.tourId)
      .maybeSingle();

    // Tier lookup uses TOTAL headcount (adults + minors, incl. infants),
    // matching the owner-approved rule (D3). When composition is absent
    // we fall back to `body.guests` — legacy adult-only path.
    const compositionSupplied =
      Number.isInteger(body.adults) &&
      (body as { adults?: number }).adults! >= 1 &&
      Array.isArray(body.minorAges);

    const adultsCount = compositionSupplied ? (body.adults as number) : body.guests;
    const minorAges = compositionSupplied ? (body.minorAges as number[]) : [];
    if (compositionSupplied) {
      if (adultsCount < 1 || adultsCount > 12)
        return jsonError("Adults must be between 1 and 12", 400);
      if (minorAges.length > 11) return jsonError("Too many minors", 400);
      for (const age of minorAges) {
        if (!Number.isInteger(age) || age < 0 || age > 17)
          return jsonError(
            "Every minor age must be an integer between 0 and 17 — no fallback to adult price",
            400,
          );
      }
    }

    const headcount = adultsCount + minorAges.length;
    if (headcount < 1 || headcount > 12)
      return jsonError("Total travellers must be between 1 and 12", 400);
    // Keep legacy `body.guests` in sync with headcount for downstream copy/metadata.
    (body as { guests: number }).guests = headcount;

    const tier = Math.min(8, Math.max(1, headcount));
    const tiers = (tierRow?.tiers ?? null) as Record<string, number> | null;
    const real = tiers && typeof tiers[String(tier)] === "number" ? tiers[String(tier)] : null;
    // Guardrail: NEVER price a booking against the anchor "from" price.
    // `priceFromEur` is the 8-pax lowest anchor AND is client-supplied, so
    // falling back to it silently under-charges every smaller party (e.g.
    // a solo guest on a Signature with no approved tier-1 row). If the
    // owner has not approved a per-tier price for this party size we
    // refuse the checkout instead of inventing one.
    if (real == null) {
      return jsonError(
        minorAges.length > 0
          ? `owner_data_missing: Child pricing not yet configured for ${body.tourId}. Please book adults only or contact us to price this family day.`
          : `owner_data_missing: This Signature is not yet priced for ${headcount} ${headcount === 1 ? "traveller" : "travellers"}. Contact us and we will confirm the exact price for your party.`,
        409,
      );
    }
    const resolvedPerPax = real;
    // Approved 8-pax anchor for this Signature — the server-authoritative
    // base for add-on percentages. Never `body.priceFromEur` (client input).
    const approvedAnchorEur =
      tiers && typeof tiers["8"] === "number" && tiers["8"] > 0 ? tiers["8"] : null;


    // Tailor flow only: apply SSOT reduction based on principal stops the
    // guest removed, then add the authorized flat supplements (add lunch,
    // extra wineries) and subtract the flat lunch-removal credit.
    // Every euro amount is re-derived server-side from the per-Signature
    // entitlement tables — never taken from the client.
    const flowInput = body.flow ?? (body.tailored ? "tailor" : "signature");
    const isTailorFlow = flowInput === "tailor";
    // −5% ladder count. When the client sends stable stop ids we re-derive
    // the count ourselves and drop the dedicated included-lunch stop: that
    // removal is priced by the flat −€15 pp credit and must never also earn
    // the principal-stop reduction (no double credit for the same lunch).
    const skippedCoreStopIds = Array.isArray(body.skippedCoreStopIds)
      ? body.skippedCoreStopIds.filter((id): id is string => typeof id === "string")
      : null;
    // Telemetry / consistency upper bound ONLY — never price authority.
    const claimedPrincipals = Math.min(8, Math.max(0, Number(body.principalsRemoved ?? 0) | 0));
    // FAIL-CLOSED: without stable skipped stop ids there is no server-verifiable
    // removal, so the −5% ladder count is 0. With ids, only UNIQUE whitelisted
    // ids count (invented ids, duplicates, locked anchors and the dedicated
    // included-lunch stop earn nothing).
    const derivedPrincipals =
      skippedCoreStopIds && skippedCoreStopIds.length > 0
        ? Math.min(8, serverPrincipalRemovalCount(body.tourId, skippedCoreStopIds))
        : 0;
    const principalsRemoved = isTailorFlow ? Math.min(claimedPrincipals, derivedPrincipals) : 0;


    // COMPOSED-DAY COMMERCIAL TRUTH.
    // A Studio day is bespoke: it may legitimately compose a 3rd or 4th
    // winery beyond the Signature baseline. That is the SAME commercial
    // action the Tailor flow already sells, priced by the SAME server table
    // (`serverTailorSupplementsEur`) — no second pricing engine, and no
    // client euro value is ever read. The client may only NAME how many
    // extra wineries its composition contains; the server clamps that count
    // to the per-Signature entitlement (`TAILOR_MAX_EXTRA_WINERIES`) and
    // derives the amount itself. Lunch add/remove and the −5% principal
    // ladder stay Tailor-only.
    const isStudioFlow = flowInput === "studio";
    const supplementsFlow = isTailorFlow || isStudioFlow;
    const tailorSupplements = supplementsFlow
      ? serverTailorSupplementsEur(
          body.tourId,
          isTailorFlow && body.tailorLunchAdded === true,
          Number(body.tailorExtraWineries ?? 0),
        )
      : 0;

    // ── Lunch removal (Arrábida Wine only) ──────────────────────────
    // Strict validation: boolean-only, tailor flow only, eligible product
    // only. The €15 comes from the server table, never from the payload.
    if (body.tailorLunchRemoved !== undefined && typeof body.tailorLunchRemoved !== "boolean") {
      return jsonError("Invalid tailorLunchRemoved: must be a boolean", 400);
    }
    const lunchRemoved = body.tailorLunchRemoved === true;
    if (lunchRemoved && !isTailorFlow) {
      return jsonError("Lunch removal is only available in the Tailor flow", 400);
    }
    if (lunchRemoved && !TAILOR_LUNCH_REMOVAL_ELIGIBLE.has(body.tourId)) {
      return jsonError(`Lunch removal is not available for ${body.tourId}`, 400);
    }
    const lunchRemovalCredit = isTailorFlow ? serverLunchRemovalEur(body.tourId, lunchRemoved) : 0;

    const eurPerPax = supplementsFlow
      ? tailorFinalPerPax(resolvedPerPax, principalsRemoved, tailorSupplements, lunchRemovalCredit)
      : resolvedPerPax;

    // Build itemised age-band lines (server-authoritative). When
    // composition is absent, this collapses to `headcount × adult`.
    type PriceLine = { band: AgeBand; age: number | null; unitEur: number };
    const priceLines: PriceLine[] = [];
    for (let i = 0; i < adultsCount; i++) {
      priceLines.push({ band: "adult", age: null, unitEur: eurPerPax });
    }
    for (const age of minorAges) {
      const band = ageBand(age);
      if (!band) return jsonError("Invalid minor age", 400); // defensive; already validated
      priceLines.push({
        band,
        age,
        unitEur: Math.round(eurPerPax * AGE_BAND_PCT[band]),
      });
    }

    const tourSubtotalCents = priceLines.reduce((s, l) => s + Math.round(l.unitEur * 100), 0);
    if (tourSubtotalCents < 5000) return jsonError("Computed amount below minimum", 400);

    const stripe = createStripeClient(body.environment);

    const flow = checkoutFlow;
    const copy = FLOW_COPY[flow];

    // Build the Stripe line item from client-supplied tour data. Client-passed
    // stopLabels are intentionally NOT shown in the line-item description for
    // tailored bookings.
    const isTailored = flow === "tailor";
    // Studio sells a BESPOKE day. The traveller must never see the hidden
    // Signature skeleton title on the Stripe line item; the skeleton `tourId`
    // stays in metadata and remains the server's pricing authority.
    const journeyName =
      flow === "studio" && typeof body.journeyTitle === "string" && body.journeyTitle.trim()
        ? body.journeyTitle.trim()
        : body.tourTitle;
    const productName = `${copy.label} — ${journeyName}${isTailored ? " (tailored)" : ""}`.slice(
      0,
      180,
    );

    // Build a truthful description from client-forwarded VIATOR_META.included.
    // Never invent marketing prose in the fallback.
    const guestsLine = `${body.guests} guest${body.guests > 1 ? "s" : ""}`;
    const clientIncluded =
      Array.isArray(body.includedItems) && body.includedItems.length > 0
        ? body.includedItems.filter((s) => typeof s === "string" && s.trim().length > 0)
        : null;
    const includesLine = clientIncluded
      ? `Includes: ${clientIncluded.slice(0, 4).join(", ")}`
      : null;
    const lunchRemovedLine =
      lunchRemovalCredit > 0
        ? `Included lunch removed — €${lunchRemovalCredit} per person credited`
        : null;
    // A Tailor configuration allowed into Stripe is instantly booked: no
    // post-payment operator-review language.
    const tailoredNote = isTailored ? "Instant confirmation by email." : null;

    const description = [
      guestsLine + " · Hotel pickup included",
      includesLine,
      lunchRemovedLine,
      tailoredNote,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 500);

    const dateLine = body.dateExact ? ` · ${body.dateExact}` : "";
    const pickupLine = body.pickupLabel ? ` · pickup ${body.pickupLabel}` : "";
    const submitMessage = copy.submit;

    // Reveal add-ons. The client may only NAME an add-on by id: price, label
    // and duration are all re-derived server-side from the approved catalog
    // and the tour's own approved 8-pax anchor. A tampered client can neither
    // under-pay a real add-on, invent a cheap one, nor pair a cheap id with a
    // premium label/duration. Unknown ids are dropped.
    //
    // In addition, a known id must be STRUCTURALLY eligible for this base
    // Signature (region bucket / Lisbon sub-region / not the tour's own
    // source / no inclusion conflict). A known-but-unauthorised selection is
    // rejected explicitly rather than silently dropped, so a manipulated
    // request can never create a checkout that differs from its payload
    // without notice. Dynamic day-shape rules stay UI-side.
    const rawAddOns = Array.isArray(body.addOns) ? body.addOns : [];
    const candidateAddOns = rawAddOns
      .filter(
        (a) => a && typeof a === "object" && typeof a.id === "string" && a.id.length > 0 && a.id.length <= 64,
      )
      .slice(0, 6);

    for (const a of candidateAddOns) {
      const known = serverAddOnLine(a.id, approvedAnchorEur || 1, 1) !== null;
      if (known && !serverAddOnAllowedForTour(a.id, body.tourId)) {
        return jsonError(`invalid_add_on_for_tour:${a.id}`, 409);
      }
    }

    const validatedAddOns = candidateAddOns
      .map((a) => {
        const line = approvedAnchorEur
          ? serverAddOnLine(a.id, approvedAnchorEur, body.guests)
          : null;
        return line
          ? {
              id: a.id,
              // Canonical commercial identity — client label/duration ignored.
              label: line.label,
              priceEur: line.perUnitEur,
              quantity: line.quantity,
              unit: line.unit,
              durationMinutes: line.durationMinutes,
            }
          : null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    // PARTY TRUTH — the ONE add-on total. Exactly the canonical unit price ×
    // canonical quantity Stripe is charging, for every pricing unit
    // (per_person / per_group / per_vehicle / fixed). Metadata and the booking
    // snapshot read this, so neither can diverge from the charged lines.
    const addOnsChargedTotalEur = serverAddOnsChargedTotalEur(
      validatedAddOns.map((a) => ({ perUnitEur: a.priceEur, quantity: a.quantity })),
    );



    const addOnLineItems = validatedAddOns
      .filter((a) => a.priceEur > 0)
      .map((a) => ({
        price_data: {
          currency: "eur",
          product_data: { name: `Add-on — ${a.label}`.slice(0, 180) },
          unit_amount: a.priceEur * 100,
        },
        quantity: a.quantity,
      }));


    // Build a Stripe line item per age band (grouped) so the guest sees
    // "Adult × 2 · €279", "Youth × 1 · €209", etc. — never a single
    // opaque total. Adult-only bookings collapse into one line.
    const byBand: Record<AgeBand, { unitEur: number; qty: number }> = {
      adult: { unitEur: 0, qty: 0 },
      youth: { unitEur: 0, qty: 0 },
      child: { unitEur: 0, qty: 0 },
      infant: { unitEur: 0, qty: 0 },
    };
    for (const l of priceLines) {
      byBand[l.band].unitEur = l.unitEur;
      byBand[l.band].qty += 1;
    }
    const bandLabel: Record<AgeBand, string> = {
      adult: "Adult (18+)",
      youth: "Youth (11–17)",
      child: "Child (3–10)",
      infant: "Infant (0–2, free)",
    };
    const tourLineItems = (["adult", "youth", "child", "infant"] as const)
      .filter((b) => byBand[b].qty > 0)
      .map((b, idx) => ({
        price_data: {
          currency: "eur",
          product_data: {
            // Only the first (adult) line carries the full product name +
            // hero image; subsequent bands stay short so the checkout
            // page reads cleanly.
            name: idx === 0 ? productName : `${productName} — ${bandLabel[b]}`.slice(0, 180),
            ...(idx === 0
              ? {
                  description,
                  images: ["https://yesexperiencesportugal.com/og-cover.jpg"],
                }
              : {}),
          },
          // Infants (free) still appear as a €0 line so the party
          // composition is legible on the Stripe receipt.
          unit_amount: Math.round(byBand[b].unitEur * 100),
        },
        quantity: byBand[b].qty,
      }));

    const sessionParams: Record<string, unknown> = {
      line_items: [...tourLineItems, ...addOnLineItems],

      mode: "payment",
      // DYNAMIC PAYMENT METHODS — do NOT pin payment_method_types here.
      // Stripe decides which methods are shown from the Dashboard payment
      // method configuration, filtered by currency, amount, shopper locale,
      // device and flow. Hard-coding a list (or hiding Link via
      // wallet_options) silently removes eligible rails site-wide.


      locale: "auto",
      submit_type: "book",
      billing_address_collection: "auto",
      // Never ask again for a phone number Guest Details already validated.
      // The number stays in the booking snapshot / Stripe metadata.
      phone_number_collection: {
        enabled: !(
          typeof body.guestDetails?.["phone"] === "string" &&
          (body.guestDetails["phone"] as string).trim().length >= 6
        ),
      },
      allow_promotion_codes: true,
      custom_text: {
        submit: { message: submitMessage.slice(0, 1200) },
        terms_of_service_acceptance: {
          message:
            "By booking you accept the [YES Experiences Portugal terms](https://yesexperiencesportugal.com/terms) and [privacy policy](https://yesexperiencesportugal.com/privacy).",
        },
      },
      consent_collection: { terms_of_service: "required" },
      payment_intent_data: {
        statement_descriptor_suffix: "YES EXPERIENCES",
        description: `${productName}${dateLine}${pickupLine}`.slice(0, 1000),
      },
      // Prefill Stripe with the email the traveller already gave us in Guest
      // Details, so the checkout never asks for a fact we already hold.
      ...((): Record<string, string> => {
        const raw = body.customerEmail ?? (body.guestDetails?.["email"] as string | undefined);
        const email = typeof raw === "string" ? raw.trim() : "";
        return email ? { customer_email: email } : {};
      })(),
      metadata: {
        booking_type: "signature",
        flow,
        tour_id: body.tourId,
        guests: String(headcount),
        adults: String(adultsCount),
        minor_ages: minorAges.length > 0 ? minorAges.join(",") : "",
        pricing_mode: compositionSupplied ? "age_bands" : "legacy_adults_only",
        per_pax_eur: String(eurPerPax),
        tour_subtotal_eur: String(Math.round(tourSubtotalCents / 100)),
        price_source: real != null ? "tier" : "anchor",
        date_exact: body.dateExact ?? "",
        pickup: (body.pickupLabel ?? "").slice(0, 120),
        hotel_pickup_included: "1",

        journey_title: (body.journeyTitle ?? "").slice(0, 160),
        journey_revision: (body.journeyRevision ?? "").slice(0, 80),
        stops: (body.stopLabels ?? []).slice(0, 8).join("|").slice(0, 480),
        tailored: body.tailored ? "1" : "0",
        tailor_lunch_removed: lunchRemovalCredit > 0 ? "1" : "0",
        tailor_lunch_removal_eur_pp: String(lunchRemovalCredit),
        add_ons: JSON.stringify(
          validatedAddOns.map((a) => ({
            id: a.id,
            label: a.label,
            priceEur: a.priceEur,
            quantity: a.quantity,
            unit: a.unit,
          })),
        ).slice(0, 480),
        add_ons_total_eur: String(addOnsChargedTotalEur),

        ui_mode: uiMode,
        ...(body.guestDetails?.startTime
          ? { start_time: String(body.guestDetails.startTime).slice(0, 16) }
          : {}),
        ...(typeof body.guestDetails?.guideNotes === "string" && body.guestDetails.guideNotes.trim()
          ? { traveller_preferences: body.guestDetails.guideNotes.trim().slice(0, 480) }
          : {}),
      },
    };

    if (uiMode === "embedded") {
      sessionParams.ui_mode = "embedded_page";
      sessionParams.return_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionParams.success_url = `${body.returnUrl}${body.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
      if (body.cancelUrl) sessionParams.cancel_url = body.cancelUrl;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // ── Purchase snapshot (display-only) ────────────────────────────
    // Frozen copy of exactly what the guest is buying, keyed by session id.
    // Written as a draft here; the webhook stamps `frozen_at` on payment
    // success. Nothing in this block feeds pricing — every euro value is
    // copied from the already-computed, server-authoritative numbers.
    try {
      const gd = (body.guestDetails ?? {}) as Record<string, unknown>;
      const str = (v: unknown, max = 400) =>
        typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
      const itinerary = (Array.isArray(body.itinerary) ? body.itinerary : [])
        .filter((s) => s && typeof s.label === "string" && s.label.trim())
        .slice(0, 20)
        .map((s, i) => ({
          order: i + 1,
          label: s.label.trim().slice(0, 160),
          durationMinutes: Number.isFinite(s.durationMinutes)
            ? Math.max(0, Math.min(600, Math.round(s.durationMinutes as number)))
            : null,
          note: str(s.note, 240),
        }));
      const fallbackItinerary = (Array.isArray(body.stopLabels) ? body.stopLabels : [])
        .filter((l) => typeof l === "string" && l.trim())
        .slice(0, 20)
        .map((l, i) => ({
          order: i + 1,
          label: l.trim().slice(0, 160),
          durationMinutes: null,
          note: null,
        }));

      const removedOptions = (Array.isArray(body.removedOptions) ? body.removedOptions : [])
        .filter((l) => typeof l === "string" && l.trim())
        .slice(0, 20)
        .map((l) => l.trim().slice(0, 160));
      if (lunchRemovalCredit > 0) {
        removedOptions.push(`Included lunch removed (−€${lunchRemovalCredit} per person)`);
      }
      if (principalsRemoved > 0 && removedOptions.length === 0) {
        removedOptions.push(
          `${principalsRemoved} stop${principalsRemoved === 1 ? "" : "s"} removed`,
        );
      }

      const notes = [
        str(gd.guideNotes, 1200) ? `Preferences: ${str(gd.guideNotes, 1200)}` : null,
        str(gd.notes, 1200) ? `Notes: ${str(gd.notes, 1200)}` : null,
        str(gd.dietary, 600) ? `Dietary: ${str(gd.dietary, 600)}` : null,
        str(gd.mobility, 600) ? `Mobility: ${str(gd.mobility, 600)}` : null,
        str(gd.children, 600) ? `Children: ${str(gd.children, 600)}` : null,
        str(gd.occasion, 600) ? `Occasion: ${str(gd.occasion, 600)}` : null,
      ].filter(Boolean) as string[];

      // Same party truth as the charged Stripe lines — never guests × unit.
      const addOnsTotalEur = addOnsChargedTotalEur;

      const snapshotPayload = {
        version: 1,
        capturedAt: new Date().toISOString(),
        flow,
        tourId: body.tourId,
        experienceName: productName,
        tourTitle: body.tourTitle,
        journeyTitle: str(body.journeyTitle, 160),
        tailored: isTailored,
        dateExact: body.dateExact ?? null,
        startTime: str(gd.startTime, 16),
        durationLabel: str(body.durationLabel, 120),
        pickup: str(body.pickupLabel, 200),
        language: str(gd.language, 8),
        mainContact: str(gd.mainContact, 160),
        customerName: str(gd.fullName, 160),
        customerPhone: str(gd.phone, 40),
        itinerary: itinerary.length > 0 ? itinerary : fallbackItinerary,
        includedItems: clientIncluded ? clientIncluded.slice(0, 20) : [],
        addOns: validatedAddOns,
        removedOptions,
        notes,
        composition: {
          guests: body.guests,
          adults: adultsCount,
          minorAges,
          lines: priceLines,
        },
        pricing: {
          currency: "eur",
          basePerPaxEur: resolvedPerPax,
          finalPerPaxEur: eurPerPax,
          principalsRemoved,
          tailorSupplementsEur: tailorSupplements,
          lunchRemovalCreditEurPerPax: lunchRemovalCredit,
          tourSubtotalEur: Math.round(tourSubtotalCents / 100),
          addOnsPerPaxTotalEur: validatedAddOns.reduce((s, a) => s + a.priceEur, 0),
          addOnsTotalEur,
          totalEur: Math.round(tourSubtotalCents / 100) + addOnsTotalEur,
          priceSource: real != null ? "tier" : "anchor",
        },
      };

      // Contract check — the snapshot is what BOTH confirmation emails render.
      // Anything missing here would produce a confirmation with a hole in it,
      // so it is logged loudly (and shown in Admin → booking detail).
      const missing: string[] = [];
      if (!snapshotPayload.experienceName && !snapshotPayload.tourTitle)
        missing.push("experienceName");
      if (!snapshotPayload.dateExact) missing.push("dateExact");
      if (snapshotPayload.itinerary.length === 0) missing.push("itinerary");
      if (!snapshotPayload.composition.guests) missing.push("guests");
      if (!snapshotPayload.pricing.totalEur) missing.push("totalEur");
      if (missing.length > 0) {
        console.error(
          "[create-signature-checkout] incomplete booking snapshot:",
          session.id,
          missing.join(", "),
        );
      }

      // Written (and retried once) BEFORE checkout returns, so the snapshot is
      // always in place ahead of any payment-success email.
      let snapErr = (
        await admin
          .from("booking_snapshots")
          .upsert(
            { stripe_session_id: session.id, payload: snapshotPayload },
            { onConflict: "stripe_session_id" },
          )
      ).error;
      if (snapErr) {
        snapErr = (
          await admin
            .from("booking_snapshots")
            .upsert(
              { stripe_session_id: session.id, payload: snapshotPayload },
              { onConflict: "stripe_session_id" },
            )
        ).error;
      }
      if (snapErr)
        console.error("[create-signature-checkout] snapshot write failed:", snapErr.message);
    } catch (e) {
      // Snapshot is observability, never a checkout blocker.
      console.warn(
        "[create-signature-checkout] snapshot build failed:",
        e instanceof Error ? e.message : e,
      );
    }

    const rawPublishable =
      body.environment === "live"
        ? (Deno.env.get("STRIPE_LIVE_PUBLISHABLE_KEY") ?? "")
        : (Deno.env.get("STRIPE_SANDBOX_PUBLISHABLE_KEY") ?? "");
    // Defensive: NEVER echo a secret key back to the client. If the env var
    // was misconfigured with an sk_… value, drop it and log a warning.
    const publishableKey = rawPublishable.startsWith("pk_") ? rawPublishable : "";
    if (rawPublishable && !rawPublishable.startsWith("pk_")) {
      console.error(
        `[create-signature-checkout] Refusing to return non-publishable key for env=${body.environment}. ` +
          `Set STRIPE_${body.environment === "live" ? "LIVE" : "SANDBOX"}_PUBLISHABLE_KEY to a pk_… value.`,
      );
    }

    return new Response(
      JSON.stringify({
        url: (session as { url?: string }).url ?? null,
        clientSecret: (session as { client_secret?: string }).client_secret ?? null,
        sessionId: session.id,
        publishableKey,
        flow,
        productName,
        lineItemDescription: description,
        submitMessage,
        uiMode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("create-signature-checkout error:", e);
    return jsonError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

function validateReturnOrigin(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const envAllow = (Deno.env.get("RETURN_URL_ORIGIN") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const staticAllow = new Set<string>([
      "https://yesexperiences.pt",
      "https://www.yesexperiences.pt",
      "https://yesexperiencesportugal.com",
      "https://www.yesexperiencesportugal.com",
      "https://dreamscape-builder-co.lovable.app",
      ...envAllow,
    ]);
    const origin = u.origin;
    if (staticAllow.has(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+\.lovable\.dev$/.test(origin)) return true;
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
    return false;
  } catch {
    return false;
  }
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
