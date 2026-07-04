/**
 * Signature section contract — the /day-tours listing and each Signature
 * detail hero must:
 *   1. Render ONLY the intended, configurable card fields (no invented
 *      badges, no runtime-composed marketing prose, no hidden extras).
 *   2. Never overlay title/eyebrow text on top of the hero image — every
 *      Signature title/copy sits BELOW the image now (see the fix that
 *      moved absolute-positioned overlays into an editorial block).
 *
 * We assert directly against the source of the two route files because
 * rendering them requires a TanStack router context; source-level checks
 * are stable and catch the exact regression the user reported.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";

const DAY_TOURS_SRC = readFileSync(
  resolve(process.cwd(), "src/routes/day-tours.tsx"),
  "utf8",
);
const TOUR_DETAIL_SRC = readFileSync(
  resolve(process.cwd(), "src/routes/tours.$tourId.tsx"),
  "utf8",
);

/** Intended per-card fields on /day-tours. */
const ALLOWED_CARD_FIELDS = new Set([
  "id",
  "title",
  "region",
  "durationHours",
  "theme",
  "priceFrom",
  "blurb",
]);

/** Every SignatureTour property we don't want leaking into the card. */
const EXTRA_FIELDS_TO_AVOID = [
  "intro",
  "fitsBest",
  "pace",
  "highlights",
  "included",
  "idealFor",
  "notes",
  "bookingUrl",
  "tripadvisorUrl",
];

describe("Signatures section — /day-tours contract", () => {
  it("card renders exactly the intended, configurable fields", () => {
    // Every allowed field must appear in the card JSX at least once.
    for (const key of ALLOWED_CARD_FIELDS) {
      expect(DAY_TOURS_SRC, `card missing field {t.${key}}`).toContain(`t.${key}`);
    }
    // No non-card fields should leak into the listing.
    for (const key of EXTRA_FIELDS_TO_AVOID) {
      expect(
        DAY_TOURS_SRC.includes(`t.${key}`),
        `unexpected extra field {t.${key}} on card`,
      ).toBe(false);
    }
  });

  it("card title never sits absolutely-positioned over the hero image", () => {
    // The image link block ends BEFORE the region/title block. Assert the
    // ordering: <Link ... image ...>...</Link> comes strictly before the
    // title Link that renders {t.title}.
    const imgIdx = DAY_TOURS_SRC.indexOf("<img");
    const titleIdx = DAY_TOURS_SRC.indexOf("{t.title}", imgIdx);
    expect(imgIdx).toBeGreaterThan(-1);
    expect(titleIdx).toBeGreaterThan(imgIdx);

    // The stretch of source between the image tag and the title MUST close
    // the anchor before rendering the title (guards against a title being
    // reintroduced inside the aspect-locked hero link).
    const between = DAY_TOURS_SRC.slice(imgIdx, titleIdx);
    expect(between).toContain("</Link>");
  });

  it("hero on the Signature detail page does not overlay title on the image", () => {
    // Regression: earlier the hero had `absolute inset-0 ... {t.title}`.
    // Assert no absolute-positioned title overlay remains.
    expect(TOUR_DETAIL_SRC).not.toMatch(
      /className="[^"]*absolute[^"]*"[^>]*>[^<]*\{t\.title\}/,
    );
    expect(TOUR_DETAIL_SRC).not.toMatch(
      /absolute\s+inset-0[\s\S]{0,400}\{t\.title\}/,
    );
  });

  it("every SignatureTour exposes all card fields with non-empty values", () => {
    for (const t of signatureTours) {
      for (const key of ALLOWED_CARD_FIELDS) {
        const v = (t as unknown as Record<string, unknown>)[key];
        expect(
          v,
          `tour=${t.id} missing configurable card field "${key}"`,
        ).toBeTruthy();
      }
    }
  });
});
