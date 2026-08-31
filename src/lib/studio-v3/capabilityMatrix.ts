/**
 * Studio Capability Matrix — BUILD 0, truth and reachability only.
 *
 * PURE AND READ-ONLY. This module imports repository data and reports what is
 * actually wired for each of the twelve commercial directions. It never
 * mutates state, never writes to Supabase, never touches pricing, checkout,
 * availability rules or media, and it is not part of any customer-facing
 * recommendation path.
 *
 * Everything reported here is DERIVED from real repository data. When a
 * capability cannot be proven from the repository, it is reported as missing.
 * Nothing is assumed green.
 */

import {
  LIVING_ATLAS_SIGNATURE_IDS,
  SIGNATURE_DIMENSION_AFFINITY,
  SIGNATURE_DISCOVERY_DOORS,
  type ExperienceDimensionId,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  DISCOVERY_SIGNAL_BY_SIGNATURE,
  LIVING_ATLAS_DESTINATION_INTENTS,
  livingAtlasCandidatesForDestination,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  publicPathsForSignal,
  type SequentialPublicPath,
} from "@/lib/studio-v3/publicRefinementPaths";
import {
  SIGNATURE_BUILDER_REGION,
  type LivingAtlasBuilderRegionKey,
} from "@/components/studio-v3/livingAtlasInventory";
import type { AdaptiveRefinementId, DestinationIntent } from "@/components/studio-v3/types";
import { REGION_STOP_POOL, type OptionalStop } from "@/data/regionStopPool";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { sotDurationMinutes, getSot } from "@/data/signatureToursSourceOfTruth";
import { resolvePerPaxEur } from "@/data/signatureTourPricing";
import { resolveStopCoord } from "@/data/stopCoords";
import { STOP_OPERATIONAL_RULES } from "@/data/stopOperational";

export type CapabilityStatus = "green" | "yellow" | "red";

export type CapabilityWarning = {
  code: string;
  detail: string;
  severity: "warning" | "blocker";
};

export type DirectionCapability = {
  signatureId: LivingAtlasSignatureId;

  /** Taxonomy / affinity presence. */
  taxonomy: {
    hasAffinityRow: boolean;
    hasDiscoveryDoor: boolean;
    leads: ExperienceDimensionId[];
    supporting: ExperienceDimensionId[];
    /** Dimensions with affinity 3 — the direction's strongest natural pulls. */
    strongDimensions: ExperienceDimensionId[];
    /** Dimensions with affinity 0 — never a natural path. */
    deadDimensions: ExperienceDimensionId[];
  };

  /** How a traveller can arrive here. */
  paths: {
    /** Dimension combinations that lead here naturally (affinity >= 2). */
    naturalDimensionPaths: ExperienceDimensionId[];
    /** Destination intents whose candidate set contains this direction. */
    destinationIntents: DestinationIntent[];
    /** Destination intents that resolve to this direction and nothing else. */
    explicitDestinationIntents: DestinationIntent[];
    hasExplicitDestinationPath: boolean;
  };

  /** Discovery / precision signal wiring. */
  signals: {
    discoverySignal: LivingAtlasDiscoverySignal | null;
    /**
     * Adaptive answers that emit the signal AND that the real 0→N Question
     * Director genuinely offers along a proven sequential path.
     * A mere entry in `REFINEMENT_TO_SIGNAL` does not qualify.
     */
    publicRefinements: AdaptiveRefinementId[];
    hasPublicSignalPath: boolean;
    /**
     * Proven SEQUENTIAL route to the signal: base state plus the ordered
     * director questions actually asked, so the claim is re-verifiable.
     */
    examplePublicPath: SequentialPublicPath | null;
  };

  /** Region, cluster and verified stop inventory. */
  inventory: {
    builderRegion: LivingAtlasBuilderRegionKey | null;
    legacySeedRegion: string | null;
    /** Legacy seed region disagrees with the canonical Builder region. */
    regionMismatch: boolean;
    routeClusters: string[];
    activeStopCount: number;
    inactiveStopCount: number;
    tourStopCount: number;
  };

  /** Duration coverage. */
  duration: {
    sourceOfTruthMinutes: number | null;
    seedDurationLabel: string | null;
    stopsWithDurationMin: number;
    stopsMissingDuration: number;
    hasDurationTruth: boolean;
  };

  /** Coordinate coverage — real gazetteer hits only, no centroid fallbacks. */
  coordinates: {
    poolStopsWithCoords: number;
    poolStopsWithoutCoords: number;
    tourStopsResolvable: number;
    tourStopsUnresolvable: string[];
    coveragePct: number;
  };

  /** Media coverage, read from existing static metadata only. */
  media: {
    hasHeroImage: boolean;
    galleryCount: number;
    tourStopsWithImage: number;
    tourStopsWithoutImage: number;
  };

  /** Commercial / pricing linkage (read-only probe, no Stripe, no DB). */
  commercial: {
    hasTourRecord: boolean;
    hasPriceFrom: boolean;
    resolvesPerPaxAtTwo: boolean;
    hasBookingUrl: boolean;
  };

  /** Availability / operational linkage. */
  operational: {
    stopsWithClosureRules: number;
    hasOperationalCoverage: boolean;
  };

  /** Hybrid composition eligibility (composer anchor rules). */
  hybrid: {
    anchorStopCount: number;
    clusterCandidateCount: number;
    eligible: boolean;
  };

  warnings: CapabilityWarning[];
  status: CapabilityStatus;
};

export type CapabilityMatrixReport = {
  generatedFrom: "repository-static-data";
  directions: DirectionCapability[];
  summary: {
    green: number;
    yellow: number;
    red: number;
    blockers: CapabilityWarning[];
  };
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function stopSourceTourIds(stop: OptionalStop): string[] {
  return [...new Set([stop.signatureTourId, ...(stop.sourceTourIds ?? [])].filter(Boolean))] as string[];
}

function poolStopsFor(signatureId: LivingAtlasSignatureId): OptionalStop[] {
  return REGION_STOP_POOL.filter((stop) => stopSourceTourIds(stop).includes(signatureId));
}

function tourFor(signatureId: LivingAtlasSignatureId): SignatureTour | null {
  return signatureTours.find((tour) => tour.id === signatureId) ?? null;
}

function normaliseRegion(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Legacy seed regions use free text; compare only on a coarse family. */
function regionFamily(value: string): string {
  const v = normaliseRegion(value);
  if (v.includes("arr") || v.includes("setubal") || v.includes("azeit")) return "arrabida";
  if (v.includes("sintra") || v.includes("cascais")) return "sintra";
  if (v.includes("comporta") || v.includes("troia")) return "troia";
  if (v.includes("evora")) return "evora";
  if (v.includes("tomar") || v.includes("coimbra")) return "centro-tomar";
  if (v.includes("fatima") || v.includes("nazare") || v.includes("obidos")) return "centro-fatima";
  if (v.includes("alentejo")) return "alentejo";
  return v || "unknown";
}

const BUILDER_REGION_FAMILY: Record<LivingAtlasBuilderRegionKey, string> = {
  "arrabida-setubal": "arrabida",
  "sintra-cascais": "sintra",
  "troia-comporta": "troia",
  "evora-alentejo": "evora",
  "centro-tomar-coimbra": "centro-tomar",
  "centro-fatima-nazare-obidos": "centro-fatima",
  alentejo: "alentejo",
};

/* ------------------------------------------------------------------ */
/* Per-direction capability                                             */
/* ------------------------------------------------------------------ */

export function capabilityForDirection(
  signatureId: LivingAtlasSignatureId,
): DirectionCapability {
  const warnings: CapabilityWarning[] = [];
  const warn = (code: string, detail: string, severity: CapabilityWarning["severity"] = "warning") =>
    warnings.push({ code, detail, severity });

  /* -------- taxonomy -------- */
  const affinity = SIGNATURE_DIMENSION_AFFINITY[signatureId] ?? null;
  const door = SIGNATURE_DISCOVERY_DOORS.find((item) => item.signatureId === signatureId) ?? null;
  const affinityEntries = affinity
    ? (Object.entries(affinity) as Array<[ExperienceDimensionId, number]>)
    : [];
  const strongDimensions = affinityEntries.filter(([, s]) => s === 3).map(([d]) => d);
  const deadDimensions = affinityEntries.filter(([, s]) => s === 0).map(([d]) => d);
  const naturalDimensionPaths = affinityEntries.filter(([, s]) => s >= 2).map(([d]) => d);

  if (!affinity) warn("taxonomy.no-affinity", "No dimension affinity row.", "blocker");
  if (!door) warn("taxonomy.no-door", "No discovery door definition.", "blocker");
  if (strongDimensions.length === 0) {
    warn("taxonomy.no-strong-dimension", "No dimension scores 3 — no strong natural pull.");
  }

  /* -------- paths -------- */
  const destinationIntents = LIVING_ATLAS_DESTINATION_INTENTS.filter((intent) =>
    livingAtlasCandidatesForDestination(intent).includes(signatureId),
  );
  const explicitDestinationIntents = destinationIntents.filter(
    (intent) => livingAtlasCandidatesForDestination(intent).length === 1,
  );
  if (explicitDestinationIntents.length === 0) {
    warn(
      "paths.no-explicit-destination",
      "No destination intent resolves to this direction alone; it can only be reached by signal or score.",
    );
  }

  /* -------- signals -------- */
  const discoverySignal = DISCOVERY_SIGNAL_BY_SIGNATURE[signatureId] ?? null;
  const publicPaths = discoverySignal
    ? publicPathsForSignal(discoverySignal)
    : { refinements: [] as AdaptiveRefinementId[], example: null as SequentialPublicPath | null };
  const publicRefinements = publicPaths.refinements;
  if (!discoverySignal) {
    warn("signals.no-signal", "No discovery signal targets this direction.", "blocker");
  } else if (publicRefinements.length === 0) {
    warn(
      "signals.no-public-path",
      `Signal "${discoverySignal}" exists but no plausible sequential Question Director path can present an answer that emits it.`,
      "blocker",
    );
  }

  /* -------- inventory -------- */
  const builderRegion = SIGNATURE_BUILDER_REGION[signatureId] ?? null;
  const tour = tourFor(signatureId);
  const legacySeedRegion = tour?.region ?? null;
  const regionMismatch = Boolean(
    builderRegion &&
      legacySeedRegion &&
      BUILDER_REGION_FAMILY[builderRegion] !== regionFamily(legacySeedRegion),
  );
  if (regionMismatch) {
    warn(
      "inventory.region-mismatch",
      `Legacy seed region "${legacySeedRegion}" disagrees with canonical Builder region "${builderRegion}".`,
    );
  }

  const ownStops = poolStopsFor(signatureId);
  const activeStops = ownStops.filter((stop) => stop.active);
  const routeClusters = [
    ...new Set(activeStops.map((stop) => stop.routeCluster).filter(Boolean) as string[]),
  ];
  if (activeStops.length === 0) {
    warn("inventory.no-active-stops", "No active stop-pool inventory.", "blocker");
  }
  if (routeClusters.length === 0 && activeStops.length > 0) {
    warn("inventory.no-route-cluster", "Active stops carry no routeCluster — hybrid reach is limited.");
  }

  /* -------- duration -------- */
  const sourceOfTruthMinutes = sotDurationMinutes(signatureId) ?? null;
  const stopsWithDurationMin = activeStops.filter((stop) => (stop.durationMin ?? 0) > 0).length;
  const stopsMissingDuration = activeStops.length - stopsWithDurationMin;
  if (sourceOfTruthMinutes == null) {
    warn("duration.no-source-of-truth", "No source-of-truth duration in minutes.");
  }
  if (stopsMissingDuration > 0) {
    warn("duration.stops-missing", `${stopsMissingDuration} active stop(s) carry no durationMin.`);
  }

  /* -------- coordinates -------- */
  const poolStopsWithCoords = activeStops.filter((stop) => Boolean(stop.coords)).length;
  const poolStopsWithoutCoords = activeStops.length - poolStopsWithCoords;
  const tourStops = tour?.stops ?? [];
  const tourStopsUnresolvable = tourStops
    .filter((stop) => resolveStopCoord(stop.label) == null)
    .map((stop) => stop.label);
  const tourStopsResolvable = tourStops.length - tourStopsUnresolvable.length;
  const coordDenominator = activeStops.length + tourStops.length;
  const coveragePct =
    coordDenominator === 0
      ? 0
      : Math.round(((poolStopsWithCoords + tourStopsResolvable) / coordDenominator) * 100);
  if (tourStopsUnresolvable.length > 0) {
    warn(
      "coordinates.unresolvable-stops",
      `${tourStopsUnresolvable.length} tour stop label(s) have no gazetteer coordinate: ${tourStopsUnresolvable.join(", ")}.`,
    );
  }
  if (poolStopsWithoutCoords > 0) {
    warn("coordinates.pool-missing", `${poolStopsWithoutCoords} active pool stop(s) have no coords.`);
  }

  /* -------- media (read-only) -------- */
  const hasHeroImage = Boolean(tour?.img);
  const galleryCount = tour?.gallery?.length ?? 0;
  const tourStopsWithImage = tourStops.filter((stop) => Boolean(stop.image)).length;
  const tourStopsWithoutImage = tourStops.length - tourStopsWithImage;
  if (!hasHeroImage) warn("media.no-hero", "No hero image on the tour record.");
  if (galleryCount === 0) warn("media.no-gallery", "No static gallery images.");

  /* -------- commercial -------- */
  const hasPriceFrom = typeof tour?.priceFrom === "number" && tour.priceFrom > 0;
  const resolvesPerPaxAtTwo = tour ? resolvePerPaxEur(tour, 2) != null : false;
  const hasBookingUrl = Boolean(tour?.bookingUrl);
  if (!tour) warn("commercial.no-tour-record", "No SignatureTour record.", "blocker");
  if (tour && !hasPriceFrom) warn("commercial.no-price", "No priceFrom anchor.", "blocker");
  if (tour && !resolvesPerPaxAtTwo) warn("commercial.no-per-pax", "Per-pax price does not resolve.");

  /* -------- operational -------- */
  const stopsWithClosureRules = activeStops.filter((stop) =>
    STOP_OPERATIONAL_RULES.some((rule) => rule.match.test(stop.name)),
  ).length;

  /* -------- hybrid eligibility -------- */
  const anchorRegions = new Set(activeStops.map((stop) => stop.region));
  const anchorClusters = new Set(routeClusters);
  const clusterCandidateCount = REGION_STOP_POOL.filter((stop) => {
    if (!stop.active) return false;
    if (!anchorRegions.has(stop.region)) return false;
    if (stopSourceTourIds(stop).includes(signatureId)) return true;
    return Boolean(stop.routeCluster && anchorClusters.has(stop.routeCluster));
  }).length;
  const hybridEligible = activeStops.length > 0 && clusterCandidateCount >= 3;
  if (!hybridEligible) {
    warn(
      "hybrid.not-eligible",
      `Only ${clusterCandidateCount} composer candidate(s) in region/cluster — hybrid enrichment will no-op.`,
    );
  }

  const blockers = warnings.filter((w) => w.severity === "blocker");
  const status: CapabilityStatus =
    blockers.length > 0 ? "red" : warnings.length > 0 ? "yellow" : "green";

  return {
    signatureId,
    taxonomy: {
      hasAffinityRow: Boolean(affinity),
      hasDiscoveryDoor: Boolean(door),
      leads: [...(door?.leads ?? [])],
      supporting: [...(door?.supporting ?? [])],
      strongDimensions,
      deadDimensions,
    },
    paths: {
      naturalDimensionPaths,
      destinationIntents,
      explicitDestinationIntents,
      hasExplicitDestinationPath: explicitDestinationIntents.length > 0,
    },
    signals: {
      discoverySignal,
      publicRefinements,
      hasPublicSignalPath: publicRefinements.length > 0,
      examplePublicPath: publicPaths.example,
    },
    inventory: {
      builderRegion,
      legacySeedRegion,
      regionMismatch,
      routeClusters,
      activeStopCount: activeStops.length,
      inactiveStopCount: ownStops.length - activeStops.length,
      tourStopCount: tourStops.length,
    },
    duration: {
      sourceOfTruthMinutes,
      seedDurationLabel: tour?.duration ?? null,
      stopsWithDurationMin,
      stopsMissingDuration,
      hasDurationTruth: sourceOfTruthMinutes != null || Boolean(getSot(signatureId)),
    },
    coordinates: {
      poolStopsWithCoords,
      poolStopsWithoutCoords,
      tourStopsResolvable,
      tourStopsUnresolvable,
      coveragePct,
    },
    media: {
      hasHeroImage,
      galleryCount,
      tourStopsWithImage,
      tourStopsWithoutImage,
    },
    commercial: {
      hasTourRecord: Boolean(tour),
      hasPriceFrom,
      resolvesPerPaxAtTwo,
      hasBookingUrl,
    },
    operational: {
      stopsWithClosureRules,
      hasOperationalCoverage: stopsWithClosureRules > 0,
    },
    hybrid: {
      anchorStopCount: activeStops.length,
      clusterCandidateCount,
      eligible: hybridEligible,
    },
    warnings,
    status,
  };
}

/** Full read-only capability report for all twelve commercial directions. */
export function buildCapabilityMatrix(): CapabilityMatrixReport {
  const directions = LIVING_ATLAS_SIGNATURE_IDS.map(capabilityForDirection);
  return {
    generatedFrom: "repository-static-data",
    directions,
    summary: {
      green: directions.filter((d) => d.status === "green").length,
      yellow: directions.filter((d) => d.status === "yellow").length,
      red: directions.filter((d) => d.status === "red").length,
      blockers: directions.flatMap((d) => d.warnings.filter((w) => w.severity === "blocker")),
    },
  };
}
