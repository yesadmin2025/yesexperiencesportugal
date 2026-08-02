import { describe, expect, it } from "vitest";
import { isAdminPath, isExcludedHost } from "../analytics-exclusions";

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
    expect(isExcludedHost("yesexperiencesportugal.lovable.app")).toBe(false);
  });
});
