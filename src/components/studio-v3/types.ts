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

export type StudioV3Phase =
  | "feeling"
  | "who"
  | "rhythm"
  | "map"
  | "storyboard"; // placeholder for upcoming Phase 5+

export interface StudioV3State {
  phase: StudioV3Phase;
  feeling: Feeling | null;
  companions: Companions | null;
  rhythm: Rhythm | null;
  /** Resolved Signature tour id once Phase 4 completes. */
  tourId: string | null;
}


export const INITIAL_STATE: StudioV3State = {
  phase: "feeling",
  feeling: null,
  companions: null,
  rhythm: null,
  tourId: null,
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
