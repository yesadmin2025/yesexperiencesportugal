import { test, expect } from "@playwright/test";
import { lookup } from "node:dns/promises";

/**
 * Optional live E2E: verifies the production 301 redirect from
 * https://yesexperiences.pt → https://yesexperiencesportugal.com
 * once the DNS for the legacy domain actually resolves to Lovable.
 *
 * Why optional:
 *   The legacy domain's DNSSEC/DS records are still being cleaned up at
 *   the .pt registry. Until propagation finishes, DNS lookups fail and
 *   any HTTP fetch hard-errors. This spec self-skips in that case so it
 *   never blocks CI — it only enforces the contract once the world is
 *   ready.
 *
 * Enable explicitly by setting RUN_LEGACY_DOMAIN_LIVE=1, or it auto-runs
 * when DNS resolves. Pure logic is covered by the unit tests in
 * src/__tests__/legacy-domain-redirect.test.ts.
 */

const LEGACY = "https://yesexperiences.pt";
const CANONICAL_HOST = "yesexperiencesportugal.com";

async function dnsResolves(host: string): Promise<boolean> {
  try {
    await lookup(host);
    return true;
  } catch {
    return false;
  }
}

test.describe("legacy domain 301 (live)", () => {
  test("yesexperiences.pt redirects 301 to canonical with path+query preserved", async ({
    request,
  }) => {
    const forced = process.env.RUN_LEGACY_DOMAIN_LIVE === "1";
    const resolves = await dnsResolves("yesexperiences.pt");
    test.skip(
      !forced && !resolves,
      "DNS for yesexperiences.pt does not resolve yet — skipping live redirect check.",
    );

    for (const path of ["/", "/tours/sintra", "/checkout?token=abc&ref=x"]) {
      const res = await request.fetch(`${LEGACY}${path}`, {
        method: "GET",
        maxRedirects: 0,
        failOnStatusCode: false,
      });
      expect(res.status(), `status for ${path}`).toBe(301);
      const location = res.headers()["location"] ?? "";
      expect(location, `location for ${path}`).toBe(
        `https://${CANONICAL_HOST}${path}`,
      );
    }
  });
});
