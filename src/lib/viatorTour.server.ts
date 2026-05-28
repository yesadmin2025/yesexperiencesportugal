/**
 * Server-only: fetch a Viator tour page and extract a structured,
 * source-of-truth itinerary using Lovable AI tool-calling.
 *
 * Used by the admin "Arrábida P3 — Viator source" panel to overwrite
 * the imported_tours row for `arrabida-wine-allinclusive` with content
 * faithful to the matching Viator page (no invented stops).
 */

const AI_MODEL = "google/gemini-3-flash-preview";

export type ViatorExtraction = {
  title: string;
  durationText: string;
  pickupZone: string;
  groupType: string;
  blurb: string;
  itinerary: { order: number; label: string; description: string; optional: boolean }[];
  inclusions: string[];
  exclusions: string[];
  variesByOption: string[];
};

const EXTRACTOR_SYSTEM = `You extract a faithful, source-of-truth itinerary from a Viator tour page.

CRITICAL RULES:
- Use ONLY content present in the page text. Do NOT invent stops, partners, restaurants, or inclusions.
- If the page says "depending on option", "subject to availability", or "optional", reflect that exactly.
- Preserve real stop names with correct Portuguese spelling (e.g. "Mercado do Livramento", "Azulejos de Azeitão", "Cristo Rei", "Sesimbra").
- Stops must be in the order presented on the page.
- Mark a stop as optional=true ONLY when the page explicitly says optional / depends on option / not always included.
- inclusions = what is explicitly included (transport, guide, tastings, lunch, tickets, etc.)
- exclusions = what is explicitly NOT included
- variesByOption = items that change based on the selected option/package
- blurb = 2 short sentences in calm editorial voice, factually accurate to the page`;

const EXTRACTOR_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_viator_tour",
    description: "Extract a faithful itinerary from a Viator tour page.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        durationText: { type: "string", description: 'e.g. "8 to 9 hours"' },
        pickupZone: { type: "string", description: 'e.g. "Lisbon city center hotels"' },
        groupType: { type: "string", description: 'e.g. "Private tour" or "Small group"' },
        blurb: { type: "string" },
        itinerary: {
          type: "array",
          minItems: 2,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              order: { type: "integer" },
              label: { type: "string" },
              description: { type: "string" },
              optional: { type: "boolean" },
            },
            required: ["order", "label", "description", "optional"],
            additionalProperties: false,
          },
        },
        inclusions: { type: "array", items: { type: "string" }, maxItems: 20 },
        exclusions: { type: "array", items: { type: "string" }, maxItems: 20 },
        variesByOption: { type: "array", items: { type: "string" }, maxItems: 20 },
      },
      required: [
        "title", "durationText", "pickupZone", "groupType", "blurb",
        "itinerary", "inclusions", "exclusions", "variesByOption",
      ],
      additionalProperties: false,
    },
  },
};

function stripHtml(html: string): string {
  // Strip script/style blocks first, then tags, then collapse whitespace.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchViatorPageText(url: string): Promise<string> {
  if (!/^https?:\/\/(www\.)?viator\.com\//i.test(url)) {
    throw new Error("URL must be a viator.com tour link");
  }
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YesExperiencesViatorImport/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Viator fetch failed: ${res.status}`);
  const html = await res.text();
  const text = stripHtml(html);
  // Cap to keep model context reasonable; Viator pages are huge.
  return text.slice(0, 60_000);
}

export async function extractViatorTour(url: string): Promise<ViatorExtraction> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const pageText = await fetchViatorPageText(url);

  const userMsg = `Source URL: ${url}

Page text (cleaned, may be truncated):
${pageText}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: EXTRACTOR_SYSTEM },
        { role: "user", content: userMsg },
      ],
      tools: [EXTRACTOR_TOOL],
      tool_choice: { type: "function", function: { name: "extract_viator_tour" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit exceeded — try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted — top up in workspace settings.");
    throw new Error(`AI extraction failed [${res.status}]: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error("AI returned no tool call arguments");
  const parsed = JSON.parse(argsStr) as ViatorExtraction;

  // Defensive: ensure ordering is sane.
  parsed.itinerary.sort((a, b) => a.order - b.order);
  return parsed;
}
