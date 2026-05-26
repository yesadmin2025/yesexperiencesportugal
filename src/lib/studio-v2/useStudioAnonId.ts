// Studio v2 — anonymous session id (browser-only).
//
// Generates and persists a per-browser id used to key the predictive engine
// state. No PII, no auth required. Returns a stable id across the visit.

import { useEffect, useState } from "react";

const STORAGE_KEY = "yes.studio-v2.anon-id";

function generateId(): string {
  // 18 random bytes → ~24 char base64url, well above the schema min (8).
  const arr = new Uint8Array(18);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function useStudioAnonId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let existing = window.localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        existing = generateId();
        window.localStorage.setItem(STORAGE_KEY, existing);
      }
      setId(existing);
    } catch {
      setId(generateId());
    }
  }, []);
  return id;
}
