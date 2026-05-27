import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rateLimit } from "./rateLimit.server";

/* ───────── persisted state schema (mirrors useMultiDayBuilder) ───────── */

const dayStateSchema = z.object({
  id: z.string().min(1).max(64),
  regionKey: z.string().min(1).max(64),
  stopKeys: z.array(z.string().min(1).max(64)).max(20),
  label: z.string().max(80).optional(),
});

const stateSchema = z.object({
  days: z.array(dayStateSchema).min(1).max(30),
  activeDayId: z.string().min(1).max(64).nullable(),
  guests: z.number().int().min(1).max(12),
  pace: z.enum(["relaxed", "balanced", "full"]),
  intent: z.string().max(500).optional(),
});

export type PersistedJourneyState = z.infer<typeof stateSchema>;

const sessionId = z.string().min(8).max(64);

function hashOwner(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function makeToken(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/* ───────── createJourney: returns share + owner tokens ───────── */

export const createJourney = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ state: stateSchema, sessionId }).parse(input),
  )
  .handler(async ({ data }) => {
    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "journey_create",
      limit: 6,
      windowSec: 600,
    });
    if (!rl.ok) {
      throw new Error(`Too many shares created — try again in ${rl.resetInSec}s`);
    }

    const shareToken = makeToken(12);
    const ownerToken = makeToken(24);

    const { data: row, error } = await supabaseAdmin
      .from("builder_journeys")
      .insert({
        share_token: shareToken,
        owner_token_hash: hashOwner(ownerToken),
        state: data.state,
        intent: data.state.intent ?? null,
      })
      .select("id, share_token, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, shareToken: row.share_token, ownerToken };
  });

/* ───────── loadJourney: read-only by shareToken; ownership via ownerToken ───────── */

export const loadJourney = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      shareToken: z.string().min(8).max(64),
      ownerToken: z.string().min(8).max(128).optional(),
      sessionId: sessionId.optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.sessionId) {
      const rl = await rateLimit({
        sessionId: data.sessionId,
        bucket: "journey_load",
        limit: 60,
        windowSec: 60,
      });
      if (!rl.ok) return { found: false as const, rateLimited: true as const };
    }

    const { data: row, error } = await supabaseAdmin
      .from("builder_journeys")
      .select("state, owner_token_hash, updated_at, revoked_at")
      .eq("share_token", data.shareToken)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return { found: false as const };
    if (row.revoked_at) return { found: false as const, revoked: true as const };

    const isOwner = data.ownerToken
      ? hashOwner(data.ownerToken) === row.owner_token_hash
      : false;

    return {
      found: true as const,
      state: row.state as PersistedJourneyState,
      isOwner,
      updatedAt: row.updated_at,
    };
  });

/* ───────── saveJourney: requires ownerToken ───────── */

export const saveJourney = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      shareToken: z.string().min(8).max(64),
      ownerToken: z.string().min(8).max(128),
      state: stateSchema,
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("builder_journeys")
      .select("owner_token_hash, revoked_at")
      .eq("share_token", data.shareToken)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, reason: "not_found" };
    if (row.revoked_at) return { ok: false as const, reason: "revoked" };
    if (hashOwner(data.ownerToken) !== row.owner_token_hash) {
      return { ok: false as const, reason: "forbidden" };
    }

    const { error: upErr } = await supabaseAdmin
      .from("builder_journeys")
      .update({ state: data.state, intent: data.state.intent ?? null })
      .eq("share_token", data.shareToken);

    if (upErr) throw new Error(upErr.message);
    return { ok: true as const };
  });

/* ───────── rotateShareToken: owner-only — invalidates old link, returns new ───────── */

export const rotateShareToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      shareToken: z.string().min(8).max(64),
      ownerToken: z.string().min(8).max(128),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("builder_journeys")
      .select("id, owner_token_hash")
      .eq("share_token", data.shareToken)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, reason: "not_found" };
    if (hashOwner(data.ownerToken) !== row.owner_token_hash) {
      return { ok: false as const, reason: "forbidden" };
    }
    const newShare = makeToken(12);
    const { error: upErr } = await supabaseAdmin
      .from("builder_journeys")
      .update({ share_token: newShare })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true as const, shareToken: newShare };
  });

/* ───────── revokeShareToken: owner-only — disables the public link ───────── */

export const revokeShareToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      shareToken: z.string().min(8).max(64),
      ownerToken: z.string().min(8).max(128),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("builder_journeys")
      .select("id, owner_token_hash")
      .eq("share_token", data.shareToken)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, reason: "not_found" };
    if (hashOwner(data.ownerToken) !== row.owner_token_hash) {
      return { ok: false as const, reason: "forbidden" };
    }
    const { error: upErr } = await supabaseAdmin
      .from("builder_journeys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true as const };
  });
