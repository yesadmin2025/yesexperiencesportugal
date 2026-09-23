/**
 * WhatsApp evidence pipeline — behaviour that must never regress.
 *
 * A tiny in-memory stand-in for the admin database client supports the exact
 * query shapes the reconciler uses, so these are real end-to-end checks of the
 * matching/enrichment rules rather than assertions about mocks.
 */
import { describe, expect, it } from "vitest";
import { parseWhatsAppMessage } from "@/lib/whatsapp/message-parser";
import {
  recordWhatsAppMessage,
  recordWhatsAppStatus,
  reconcileWhatsAppMessage,
  reconcileStoredWhatsAppMessages,
} from "@/lib/whatsapp/reconcile.server";

/* --------------------------------------------------------------- fake client */

type Row = Record<string, any>;

function matchOr(row: Row, expression: string): boolean {
  return expression.split(",").some((clause) => {
    const [pathAndOp, ...rest] = clause.split(".");
    const parts = clause.split(".");
    const op = parts.length >= 2 ? parts[1] : "eq";
    const value = parts.slice(2).join(".");
    const column = (pathAndOp ?? "").split("->>")[0]!;
    const current = row[column];
    if (op === "ilike") {
      const needle = value.replace(/%/g, "").toLowerCase();
      return typeof current === "string" && current.toLowerCase().includes(needle);
    }
    if (op === "eq") return String(current) === value;
    void rest;
    return false;
  });
}

function makeDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {
    bookings: [],
    whatsapp_messages: [],
    whatsapp_conversations: [],
    whatsapp_webhook_events: [],
    booking_ingestion_candidates: [],
    booking_ingestion_log: [],
    integration_state: [],
    ...seed,
  };
  let ids = 0;
  const nextId = () => `id-${++ids}`;

  function query(table: string) {
    const preds: Array<(row: Row) => boolean> = [];
    let rows = () => tables[table]!.filter((row) => preds.every((pred) => pred(row)));
    let selected: Row[] | null = null;
    let mode: "select" | "insert" | "update" | "upsert" = "select";
    let payload: Row | Row[] | null = null;
    let sort: { column: string; asc: boolean } | null = null;
    let take: number | null = null;

    const api: any = {
      select: () => api,
      eq: (column: string, value: unknown) => (preds.push((row) => String(row[column]) === String(value)), api),
      neq: (column: string, value: unknown) => (preds.push((row) => String(row[column]) !== String(value)), api),
      is: (column: string, value: null) => (preds.push((row) => (row[column] ?? null) === value), api),
      not: (column: string, _op: string, _value: null) =>
        (preds.push((row) => (row[column] ?? null) !== null), api),
      in: (column: string, values: unknown[]) =>
        (preds.push((row) => values.map(String).includes(String(row[column]))), api),
      or: (expression: string) => (preds.push((row) => matchOr(row, expression)), api),
      order: (column: string, opts?: { ascending?: boolean }) => (
        (sort = { column, asc: opts?.ascending !== false }), api
      ),
      limit: (count: number) => ((take = count), api),
      insert: (value: Row | Row[]) => ((mode = "insert"), (payload = value), api),
      update: (value: Row) => ((mode = "update"), (payload = value), api),
      upsert: (value: Row) => ((mode = "upsert"), (payload = value), api),
      maybeSingle: async () => {
        const result = await api;
        const list = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
        return { data: list[0] ?? null, error: result.error };
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
        if (mode === "insert") {
          const list = Array.isArray(payload) ? payload : [payload!];
          const inserted = list.map((entry) => ({ id: entry["id"] ?? nextId(), ...entry }));
          for (const entry of inserted) {
            const unique = ["provider_message_id", "delivery_id", "phone_e164"].find((key) => key in entry);
            if (unique && tables[table]!.some((row) => row[unique] === entry[unique] && table !== "bookings")) {
              return resolve({ data: null, error: { message: "duplicate key value" } as any });
            }
            tables[table]!.push(entry);
          }
          selected = inserted;
        } else if (mode === "update") {
          selected = rows().map((row) => Object.assign(row, payload));
        } else if (mode === "upsert") {
          const entry = payload as Row;
          const key = "id" in entry ? "id" : "gmail_message_id";
          const existing = tables[table]!.find((row) => row[key] === entry[key]);
          if (existing) Object.assign(existing, entry);
          else tables[table]!.push({ id: entry["id"] ?? nextId(), ...entry });
          selected = [entry];
        } else {
          let list = rows();
          if (sort) {
            const { column, asc } = sort;
            list = [...list].sort((a, b) =>
              asc
                ? String(a[column] ?? "").localeCompare(String(b[column] ?? ""))
                : String(b[column] ?? "").localeCompare(String(a[column] ?? "")),
            );
          }
          if (take != null) list = list.slice(0, take);
          selected = list;
        }
        return resolve({ data: selected, error: null });
      },
    };
    void rows;
    return api;
  }

  return { client: { from: (table: string) => query(table) } as any, tables };
}

const booking = (over: Row = {}): Row => ({
  id: over["id"] ?? "booking-1",
  created_at: "2026-01-02T10:00:00.000Z",
  customer_name: "Ana Silva",
  customer_email: "ana@example.com",
  customer_phone: "+351912345678",
  booking_type: "signature",
  tour_title: "Private Arrábida Premium Wine Day",
  source: "WEBSITE",
  source_channel: "WEBSITE",
  preferred_date: "2026-03-14",
  start_time: null,
  pickup_location: null,
  dropoff_location: null,
  guests: 2,
  amount_total: 49800,
  amount_paid: 49800,
  currency: "eur",
  status: "paid",
  payment_status: "PAID",
  metadata: {},
  ...over,
});

async function store(db: ReturnType<typeof makeDb>, input: Row) {
  return recordWhatsAppMessage(db.client, {
    providerMessageId: input["id"],
    phone: input["phone"] ?? "+351912345678",
    direction: "inbound",
    sentAt: input["sentAt"] ?? "2026-02-01T09:00:00.000Z",
    body: input["body"],
  });
}

/* -------------------------------------------------------------------- tests */

describe("WhatsApp evidence", () => {
  it("1) a casual enquiry never becomes a booking", async () => {
    const db = makeDb({ bookings: [booking()] });
    const { row } = await store(db, { id: "wa-1", body: "Hi! How much is a private wine day? Do you have availability in March?" });
    const outcome = await reconcileWhatsAppMessage(db.client, row!);
    expect(outcome.action).toBe("ignored");
    expect(db.tables["bookings"]).toHaveLength(1);
  });

  it("2) a confirmation on the paid reservation's phone enriches it", async () => {
    const db = makeDb({ bookings: [booking({ pickup_location: null })] });
    const { row } = await store(db, {
      id: "wa-2",
      body: "Booking confirmed and fully paid. Pickup: Hotel Avenida Palace, Lisbon. Date: 2026-03-14 at 09:30. 2 guests.",
    });
    const outcome = await reconcileWhatsAppMessage(db.client, row!);
    expect(outcome.action).toBe("enriched");
    expect(outcome.bookingId).toBe("booking-1");
    expect(db.tables["bookings"]![0]!["pickup_location"]).toContain("Hotel Avenida Palace");
    expect(db.tables["bookings"]![0]!["amount_total"]).toBe(49800);
  });

  it("3) two reservations on one phone are disambiguated by the stated date", async () => {
    const db = makeDb({
      bookings: [
        booking({ id: "b-a", preferred_date: "2026-03-14" }),
        booking({ id: "b-b", preferred_date: "2026-04-20", created_at: "2026-01-03T10:00:00.000Z" }),
      ],
    });
    const { row } = await store(db, { id: "wa-3", body: "Confirmed. 2026-04-20, pickup: Cais do Sodré at 09:00." });
    const outcome = await reconcileWhatsAppMessage(db.client, row!);
    expect(outcome.bookingId).toBe("b-b");
    expect(outcome.action).toBe("enriched");
  });

  it("4) an ambiguous phone match goes to Needs Review, never guessed", async () => {
    const db = makeDb({
      bookings: [
        booking({ id: "b-a", preferred_date: null, amount_total: 49800 }),
        booking({ id: "b-b", preferred_date: null, amount_total: 49800 }),
      ],
    });
    const { row } = await store(db, { id: "wa-4", body: "Confirmed and fully paid, pickup: Hotel Tivoli." });
    const outcome = await reconcileWhatsAppMessage(db.client, row!);
    expect(outcome.action).toBe("needs_review");
    expect(outcome.reason).toContain("ambiguous_whatsapp_match");
    expect(db.tables["booking_ingestion_candidates"]!.length).toBe(1);
  });

  it("5) a later chat message corrects the pick-up and audits the change", async () => {
    const db = makeDb({ bookings: [booking({ pickup_location: "Hotel Tivoli" })] });
    const { row } = await store(db, {
      id: "wa-5",
      sentAt: "2026-03-10T08:00:00.000Z",
      body: "Confirmed. Small change please — pickup: Hotel Bairro Alto instead. 2026-03-14.",
    });
    const outcome = await reconcileWhatsAppMessage(db.client, row!);
    expect(outcome.action).toBe("updated");
    expect(db.tables["bookings"]![0]!["pickup_location"]).toBe("Hotel Bairro Alto");
    expect(String(db.tables["bookings"]![0]!["operational_notes"])).toContain("Hotel Tivoli");
  });

  it("6) a cancellation is recorded and an older confirmation cannot revive it", async () => {
    const db = makeDb({ bookings: [booking({ status: "pending", payment_status: "PENDING_PAYMENT" })] });
    const cancel = await store(db, {
      id: "wa-6a",
      sentAt: "2026-03-11T08:00:00.000Z",
      body: "We need to cancel our tour on 2026-03-14, sorry.",
    });
    const cancelled = await reconcileWhatsAppMessage(db.client, cancel.row!);
    expect(cancelled.action).toBe("cancellation_recorded");
    expect(db.tables["bookings"]![0]!["status"]).toBe("cancelled");

    const older = await store(db, {
      id: "wa-6b",
      sentAt: "2026-03-01T08:00:00.000Z",
      body: "Booking confirmed and fully paid, pickup: Hotel Tivoli, 2026-03-14.",
    });
    const replay = await reconcileWhatsAppMessage(db.client, older.row!);
    expect(replay.action).toBe("ignored");
    expect(db.tables["bookings"]![0]!["status"]).toBe("cancelled");
  });

  it("7) a duplicated webhook delivery stores nothing twice", async () => {
    const db = makeDb({ bookings: [booking()] });
    const first = await store(db, { id: "wa-7", body: "Confirmed, pickup: Hotel Real, 2026-03-14." });
    const second = await store(db, { id: "wa-7", body: "Confirmed, pickup: Hotel Real, 2026-03-14." });
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(db.tables["whatsapp_messages"]).toHaveLength(1);
  });

  it("8) re-running the historical import is idempotent", async () => {
    const db = makeDb({ bookings: [booking()] });
    await store(db, { id: "wa-8", body: "Confirmed and fully paid. Pickup: Hotel Real at 09:15, 2026-03-14." });
    const first = await reconcileStoredWhatsAppMessages(db.client, { onlyUnprocessed: true });
    const second = await reconcileStoredWhatsAppMessages(db.client, { onlyUnprocessed: true });
    expect(first.messages_read).toBe(1);
    expect(second.messages_read).toBe(0);
    expect(db.tables["bookings"]).toHaveLength(1);
  });

  it("9) one payment covering two days creates an operational child with no revenue", async () => {
    const db = makeDb({ bookings: [booking()] });
    const { row } = await store(db, {
      id: "wa-9",
      body: "Confirmed and fully paid for 2026-03-14 and also 2026-03-16. Pickup: Hotel Real.",
    });
    const outcome = await reconcileWhatsAppMessage(db.client, row!);
    expect(outcome.action).toBe("child_created");
    const child = db.tables["bookings"]!.find((r) => r["preferred_date"] === "2026-03-16");
    expect(child).toBeTruthy();
    expect(child!["amount_total"]).toBe(0);
    expect(child!["metadata"]["package_parent_booking_id"]).toBe("booking-1");
  });

  it("delivery statuses never create booking events and never go backwards", async () => {
    const db = makeDb({ bookings: [booking()] });
    await store(db, { id: "wa-10", body: "Confirmed, pickup: Hotel Real, 2026-03-14." });
    await recordWhatsAppStatus(db.client, { providerMessageId: "wa-10", status: "delivered", timestamp: "2026-02-01T09:05:00.000Z" });
    await recordWhatsAppStatus(db.client, { providerMessageId: "wa-10", status: "sent", timestamp: "2026-02-01T09:01:00.000Z" });
    expect(db.tables["whatsapp_messages"]![0]!["delivery_status"]).toBe("delivered");
    expect(db.tables["bookings"]).toHaveLength(1);
  });

  it("a quote request is never read as a confirmation", () => {
    const facts = parseWhatsAppMessage({ body: "Could you send a quote? Maybe 2026-05-02 for 4 people." });
    expect(facts.confirmed).toBe(false);
    expect(facts.intent).toBe("inquiry");
  });
});
