import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("@/lib/stripe", () => ({
  getStripeEnvironment: () => "sandbox",
}));

import {
  hasPendingCheckoutSession,
  invokeSignatureCheckout,
} from "@/lib/checkout/session-request";

function deferred() {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("checkout session request", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("injects the host-derived environment", async () => {
    invoke.mockResolvedValue({ data: { clientSecret: "cs" }, error: null });
    await invokeSignatureCheckout({ tourId: "arrabida-wine-allinclusive" });
    expect(invoke).toHaveBeenCalledWith("create-signature-checkout", {
      body: { tourId: "arrabida-wine-allinclusive", environment: "sandbox" },
    });
  });

  it("shares one promise for identical concurrent requests (no duplicate session)", async () => {
    const d = deferred();
    invoke.mockReturnValue(d.promise);
    const a = invokeSignatureCheckout({ tourId: "t1" });
    const b = invokeSignatureCheckout({ tourId: "t1" });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(hasPendingCheckoutSession()).toBe(true);
    d.resolve({ data: { clientSecret: "cs" }, error: null });
    expect((await a).data).toEqual((await b).data);
    expect(hasPendingCheckoutSession()).toBe(false);
  });

  it("rejects a different request while one is outstanding instead of duplicating", async () => {
    const d = deferred();
    invoke.mockReturnValue(d.promise);
    const first = invokeSignatureCheckout({ tourId: "t1" });
    const second = await invokeSignatureCheckout({ tourId: "t2" });
    expect(second.data).toBeNull();
    expect(second.error).toBeInstanceOf(Error);
    expect(invoke).toHaveBeenCalledTimes(1);
    d.resolve({ data: { clientSecret: "cs" }, error: null });
    await first;
  });

  it("releases the lock after a failure so the guest can retry", async () => {
    invoke.mockRejectedValueOnce(new Error("network"));
    await expect(invokeSignatureCheckout({ tourId: "t1" })).rejects.toThrow("network");
    expect(hasPendingCheckoutSession()).toBe(false);
    invoke.mockResolvedValueOnce({ data: { clientSecret: "cs" }, error: null });
    const retry = await invokeSignatureCheckout({ tourId: "t1" });
    expect(retry.data).toEqual({ clientSecret: "cs" });
  });
});
