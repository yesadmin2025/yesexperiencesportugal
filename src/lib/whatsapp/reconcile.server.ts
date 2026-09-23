/**
 * WhatsApp evidence → existing reservations.
 *
 * Rules that do not bend:
 *  - Stripe stays authoritative for payment status, amount and references;
 *    a chat message never writes money.
 *  - Bókun/OTA stays authoritative for OTA status and reference.
 *  - WhatsApp may ENRICH an existing reservation (and update operational values
 *    when the chat states a later change). It never creates a reservation from a
 *    casual enquiry; an unmatched confirmation goes to Needs Review instead.
 *  - The most recent explicit cancellation/refund wins: an older confirmation
 *    can never revive it.
 *  - Everything is idempotent by provider message id.
 */
import {
  classifyWhatsAppMatch,
  parseWhatsAppMessage,
  whatsappRuleScore,
  type BookingCandidate,
  type WhatsAppFacts,
  type WhatsAppMatchRule,
} from "./message-parser";
import { normalizePhone, phoneTail } from "./phone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export type WhatsAppMessageInput = {
  providerMessageId: string;
  phone: string;
  direction: "inbound" | "outbound";
  sentAt: string | null;
  body: string | null;
  displayName?: string | null;
  ingestSource?: "webhook" | "history";
};

export type StoredWhatsAppMessage = {
  id: string;
  provider_message_id: string;
  phone_e164: string;
  direction: "inbound" | "outbound";
  sent_at: string | null;
  body: string | null;
  processed_at: string | null;
};

export type WhatsAppAction =
  | "enriched"
  | "updated"
  | "cancellation_recorded"
  | "child_created"
  | "needs_review"
  | "no_match"
  | "ignored"
  | "duplicate";

export type WhatsAppOutcome = {
  action: WhatsAppAction;
  bookingId: string | null;
  rule: WhatsAppMatchRule | null;
  confidence: number | null;
  fields: string[];
  reason: string | null;
  /** Masked, admin-report only. */
  phone: string;
};

export type WhatsAppReconcileReport = {
  ran_at: string;
  dry_run: boolean;
  messages_read: number;
  parsed_operational: number;
  enriched: number;
  updated: number;
  cancellations_recorded: number;
  children_created: number;
  needs_review: number;
  no_match: number;
  ignored: number;
  duplicates: number;
  rows: WhatsAppOutcome[];
};

const BOOKING_COLUMNS =
  "id, created_at, customer_name, customer_email, customer_phone, booking_type, tour_title, source, source_channel, source_tour_id, selected_rate, preferred_date, start_time, pickup_location, dropoff_location, guests, pax_breakdown, language, inclusions, exclusions, extras, client_notes, amount_total, amount_paid, currency, status, payment_status, metadata, last_synced_at";

export const maskPhone = (phone: string): string =>
  phone.length > 5 ? `${phone.slice(0, 4)}•••${phone.slice(-3)}` : "•••";

const emptyReport = (dryRun: boolean): WhatsAppReconcileReport => ({
  ran_at: new Date().toISOString(),
  dry_run: dryRun,
  messages_read: 0,
  parsed_operational: 0,
  enriched: 0,
  updated: 0,
  cancellations_recorded: 0,
  children_created: 0,
  needs_review: 0,
  no_match: 0,
  ignored: 0,
  duplicates: 0,
  rows: [],
});

/* ------------------------------------------------------------------ storage */

async function upsertConversation(
  admin: Admin,
  input: { phone: string; displayName?: string | null; sentAt: string | null; direction: "inbound" | "outbound" },
): Promise<string | null> {
  const { data: existing } = await admin
    .from("whatsapp_conversations")
    .select("id, first_message_at, last_message_at, message_count, display_name")
    .eq("phone_e164", input.phone)
    .maybeSingle();

  const sentAt = input.sentAt ?? new Date().toISOString();

  if (!existing) {
    const { data: inserted } = await admin
      .from("whatsapp_conversations")
      .insert({
        phone_e164: input.phone,
        display_name: input.displayName ?? null,
        first_message_at: sentAt,
        last_message_at: sentAt,
        last_inbound_at: input.direction === "inbound" ? sentAt : null,
        message_count: 1,
      })
      .select("id")
      .maybeSingle();
    return inserted?.id ?? null;
  }

  const patch: Record<string, unknown> = {
    message_count: (existing.message_count ?? 0) + 1,
    last_message_at:
      !existing.last_message_at || sentAt > existing.last_message_at ? sentAt : existing.last_message_at,
  };
  if (!existing.first_message_at || sentAt < existing.first_message_at) patch["first_message_at"] = sentAt;
  if (input.direction === "inbound") patch["last_inbound_at"] = sentAt;
  if (input.displayName && !existing.display_name) patch["display_name"] = input.displayName;

  await admin.from("whatsapp_conversations").update(patch).eq("id", existing.id);
  return existing.id;
}

/**
 * Stores one message. Idempotent: a provider message id we already hold is
 * reported as a duplicate and nothing is written.
 */
export async function recordWhatsAppMessage(
  admin: Admin,
  input: WhatsAppMessageInput,
): Promise<{ duplicate: boolean; row: StoredWhatsAppMessage | null }> {
  const phone = normalizePhone(input.phone);
  if (!phone) return { duplicate: false, row: null };

  const { data: seen } = await admin
    .from("whatsapp_messages")
    .select("id, provider_message_id, phone_e164, direction, sent_at, body, processed_at")
    .eq("provider_message_id", input.providerMessageId)
    .maybeSingle();
  if (seen) return { duplicate: true, row: seen as StoredWhatsAppMessage };

  const conversationId = await upsertConversation(admin, {
    phone,
    displayName: input.displayName ?? null,
    sentAt: input.sentAt,
    direction: input.direction,
  });

  const facts = parseWhatsAppMessage({ body: input.body });
  const { data: inserted, error } = await admin
    .from("whatsapp_messages")
    .insert({
      provider_message_id: input.providerMessageId,
      conversation_id: conversationId,
      phone_e164: phone,
      direction: input.direction,
      sent_at: input.sentAt,
      body: input.body,
      parsed: facts,
      ingest_source: input.ingestSource ?? "webhook",
    })
    .select("id, provider_message_id, phone_e164, direction, sent_at, body, processed_at")
    .maybeSingle();
  if (error) {
    // A racing delivery of the same message id: treat as the duplicate it is.
    if (String(error.message ?? "").includes("duplicate key")) return { duplicate: true, row: null };
    throw new Error(error.message);
  }
  return { duplicate: false, row: (inserted ?? null) as StoredWhatsAppMessage | null };
}

/** Delivery/status callbacks never create booking events — they only annotate. */
export async function recordWhatsAppStatus(
  admin: Admin,
  input: { providerMessageId: string; status: string; timestamp: string | null },
): Promise<{ matched: boolean }> {
  const { data: existing } = await admin
    .from("whatsapp_messages")
    .select("id, delivery_status, delivery_status_at")
    .eq("provider_message_id", input.providerMessageId)
    .maybeSingle();
  if (!existing) return { matched: false };

  const rank: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
  const current = rank[(existing.delivery_status ?? "").toLowerCase()] ?? -1;
  const next = rank[input.status.toLowerCase()] ?? -1;
  // An older "sent" must never overwrite "delivered"/"read".
  if (next < current) return { matched: true };

  await admin
    .from("whatsapp_messages")
    .update({ delivery_status: input.status, delivery_status_at: input.timestamp })
    .eq("id", existing.id);
  return { matched: true };
}

/** Contact name from the phone's address book — identity only, never a booking. */
export async function recordWhatsAppContact(
  admin: Admin,
  input: { phone: string; name: string | null; action: "add" | "remove" },
): Promise<void> {
  const phone = normalizePhone(input.phone);
  if (!phone) return;
  if (input.action === "remove") return;
  const { data: existing } = await admin
    .from("whatsapp_conversations")
    .select("id, display_name")
    .eq("phone_e164", phone)
    .maybeSingle();
  if (!existing) {
    await admin.from("whatsapp_conversations").insert({ phone_e164: phone, display_name: input.name });
    return;
  }
  if (input.name && !existing.display_name) {
    await admin.from("whatsapp_conversations").update({ display_name: input.name }).eq("id", existing.id);
  }
}

/* ----------------------------------------------------------------- matching */

type BookingRow = BookingCandidate & Record<string, unknown>;

/** Reservations reachable from this phone number, directly or via Gmail evidence. */
export async function findBookingsForPhone(admin: Admin, phone: string): Promise<BookingRow[]> {
  const tail = phoneTail(phone);
  if (!tail) return [];

  const direct = await admin
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .or(`customer_phone.ilike.%${tail}%,booking_details->>customerPhone.ilike.%${tail}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = new Map<string, BookingRow>();
  for (const row of (direct.data ?? []) as BookingRow[]) rows.set(row.id, row);

  // Cross-source identity: a Gmail-derived candidate that carried this phone
  // number and is already attached to a reservation.
  const { data: candidates } = await admin
    .from("booking_ingestion_candidates")
    .select("matched_booking_id, detected")
    .not("matched_booking_id", "is", null)
    .limit(200);
  const crossIds = new Set<string>();
  for (const candidate of (candidates ?? []) as Array<{ matched_booking_id: string; detected: unknown }>) {
    const detected = (candidate.detected ?? {}) as Record<string, unknown>;
    const detectedPhone = typeof detected["customerPhone"] === "string" ? detected["customerPhone"] : null;
    if (detectedPhone && phoneTail(detectedPhone) === tail && !rows.has(candidate.matched_booking_id)) {
      crossIds.add(candidate.matched_booking_id);
    }
  }
  if (crossIds.size > 0) {
    const { data: extra } = await admin.from("bookings").select(BOOKING_COLUMNS).in("id", [...crossIds]);
    for (const row of (extra ?? []) as BookingRow[]) rows.set(row.id, { ...row, crossSource: true });
  }

  return [...rows.values()];
}

/* --------------------------------------------------------------- enrichment */

const isEmpty = (value: unknown): boolean =>
  value == null ||
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

/** Blank-only fills. */
const FILLABLE: Array<[column: string, read: (facts: WhatsAppFacts) => unknown]> = [
  ["tour_title", (f) => f.tourTitle],
  ["preferred_date", (f) => f.date],
  ["start_time", (f) => f.startTime],
  ["pickup_location", (f) => f.pickup],
  ["dropoff_location", (f) => f.dropoff],
  ["language", (f) => f.language],
  ["pax_breakdown", (f) => f.paxBreakdown],
  ["extras", (f) => (f.extras.length ? f.extras : null)],
];

/** Operational values a later chat message is allowed to correct. */
const CORRECTABLE = ["pickup_location", "dropoff_location", "start_time", "preferred_date"] as const;

const evidenceOf = (booking: BookingRow): Record<string, unknown> => {
  const metadata =
    booking["metadata"] && typeof booking["metadata"] === "object" && !Array.isArray(booking["metadata"])
      ? (booking["metadata"] as Record<string, unknown>)
      : {};
  const evidence = metadata["whatsapp_evidence"];
  return evidence && typeof evidence === "object" && !Array.isArray(evidence)
    ? (evidence as Record<string, unknown>)
    : {};
};

function notesFrom(facts: WhatsAppFacts): string | null {
  const parts: string[] = [];
  if (facts.occasion) parts.push(`Occasion: ${facts.occasion}`);
  if (facts.dietary.length) parts.push(`Dietary: ${facts.dietary.join(", ")}`);
  if (facts.accessibility.length) parts.push(`Accessibility: ${facts.accessibility.join(", ")}`);
  return parts.length ? parts.join(" · ") : null;
}

/* ------------------------------------------------------------- reconciliation */

export async function reconcileWhatsAppMessage(
  admin: Admin,
  message: StoredWhatsAppMessage,
  options: { dryRun?: boolean } = {},
): Promise<WhatsAppOutcome> {
  const dryRun = options.dryRun === true;
  const phone = normalizePhone(message.phone_e164) ?? message.phone_e164;
  const facts = parseWhatsAppMessage({ body: message.body });
  const sentAt = message.sent_at ?? new Date().toISOString();
  const base = { phone: maskPhone(phone), fields: [] as string[], rule: null as WhatsAppMatchRule | null, confidence: null as number | null };

  const finish = async (outcome: WhatsAppOutcome): Promise<WhatsAppOutcome> => {
    if (!dryRun) {
      await admin
        .from("whatsapp_messages")
        .update({
          processed_at: new Date().toISOString(),
          matched_booking_id: outcome.bookingId,
          match_rule: outcome.rule,
          match_confidence: outcome.confidence,
          review_reason: outcome.action === "needs_review" ? outcome.reason : null,
        })
        .eq("id", message.id);
    }
    return outcome;
  };

  // Nothing operational and no explicit decision: an enquiry stays an enquiry.
  if (!facts.hasOperationalDetail && !facts.confirmed && !facts.cancelled && !facts.refund) {
    return finish({ ...base, action: "ignored", bookingId: null, reason: "casual_enquiry_no_operational_detail" });
  }

  const bookings = await findBookingsForPhone(admin, phone);
  if (bookings.length === 0) {
    // Goal: only an explicit confirmation with independent payment evidence may
    // ever become a reservation. No payment row exists here, so this is filed
    // for a human instead of invented.
    if (facts.confirmed && !dryRun) {
      await admin.from("booking_ingestion_log").insert({
        source: "WHATSAPP",
        source_channel: "DIRECT",
        parser: "whatsapp",
        parse_status: "parsed",
        action: "needs_review",
        reason: "whatsapp_confirmation_without_payment_evidence",
        dedupe_key: `wa:${message.provider_message_id}`,
      });
    }
    return finish({
      ...base,
      action: facts.confirmed ? "needs_review" : "no_match",
      bookingId: null,
      reason: facts.confirmed ? "confirmation_without_payment_evidence" : "no_reservation_for_this_number",
    });
  }

  const scored = bookings
    .map((booking) => {
      const rule = classifyWhatsAppMatch(booking, facts, { soleCandidate: bookings.length === 1 });
      return rule ? { booking, rule, score: whatsappRuleScore(rule) } : null;
    })
    .filter((entry): entry is { booking: BookingRow; rule: WhatsAppMatchRule; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return finish({ ...base, action: "no_match", bookingId: null, reason: "no_confident_match" });
  }

  const best = scored[0]!;
  const tied = scored.filter((entry) => entry.score === best.score);
  if (tied.length > 1) {
    // Disambiguate without guessing: the stated date first, then the booking
    // created closest before the message. Otherwise a human decides.
    const byDate = tied.filter((entry) => facts.date && entry.booking.preferred_date === facts.date);
    const before = tied
      .filter((entry) => new Date(entry.booking.created_at).getTime() <= new Date(sentAt).getTime())
      .sort((a, b) => new Date(b.booking.created_at).getTime() - new Date(a.booking.created_at).getTime());
    const resolved = byDate.length === 1 ? byDate[0]! : before.length === 1 ? before[0]! : null;
    if (!resolved) {
      const reason = `ambiguous_whatsapp_match: ${tied.length} reservations share this number (rule ${best.rule})`;
      if (!dryRun) {
        await admin.from("booking_ingestion_candidates").upsert(
          {
            source: "WHATSAPP",
            source_channel: "DIRECT",
            gmail_message_id: `wa:${message.provider_message_id}`,
            slot: 0,
            subject: `WhatsApp ${maskPhone(phone)}`,
            received_at: sentAt,
            detected: { ...facts, phone: maskPhone(phone) } as never,
            missing_fields: [] as never,
            confidence: best.score / 100,
            reason: `${reason} — candidates ${tied.map((entry) => entry.booking.id).join(", ")}`,
            status: "pending",
            raw_payload: {
              whatsapp: true,
              provider_message_id: message.provider_message_id,
              candidate_booking_ids: tied.map((entry) => entry.booking.id),
            } as never,
          },
          { onConflict: "gmail_message_id,slot" },
        );
        await admin.from("booking_ingestion_log").insert({
          source: "WHATSAPP",
          source_channel: "DIRECT",
          parser: "whatsapp",
          parse_status: "parsed",
          action: "needs_review",
          matched_booking_id: best.booking.id,
          reason,
          dedupe_key: `wa:${message.provider_message_id}`,
        });
      }
      return finish({ ...base, action: "needs_review", bookingId: best.booking.id, rule: best.rule, confidence: best.score / 100, reason });
    }
    return finish(
      await applyToBooking(admin, resolved.booking, resolved.rule, resolved.score, facts, message, sentAt, dryRun),
    );
  }

  return finish(await applyToBooking(admin, best.booking, best.rule, best.score, facts, message, sentAt, dryRun));
}

async function applyToBooking(
  admin: Admin,
  booking: BookingRow,
  rule: WhatsAppMatchRule,
  score: number,
  facts: WhatsAppFacts,
  message: StoredWhatsAppMessage,
  sentAt: string,
  dryRun: boolean,
): Promise<WhatsAppOutcome> {
  const phone = maskPhone(normalizePhone(message.phone_e164) ?? message.phone_e164);
  const evidence = evidenceOf(booking);
  const cancelledAt = typeof evidence["cancellation_at"] === "string" ? (evidence["cancellation_at"] as string) : null;
  const confidence = score / 100;
  const out = (action: WhatsAppAction, reason: string | null, fields: string[] = []): WhatsAppOutcome => ({
    action,
    bookingId: booking.id,
    rule,
    confidence,
    fields,
    reason,
    phone,
  });

  // Latest explicit cancellation wins: an older message can never revive it.
  if (cancelledAt && sentAt <= cancelledAt) {
    return out("ignored", "superseded_by_later_cancellation");
  }

  const log = async (action: string, reason: string, payload: Record<string, unknown>) => {
    if (dryRun) return;
    await admin.from("booking_ingestion_log").insert({
      source: "WHATSAPP",
      source_channel: "DIRECT",
      parser: "whatsapp",
      parse_status: "parsed",
      action,
      matched_booking_id: booking.id,
      confidence,
      reason,
      subject: `WhatsApp ${phone}`,
      dedupe_key: `wa:${message.provider_message_id}`,
      payload: payload as never,
    });
  };

  const nextEvidence = (extra: Record<string, unknown>) => {
    const metadata =
      booking["metadata"] && typeof booking["metadata"] === "object" && !Array.isArray(booking["metadata"])
        ? (booking["metadata"] as Record<string, unknown>)
        : {};
    const messages = Array.isArray(evidence["message_ids"]) ? (evidence["message_ids"] as string[]) : [];
    return {
      ...metadata,
      whatsapp_evidence: {
        ...evidence,
        phone: normalizePhone(message.phone_e164),
        rule,
        last_message_at: sentAt,
        last_message_id: message.provider_message_id,
        message_ids: [...messages.slice(-49), message.provider_message_id],
        ...extra,
      },
    };
  };

  /* ---------------------------------------------------- cancellation / refund */
  if (facts.cancelled || facts.refund) {
    const paid = String(booking["payment_status"] ?? "").toUpperCase() === "PAID" || booking.status === "paid";
    const stamp = sentAt.slice(0, 16).replace("T", " ");
    const note = `[whatsapp ${stamp}] Guest stated ${facts.refund ? "a refund" : "a cancellation"} on WhatsApp.`;
    const patch: Record<string, unknown> = {
      review_required: true,
      review_reason: facts.refund ? "WhatsApp refund request — payment action needed" : "WhatsApp cancellation stated",
      operational_notes: [booking["operational_notes"], note].filter(Boolean).join("\n"),
      metadata: nextEvidence({ cancellation_at: sentAt, cancellation_kind: facts.refund ? "refund" : "cancellation" }),
      last_synced_at: new Date().toISOString(),
    };
    // Money movement stays with Stripe: an unpaid day is suppressed here, a paid
    // one is flagged so a human refunds it through the existing action.
    if (!paid && booking.status !== "cancelled") {
      patch["status"] = "cancelled";
      patch["cancelled_at"] = new Date().toISOString();
    }
    if (!dryRun) {
      const { error } = await admin.from("bookings").update(patch as never).eq("id", booking.id);
      if (error) throw new Error(error.message);
    }
    await log("cancelled", paid ? "whatsapp_cancellation_paid_needs_refund" : "whatsapp_cancellation_suppressed", {
      paid,
    });
    return out("cancellation_recorded", paid ? "paid_booking_flagged_for_refund" : "booking_cancelled", ["status"]);
  }

  /* --------------------------------------------------- multi-date package child */
  const extraDates = facts.dates.filter((date) => date !== booking.preferred_date);
  const childDate = booking.preferred_date && extraDates.length > 0 && !facts.reschedule ? extraDates[0]! : null;

  /* ------------------------------------------------------------- enrich / fix */
  const patch: Record<string, unknown> = {};
  const fields: string[] = [];

  for (const [column, read] of FILLABLE) {
    if (!isEmpty(booking[column as keyof BookingRow])) continue;
    const value = read(facts);
    if (value == null || (Array.isArray(value) && value.length === 0)) continue;
    patch[column] = value;
    fields.push(column);
  }
  if (isEmpty(booking["customer_phone"])) {
    patch["customer_phone"] = normalizePhone(message.phone_e164);
    fields.push("customer_phone");
  }
  if (facts.pax != null && (booking["guests"] == null || booking["guests"] === 1) && !("guests" in patch)) {
    patch["guests"] = facts.pax;
    fields.push("guests");
  }
  const notes = notesFrom(facts);
  if (notes && isEmpty(booking["client_notes"])) {
    patch["client_notes"] = notes;
    fields.push("client_notes");
  }

  // A later message that states a different pick-up / time / date corrects the
  // operational record, and the change is audited.
  const lastEvidenceAt = typeof evidence["last_message_at"] === "string" ? (evidence["last_message_at"] as string) : null;
  const newer = !lastEvidenceAt || sentAt >= lastEvidenceAt;
  const corrections: Record<string, { from: unknown; to: unknown }> = {};
  if (newer) {
    for (const column of CORRECTABLE) {
      if (column in patch) continue;
      const stated =
        column === "pickup_location"
          ? facts.pickup
          : column === "dropoff_location"
            ? facts.dropoff
            : column === "start_time"
              ? facts.startTime
              : facts.reschedule
                ? facts.date
                : null;
      if (!stated) continue;
      const current = booking[column as keyof BookingRow];
      if (typeof current === "string" && current.trim() === stated.trim()) continue;
      if (isEmpty(current)) continue; // already handled as a blank fill
      patch[column] = stated;
      fields.push(column);
      corrections[column] = { from: current ?? null, to: stated };
    }
  }

  if (fields.length === 0 && !childDate) {
    await log("ignored", "whatsapp_states_no_new_detail", {});
    return out("ignored", "whatsapp_states_no_new_detail");
  }

  if (Object.keys(corrections).length > 0) {
    const stamp = sentAt.slice(0, 16).replace("T", " ");
    const lines = Object.entries(corrections).map(
      ([column, change]) => `${column.replace(/_/g, " ")}: ${String(change.from ?? "—")} → ${String(change.to)}`,
    );
    patch["operational_notes"] = [booking["operational_notes"], `[whatsapp ${stamp}] ${lines.join("; ")}`]
      .filter(Boolean)
      .join("\n");
  }

  patch["metadata"] = nextEvidence({ fields });
  patch["sync_status"] = "synced";
  patch["last_synced_at"] = new Date().toISOString();

  if (!dryRun && fields.length > 0) {
    const { error } = await admin.from("bookings").update(patch as never).eq("id", booking.id);
    if (error) throw new Error(error.message);
  }

  /* ------------------------------------- one payment, several operational days */
  if (childDate) {
    const { data: existingChild } = await admin
      .from("bookings")
      .select("id")
      .eq("customer_email", booking["customer_email"] as string)
      .eq("preferred_date", childDate)
      .neq("id", booking.id)
      .limit(1);
    if ((existingChild ?? []).length === 0) {
      if (!dryRun) {
        // Revenue stays on the parent: the child carries operations only.
        await admin.from("bookings").insert({
          booking_type: booking["booking_type"] ?? "signature",
          source: booking["source"] ?? "WEBSITE",
          source_channel: booking["source_channel"] ?? "WEBSITE",
          customer_email: booking["customer_email"],
          customer_name: booking["customer_name"],
          customer_phone: normalizePhone(message.phone_e164),
          tour_title: facts.tourTitle ?? booking["tour_title"],
          preferred_date: childDate,
          start_time: facts.startTime ?? null,
          pickup_location: facts.pickup ?? null,
          guests: facts.pax ?? booking["guests"] ?? 1,
          amount_total: 0,
          amount_paid: 0,
          currency: booking["currency"] ?? "eur",
          status: booking["status"] ?? "pending",
          payment_status: "PAID_IN_PARENT",
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          operational_notes: `[whatsapp] Second day of the package paid on reservation ${booking.id}. No separate revenue.`,
          metadata: {
            package_parent_booking_id: booking.id,
            revenue_in_parent: true,
            whatsapp_evidence: { phone: normalizePhone(message.phone_e164), last_message_id: message.provider_message_id },
          },
        } as never);
      }
      await log("created", "whatsapp_package_child_day", { parent: booking.id, date: childDate });
      return out("child_created", `package_child_${childDate}`, fields);
    }
  }

  await log("updated", `whatsapp_enriched:${rule}`, { fields, corrections });
  return out(Object.keys(corrections).length > 0 ? "updated" : "enriched", null, fields);
}

/* ------------------------------------------------------------ batch + history */

/** Re-reads stored WhatsApp messages and reconciles them. Dry-run safe. */
export async function reconcileStoredWhatsAppMessages(
  admin: Admin,
  options: { dryRun?: boolean; limit?: number; onlyUnprocessed?: boolean } = {},
): Promise<WhatsAppReconcileReport> {
  const dryRun = options.dryRun === true;
  const report = emptyReport(dryRun);

  let query = admin
    .from("whatsapp_messages")
    .select("id, provider_message_id, phone_e164, direction, sent_at, body, processed_at")
    .order("sent_at", { ascending: true, nullsFirst: true })
    .limit(options.limit ?? 200);
  if (options.onlyUnprocessed !== false) query = query.is("processed_at", null);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  for (const row of (rows ?? []) as StoredWhatsAppMessage[]) {
    report.messages_read += 1;
    const outcome = await reconcileWhatsAppMessage(admin, row, { dryRun });
    if (outcome.action === "enriched") report.enriched += 1;
    else if (outcome.action === "updated") report.updated += 1;
    else if (outcome.action === "cancellation_recorded") report.cancellations_recorded += 1;
    else if (outcome.action === "child_created") report.children_created += 1;
    else if (outcome.action === "needs_review") report.needs_review += 1;
    else if (outcome.action === "no_match") report.no_match += 1;
    else if (outcome.action === "duplicate") report.duplicates += 1;
    else report.ignored += 1;
    if (outcome.fields.length > 0 || outcome.action !== "ignored") report.parsed_operational += 1;
    report.rows.push(outcome);
  }

  if (!dryRun) {
    await admin.from("integration_state").upsert({
      id: "whatsapp_reconcile",
      enabled: true,
      last_run_at: report.ran_at,
      last_status: "ok",
      last_error: null,
      detail: { ...report, rows: report.rows.slice(0, 120) } as never,
    });
  }

  return report;
}

/**
 * Admin action: ask Meta to replay past chats and contacts (when the connector
 * permits it), then reconcile everything already stored. Historical messages
 * arrive on the webhook, so this reports what was requested and what the store
 * currently yields.
 */
export async function importWhatsAppHistory(
  admin: Admin,
  options: { dryRun?: boolean; requestSync?: boolean; limit?: number } = {},
): Promise<{
  configured: boolean;
  requested: string[];
  errors: string[];
  report: WhatsAppReconcileReport;
}> {
  const { whatsappConfigured, requestWhatsAppHistorySync } = await import("./client.server");
  const configured = whatsappConfigured();
  let requested: string[] = [];
  let errors: string[] = [];

  if (configured && options.requestSync !== false && options.dryRun !== true) {
    const result = await requestWhatsAppHistorySync();
    requested = result.requested;
    errors = result.errors;
    if (requested.length > 0) {
      await admin.from("integration_state").upsert({
        id: "whatsapp_history",
        enabled: true,
        last_run_at: new Date().toISOString(),
        last_status: errors.length ? "partial" : "ok",
        last_error: errors[0]?.slice(0, 500) ?? null,
        detail: { requested, errors } as never,
      });
    }
  }

  const report = await reconcileStoredWhatsAppMessages(admin, {
    dryRun: options.dryRun === true,
    limit: options.limit ?? 300,
    onlyUnprocessed: false,
  });

  return { configured, requested, errors, report };
}
