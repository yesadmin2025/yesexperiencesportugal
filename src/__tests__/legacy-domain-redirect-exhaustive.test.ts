import { describe, it, expect } from "vitest";
import {
  buildLegacy301Response,
  CANONICAL_ORIGIN,
  LEGACY_HOSTS,
  LEGACY_REDIRECT_MAP,
} from "@/lib/legacy-domain-redirect";

/**
 * Exhaustive coverage: every entry in LEGACY_REDIRECT_MAP is exercised
 * against both legacy hosts, in three shapes (bare, trailing slash,
 * uppercase) plus with a query string. Also asserts that a handful of
 * representative unmapped paths correctly fall through to 410 instead of
 * being silently redirected to "/".
 */

const HOSTS = Array.from(LEGACY_HOSTS);

function req(host: string, path: string, search = ""): Request {
  return new Request(`https://${host}${path}${search}`, {
    headers: { host },
  });
}

describe("legacy-domain map: exhaustive 301 coverage", () => {
  for (const host of HOSTS) {
    for (const [legacyPath, target] of Object.entries(LEGACY_REDIRECT_MAP)) {
      it(`${host}${legacyPath} → 301 ${target}`, () => {
        const res = buildLegacy301Response(req(host, legacyPath));
        expect(res, `no response for ${host}${legacyPath}`).not.toBeNull();
        expect(res!.status).toBe(301);
        expect(res!.headers.get("location")).toBe(
          `${CANONICAL_ORIGIN}${target}`,
        );
        expect(res!.headers.get("x-robots-tag")).toContain("noindex");
        expect(res!.headers.get("cache-control")).toContain("max-age");
      });

      // Skip normalization variants for the root — "/" has no trailing
      // slash to strip and uppercasing doesn't apply.
      if (legacyPath === "/") continue;

      it(`${host}${legacyPath}/ (trailing slash) → 301 ${target}`, () => {
        const res = buildLegacy301Response(req(host, `${legacyPath}/`));
        expect(res!.status).toBe(301);
        expect(res!.headers.get("location")).toBe(
          `${CANONICAL_ORIGIN}${target}`,
        );
      });

      it(`${host}${legacyPath.toUpperCase()} (uppercase) → 301 ${target}`, () => {
        const res = buildLegacy301Response(
          req(host, legacyPath.toUpperCase()),
        );
        expect(res!.status).toBe(301);
        expect(res!.headers.get("location")).toBe(
          `${CANONICAL_ORIGIN}${target}`,
        );
      });

      it(`${host}${legacyPath}?utm=x preserves query on Location`, () => {
        const res = buildLegacy301Response(req(host, legacyPath, "?utm=x"));
        expect(res!.status).toBe(301);
        expect(res!.headers.get("location")).toBe(
          `${CANONICAL_ORIGIN}${target}?utm=x`,
        );
      });
    }
  }
});

describe("legacy-domain map: unmapped paths return 410 (no soft-404)", () => {
  const UNMAPPED = [
    "/wp-admin",
    "/wp-login.php",
    "/tour/does-not-exist",
    "/category/wine",
    "/tag/porto",
    "/2024/06/some-old-post",
    "/random/unknown-page",
    "/author/joao",
  ];

  for (const host of HOSTS) {
    for (const path of UNMAPPED) {
      it(`${host}${path} → 410 Gone (no Location)`, () => {
        const res = buildLegacy301Response(req(host, path));
        expect(res).not.toBeNull();
        expect(res!.status).toBe(410);
        expect(res!.headers.get("location")).toBeNull();
        expect(res!.headers.get("x-robots-tag")).toContain("noindex");
      });
    }
  }
});
