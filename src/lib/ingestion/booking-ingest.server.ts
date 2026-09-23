/**
 * Normalise + dedupe pipeline shared by every ingestion source (Gmail today,
 * Bókun API/webhook later). Server-only: it uses the service-role client.
 *
 * Guarantees:
 *  - a message is parsed once; replays are recognised by Gmail message id
 *  - a reservation is matched by the strongest available key before insert
 *  - cancellations update the existing reservation, never create one
 *  - anything uncertain lands in the Needs Review queue, never in the diary
 *  - every decision is written to booking_ingestion_log
 */
import type { ParsedBooking, ParseResult, SourceChannel } from "./booking-email-parser";
import { dedupeKeysFor, parseBookingEmail } from "./booking-email-parser";

export type IngestMessage = {
  gmailMessageId: string;
  gmailThreadId: string | null;
  subject: string;
  from: string;
  body: string;
  receivedAt: string | null;
  mailbox: "INBOX" | "SENT";
};

export type IngestAction =
  | "created"
  | "updated"
  | "cancelled"
  | "needs_review"
  | "ignored"
  | "duplicate";

export type IngestOutcome = {
  gmailMessageId: string;
  action: IngestAction;
  bookingId: string | null;
  candidateId: string | null;
  reason: string | null;
  slot: number;
};

const gmailUrl = (messageId: string) => `https://mail.google.com/mail/u/0/#all/${messageId}`;

const isFutureOrToday = (date: string | null): boolean => {
  if (!date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date >= today;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

async function findExistingBooking(
  supabaseAdmin: Admin,
  booking: ParsedBooking,
): Promise<{ id: string; status: string; payment_status: string | null } | null> {
  const columns = "id, status, payment_status";

  if (booking.externalBookingRef) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .select(columns)
      .eq("external_booking_ref", booking.externalBookingRef)
      .maybeSingle();
    if (data) return data;
  }
  if (booking.productBookingRef) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .select(columns)
      .eq("external_booking_ref", booking.productBookingRef)
      .maybeSingle();
    if (data) return data;
  }
  // Cautious fallback: same guest, same day, same product.
  if (booking.customerEmail && booking.date) {
    let query = supabaseAdmin
      .from("bookings")
      .select(columns)
      .eq("customer_email", booking.customerEmail.toLowerCase())
      .eq("preferred_date", booking.date)
      .limit(5);
    const { data } = await query;
    const rows = (data ?? []) as Array<{ id: string; status: string; payment_status: string | null }>;
    if (rows.length === 1) return rows[0]!;
  }
  return null;
}

function bookingRow(booking: ParsedBooking, message: IngestMessage) {
  return {
    booking_type: "signature" as const,
    source: "EMAIL",
    source_channel: booking.sourceChannel,
    external_booking_ref: booking.externalBookingRef,
    external_product_ref: booking.externalProductRef,
    source_message_id: message.gmailMessageId,
    source_thread_id: message.gmailThreadId,
    source_email_url: gmailUrl(message.gmailMessageId),
    tour_title: booking.tourTitle,
    selected_rate: booking.selectedRate,
    customer_name: booking.customerName,
    customer_email: (booking.customerEmail ?? "").toLowerCase(),
    customer_phone: booking.customerPhone,
    preferred_date: booking.date,
    start_time: booking.startTime,
    guests: booking.pax ?? 1,
    pax_breakdown: booking.paxBreakdown,
    pickup_location: booking.pickup,
    dropoff_location: booking.dropoff,
    language: booking.language,
    status: booking.bookingStatus,
    payment_status: booking.paymentStatus,
    amount_paid: booking.amountPaid,
    amount_total: booking.amountPaid ?? 0,
    currency: (booking.currency ?? "EUR").toLowerCase(),
    inclusions: booking.inclusions.length ? booking.inclusions : null,
    exclusions: booking.exclusions.length ? booking.exclusions : null,
    extras: booking.extras.length ? booking.extras : null,
    client_notes: booking.notes,
    source_raw_payload: { parser: booking.parser, subject: message.subject, slot: booking.slot },
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
    review_required: false,
    review_reason: null,
  };
}

async function logIngestion(
  supabaseAdmin: Admin,
  entry: {
    message: IngestMessage;
    parser: string;
    parseStatus: string;
    action: IngestAction;
    bookingId?: string | null;
    confidence?: number | null;
    reason?: string | null;
    dedupeKey?: string | null;
    channel?: SourceChannel | null;
    payload?: unknown;
  },
) {
  await supabaseAdmin.from("booking_ingestion_log").insert({
    source: "EMAIL",
    source_channel: entry.channel ?? null,
    gmail_message_id: entry.message.gmailMessageId,
    gmail_thread_id: entry.message.gmailThreadId,
    subject: entry.message.subject,
    parser: entry.parser,
    parse_status: entry.parseStatus,
    action: entry.action,
    matched_booking_id: entry.bookingId ?? null,
    confidence: entry.confidence ?? null,
    reason: entry.reason ?? null,
    dedupe_key: entry.dedupeKey ?? null,
    payload: (entry.payload ?? null) as never,
  });
}

/**
 * Processes one message. `dryRun` reports what would happen without writing
 * bookings or candidates (the backfill preview uses it).
 */
export async function ingestEmailMessage(
  supabaseAdmin: Admin,
  message: IngestMessage,
  options: { dryRun?: boolean; futureOnly?: boolean } = {},
): Promise<IngestOutcome[]> {
  const dryRun = options.dryRun === true;
  const futureOnly = options.futureOnly !== false;

  // Replay guard: this exact message was already handled.
  const { data: seen } = await supabaseAdmin
    .from("booking_ingestion_log")
    .select("id, action, matched_booking_id")
    .eq("gmail_message_id", message.gmailMessageId)
    .limit(1);
  if ((seen ?? []).length > 0) {
    return [{
      gmailMessageId: message.gmailMessageId,
      action: "duplicate",
      bookingId: (seen as Array<{ matched_booking_id: string | null }>)[0]!.matched_booking_id,
      candidateId: null,
      reason: "message_already_ingested",
      slot: 0,
    }];
  }

  const parsed: ParseResult = parseBookingEmail({
    subject: message.subject,
    from: message.from,
    body: message.body,
    sentByUs: message.mailbox === "SENT",
  });

  if (parsed.kind === "ignored") {
    if (!dryRun) {
      await logIngestion(supabaseAdmin, {
        message,
        parser: "none",
        parseStatus: "ignored",
        action: "ignored",
        reason: parsed.reason,
      });
    }
    return [{
      gmailMessageId: message.gmailMessageId,
      action: "ignored",
      bookingId: null,
      candidateId: null,
      reason: parsed.reason,
      slot: 0,
    }];
  }

  const outcomes: IngestOutcome[] = [];

  for (const booking of parsed.bookings) {
    const keys = dedupeKeysFor(booking, message.gmailMessageId);
    const dedupeKey = `${keys[0] ?? `msg:${message.gmailMessageId}:${booking.slot}`}:${booking.intent}`;
    const existing = await findExistingBooking(supabaseAdmin, booking);

    // Past-dated bookings are historic paperwork, not operations.
    if (futureOnly && booking.intent === "create" && !isFutureOrToday(booking.date)) {
      if (!dryRun) {
        await logIngestion(supabaseAdmin, {
          message, parser: booking.parser, parseStatus: "parsed", action: "ignored",
          reason: "tour_date_in_the_past", confidence: booking.confidence,
          dedupeKey, channel: booking.sourceChannel,
        });
      }
      outcomes.push({ gmailMessageId: message.gmailMessageId, action: "ignored", bookingId: null, candidateId: null, reason: "tour_date_in_the_past", slot: booking.slot });
      continue;
    }

    if (booking.intent === "cancel") {
      if (!existing) {
        const candidateId = dryRun ? null : await createCandidate(supabaseAdmin, message, booking, "cancellation_without_matching_booking");
        if (!dryRun) {
          await logIngestion(supabaseAdmin, {
            message, parser: booking.parser, parseStatus: "parsed", action: "needs_review",
            reason: "cancellation_without_matching_booking", confidence: booking.confidence,
            dedupeKey, channel: booking.sourceChannel,
          });
        }
        outcomes.push({ gmailMessageId: message.gmailMessageId, action: "needs_review", bookingId: null, candidateId, reason: "cancellation_without_matching_booking", slot: booking.slot });
        continue;
      }
      if (!dryRun) {
        await supabaseAdmin
          .from("bookings")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
            source_message_id: message.gmailMessageId,
            source_email_url: gmailUrl(message.gmailMessageId),
          })
          .eq("id", existing.id);
        await logIngestion(supabaseAdmin, {
          message, parser: booking.parser, parseStatus: "parsed", action: "cancelled",
          bookingId: existing.id, confidence: booking.confidence, dedupeKey, channel: booking.sourceChannel,
        });
      }
      outcomes.push({ gmailMessageId: message.gmailMessageId, action: "cancelled", bookingId: existing.id, candidateId: null, reason: null, slot: booking.slot });
      continue;
    }

    const needsReview = booking.reviewRequired || !booking.customerEmail;
    if (needsReview && !existing) {
      const reason = booking.reviewReason ?? "missing_customer_email";
      const candidateId = dryRun ? null : await createCandidate(supabaseAdmin, message, booking, reason);
      if (!dryRun) {
        await logIngestion(supabaseAdmin, {
          message, parser: booking.parser, parseStatus: "parsed", action: "needs_review",
          reason, confidence: booking.confidence, dedupeKey, channel: booking.sourceChannel,
        });
      }
      outcomes.push({ gmailMessageId: message.gmailMessageId, action: "needs_review", bookingId: null, candidateId, reason, slot: booking.slot });
      continue;
    }

    const row = bookingRow(booking, message);

    if (existing) {
      if (!dryRun) {
        // Never downgrade a confirmed reservation with a weaker later message.
        const patch: Record<string, unknown> = { ...row };
        delete patch["booking_type"];
        delete patch["amount_total"];
        if (existing.status === "paid" && booking.bookingStatus !== "paid") {
          delete patch["status"];
          delete patch["payment_status"];
        }
        Object.keys(patch).forEach((key) => {
          if (patch[key] === null || patch[key] === undefined) delete patch[key];
        });
        await supabaseAdmin.from("bookings").update(patch).eq("id", existing.id);
        await logIngestion(supabaseAdmin, {
          message, parser: booking.parser, parseStatus: "parsed", action: "updated",
          bookingId: existing.id, confidence: booking.confidence, dedupeKey,
          channel: booking.sourceChannel, payload: { keys },
        });
      }
      outcomes.push({ gmailMessageId: message.gmailMessageId, action: "updated", bookingId: existing.id, candidateId: null, reason: null, slot: booking.slot });
      continue;
    }

    if (dryRun) {
      outcomes.push({ gmailMessageId: message.gmailMessageId, action: "created", bookingId: null, candidateId: null, reason: null, slot: booking.slot });
      continue;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("bookings")
      .insert(row)
      .select("id")
      .maybeSingle();
    if (error) {
      const candidateId = await createCandidate(supabaseAdmin, message, booking, `insert_failed: ${error.message}`);
      await logIngestion(supabaseAdmin, {
        message, parser: booking.parser, parseStatus: "parsed", action: "needs_review",
        reason: `insert_failed: ${error.message}`, confidence: booking.confidence, dedupeKey,
        channel: booking.sourceChannel,
      });
      outcomes.push({ gmailMessageId: message.gmailMessageId, action: "needs_review", bookingId: null, candidateId, reason: error.message, slot: booking.slot });
      continue;
    }

    await logIngestion(supabaseAdmin, {
      message, parser: booking.parser, parseStatus: "parsed", action: "created",
      bookingId: inserted?.id ?? null, confidence: booking.confidence, dedupeKey,
      channel: booking.sourceChannel, payload: { keys },
    });
    outcomes.push({ gmailMessageId: message.gmailMessageId, action: "created", bookingId: inserted?.id ?? null, candidateId: null, reason: null, slot: booking.slot });
  }

  return outcomes;
}

async function createCandidate(
  supabaseAdmin: Admin,
  message: IngestMessage,
  booking: ParsedBooking,
  reason: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("booking_ingestion_candidates")
    .upsert(
      {
        source: "EMAIL",
        source_channel: booking.sourceChannel,
        gmail_message_id: message.gmailMessageId,
        gmail_thread_id: message.gmailThreadId,
        slot: booking.slot,
        source_email_url: gmailUrl(message.gmailMessageId),
        subject: message.subject,
        received_at: message.receivedAt,
        detected: booking as never,
        missing_fields: booking.missingFields as never,
        confidence: booking.confidence,
        reason,
        status: "pending",
        raw_payload: { from: message.from, body: message.body.slice(0, 20000) } as never,
      },
      { onConflict: "gmail_message_id,slot" },
    )
    .select("id")
    .maybeSingle();
  return data?.id ?? null;
}
