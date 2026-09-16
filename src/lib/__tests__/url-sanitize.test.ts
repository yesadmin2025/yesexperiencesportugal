import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { sanitizeLocation, sanitizedPath } from "@/lib/url-sanitize";

describe("url sanitisation", () => {
  it("keeps the path and drops unknown query keys entirely", () => {
    const { path, query } = sanitizeLocation(
      "https://yesexperiencesportugal.com/book?tour=arrabida-wine-allinclusive&mystery=1",
    );
    expect(path).toBe("/book");
    expect(query.tour).toBe("arrabida-wine-allinclusive");
    expect("mystery" in query).toBe(false);
  });

  it("drops sensitive keys entirely", () => {
    const { query } = sanitizeLocation(
      "https://yesexperiencesportugal.com/booking-confirmation?session_id=cs_live_123&email=a@b.com&token=abc&gclid=xyz",
    );
    expect(Object.keys(query)).toEqual([]);
  });

  it("drops allowlisted keys with unsafe values", () => {
    const { query } = sanitizeLocation("https://yesexperiencesportugal.com/book?tour=a%20b%2Fc%3F");
    expect("tour" in query).toBe(false);
  });

  it("returns a path for malformed input", () => {
    expect(sanitizedPath("not a url")).toBeTypeOf("string");
  });

  it("sanitizes Hero verification export URLs before they enter shared artifacts", () => {
    const overlay = readFileSync(
      resolve(process.cwd(), "src/components/HeroVerifyOverlay.tsx"),
      "utf8",
    );
    expect(overlay).not.toContain("url: window.location.href");
    expect(overlay).not.toContain("# url=${window.location.href}");
    expect(overlay.match(/sanitizedPath\(window\.location\.href\)/g)).toHaveLength(2);
  });
});
