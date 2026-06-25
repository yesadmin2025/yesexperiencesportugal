import { describe, it, expect } from "vitest";
import {
  buildLegacyRedirectResponse,
  CANONICAL_ORIGIN,
} from "@/lib/legacy-domain-redirect";

function req(url: string, host?: string): Request {
  return new Request(url, {
    headers: host ? { host } : undefined,
  });
}

describe("legacy-domain-redirect", () => {
  it("301s yesexperiences.pt root to canonical .com", () => {
    const res = buildLegacyRedirectResponse(req("https://yesexperiences.pt/"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(`${CANONICAL_ORIGIN}/`);
  });

  it("preserves path", () => {
    const res = buildLegacyRedirectResponse(
      req("https://yesexperiences.pt/tours/sintra"),
    );
    expect(res!.headers.get("location")).toBe(
      `${CANONICAL_ORIGIN}/tours/sintra`,
    );
  });

  it("preserves query string", () => {
    const res = buildLegacyRedirectResponse(
      req("https://yesexperiences.pt/checkout?token=abc&ref=x"),
    );
    expect(res!.headers.get("location")).toBe(
      `${CANONICAL_ORIGIN}/checkout?token=abc&ref=x`,
    );
  });

  it("handles www.yesexperiences.pt", () => {
    const res = buildLegacyRedirectResponse(
      req("https://www.yesexperiences.pt/about"),
    );
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(`${CANONICAL_ORIGIN}/about`);
  });

  it("is case-insensitive on Host header", () => {
    const res = buildLegacyRedirectResponse(
      req("http://example.test/path", "YesExperiences.PT"),
    );
    expect(res).not.toBeNull();
    expect(res!.headers.get("location")).toBe(`${CANONICAL_ORIGIN}/path`);
  });

  it("uses Host header over URL host when both present", () => {
    const res = buildLegacyRedirectResponse(
      req("http://localhost:8080/x?y=1", "yesexperiences.pt"),
    );
    expect(res).not.toBeNull();
    expect(res!.headers.get("location")).toBe(`${CANONICAL_ORIGIN}/x?y=1`);
  });

  it("sets a long cache-control on the redirect", () => {
    const res = buildLegacyRedirectResponse(req("https://yesexperiences.pt/"));
    expect(res!.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("returns null for the canonical domain (no redirect loop)", () => {
    const res = buildLegacyRedirectResponse(
      req("https://yesexperiencesportugal.com/"),
    );
    expect(res).toBeNull();
  });

  it("returns null for unrelated hosts", () => {
    expect(
      buildLegacyRedirectResponse(req("https://example.com/")),
    ).toBeNull();
    expect(
      buildLegacyRedirectResponse(req("http://localhost:8080/builder")),
    ).toBeNull();
  });
});
