import { describe, expect, it } from "vitest";
import {
  analyticsEnvironment,
  isAdminPath,
  isAuthPath,
  isAutomatedSession,
  isExcludedHost,
} from "../analytics-exclusions";

describe("analytics traffic exclusions", () => {
  it("excludes admin routes in both locales", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/bookings")).toBe(true);
    expect(isAdminPath("/pt/admin/photos")).toBe(true);
    expect(isAdminPath("/experiences")).toBe(false);
    expect(isAdminPath("/local-stories/administration")).toBe(false);
  });

  it("excludes preview and local hosts, keeps production hosts", () => {
    expect(isExcludedHost("localhost")).toBe(true);
    expect(isExcludedHost("127.0.0.1")).toBe(true);
    expect(isExcludedHost("id-preview--abc.lovable.app")).toBe(true);
    expect(isExcludedHost("abc.lovableproject.com")).toBe(true);
    expect(isExcludedHost("yesexperiencesportugal.com")).toBe(false);
    expect(isExcludedHost("www.yesexperiencesportugal.com")).toBe(false);
    // The *.lovable.app mirror is a staging surface, not the commercial site.
    expect(isExcludedHost("yesexperiencesportugal.lovable.app")).toBe(true);
  });

  it("excludes auth screens", () => {
    expect(isAuthPath("/auth")).toBe(true);
    expect(isAuthPath("/pt/auth/callback")).toBe(true);
    expect(isAuthPath("/authors")).toBe(false);
  });

  it("reports environment dimensions", () => {
    expect(analyticsEnvironment("yesexperiencesportugal.com")).toBe("production");
    expect(analyticsEnvironment("localhost")).toBe("local");
    expect(analyticsEnvironment("id-preview--abc.lovable.app")).toBe("preview");
  });

  it("detects automated sessions", () => {
    expect(isAutomatedSession({ webdriver: true })).toBe(true);
    expect(isAutomatedSession({ userAgent: "Chrome-Lighthouse" })).toBe(true);
    expect(isAutomatedSession({ userAgent: "Mozilla/5.0 iPhone Safari" })).toBe(false);
  });
});
