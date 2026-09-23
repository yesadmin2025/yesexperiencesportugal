/**
 * Operational booking hub: admin-only reads, quick edits, ingestion controls
 * and the Needs Review queue.
 *
 * Money is never recomputed here. Amounts, Stripe references and refunds stay
 * under the existing checkout and cancelAndRefundBooking paths; this file only
 * records operational truth (guide, pickup, timing, status labels, notes) and
 * audits every edit.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { buildBookingBriefSections, briefSectionsToText, type BriefBookingRow } from "@/lib/ops/booking-brief";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

export const OPS_CHANNELS = ["WEBSITE", "DIRECT", "VIATOR", "GETYOURGUIDE", "BOKUN", "OTHER"] as const;

const LIST_COLUMNS = [
  "id", "created_at", "booking_type", "source", "source_channel", "source_tour_id", "tour_title",
  "external_booking_ref", "customer_name", "customer_email", "customer_phone", "guests",
  "preferred_date", "start_time", "pickup_location", "amount_total", "amount_paid", "currency",
  "status", "payment_status", "assigned_guide_id", "review_required", "review_reason",
  "cancelled_at", "stripe_session_id",
].join(", ");

const listInput = z.object({
  search: z.string().max(200).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  channels: z.array(z.enum(OPS_CHANNELS)).optional(),
  status: z.enum(["pending", "paid", "cancelled", "refunded", "failed", "all"]).default("all"),
  paymentStatus: z.enum(["PAID", "PENDING_PAYMENT", "REFUNDED", "UNKNOWN", "all"]).default("all"),
  guide: z.string().optional(), // uuid | "unassigned" | "all"
  tour: z.string().max(200).optional(),
  reviewOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const listOpsBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("bookings")
      .select(LIST_COLUMNS)
      .order("preferred_date", { ascending: true, nullsFirst: false })
      .limit(data.limit);

    if (data.status !== "all") query = query.eq("status", data.status);
    if (data.paymentStatus !== "all") query = query.eq("payment_status", data.paymentStatus);
    if (data.dateFrom) query = query.gte("preferred_date", data.dateFrom);
    if (data.dateTo) query = query.lte("preferred_date", data.dateTo);
    if (data.channels && data.channels.length > 0) query = query.in("source_channel", data.channels);
    if (data.reviewOnly) query = query.eq("review_required", true);
    if (data.guide && data.guide !== "all") {
      query = data.guide === "unassigned"
        ? query.is("assigned_guide_id", null)
        : query.eq("assigned_guide_id", data.guide);
    }
    if (data.tour) {
      const safeTour = data.tour.replace(/[%,()]/g, " ").trim();
      if (safeTour) query = query.or(`source_tour_id.ilike.%${safeTour}%,tour_title.ilike.%${safeTour}%`);
    }

    const term = data.search?.trim();
    if (term) {
      const safe = term.replace(/[%,()]/g, " ").trim();
      if (safe) {
        query = query.or(
          [
            `customer_name.ilike.%${safe}%`,
            `customer_email.ilike.%${safe}%`,
            `customer_phone.ilike.%${safe}%`,
            `external_booking_ref.ilike.%${safe}%`,
            `stripe_session_id.ilike.%${safe}%`,
            `tour_title.ilike.%${safe}%`,
            `source_tour_id.ilike.%${safe}%`,
          ].join(","),
        );
      }
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { data: guides } = await supabaseAdmin
      .from("guides")
      .select("id, name, active")
      .order("name", { ascending: true });

    const { count: reviewCount } = await supabaseAdmin
      .from("booking_ingestion_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return { bookings: rows ?? [], guides: guides ?? [], reviewCount: reviewCount ?? 0 };
  });

export const getOpsBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) return { booking: null, guides: [], ingestion: [], brief: [], briefText: "", briefDraft: null };

    const { data: guides } = await supabaseAdmin
      .from("guides")
      .select("id, name, email, phone, active")
      .order("name", { ascending: true });

    const { data: ingestion } = await supabaseAdmin
      .from("booking_ingestion_log")
      .select("id, created_at, action, parse_status, parser, reason, confidence, subject, gmail_message_id")
      .eq("matched_booking_id", data.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const sections = buildBookingBriefSections(booking as unknown as BriefBookingRow);
    const metadata = (booking.metadata ?? {}) as Record<string, unknown>;
    const draft = typeof metadata["guide_brief_draft"] === "string" ? (metadata["guide_brief_draft"] as string) : null;

    return {
      booking,
      guides: guides ?? [],
      ingestion: ingestion ?? [],
      brief: sections,
      briefText: briefSectionsToText(sections),
      briefDraft: draft,
    };
  });

const editInput = z.object({
  id: z.string().uuid(),
  assignedGuideId: z.string().uuid().nullable().optional(),
  pickupLocation: z.string().trim().max(300).nullable().optional(),
  dropoffLocation: z.string().trim().max(300).nullable().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  startTime: z.string().trim().max(20).nullable().optional(),
  language: z.string().trim().max(80).nullable().optional(),
  tourTitle: z.string().trim().max(200).nullable().optional(),
  paymentStatus: z.enum(["PAID", "PENDING_PAYMENT", "REFUNDED", "UNKNOWN"]).optional(),
  status: z.enum(["pending", "paid", "cancelled"]).optional(),
  appendOperationalNote: z.string().trim().max(2000).optional(),
  clientNotes: z.string().trim().max(2000).nullable().optional(),
  reviewRequired: z.boolean().optional(),
  reviewReason: z.string().trim().max(400).nullable().optional(),
});

/**
 * Operational edits only. It never touches amount_total, Stripe references or
 * refunds; `status` here is the operational label, money movement still goes
 * through cancelAndRefundBooking.
 */
export const updateOpsBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => editInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: readError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, payment_status, assigned_guide_id, pickup_location, dropoff_location, preferred_date, start_time, language, tour_title, operational_notes, client_notes, review_required, review_reason, metadata")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!booking) throw new Error("Booking not found.");

    const patch: Record<string, unknown> = {};
    const changes: Record<string, { from: string | null; to: string | null }> = {};
    const set = (column: string, to: unknown) => {
      const from = (booking as Record<string, unknown>)[column];
      if (to === from) return;
      patch[column] = to;
      changes[column] = { from: from == null ? null : String(from), to: to == null ? null : String(to) };
    };

    if (data.assignedGuideId !== undefined) set("assigned_guide_id", data.assignedGuideId);
    if (data.pickupLocation !== undefined) set("pickup_location", data.pickupLocation || null);
    if (data.dropoffLocation !== undefined) set("dropoff_location", data.dropoffLocation || null);
    if (data.preferredDate !== undefined) set("preferred_date", data.preferredDate);
    if (data.startTime !== undefined) set("start_time", data.startTime || null);
    if (data.language !== undefined) set("language", data.language || null);
    if (data.tourTitle !== undefined) set("tour_title", data.tourTitle || null);
    if (data.paymentStatus !== undefined) set("payment_status", data.paymentStatus);
    if (data.clientNotes !== undefined) set("client_notes", data.clientNotes || null);
    if (data.reviewRequired !== undefined) set("review_required", data.reviewRequired);
    if (data.reviewReason !== undefined) set("review_reason", data.reviewReason || null);
    if (data.status !== undefined) {
      set("status", data.status);
      if (data.status === "cancelled") patch["cancelled_at"] = new Date().toISOString();
    }
    if (data.appendOperationalNote) {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const next = [booking.operational_notes, `[${stamp}] ${data.appendOperationalNote}`]
        .filter(Boolean)
        .join("\n");
      set("operational_notes", next);
    }

    if (Object.keys(patch).length === 0) return { ok: true, changed: false };

    const previousMetadata =
      booking.metadata && typeof booking.metadata === "object" && !Array.isArray(booking.metadata)
        ? (booking.metadata as Record<string, unknown>)
        : {};
    const priorEdits = Array.isArray(previousMetadata["ops_edits"]) ? (previousMetadata["ops_edits"] as Json[]) : [];
    patch["metadata"] = {
      ...previousMetadata,
      ops_edits: [...priorEdits.slice(-99), { at: new Date().toISOString(), by: context.userId, changes }],
    } as Json;

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update(patch as never)
      .eq("id", booking.id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true, changed: true, changes };
  });

export const saveOpsBriefDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), draft: z.string().max(20000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("bookings").select("metadata").eq("id", data.id).maybeSingle();
    const metadata =
      row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        metadata: {
          ...metadata,
          guide_brief_draft: data.draft,
          guide_brief_draft_at: new Date().toISOString(),
          guide_brief_draft_by: context.userId,
        } as Json,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------------------- review queue */

export const listOpsReviewCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "ignored", "matched", "all"]).default("pending") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("booking_ingestion_candidates")
      .select("id, created_at, received_at, source, source_channel, subject, source_email_url, detected, missing_fields, confidence, reason, status, matched_booking_id, created_booking_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { candidates: rows ?? [] };
  });

const resolveInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "match", "ignore"]),
  bookingId: z.string().uuid().optional(),
  edits: z
    .object({
      customerName: z.string().trim().max(200).optional(),
      customerEmail: z.string().trim().email().max(200).optional(),
      customerPhone: z.string().trim().max(60).optional(),
      tourTitle: z.string().trim().max(200).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      startTime: z.string().trim().max(20).optional(),
      pax: z.number().int().min(1).max(60).optional(),
      pickup: z.string().trim().max(300).optional(),
      language: z.string().trim().max(80).optional(),
      status: z.enum(["pending", "paid"]).optional(),
      paymentStatus: z.enum(["PAID", "PENDING_PAYMENT", "UNKNOWN"]).optional(),
    })
    .optional(),
});

/** Approve / match / ignore a reviewed email candidate. Never auto-confirms. */
export const resolveOpsReviewCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resolveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: candidate, error } = await supabaseAdmin
      .from("booking_ingestion_candidates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!candidate) throw new Error("Candidate not found.");
    if (candidate.status !== "pending") return { ok: true, alreadyResolved: true };

    const detected = (candidate.detected ?? {}) as Record<string, unknown>;
    const edits = data.edits ?? {};
    const stamp = new Date().toISOString();

    if (data.action === "ignore") {
      await supabaseAdmin
        .from("booking_ingestion_candidates")
        .update({ status: "ignored", resolved_by: context.userId, resolved_at: stamp })
        .eq("id", data.id);
      await supabaseAdmin.from("booking_ingestion_log").insert({
        source: candidate.source, source_channel: candidate.source_channel,
        gmail_message_id: candidate.gmail_message_id, subject: candidate.subject,
        parser: "manual", parse_status: "reviewed", action: "ignored",
        reason: "ignored_by_admin", actor_user_id: context.userId,
      });
      return { ok: true, action: "ignored" };
    }

    if (data.action === "match") {
      if (!data.bookingId) throw new Error("bookingId is required to match an existing reservation.");
      await supabaseAdmin
        .from("bookings")
        .update({
          source_message_id: candidate.gmail_message_id,
          source_thread_id: candidate.gmail_thread_id,
          source_email_url: candidate.source_email_url,
          source_channel: candidate.source_channel,
          sync_status: "synced",
          last_synced_at: stamp,
        })
        .eq("id", data.bookingId);
      await supabaseAdmin
        .from("booking_ingestion_candidates")
        .update({ status: "matched", matched_booking_id: data.bookingId, resolved_by: context.userId, resolved_at: stamp })
        .eq("id", data.id);
      await supabaseAdmin.from("booking_ingestion_log").insert({
        source: candidate.source, source_channel: candidate.source_channel,
        gmail_message_id: candidate.gmail_message_id, subject: candidate.subject,
        parser: "manual", parse_status: "reviewed", action: "updated",
        matched_booking_id: data.bookingId, reason: "matched_by_admin", actor_user_id: context.userId,
      });
      return { ok: true, action: "matched", bookingId: data.bookingId };
    }

    const email = (edits.customerEmail ?? (detected["customerEmail"] as string | null) ?? "").toLowerCase();
    const date = edits.date ?? (detected["date"] as string | null) ?? null;
    if (!email || !date) throw new Error("A customer email and a tour date are required before approving.");

    const row = {
      booking_type: "signature" as const,
      source: candidate.source,
      source_channel: candidate.source_channel,
      external_booking_ref: (detected["externalBookingRef"] as string | null) ?? null,
      external_product_ref: (detected["externalProductRef"] as string | null) ?? null,
      source_message_id: candidate.gmail_message_id,
      source_thread_id: candidate.gmail_thread_id,
      source_email_url: candidate.source_email_url,
      tour_title: edits.tourTitle ?? ((detected["tourTitle"] as string | null) ?? null),
      customer_name: edits.customerName ?? ((detected["customerName"] as string | null) ?? null),
      customer_email: email,
      customer_phone: edits.customerPhone ?? ((detected["customerPhone"] as string | null) ?? null),
      preferred_date: date,
      start_time: edits.startTime ?? ((detected["startTime"] as string | null) ?? null),
      guests: edits.pax ?? (typeof detected["pax"] === "number" ? (detected["pax"] as number) : 1),
      pickup_location: edits.pickup ?? ((detected["pickup"] as string | null) ?? null),
      language: edits.language ?? ((detected["language"] as string | null) ?? null),
      status: edits.status ?? "pending",
      payment_status: edits.paymentStatus ?? ((detected["paymentStatus"] as string | null) ?? "UNKNOWN"),
      amount_total: 0,
      amount_paid: typeof detected["amountPaid"] === "number" ? (detected["amountPaid"] as number) : null,
      currency: typeof detected["currency"] === "string" ? (detected["currency"] as string).toLowerCase() : "eur",
      inclusions: (detected["inclusions"] ?? null) as Json,
      exclusions: (detected["exclusions"] ?? null) as Json,
      extras: (detected["extras"] ?? null) as Json,
      client_notes: (detected["notes"] as string | null) ?? null,
      source_raw_payload: { approved_from_candidate: candidate.id } as unknown as Json,
      sync_status: "synced",
      last_synced_at: stamp,
      review_required: false,
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert(row)
      .select("id")
      .maybeSingle();
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin
      .from("booking_ingestion_candidates")
      .update({ status: "approved", created_booking_id: inserted?.id ?? null, resolved_by: context.userId, resolved_at: stamp })
      .eq("id", data.id);
    await supabaseAdmin.from("booking_ingestion_log").insert({
      source: candidate.source, source_channel: candidate.source_channel,
      gmail_message_id: candidate.gmail_message_id, subject: candidate.subject,
      parser: "manual", parse_status: "reviewed", action: "created",
      matched_booking_id: inserted?.id ?? null, reason: "approved_by_admin", actor_user_id: context.userId,
    });

    return { ok: true, action: "created", bookingId: inserted?.id ?? null };
  });

/* ------------------------------------------------------------- ingestion runs */

export const getOpsIntegrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { gmailConfigured } = await import("@/lib/ingestion/gmail.server");
    const { bokunConfigured } = await import("@/lib/integrations/bokun.server");

    const { data: state } = await supabaseAdmin
      .from("integration_state")
      .select("id, enabled, cursor, last_run_at, last_status, last_error, detail");

    const { data: recent } = await supabaseAdmin
      .from("booking_ingestion_log")
      .select("id, created_at, action, parse_status, reason, subject, source_channel, matched_booking_id")
      .order("created_at", { ascending: false })
      .limit(30);

    return {
      gmail: { configured: gmailConfigured() },
      bokun: { configured: bokunConfigured() },
      state: state ?? [],
      recent: recent ?? [],
    };
  });

const runInput = z.object({
  days: z.number().int().min(1).max(365).default(120),
  dryRun: z.boolean().default(true),
  futureOnly: z.boolean().default(true),
  maxMessages: z.number().int().min(1).max(200).default(60),
});

/** Scans Gmail (inbox Bókun notifications + sent vouchers) and ingests. */
export const runOpsEmailIngestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => runInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { gmailConfigured, buildQueries, listMessageIds, getMessage } = await import("@/lib/ingestion/gmail.server");
    const { ingestEmailMessage } = await import("@/lib/ingestion/booking-ingest.server");

    if (!gmailConfigured()) {
      return { ok: false as const, configured: false as const, outcomes: [], summary: {} as Record<string, number> };
    }

    const outcomes: Array<{ action: string; subject: string; reason: string | null; bookingId: string | null }> = [];
    let scanned = 0;

    for (const { query, mailbox } of buildQueries(data.days)) {
      const ids = await listMessageIds(query, Math.ceil(data.maxMessages / 2));
      const messages = [] as Awaited<ReturnType<typeof getMessage>>[];
      for (const { id } of ids) {
        messages.push(await getMessage(id, mailbox));
      }
      // Oldest first, so a creation is recorded before its later cancellation.
      messages.sort((a, b) => (a.receivedAt ?? "").localeCompare(b.receivedAt ?? ""));
      for (const message of messages) {
        scanned += 1;
        const results = await ingestEmailMessage(
          supabaseAdmin,
          {
            gmailMessageId: message.id,
            gmailThreadId: message.threadId,
            subject: message.subject,
            from: message.from,
            body: message.body,
            receivedAt: message.receivedAt,
            mailbox: message.mailbox,
          },
          { dryRun: data.dryRun, futureOnly: data.futureOnly },
        );
        for (const result of results) {
          outcomes.push({
            action: result.action,
            subject: message.subject,
            reason: result.reason,
            bookingId: result.bookingId,
          });
        }
      }
    }

    const summary = outcomes.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.action] = (acc[entry.action] ?? 0) + 1;
      return acc;
    }, {});

    if (!data.dryRun) {
      await supabaseAdmin.from("integration_state").upsert({
        id: "gmail_bookings",
        enabled: true,
        last_run_at: new Date().toISOString(),
        last_status: "ok",
        last_error: null,
        detail: { scanned, summary, days: data.days, by: context.userId } as unknown as Json,
      });
    }

    return { ok: true as const, configured: true as const, scanned, dryRun: data.dryRun, outcomes, summary };
  });

/* -------------------------------------------------------- reconciliation report */

export type ReconciliationGroup =
  | "enriched"
  | "created"
  | "duplicate"
  | "skipped"
  | "conflict";

const RECON_GROUP: Record<string, ReconciliationGroup> = {
  updated: "enriched",
  created: "created",
  cancelled: "enriched",
  duplicate: "duplicate",
  ignored: "skipped",
  needs_review: "conflict",
};

const reconInput = z.object({
  days: z.number().int().min(1).max(365).default(30),
  limit: z.number().int().min(1).max(500).default(200),
});

/**
 * What the last reconciliation passes actually did: which reservations were
 * enriched, which were newly created, which were skipped as duplicates or as
 * cancelled/past/unconfirmed, and which need a human decision. Also lists the
 * Stripe-paid reservations still missing operational detail.
 */
export const listOpsReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reconInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { data: log } = await supabaseAdmin
      .from("booking_ingestion_log")
      .select(
        "id, created_at, source, source_channel, subject, parser, parse_status, action, reason, matched_booking_id, confidence",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const rows = (log ?? []).map((entry) => ({
      ...entry,
      group: RECON_GROUP[entry.action ?? ""] ?? ("skipped" as ReconciliationGroup),
    }));

    const summary = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.group] = (acc[row.group] ?? 0) + 1;
      return acc;
    }, {});

    // Stripe-paid reservations that still read as shells in the diary.
    const today = new Date().toISOString().slice(0, 10);
    const { data: shells } = await supabaseAdmin
      .from("bookings")
      .select("id, created_at, customer_name, customer_email, tour_title, preferred_date, guests, pickup_location, amount_total, currency, stripe_session_id")
      .not("stripe_session_id", "is", null)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(100);

    const incompleteStripe = (shells ?? []).filter((row) => {
      const future = !row.preferred_date || row.preferred_date >= today;
      const missing = !row.preferred_date || !row.pickup_location || !row.tour_title || !row.customer_name;
      return future && missing;
    });

    return { ok: true as const, days: data.days, rows, summary, incompleteStripe };
  });

/* --------------------------------------------- one-time Stripe voucher repair */

const voucherReconInput = z.object({
  dryRun: z.boolean().default(true),
  maxRows: z.number().int().min(1).max(120).default(60),
  maxMessagesPerGuest: z.number().int().min(1).max(20).default(8),
  includeInternalNotifications: z.boolean().default(true),
  notificationDays: z.number().int().min(1).max(365).default(365),
  maxNotifications: z.number().int().min(1).max(300).default(150),
});

/**
 * Historical repair pass: matches Stripe-paid reservations that still lack
 * operational detail against the confirmation/voucher emails already sent to
 * the same guest. Never creates reservations, never rewrites payment truth.
 */
export const runOpsVoucherReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => voucherReconInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { reconcileStripeVouchers } = await import("@/lib/ingestion/stripe-voucher-reconcile.server");
    const report = await reconcileStripeVouchers(supabaseAdmin, {
      dryRun: data.dryRun,
      maxRows: data.maxRows,
      maxMessagesPerGuest: data.maxMessagesPerGuest,
      includeInternalNotifications: data.includeInternalNotifications,
      notificationDays: data.notificationDays,
      maxNotifications: data.maxNotifications,
    });
    return { ok: true as const, report };
  });

/** Last stored result of the voucher reconciliation pass. */
export const getOpsVoucherReconciliationReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: state } = await supabaseAdmin
      .from("integration_state")
      .select("last_run_at, last_status, last_error, detail")
      .eq("id", "stripe_voucher_reconcile")
      .maybeSingle();
    return { ok: true as const, state: state ?? null };
  });

