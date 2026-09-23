/**
 * Stripe + email reconciliation rules:
 *  - a sent voucher enriches the existing Stripe-paid reservation, never duplicates it
 *  - Stripe stays authoritative for payment state and amount
 *  - a cancelled/refunded reservation is never reactivated by an older confirmation
 */
import { describe, expect, it } from "vitest";
import { parseBookingEmail } from "@/lib/ingestion/booking-email-parser";
import { ingestParsedBooking } from "@/lib/ingestion/booking-ingest.server";

const DIRECT_PAID = {
  from: "YES Experiences <hello@yesexperiencesportugal.com>",
  subject: "Booking Confirmed — Private Azeitão Cheese Workshop",
  body: `Hello Sarah,

Private Azeitão Cheese Workshop: Wine & Sesimbra Coastal Tour

Date: 12 May 2036 @ 09:00
Pick-up: Hotel Bairro Alto, Lisbon
Guests: 2 adults
Special rate: EUR 690.00
Status: Confirmed & Fully Paid
Included:
- Private guide and vehicle

Name: Sarah Connor
Email: sarah@example.com
Phone: +1 415 555 0134
`,
};

type Row = Record<string, unknown>;

/** Minimal in-memory stand-in for the admin Supabase client. */
function fakeAdmin(bookings: Row[]) {
  const updates: Array<{ id: string; patch: Row }> = [];
  const inserts: Row[] = [];
  const logs: Row[] = [];

  const builder = (table: string) => {
    const state: { filters: Array<[string, unknown]>; nulls: string[] } = { filters: [], nulls: [] };
    const matches = (row: Row) =>
      state.filters.every(([col, value]) => row[col] === value) &&
      state.nulls.every((col) => row[col] === null || row[col] === undefined);

    const api: Record<string, unknown> = {
      select: () => api,
      order: () => api,
      gte: () => api,
      not: () => api,
      eq: (col: string, value: unknown) => {
        state.filters.push([col, value]);
        return api;
      },
      is: (col: string, value: unknown) => {
        if (value === null) state.nulls.push(col);
        return api;
      },
      maybeSingle: async () => ({ data: table === "bookings" ? (bookings.find(matches) ?? null) : null, error: null }),
      limit: async () => ({ data: table === "bookings" ? bookings.filter(matches) : [], error: null }),
      update: (patch: Row) => ({
        eq: async (_col: string, id: string) => {
          updates.push({ id, patch });
          const row = bookings.find((entry) => entry["id"] === id);
          if (row) Object.assign(row, patch);
          return { data: null, error: null };
        },
      }),
      insert: async (row: Row) => {
        if (table === "booking_ingestion_log") logs.push(row);
        else inserts.push(row);
        return {
          select: () => ({ maybeSingle: async () => ({ data: { id: "new-booking" }, error: null }) }),
          data: null,
          error: null,
        };
      },
      upsert: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: "candidate" }, error: null }) }) }),
    };
    // insert(...).select().maybeSingle() chain support
    const originalInsert = api["insert"] as (row: Row) => Promise<unknown>;
    api["insert"] = (row: Row) => {
      if (table === "booking_ingestion_log") logs.push(row);
      else inserts.push(row);
      void originalInsert;
      return {
        select: () => ({ maybeSingle: async () => ({ data: { id: "new-booking" }, error: null }) }),
        then: (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null }),
      };
    };
    return api;
  };

  return { client: { from: (table: string) => builder(table) }, updates, inserts, logs };
}

const parseDirect = () => {
  const parsed = parseBookingEmail({ ...DIRECT_PAID, sentByUs: true });
  if (parsed.kind === "ignored") throw new Error("expected a parsed voucher");
  return parsed.bookings[0]!;
};

const ctx = {
  source: "EMAIL",
  subject: DIRECT_PAID.subject,
  gmailMessageId: "msg-1",
  gmailThreadId: "thr-1",
};

describe("Stripe + email reconciliation", () => {
  it("enriches an existing Stripe-paid shell instead of creating a duplicate", async () => {
    const shell: Row = {
      id: "b1",
      status: "paid",
      payment_status: "PAID",
      stripe_session_id: "cs_live_123",
      stripe_payment_intent_id: "pi_123",
      amount_total: 69000,
      amount_paid: 69000,
      currency: "eur",
      source: "WEBSITE",
      source_channel: "WEBSITE",
      customer_email: "sarah@example.com",
      preferred_date: null,
    };
    const admin = fakeAdmin([shell]);

    const outcome = await ingestParsedBooking(admin.client as never, parseDirect(), ctx);

    expect(outcome.action).toBe("updated");
    expect(outcome.bookingId).toBe("b1");
    expect(admin.inserts).toHaveLength(0);

    const patch = admin.updates[0]!.patch;
    // Operational truth comes from the voucher…
    expect(patch["preferred_date"]).toBe("2036-05-12");
    expect(patch["pickup_location"]).toContain("Bairro Alto");
    expect(patch["guests"]).toBe(2);
    expect(patch["customer_name"]).toBe("Sarah Connor");
    // …while Stripe stays authoritative for payment and origin.
    expect(patch).not.toHaveProperty("payment_status");
    expect(patch).not.toHaveProperty("amount_paid");
    expect(patch).not.toHaveProperty("currency");
    expect(patch).not.toHaveProperty("source");
    expect(patch).not.toHaveProperty("status");
  });

  it("never reactivates a cancelled reservation from a confirmation email", async () => {
    const admin = fakeAdmin([
      {
        id: "b2",
        status: "cancelled",
        payment_status: "REFUNDED",
        stripe_session_id: "cs_live_9",
        customer_email: "sarah@example.com",
        preferred_date: "2036-05-12",
      },
    ]);

    const outcome = await ingestParsedBooking(admin.client as never, parseDirect(), ctx);

    expect(outcome.action).toBe("ignored");
    expect(outcome.reason).toBe("existing_cancelled_wins");
    expect(admin.updates).toHaveLength(0);
    expect(admin.inserts).toHaveLength(0);
  });
});
