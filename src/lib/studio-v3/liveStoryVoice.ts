export interface LiveStoryProfile {
  firstName?: string | null;
  feeling?: string | null;
  companions?: string | null;
  occasion?: string | null;
  pickup?: string | null;
  destinationIntent?: string | null;
  interests?: readonly string[];
  rhythm?: string | null;
}

const FEELING_READ: Readonly<Record<string, string>> = {
  "wine-food": "The table gives this day its centre",
  coastal: "The Atlantic keeps pulling this day outward",
  hidden: "The quieter roads matter more than the obvious ones",
  romance: "This should feel intimate rather than staged",
  culture: "Old stories give this day its depth",
  adventure: "Open air gives this day its energy",
  "slow-luxury": "Restraint is doing the work here",
  faith: "Stillness matters more than distance",
  "hands-on": "Making something matters more than simply seeing it",
};

const COMPANY_READ: Readonly<Record<string, string>> = {
  solo: "built around one person's attention",
  couple: "with space for the two of you",
  family: "easy enough for a family moving at different speeds",
  friends: "made for conversation as much as discovery",
  celebration: "with the gathering at its centre",
  proposal: "quiet enough for one moment to matter",
  corporate: "with room for the group to connect",
};

const RHYTHM_READ: Readonly<Record<string, string>> = {
  slow: "with enough room to linger",
  balanced: "with movement and pause kept in balance",
  full: "with more discovery, but no checklist feeling",
  immersive: "with a fuller arc that still feels held",
};

const INTEREST_READ: Readonly<Record<string, string>> = {
  wine: "wine allowed to linger",
  gastronomy: "the table given proper time",
  nature: "green ground and open sky",
  coast: "the shoreline never far away",
  heritage: "old stone carrying part of the story",
  photography: "pauses for the light",
  wellness: "quiet space between moments",
  "local-life": "room for lived-in Portugal",
  faith: "room to reflect",
  "hands-on": "something made by hand",
};

const FEELING_OWNS_INTEREST: Readonly<Partial<Record<string, string>>> = {
  "wine-food": "wine",
  coastal: "coast",
  faith: "faith",
  "hands-on": "hands-on",
  hidden: "local-life",
};

function sentenceCase(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function firstDistinctInterest(profile: LiveStoryProfile): string | null {
  const owned = profile.feeling ? FEELING_OWNS_INTEREST[profile.feeling] : undefined;
  for (const id of profile.interests ?? []) {
    if (id === owned) continue;
    if (INTEREST_READ[id]) return id;
  }
  return null;
}

/**
 * Presentation-only fallback for the Living Journey story. It combines
 * independent profile signals instead of reading the traveller's selections
 * back as labels. It never names stops, suppliers, prices, regions or timings.
 */
export function deterministicLiveStoryFallback(profile: LiveStoryProfile): string {
  const feeling = profile.feeling ? FEELING_READ[profile.feeling] : null;
  const company = profile.companions ? COMPANY_READ[profile.companions] : null;
  const rhythm = profile.rhythm ? RHYTHM_READ[profile.rhythm] : null;
  const distinctInterest = firstDistinctInterest(profile);
  const interest = distinctInterest ? INTEREST_READ[distinctInterest] : null;
  const name = profile.firstName?.trim() || null;

  const sentences: string[] = [];

  if (feeling) {
    const lead = name ? `${name}, ${lowerFirst(feeling)}` : feeling;
    const secondary = interest ? `, with ${interest}` : "";
    sentences.push(`${lead}${secondary}.`);
  } else if (interest) {
    const lead = `${sentenceCase(interest)} is starting to give the day its character`;
    sentences.push(`${name ? `${name}, ${lowerFirst(lead)}` : lead}.`);
  }

  const humanParts = [company, rhythm].filter((part): part is string => Boolean(part));
  if (humanParts.length > 0) {
    sentences.push(`${sentenceCase(humanParts.join(" and "))}.`);
  }

  if (sentences.length === 0) {
    return name
      ? `${name}, a private Portugal is beginning to take shape around what matters to you.`
      : "A private Portugal is beginning to take shape around what matters to you.";
  }

  return sanitizeLiveStory(sentences.slice(0, 2).join(" "));
}

const RAW_TAXONOMY_TOKEN =
  /\b(wine-food|slow-luxury|local-life|no-preference|anywhere-special|lisbon-city)\b/i;

/** Final presentation guard for model and fallback output. */
export function sanitizeLiveStory(text: string): string {
  let value = text.trim();
  value = value.replace(/^["“'']+|["”'']+$/g, "").trim();
  value = value.replace(/\s+/g, " ");
  value = value.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
  value = value.replace(/!/g, ".");
  value = value.replace(/\b(best|ultimate|world-class|amazing|perfect|incredible|stunning)\b/gi, "quiet");
  if (value.length > 220) value = `${value.slice(0, 217).replace(/\s+\S*$/, "")}…`;
  return value;
}

export function containsRawStudioTaxonomy(text: string): boolean {
  return RAW_TAXONOMY_TOKEN.test(text);
}
