import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { INITIAL_STATE, type StudioV3State } from "./types";
import type { SelectedAddOnSummary } from "./SignaturePriceCard";

/**
 * Auto-persist the in-progress Studio V3 draft so a traveller who leaves and
 * returns finds their answers, refined stops, and selected add-ons still in
 * place — without needing to sign in or hit "Save signature".
 *
 * Design intent (Studio philosophy — guided, not asked):
 *  - Silent restore: no toast, no modal. The Studio just picks up where the
 *    user left it. A subtle "— Draft restored" chip may be surfaced by the
 *    parent using the returned `restored` flag.
 *  - Server hydration (`?saved=<token>`) always wins.
 *  - Nothing persists until the user is meaningfully into the flow (past the
 *    intro phase or has answered a first-order question).
 *  - Add-ons are tied to a specific `tourId`. When the persisted tour matches
 *    the current one, add-ons come back; otherwise they stay clean.
 */

const STORAGE_KEY = "yes.studio.v3.draft.v1";
const DEBOUNCE_MS = 300;

type AddOnItems = SelectedAddOnSummary["items"];

interface PersistedShape {
  version: 1;
  savedAt: number;
  state: Partial<StudioV3State>;
  tourId: string | null;
  addOnIds: string[];
  addOnItems: AddOnItems;
  addOnsTotalEur: number;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function hasMeaningfulProgress(s: Partial<StudioV3State> | null | undefined): boolean {
  if (!s || typeof s !== "object") return false;
  if (s.phase && s.phase !== "intro") return true;
  if (s.feeling || s.rhythm || s.companions || s.destinationIntent) return true;
  if (Array.isArray(s.interests) && s.interests.length > 0) return true;
  if (Array.isArray(s.editedRoutePoints) && s.editedRoutePoints.length > 0) return true;
  return false;
}

function loadPersisted(): PersistedShape | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(payload: PersistedShape) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — silent */
  }
}

export function clearStudioV3Draft() {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveStudioV3DraftNow(payload: {
  state: StudioV3State;
  tourId: string | null;
  addOnIds: string[];
  addOnItems: AddOnItems;
  addOnsTotalEur: number;
}): boolean {
  if (!hasWindow()) return false;
  try {
    writePersisted({
      version: 1,
      savedAt: Date.now(),
      state: payload.state,
      tourId: payload.tourId,
      addOnIds: payload.addOnIds,
      addOnItems: payload.addOnItems,
      addOnsTotalEur: payload.addOnsTotalEur,
    });
    return true;
  } catch {
    return false;
  }
}

interface Options {
  state: StudioV3State;
  setState: Dispatch<SetStateAction<StudioV3State>>;
  selectedAddOnIds: string[];
  selectedAddOnItems: AddOnItems;
  selectedAddOnsTotalEur: number;
  restoreAddOns: (payload: {
    ids: string[];
    items: AddOnItems;
    totalEur: number;
  }) => void;
  /**
   * When true, skip local hydrate entirely (e.g. `?saved=<token>` server
   * hydrate is in flight). We still persist writes so the user can leave
   * and come back later.
   */
  skipHydrate?: boolean;
}

export function useStudioV3AutoPersist({
  state,
  setState,
  selectedAddOnIds,
  selectedAddOnItems,
  selectedAddOnsTotalEur,
  restoreAddOns,
  skipHydrate,
}: Options) {
  const hydratedRef = useRef(false);
  const [restored, setRestored] = useState(false);

  // ── Hydrate once on mount ────────────────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (skipHydrate) return;
    const persisted = loadPersisted();
    if (!persisted) return;
    if (!hasMeaningfulProgress(persisted.state)) return;

    setState((prev) => ({
      ...INITIAL_STATE,
      ...prev,
      ...persisted.state,
      // Never restore transient/ephemeral bits — the parent recomputes them.
    }));

    // Add-ons only when the persisted tour matches what the resolver picks.
    // The parent watches `state.tourId` and calls restoreAddOns() when the
    // persisted tour lines up (see StudioV3 wiring).
    if (persisted.tourId && persisted.addOnIds.length > 0) {
      restoreAddOns({
        ids: persisted.addOnIds,
        items: persisted.addOnItems,
        totalEur: persisted.addOnsTotalEur,
      });
    }

    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced write on every meaningful change ───────────────────────
  useEffect(() => {
    if (!hasWindow()) return;
    if (!hasMeaningfulProgress(state)) return;
    const timer = window.setTimeout(() => {
      writePersisted({
        version: 1,
        savedAt: Date.now(),
        state,
        tourId: state.tourId ?? null,
        addOnIds: selectedAddOnIds,
        addOnItems: selectedAddOnItems,
        addOnsTotalEur: selectedAddOnsTotalEur,
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, selectedAddOnIds, selectedAddOnItems, selectedAddOnsTotalEur]);

  const saveNow = () =>
    saveStudioV3DraftNow({
      state,
      tourId: state.tourId ?? null,
      addOnIds: selectedAddOnIds,
      addOnItems: selectedAddOnItems,
      addOnsTotalEur: selectedAddOnsTotalEur,
    });

  return { restored, clearDraft: clearStudioV3Draft, saveNow };
}
