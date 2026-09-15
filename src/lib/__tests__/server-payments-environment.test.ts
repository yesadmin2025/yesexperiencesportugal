import { describe, expect, it } from "vitest";

import {
  isReturnOriginAllowed,
  resolveServerPaymentsEnv,
} from "../../../supabase/functions/_shared/payments-environment";

const CANONICAL = "https://yesexperiencesportugal.com";
const PREVIEW = "https://id-preview--abc.lovable.app";

describe("server payments environment lock", () => {
  it("allows live only from a canonical request origin", () => {
    expect(resolveServerPaymentsEnv({ requestOrigin: CANONICAL }).environment).toBe("live");
  });

  it("honours a claimed sandbox downgrade", () => {
    expect(
      resolveServerPaymentsEnv({ requestOrigin: CANONICAL, claimed: "sandbox" }).environment,
    ).toBe("sandbox");
  });

  it("never authorizes live from returnUrl alone", () => {
    for (const requestOrigin of [PREVIEW, "http://localhost:8080", null, undefined]) {
      const result = resolveServerPaymentsEnv({
        requestOrigin,
        returnUrl: `${CANONICAL}/booking-confirmation`,
        claimed: "live",
      });
      expect(result.environment).toBe("sandbox");
      expect(result.downgraded).toBe(true);
    }
  });

  it("keeps live return origins canonical-only even with extraAllow", () => {
    expect(isReturnOriginAllowed(CANONICAL, "live", [PREVIEW])).toBe(true);
    expect(isReturnOriginAllowed(PREVIEW, "live", [PREVIEW])).toBe(false);
    expect(isReturnOriginAllowed("http://localhost:8080", "live", ["http://localhost:8080"])).toBe(
      false,
    );
    expect(isReturnOriginAllowed(null, "live")).toBe(false);
  });

  it("allows preview, localhost and extraAllow in sandbox", () => {
    expect(isReturnOriginAllowed(PREVIEW, "sandbox")).toBe(true);
    expect(isReturnOriginAllowed("http://localhost:8080", "sandbox")).toBe(true);
    expect(isReturnOriginAllowed("https://staging.example.com", "sandbox", [
      "https://staging.example.com",
    ])).toBe(true);
  });
});
