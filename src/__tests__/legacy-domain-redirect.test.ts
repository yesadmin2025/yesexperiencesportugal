import { describe, it, expect } from "vitest";
import { buildLegacyGoneResponse } from "@/lib/legacy-domain-redirect";

function req(url: string, host?: string): Request {
  return new Request(url, {
    headers: host ? { host } : undefined,
  });
}

describe("legacy-domain-gone", () => {
  it("returns 410 for yesexperiences.pt root", () => {
    const res = buildLegacyGoneResponse(req("https://yesexperiences.pt/"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(410);
  });

  it("does NOT set a Location header (no redirect back to canonical)", () => {
    const res = buildLegacyGoneResponse(
      req("https://yesexperiences.pt/tours/sintra"),
    );
    expect(res!.headers.get("location")).toBeNull();
  });

  it("handles www.yesexperiences.pt", () => {
    const res = buildLegacyGoneResponse(
      req("https://www.yesexperiences.pt/about"),
    );
    expect(res!.status).toBe(410);
  });

  it("is case-insensitive on Host header", () => {
    const res = buildLegacyGoneResponse(
      req("http://example.test/path", "YesExperiences.PT"),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(410);
  });

  it("uses Host header over URL host when both present", () => {
    const res = buildLegacyGoneResponse(
      req("http://localhost:8080/x?y=1", "yesexperiences.pt"),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(410);
  });

  it("sets noindex via X-Robots-Tag so crawlers drop the URL", () => {
    const res = buildLegacyGoneResponse(req("https://yesexperiences.pt/"));
    expect(res!.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("returns null for the canonical domain", () => {
    const res = buildLegacyGoneResponse(
      req("https://yesexperiencesportugal.com/"),
    );
    expect(res).toBeNull();
  });

  it("returns null for unrelated hosts", () => {
    expect(buildLegacyGoneResponse(req("https://example.com/"))).toBeNull();
    expect(
      buildLegacyGoneResponse(req("http://localhost:8080/builder")),
    ).toBeNull();
  });
});
