import { z } from "zod";
import { ADD_ON_CATALOG, selectSignatureAddOns } from "@/data/signatureAddOns";
import { findTour } from "@/data/signatureTours";
import { INITIAL_STATE, type StudioV3State } from "./types";

export const STUDIO_DRAFT_STORAGE_KEY = "yes.studio.v3.draft.v1";
const NOTICE_PREFIX = "yes.studio.v3.restore-noticed.v2:";

const phaseSchema = z.enum([
  "intro",
  "feeling",
  "destination",
  "who",
  "occasion",
  "date",
  "pickup",
  "guests",
  "interests",
  "rhythm",
  "considerations",
  "language",
  "investment",
  "map",
  "storyboard",
  "confirmation",
  "guestDetails",
  "checkoutSummary",
]);

const stateSchema = z
  .object({
    phase: phaseSchema.optional(),
    feeling: z.enum(["coastal", "wine-food", "hidden", "romance", "culture", "adventure", "slow-luxury"]).nullable().optional(),
    companions: z.enum(["solo", "couple", "family", "friends", "celebration", "proposal", "corporate"]).nullable().optional(),
    occasion: z.enum(["none", "proposal", "anniversary", "birthday", "honeymoon", "family-day", "corporate", "celebration"]).nullable().optional(),
    dateMode: z.enum(["exact", "flexible", "undecided"]).nullable().optional(),
    dateExact: z.string().max(20).nullable().optional(),
    pickup: z.enum(["lisbon", "lisbon-airport", "lisbon-cruise", "cascais-estoril", "sintra", "sesimbra-setubal-arrabida", "comporta-troia", "other"]).nullable().optional(),
    guests: z.number().int().min(1).max(14).nullable().optional(),
    minorAges: z.array(z.number().int().min(0).max(17)).max(14).optional(),
    interests: z.array(z.enum(["wine", "gastronomy", "nature", "coast", "heritage", "photography", "wellness", "local-life"])).max(8).optional(),
    rhythm: z.enum(["slow", "balanced", "full", "immersive"]).nullable().optional(),
    considerations: z.array(z.enum(["none", "vegetarian", "vegan", "gluten-free", "allergies", "reduced-mobility", "child-seats", "avoid-long-walks", "quiet-pace"])).max(9).optional(),
    language: z.enum(["en", "pt", "es", "other"]).nullable().optional(),
    investment: z.enum(["considered", "elevated", "bespoke", "open"]).nullable().optional(),
    tourId: z.string().max(120).nullable().optional(),
    journeyTitle: z.string().max(240).nullable().optional(),
    guestsInferred: z.boolean().optional(),
    guestsPrivateEvent: z.boolean().optional(),
    firstName: z.string().max(100).nullable().optional(),
    editedRoutePoints: z.array(z.object({ label: z.string().max(180), story: z.string().max(1000) })).max(20).nullable().optional(),
    destinationIntent: z.enum(["no-preference", "lisbon-sintra-cascais", "arrabida-setubal-azeitao", "alentejo-evora-wine", "alentejo-roman-talha", "vicentine-coast", "comporta-troia", "spiritual-coast", "central-portugal", "anywhere-special"]).optional(),
    pathMode: z.enum(["guided", "fast"]).optional(),
    rerollCount: z.number().int().min(0).max(100).optional(),
    guestDraft: z.object({
      fullName: z.string().max(200).optional(),
      email: z.string().max(320).optional(),
      phone: z.string().max(80).optional(),
      pickupAddress: z.string().max(500).optional(),
      guideNotes: z.string().max(2000).optional(),
    }).nullable().optional(),
  })
  .strip();

const v1Schema = z.object({
  version: z.literal(1),
  savedAt: z.number(),
  state: z.unknown(),
  tourId: z.string().nullable().optional(),
  addOnIds: z.array(z.string()).optional(),
});

const v2Schema = z.object({
  version: z.literal(2),
  draftId: z.string().min(1).max(120),
  savedAt: z.number(),
  state: z.unknown(),
  tourId: z.string().nullable(),
  addOnIds: z.array(z.string()),
});

export interface StudioDraftEnvelope {
  version: 2;
  draftId: string;
  savedAt: number;
  state: StudioV3State;
  tourId: string | null;
  addOnIds: string[];
}

const knownAddOnIds = new Set(Object.values(ADD_ON_CATALOG).flat().map((item) => item.id));

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function newDraftId(): string {
  if (hasWindow() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeAddOnIds(ids: readonly string[] | undefined): string[] {
  return Array.from(new Set((ids ?? []).filter((id) => knownAddOnIds.has(id)))).slice(0, 3);
}

export function validAddOnIdsForState(state: StudioV3State, ids: readonly string[]): string[] {
  const tour = state.tourId ? findTour(state.tourId) : null;
  if (!tour) return [];
  const stopCount = state.editedRoutePoints?.length ?? tour.stops?.length ?? 0;
  const eligible = new Set(
    selectSignatureAddOns({
      resolvedTour: tour,
      stopCount,
      durationLabel: tour.durationHours ?? tour.duration,
    }).map((item) => item.id),
  );
  return normalizeAddOnIds(ids).filter((id) => eligible.has(id));
}

export function normalizeStudioState(value: unknown): StudioV3State | null {
  const parsed = stateSchema.safeParse(value);
  if (!parsed.success) return null;
  const state = {
    ...INITIAL_STATE,
    ...parsed.data,
  } as StudioV3State;
  if (state.destinationIntent === "anywhere-special") state.destinationIntent = "no-preference";
  return state;
}

export function hydrateSavedStudioState(value: unknown): StudioV3State | null {
  const state = normalizeStudioState(value);
  return state ? { ...state, phase: "storyboard" } : null;
}

export function hasMeaningfulStudioProgress(state: Partial<StudioV3State> | null): boolean {
  if (!state) return false;
  if (state.phase && state.phase !== "intro") return true;
  if (state.feeling || state.rhythm || state.companions || state.destinationIntent !== "no-preference") return true;
  if (state.interests?.length || state.editedRoutePoints?.length) return true;
  return false;
}

export function readStudioDraft(): StudioDraftEnvelope | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    const current = v2Schema.safeParse(value);
    const legacy = current.success ? null : v1Schema.safeParse(value);
    const source = current.success ? current.data : legacy?.success ? legacy.data : null;
    if (!source) {
      clearStudioDraftStorage();
      return null;
    }
    const state = normalizeStudioState(source.state);
    if (!state || !hasMeaningfulStudioProgress(state)) {
      clearStudioDraftStorage();
      return null;
    }
    const envelope: StudioDraftEnvelope = {
      version: 2,
      draftId: current.success ? current.data.draftId : newDraftId(),
      savedAt: source.savedAt,
      state,
      tourId: source.tourId ?? state.tourId ?? null,
      addOnIds: normalizeAddOnIds(source.addOnIds),
    };
    if (!current.success) writeStudioDraft(envelope);
    return envelope;
  } catch {
    clearStudioDraftStorage();
    return null;
  }
}

export function createStudioDraftEnvelope(input: {
  draftId?: string | null;
  state: StudioV3State;
  addOnIds: readonly string[];
}): StudioDraftEnvelope {
  return {
    version: 2,
    draftId: input.draftId || newDraftId(),
    savedAt: Date.now(),
    state: input.state,
    tourId: input.state.tourId ?? null,
    addOnIds: normalizeAddOnIds(input.addOnIds),
  };
}

export function writeStudioDraft(envelope: StudioDraftEnvelope): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STUDIO_DRAFT_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Private browsing/quota failures must never interrupt the Studio.
  }
}

export function clearStudioDraftStorage(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
  } catch {
    // Storage may be unavailable; clearing is best effort.
  }
}

export function claimStudioDraftRestoreNotice(draftId: string): boolean {
  if (!hasWindow()) return false;
  const key = `${NOTICE_PREFIX}${draftId}`;
  try {
    if (window.sessionStorage.getItem(key) === "1") return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}
