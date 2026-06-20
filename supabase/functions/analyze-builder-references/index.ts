// Analyze builder reference uploads (photos + PDFs) and produce a TONE summary.
//
// Strict guardrails:
//  - The AI ONLY shapes narrative tone (3-5 keywords + 1 short sentence).
//  - It NEVER invents stops, partners, locations, prices, or images.
//  - It NEVER recommends adding/removing/reordering tour stops.
//  - PDFs and images are passed as inline parts to Gemini Vision.
//
// Inputs (POST JSON):
//   { sessionId: string, fileIds?: string[] }
//
// The server resolves files by sessionId from `builder_reference_uploads`
// and downloads file contents directly from the (private) `builder-references`
// storage bucket using the service-role client. The client never supplies a
// URL — eliminating SSRF.
//
// Output:
//   { toneSummary: string, toneKeywords: string[] }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_FILES = 5;
const MAX_BYTES_PER_FILE = 10 * 1024 * 1024; // 10 MB

const SYSTEM_PROMPT = `You are a tone reader for a luxury Portugal travel studio.

You will receive 1-5 reference files (photos and/or PDFs) that a guest uploaded
to inspire the FEEL of their day. Your ONLY job is to describe the *tone* and
*atmosphere* the guest seems drawn to.

STRICT RULES:
- Output 3-5 single-word lowercase keywords describing mood/atmosphere
  (e.g. "slow", "golden", "intimate", "rustic", "coastal", "celebratory").
- Plus ONE short sentence (max 22 words) describing the overall vibe.
- NEVER name specific places, partners, restaurants, hotels, or experiences.
- NEVER suggest itinerary changes, stops, prices, or activities.
- NEVER mention images you cannot clearly see; if files are ambiguous, say so.
- If files are unrelated to travel/atmosphere (e.g. screenshots of code,
  receipts, contracts), set toneKeywords to [] and toneSummary to a polite
  one-line note that the references weren't readable as mood inspiration.
- Output ONLY via the provided tool call. No extra prose.`;

interface RequestBody {
  sessionId: string;
  fileIds?: string[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf.byteLength > MAX_BYTES_PER_FILE) {
    throw new Error("File exceeds 10 MB");
  }
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(bin);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const sessionId = (body.sessionId ?? "").trim();
  if (!sessionId || sessionId.length < 8 || sessionId.length > 64) {
    return jsonResponse({ error: "Invalid sessionId" }, 400);
  }

  const fileIds = Array.isArray(body.fileIds)
    ? body.fileIds.filter((s): s is string => typeof s === "string").slice(0, MAX_FILES)
    : null;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return jsonResponse({ error: "AI not configured" }, 500);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ------------------------------------------------------------------
  // Rate limit (ad-hoc, DB-backed). Anonymous flow keyed by sessionId.
  // Bucket = "analyze_refs", limit = 5 calls per 60s window.
  // Fail-open on transient DB errors so a blip doesn't break UX, but
  // the unique (session_id, bucket) row + service-role write still
  // caps abuse at the DB layer.
  // ------------------------------------------------------------------
  {
    const RL_LIMIT = 5;
    const RL_WINDOW_SEC = 60;
    const now = Date.now();
    try {
      const { data: row } = await admin
        .from("builder_rate_limits")
        .select("call_count,last_call_at")
        .eq("session_id", sessionId)
        .eq("bucket", "analyze_refs")
        .maybeSingle();

      if (!row) {
        await admin
          .from("builder_rate_limits")
          .insert({ session_id: sessionId, bucket: "analyze_refs", call_count: 1 });
      } else {
        const elapsed = (now - new Date(row.last_call_at).getTime()) / 1000;
        if (elapsed >= RL_WINDOW_SEC) {
          await admin
            .from("builder_rate_limits")
            .update({ call_count: 1, last_call_at: new Date(now).toISOString() })
            .eq("session_id", sessionId)
            .eq("bucket", "analyze_refs");
        } else if (row.call_count >= RL_LIMIT) {
          return new Response(
            JSON.stringify({
              error: "Too many requests, please wait a moment.",
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "Retry-After": String(Math.max(1, Math.ceil(RL_WINDOW_SEC - elapsed))),
              },
            },
          );
        } else {
          await admin
            .from("builder_rate_limits")
            .update({
              call_count: row.call_count + 1,
              last_call_at: new Date(now).toISOString(),
            })
            .eq("session_id", sessionId)
            .eq("bucket", "analyze_refs");
        }
      }
    } catch (e) {
      console.warn("[analyze-builder-references] rate-limit check failed (fail-open):", e);
    }
  }

  // Resolve files server-side by sessionId. The client never supplies a URL.
  let query = admin
    .from("builder_reference_uploads")
    .select("id, file_path, file_name, mime_type, file_size_bytes")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_FILES);
  if (fileIds && fileIds.length > 0) {
    query = query.in("id", fileIds);
  }
  const { data: rows, error: rowsErr } = await query;
  if (rowsErr) {
    console.error("Failed to load references", rowsErr);
    return jsonResponse({ error: "Could not load your references" }, 500);
  }
  const files = (rows ?? []).filter(
    (r) => ALLOWED_MIME.has(r.mime_type) && r.file_size_bytes <= MAX_BYTES_PER_FILE,
  );
  if (files.length === 0) {
    return jsonResponse({ error: "No files to analyze" }, 400);
  }

  const parts: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text:
        "These are the guest's mood references. Read the *tone* only. " +
        "Respond exclusively via the report_tone tool.",
    },
  ];

  for (const f of files) {
    try {
      const { data: blob, error: dlErr } = await admin.storage
        .from("builder-references")
        .download(f.file_path);
      if (dlErr || !blob) {
        console.warn("Skipping unreadable file", f.file_path, dlErr?.message);
        continue;
      }
      const b64 = await blobToBase64(blob);
      parts.push({
        type: "image_url",
        image_url: { url: `data:${f.mime_type};base64,${b64}` },
      });
    } catch (e) {
      console.error("Failed to encode file", f.file_path, e);
    }
  }

  if (parts.length === 1) {
    return jsonResponse({ error: "Could not read any reference file" }, 422);
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "report_tone",
        description: "Report the tone/atmosphere read from the references.",
        parameters: {
          type: "object",
          properties: {
            toneKeywords: {
              type: "array",
              description: "3-5 lowercase single-word mood adjectives. Empty if files unreadable.",
              items: { type: "string" },
              minItems: 0,
              maxItems: 5,
            },
            toneSummary: {
              type: "string",
              description: "One short sentence (max 22 words) describing overall vibe.",
              maxLength: 220,
            },
          },
          required: ["toneKeywords", "toneSummary"],
          additionalProperties: false,
        },
      },
    },
  ];

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parts },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "report_tone" } },
    }),
  });

  if (aiRes.status === 429) {
    return jsonResponse({ error: "Too many requests, please try again in a moment." }, 429);
  }
  if (aiRes.status === 402) {
    return jsonResponse({ error: "AI credits exhausted. Add funds in Lovable workspace." }, 402);
  }
  if (!aiRes.ok) {
    const txt = await aiRes.text().catch(() => "");
    console.error("AI gateway error", aiRes.status, txt.slice(0, 400));
    return jsonResponse({ error: "AI gateway error" }, 502);
  }

  const aiJson = await aiRes.json();
  const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!toolCall) {
    console.error("No tool call in AI response");
    return jsonResponse({ error: "Model did not return a tone summary" }, 502);
  }

  let parsed: { toneKeywords: string[]; toneSummary: string };
  try {
    parsed = JSON.parse(toolCall);
  } catch (e) {
    console.error("Bad tool call JSON", e);
    return jsonResponse({ error: "Malformed tone payload" }, 502);
  }

  const keywords = (parsed.toneKeywords ?? [])
    .filter((k) => typeof k === "string")
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0 && k.length <= 24)
    .slice(0, 5);
  const summary = (parsed.toneSummary ?? "").trim().slice(0, 220);

  const fileIdsToUpdate = files.map((f) => f.id);
  const { error: updateErr } = await admin
    .from("builder_reference_uploads")
    .update({
      tone_summary: summary,
      tone_keywords: keywords,
      analyzed_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .in("id", fileIdsToUpdate);

  if (updateErr) {
    console.error("Failed to persist tone summary", updateErr);
  }

  return jsonResponse({
    toneSummary: summary,
    toneKeywords: keywords,
  });
});
