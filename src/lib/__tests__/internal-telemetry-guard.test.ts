import { afterEach, describe, expect, it, vi } from "vitest";
import { isInternalTelemetryDisabled } from "../analytics-exclusions";

const originalWebdriver = Object.getOwnPropertyDescriptor(Navigator.prototype, "webdriver");
const originalUserAgent = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
const originalLocation = window.location;

afterEach(() => {
  if (originalWebdriver) Object.defineProperty(Navigator.prototype, "webdriver", originalWebdriver);
  if (originalUserAgent) Object.defineProperty(Navigator.prototype, "userAgent", originalUserAgent);
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  vi.restoreAllMocks();
});

describe("internal database telemetry guard", () => {
  it("blocks webdriver on the production host, regardless of marketing test override", () => {
    Object.defineProperty(window, "location", { configurable: true, value: { hostname: "yesexperiencesportugal.com", pathname: "/" } });
    Object.defineProperty(Navigator.prototype, "webdriver", { configurable: true, get: () => true });
    window.localStorage.setItem("YES_ANALYTICS_FORCE", "1");
    expect(isInternalTelemetryDisabled()).toBe(true);
  });

  it("blocks preview and allows a real production visitor", () => {
    Object.defineProperty(Navigator.prototype, "webdriver", { configurable: true, get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgent", { configurable: true, get: () => "Mozilla/5.0 Safari" });
    Object.defineProperty(window, "location", { configurable: true, value: { hostname: "id-preview--abc.lovable.app", pathname: "/" } });
    expect(isInternalTelemetryDisabled()).toBe(true);
    Object.defineProperty(window, "location", { configurable: true, value: { hostname: "yesexperiencesportugal.com", pathname: "/" } });
    expect(isInternalTelemetryDisabled()).toBe(false);
  });
});