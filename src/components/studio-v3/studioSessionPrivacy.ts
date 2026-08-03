const STUDIO_SESSION_KEY = "yes.studio-v3.session.v1";

const GUARD_FLAG = "__yesStudioV3SessionPrivacyGuardInstalled";

type PrivacyGuardWindow = Window & {
  [GUARD_FLAG]?: boolean;
};

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
 * Install a narrowly scoped guard for the Studio composition key. The guard is
 * synchronous and is installed by the public Studio page before StudioV3 is
 * rendered, so even the first persistence effect cannot store personal data.
 */
export function installStudioSessionPrivacyGuard(): void {
  if (typeof window === "undefined" || typeof Storage === "undefined") return;

  const guardedWindow = window as PrivacyGuardWindow;
  if (guardedWindow[GUARD_FLAG]) return;

  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function guardedSetItem(key: string, value: string): void {
    const safeValue =
      this === window.sessionStorage && key === STUDIO_SESSION_KEY
        ? sanitizeStudioSessionValue(value)
        : value;
    originalSetItem.call(this, key, safeValue);
  };

  guardedWindow[GUARD_FLAG] = true;
}
