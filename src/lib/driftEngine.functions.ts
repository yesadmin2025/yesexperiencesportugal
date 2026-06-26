import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assembleReveal } from "./driftEngine.server";
import { sanitizeConfidence } from "@/lib/drift/inference";
import { rateLimit } from "@/lib/rateLimit.server";

/**
 * Drift engine — Phase 2 server functions.
 *
 *   - revealJourney: compose final day + AI story + DNA, now powered by the
 *     adaptive confidence map (not just explicit profile fields).
 *
 * Anonymous endpoint protected by a per-session rate limit (5 calls / 60s)
 * to prevent AI credit exhaustion. The handler always returns a deterministic
 * composition; AI tone is layered on top inside assembleReveal.
 */

const profileSchema = z
  .object({
    name: z.string().min(1).max(40).optional(),
    companions: z.enum(["solo", "couple", "family", "group"]).optional(),
    pickup: z.enum(["lisbon", "centro", "alentejo"]).optional(),
    radius: z.enum(["near", "far", "anywhere"]).optional(),
    energy: z.enum(["slow", "vivid"]).optional(),
    style: z.enum(["coast", "heritage", "wine", "table"]).optional(),
    social: z.enum(["intimate", "shared"]).optional(),
    confidence: z.record(z.string(), z.number()).optional(),
    // Predictive + i18n hints (all optional, never invent facts):
    locale: z.enum(["pt", "en", "es", "fr"]).optional(),
    tonalRegister: z.enum(["intimate", "expansive", "playful", "ritual"]).optional(),
    intensityPreference: z.number().min(1).max(5).optional(),
    sessionId: z.string().min(8).max(64),
  })
  .strict();

export const revealJourney = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data }) => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "drift_reveal",
      limit: 5,
      windowSec: 60,
    });
    const {
      confidence,
      locale,
      tonalRegister,
      intensityPreference,
      sessionId: _sid,
      ...profile
    } = data;
    return await assembleReveal(profile, sanitizeConfidence(confidence ?? {}), {
      locale: locale ?? "en",
      tonalRegister,
      intensityPreference,
      skipAi: !rl.ok,
    });
  });

