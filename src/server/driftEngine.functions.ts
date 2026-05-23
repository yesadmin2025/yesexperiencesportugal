import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assembleReveal } from "./driftEngine.server";

/**
 * Drift engine — Phase 1 server functions.
 *
 * Single endpoint surface for now: `revealJourney`. The frontend still
 * owns scene routing (deterministic Chapter graph), but the final reveal
 * is composed server-side so we can:
 *   - generate tone-only AI copy without leaking the API key
 *   - activate DNA tokens from editable Supabase config
 *   - swap voice/copy without redeploying
 *
 * Phase 2 will add `nextScene` + scoring server-side.
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
  })
  .strict();

export const revealJourney = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data }) => {
    return await assembleReveal(data);
  });
