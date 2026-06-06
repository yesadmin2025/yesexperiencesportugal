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
  | "feeling"
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

export interface StudioV3State {
  phase: StudioV3Phase;
  feeling: Feeling | null;
  companions: Companions | null;
  occasion: Occasion | null;
  dateWindow: DateWindow | null;
  pickup: Pickup | null;
  guests: GuestBucket | null;
  interests: Interest[];
  rhythm: Rhythm | null;
  considerations: Consideration[];
  language: Language | null;
  investment: InvestmentTier | null;
  /** Resolved Signature tour id once Phase 4 (map) completes. */
  tourId: string | null;
  /** Deterministic editorial title composed once map → storyboard. */
  journeyTitle: string | null;
}


export const INITIAL_STATE: StudioV3State = {
  phase: "feeling",
  feeling: null,
  companions: null,
  occasion: null,
  dateWindow: null,
  pickup: null,
  guests: null,
  interests: [],
  rhythm: null,
  considerations: [],
  language: null,
  investment: null,
  tourId: null,
  journeyTitle: null,
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
