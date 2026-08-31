/**
 * BUILD 2 — Pass 4 correction. DETERMINISTIC PRESENTATION ONLY.
 *
 * The live Director decides IF a question exists, WHICH question it is and
 * the EXACT ordered options. This module only puts human words on that
 * decision. It never chooses, filters, reorders or invents an option.
 *
 * Fail-closed: a question or option with no safe presentation mapping is not
 * rendered at all — a machine key is never shown to a traveller. Tradeoff
 * copy is deliberately generic: no supplier, price, stop or clock time.
 *
 * Not AI. Pass 6 may replace the wording; it may never replace the decision.
 */

import type { ChoiceOption } from "@/components/studio-v3/types";
import type { DirectorChoice } from "@/lib/studio-v3/questionOptionCatalog";
import type { StudioQuestionDecision } from "@/lib/studio-v3/studioQuestionDirector";

export type DirectorQuestionPresentation = {
  questionKey: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  hint: string;
  /** EXACTLY the Director's ordered choices, keyed by `choiceKey`. */
  options: ChoiceOption<string>[];
  /** The same ordered choice keys, for the canonical history event. */
  offeredOptionIds: string[];
};

type QuestionCopy = { eyebrow: string; title: string; titleAccent: string; hint?: string };

const QUESTION_COPY: Readonly<Record<string, QuestionCopy>> = {
  "question:faith-direction": {
    eyebrow: "Quiet ground",
    title: "You chose a more reflective day.",
    titleAccent: "Which thread matters more?",
  },
  "question:coast-geography": {
    eyebrow: "The Atlantic",
    title: "How should the coast",
    titleAccent: "reach you?",
  },
  "question:arrabida-coast-day": {
    eyebrow: "The Atlantic",
    title: "How should the coast",
    titleAccent: "reach you?",
  },
  "question:estuary-vs-wild-coast": {
    eyebrow: "Water and land",
    title: "Which quieter Portugal",
    titleAccent: "should the day follow?",
  },
  "question:wine-day-depth": {
    eyebrow: "The table",
    title: "What should the wine",
    titleAccent: "be about?",
  },
  "question:alentejo-wine-direction": {
    eyebrow: "The table",
    title: "Which Alentejo",
    titleAccent: "should the day belong to?",
  },
  "question:hands-on-craft": {
    eyebrow: "By hand",
    title: "Which craft would you rather",
    titleAccent: "get your hands into?",
  },
  "question:heritage-lens": {
    eyebrow: "The past",
    title: "Which side of the heritage",
    titleAccent: "should lead?",
  },
  "question:time-tradeoff": {
    eyebrow: "The day's shape",
    title: "One day cannot hold everything.",
    titleAccent: "How should we hold it?",
    hint: "Nothing is added or removed until you choose.",
  },
};

/** Traveller-safe copy for every catalogued option id. Never a machine key. */
const OPTION_COPY: Readonly<Record<string, { label: string; whisper: string }>> = {
  "coast-from-the-water": {
    label: "From the water",
    whisper: "Coastal caves and cliffs seen from the sea.",
  },
  "coast-wild-beaches": {
    label: "On a wild beach",
    whisper: "Sand, open space and time to slow down.",
  },
  "coast-clifftop-views": {
    label: "From above",
    whisper: "Atlantic viewpoints with your feet on solid ground.",
  },
  "coast-remote-southwest": {
    label: "Far from everything",
    whisper: "The wild southwest: river mouths, villages and open Atlantic.",
  },
  "wine-cellar-depth": {
    label: "Inside the cellar",
    whisper: "The people, the process and how the wine is made.",
  },
  "wine-table-and-cheese": {
    label: "Around the table",
    whisper: "Cheese, bread and regional produce, unhurried.",
  },
  "wine-vineyard-views": {
    label: "Out among the vines",
    whisper: "The landscape first, with the tasting woven around it.",
  },
  "wine-monumental-estates": {
    label: "Évora and its estates",
    whisper: "A monumental town and the classic houses of Alentejo wine.",
  },
  "wine-clay-talha": {
    label: "Clay talhas, one family",
    whisper: "Roman roots, amphora wine and a cellar still run by hand.",
  },
  "hands-paint-tile": {
    label: "Paint an azulejo",
    whisper: "Explore the tradition with a local maker.",
  },
  "hands-make-cheese": {
    label: "Make Azeitão cheese",
    whisper: "Take part in the process with local producers.",
  },
  "hands-just-watch": {
    label: "No workshop — I'd rather observe",
    whisper: "No workshop is added to your day.",
  },
  "local-market-morning": {
    label: "A market morning",
    whisper: "Food, conversation and the rhythm of a working town.",
  },
  "local-artisans": {
    label: "Artisans at work",
    whisper: "A closer look at craft traditions still practised locally.",
  },
  "local-river-and-rice": {
    label: "Rice fields and river villages",
    whisper: "Water, open landscapes and low white houses.",
  },
  "faith-sanctuary-time": {
    label: "Sanctuary time",
    whisper: "Unhurried time where people come to pray.",
  },
  "faith-templar-heritage": {
    label: "Sacred heritage",
    whisper: "Centuries of stone, orders and scholarship.",
  },
  "faith-quiet-reflection": {
    label: "Keep it simply quiet",
    whisper: "No religious stop or programme — just space to reflect.",
  },
  "photo-golden-hour": {
    label: "The best light",
    whisper: "We pace the day around golden hour.",
  },
  "photo-landmarks": {
    label: "The landmarks",
    whisper: "Palaces and the Atlantic, properly framed.",
  },
  "photo-no-preference": {
    label: "No preference",
    whisper: "Keep the day as it is — the light will come.",
  },
  // Generic, factual tradeoff copy. No invented facts, times or suppliers.
  "time-extend-duration": {
    label: "Give the day more room",
    whisper: "A longer day, so nothing has to be cut short.",
  },
  "time-swap-moment": {
    label: "Trade one moment for another",
    whisper: "Keep the day's length and change what it holds.",
  },
  "time-choose-between-anchors": {
    label: "Choose which anchor stays",
    whisper: "Two highlights cannot both breathe in one day.",
  },
};

export function directorOptionCopy(id: string): { label: string; whisper: string } | null {
  return OPTION_COPY[id] ?? null;
}

function toChoiceOption(choice: DirectorChoice): ChoiceOption<string> | null {
  const copy = OPTION_COPY[choice.id];
  if (!copy) return null;
  return { id: choice.choiceKey, label: copy.label, whisper: copy.whisper };
}

/**
 * Present the Director's decision verbatim, or nothing at all.
 * Order is preserved exactly; no option is dropped in isolation.
 */
export function presentDirectorQuestion(
  decision: StudioQuestionDecision,
): DirectorQuestionPresentation | null {
  if (!decision.shouldAsk || !decision.questionKey || !decision.options) return null;
  const copy = QUESTION_COPY[decision.questionKey];
  if (!copy) return null;

  const options: ChoiceOption<string>[] = [];
  for (const choice of decision.options) {
    const option = toChoiceOption(choice);
    // Fail closed at question level: a partially presentable question is not
    // the question the Director decided, so it is not shown at all.
    if (!option) return null;
    options.push(option);
  }
  if (options.length < 2) return null;

  return {
    questionKey: decision.questionKey,
    eyebrow: copy.eyebrow,
    title: copy.title,
    titleAccent: copy.titleAccent,
    hint: copy.hint ?? "",
    options,
    offeredOptionIds: options.map((option) => option.id),
  };
}
