/**
 * Public read-only pricing SSOT probe.
 *
 * Exposes the AGE_BAND_PCT map that the frontend + email template use,
 * so an external monitor (or the checkout parity spec) can assert the
 * production bundle matches what edge functions charge. No PII, no
 * writes, no auth — just the numeric multipliers and thresholds.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AGE_BAND_PCT } from "@/data/signatureTourPricing";

export const Route = createFileRoute("/api/public/pricing-ssot")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(
          {
            ageBandPct: AGE_BAND_PCT,
            thresholds: { adult: 18, youth: 11, child: 3, infant: 0 },
            source: "src/data/signatureTourPricing.ts",
          },
          {
            headers: {
              "Cache-Control": "public, max-age=300, s-maxage=300",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
