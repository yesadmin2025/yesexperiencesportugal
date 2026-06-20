/**
 * Stable per-browser builder session id.
 *
 * Used to scope anonymous reference uploads to a specific guest without
 * requiring login. Persists in localStorage across visits so a returning
 * guest sees the same uploads they made earlier (until expiry, 7 days).
 *
 * Format: 32 lowercase hex chars (UUID v4 minus hyphens) — 122 bits of
 * entropy, matches the storage RLS policy length range (8..64).
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "yes:builder:sessionId";

function newSessionId(): string {
  // Prefer crypto.randomUUID when available; fall back to manual.
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return uuid.replace(/-/g, "").toLowerCase();
}

export function useBuilderSessionId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let existing = window.localStorage.getItem(STORAGE_KEY);
      if (!existing || existing.length < 16 || existing.length > 64) {
        existing = newSessionId();
        window.localStorage.setItem(STORAGE_KEY, existing);
      }
      setId(existing);
    } catch {
      // localStorage blocked — generate an in-memory id so the feature
      // still works for the current session.
      setId(newSessionId());
    }
  }, []);

  return id;
}
