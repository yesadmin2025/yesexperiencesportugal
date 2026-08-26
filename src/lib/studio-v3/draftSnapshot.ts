import type { StudioV3Phase, StudioV3State } from "@/components/studio-v3/types";

export const STUDIO_V3_SESSION_KEY = "yes.studio-v3.session.v1";
export const STUDIO_V3_DURABLE_DRAFT_KEY = "yes.studio-v3.draft.v1";
export const STUDIO_V3_DRAFT_VERSION = 1 as const;
export const STUDIO_V3_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const PHASES = new Set<StudioV3Phase>([
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
  "refinement",
  "logistics",
  "considerations",
  "language",
  "investment",
  "map",
  "storyboard",
  "confirmation",
  "guestDetails",
  "checkoutSummary",
]);

const FEELINGS = new Set([
  "coastal",
  "wine-food",
  "hidden",
  "romance",
  "culture",
  "adventure",
  "slow-luxury",
  "faith",
  "hands-on",
]);
const COMPANIONS = new Set([
  "solo",
  "couple",
  "family",
  "friends",
  "celebration",
  "proposal",
  "corporate",
]);
const OCCASIONS = new Set([
  "none",
  "proposal",
  "anniversary",
  "birthday",
  "honeymoon",
  "family-day",
  "corporate",
  "celebration",
]);
const DATE_MODES = new Set(["exact", "flexible", "undecided"]);
const PICKUPS = new Set([
  "lisbon",
  "lisbon-airport",
  "lisbon-cruise",
  "cascais-estoril",
  "sintra",
  "sesimbra-setubal-arrabida",
  "comporta-troia",
  "other",
]);
const INTERESTS = new Set([
  "wine",
  "gastronomy",
  "nature",
  "coast",
  "heritage",
  "photography",
  "wellness",
  "local-life",
  "faith",
  "hands-on",
]);
const RHYTHMS = new Set(["slow", "balanced", "full", "immersive"]);
const REFINEMENTS = new Set([
  "coast-from-the-water",
  "coast-wild-beaches",
  "coast-clifftop-views",
  "wine-cellar-depth",
  "wine-table-and-cheese",
  "wine-vineyard-views",
  "hands-paint-tile",
  "hands-make-cheese",
  "hands-just-watch",
  "local-river-and-rice",
  "local-market-morning",
  "local-artisans",
  "faith-sanctuary-time",
  "faith-templar-heritage",
  "faith-quiet-reflection",
  "photo-golden-hour",
  "photo-landmarks",
  "photo-no-preference",
]);
const LANGUAGES = new Set(["en", "pt", "es", "other"]);
const INVESTMENTS = new Set(["considered", "elevated", "bespoke", "open"]);
const DESTINATIONS = new Set([
  "no-preference",
  "lisbon-sintra-cascais",
  "arrabida-setubal-azeitao",
  "alentejo-evora-wine",
  "alentejo-roman-talha",
  "vicentine-coast",
  "comporta-troia",
  "spiritual-coast",
  "central-portugal",
  "anywhere-special",
]);
const PATH_MODES = new Set(["guided", "fast"]);
const DECIDED_FOR_ME = new Set(["feeling", "interests", "rhythm"]);
const DELEGATION_MODES = new Set(["yes-designs"]);

const NON_DURABLE_PHASES = new Set<StudioV3Phase>([
  "map",
  "confirmation",
  "guestDetails",
  "checkoutSummary",
]);

export type SafeStudioDraftState = Partial<StudioV3State> & { phase?: StudioV3Phase };

export interface DurableStudioDraft {
  version: typeof STUDIO_V3_DRAFT_VERSION;
  updatedAt: string;
  expiresAt: string;
  state: SafeStudioDraftState;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function enumValue<T extends string>(value: unknown, allowed: ReadonlySet<string>): T | null {
  return typeof value === "string" && allowed.has(value) ? (value as T) : null;
}

function nullableEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  allowed: ReadonlySet<string>,
): T | null | undefined {
  if (!(key in source)) return undefined;
  if (source[key] === null) return null;
  return enumValue<T>(source[key], allowed) ?? undefined;
}

function nullableText(
  source: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | null | undefined {
  if (!(key in source)) return undefined;
  if (source[key] === null) return null;
  if (typeof source[key] !== "string") return undefined;
  const text = source[key].trim().slice(0, maxLength);
  return text || null;
}

function nullableInt(
  source: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number | null | undefined {
  if (!(key in source)) return undefined;
  if (source[key] === null) return null;
  if (typeof source[key] !== "number" || !Number.isInteger(source[key])) return undefined;
  return source[key] >= min && source[key] <= max ? source[key] : undefined;
}

function booleanValue(source: Record<string, unknown>, key: string): boolean | undefined {
  return typeof source[key] === "boolean" ? source[key] : undefined;
}

function normaliseDurablePhase(value: unknown): StudioV3Phase | undefined {
  const phase = enumValue<StudioV3Phase>(value, PHASES);
  if (!phase) return undefined;
  return NON_DURABLE_PHASES.has(phase) ? "storyboard" : phase;
}

/**
 * P12 privacy boundary for anything that survives the current browser tab or
 * is stored behind a share token. This is deliberately an allow-list, not a
 * blacklist: unknown future fields cannot silently become durable.
 *
 * Identity/contact fields (`firstName`, `guestDraft`) are never copied.
 * `considerations` is intentionally excluded too because it can encode
 * dietary, allergy or mobility information. Checkout/payment state is not a
 * StudioV3State field and therefore cannot enter this snapshot.
 */
export function sanitizeStudioDurableState(value: unknown): SafeStudioDraftState {
  const source = objectRecord(value);
  if (!source) return {};

  const out: SafeStudioDraftState = {};
  const phase = normaliseDurablePhase(source.phase);
  if (phase) out.phase = phase;

  const feeling = nullableEnum<StudioV3State["feeling"] & string>(source, "feeling", FEELINGS);
  if (feeling !== undefined) out.feeling = feeling;
  const companions = nullableEnum<StudioV3State["companions"] & string>(
    source,
    "companions",
    COMPANIONS,
  );
  if (companions !== undefined) out.companions = companions;
  const occasion = nullableEnum<StudioV3State["occasion"] & string>(source, "occasion", OCCASIONS);
  if (occasion !== undefined) out.occasion = occasion;
  const dateMode = nullableEnum<StudioV3State["dateMode"] & string>(source, "dateMode", DATE_MODES);
  if (dateMode !== undefined) out.dateMode = dateMode;

  if (source.dateExact === null) out.dateExact = null;
  else if (typeof source.dateExact === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.dateExact)) {
    out.dateExact = source.dateExact;
  }

  const pickup = nullableEnum<StudioV3State["pickup"] & string>(source, "pickup", PICKUPS);
  if (pickup !== undefined) out.pickup = pickup;
  const guests = nullableInt(source, "guests", 1, 14);
  if (guests !== undefined) out.guests = guests;
  const adults = nullableInt(source, "adults", 1, 14);
  if (adults !== undefined) out.adults = adults;

  if (Array.isArray(source.minorAges)) {
    out.minorAges = source.minorAges
      .filter((age): age is number => typeof age === "number" && Number.isInteger(age))
      .filter((age) => age >= 0 && age <= 17)
      .slice(0, 13);
  }
  if (Array.isArray(source.interests)) {
    out.interests = source.interests
      .filter((item): item is StudioV3State["interests"][number] =>
        typeof item === "string" && INTERESTS.has(item),
      )
      .slice(0, 10);
  }

  const rhythm = nullableEnum<StudioV3State["rhythm"] & string>(source, "rhythm", RHYTHMS);
  if (rhythm !== undefined) out.rhythm = rhythm;
  const refinement = nullableEnum<StudioV3State["refinement"] & string>(
    source,
    "refinement",
    REFINEMENTS,
  );
  if (refinement !== undefined) out.refinement = refinement;
  const language = nullableEnum<StudioV3State["language"] & string>(source, "language", LANGUAGES);
  if (language !== undefined) out.language = language;
  const investment = nullableEnum<StudioV3State["investment"] & string>(
    source,
    "investment",
    INVESTMENTS,
  );
  if (investment !== undefined) out.investment = investment;

  const tourId = nullableText(source, "tourId", 120);
  if (tourId !== undefined) out.tourId = tourId;
  const journeyTitle = nullableText(source, "journeyTitle", 200);
  if (journeyTitle !== undefined) out.journeyTitle = journeyTitle;

  const guestsInferred = booleanValue(source, "guestsInferred");
  if (guestsInferred !== undefined) out.guestsInferred = guestsInferred;
  const guestsPrivateEvent = booleanValue(source, "guestsPrivateEvent");
  if (guestsPrivateEvent !== undefined) out.guestsPrivateEvent = guestsPrivateEvent;

  if (Array.isArray(source.editedRoutePoints)) {
    const points = source.editedRoutePoints
      .map((point) => objectRecord(point))
      .filter((point): point is Record<string, unknown> => point !== null)
      .map((point) => {
        const label = typeof point.label === "string" ? point.label.trim().slice(0, 160) : "";
        const story = typeof point.story === "string" ? point.story.trim().slice(0, 600) : "";
        return label ? { label, story } : null;
      })
      .filter((point): point is { label: string; story: string } => point !== null)
      .slice(0, 10);
    out.editedRoutePoints = points.length > 0 ? points : null;
  } else if (source.editedRoutePoints === null) {
    out.editedRoutePoints = null;
  }

  const destinationIntent = enumValue<StudioV3State["destinationIntent"]>(
    source.destinationIntent,
    DESTINATIONS,
  );
  if (destinationIntent) out.destinationIntent = destinationIntent;
  const pathMode = enumValue<StudioV3State["pathMode"]>(source.pathMode, PATH_MODES);
  if (pathMode) out.pathMode = pathMode;
  const rerollCount = nullableInt(source, "rerollCount", 0, 20);
  if (typeof rerollCount === "number") out.rerollCount = rerollCount;

  if (Array.isArray(source.decidedForMe)) {
    out.decidedForMe = source.decidedForMe
      .filter((item): item is StudioV3State["decidedForMe"][number] =>
        typeof item === "string" && DECIDED_FOR_ME.has(item),
      )
      .slice(0, 3);
  }
  if (source.delegationMode === null) out.delegationMode = null;
  else {
    const delegationMode = enumValue<"yes-designs">(source.delegationMode, DELEGATION_MODES);
    if (delegationMode) out.delegationMode = delegationMode;
  }

  return out;
}

export function isMeaningfulStudioDraft(state: SafeStudioDraftState): boolean {
  if (!state.phase || state.phase === "intro") return false;
  return Boolean(
    state.feeling ||
      state.companions ||
      (state.interests && state.interests.length > 0) ||
      state.rhythm ||
      state.tourId,
  );
}

export function serializeDurableStudioDraft(
  sessionValue: string,
  nowMs = Date.now(),
): string | null {
  try {
    const state = sanitizeStudioDurableState(JSON.parse(sessionValue));
    if (!isMeaningfulStudioDraft(state)) return null;
    const draft: DurableStudioDraft = {
      version: STUDIO_V3_DRAFT_VERSION,
      updatedAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + STUDIO_V3_DRAFT_MAX_AGE_MS).toISOString(),
      state,
    };
    return JSON.stringify(draft);
  } catch {
    return null;
  }
}

export function parseDurableStudioDraft(
  raw: string | null,
  nowMs = Date.now(),
): DurableStudioDraft | null {
  if (!raw) return null;
  try {
    const parsed = objectRecord(JSON.parse(raw));
    if (!parsed || parsed.version !== STUDIO_V3_DRAFT_VERSION) return null;
    if (typeof parsed.updatedAt !== "string" || typeof parsed.expiresAt !== "string") return null;
    const expiresAtMs = Date.parse(parsed.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;
    const state = sanitizeStudioDurableState(parsed.state);
    if (!isMeaningfulStudioDraft(state)) return null;
    return {
      version: STUDIO_V3_DRAFT_VERSION,
      updatedAt: parsed.updatedAt,
      expiresAt: parsed.expiresAt,
      state,
    };
  } catch {
    return null;
  }
}
