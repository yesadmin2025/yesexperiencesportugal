/**
 * Normalise + dedupe pipeline shared by every ingestion source (Gmail today,
 * the Bókun webhook/API alongside it).
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
  action: IngestAction;
  bookingId: string | null;
  candidateId: string | null;
  reason: string | null;
  slot: number;
  gmailMessageId: string | null;
};

/** Where a single normalised booking came from. */
export type IngestContext = {
  /** EMAIL | BOKUN | MANUAL */
  source: string;
  subject: string;
  gmailMessageId?: string | null;
  gmailThreadId?: string | null;
  sourceEmailUrl?: string | null;
  receivedAt?: string | null;
  rawBody?: string | null;
  fromAddress?: string | null;
  rawPayload?: unknown;
  dryRun?: boolean;
  futureOnly?: boolean;
};

const gmailUrl = (messageId: string) => `https://mail.google.com/mail/u/0/#all/${messageId}`;

const isFutureOrToday = (date: string | null): boolean => {
  if (!date) return false;
  return date >= new Date().toISOString().slice(0, 10);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

type ExistingBooking = {
  id: string;
  status: string;
  payment_status: string | null;
  /** Present on Stripe-paid reservations; makes payment truth authoritative. */
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  amount_total?: number | null;
  amount_paid?: number | null;
  source?: string | null;
  source_channel?: string | null;
  preferred_date?: string | null;
};

const EXISTING_COLUMNS =
  "id, status, payment_status, stripe_session_id, stripe_payment_intent_id, amount_total, amount_paid, source, source_channel, preferred_date";

/**
 * Strongest key first: OTA reference, then the Stripe-paid reservation the
 * voucher belongs to, then guest + day. Stripe "shell" reservations (paid, but
 * with no date or pickup on file yet) are matched on guest alone so the voucher
 * enriches them instead of creating a second row.
 */
async function findExistingBooking(supabaseAdmin: Admin, booking: ParsedBooking): Promise<ExistingBooking | null> {
  const columns = EXISTING_COLUMNS;
  const refs = [booking.externalBookingRef, booking.productBookingRef].filter(Boolean) as string[];
  for (const ref of refs) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .select(columns)
      .eq("external_booking_ref", ref)
      .maybeSingle();
    if (data) return data as ExistingBooking;
  }

  const email = booking.customerEmail ? booking.customerEmail.toLowerCase() : null;
  if (!email) return null;

  // Same guest, same day — unambiguous match.
  if (booking.date) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .select(columns)
      .eq("customer_email", email)
      .eq("preferred_date", booking.date)
      .limit(5);
    const rows = (data ?? []) as ExistingBooking[];
    if (rows.length === 1) return rows[0]!;
    if (rows.length > 1) return null;
  }

  // Stripe-paid reservation with no trip date yet: the voucher completes it.
  const { data: shells } = await supabaseAdmin
    .from("bookings")
    .select(columns)
    .eq("customer_email", email)
    .is("preferred_date", null)
    .limit(5);
  const shellRows = ((shells ?? []) as ExistingBooking[]).filter(
    (row) => !!row.stripe_session_id || !!row.stripe_payment_intent_id,
  );
  if (shellRows.length === 1) return shellRows[0]!;
  return null;
}

/** Stripe owns payment success and amounts; parsed email never overrides it. */
function isStripeAuthoritative(existing: ExistingBooking): boolean {
  return !!existing.stripe_session_id || !!existing.stripe_payment_intent_id;
}

function bookingRow(booking: ParsedBooking, ctx: IngestContext) {
  return {
    booking_type: "signature" as const,
    source: ctx.source,
    source_channel: booking.sourceChannel,
    external_booking_ref: booking.externalBookingRef,
    external_product_ref: booking.externalProductRef,
    product_code: booking.productCode,
    source_message_id: ctx.gmailMessageId ?? null,
    source_thread_id: ctx.gmailThreadId ?? null,
    source_email_url: ctx.sourceEmailUrl ?? (ctx.gmailMessageId ? gmailUrl(ctx.gmailMessageId) : null),
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
    source_raw_payload: (ctx.rawPayload ?? { parser: booking.parser, subject: ctx.subject, slot: booking.slot }),
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
    review_required: false,
    review_reason: null,
  };
}

async function logIngestion(
  supabaseAdmin: Admin,
  ctx: IngestContext,
  entry: {
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
    source: ctx.source,
    source_channel: entry.channel ?? null,
    gmail_message_id: ctx.gmailMessageId ?? null,
    gmail_thread_id: ctx.gmailThreadId ?? null,
    subject: ctx.subject,
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

async function createCandidate(
  supabaseAdmin: Admin,
  ctx: IngestContext,
  booking: ParsedBooking,
  reason: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("booking_ingestion_candidates")
    .upsert(
      {
        source: ctx.source,
        source_channel: booking.sourceChannel,
        gmail_message_id: ctx.gmailMessageId ?? null,
        gmail_thread_id: ctx.gmailThreadId ?? null,
        slot: booking.slot,
        source_email_url: ctx.sourceEmailUrl ?? (ctx.gmailMessageId ? gmailUrl(ctx.gmailMessageId) : null),
        subject: ctx.subject,
        received_at: ctx.receivedAt ?? null,
        detected: booking as never,
        missing_fields: booking.missingFields as never,
        confidence: booking.confidence,
        reason,
        status: "pending",
        raw_payload: {
          from: ctx.fromAddress ?? null,
          body: (ctx.rawBody ?? "").slice(0, 20000),
          payload: ctx.rawPayload ?? null,
        } as never,
      },
      { onConflict: "gmail_message_id,slot" },
    )
    .select("id")
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Applies one normalised booking. Used by the Gmail scan and the Bókun webhook
 * so both sources obey identical dedupe and review rules.
 */
export async function ingestParsedBooking(
  supabaseAdmin: Admin,
  booking: ParsedBooking,
  ctx: IngestContext,
): Promise<IngestOutcome> {
  const dryRun = ctx.dryRun === true;
  const futureOnly = ctx.futureOnly !== false;
  const keys = dedupeKeysFor(booking, ctx.gmailMessageId ?? null);
  const dedupeKey = `${keys[0] ?? `${ctx.source}:${ctx.subject}:${booking.slot}`}:${booking.intent}`;
  const base = { slot: booking.slot, gmailMessageId: ctx.gmailMessageId ?? null };
  const existing = await findExistingBooking(supabaseAdmin, booking);

  // Past-dated reservations are historic paperwork, not operations.
  if (futureOnly && booking.intent === "create" && !isFutureOrToday(booking.date)) {
    if (!dryRun) {
      await logIngestion(supabaseAdmin, ctx, {
        parser: booking.parser, parseStatus: "parsed", action: "ignored",
        reason: "tour_date_in_the_past", confidence: booking.confidence,
        dedupeKey, channel: booking.sourceChannel,
      });
    }
    return { ...base, action: "ignored", bookingId: null, candidateId: null, reason: "tour_date_in_the_past" };
  }

  if (booking.intent === "cancel") {
    if (!existing) {
      const reason = "cancellation_without_matching_booking";
      const candidateId = dryRun ? null : await createCandidate(supabaseAdmin, ctx, booking, reason);
      if (!dryRun) {
        await logIngestion(supabaseAdmin, ctx, {
          parser: booking.parser, parseStatus: "parsed", action: "needs_review",
          reason, confidence: booking.confidence, dedupeKey, channel: booking.sourceChannel,
        });
      }
      return { ...base, action: "needs_review", bookingId: null, candidateId, reason };
    }
    if (!dryRun) {
      await supabaseAdmin
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          source_message_id: ctx.gmailMessageId ?? null,
          source_email_url: ctx.sourceEmailUrl ?? (ctx.gmailMessageId ? gmailUrl(ctx.gmailMessageId) : null),
        } as never)
        .eq("id", existing.id);
      await logIngestion(supabaseAdmin, ctx, {
        parser: booking.parser, parseStatus: "parsed", action: "cancelled",
        bookingId: existing.id, confidence: booking.confidence, dedupeKey, channel: booking.sourceChannel,
      });
    }
    return { ...base, action: "cancelled", bookingId: existing.id, candidateId: null, reason: null };
  }

  const needsReview = booking.reviewRequired || !booking.customerEmail;
  if (needsReview && !existing) {
    const reason = booking.reviewReason ?? "missing_customer_email";
    const candidateId = dryRun ? null : await createCandidate(supabaseAdmin, ctx, booking, reason);
    if (!dryRun) {
      await logIngestion(supabaseAdmin, ctx, {
        parser: booking.parser, parseStatus: "parsed", action: "needs_review",
        reason, confidence: booking.confidence, dedupeKey, channel: booking.sourceChannel,
      });
    }
    return { ...base, action: "needs_review", bookingId: null, candidateId, reason };
  }

  const row = bookingRow(booking, ctx);

  if (existing) {
    if (!dryRun) {
      const patch: Record<string, unknown> = { ...row };
      delete patch["booking_type"];
      delete patch["amount_total"];
      // Never downgrade a confirmed reservation with a weaker later message.
      if (existing.status === "paid" && booking.bookingStatus !== "paid") {
        delete patch["status"];
        delete patch["payment_status"];
      }
      Object.keys(patch).forEach((key) => {
        if (patch[key] === null || patch[key] === undefined) delete patch[key];
      });
      await supabaseAdmin.from("bookings").update(patch as never).eq("id", existing.id);
      await logIngestion(supabaseAdmin, ctx, {
        parser: booking.parser, parseStatus: "parsed", action: "updated",
        bookingId: existing.id, confidence: booking.confidence, dedupeKey,
        channel: booking.sourceChannel, payload: { keys },
      });
    }
    return { ...base, action: "updated", bookingId: existing.id, candidateId: null, reason: null };
  }

  if (dryRun) {
    return { ...base, action: "created", bookingId: null, candidateId: null, reason: null };
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("bookings")
    .insert(row as never)
    .select("id")
    .maybeSingle();
  if (error) {
    const reason = `insert_failed: ${error.message}`;
    const candidateId = await createCandidate(supabaseAdmin, ctx, booking, reason);
    await logIngestion(supabaseAdmin, ctx, {
      parser: booking.parser, parseStatus: "parsed", action: "needs_review",
      reason, confidence: booking.confidence, dedupeKey, channel: booking.sourceChannel,
    });
    return { ...base, action: "needs_review", bookingId: null, candidateId, reason };
  }

  await logIngestion(supabaseAdmin, ctx, {
    parser: booking.parser, parseStatus: "parsed", action: "created",
    bookingId: inserted?.id ?? null, confidence: booking.confidence, dedupeKey,
    channel: booking.sourceChannel, payload: { keys },
  });
  return { ...base, action: "created", bookingId: inserted?.id ?? null, candidateId: null, reason: null };
}

/**
 * Processes one Gmail message. `dryRun` reports what would happen without
 * writing anything (the backfill preview uses it).
 */
export async function ingestEmailMessage(
  supabaseAdmin: Admin,
  message: IngestMessage,
  options: { dryRun?: boolean; futureOnly?: boolean } = {},
): Promise<IngestOutcome[]> {
  const dryRun = options.dryRun === true;
  const ctx: IngestContext = {
    source: "EMAIL",
    subject: message.subject,
    gmailMessageId: message.gmailMessageId,
    gmailThreadId: message.gmailThreadId,
    sourceEmailUrl: gmailUrl(message.gmailMessageId),
    receivedAt: message.receivedAt,
    rawBody: message.body,
    fromAddress: message.from,
    dryRun,
    futureOnly: options.futureOnly,
  };

  // Replay guard: this exact message was already handled.
  const { data: seen } = await supabaseAdmin
    .from("booking_ingestion_log")
    .select("id, action, matched_booking_id")
    .eq("gmail_message_id", message.gmailMessageId)
    .limit(1);
  if ((seen ?? []).length > 0) {
    const first = (seen as Array<{ matched_booking_id: string | null }>)[0]!;
    return [{
      action: "duplicate",
      bookingId: first.matched_booking_id,
      candidateId: null,
      reason: "message_already_ingested",
      slot: 0,
      gmailMessageId: message.gmailMessageId,
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
      await logIngestion(supabaseAdmin, ctx, {
        parser: "none", parseStatus: "ignored", action: "ignored", reason: parsed.reason,
      });
    }
    return [{
      action: "ignored",
      bookingId: null,
      candidateId: null,
      reason: parsed.reason,
      slot: 0,
      gmailMessageId: message.gmailMessageId,
    }];
  }

  const outcomes: IngestOutcome[] = [];
  for (const booking of parsed.bookings) {
    outcomes.push(await ingestParsedBooking(supabaseAdmin, booking, ctx));
  }
  return outcomes;
}
