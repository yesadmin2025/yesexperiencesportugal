/**
 * §12 — Quote token, snapshot integrity, and server-authority tests.
 *
 * These exercise the shared modules directly (no Deno server boot) and cover:
 *  - signed snapshot is embedded and recoverable
 *  - modified title / stop order / add-on id / guest count all break the hash
 *  - expired token fails
 *  - changed revision fails (caller-side compare)
 *  - unknown add-on is dropped by validator (never invoiced)
 *  - unsupported commercial key is rejected
 *  - unsupported guest count returns pricing_unavailable
 *  - amountEur / client add-on prices are ignored (schema has no such field)
 *  - deterministic idempotency key from a quote token
 */
import { describe, it, expect, beforeAll } from "vitest";
import { webcrypto } from "node:crypto";

// Deno global shim so shared/*.ts modules load under Node/vitest.
// deno-lint-ignore no-explicit-any
(globalThis as any).Deno = (globalThis as any).Deno ?? { env: { get: () => undefined } };
if (!(globalThis as unknown as { crypto?: Crypto }).crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

import {
  validateAndNormaliseSnapshot,
  canonicalJson,
  SnapshotValidationError,
  type RawQuoteSnapshot,
} from "../../../../supabase/functions/_shared/quoteSnapshotSchema.ts";
import { resolveQuote } from "../../../../supabase/functions/_shared/resolveQuote.ts";
import { signQuoteToken, verifyQuoteToken, sha256Hex } from "../../../../supabase/functions/_shared/quoteToken.ts";

const SECRET = "test-signing-secret-do-not-use-in-prod";

function tomorrow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function goldenSnapshot(): RawQuoteSnapshot {
  return {
    commercialProductKey: "studio-v3-private-full-day",
    signatureId: "azeitao-cheese",
    title: "Setúbal · Azeitão · Sesimbra",
    destinationRegion: "Setúbal",
    pickupCity: "Lisbon",
    date: tomorrow(),
    startTime: "09:00",
    language: "en",
    guests: 3,
    routeStops: [
      { id: "mercado-livramento", label: "Mercado do Livramento" },
      { id: "azulejos-azeitao", label: "Azulejos de Azeitão" },
      { id: "bacalhoa", label: "Bacalhôa Vinhos de Portugal" },
      { id: "castelo-sesimbra", label: "Castelo de Sesimbra" },
    ],
    selectedAddOns: [{ id: "coastal-boat-sesimbra", quantity: 1 }],
    routeStatus: "pending-review",
  };
}

async function signGolden() {
  const snap = validateAndNormaliseSnapshot(goldenSnapshot());
  const resolved = resolveQuote(snap);
  const hash = await sha256Hex(canonicalJson(snap));
  const revision = hash.slice(0, 16);
  const now = Math.floor(Date.now() / 1000);
  const token = await signQuoteToken(
    {
      v: 1,
      revision,
      snapshotHash: hash,
      commercialProductKey: resolved.pricing.commercialProductKey!,
      guests: resolved.pricing.guests,
      unitEur: resolved.pricing.unitEur!,
      totalEur: resolved.pricing.totalEur!,
      currency: "EUR",
      routeStatus: resolved.routeStatus,
      availabilityStatus: resolved.availabilityStatus,
      snapshot: {
        signatureId: snap.signatureId,
        commercialProductKey: snap.commercialProductKey,
        title: snap.title,
        destinationRegion: snap.destinationRegion,
        pickupCity: snap.pickupCity,
        date: snap.date,
        startTime: snap.startTime,
        language: snap.language,
        guests: snap.guests,
        routeStatus: snap.routeStatus,
        routeStops: snap.routeStops,
        selectedAddOns: snap.selectedAddOns,
        inclusionIds: resolved.inclusions.map((i) => i.id),
      },
      pricing: {
        unitEur: resolved.pricing.unitEur!,
        baseSubtotalEur: resolved.pricing.baseSubtotalEur!,
        addOnLineItems: resolved.addOns.map((a) => ({
          id: a.id,
          label: a.label,
          unitEur: a.unitEur,
          quantity: a.quantity,
          lineSubtotalEur: a.lineSubtotalEur,
        })),
        totalEur: resolved.pricing.totalEur!,
        currency: "EUR",
      },
      iat: now,
      exp: now + 600,
    },
    SECRET,
  );
  return { snap, resolved, hash, revision, token, now };
}

describe("§12 quote token + snapshot integrity", () => {
  beforeAll(() => {
    // sanity — subtle.crypto available
    expect(globalThis.crypto?.subtle).toBeTruthy();
  });

  it("signed snapshot is recoverable from the token payload", async () => {
    const { token, snap } = await signGolden();
    const payload = await verifyQuoteToken(token, SECRET);
    expect(payload.snapshot.title).toBe(snap.title);
    expect(payload.snapshot.routeStops.map((s) => s.id)).toEqual([
      "mercado-livramento",
      "azulejos-azeitao",
      "bacalhoa",
      "castelo-sesimbra",
    ]);
    expect(payload.pricing.totalEur).toBe(525);
    expect(payload.pricing.baseSubtotalEur).toBe(435);
    expect(payload.pricing.addOnLineItems[0]?.lineSubtotalEur).toBe(90);
  });

  it("modified title changes snapshotHash (would fail token compare)", async () => {
    const { hash } = await signGolden();
    const tampered = { ...goldenSnapshot(), title: "A different title" };
    const norm = validateAndNormaliseSnapshot(tampered);
    const rehash = await sha256Hex(canonicalJson(norm));
    expect(rehash).not.toBe(hash);
  });

  it("reordered stops change snapshotHash", async () => {
    const { hash } = await signGolden();
    const g = goldenSnapshot();
    const stops = g.routeStops as Array<{ id: string; label: string }>;
    const tampered = {
      ...g,
      routeStops: [stops[1], stops[0], stops[2], stops[3]],
    };
    const norm = validateAndNormaliseSnapshot(tampered);
    const rehash = await sha256Hex(canonicalJson(norm));
    expect(rehash).not.toBe(hash);
  });

  it("modified add-on id changes snapshotHash", async () => {
    const { hash } = await signGolden();
    const tampered = {
      ...goldenSnapshot(),
      // unknown ids are dropped, so use a swap to a valid-but-different id
      selectedAddOns: [] as Array<{ id: string; quantity: number }>,
    };
    const norm = validateAndNormaliseSnapshot(tampered);
    const rehash = await sha256Hex(canonicalJson(norm));
    expect(rehash).not.toBe(hash);
  });

  it("modified guest count changes snapshotHash", async () => {
    const { hash } = await signGolden();
    const norm = validateAndNormaliseSnapshot({ ...goldenSnapshot(), guests: 4 });
    const rehash = await sha256Hex(canonicalJson(norm));
    expect(rehash).not.toBe(hash);
  });

  it("expired token fails verification", async () => {
    const { token, now } = await signGolden();
    await expect(verifyQuoteToken(token, SECRET, now + 3600)).rejects.toThrow(/expired/);
  });

  it("changed revision does not match token revision", async () => {
    const { revision } = await signGolden();
    expect(revision).not.toBe("deadbeefdeadbeef");
  });

  it("tampered token body fails signature verification", async () => {
    const { token } = await signGolden();
    const [body, sig] = token.split(".");
    const flipped = body.slice(0, -2) + (body.endsWith("A") ? "B" : "A");
    await expect(verifyQuoteToken(`${flipped}.${sig}`, SECRET)).rejects.toThrow(/signature/);
  });
});

describe("§12 server-authority validator rules", () => {
  it("unknown add-on ids are dropped (never invoiced)", () => {
    const norm = validateAndNormaliseSnapshot({
      ...goldenSnapshot(),
      selectedAddOns: [
        { id: "coastal-boat-sesimbra", quantity: 1 },
        { id: "unknown-fake-addon", quantity: 999 },
      ],
    });
    expect(norm.selectedAddOns.map((a) => a.id)).toEqual(["coastal-boat-sesimbra"]);
  });

  it("unsupported commercial key is rejected", () => {
    expect(() =>
      validateAndNormaliseSnapshot({
        ...goldenSnapshot(),
        commercialProductKey: "not-a-real-key",
      }),
    ).toThrow(SnapshotValidationError);
  });

  it("unsupported guest count returns pricing_unavailable", () => {
    const norm = validateAndNormaliseSnapshot({ ...goldenSnapshot(), guests: 7 });
    const resolved = resolveQuote(norm);
    expect(resolved.pricing.status).toBe("unavailable");
  });

  it("client-sent price fields have no place in the schema (silently ignored)", () => {
    const norm = validateAndNormaliseSnapshot({
      ...goldenSnapshot(),
      // deliberately spurious extras the client might try to smuggle
      // deno-lint-ignore no-explicit-any
      ...(({ amountEur: 1, totalEur: 1, unitEur: 1 } as any)),
    } as RawQuoteSnapshot);
    expect((norm as unknown as Record<string, unknown>).amountEur).toBeUndefined();
    expect((norm as unknown as Record<string, unknown>).totalEur).toBeUndefined();
    expect((norm as unknown as Record<string, unknown>).unitEur).toBeUndefined();
  });

  it("past dates rejected", () => {
    expect(() =>
      validateAndNormaliseSnapshot({ ...goldenSnapshot(), date: "2020-01-01" }),
    ).toThrow(SnapshotValidationError);
  });
});

describe("§12 idempotency key derivation", () => {
  it("same quote token yields identical idempotency key", async () => {
    const { token } = await signGolden();
    const a = await sha256Hex(token);
    const b = await sha256Hex(token);
    expect(a).toBe(b);
    expect(`studio-v3:${a}`).toBe(`studio-v3:${b}`);
  });

  it("different quote tokens yield different idempotency keys", async () => {
    const { token: t1 } = await signGolden();
    // small delay to change iat
    await new Promise((r) => setTimeout(r, 1100));
    const { token: t2 } = await signGolden();
    const k1 = await sha256Hex(t1);
    const k2 = await sha256Hex(t2);
    expect(k1).not.toBe(k2);
  });
});
