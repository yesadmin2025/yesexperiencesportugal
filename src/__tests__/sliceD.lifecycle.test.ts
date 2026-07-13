/**
 * Slice D — reservation lifecycle contract (pure mirror).
 *
 * Extends the Slice A state machine with the launch-critical scenarios:
 *   - happy path: quoted → reserved → checkout-created → paid → confirming → confirmed
 *   - expired checkout: checkout-created → expired, release called exactly once
 *   - transient confirm failure: paid → confirming → paid; webhook replay confirms
 *     with same bokun_reservation_id, reserveActivity still called only once
 *
 * Uses the exact persisted state strings including the hyphen "checkout-created".
 */
import { describe, it, expect, vi } from "vitest";

type State =
  | "quoted"
  | "reserved"
  | "checkout-created"
  | "paid"
  | "confirming"
  | "confirmed"
  | "expired"
  | "cancelled"
  | "failed";

type Row = {
  quote_id: string;
  state: State;
  bokun_reservation_id: string | null;
  reserve_call_count: number;
  confirm_attempts: number;
  confirming_at: string | null;
  bokun_release_result: unknown | null;
  final_total_eur: number | null;
};

function newRow(id = "q1"): Row {
  return {
    quote_id: id,
    state: "quoted",
    bokun_reservation_id: null,
    reserve_call_count: 0,
    confirm_attempts: 0,
    confirming_at: null,
    bokun_release_result: null,
    final_total_eur: null,
  };
}

// Simulated spine
async function reserve(row: Row, reserveActivity: () => Promise<string>) {
  if (row.state !== "quoted") throw new Error(`bad_state:${row.state}`);
  row.bokun_reservation_id = await reserveActivity();
  row.reserve_call_count += 1;
  row.state = "reserved";
}
async function createCheckout(row: Row, total = 745) {
  if (row.state !== "reserved") throw new Error(`bad_state:${row.state}`);
  row.state = "checkout-created";
  row.final_total_eur = total;
}
async function markPaid(row: Row) {
  if (!["reserved", "checkout-created"].includes(row.state)) return;
  row.state = "paid";
}
async function confirm(row: Row, bokunConfirm: (id: string) => Promise<void>) {
  await markPaid(row);
  if (row.state !== "paid") return;
  row.state = "confirming";
  row.confirming_at = new Date().toISOString();
  row.confirm_attempts += 1;
  try {
    await bokunConfirm(row.bokun_reservation_id!);
    row.state = "confirmed";
    row.confirming_at = null;
  } catch (e) {
    row.state = "paid";
    row.confirming_at = null;
    throw e;
  }
}
async function expireCheckout(row: Row, releaseReservation: (id: string) => Promise<void>) {
  if (row.state !== "checkout-created") return { released: false };
  row.state = "expired";
  if (!row.bokun_reservation_id) return { released: false };
  await releaseReservation(row.bokun_reservation_id);
  row.bokun_release_result = { status: "released" };
  return { released: true };
}

describe("Slice D — lifecycle happy path uses exact persisted state names", () => {
  it("quoted → reserved → checkout-created → paid → confirming → confirmed", async () => {
    const row = newRow();
    const reserveSpy = vi.fn(async () => "BKN-1");
    const confirmSpy = vi.fn(async () => {});
    await reserve(row, reserveSpy);
    expect(row.state).toBe("reserved");
    await createCheckout(row);
    expect(row.state).toBe("checkout-created");
    await confirm(row, confirmSpy);
    expect(row.state).toBe("confirmed");
    expect(row.confirming_at).toBeNull();
    expect(row.confirm_attempts).toBe(1);
    expect(row.bokun_reservation_id).toBe("BKN-1");
    expect(reserveSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Slice D — expired checkout releases once", () => {
  it("checkout-created → expired; bokun.release called exactly once", async () => {
    const row = newRow();
    const reserveSpy = vi.fn(async () => "BKN-1");
    const releaseSpy = vi.fn(async () => {});
    await reserve(row, reserveSpy);
    await createCheckout(row);
    const r1 = await expireCheckout(row, releaseSpy);
    const r2 = await expireCheckout(row, releaseSpy); // duplicate webhook
    expect(row.state).toBe("expired");
    expect(r1.released).toBe(true);
    expect(r2.released).toBe(false);
    expect(releaseSpy).toHaveBeenCalledTimes(1);
    expect(releaseSpy).toHaveBeenCalledWith("BKN-1");
  });
});

describe("Slice D — transient confirm failure preserves reservation", () => {
  it("first confirm fails → row returns to paid; replay confirms with same bokun_reservation_id; reserve called only once", async () => {
    const row = newRow();
    const reserveSpy = vi.fn(async () => "BKN-42");
    const bokunConfirm = vi
      .fn<(id: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("bokun 5xx"))
      .mockResolvedValueOnce(undefined);
    await reserve(row, reserveSpy);
    await createCheckout(row);

    await expect(confirm(row, bokunConfirm)).rejects.toThrow(/bokun 5xx/);
    expect(row.state).toBe("paid");
    expect(row.confirming_at).toBeNull();
    expect(row.confirm_attempts).toBe(1);
    expect(row.bokun_reservation_id).toBe("BKN-42");

    // Replay Stripe webhook
    await confirm(row, bokunConfirm);
    expect(row.state).toBe("confirmed");
    expect(row.confirm_attempts).toBe(2);
    expect(row.bokun_reservation_id).toBe("BKN-42"); // same id
    expect(reserveSpy).toHaveBeenCalledTimes(1); // no double reserve
    expect(bokunConfirm).toHaveBeenCalledTimes(2);
  });
});
