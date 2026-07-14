import { useCallback, useEffect, useRef, useState } from "react";
import type { Pace } from "@/components/builder/types";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import {
  createJourney,
  loadJourney,
  rotateShareToken,
  revokeShareToken,
  saveJourney,
} from "@/lib/builderJourneys.functions";

const KEY = "yes.builder.multiday.v1";
const TOKEN_KEY_PREFIX = "yes.builder.owner.";

export interface DayState {
  /** Stable id (e.g. crypto.randomUUID) so UI keys are stable across reorders. */
  id: string;
  /** Region for this specific day. */
  regionKey: string;
  /** Ordered stop keys (user-chosen). */
  stopKeys: string[];
  /** Optional per-day label override. */
  label?: string;
}

export interface MultiDayState {
  days: DayState[];
  activeDayId: string | null;
  guests: number;
  pace: Pace;
  /** Free-text user intent — feeds AI suggest + biases the picker. */
  intent?: string;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

function defaults(regionKey = "arrabida-setubal"): MultiDayState {
  const id = makeId();
  return {
    days: [{ id, regionKey, stopKeys: [] }],
    activeDayId: id,
    guests: 2,
    pace: "balanced",
  };
}

function read(): MultiDayState {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<MultiDayState>;
    if (!Array.isArray(parsed.days) || parsed.days.length === 0) return defaults();
    const days: DayState[] = parsed.days
      .filter(
        (d): d is DayState =>
          typeof d === "object" &&
          d !== null &&
          typeof (d as DayState).id === "string" &&
          typeof (d as DayState).regionKey === "string" &&
          Array.isArray((d as DayState).stopKeys),
      )
      .map((d) => ({
        id: d.id,
        regionKey: d.regionKey,
        stopKeys: d.stopKeys.filter((k) => typeof k === "string"),
        label: typeof d.label === "string" ? d.label : undefined,
      }));
    if (days.length === 0) return defaults();
    const activeDayId =
      typeof parsed.activeDayId === "string" && days.some((d) => d.id === parsed.activeDayId)
        ? parsed.activeDayId
        : days[0].id;
    return {
      days,
      activeDayId,
      guests:
        typeof parsed.guests === "number" && parsed.guests >= 1 && parsed.guests <= 12
          ? parsed.guests
          : 2,
      pace:
        parsed.pace === "relaxed" || parsed.pace === "full" || parsed.pace === "balanced"
          ? parsed.pace
          : "balanced",
      intent: typeof parsed.intent === "string" ? parsed.intent : undefined,
    };
  } catch {
    return defaults();
  }
}

function getShareTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(window.location.href);
    const t = u.searchParams.get("j");
    return t && t.length >= 8 && t.length <= 64 ? t : null;
  } catch {
    return null;
  }
}

function readOwnerToken(shareToken: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY_PREFIX + shareToken);
  } catch {
    return null;
  }
}

function writeOwnerToken(shareToken: string, ownerToken: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY_PREFIX + shareToken, ownerToken);
  } catch {
    /* ignore */
  }
}

export function useMultiDayBuilder() {
  const sessionId = useBuilderSessionId();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<MultiDayState>(() => defaults());
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Hydrate: prefer URL ?j=<token>, otherwise localStorage.
  useEffect(() => {
    let cancelled = false;
    const urlToken = getShareTokenFromUrl();
    if (urlToken) {
      const owner = readOwnerToken(urlToken);
      void loadJourney({
        data: { shareToken: urlToken, ownerToken: owner ?? undefined },
      })
        .then((res) => {
          if (cancelled) return;
          if (res.found) {
            setState(res.state as MultiDayState);
            setShareToken(urlToken);
            setOwnerToken(owner);
            setReadOnly(!res.isOwner);
          } else {
            setState(read());
          }
        })
        .catch(() => {
          if (!cancelled) setState(read());
        })
        .finally(() => {
          if (!cancelled) setHydrated(true);
        });
    } else {
      setState(read());
      setHydrated(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Local persistence
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    if (readOnly) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated, readOnly]);

  // Debounced cloud save when we own a shared journey.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (!shareToken || !ownerToken || readOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSyncing(true);
      void saveJourney({ data: { shareToken, ownerToken, state } })
        .catch((e) => console.error("[builder] saveJourney failed", e))
        .finally(() => setSyncing(false));
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, hydrated, shareToken, ownerToken, readOnly]);

  const activeDay = state.days.find((d) => d.id === state.activeDayId) ?? state.days[0] ?? null;

  const addDay = useCallback(
    (regionKey?: string) => {
      if (readOnly) return;
      setState((s) => {
        const id = makeId();
        const seedRegion =
          regionKey ?? activeDay?.regionKey ?? s.days[0]?.regionKey ?? "arrabida-setubal";
        return {
          ...s,
          days: [...s.days, { id, regionKey: seedRegion, stopKeys: [] }],
          activeDayId: id,
        };
      });
    },
    [activeDay?.regionKey, readOnly],
  );

  const removeDay = useCallback(
    (id: string) => {
      if (readOnly) return;
      setState((s) => {
        if (s.days.length <= 1) return s;
        const days = s.days.filter((d) => d.id !== id);
        const activeDayId = s.activeDayId === id ? days[0].id : s.activeDayId;
        return { ...s, days, activeDayId };
      });
    },
    [readOnly],
  );

  const setActiveDay = useCallback((id: string) => {
    setState((s) => ({ ...s, activeDayId: id }));
  }, []);

  const updateDay = useCallback(
    (id: string, patch: Partial<DayState>) => {
      if (readOnly) return;
      setState((s) => ({
        ...s,
        days: s.days.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }));
    },
    [readOnly],
  );

  const moveDay = useCallback(
    (id: string, dir: -1 | 1) => {
      if (readOnly) return;
      setState((s) => {
        const idx = s.days.findIndex((d) => d.id === id);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= s.days.length) return s;
        const days = s.days.slice();
        [days[idx], days[j]] = [days[j], days[idx]];
        return { ...s, days };
      });
    },
    [readOnly],
  );

  const addStopToActive = useCallback(
    (stopKey: string) => {
      if (readOnly) return;
      setState((s) => {
        if (!s.activeDayId) return s;
        return {
          ...s,
          days: s.days.map((d) =>
            d.id === s.activeDayId && !d.stopKeys.includes(stopKey)
              ? { ...d, stopKeys: [...d.stopKeys, stopKey] }
              : d,
          ),
        };
      });
    },
    [readOnly],
  );

  const removeStopFromActive = useCallback(
    (stopKey: string) => {
      if (readOnly) return;
      setState((s) => {
        if (!s.activeDayId) return s;
        return {
          ...s,
          days: s.days.map((d) =>
            d.id === s.activeDayId
              ? { ...d, stopKeys: d.stopKeys.filter((k) => k !== stopKey) }
              : d,
          ),
        };
      });
    },
    [readOnly],
  );

  const moveStopInActive = useCallback(
    (idx: number, dir: -1 | 1) => {
      if (readOnly) return;
      setState((s) => {
        const day = s.days.find((d) => d.id === s.activeDayId);
        if (!day) return s;
        const j = idx + dir;
        if (j < 0 || j >= day.stopKeys.length) return s;
        const next = day.stopKeys.slice();
        [next[idx], next[j]] = [next[j], next[idx]];
        return {
          ...s,
          days: s.days.map((d) => (d.id === s.activeDayId ? { ...d, stopKeys: next } : d)),
        };
      });
    },
    [readOnly],
  );

  const setGuests = useCallback(
    (n: number) => {
      if (readOnly) return;
      setState((s) => ({ ...s, guests: Math.max(1, Math.min(12, n)) }));
    },
    [readOnly],
  );

  const setPace = useCallback(
    (p: Pace) => {
      if (readOnly) return;
      setState((s) => ({ ...s, pace: p }));
    },
    [readOnly],
  );

  const setRegion = useCallback(
    (dayId: string, regionKey: string) => {
      if (readOnly) return;
      setState((s) => ({
        ...s,
        days: s.days.map((d) => (d.id === dayId ? { ...d, regionKey, stopKeys: [] } : d)),
      }));
    },
    [readOnly],
  );

  const setIntent = useCallback(
    (intent: string) => {
      if (readOnly) return;
      setState((s) => ({ ...s, intent }));
    },
    [readOnly],
  );

  const reset = useCallback(() => {
    if (readOnly) return;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    }
    setState(defaults());
  }, [readOnly]);

  const share = useCallback(async (): Promise<string> => {
    if (shareToken) {
      const u = new URL(window.location.href);
      u.searchParams.set("j", shareToken);
      return u.toString();
    }
    if (!sessionId) throw new Error("Session not ready");
    const res = await createJourney({ data: { state, sessionId } });
    writeOwnerToken(res.shareToken, res.ownerToken);
    setShareToken(res.shareToken);
    setOwnerToken(res.ownerToken);
    const u = new URL(window.location.href);
    u.searchParams.set("j", res.shareToken);
    window.history.replaceState({}, "", u.toString());
    return u.toString();
  }, [shareToken, state, sessionId]);

  const rotateLink = useCallback(async (): Promise<string | null> => {
    if (!shareToken || !ownerToken) return null;
    const res = await rotateShareToken({ data: { shareToken, ownerToken } });
    if (!res.ok) return null;
    try {
      window.localStorage.removeItem(TOKEN_KEY_PREFIX + shareToken);
    } catch {
      /* ignore */
    }
    writeOwnerToken(res.shareToken, ownerToken);
    setShareToken(res.shareToken);
    const u = new URL(window.location.href);
    u.searchParams.set("j", res.shareToken);
    window.history.replaceState({}, "", u.toString());
    return u.toString();
  }, [shareToken, ownerToken]);

  const revokeLink = useCallback(async (): Promise<boolean> => {
    if (!shareToken || !ownerToken) return false;
    const res = await revokeShareToken({ data: { shareToken, ownerToken } });
    if (!res.ok) return false;
    try {
      window.localStorage.removeItem(TOKEN_KEY_PREFIX + shareToken);
    } catch {
      /* ignore */
    }
    setShareToken(null);
    setOwnerToken(null);
    const u = new URL(window.location.href);
    u.searchParams.delete("j");
    window.history.replaceState({}, "", u.toString());
    return true;
  }, [shareToken, ownerToken]);

  return {
    state,
    hydrated,
    activeDay,
    sessionId,
    addDay,
    removeDay,
    setActiveDay,
    updateDay,
    moveDay,
    addStopToActive,
    removeStopFromActive,
    moveStopInActive,
    setGuests,
    setPace,
    setRegion,
    setIntent,
    reset,
    share,
    rotateLink,
    revokeLink,
    shareToken,
    readOnly,
    syncing,
  };
}
