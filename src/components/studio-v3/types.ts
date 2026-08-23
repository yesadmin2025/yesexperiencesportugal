// Studio V3 — Cinematic Journey Composer
// Shared types for the phased journey state.

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
 * Adaptive refinement answers. One conditional question is asked (at most)
 * after the rhythm step, and only when the traveller's own answers make it
 * relevant — see `adaptiveQuestions.ts`. Each id maps either to a real
 * discovery signal in the catalogue or to nothing at all.
 */
export type AdaptiveRefinementId =
  | "coast-from-the-water"
  | "coast-wild-beaches"
  | "coast-clifftop-views"
  | "wine-cellar-depth"
  | "wine-table-and-cheese"
  | "wine-vineyard-views"
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

export type StudioV3Phase =
  | "intro"
  | "feeling"
  | "destination"
  | "who"
  | "occasion"
  | "date"
  | "pickup"
  | "guests"
  | "interests"
  | "rhythm"
  /** refinement — at most one adaptive question, skipped when irrelevant. */
  | "refinement"
  /**
   * logistics — Studio reform (2026-08). ONE consolidated screen that asks
   * for date + pickup + party in a single beat, with everything already
   * inferred pre-filled and editable. Replaces the three separate
   * date/pickup/guests questions (those ids stay in the union so saved
   * states, deep links and older tests still hydrate).
   */
  | "logistics"
  | "considerations"
  | "language"
  | "investment"
  | "map"
  | "storyboard"
  /**
   * finalReveal — cinematic editorial presentation of the day the traveller
   * just refined (kept under the legacy `"confirmation"` string so saved
   * signatures and existing tests continue to hydrate without migration).
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
   * Answer to the adaptive refinement question, when one was relevant.
   * Null when the question was skipped or not yet answered.
   */
  refinement: AdaptiveRefinementId | null;
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
   */
  editedRoutePoints: Array<{ label: string; story: string }> | null;
  /**
   * Soft destination intent (Phase: between Feeling and Companions).
   * Default "no-preference" keeps prior pickup-driven behaviour unchanged.
   * Used additively in curation scoring to overcome Lisbon pickup bias
   * when the user clearly steers inland/central/spiritual/Comporta.
   */
  destinationIntent: DestinationIntent;
  /**
   * Path mode chosen on the intro. "guided" runs the full Studio with every
   * optional phase; "fast" skips occasion, date, considerations, language
   * and investment so the traveller reaches the Signature reveal sooner.
   * Defaults to "guided" to preserve prior behaviour.
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
  refinement: null,
  considerations: [],
  language: null,
  investment: null,
  tourId: null,
  journeyTitle: null,
  guestsInferred: false,
  guestsPrivateEvent: false,
  firstName: null,
  editedRoutePoints: null,
  destinationIntent: "no-preference",
  pathMode: "guided",
  rerollCount: 0,
  decidedForMe: [],
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
  { id: "slow", label: "Slow", whisper: "Three stops. Long pauses." },
  { id: "balanced", label: "Balanced", whisper: "Four stops. Room to breathe." },
  { id: "full", label: "Full", whisper: "Five stops. Rich and varied." },
  { id: "immersive", label: "Immersive", whisper: "Dawn to candlelight." },
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
