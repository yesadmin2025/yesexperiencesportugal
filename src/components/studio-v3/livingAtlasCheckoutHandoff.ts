import {
  livingAtlasPreviewDayTitle,
  type LivingAtlasPreviewPreferences,
} from "@/components/studio-v3/livingAtlasPreviewComposition";
import type { LivingAtlasRoutePlan } from "@/components/studio-v3/livingAtlasRoutePlanner";
import {
  livingAtlasMomentDisclosure,
  livingAtlasPublicMomentLabel,
} from "@/components/studio-v3/livingAtlasPublicCopy";
import type {
  ExperienceDimensionId,
  ExperienceProfile,
  LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  INITIAL_STATE,
  type DestinationIntent,
  type Interest,
  type Rhythm,
  type StudioV3State,
} from "@/components/studio-v3/types";

export type LivingAtlasCheckoutMoment = {
  stopId: string;
  label: string;
  durationMinutes: number;
  note: string | null;
};

export type LivingAtlasCheckoutHandoff = {
  signatureId: LivingAtlasSignatureId;
  selectedDate: string;
  journeyTitle: string;
  stopIds: string[];
  stopLabels: string[];
  itinerary: LivingAtlasCheckoutMoment[];
  durationMinutes: number;
  studioState: StudioV3State;
};

const SIGNATURE_DESTINATION: Readonly<Record<LivingAtlasSignatureId, DestinationIntent>> = {
  "arrabida-wine-allinclusive": "arrabida-setubal-azeitao",
  "arrabida-boat": "arrabida-setubal-azeitao",
  "wild-beaches-picnic": "arrabida-setubal-azeitao",
  "tiles-workshop": "arrabida-setubal-azeitao",
  "azeitao-cheese": "arrabida-setubal-azeitao",
  "sintra-cascais": "lisbon-sintra-cascais",
  "troia-comporta": "comporta-troia",
  "evora-alentejo": "alentejo-evora-wine",
  "tomar-coimbra": "central-portugal",
  "fatima-nazare-obidos": "spiritual-coast",
  "roman-heritage-alentejo": "alentejo-roman-talha",
  "southwest-vicentine-coast": "vicentine-coast",
};

const DIMENSION_INTERESTS: Readonly<Record<ExperienceDimensionId, readonly Interest[]>> = {
  "faith-reflection": ["heritage"],
  "history-heritage": ["heritage"],
  "wine-table": ["wine", "gastronomy"],
  "atlantic-coast": ["coast"],
  "hands-on-traditions": ["heritage", "local-life"],
  "local-life": ["local-life"],
  "nature-landscapes": ["nature"],
};

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function studioInterests(profile: ExperienceProfile): Interest[] {
  return unique(profile.selected.flatMap((dimension) => DIMENSION_INTERESTS[dimension])).slice(0, 4);
}

function studioRhythm(density: LivingAtlasPreviewPreferences["density"]): Rhythm {
  if (density === "slow") return "slow";
  if (density === "rich") return "full";
  return "balanced";
}

export function buildLivingAtlasCheckoutHandoff(input: {
  signatureId: LivingAtlasSignatureId;
  selectedDate: string;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  routePlan: LivingAtlasRoutePlan;
}): LivingAtlasCheckoutHandoff {
  const wineryCount = input.routePlan.orderedMoments.filter(
    (moment) => moment.type === "winery",
  ).length;
  let wineryPosition = 0;

  const itinerary: LivingAtlasCheckoutMoment[] = input.routePlan.orderedMoments.map((moment) => {
    if (moment.type === "winery") wineryPosition += 1;
    return {
      stopId: moment.stopId,
      label: livingAtlasPublicMomentLabel(moment, wineryPosition || 1, wineryCount),
      durationMinutes: moment.durationMin,
      note: livingAtlasMomentDisclosure(moment),
    };
  });

  const journeyTitle = livingAtlasPreviewDayTitle({ moments: input.routePlan.orderedMoments });
  const stopLabels = itinerary.map((moment) => moment.label);

  const studioState: StudioV3State = {
    ...INITIAL_STATE,
    phase: "checkoutSummary",
    dateMode: "exact",
    dateExact: input.selectedDate,
    tourId: input.signatureId,
    journeyTitle,
    interests: studioInterests(input.profile),
    rhythm: studioRhythm(input.preferences.density),
    destinationIntent: SIGNATURE_DESTINATION[input.signatureId],
    editedRoutePoints: itinerary.map((moment) => ({
      label: moment.label,
      story: moment.note ?? "",
    })),
  };

  return {
    signatureId: input.signatureId,
    selectedDate: input.selectedDate,
    journeyTitle,
    stopIds: itinerary.map((moment) => moment.stopId),
    stopLabels,
    itinerary,
    durationMinutes: itinerary.reduce((sum, moment) => sum + moment.durationMinutes, 0),
    studioState,
  };
}
