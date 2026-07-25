/**
 * Server-only: SoT (Source of Truth) extractor for Signature tours.
 *
 * Fetches a Viator product page and asks Lovable AI to emit the strict
 * SignatureSourceOfTruth shape (with real per-chapter timings). Never
 * persists — the admin reviews the payload and pastes it into
 * `src/data/signatureToursSourceOfTruth.ts`.
 *
 * Never edit this file to add invented content: the extractor is
 * constrained to only echo what appears on the fetched Viator page.
 */

import { fetchViatorPageText } from "@/lib/viatorTour.server";
import type { SignatureSourceOfTruth } from "@/data/signatureToursSourceOfTruth";

const AI_MODEL = "google/gemini-3-flash-preview";

const SOT_SYSTEM = `You extract the source-of-truth for a Signature tour from a Viator product page.

HARD RULES — no exceptions:
- Use ONLY content that literally appears on the page. NEVER invent stops, restaurants, wineries, partners, timings, inclusions or exclusions.
- Preserve real names with correct Portuguese spelling (e.g. "Mercado do Livramento", "Azulejos de Azeitão", "Cristo Rei", "Sesimbra", "Comporta", "Évora").
- Stops must appear in the order the page presents them.
- Mark a chapter optional=true ONLY when the page explicitly says "optional" / "depending on option" / "subject to availability".
- notIncluded = verbatim "What's Not Included" list. variesByOption = items that change per selected package.
- durationText: verbatim string from the page (e.g. "8 to 9 hours").
- durationMinutes: MIDPOINT of the range in minutes. "8 to 9 hours" → 510. Round to nearest 5.
- Per-chapter durationMinutes: use only if the page shows a time (e.g. "Stop: 90 minutes"). Otherwise return null.
- Per-chapter travelToNextMinutes: use only if the page shows transit time between stops. Otherwise return null.
- pickupWindow: return the exact printed window (e.g. "08:00–09:00") or null if omitted.
- maxGroup: integer if page states a max, otherwise null.
- languages: verbatim list. cancellation: the single-sentence cancellation policy.
- overview: 2–4 short sentences drawn ONLY from the page — no marketing prose beyond what Viator itself prints.
- highlights: verbatim bullet list from the "Highlights" section (or equivalent), max 8.`;

const SOT_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_signature_sot",
    description:
      "Extract the Signature source-of-truth from a Viator tour page. All values must literally appear on the page.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        durationText: { type: "string" },
        durationMinutes: { type: "integer" },
        pickupWindow: { type: ["string", "null"] },
        pickupZone: { type: "string" },
        groupType: { type: "string" },
        maxGroup: { type: ["integer", "null"] },
        overview: { type: "string", maxLength: 1200 },
        highlights: {
          type: "array",
          items: { type: "string" },
          maxItems: 8,
        },
        included: { type: "array", items: { type: "string" }, maxItems: 20 },
        notIncluded: {
          type: "array",
          items: { type: "string" },
          maxItems: 20,
        },
        variesByOption: {
          type: "array",
          items: { type: "string" },
          maxItems: 20,
        },
        itinerary: {
          type: "array",
          minItems: 2,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              order: { type: "integer" },
              label: { type: "string" },
              description: { type: "string", maxLength: 240 },
              durationMinutes: { type: ["integer", "null"] },
              travelToNextMinutes: { type: ["integer", "null"] },
              optional: { type: "boolean" },
            },
            required: [
              "order",
              "label",
              "description",
              "durationMinutes",
              "travelToNextMinutes",
              "optional",
            ],
            additionalProperties: false,
          },
        },
        cancellation: { type: ["string", "null"] },
        languages: { type: "array", items: { type: "string" } },
        meetingPoint: { type: ["string", "null"] },
      },
      required: [
        "title",
        "durationText",
        "durationMinutes",
        "pickupWindow",
        "pickupZone",
        "groupType",
        "maxGroup",
        "overview",
        "highlights",
        "included",
        "notIncluded",
        "variesByOption",
        "itinerary",
        "cancellation",
        "languages",
        "meetingPoint",
      ],
      additionalProperties: false,
    },
  },
};

export type SotExtraction = Omit<
  SignatureSourceOfTruth,
  "tourId" | "viatorUrl" | "productCode" | "verifiedAt"
>;

export async function extractSignatureSot(url: string): Promise<SotExtraction> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const pageText = await fetchViatorPageText(url);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SOT_SYSTEM },
        {
          role: "user",
          content: `Source URL: ${url}\n\nPage text (cleaned, may be truncated):\n${pageText}`,
        },
      ],
      tools: [SOT_TOOL],
      tool_choice: { type: "function", function: { name: "extract_signature_sot" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429)
      throw new Error("AI rate limit exceeded — try again in a minute.");
    if (res.status === 402)
      throw new Error("AI credits exhausted — top up in workspace settings.");
    throw new Error(
      `AI extraction failed [${res.status}]: ${t.slice(0, 200)}`,
    );
  }

  const data = await res.json();
  const argsStr =
    data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error("AI returned no tool call arguments");
  const parsed = JSON.parse(argsStr) as SotExtraction;
  parsed.itinerary.sort((a, b) => a.order - b.order);
  return parsed;
}

/**
 * Format an extraction as a ready-to-paste TS entry for
 * SIGNATURE_SOURCE_OF_TRUTH. Deterministic — safe to copy verbatim.
 */
export function formatSotEntry(
  tourId: string,
  viatorUrl: string,
  productCode: string,
  extraction: SotExtraction,
): string {
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const j = (v: unknown) => JSON.stringify(v);
  const chapters = extraction.itinerary
    .map(
      (c) =>
        `      { order: ${c.order}, label: ${j(c.label)}, description: ${j(c.description)}, durationMinutes: ${c.durationMinutes === null ? "null" : c.durationMinutes}, travelToNextMinutes: ${c.travelToNextMinutes === null ? "null" : c.travelToNextMinutes}, optional: ${c.optional} }`,
    )
    .join(",\n");
  return `  ${j(tourId)}: {
    tourId: ${j(tourId)},
    viatorUrl: ${j(viatorUrl)},
    productCode: ${j(productCode)},
    title: ${j(extraction.title)},
    durationText: ${j(extraction.durationText)},
    durationMinutes: ${extraction.durationMinutes},
    pickupWindow: ${extraction.pickupWindow === null ? "null" : j(extraction.pickupWindow)},
    pickupZone: ${j(extraction.pickupZone)},
    groupType: ${j(extraction.groupType)},
    maxGroup: ${extraction.maxGroup === null ? "null" : extraction.maxGroup},
    overview: ${j(extraction.overview)},
    highlights: ${j(extraction.highlights)},
    included: ${j(extraction.included)},
    notIncluded: ${j(extraction.notIncluded)},
    variesByOption: ${j(extraction.variesByOption)},
    itinerary: [
${chapters}
    ],
    cancellation: ${extraction.cancellation === null ? "null" : j(extraction.cancellation)},
    languages: ${j(extraction.languages)},
    meetingPoint: ${extraction.meetingPoint === null ? "null" : j(extraction.meetingPoint)},
    verifiedAt: ${j(verifiedAt)},
  },`;
}
