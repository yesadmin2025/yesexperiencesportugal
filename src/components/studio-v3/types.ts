// Studio V3 — Cinematic Journey Composer
// Shared types for the phased journey state.

// Type-only import (erased at build time) — BUILD 1 / Pass 1 time domain.
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";
import type { TravellerDurationClass } from "@/lib/studio-v3/timeDomain";

/**
 * Canonical id tuples for Studio V3 taxonomy. Exported `as const` so tests
 * and iteration sites get a type-safe list AND the union type is derived
 * from a single source — preventing the TS2322 mismatches that appeared
 * when tests hand-rolled string arrays that drifted from the union.
 */
export const FEELING_IDS = [
  "coastal",
  "wine-food",
  "hidden",
  "romance",
  "culture",
  "adventure",
  "slow-luxury",
  "faith",
  "hands-on",
] as const;
export type Feeling = (typeof FEELING_IDS)[number];

export type Companions =
  | "solo"
  | "couple"
  | "family"
  | "friends"
  | "celebration"
  | "proposal"
  | "corporate";

export type Rhythm = "slow" | "balanced" | "full" | "immersive";

export type Occasion =
  | "none"
  | "proposal"
  | "anniversary"
  | "birthday"
  | "honeymoon"
  | "family-day"
  | "corporate"
  | "celebration";

export type DateWindow =
  | "exact"
  | "this-week"
  | "next-2-weeks"
  | "this-month"
  | "flexible"
  | "exploring";

export type Pickup =
  | "lisbon"
  | "lisbon-airport"
  | "lisbon-cruise"
  | "cascais-estoril"
  | "sintra"
  | "sesimbra-setubal-arrabida"
  | "comporta-troia"
  | "other";

export type GuestBucket = "1" | "2" | "3-4" | "5-6" | "7-10" | "11+";

export const INTEREST_IDS = [
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
] as const;
export type Interest = (typeof INTEREST_IDS)[number];

export type Consideration =
  | "none"
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "allergies"
  | "reduced-mobility"
  | "child-seats"
  | "avoid-long-walks"
  | "quiet-pace";

export type Language = "en" | "pt" | "es" | "other";

/**
 * Adaptive refinement answer ids — LEGACY HYDRATION CONTRACT.
 *
 * The live Studio runs the 0→N Question Director (`studioDirectorRuntime.ts`):
 * it may ask zero, one or many questions depending on genuine uncertainty.
 * These ids remain so saved states, deep links and older tests hydrate; they
 * are read back into the canonical question history exactly once. See
 * `docs/studio-north-star.md` for the current authority.
 */

export type AdaptiveRefinementId =
  | "coast-from-the-water"
  | "coast-wild-beaches"
  | "coast-clifftop-views"
  | "coast-remote-southwest"
  | "wine-cellar-depth"
  | "wine-table-and-cheese"
  | "wine-vineyard-views"
  | "wine-monumental-estates"
  | "wine-clay-talha"
  | "hands-paint-tile"
  | "hands-make-cheese"
  | "hands-just-watch"
  | "local-river-and-rice"
  | "local-market-morning"
  | "local-artisans"
  | "faith-sanctuary-time"
  | "faith-templar-heritage"
  | "faith-quiet-reflection"
  | "photo-golden-hour"
  | "photo-landmarks"
  | "photo-no-preference";

export type InvestmentTier = "considered" | "elevated" | "bespoke" | "open";

/**
 * Studio phases. The CURRENT canonical live order is:
 * intro → feeling → who → interests → rhythm → 0..N Director questions
 * ("refinement") → storyboard (YOUR DAY) → logistics (Make it real)
 * → guestDetails → checkoutSummary / payment.
 *
 * `confirmation` is NOT a separate live step: `map` and `confirmation` are
 * legacy unified ids canonicalized to `storyboard` by `studioPhaseCanonical.ts`.
 * The cinematic story is rendered within the unified Your Day surface where
 * applicable.
 *
 * Ids marked LEGACY below are hydration aliases only — no modern UI routes
 * to them; they remain so saved states, deep links and older tests hydrate.
 */
export type StudioV3Phase =
  | "intro"
  | "feeling"
  /**
   * LEGACY — non-live hydration / deep-link signal only. Current
   * `isPhaseRelevant` skips it; soft intent lives in `destinationIntent`.
   */
  | "destination"
  | "who"
  /** LEGACY non-live phase id/state — retained for hydration and other confirmation context (NOT folded into logistics). */
  | "occasion"
  /** LEGACY hydration alias — folded into `logistics`. */
  | "date"
  /** LEGACY hydration alias — folded into `logistics`. */
  | "pickup"
  /** LEGACY hydration alias — folded into `logistics`. */
  | "guests"
  | "interests"
  | "rhythm"
  /**
   * refinement — the adaptive Director beat. It repeats 0→N times based on
   * genuine uncertainty; there is no product cap of one question.
   */
  | "refinement"
  /**
   * logistics — ONE consolidated screen (date + pickup + party), pre-filled
   * from what was already inferred and editable. It runs AFTER Your Day
   * (reward before admin).
   */
  | "logistics"
  /** LEGACY non-live phase id/state — retained for hydration and other confirmation context (NOT folded into logistics). */
  | "considerations"
  /** LEGACY non-live phase id/state — retained for hydration and other confirmation context (NOT folded into logistics). */
  | "language"
  /** LEGACY hydration alias — no modern investment phase. */
  | "investment"
  /** LEGACY hydration alias — canonicalized to `storyboard`; the modern live map surface is the Living Canvas. */
  | "map"
  /**
   * storyboard — "Your Day": the unified editable canonical itinerary
   * surface, including its inline story/reveal chapter.
   */
  | "storyboard"
  /**
   * LEGACY hydration alias — canonicalized to `storyboard`. NOT a separate
   * live step; kept under the legacy `"confirmation"` string so saved
   * signatures and existing tests continue to hydrate without migration.
   */
  | "confirmation"
  | "guestDetails"
  /** checkoutSummary — compact recap + downloadable one-pager, before payment. */
  | "checkoutSummary";


/** Operational date mode (Phase 2): exact ISO date, flexible window, or undecided. */
export type DateMode = "exact" | "flexible" | "undecided";

/**
 * Soft destination intent — captured optionally between Feeling and Companions.
 * Pickup means "where the traveller is staying", which doesn't necessarily
 * equal "where they want the day to go". destinationIntent is an additive
 * scoring signal so a Lisbon-staying traveller can still steer the route
 * inland (Alentejo, Central, Spiritual coast) or south (Comporta/Tróia).
 * It never invents stops, never crosses routeCluster after the skeleton is
 * picked, and "no-preference" leaves prior behaviour essentially unchanged.
 */
export type DestinationIntent =
  | "no-preference"
  | "lisbon-sintra-cascais"
  | "arrabida-setubal-azeitao"
  | "alentejo-evora-wine"
  | "alentejo-roman-talha"
  | "vicentine-coast"
  | "comporta-troia"
  | "spiritual-coast"
  | "central-portugal"
  | "anywhere-special";

/* ---------- Phase 4: Adaptive Decision Layer ---------- */

/** Companions, normalised into a high-level traveller type. */
export type CompanionsType = "solo" | "couple" | "family" | "friends" | "corporate";

/** Derived intent of the journey — never stored, always recomputed from state. */
export type IntentType = "romantic" | "celebration" | "exploration" | "corporate" | "relaxation";

export type IntentLevel = "low" | "medium" | "high";

export interface IntentProfile {
  companionsType: CompanionsType;
  intentType: IntentType;
  intensity: IntentLevel;
  privacyLevel: IntentLevel;
}

/* ---------- Fit report (Phase 8: intent-to-journey fidelity) ----------
 *
 * A structured, deterministic explanation of how well a Signature tour
 * satisfies the guest's inputs. Produced by `scoreTourFit` in curation.ts
 * for every candidate and consumed by:
 *   - `pickPrimaryTour` (sorts by `totalScore`, filters on `hardConstraints`)
 *   - the "Why this journey" UI chips + one-sentence rationale
 *   - the debug overlay (?debug=1) — shows top-3 reports + filtered tours
 *
 * Never mutated after creation. All numbers are deterministic given the
 * same tour + intent inputs — no AI, no randomness. AI voice may rewrite
 * the guest-facing sentence downstream, but the *facts* live here.
 */
export interface FitReport {
  tourId: string;
  /** Weighted total, roughly 0–100. Higher = better fit. Negative when
   *  penalties dominate — such tours are still eligible unless a hard
   *  constraint failed (then they are filtered out entirely). */
  totalScore: number;
  hardConstraints: {
    /** True when the pickup + rhythm combination can realistically reach
     *  the tour's region (half-day capped at ~2h drive; full/immersive
     *  looser). Currently advisory only — reported but not filtered. */
    pickupReachable: boolean;
    /** True when the tour's `idealFor` copy is not exclusively coded for
     *  a different companion type (family-only vs couple, romantic-only
     *  vs corporate). */
    companionsAllowed: boolean;
    /** True when the tour's duration/pace is compatible with the guest's
     *  chosen rhythm. Advisory — never drops the last candidate. */
    rhythmFeasible: boolean;
  };
  coverage: {
    /** One entry per interest the guest asked for. `satisfied=true` means
     *  the tour's own content (title/theme/blurb/intro/stops) contains
     *  matching keywords. Guests never see this raw — it feeds the
     *  "Why this journey" copy and the debug overlay. */
    interests: Array<{
      interest: string;
      satisfied: boolean;
      /** Stop-intent coverage strength for this interest. "strong" = ≥2
       *  stops tagged with a matching intent, "partial" = 1, "none" = 0.
       *  Undefined when the guest interest has no stop-intent mapping. */
      strength?: "strong" | "partial" | "none";
      /** Stop labels that carry the intent. Feeds the "Why this journey"
       *  chip row + rationale copy. Never invented. */
      evidence?: string[];
    }>;
    /** Semantic match of the guest's feeling against tour content. */
    feeling: {
      match: "strong" | "partial" | "weak";
      hits: number;
    };
    /** Whether the destinationIntent boost table hits this tour. */
    destinationIntentAligned: boolean;
    /** Companions coherence — pass/warn/fail. */
    companions: "pass" | "warn" | "fail";
  };
  /** Human-readable penalty tags (e.g. "wine-asked-but-tour-has-no-wine",
   *  "family-coded-for-couple"). Consumed by the debug overlay. */
  penalties: string[];
  /** Human-readable boost tags (e.g. "wine-explicit", "tiles-culture-local-life",
   *  "pickup-adjacent"). Consumed by the debug overlay. */
  boosts: string[];
}

export interface StudioV3State {
  phase: StudioV3Phase;
  feeling: Feeling | null;
  companions: Companions | null;
  occasion: Occasion | null;
  /** Operational date mode. Null until the date phase is answered. */
  dateMode: DateMode | null;
  /** ISO yyyy-mm-dd when dateMode === "exact"; null otherwise. */
  dateExact: string | null;
  pickup: Pickup | null;
  /**
   * Total headcount (adults + minorAges.length), 1–14. Kept as source-of-truth
   * for tier lookup (owner-approved: tier uses total headcount, incl. infants),
   * vehicle sizing and legacy code paths. Derived from `adults` + `minorAges`
   * whenever composition is set. Null until resolved (explicit or inferred).
   */
  guests: number | null;
  /**
   * Adult count (18+). When set with `minorAges`, enables server-side age-band
   * pricing. When null, checkout falls back to legacy adults-only pricing
   * where `guests` is treated as adults.
   */
  adults: number | null;
  /**
   * Ordered ages (0–17) for every minor traveller. Empty when adults-only.
   * Each age is priced with its band % (18+ adult 100 / 11–17 youth 75 /
   * 3–10 child 50 / 0–2 infant free) — no silent adult fallback.
   */
  minorAges: number[];
  interests: Interest[];
  rhythm: Rhythm | null;
  /**
   * Additive signal, NOT a traveller-facing UI choice: no modern Studio
   * surface writes it. Explicit day-length class, independent of `rhythm`
   * (rhythm is pace/depth). Null means "not chosen" — the budget resolver
   * then falls back to Signature skeleton truth and finally to the neutral
   * one-day default.
   */
  experienceDurationClass: TravellerDurationClass | null;
  /**
   * LEGACY hydration field: the single adaptive answer written by the old
   * one-question refinement step. The live Director records answers in
   * `questionHistory`; this stays read-only for old drafts.
   */
  refinement: AdaptiveRefinementId | null;

  /**
   * BUILD 2 / Pass 4 — CANONICAL live answer store for the Studio question
   * flow. `refinement` above stays only as a read-only legacy contract field
   * (old drafts, Living Atlas decision input); this array is the one place
   * new question answers are recorded. Not persisted: restored drafts hydrate
   * it back from `refinement` exactly once.
   */
  questionHistory: QuestionAnswerEvent[];
  considerations: Consideration[];
  language: Language | null;
  investment: InvestmentTier | null;
  /** Resolved Signature tour id once Phase 4 (map) completes. */
  tourId: string | null;
  /** Deterministic editorial title composed once map → storyboard. */
  journeyTitle: string | null;
  /** True when `guests` was inferred from companions/occasion (the guests phase was skipped). */
  guestsInferred: boolean;
  /** True when guests >= 11 — the day is then shaped as a private event. */
  guestsPrivateEvent: boolean;
  /** Optional first name from the opening intro. Null when user skips. */
  firstName: string | null;
  /**
   * User-edited route points from the final reveal (Phase 7B inline editor).
   * Null when the user hasn't touched the route — the resolved route from
   * `resolveStudioV3Route` is used as-is. When non-null, this overrides the
   * displayed route in the reveal. Only labels/stories from the resolved
   * Signature tour's own `stops` may appear here (no invented stops).
   *
   * NORTH-STAR CLOSURE: an authored point also carries the STRUCTURAL
   * identity (`inventoryStopId` / `blueprintStopId`) and the stable media
   * identity (`image` / `focal`) of the moment it came from, so an edit can
   * never degrade the day to labels only. Both are optional for backward
   * hydration of saved sessions written before this contract existed.
   */
  editedRoutePoints: Array<AuthoredRoutePoint> | null;
  /**
   * PASS 4 — FREEZE THE SHOWN DAY. The exact ordered route resolved ONCE on
   * the first canonical `storyboard` entry. It is NOT a manual edit: it is
   * the day the traveller was actually shown, so logistics, guest details and
   * checkout can never silently recompose a different itinerary. Cleared only
   * when the traveller goes BACK into the taste/Director phases to reshape
   * their answers. Null for drafts saved before this contract existed.
   */
  committedRoutePoints: Array<AuthoredRoutePoint> | null;

  /**
   * Soft destination intent (Phase: between Feeling and Companions).
   * Default "no-preference" keeps prior pickup-driven behaviour unchanged.
   * Used additively in curation scoring to overcome Lisbon pickup bias
   * when the user clearly steers inland/central/spiritual/Comporta.
   */
  destinationIntent: DestinationIntent;
  /**
   * LEGACY hydration field. The modern intro no longer exposes a "quick
   * version" action — every new session enters the single canonical guided
   * Studio, so this is always "guided" for new drafts. The `"fast"` member
   * remains only so older saved states hydrate without a migration.
   */
  pathMode: "guided" | "fast";

  /**
   * How many times the traveller has tapped "Reshape this day" on the map
   * reveal. Starts at 0 (deterministic first render — preserves the
   * existing curation contract and test snapshots). Each bump seeds the
   * curator so the same answers can yield a different — still coherent —
   * route: a different equally-good Signature when several fit, plus
   * gentle stop-score jitter that re-orders moments without breaking
   * caps or the no-invention rule.
   */
  rerollCount: number;
  /**
   * guestDraft — persisted Guest Details form values so back-nav from
   * checkoutSummary/finalReveal preserves what the traveller already typed.
   * Null until the guestDetails phase captures anything.
   */
  /**
   * Dimensions the traveller explicitly handed to the curator via
   * "Let YES decide". Never means "missing" — the value in state is real
   * and inferred deterministically (see `letYesDecide.ts`). Used to label
   * the choice honestly in the UI and to keep the reveal explainable.
   */
  decidedForMe: Array<"feeling" | "interests" | "rhythm">;
  /**
   * P10 — premium delegation mode. Set to "yes-designs" when the traveller
   * hands the remaining TASTE layer (interests + rhythm, and the optional
   * adaptive refinement) to YES after answering Feeling and Who themselves.
   * Operational facts are never delegated. Null (default) = the traveller is
   * answering every taste question personally, exactly as before, so older
   * saved sessions hydrate unchanged.
   */
  delegationMode: "yes-designs" | null;

  guestDraft: {
    fullName?: string;
    email?: string;
    phone?: string;
    pickupAddress?: string;
    guideNotes?: string;
  } | null;
}

export const INITIAL_STATE: StudioV3State = {
  phase: "intro",
  feeling: null,
  companions: null,
  occasion: null,
  dateMode: null,
  dateExact: null,
  pickup: null,
  guests: null,
  adults: null,
  minorAges: [],
  interests: [],
  rhythm: null,
  experienceDurationClass: null,
  refinement: null,
  questionHistory: [],
  considerations: [],
  language: null,
  investment: null,
  tourId: null,
  journeyTitle: null,
  guestsInferred: false,
  guestsPrivateEvent: false,
  firstName: null,
  editedRoutePoints: null,
  committedRoutePoints: null,
  destinationIntent: "no-preference",
  pathMode: "guided",
  rerollCount: 0,
  decidedForMe: [],
  delegationMode: null,

  guestDraft: null,
};

export interface ChoiceOption<T extends string> {
  id: T;
  label: string;
  whisper: string; // one-line atmospheric subtitle, sentence case
}

export const FEELINGS: ChoiceOption<Feeling>[] = [
  { id: "coastal", label: "Coastal escape", whisper: "Atlantic light, salt on the wind." },
  { id: "wine-food", label: "Wine & food", whisper: "Long tables, slow afternoons." },
  { id: "hidden", label: "Hidden Portugal", whisper: "Quiet roads, unwritten places." },
  { id: "romance", label: "Romance", whisper: "Stolen views, the two of you." },
  { id: "culture", label: "Culture & heritage", whisper: "Stones, stories, centuries." },
  { id: "adventure", label: "Adventure", whisper: "Cliffs, currents, open horizons." },
  { id: "slow-luxury", label: "Slow luxury", whisper: "Few stops, deeply lived." },
  { id: "faith", label: "Faith & reflection", whisper: "Fátima, sanctuaries, space to pause." },
  {
    id: "hands-on",
    label: "Hands-on traditions",
    whisper: "Paint a tile, make cheese, learn by doing.",
  },
];

export const COMPANIONS: ChoiceOption<Companions>[] = [
  { id: "solo", label: "Solo", whisper: "Just you, and Portugal." },
  { id: "couple", label: "Couple", whisper: "Two of you, one rhythm." },
  { id: "family", label: "Family", whisper: "All ages, gently held." },
  { id: "friends", label: "Friends", whisper: "Shared table, shared sky." },
  { id: "celebration", label: "Celebration", whisper: "A day that earns the memory." },
  { id: "proposal", label: "Proposal", whisper: "One moment, perfectly staged." },
  { id: "corporate", label: "Corporate", whisper: "Considered, private, elegant." },
];

export const RHYTHMS: ChoiceOption<Rhythm>[] = [
  // Pace and depth only — rhythm never promises a number of stops.
  { id: "slow", label: "Slow", whisper: "Fewer transitions. More time inside each moment." },
  { id: "balanced", label: "Balanced", whisper: "Depth and variety, with room to breathe." },
  { id: "full", label: "Full", whisper: "A richer day, with more movement and discovery." },
  { id: "immersive", label: "Immersive", whisper: "Go deep. Let the day unfold fully." },
];


export const OCCASIONS: ChoiceOption<Occasion>[] = [
  { id: "none", label: "Just because", whisper: "No reason needed." },
  { id: "proposal", label: "Proposal", whisper: "One question, beautifully framed." },
  { id: "anniversary", label: "Anniversary", whisper: "A year worth marking." },
  { id: "birthday", label: "Birthday", whisper: "A day that earns the candles." },
  { id: "honeymoon", label: "Honeymoon", whisper: "First days, slowly lived." },
  { id: "family-day", label: "Family day", whisper: "Everyone, gently together." },
  { id: "corporate", label: "Corporate", whisper: "Considered, private, elegant." },
  { id: "celebration", label: "Celebration", whisper: "Something worth raising a glass to." },
];

export const DATE_WINDOWS: ChoiceOption<DateWindow>[] = [
  { id: "exact", label: "I have an exact date", whisper: "We'll confirm it together." },
  { id: "this-week", label: "This week", whisper: "Soon, while the light is right." },
  { id: "next-2-weeks", label: "Next two weeks", whisper: "Time enough to plan it well." },
  { id: "this-month", label: "This month", whisper: "Somewhere in the next few weeks." },
  { id: "flexible", label: "Flexible", whisper: "Pick the day the weather agrees." },
  { id: "exploring", label: "Still exploring", whisper: "No rush — let the idea settle." },
];

export const PICKUPS: ChoiceOption<Pickup>[] = [
  { id: "lisbon", label: "Lisbon", whisper: "From your hotel or address." },
  { id: "lisbon-airport", label: "Lisbon airport", whisper: "Arrive, breathe, begin." },
  { id: "lisbon-cruise", label: "Lisbon cruise terminal", whisper: "Step off, into the day." },
  { id: "cascais-estoril", label: "Cascais / Estoril", whisper: "The Atlantic edge." },
  { id: "sintra", label: "Sintra", whisper: "Among the palaces and pine." },
  {
    id: "sesimbra-setubal-arrabida",
    label: "Sesimbra / Setúbal / Arrábida",
    whisper: "South of the river.",
  },
  { id: "comporta-troia", label: "Comporta / Tróia", whisper: "By request." },
  { id: "other", label: "Other / I'll tell you later", whisper: "We'll work it out together." },
];

export const GUEST_BUCKETS: ChoiceOption<GuestBucket>[] = [
  { id: "1", label: "Just me", whisper: "One quiet seat." },
  { id: "2", label: "Two", whisper: "The pair of you." },
  { id: "3-4", label: "Three or four", whisper: "A small, close circle." },
  { id: "5-6", label: "Five or six", whisper: "A gathered table." },
  { id: "7-10", label: "Seven to ten", whisper: "A larger group, still intimate." },
  { id: "11+", label: "Eleven or more", whisper: "We'll plan it as a private event." },
];

export const INTERESTS: ChoiceOption<Interest>[] = [
  { id: "wine", label: "Wine", whisper: "Cellars, glasses, slow tastings." },
  { id: "gastronomy", label: "Gastronomy", whisper: "Long lunches, real cooking." },
  { id: "nature", label: "Nature", whisper: "Trails, hills, open sky." },
  { id: "coast", label: "Coast", whisper: "Cliffs, coves, salt air." },
  { id: "heritage", label: "Heritage", whisper: "Stones, stories, centuries." },
  { id: "photography", label: "Photography", whisper: "Light worth chasing." },
  { id: "wellness", label: "Wellness", whisper: "Quiet body, quiet mind." },
  { id: "local-life", label: "Local life", whisper: "Markets, makers, neighbours." },
  { id: "faith", label: "Faith & reflection", whisper: "Sanctuaries, pilgrimage, quiet time." },
  { id: "hands-on", label: "Workshops", whisper: "Tiles, cheese, craft with local hands." },
];

export const CONSIDERATIONS: ChoiceOption<Consideration>[] = [
  { id: "none", label: "Nothing to mention", whisper: "All good — let's go." },
  { id: "vegetarian", label: "Vegetarian", whisper: "Vegetables, beautifully done." },
  { id: "vegan", label: "Vegan", whisper: "Fully plant-based menus." },
  { id: "gluten-free", label: "Gluten-free", whisper: "Bread and pasta adapted." },
  { id: "allergies", label: "Allergies", whisper: "We'll confirm the details with you." },
  { id: "reduced-mobility", label: "Reduced mobility", whisper: "We'll choose easy ground." },
  { id: "child-seats", label: "Child seats", whisper: "We'll bring what's needed." },
  { id: "avoid-long-walks", label: "Avoid long walks", whisper: "Shorter strolls, more stops." },
  { id: "quiet-pace", label: "Quiet pace", whisper: "Fewer transitions, more dwelling." },
];

export const LANGUAGES: ChoiceOption<Language>[] = [
  { id: "en", label: "English", whisper: "Hosted in English." },
  { id: "pt", label: "Portuguese", whisper: "Hosted in Portuguese." },
  { id: "es", label: "Spanish", whisper: "Hosted in Spanish." },
];

export const INVESTMENT_TIERS: ChoiceOption<InvestmentTier>[] = [
  {
    id: "considered",
    label: "Considered",
    whisper: "Beautifully private, without unnecessary extras.",
  },
  {
    id: "elevated",
    label: "Elevated",
    whisper: "More curated moments, stronger tastings and smoother pacing.",
  },
  {
    id: "bespoke",
    label: "Bespoke",
    whisper: "Premium details, private access and a more distinctive day.",
  },
  {
    id: "open",
    label: "Open to guidance",
    whisper: "Let YES shape the best fit around your choices.",
  },
];

export const DESTINATION_INTENTS: ChoiceOption<DestinationIntent>[] = [
  {
    id: "no-preference",
    label: "No preference — let YES shape it",
    whisper: "We'll let your other choices lead.",
  },
  {
    id: "lisbon-sintra-cascais",
    label: "Lisbon coast, Sintra & Cascais",
    whisper: "Palaces, pine and the Atlantic edge.",
  },
  {
    id: "arrabida-setubal-azeitao",
    label: "Arrábida, Setúbal & Azeitão",
    whisper: "Wine, coves and quiet cellars.",
  },
  {
    id: "alentejo-evora-wine",
    label: "Alentejo, Évora & wine country",
    whisper: "Long lunches, open plains.",
  },
  {
    id: "alentejo-roman-talha",
    label: "Roman heritage & talha wine (Alentejo)",
    whisper: "2,000-year-old wine tradition in a family cellar — Vila de Frades.",
  },
  {
    id: "vicentine-coast",
    label: "Southwest Vicentine coast (Alentejo & Algarve)",
    whisper: "Wild cliffs, hidden coves, Atlantic light — one of Portugal's most untouched shores.",
  },
  {
    id: "spiritual-coast",
    label: "Fátima, Nazaré, Óbidos & the spiritual coast",
    whisper: "Sanctuaries, cliffs and walled towns.",
  },
  {
    id: "central-portugal",
    label: "Tomar, Coimbra & Central Portugal",
    whisper: "Templar stones, scholarly streets.",
  },
  { id: "comporta-troia", label: "Comporta & Tróia", whisper: "Pine, rice fields and white sand." },
  {
    id: "anywhere-special",
    label: "I'm open to anywhere special",
    whisper: "Surprise me — go where it's most special.",
  },
];

/**
 * NORTH-STAR CLOSURE — one authored moment of the traveller's day.
 *
 * `label` / `story` are presentation. `inventoryStopId` / `blueprintStopId`
 * are the STRUCTURAL identity that commercial truth is resolved from, and
 * `image` / `focal` are the stable media identity so the same moment shows
 * the same verified photograph in the canvas and in Your Day.
 *
 * Every field beyond `label` / `story` is optional: sessions saved before
 * this contract hydrate unchanged and simply resolve identity by scoped label.
 */
export interface AuthoredRoutePoint {
  label: string;
  story: string;
  inventoryStopId?: string | null;
  blueprintStopId?: string | null;
  image?: string | null;
  focal?: string | null;
  /** Operational geography known upstream. Never invented downstream. */
  lat?: number | null;
  lng?: number | null;
  /**
   * Structural dwell minutes, ONLY when the source already owns them.
   * Never inferred from a label and never invented downstream.
   */
  durationMinutes?: number | null;
  /** Provenance of `durationMinutes`. Only authoritative sources certify. */
  durationSource?: import("@/lib/studio-v3/timeDomain").DwellSource | null;
}
