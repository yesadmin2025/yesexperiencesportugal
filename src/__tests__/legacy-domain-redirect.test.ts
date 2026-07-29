import { describe, it, expect } from "vitest";
import { buildLegacy301Response, LEGACY_REDIRECT_MAP } from "@/lib/legacy-domain-redirect";

function req(url: string, host?: string): Request {
  return new Request(url, {
    headers: host ? { host } : undefined,
  });
}

describe("legacy-domain hybrid (301 + 410)", () => {
  it("301s a known WP path to the canonical equivalent", () => {
    const res = buildLegacy301Response(req("https://yesexperiences.pt/about-us"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe("https://yesexperiencesportugal.com/about");
  });

  it("301s /tour/<slug> to /tours/<signature-id>", () => {
    const res = buildLegacy301Response(req("https://yesexperiences.pt/tour/arrabida-wine-tour"));
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(
      "https://yesexperiencesportugal.com/tours/arrabida-wine-allinclusive",
    );
  });

  it("preserves query string on the 301 Location", () => {
    const res = buildLegacy301Response(req("https://yesexperiences.pt/contact?utm_source=oldsite"));
    expect(res!.headers.get("location")).toBe(
      "https://yesexperiencesportugal.com/contact?utm_source=oldsite",
    );
  });

  it("normalizes trailing slash and uppercase before lookup", () => {
    const res = buildLegacy301Response(req("https://yesexperiences.pt/ABOUT-US/"));
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe("https://yesexperiencesportugal.com/about");
  });

  it("301s unmapped legacy paths 1:1 to the canonical origin", () => {
    const res = buildLegacy301Response(req("https://yesexperiences.pt/some/random/unknown-page"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(
      "https://yesexperiencesportugal.com/some/random/unknown-page",
    );
  });

  it("handles www.yesexperiences.pt the same way", () => {
    const res = buildLegacy301Response(req("https://www.yesexperiences.pt/faqs"));
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe("https://yesexperiencesportugal.com/faq");
  });

  it("is case-insensitive on Host header", () => {
    const res = buildLegacy301Response(req("http://example.test/about", "YesExperiences.PT"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(301);
  });

  it("uses Host header over URL host when both present", () => {
    const res = buildLegacy301Response(req("http://localhost:8080/about-us", "yesexperiences.pt"));
    expect(res!.status).toBe(301);
  });

  it("sets X-Robots-Tag: noindex on the 301", () => {
    const res = buildLegacy301Response(req("https://yesexperiences.pt/"));
    expect(res!.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("returns null for the canonical domain root (middleware passes through)", () => {
    const res = buildLegacy301Response(req("https://yesexperiencesportugal.com/"));
    expect(res).toBeNull();
  });

  it("returns null on canonical host when source path equals target (no self-loop)", () => {
    // /about is a legit canonical path AND appears in the map as /about → /about.
    // Must NOT 301 to itself.
    const res = buildLegacy301Response(req("https://yesexperiencesportugal.com/about"));
    expect(res).toBeNull();
  });

  it("301s legacy paths on the canonical host too (catches Lovable's 302→primary)", () => {
    // Lovable's platform 302s yesexperiences.pt/about-us → yesexperiencesportugal.com/about-us
    // BEFORE our middleware runs. We catch it on the primary and 301 → /about.
    const res = buildLegacy301Response(req("https://yesexperiencesportugal.com/about-us"));
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe("https://yesexperiencesportugal.com/about");
  });

  it("410s WP-only paths on the canonical host (soft-404 prevention)", () => {
    for (const path of [
      "/wp-admin",
      "/wp-login.php",
      "/category/wine",
      "/tag/porto",
      "/author/joao",
      "/tour/does-not-exist",
    ]) {
      const res = buildLegacy301Response(req(`https://yesexperiencesportugal.com${path}`));
      expect(res, `no response for ${path}`).not.toBeNull();
      expect(res!.status, path).toBe(410);
    }
  });

  it("returns null for unrelated hosts on non-legacy paths", () => {
    expect(buildLegacy301Response(req("https://example.com/"))).toBeNull();
    expect(buildLegacy301Response(req("http://localhost:8080/builder"))).toBeNull();
  });

  it("every value in LEGACY_REDIRECT_MAP is a canonical-site path", () => {
    for (const [key, value] of Object.entries(LEGACY_REDIRECT_MAP)) {
      expect(key.startsWith("/"), `key ${key}`).toBe(true);
      expect(value.startsWith("/"), `value for ${key}`).toBe(true);
      expect(key).toBe(key.toLowerCase());
    }
  });
});
