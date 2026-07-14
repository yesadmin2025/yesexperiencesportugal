import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Intention,
  Mood,
  Pace,
  Who,
  RoutedStopUI,
  JourneyType,
  AffinityProfile,
} from "@/components/builder/types";
import type { StudioProposal } from "@/components/builder/types";
import { BUILDER_REGIONS, type BuilderRegionKey } from "@/components/builder/RegionStep";

/**
 * Unified state for the Living Atmosphere Studio (Builder v3).
 */

export interface StudioStop {
  key: string;
  label: string;
  blurb: string | null;
  tag: string | null;
  lat: number;
  lng: number;
  duration_minutes: number;
}

export interface StudioState {
  narrative: string;
  mood: Mood | null;
  who: Who | null;
  intention: Intention | null;
  pace: Pace;
  journeyType: JourneyType | null;
  regionKey: BuilderRegionKey | null;
  acceptedStops: StudioStop[];
  chapter: string | null;
  whisper: string | null;
  awakened: boolean;
  closing: boolean;
  /** Optional emotional identity — captured at most once per session. */
  travellerName: string | null;
  /** Whether the NameWhisper step was already presented (asked or skipped). */
  nameAsked: boolean;
  /** Composed editorial identity for the reveal — generated once, cached. */
  proposal: StudioProposal | null;
  /** Most recent AI-composed sensory fragment (transient — used by NarrativeBeat). */
  narrativeFragment: string | null;
  /** Timestamp the fragment arrived — drives the transient beat lifecycle. */
  narrativeFragmentAt: number | null;
}

/** Derived narrative stage — controls AI voice, motion duration, and beat pacing. */
export type NarrativeStage = "invitation" | "recognition" | "emergence" | "reveal";

const INITIAL: StudioState = {
  narrative: "",
  mood: null,
  who: null,
  intention: null,
  pace: "balanced",
  journeyType: null,
  regionKey: null,
  acceptedStops: [],
  chapter: null,
  whisper: null,
  awakened: false,
  closing: false,
  travellerName: null,
  nameAsked: false,
  proposal: null,
  narrativeFragment: null,
  narrativeFragmentAt: null,
};

const STORAGE_KEY = "yes.studio.state.v3";

/** Persisted subset — exclude transient UI flags (whisper, closing). */
type PersistedState = Pick<
  StudioState,
  | "narrative"
  | "mood"
  | "who"
  | "intention"
  | "pace"
  | "journeyType"
  | "regionKey"
  | "acceptedStops"
  | "chapter"
  | "awakened"
  | "travellerName"
  | "nameAsked"
  | "proposal"
>;

function loadPersisted(): Partial<StudioState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(s: StudioState) {
  if (typeof window === "undefined") return;
  try {
    const p: PersistedState = {
      narrative: s.narrative,
      mood: s.mood,
      who: s.who,
      intention: s.intention,
      pace: s.pace,
      journeyType: s.journeyType,
      regionKey: s.regionKey,
      acceptedStops: s.acceptedStops,
      chapter: s.chapter,
      awakened: s.awakened,
      travellerName: s.travellerName,
      nameAsked: s.nameAsked,
      proposal: s.proposal,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* quota / private mode — silent */
  }
}

function clearPersisted() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Map parseNarrative regionHint (small enum) to a real BuilderRegionKey. */
const REGION_HINT_MAP: Record<string, BuilderRegionKey> = {
  lisbon: "lisbon",
  porto: "porto",
  alentejo: "alentejo",
  douro: "porto",
  algarve: "algarve",
  sintra: "sintra-cascais",
};

const CATALOG_REGION_KEYS = new Set<string>(BUILDER_REGIONS.map((r) => r.key));

export function resolveRegionFromHint(hint?: string | null): BuilderRegionKey {
  if (hint && REGION_HINT_MAP[hint] && CATALOG_REGION_KEYS.has(REGION_HINT_MAP[hint])) {
    return REGION_HINT_MAP[hint];
  }
  return "arrabida-setubal";
}

export function regionLabel(key: BuilderRegionKey | null): string {
  if (!key) return "Portugal";
  return BUILDER_REGIONS.find((r) => r.key === key)?.label ?? "Portugal";
}

export function useStudioState() {
  const [state, setState] = useState<StudioState>(INITIAL);
  // True if a previous narration was loaded from localStorage on mount.
  const [restored, setRestored] = useState(false);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage exactly once on mount.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const persisted = loadPersisted();
    if (persisted && (persisted.narrative || (persisted.acceptedStops?.length ?? 0) > 0)) {
      setState((s) => ({ ...s, ...persisted, whisper: null, closing: false }));
      setRestored(true);
    }
  }, []);

  // Auto-save on any meaningful change (skip while still hydrating).
  useEffect(() => {
    if (!hydratedRef.current) return;
    // Only persist once user has actually engaged.
    if (!state.narrative && state.acceptedStops.length === 0 && !state.awakened) return;
    savePersisted(state);
  }, [state]);

  const patch = useCallback((p: Partial<StudioState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const acceptStop = useCallback((stop: StudioStop) => {
    setState((s) =>
      s.acceptedStops.some((x) => x.key === stop.key)
        ? s
        : { ...s, acceptedStops: [...s.acceptedStops, stop] },
    );
  }, []);

  const removeStop = useCallback((key: string) => {
    setState((s) => ({ ...s, acceptedStops: s.acceptedStops.filter((x) => x.key !== key) }));
  }, []);

  const reorderStops = useCallback((keys: string[]) => {
    setState((s) => {
      const map = new Map(s.acceptedStops.map((x) => [x.key, x]));
      const reordered = keys.map((k) => map.get(k)).filter(Boolean) as StudioStop[];
      for (const x of s.acceptedStops) if (!keys.includes(x.key)) reordered.push(x);
      return { ...s, acceptedStops: reordered };
    });
  }, []);

  const setWhisper = useCallback((line: string | null) => {
    setState((s) => ({ ...s, whisper: line }));
  }, []);

  const reset = useCallback(() => {
    clearPersisted();
    setRestored(false);
    setState(INITIAL);
  }, []);

  const dismissRestored = useCallback(() => setRestored(false), []);

  const routedStops = useMemo<RoutedStopUI[]>(() => {
    return state.acceptedStops.map((s, i) => ({
      key: s.key,
      region_key: state.regionKey ?? "",
      label: s.label,
      blurb: s.blurb,
      tag: s.tag,
      lat: s.lat,
      lng: s.lng,
      duration_minutes: s.duration_minutes,
      driveMinutesFromPrev: i === 0 ? 0 : 20,
    }));
  }, [state.acceptedStops, state.regionKey]);

  const regionCenter = useMemo(() => {
    if (!state.regionKey) return null;
    const centers: Record<string, { lat: number; lng: number }> = {
      lisbon: { lat: 38.72, lng: -9.14 },
      "arrabida-setubal": { lat: 38.52, lng: -8.97 },
      "troia-comporta": { lat: 38.42, lng: -8.78 },
      porto: { lat: 41.15, lng: -8.61 },
      alentejo: { lat: 38.57, lng: -7.91 },
      "sintra-cascais": { lat: 38.8, lng: -9.4 },
      algarve: { lat: 37.1, lng: -8.2 },
      "evora-alentejo": { lat: 38.57, lng: -7.91 },
      "centro-tomar-coimbra": { lat: 39.6, lng: -8.4 },
      "centro-fatima-nazare-obidos": { lat: 39.6, lng: -9.07 },
    };
    return centers[state.regionKey] ?? null;
  }, [state.regionKey]);

  const totalMinutes = useMemo(
    () =>
      state.acceptedStops.reduce((acc, s, i) => acc + s.duration_minutes + (i === 0 ? 0 : 20), 0),
    [state.acceptedStops],
  );

  /**
   * Affinity profile — derived purely from emotional selections. Used to
   * subtly influence imagery, motion duration, microcopy tone and suggestion
   * ranking. The user never sees these values.
   */
  const affinityProfile = useMemo<AffinityProfile>(() => {
    const warmthByMood: Record<string, number> = {
      romantic: 0.95,
      slow: 0.7,
      open: 0.55,
      curious: 0.45,
      energetic: 0.35,
    };
    const depthByMood: Record<string, number> = {
      slow: 0.95,
      romantic: 0.8,
      open: 0.55,
      curious: 0.4,
      energetic: 0.25,
    };
    const energyByMood: Record<string, number> = {
      energetic: 0.95,
      curious: 0.7,
      open: 0.55,
      romantic: 0.35,
      slow: 0.2,
    };
    const curiosityByMood: Record<string, number> = {
      curious: 0.95,
      energetic: 0.65,
      open: 0.6,
      romantic: 0.45,
      slow: 0.45,
    };
    const eleganceByIntention: Record<string, number> = {
      wine: 0.85,
      gastronomy: 0.8,
      wellness: 0.75,
      heritage: 0.7,
      coast: 0.6,
      nature: 0.5,
      hidden: 0.55,
      wonder: 0.65,
    };
    const intimacyByWho: Record<string, number> = {
      solo: 0.85,
      couple: 0.95,
      family: 0.55,
      friends: 0.5,
      corporate: 0.25,
      group: 0.3,
    };
    const intentionWarmth: Record<string, number> = {
      gastronomy: 0.85,
      wine: 0.85,
      wellness: 0.75,
      heritage: 0.55,
      coast: 0.6,
      nature: 0.55,
      hidden: 0.6,
      wonder: 0.7,
    };
    const pacingByPace: Record<string, number> = {
      relaxed: 0.85,
      balanced: 0.55,
      full: 0.25,
    };
    const m = state.mood ?? "open";
    const w = state.who ?? "couple";
    const it = state.intention ?? "coast";
    const warmth = ((warmthByMood[m] ?? 0.5) + (intentionWarmth[it] ?? 0.55)) / 2;
    return {
      warmth: Math.min(1, warmth),
      depth: depthByMood[m] ?? 0.5,
      energy: energyByMood[m] ?? 0.5,
      intimacy: intimacyByWho[w] ?? 0.5,
      curiosity: curiosityByMood[m] ?? 0.5,
      elegance: eleganceByIntention[it] ?? 0.55,
      spontaneity: 1 - (pacingByPace[state.pace] ?? 0.55),
      pacing: pacingByPace[state.pace] ?? 0.55,
    };
  }, [state.mood, state.who, state.intention, state.pace]);

  /**
   * Derived narrative stage — the emotional altitude of the experience.
   * AI calls, motion durations and beat pacing all read from this single
   * source of truth so the Studio feels like one continuous thread.
   *
   *   invitation  → traveller has not yet picked anything (distant, atmospheric)
   *   recognition → first emotional pick has landed (warmer, one object enters)
   *   emergence   → core picks complete, journey beginning to take shape
   *   reveal      → 3+ accepted moments OR memory open (intimate, settled)
   */
  const narrativeStage = useMemo<NarrativeStage>(() => {
    if (state.closing) return "reveal";
    if (state.acceptedStops.length >= 3) return "reveal";
    const coreCount = [state.mood, state.who, state.intention].filter(Boolean).length;
    if (coreCount >= 3 || state.acceptedStops.length >= 1) return "emergence";
    if (coreCount >= 1 || state.awakened) return "recognition";
    return "invitation";
  }, [
    state.closing,
    state.acceptedStops.length,
    state.mood,
    state.who,
    state.intention,
    state.awakened,
  ]);

  const setNarrativeFragment = useCallback((fragment: string | null) => {
    setState((s) => ({
      ...s,
      narrativeFragment: fragment,
      narrativeFragmentAt: fragment ? Date.now() : null,
    }));
  }, []);

  return {
    state,
    restored,
    dismissRestored,
    patch,
    acceptStop,
    removeStop,
    reorderStops,
    setWhisper,
    setNarrativeFragment,
    reset,
    routedStops,
    regionCenter,
    totalMinutes,
    affinityProfile,
    narrativeStage,
  };
}
