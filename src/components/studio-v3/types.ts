// Studio V3 — Cinematic Journey Composer
// Shared types for the phased journey state.

export type Feeling =
  | "coastal"
  | "wine-food"
  | "hidden"
  | "romance"
  | "family"
  | "culture"
  | "adventure"
  | "slow-luxury";

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

export type Interest =
  | "wine"
  | "gastronomy"
  | "nature"
  | "coast"
  | "heritage"
  | "photography"
  | "wellness"
  | "local-life";

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

export type Language = "en" | "pt" | "es" | "fr" | "other";

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
  | "considerations"
  | "language"
  | "investment"
  | "map"
  | "storyboard";

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
  | "spiritual-coast"
  | "central-portugal"
  | "comporta-troia"
  | "anywhere-special";

/* ---------- Phase 4: Adaptive Decision Layer ---------- */

/** Companions, normalised into a high-level traveller type. */
export type CompanionsType = "solo" | "couple" | "family" | "friends" | "corporate";

/** Derived intent of the journey — never stored, always recomputed from state. */
export type IntentType =
  | "romantic"
  | "celebration"
  | "exploration"
  | "corporate"
  | "relaxation";

export type IntentLevel = "low" | "medium" | "high";

export interface IntentProfile {
  companionsType: CompanionsType;
  intentType: IntentType;
  intensity: IntentLevel;
  privacyLevel: IntentLevel;
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
  /** Exact guest count (1–14). Null until resolved (explicit or inferred). */
  guests: number | null;
  interests: Interest[];
  rhythm: Rhythm | null;
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
  interests: [],
  rhythm: null,
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
  { id: "family", label: "Family time", whisper: "Easy days, real laughter." },
  { id: "culture", label: "Culture & heritage", whisper: "Stones, stories, centuries." },
  { id: "adventure", label: "Adventure", whisper: "Cliffs, currents, open horizons." },
  { id: "slow-luxury", label: "Slow luxury", whisper: "Few stops, deeply lived." },
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
  { id: "sesimbra-setubal-arrabida", label: "Sesimbra / Setúbal / Arrábida", whisper: "South of the river." },
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
  { id: "fr", label: "French", whisper: "Hosted in French." },
  { id: "other", label: "Other", whisper: "Tell us — we'll do our best." },
];

export const INVESTMENT_TIERS: ChoiceOption<InvestmentTier>[] = [
  { id: "considered", label: "Considered", whisper: "Beautifully private, without unnecessary extras." },
  { id: "elevated", label: "Elevated", whisper: "More curated moments, stronger tastings and smoother pacing." },
  { id: "bespoke", label: "Bespoke", whisper: "Premium details, private access and a more distinctive day." },
  { id: "open", label: "Open to guidance", whisper: "Let YES shape the best fit around your choices." },
];
