/**
 * Server-side proxy for the reference tone reader.
 *
 * The `analyze-builder-references` function reads PRIVATE guest uploads with
 * the service-role client and spends paid AI credits, so it must never be
 * callable straight from a browser. It now requires a shared internal secret,
 * and browsers reach it only through this server function, which applies a
 * network-level abuse guard first.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { guardAiCaller } from "./abuseGuard.server";

const schema = z.object({
  sessionId: z.string().min(8).max(64),
  fileIds: z.array(z.string().min(1).max(64)).max(5).default([]),
});

export interface ToneResult {
  toneSummary: string;
  toneKeywords: string[];
}

export const analyzeBuilderReferences = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<ToneResult | { error: string }> => {
    const guard = await guardAiCaller({
      bucket: "analyze_refs",
      limit: 10,
      windowSec: 300,
    });
    if (!guard.ok) {
      return { error: "Too many tone reads right now — please try again in a moment." };
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const internalSecret = process.env.BUILDER_SESSION_SIGNING_SECRET;
    if (!url || !serviceKey || !internalSecret) {
      return { error: "Tone reader is not configured." };
    }

    try {
      const res = await fetch(`${url}/functions/v1/analyze-builder-references`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "x-builder-internal": internalSecret,
        },
        body: JSON.stringify({ sessionId: data.sessionId, fileIds: data.fileIds }),
      });
      const json = (await res.json()) as ToneResult | { error: string };
      if (!res.ok) {
        return { error: "error" in json ? json.error : "Couldn't read tone right now." };
      }
      return json;
    } catch {
      return { error: "Couldn't reach the tone reader." };
    }
  });
