import {
  STUDIO_V3_DURABLE_DRAFT_KEY,
  STUDIO_V3_SESSION_KEY,
  parseDurableStudioDraft,
  serializeDurableStudioDraft,
} from "@/lib/studio-v3/draftSnapshot";

const GUARD_FLAG = "__yesStudioV3SessionPrivacyGuardInstalled";
const DURABLE_RESTORE_FLAG = "__yesStudioV3DurableDraftRestored";

type PrivacyGuardWindow = Window & {
  [GUARD_FLAG]?: boolean;
  [DURABLE_RESTORE_FLAG]?: boolean;
};

function isSavedSignatureView(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("saved");
}

/**
 * Remove personal and checkout-adjacent fields before a Studio composition is
 * written to sessionStorage. All non-personal answers remain untouched so the
 * traveller can still recover the day after a refresh.
 */
export function sanitizeStudioSessionValue(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return value;

    return JSON.stringify({
      ...(parsed as Record<string, unknown>),
      firstName: null,
      guestDraft: null,
    });
  } catch {
    return value;
  }
}

/**
 * Restore a privacy-safe durable draft into the existing session channel.
 * This runs synchronously before StudioV3 mounts, so the component's existing
 * session-restore logic stays the single hydration path and no second state
 * machine is introduced.
 *
 * Explicit `?saved=` links are isolated: viewing somebody else's shared
 * Signature must never replace the traveller's own local draft.
 */
export function restoreDurableStudioDraftBeforeMount(): boolean {
  if (typeof window === "undefined") return false;
  if (isSavedSignatureView()) return false;

  try {
    if (window.sessionStorage.getItem(STUDIO_V3_SESSION_KEY)) return false;
    const raw = window.localStorage.getItem(STUDIO_V3_DURABLE_DRAFT_KEY);
    if (!raw) return false;

    const draft = parseDurableStudioDraft(raw);
    if (!draft) {
      window.localStorage.removeItem(STUDIO_V3_DURABLE_DRAFT_KEY);
      return false;
    }

    window.sessionStorage.setItem(STUDIO_V3_SESSION_KEY, JSON.stringify(draft.state));
    (window as PrivacyGuardWindow)[DURABLE_RESTORE_FLAG] = true;
    return true;
  } catch {
    return false;
  }
}

/** Read-and-clear the one-mount restore flag for UX/analytics feedback. */
export function consumeDurableStudioDraftRestore(): boolean {
  if (typeof window === "undefined") return false;
  const guardedWindow = window as PrivacyGuardWindow;
  const restored = guardedWindow[DURABLE_RESTORE_FLAG] === true;
  if (restored) delete guardedWindow[DURABLE_RESTORE_FLAG];
  return restored;
}

/** Explicit escape hatch used by the "Start fresh" action. */
export function clearStudioDraftPersistence(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STUDIO_V3_SESSION_KEY);
  } catch {
    /* storage blocked */
  }
  try {
    window.localStorage.removeItem(STUDIO_V3_DURABLE_DRAFT_KEY);
  } catch {
    /* storage blocked */
  }
}

/**
 * Install a narrowly scoped guard for the Studio composition key. The guard is
 * synchronous and is installed by the public Studio page before StudioV3 is
 * rendered, so even the first persistence effect cannot store personal data.
 *
 * P12 extends that same boundary with a 30-day local draft. Only the durable
 * allow-list from `draftSnapshot.ts` crosses browser sessions. Shared `?saved=`
 * views are deliberately excluded from this mirroring so opening a link never
 * overwrites the traveller's own in-progress day.
 */
export function installStudioSessionPrivacyGuard(): void {
  if (typeof window === "undefined" || typeof Storage === "undefined") return;

  // Run on every Studio page mount, even after the prototype patch is already
  // installed. SPA navigation can return to the Studio with an empty session.
  restoreDurableStudioDraftBeforeMount();

  const guardedWindow = window as PrivacyGuardWindow;
  if (guardedWindow[GUARD_FLAG]) return;

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function guardedSetItem(key: string, value: string): void {
    if (this === window.sessionStorage && key === STUDIO_V3_SESSION_KEY) {
      const safeValue = sanitizeStudioSessionValue(value);
      originalSetItem.call(this, key, safeValue);

      // A shared Signature is a view of someone else's tokenised snapshot, not
      // consent to replace the traveller's own local draft.
      if (!isSavedSignatureView()) {
        try {
          const durableValue = serializeDurableStudioDraft(safeValue);
          if (durableValue) {
            originalSetItem.call(window.localStorage, STUDIO_V3_DURABLE_DRAFT_KEY, durableValue);
          }
        } catch {
          /* localStorage blocked — tab recovery still works */
        }
      }
      return;
    }

    originalSetItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function guardedRemoveItem(key: string): void {
    originalRemoveItem.call(this, key);

    // Returning all the way to Intro is an explicit reset in the normal Studio
    // flow. Keep a local saved-link viewer isolated for the same reason as the
    // setItem branch above.
    if (
      this === window.sessionStorage &&
      key === STUDIO_V3_SESSION_KEY &&
      !isSavedSignatureView()
    ) {
      try {
        originalRemoveItem.call(window.localStorage, STUDIO_V3_DURABLE_DRAFT_KEY);
      } catch {
        /* localStorage blocked */
      }
    }
  };

  guardedWindow[GUARD_FLAG] = true;
}
