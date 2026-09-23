/**
 * Historical reconciliation: Stripe-paid website reservations that are missing
 * operational detail, matched against two trusted email sources —
 *  1. the confirmation/voucher YES sent to the guest (SENT mail), and
 *  2. YES's own internal "New booking" notification for the same reservation.
 *
 * Deliberately separate from the ordinary Gmail scan:
 *  - it searches mail directly, so previously ignored or logged messages are
 *    re-read (the ordinary replay guard does not apply here);
 *  - it never creates reservations — it only enriches an existing Stripe row,
 *    suppresses a duplicate email row, or files a Needs Review candidate;
 *  - Stripe stays authoritative: paid state, amount, currency, references and
 *    the WEBSITE source are never written from an email.
 */
import {
  classifyMatch,
  extractVoucherBlocks,
  ruleScore,
  type MatchRule,
  type StripeShell,
  type VoucherBlock,
} from "./voucher-reconcile-parser";
import {
  dedupeInternalNotifications,
  internalNotificationQuery,
  parseInternalNotification,
  type InternalNotificationBlock,
} from "./internal-notification-parser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export type ReconcileOutcome =
  | "enriched"
  | "ambiguous"
  | "no_voucher"
  | "already_complete"
  | "excluded_test";

export type EvidenceSource = "sent_voucher" | "internal_notification";

export type ReconcileRowReport = {
  bookingId: string;
  customer: string;
  email: string;
  amount: string;
  tourTitle: string | null;
  date: string | null;
  outcome: ReconcileOutcome;
  rule: MatchRule | null;
  /** "sent_voucher" | "internal_notification" | "both" | null */
  evidence: string | null;
  fields: string[];
  subject: string | null;
  messageDate: string | null;
  duplicateSuppressed: string | null;
  stillIncomplete: boolean;
  reason: string | null;
};

export type ReconcileReport = {
  ran_at: string;
  dry_run: boolean;
  considered: number;
  vouchers_found: number;
  internal_notifications_found: number;
  duplicate_copies_ignored: number;
  enriched: number;
  enriched_by_voucher: number;
  enriched_by_internal: number;
  enriched_by_both: number;
  duplicates_suppressed: number;
  ambiguous: number;
  no_voucher: number;
  still_incomplete: number;
  already_complete: number;
  excluded_test: number;
  rows: ReconcileRowReport[];
};

const TEST_EMAIL = /(^|[+.@])(qa|test|testing|demo)([+.@]|$)|@example\.(com|org)$|\+test/i;

const maskEmail = (email: string): string => {
  const [user = "", domain = ""] = email.split("@");
  const head = user.slice(0, 2);
  return `${head}${user.length > 2 ? "***" : ""}@${domain}`;
};

const maskName = (name: string | null): string => {
  if (!name) return "Unnamed guest";
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? `${parts[parts.length - 1]!.slice(0, 1)}.` : "";
  return [first, last].filter(Boolean).join(" ");
};

const money = (cents: number | null, currency: string | null): string =>
  cents == null ? "—" : `${(cents / 100).toFixed(2)} ${(currency ?? "eur").toUpperCase()}`;

const SHELL_COLUMNS =
  "id, created_at, customer_name, customer_email, customer_phone, tour_title, source_tour_id, selected_rate, preferred_date, start_time, pickup_location, dropoff_location, guests, pax_breakdown, language, inclusions, exclusions, extras, client_notes, amount_total, amount_paid, currency, status, payment_status, source, source_channel, stripe_session_id, stripe_payment_intent_id, metadata";

type ShellRow = StripeShell & Record<string, unknown> & {
  customer_email: string | null;
  customer_name: string | null;
  pickup_location: string | null;
  status: string;
};

type Candidate = {
  key: string;
  source: EvidenceSource;
  block: VoucherBlock;
  productCode: string | null;
  rule: MatchRule;
  score: number;
  subject: string;
  receivedAt: string | null;
  messageId: string;
  threadId: string | null;
};

const gmailUrl = (messageId: string) => `https://mail.google.com/mail/u/0/#all/${messageId}`;

/** Fields an email may fill — only where the reservation is still empty. */
const ENRICHABLE: Array<[column: string, read: (block: VoucherBlock) => unknown]> = [
  ["tour_title", (b) => b.tourTitle],
  ["preferred_date", (b) => b.date],
  ["start_time", (b) => b.startTime],
  ["pickup_location", (b) => b.pickup],
  ["dropoff_location", (b) => b.dropoff],
  ["selected_rate", (b) => b.selectedRate],
  ["language", (b) => b.language],
  ["pax_breakdown", (b) => b.paxBreakdown],
  ["inclusions", (b) => (b.inclusions.length ? b.inclusions : null)],
  ["exclusions", (b) => (b.exclusions.length ? b.exclusions : null)],
  ["extras", (b) => (b.extras.length ? b.extras : null)],
  ["client_notes", (b) => b.notes],
  ["customer_phone", (b) => b.customerPhone],
  ["customer_name", (b) => b.customerName],
];

const isEmptyValue = (value: unknown): boolean =>
  value == null ||
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

/**
 * Fills only blank columns, strongest evidence first. Returns which sources
 * actually contributed a value, so the report can say where detail came from.
 */
function buildPatch(
  shell: ShellRow,
  ordered: Candidate[],
): { patch: Record<string, unknown>; fields: string[]; sources: Set<EvidenceSource> } {
  const patch: Record<string, unknown> = {};
  const sources = new Set<EvidenceSource>();

  for (const candidate of ordered) {
    for (const [column, read] of ENRICHABLE) {
      if (column in patch) continue;
      if (!isEmptyValue(shell[column as keyof ShellRow])) continue;
      const next = read(candidate.block);
      if (next == null || (Array.isArray(next) && next.length === 0)) continue;
      patch[column] = next;
      sources.add(candidate.source);
    }
    // A bare payment notification states no real party size — ignore its pax.
    const paxTrustworthy =
      candidate.source !== "internal_notification" ||
      (candidate.block as InternalNotificationBlock).structured === true;
    if (
      !("guests" in patch) &&
      paxTrustworthy &&
      candidate.block.pax != null &&
      (shell["guests"] == null || shell["guests"] === 1)
    ) {
      patch["guests"] = candidate.block.pax;
      sources.add(candidate.source);
    }
    if (!("source_tour_id" in patch) && candidate.productCode && isEmptyValue(shell["source_tour_id"])) {
      patch["source_tour_id"] = candidate.productCode;
      sources.add(candidate.source);
    }
  }

  return { patch, fields: Object.keys(patch), sources };
}

const evidenceLabel = (sources: Set<EvidenceSource>): string | null => {
  const voucher = sources.has("sent_voucher");
  const internal = sources.has("internal_notification");
  if (voucher && internal) return "both";
  if (voucher) return "sent_voucher";
  if (internal) return "internal_notification";
  return null;
};

type GmailLike = {
  listMessageIds: (query: string, max?: number) => Promise<Array<{ id: string; threadId: string | null }>>;
  getMessage: (id: string, mailbox: "INBOX" | "SENT") => Promise<{
    id: string;
    threadId: string | null;
    subject: string;
    from: string;
    body: string;
    receivedAt: string | null;
  }>;
};

/** One Gmail search for our own recent booking notifications, copies collapsed. */
async function loadInternalNotifications(
  gmail: GmailLike,
  options: { days: number; max: number },
): Promise<{ byEmail: Map<string, Candidate[]>; found: number; ignoredCopies: number }> {
  const ids = await gmail.listMessageIds(internalNotificationQuery(options.days), options.max);
  const parsed: Array<{ block: InternalNotificationBlock; candidate: Candidate }> = [];

  for (const { id } of ids) {
    const message = await gmail.getMessage(id, "INBOX");
    const block = parseInternalNotification({
      from: message.from,
      subject: message.subject,
      body: message.body,
    });
    if (!block) continue;
    parsed.push({
      block,
      candidate: {
        key: `internal:${block.dedupeKey}`,
        source: "internal_notification",
        block,
        productCode: block.productCode,
        rule: "unique_attribution",
        score: 0,
        subject: message.subject,
        receivedAt: message.receivedAt,
        messageId: message.id,
        threadId: message.threadId,
      },
    });
  }

  const { unique, ignoredCopies } = dedupeInternalNotifications(parsed);
  const byEmail = new Map<string, Candidate[]>();
  for (const item of unique) {
    const email = (item.block.customerEmail ?? "").toLowerCase();
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(item.candidate);
    byEmail.set(email, list);
  }
  return { byEmail, found: parsed.length, ignoredCopies };
}

export async function reconcileStripeVouchers(
  supabaseAdmin: Admin,
  options: {
    dryRun?: boolean;
    maxRows?: number;
    maxMessagesPerGuest?: number;
    notificationDays?: number;
    maxNotifications?: number;
    includeInternalNotifications?: boolean;
  } = {},
): Promise<ReconcileReport> {
  const dryRun = options.dryRun === true;
  const maxRows = options.maxRows ?? 60;
  const perGuest = options.maxMessagesPerGuest ?? 8;
  const useInternal = options.includeInternalNotifications !== false;
  const gmailModule = await import("./gmail.server");
  const { listMessageIds, getMessage, gmailConfigured } = gmailModule;
  if (!gmailConfigured()) throw new Error("gmail_not_configured");

  const today = new Date().toISOString().slice(0, 10);

  const { data: rows, error } = await supabaseAdmin
    .from("bookings")
    .select(SHELL_COLUMNS)
    .eq("status", "paid")
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const shells = ((rows ?? []) as ShellRow[]).filter((row) => {
    // Operationally relevant only: today/future, or no date at all.
    if (row.preferred_date && row.preferred_date < today) return false;
    return true;
  });

  const report: ReconcileReport = {
    ran_at: new Date().toISOString(),
    dry_run: dryRun,
    considered: 0,
    vouchers_found: 0,
    internal_notifications_found: 0,
    duplicate_copies_ignored: 0,
    enriched: 0,
    enriched_by_voucher: 0,
    enriched_by_internal: 0,
    enriched_by_both: 0,
    duplicates_suppressed: 0,
    ambiguous: 0,
    no_voucher: 0,
    still_incomplete: 0,
    already_complete: 0,
    excluded_test: 0,
    rows: [],
  };

  let internalByEmail = new Map<string, Candidate[]>();
  if (useInternal) {
    const internal = await loadInternalNotifications(
      { listMessageIds, getMessage } as GmailLike,
      { days: options.notificationDays ?? 365, max: options.maxNotifications ?? 120 },
    );
    internalByEmail = internal.byEmail;
    report.internal_notifications_found = internal.found;
    report.duplicate_copies_ignored = internal.ignoredCopies;
  }

  const paidRowsByEmail = new Map<string, number>();
  for (const row of shells) {
    const email = (row.customer_email ?? "").toLowerCase();
    if (email) paidRowsByEmail.set(email, (paidRowsByEmail.get(email) ?? 0) + 1);
  }

  // Blocks already consumed by a stronger match, so one email cannot enrich
  // two reservations.
  const usedBlocks = new Set<string>();
  const voucherCache = new Map<string, Candidate[]>();

  const queue = shells.slice(0, maxRows);
  for (const shell of queue) {
    const email = (shell.customer_email ?? "").toLowerCase();
    const base = {
      bookingId: shell.id,
      customer: maskName(shell.customer_name),
      email: email ? maskEmail(email) : "—",
      amount: money(shell.amount_total ?? shell.amount_paid ?? null, (shell["currency"] as string) ?? "eur"),
      tourTitle: shell.tour_title,
      date: shell.preferred_date,
      evidence: null as string | null,
      stillIncomplete: false,
    };

    if (!email || TEST_EMAIL.test(email) || (shell.stripe_session_id ?? "").startsWith("cs_test_")) {
      report.excluded_test += 1;
      report.rows.push({ ...base, outcome: "excluded_test", rule: null, fields: [], subject: null, messageDate: null, duplicateSuppressed: null, reason: "test_or_qa_row" });
      continue;
    }

    const complete = !!shell.tour_title && !!shell.preferred_date && !!shell.pickup_location;
    if (complete) {
      report.already_complete += 1;
      report.rows.push({ ...base, outcome: "already_complete", rule: null, fields: [], subject: null, messageDate: null, duplicateSuppressed: null, reason: null });
      continue;
    }

    report.considered += 1;

    // Sent confirmations addressed to this guest — re-read regardless of what
    // the ordinary scan previously did with them.
    let vouchers = voucherCache.get(email);
    if (!vouchers) {
      vouchers = [];
      const ids = await listMessageIds(`in:sent to:${email}`, perGuest);
      for (const { id } of ids) {
        const message = await getMessage(id, "SENT");
        const extracted = extractVoucherBlocks({ subject: message.subject, body: message.body });
        for (const block of extracted) {
          vouchers.push({
            key: `voucher:${message.id}:${block.slot}`,
            source: "sent_voucher",
            block,
            productCode: null,
            rule: "unique_attribution",
            score: 0,
            subject: message.subject,
            receivedAt: message.receivedAt,
            messageId: message.id,
            threadId: message.threadId,
          });
        }
      }
      voucherCache.set(email, vouchers);
    }
    report.vouchers_found += vouchers.length;

    const notifications = internalByEmail.get(email) ?? [];
    const pool = [...notifications, ...vouchers];
    const soleCandidate = (paidRowsByEmail.get(email) ?? 0) === 1 && pool.length === 1;

    const scored: Candidate[] = [];
    for (const candidate of pool) {
      if (usedBlocks.has(candidate.key)) continue;
      const rule = classifyMatch(shell, candidate.block, { soleCandidate });
      if (!rule) continue;
      // A single paid reservation for this guest makes our own notification
      // uniquely attributable even when the date is the only stated detail.
      scored.push({ ...candidate, rule, score: ruleScore(rule) });
    }

    if (scored.length === 0) {
      report.no_voucher += 1;
      report.still_incomplete += 1;
      report.rows.push({
        ...base,
        outcome: "no_voucher",
        rule: null,
        fields: [],
        subject: null,
        messageDate: null,
        duplicateSuppressed: null,
        stillIncomplete: true,
        reason: pool.length ? "no_confident_match" : "no_email_evidence_found",
      });
      if (!dryRun) {
        await supabaseAdmin.from("booking_ingestion_log").insert({
          source: "EMAIL", parser: "reconcile", parse_status: "parsed", action: "ignored",
          matched_booking_id: shell.id, subject: "Stripe email reconciliation",
          reason: pool.length ? "no_confident_email_match" : "no_email_evidence_found",
        });
      }
      continue;
    }

    scored.sort((a, b) => b.score - a.score || (a.receivedAt ?? "").localeCompare(b.receivedAt ?? ""));
    const top = scored.filter((entry) => entry.score === scored[0]!.score);

    let chosen = top[0]!;
    if (top.length > 1) {
      // Disambiguate without guessing: identical evidence for the same booking
      // is one fact; otherwise prefer the block whose date matches the row, then
      // the message sent closest after the payment.
      const sameBooking = top.every(
        (entry) =>
          entry.block.date === top[0]!.block.date &&
          entry.block.amountCents === top[0]!.block.amountCents,
      );
      const byDate = top.filter((entry) => shell.preferred_date && entry.block.date === shell.preferred_date);
      const created = new Date(shell.created_at).getTime();
      const after = top
        .filter((entry) => entry.receivedAt && new Date(entry.receivedAt).getTime() >= created)
        .sort((a, b) => new Date(a.receivedAt!).getTime() - new Date(b.receivedAt!).getTime());

      if (sameBooking) {
        chosen = top[0]!;
      } else if (byDate.length === 1) {
        chosen = byDate[0]!;
      } else if (after.length === 1) {
        chosen = after[0]!;
      } else {
        report.ambiguous += 1;
        report.still_incomplete += 1;
        const reason = `ambiguous_match: ${top.length} possible emails (rule ${top[0]!.rule})`;
        report.rows.push({
          ...base,
          outcome: "ambiguous",
          rule: top[0]!.rule,
          fields: [],
          subject: chosen.subject,
          messageDate: chosen.receivedAt,
          duplicateSuppressed: null,
          stillIncomplete: true,
          evidence: chosen.source,
          reason,
        });
        if (!dryRun) {
          await supabaseAdmin.from("booking_ingestion_candidates").upsert(
            {
              source: "EMAIL", source_channel: "WEBSITE",
              gmail_message_id: chosen.messageId, gmail_thread_id: chosen.threadId, slot: chosen.block.slot,
              source_email_url: gmailUrl(chosen.messageId), subject: chosen.subject,
              received_at: chosen.receivedAt, detected: chosen.block as never,
              missing_fields: [] as never, confidence: chosen.score / 100,
              reason: `${reason} — reservation ${shell.id}`,
              status: "pending",
              raw_payload: { reconciliation: true, booking_id: shell.id, evidence: chosen.source } as never,
            },
            { onConflict: "gmail_message_id,slot" },
          );
          await supabaseAdmin.from("booking_ingestion_log").insert({
            source: "EMAIL", parser: "reconcile", parse_status: "parsed", action: "needs_review",
            matched_booking_id: shell.id, subject: chosen.subject, reason,
          });
        }
        continue;
      }
    }

    // Combine evidence: the winning message first, then any other confident
    // match for the same reservation fills what is still blank.
    const ordered = [chosen, ...scored.filter((entry) => entry.key !== chosen.key && entry.score >= 80)];
    const { patch, fields, sources } = buildPatch(shell, ordered);

    patch["source_message_id"] = chosen.messageId;
    patch["source_thread_id"] = chosen.threadId;
    patch["source_email_url"] = gmailUrl(chosen.messageId);
    patch["sync_status"] = "synced";
    patch["last_synced_at"] = new Date().toISOString();

    const priorMetadata =
      shell["metadata"] && typeof shell["metadata"] === "object" && !Array.isArray(shell["metadata"])
        ? (shell["metadata"] as Record<string, unknown>)
        : {};
    patch["metadata"] = {
      ...priorMetadata,
      email_reconciliation: {
        at: new Date().toISOString(),
        rule: chosen.rule,
        evidence: evidenceLabel(sources) ?? chosen.source,
        gmail_message_id: chosen.messageId,
        subject: chosen.subject,
        fields,
      },
    };

    // A previously imported email row for the same guest and day is the same
    // reservation: suppress it rather than leaving two days in the diary.
    let duplicateSuppressed: string | null = null;
    const dupDate = (patch["preferred_date"] as string | undefined) ?? shell.preferred_date;
    if (dupDate) {
      const { data: dupes } = await supabaseAdmin
        .from("bookings")
        .select("id, source, status")
        .eq("customer_email", email)
        .eq("preferred_date", dupDate)
        .neq("id", shell.id)
        .in("status", ["paid", "pending"])
        .limit(5);
      const duplicate = ((dupes ?? []) as Array<{ id: string; source: string | null }>).find(
        (row) => (row.source ?? "") !== "WEBSITE",
      );
      if (duplicate) {
        duplicateSuppressed = duplicate.id;
        if (!dryRun) {
          await supabaseAdmin
            .from("bookings")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              review_required: false,
              operational_notes: `[reconciliation] Merged into Stripe reservation ${shell.id}; kept as audit record only.`,
              metadata: { duplicate_of: shell.id, suppressed_by: "email_reconciliation" },
            } as never)
            .eq("id", duplicate.id);
          await supabaseAdmin.from("booking_ingestion_log").insert({
            source: "EMAIL", parser: "reconcile", parse_status: "parsed", action: "duplicate",
            matched_booking_id: duplicate.id, subject: chosen.subject,
            reason: `merged_into_stripe_booking:${shell.id}`,
          });
        }
        report.duplicates_suppressed += 1;
      }
    }

    if (!dryRun) {
      const { error: updateError } = await supabaseAdmin.from("bookings").update(patch as never).eq("id", shell.id);
      if (updateError) throw new Error(updateError.message);
      await supabaseAdmin.from("booking_ingestion_log").insert({
        source: "EMAIL", parser: chosen.source === "internal_notification" ? "internal_notify" : "reconcile",
        parse_status: "parsed", action: "updated",
        matched_booking_id: shell.id, gmail_message_id: chosen.messageId, gmail_thread_id: chosen.threadId,
        subject: chosen.subject, confidence: chosen.score / 100,
        reason: `email_reconciled:${chosen.rule}`,
        payload: { fields, rule: chosen.rule, evidence: evidenceLabel(sources) } as never,
      });
    }

    for (const candidate of ordered) {
      if (sources.has(candidate.source)) usedBlocks.add(candidate.key);
    }
    usedBlocks.add(chosen.key);

    const nextTitle = (patch["tour_title"] as string | undefined) ?? shell.tour_title;
    const nextDate = (patch["preferred_date"] as string | undefined) ?? shell.preferred_date;
    const nextPickup = (patch["pickup_location"] as string | undefined) ?? shell.pickup_location;
    const stillIncomplete = !nextTitle || !nextDate || !nextPickup;
    if (stillIncomplete) report.still_incomplete += 1;

    const label = evidenceLabel(sources);
    report.enriched += 1;
    if (label === "both") report.enriched_by_both += 1;
    else if (label === "internal_notification") report.enriched_by_internal += 1;
    else if (label === "sent_voucher") report.enriched_by_voucher += 1;

    report.rows.push({
      ...base,
      tourTitle: nextTitle,
      date: nextDate,
      outcome: "enriched",
      rule: chosen.rule,
      evidence: label ?? chosen.source,
      fields,
      subject: chosen.subject,
      messageDate: chosen.receivedAt,
      duplicateSuppressed,
      stillIncomplete,
      reason: null,
    });
  }

  if (!dryRun) {
    await supabaseAdmin.from("integration_state").upsert({
      id: "stripe_voucher_reconcile",
      enabled: true,
      last_run_at: report.ran_at,
      last_status: "ok",
      last_error: null,
      detail: { ...report, rows: report.rows.slice(0, 120) } as never,
    });
  }

  return report;
}

/* ------------------------------------------------------------------ live scan */

/**
 * Enrich-only path used by the scheduled Gmail scan for our own internal
 * booking notifications. It never creates or cancels a reservation: at most it
 * fills blank operational fields on the matching Stripe row.
 */
export async function enrichFromInternalNotification(
  supabaseAdmin: Admin,
  message: { id: string; threadId: string | null; subject: string; from: string; body: string; receivedAt: string | null },
  options: { dryRun?: boolean } = {},
): Promise<{ action: "updated" | "ignored" | "duplicate" | "needs_review"; bookingId: string | null; reason: string | null }> {
  const dryRun = options.dryRun === true;

  const { data: seen } = await supabaseAdmin
    .from("booking_ingestion_log")
    .select("id, matched_booking_id")
    .eq("gmail_message_id", message.id)
    .limit(1);
  if ((seen ?? []).length > 0) {
    const first = (seen as Array<{ matched_booking_id: string | null }>)[0]!;
    return { action: "duplicate", bookingId: first.matched_booking_id, reason: "message_already_processed" };
  }

  const block = parseInternalNotification({
    from: message.from,
    subject: message.subject,
    body: message.body,
  });
  if (!block || !block.customerEmail) {
    if (!dryRun) {
      await supabaseAdmin.from("booking_ingestion_log").insert({
        source: "EMAIL", parser: "internal_notify", parse_status: "ignored", action: "ignored",
        gmail_message_id: message.id, gmail_thread_id: message.threadId, subject: message.subject,
        reason: "not_an_internal_booking_notification",
      });
    }
    return { action: "ignored", bookingId: null, reason: "not_an_internal_booking_notification" };
  }

  const email = block.customerEmail;
  if (TEST_EMAIL.test(email)) {
    return { action: "ignored", bookingId: null, reason: "test_or_qa_row" };
  }

  const { data: rows } = await supabaseAdmin
    .from("bookings")
    .select(SHELL_COLUMNS)
    .eq("customer_email", email)
    .eq("status", "paid")
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const shells = (rows ?? []) as ShellRow[];
  if (shells.length === 0) {
    return { action: "ignored", bookingId: null, reason: "no_paid_website_reservation" };
  }

  const matches = shells
    .map((shell) => {
      const rule = classifyMatch(shell, block, { soleCandidate: shells.length === 1 });
      return rule ? { shell, rule, score: ruleScore(rule) } : null;
    })
    .filter((entry): entry is { shell: ShellRow; rule: MatchRule; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return { action: "ignored", bookingId: null, reason: "no_confident_match" };
  }
  const best = matches[0]!;
  if (matches.length > 1 && matches[1]!.score === best.score) {
    if (!dryRun) {
      await supabaseAdmin.from("booking_ingestion_log").insert({
        source: "EMAIL", parser: "internal_notify", parse_status: "parsed", action: "needs_review",
        gmail_message_id: message.id, gmail_thread_id: message.threadId, subject: message.subject,
        matched_booking_id: best.shell.id, reason: "ambiguous_internal_notification",
      });
    }
    return { action: "needs_review", bookingId: best.shell.id, reason: "ambiguous_internal_notification" };
  }

  const candidate: Candidate = {
    key: `internal:${block.dedupeKey}`,
    source: "internal_notification",
    block,
    productCode: block.productCode,
    rule: best.rule,
    score: best.score,
    subject: message.subject,
    receivedAt: message.receivedAt,
    messageId: message.id,
    threadId: message.threadId,
  };
  const { patch, fields } = buildPatch(best.shell, [candidate]);
  if (fields.length === 0) {
    if (!dryRun) {
      await supabaseAdmin.from("booking_ingestion_log").insert({
        source: "EMAIL", parser: "internal_notify", parse_status: "parsed", action: "ignored",
        gmail_message_id: message.id, gmail_thread_id: message.threadId, subject: message.subject,
        matched_booking_id: best.shell.id, reason: "already_complete",
      });
    }
    return { action: "ignored", bookingId: best.shell.id, reason: "already_complete" };
  }

  patch["source_message_id"] = message.id;
  patch["source_thread_id"] = message.threadId;
  patch["source_email_url"] = gmailUrl(message.id);
  patch["sync_status"] = "synced";
  patch["last_synced_at"] = new Date().toISOString();

  if (!dryRun) {
    const { error } = await supabaseAdmin.from("bookings").update(patch as never).eq("id", best.shell.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("booking_ingestion_log").insert({
      source: "EMAIL", parser: "internal_notify", parse_status: "parsed", action: "updated",
      gmail_message_id: message.id, gmail_thread_id: message.threadId, subject: message.subject,
      matched_booking_id: best.shell.id, confidence: best.score / 100,
      reason: `internal_notification_enriched:${best.rule}`,
      payload: { fields, rule: best.rule } as never,
    });
  }

  return { action: "updated", bookingId: best.shell.id, reason: `enriched:${fields.length}_fields` };
}
