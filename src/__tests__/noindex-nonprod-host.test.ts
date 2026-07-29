import { describe, it, expect } from "vitest";
import {
  buildDisallowRobotsResponse,
  getRequestHost,
  shouldNoindexHost,
  withNoindexHeader,
} from "@/lib/noindex-nonprod-host";

function req(url: string, host?: string): Request {
  return new Request(url, { headers: host ? { host } : undefined });
}

describe("noindex-nonprod-host", () => {
  it("does NOT noindex the canonical apex", () => {
    expect(shouldNoindexHost("yesexperiencesportugal.com")).toBe(false);
  });
  it("does NOT noindex the canonical www", () => {
    expect(shouldNoindexHost("www.yesexperiencesportugal.com")).toBe(false);
  });
  it("does NOT noindex the legacy domain (handled by 410 middleware)", () => {
    expect(shouldNoindexHost("yesexperiences.pt")).toBe(false);
    expect(shouldNoindexHost("www.yesexperiences.pt")).toBe(false);
  });
  it("noindexes lovable preview hosts", () => {
    expect(shouldNoindexHost("id-preview--abc.lovable.app")).toBe(true);
    expect(shouldNoindexHost("yesexperiencesportugal.lovable.app")).toBe(true);
  });
  it("noindexes third-party staging clones", () => {
    expect(shouldNoindexHost("yesexperiences.customwebsitedesigns.org")).toBe(true);
  });
  it("noindexes localhost", () => {
    expect(shouldNoindexHost("localhost")).toBe(true);
  });

  it("strips port from Host header", () => {
    expect(getRequestHost(req("http://localhost:8080/x", "localhost:8080"))).toBe("localhost");
  });

  it("robots response is Disallow: /", async () => {
    const r = buildDisallowRobotsResponse();
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/plain");
    expect(await r.text()).toContain("Disallow: /");
  });

  it("withNoindexHeader adds X-Robots-Tag without clobbering existing", () => {
    const base = new Response("hi", {
      headers: { "x-robots-tag": "noindex, nofollow, noarchive" },
    });
    const out = withNoindexHeader(base);
    expect(out.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("withNoindexHeader adds header when missing", () => {
    const out = withNoindexHeader(new Response("hi"));
    expect(out.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});
