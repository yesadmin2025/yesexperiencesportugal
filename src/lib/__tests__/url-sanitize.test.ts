import { describe, expect, it } from "vitest";

import { sanitizeLocation, sanitizedPath } from "@/lib/url-sanitize";

describe("url sanitisation", () => {
  it("keeps the path and drops unknown query keys", () => {
    const { path, query } = sanitizeLocation(
      "https://yesexperiencesportugal.com/book?tour=arrabida-wine-allinclusive&mystery=1",
    );
    expect(path).toBe("/book");
    expect(query.tour).toBe("arrabida-wine-allinclusive");
    // Unknown keys are recorded as present but their values are never stored.
    expect(query.mystery).toBe("[redacted]");
  });

  it("never stores sensitive values", () => {
    const { query } = sanitizeLocation(
      "https://yesexperiencesportugal.com/booking-confirmation?session_id=cs_live_123&email=a@b.com&token=abc&gclid=xyz",
    );
    for (const value of Object.values(query)) {
      expect(value).not.toContain("cs_live_123");
      expect(value).not.toContain("a@b.com");
      expect(value).not.toContain("abc");
      expect(value).not.toContain("xyz");
    }
  });

  it("returns a path for malformed input", () => {
    expect(sanitizedPath("not a url")).toBeTypeOf("string");
  });
});
