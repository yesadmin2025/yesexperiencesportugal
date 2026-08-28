import {
  SIGNATURE_SOURCE_OF_TRUTH,
  type SignatureSourceOfTruth,
  type SotItineraryChapter,
} from "@/data/signatureToursSourceOfTruth";

/**
 * Pure migration model for Admin vNext.
 *
 * This is deliberately NOT a database client and does not change the public
 * resolver. It gives the future migration a lossless boundary: current SoT
 * -> structured content row + itinerary rows -> current SoT shape.
 */
export type AdminSignatureContentSeed = {
  readonly tourId: string;
  readonly viatorUrl: string;
  readonly productCode: string;
  readonly title: string;
  readonly durationText: string;
  readonly durationMinutes: number;
  readonly pickupWindow: string | null;
  readonly pickupZone: string;
  readonly groupType: string;
  readonly maxGroup: number | null;
  readonly overview: string;
  readonly highlights: readonly string[];
  readonly included: readonly string[];
  readonly notIncluded: readonly string[];
  readonly variesByOption: readonly string[];
  readonly poolPick?: Readonly<Record<string, { min: number; max: number; label: string }>>;
  readonly cancellation: string | null;
  readonly languages: readonly string[];
  readonly meetingPoint: string | null;
  readonly verifiedAt: string;
};

export type AdminSignatureItinerarySeed = Readonly<SotItineraryChapter>;

export type AdminSignatureSeedBundle = {
  readonly content: AdminSignatureContentSeed;
  readonly itinerary: readonly AdminSignatureItinerarySeed[];
};

function clonePoolPick(
  value: SignatureSourceOfTruth["poolPick"],
): SignatureSourceOfTruth["poolPick"] {
  if (!value) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, pick]) => [key, { ...pick }]),
  );
}

export function sourceOfTruthToAdminSeed(
  source: SignatureSourceOfTruth,
): AdminSignatureSeedBundle {
  return {
    content: {
      tourId: source.tourId,
      viatorUrl: source.viatorUrl,
      productCode: source.productCode,
      title: source.title,
      durationText: source.durationText,
      durationMinutes: source.durationMinutes,
      pickupWindow: source.pickupWindow,
      pickupZone: source.pickupZone,
      groupType: source.groupType,
      maxGroup: source.maxGroup,
      overview: source.overview,
      highlights: [...source.highlights],
      included: [...source.included],
      notIncluded: [...source.notIncluded],
      variesByOption: [...source.variesByOption],
      ...(source.poolPick ? { poolPick: clonePoolPick(source.poolPick) } : {}),
      cancellation: source.cancellation,
      languages: [...source.languages],
      meetingPoint: source.meetingPoint,
      verifiedAt: source.verifiedAt,
    },
    itinerary: source.itinerary
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({ ...chapter })),
  };
}

export function adminSeedToSourceOfTruth(
  bundle: AdminSignatureSeedBundle,
): SignatureSourceOfTruth {
  const c = bundle.content;
  return {
    tourId: c.tourId,
    viatorUrl: c.viatorUrl,
    productCode: c.productCode,
    title: c.title,
    durationText: c.durationText,
    durationMinutes: c.durationMinutes,
    pickupWindow: c.pickupWindow,
    pickupZone: c.pickupZone,
    groupType: c.groupType,
    maxGroup: c.maxGroup,
    overview: c.overview,
    highlights: [...c.highlights],
    included: [...c.included],
    notIncluded: [...c.notIncluded],
    variesByOption: [...c.variesByOption],
    itinerary: bundle.itinerary
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({ ...chapter })),
    ...(c.poolPick ? { poolPick: clonePoolPick(c.poolPick as SignatureSourceOfTruth["poolPick"]) } : {}),
    cancellation: c.cancellation,
    languages: [...c.languages],
    meetingPoint: c.meetingPoint,
    verifiedAt: c.verifiedAt,
  };
}

/** Every canonical Signature currently eligible for a one-time Admin seed. */
export function allCanonicalAdminSeeds(): AdminSignatureSeedBundle[] {
  return Object.values(SIGNATURE_SOURCE_OF_TRUTH)
    .filter((source): source is SignatureSourceOfTruth => Boolean(source))
    .map(sourceOfTruthToAdminSeed)
    .sort((a, b) => a.content.tourId.localeCompare(b.content.tourId));
}
