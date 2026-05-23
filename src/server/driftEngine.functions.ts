import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assembleReveal } from "./driftEngine.server";
import { sanitizeConfidence } from "@/lib/drift/inference";

/**
 * Drift engine — Phase 2 server functions.
 *
 *   - revealJourney: compose final day + AI story + DNA, now powered by the
 *     adaptive confidence map (not just explicit profile fields).
 *
 * Scene routing remains client-side (chapter graph), but every dimension is
 * scored against confidence so the composer/DNA layer can act on soft
 * signals collected during drift. The predictive layer (tonalRegister +
 * intensityPreference + locale) influences AI tone and length, never facts.
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
    locale: z.enum(["pt", "en"]).optional(),
    tonalRegister: z.enum(["intimate", "expansive", "playful", "ritual"]).optional(),
    intensityPreference: z.number().min(1).max(5).optional(),
  })
  .strict();

export const revealJourney = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data }) => {
    const { confidence, locale, tonalRegister, intensityPreference, ...profile } = data;
    return await assembleReveal(profile, sanitizeConfidence(confidence ?? {}), {
      locale: locale ?? "pt",
      tonalRegister,
      intensityPreference,
    });
  });
