import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installResetBlankCheckFilter, isResetBlankMessage } from "../silence-reset-blank-check";

describe("isResetBlankMessage", () => {
  it("matches plain string payloads", () => {
    expect(isResetBlankMessage("RESET_BLANK_CHECK")).toBe(true);
    expect(isResetBlankMessage("prefix RESET_BLANK_CHECK suffix")).toBe(true);
  });

  it("matches structured payloads with a matching .type", () => {
    expect(isResetBlankMessage({ type: "RESET_BLANK_CHECK" })).toBe(true);
    expect(isResetBlankMessage({ type: "lovable:RESET_BLANK_CHECK" })).toBe(true);
  });

  it("does NOT match unrelated messages", () => {
    expect(isResetBlankMessage("hello")).toBe(false);
    expect(isResetBlankMessage({ type: "ROUTE_CHANGE" })).toBe(false);
    expect(isResetBlankMessage({ payload: "RESET_BLANK_CHECK" })).toBe(false); // wrong key
    expect(isResetBlankMessage(null)).toBe(false);
    expect(isResetBlankMessage(undefined)).toBe(false);
    expect(isResetBlankMessage(42)).toBe(false);
    expect(isResetBlankMessage({ type: 123 })).toBe(false);
  });
});

describe("installResetBlankCheckFilter", () => {
  let dispose: () => void = () => {};

  afterEach(() => {
    dispose();
    // ensure flag is cleared between tests
    delete (window as unknown as Record<string, unknown>).__resetBlankCheckSilenced__;
  });

  it("is idempotent — second install is a no-op until first is disposed", () => {
    const a = installResetBlankCheckFilter();
    const b = installResetBlankCheckFilter();
    expect(a.installed).toBe(true);
    expect(b.installed).toBe(false);
    a.dispose();
    b.dispose(); // safe even though it was a no-op
    const c = installResetBlankCheckFilter();
    expect(c.installed).toBe(true);
    dispose = c.dispose;
  });

  it("dispose() can be called multiple times safely", () => {
    const r = installResetBlankCheckFilter();
    expect(() => {
      r.dispose();
      r.dispose();
      r.dispose();
    }).not.toThrow();
  });

  it("blocks downstream listeners ONLY for RESET_BLANK_CHECK messages", () => {
    const r = installResetBlankCheckFilter();
    dispose = r.dispose;

    const downstream = vi.fn();
    window.addEventListener("message", downstream); // bubble phase, runs after capture filter

    // Noise — must be swallowed
    window.dispatchEvent(new MessageEvent("message", { data: "RESET_BLANK_CHECK" }));
    window.dispatchEvent(new MessageEvent("message", { data: { type: "RESET_BLANK_CHECK" } }));

    // Unrelated — must pass through
    window.dispatchEvent(new MessageEvent("message", { data: "hello" }));
    window.dispatchEvent(new MessageEvent("message", { data: { type: "ROUTE_CHANGE" } }));
    window.dispatchEvent(new MessageEvent("message", { data: { type: "app:ready", ts: 1 } }));
    window.dispatchEvent(new MessageEvent("message", { data: null }));

    expect(downstream).toHaveBeenCalledTimes(4);
    const seen = downstream.mock.calls.map((c) => (c[0] as MessageEvent).data);
    expect(seen).toEqual(["hello", { type: "ROUTE_CHANGE" }, { type: "app:ready", ts: 1 }, null]);

    window.removeEventListener("message", downstream);
  });

  it("after dispose, RESET_BLANK_CHECK messages flow through again", () => {
    const r = installResetBlankCheckFilter();
    const downstream = vi.fn();
    window.addEventListener("message", downstream);

    window.dispatchEvent(new MessageEvent("message", { data: "RESET_BLANK_CHECK" }));
    expect(downstream).not.toHaveBeenCalled();

    r.dispose();
    window.dispatchEvent(new MessageEvent("message", { data: "RESET_BLANK_CHECK" }));
    expect(downstream).toHaveBeenCalledTimes(1);

    window.removeEventListener("message", downstream);
  });

  it("filters console.log/info/warn lines mentioning RESET_BLANK_CHECK only", () => {
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;
    const logSpy = vi.fn();
    const infoSpy = vi.fn();
    const warnSpy = vi.fn();
    console.log = logSpy;
    console.info = infoSpy;
    console.warn = warnSpy;

    const r = installResetBlankCheckFilter();
    dispose = () => {
      r.dispose();
      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
    };

    console.log("RESET_BLANK_CHECK ping"); // dropped
    console.info("about RESET_BLANK_CHECK now"); // dropped
    console.warn("warn: RESET_BLANK_CHECK"); // dropped
    console.log("normal log"); // passes
    console.info("normal info", { a: 1 }); // passes
    console.warn("normal warn"); // passes
    console.log({ type: "RESET_BLANK_CHECK" }); // passes — non-string arg, not filtered
    console.log("a", "b", "c"); // passes — none mention the marker

    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls).toEqual([
      ["normal log"],
      [{ type: "RESET_BLANK_CHECK" }],
      ["a", "b", "c"],
    ]);
    expect(infoSpy.mock.calls[0]).toEqual(["normal info", { a: 1 }]);
  });

  it("dispose restores original console methods (referential equality)", () => {
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;

    const r = installResetBlankCheckFilter();
    expect(console.log).not.toBe(origLog);
    r.dispose();
    expect(console.log).toBe(origLog);
    expect(console.info).toBe(origInfo);
    expect(console.warn).toBe(origWarn);
  });

  it("does not interfere with other event types (e.g. 'click', 'storage')", () => {
    const r = installResetBlankCheckFilter();
    dispose = r.dispose;
    const clickSpy = vi.fn();
    const storageSpy = vi.fn();
    window.addEventListener("click", clickSpy);
    window.addEventListener("storage", storageSpy);
    window.dispatchEvent(new Event("click"));
    window.dispatchEvent(new Event("storage"));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(storageSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener("click", clickSpy);
    window.removeEventListener("storage", storageSpy);
  });
});

describe("installResetBlankCheckFilter — server safety", () => {
  it("returns a no-op disposer when target is explicitly null (server)", () => {
    const r = installResetBlankCheckFilter(null);
    expect(r.installed).toBe(false);
    expect(() => r.dispose()).not.toThrow();
  });
});

describe("installResetBlankCheckFilter — startup churn", () => {
  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).__resetBlankCheckSilenced__;
  });

  it("survives 50 install/dispose cycles (HMR/StrictMode simulation)", () => {
    for (let i = 0; i < 50; i++) {
      const r = installResetBlankCheckFilter();
      expect(r.installed).toBe(true);
      // Second install during the same cycle must be a no-op
      const dup = installResetBlankCheckFilter();
      expect(dup.installed).toBe(false);
      r.dispose();
    }
    // After all cycles, console is clean
    const downstream = vi.fn();
    window.addEventListener("message", downstream);
    window.dispatchEvent(new MessageEvent("message", { data: "RESET_BLANK_CHECK" }));
    expect(downstream).toHaveBeenCalledTimes(1); // filter is gone, so it flows through
    window.removeEventListener("message", downstream);
  });
});
