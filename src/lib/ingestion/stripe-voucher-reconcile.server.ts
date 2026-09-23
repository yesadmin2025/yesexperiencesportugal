/**
 * One-time historical reconciliation: Stripe-paid website reservations that are
 * missing operational detail, matched against the confirmation/voucher emails
 * YES already sent to the same guest.
 *
 * Deliberately separate from the ordinary Gmail scan:
 *  - it searches SENT mail per guest address, so previously ignored or logged
 *    messages are re-read (the ordinary replay guard does not apply here);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export type ReconcileOutcome =
  | "enriched"
  | "ambiguous"
  | "no_voucher"
  | "already_complete"
  | "excluded_test";

export type ReconcileRowReport = {
  bookingId: string;
  customer: string;
  email: string;
  amount: string;
  tourTitle: string | null;
  date: string | null;
  outcome: ReconcileOutcome;
  rule: MatchRule | null;
  fields: string[];
  subject: string | null;
  messageDate: string | null;
  duplicateSuppressed: string | null;
  reason: string | null;
};

export type ReconcileReport = {
  ran_at: string;
  dry_run: boolean;
  considered: number;
  vouchers_found: number;
  enriched: number;
  duplicates_suppressed: number;
  ambiguous: number;
  no_voucher: number;
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
  "id, created_at, customer_name, customer_email, customer_phone, tour_title, selected_rate, preferred_date, start_time, pickup_location, dropoff_location, guests, pax_breakdown, language, inclusions, exclusions, extras, client_notes, amount_total, amount_paid, currency, status, payment_status, source, source_channel, stripe_session_id, stripe_payment_intent_id, metadata";

type ShellRow = StripeShell & Record<string, unknown> & {
  customer_email: string | null;
  customer_name: string | null;
  pickup_location: string | null;
  status: string;
};

type Candidate = {
  key: string;
  block: VoucherBlock;
  rule: MatchRule;
  score: number;
  subject: string;
  receivedAt: string | null;
  messageId: string;
  threadId: string | null;
};

const gmailUrl = (messageId: string) => `https://mail.google.com/mail/u/0/#all/${messageId}`;

/** Fields a voucher may fill — only where the reservation is still empty. */
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

export async function reconcileStripeVouchers(
  supabaseAdmin: Admin,
  options: { dryRun?: boolean; maxRows?: number; maxMessagesPerGuest?: number } = {},
): Promise<ReconcileReport> {
  const dryRun = options.dryRun === true;
  const maxRows = options.maxRows ?? 60;
  const perGuest = options.maxMessagesPerGuest ?? 8;
  const { listMessageIds, getMessage, gmailConfigured } = await import("./gmail.server");
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
    enriched: 0,
    duplicates_suppressed: 0,
    ambiguous: 0,
    no_voucher: 0,
    already_complete: 0,
    excluded_test: 0,
    rows: [],
  };

  const paidRowsByEmail = new Map<string, number>();
  for (const row of shells) {
    const email = (row.customer_email ?? "").toLowerCase();
    if (email) paidRowsByEmail.set(email, (paidRowsByEmail.get(email) ?? 0) + 1);
  }

  // Blocks already consumed by a stronger match, so one voucher cannot enrich
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
    let blocks = voucherCache.get(email);
    if (!blocks) {
      blocks = [];
      const ids = await listMessageIds(`in:sent to:${email}`, perGuest);
      for (const { id } of ids) {
        const message = await getMessage(id, "SENT");
        const extracted = extractVoucherBlocks({ subject: message.subject, body: message.body });
        for (const block of extracted) {
          blocks.push({
            key: `${message.id}:${block.slot}`,
            block,
            rule: "unique_attribution",
            score: 0,
            subject: message.subject,
            receivedAt: message.receivedAt,
            messageId: message.id,
            threadId: message.threadId,
          });
        }
      }
      voucherCache.set(email, blocks);
    }
    report.vouchers_found += blocks.length;

    const soleCandidate = (paidRowsByEmail.get(email) ?? 0) === 1 && blocks.length === 1;
    const scored: Candidate[] = [];
    for (const candidate of blocks) {
      if (usedBlocks.has(candidate.key)) continue;
      const rule = classifyMatch(shell, candidate.block, { soleCandidate });
      if (!rule) continue;
      scored.push({ ...candidate, rule, score: ruleScore(rule) });
    }

    if (scored.length === 0) {
      report.no_voucher += 1;
      report.rows.push({ ...base, outcome: "no_voucher", rule: null, fields: [], subject: null, messageDate: null, duplicateSuppressed: null, reason: blocks.length ? "no_confident_match" : "no_sent_voucher_found" });
      if (!dryRun) {
        await supabaseAdmin.from("booking_ingestion_log").insert({
          source: "EMAIL", parser: "reconcile", parse_status: "parsed", action: "ignored",
          matched_booking_id: shell.id, subject: "Stripe voucher reconciliation",
          reason: blocks.length ? "no_confident_voucher_match" : "no_sent_voucher_found",
        });
      }
      continue;
    }

    scored.sort((a, b) => b.score - a.score || (a.receivedAt ?? "").localeCompare(b.receivedAt ?? ""));
    const top = scored.filter((entry) => entry.score === scored[0]!.score);

    let chosen = top[0]!;
    if (top.length > 1) {
      // Disambiguate without guessing: the block whose date matches the row,
      // otherwise the confirmation sent closest after the payment.
      const byDate = top.filter((entry) => shell.preferred_date && entry.block.date === shell.preferred_date);
      if (byDate.length === 1) {
        chosen = byDate[0]!;
      } else {
        const created = new Date(shell.created_at).getTime();
        const after = top
          .filter((entry) => entry.receivedAt && new Date(entry.receivedAt).getTime() >= created)
          .sort((a, b) => new Date(a.receivedAt!).getTime() - new Date(b.receivedAt!).getTime());
        if (after.length === 1) {
          chosen = after[0]!;
        } else {
          report.ambiguous += 1;
          const reason = `ambiguous_match: ${top.length} possible confirmations (rule ${top[0]!.rule})`;
          report.rows.push({ ...base, outcome: "ambiguous", rule: top[0]!.rule, fields: [], subject: chosen.subject, messageDate: chosen.receivedAt, duplicateSuppressed: null, reason });
          if (!dryRun) {
            await supabaseAdmin.from("booking_ingestion_candidates").upsert(
              {
                source: "EMAIL", source_channel: "WEBSITE",
                gmail_message_id: chosen.messageId, gmail_thread_id: chosen.threadId, slot: chosen.block.slot,
                source_email_url: gmailUrl(chosen.messageId), subject: chosen.subject,
                received_at: chosen.receivedAt, detected: chosen.block as never,
                missing_fields: [] as never, confidence: chosen.score / 100,
                reason: `${reason} — possible reservations: ${top.map(() => shell.id).join(", ")}`,
                status: "pending",
                raw_payload: { reconciliation: true, booking_ids: top.map(() => shell.id) } as never,
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
    }

    // Fill empty operational fields only. Payment truth is untouched.
    const patch: Record<string, unknown> = {};
    for (const [column, read] of ENRICHABLE) {
      const current = shell[column as keyof ShellRow];
      const next = read(chosen.block);
      if (next == null) continue;
      if (current != null && !(Array.isArray(current) && current.length === 0)) continue;
      patch[column] = next;
    }
    if (chosen.block.pax != null && (shell["guests"] == null || shell["guests"] === 1)) {
      patch["guests"] = chosen.block.pax;
    }
    const fields = Object.keys(patch);
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
      voucher_reconciliation: {
        at: new Date().toISOString(),
        rule: chosen.rule,
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
              metadata: { duplicate_of: shell.id, suppressed_by: "voucher_reconciliation" },
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
        source: "EMAIL", parser: "reconcile", parse_status: "parsed", action: "updated",
        matched_booking_id: shell.id, gmail_message_id: chosen.messageId, gmail_thread_id: chosen.threadId,
        subject: chosen.subject, confidence: chosen.score / 100,
        reason: `voucher_reconciled:${chosen.rule}`,
        payload: { fields, rule: chosen.rule } as never,
      });
    }

    usedBlocks.add(chosen.key);
    report.enriched += 1;
    report.rows.push({
      ...base,
      tourTitle: (patch["tour_title"] as string | undefined) ?? shell.tour_title,
      date: (patch["preferred_date"] as string | undefined) ?? shell.preferred_date,
      outcome: "enriched",
      rule: chosen.rule,
      fields,
      subject: chosen.subject,
      messageDate: chosen.receivedAt,
      duplicateSuppressed,
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
