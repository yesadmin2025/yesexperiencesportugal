/**
 * useStudioDebug — shared hook + MountBadge + mount registry for Studio V3
 * debug instrumentation.
 *
 * Enable signal (shared with StudioV3DebugOverlay):
 *   ?debug=studio  ·  localStorage["studio-v3-debug"]="1"  ·  Shift+D
 *
 * MountBadge is a tiny pill rendered inline by individual components so we
 * can confirm — on a real mobile preview — which pieces are mounting at the
 * current phase. Each MountBadge also registers itself in a module-scoped
 * registry that `useMountRegistry()` subscribes to, so the overlay can show
 * a live checklist of expected vs. actual mounts.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "studio-v3-debug";

export function useStudioDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        const url = new URL(window.location.href);
        const q = url.searchParams.get("debug");
        if (q === "studio" || q === "1" || q === "on") {
          window.localStorage.setItem(STORAGE_KEY, "1");
          setEnabled(true);
          return;
        }
        if (q === "off" || q === "0") {
          window.localStorage.removeItem(STORAGE_KEY);
          setEnabled(false);
          return;
        }
        setEnabled(window.localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        setEnabled(false);
      }
    };
    read();
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        setTimeout(read, 0);
      }
    };
    const onStorage = () => read();
    window.addEventListener("keydown", onKey);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return enabled;
}

// ---------------------------------------------------------------------------
// Mount registry — module-scoped store of currently-mounted MountBadge names.
// Components import MountBadge; the registry powers the overlay checklist.
// ---------------------------------------------------------------------------

type MountEntry = { name: string; detail?: string | null; tone: "ok" | "warn" };
const registry = new Map<string, MountEntry>();
const listeners = new Set<() => void>();
let snapshot: ReadonlyArray<MountEntry> = [];

function publish() {
  snapshot = Array.from(registry.values());
  listeners.forEach((l) => l());
}

function registerMount(entry: MountEntry): () => void {
  registry.set(entry.name, entry);
  publish();
  return () => {
    registry.delete(entry.name);
    publish();
  };
}

export function useMountRegistry(): ReadonlyArray<MountEntry> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}

interface MountBadgeProps {
  name: string;
  detail?: string | null;
  tone?: "ok" | "warn";
}

export function MountBadge({ name, detail, tone = "ok" }: MountBadgeProps) {
  const enabled = useStudioDebugEnabled();
  useEffect(() => registerMount({ name, detail, tone }), [name, detail, tone]);
  if (!enabled) return null;
  const border = tone === "warn" ? "rgba(255,170,80,0.7)" : "rgba(201,169,106,0.7)";
  const accent = tone === "warn" ? "#FFB060" : "var(--gold)";
  return (
    <div
      role="status"
      aria-label={`debug mount ${name}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 10,
        lineHeight: 1.3,
        color: "var(--ivory)",
        background: "rgba(20,20,20,0.85)",
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: "3px 8px",
        margin: "6px 0",
        maxWidth: "100%",
        zIndex: 60,
      }}
    >
      <span style={{ color: accent, fontWeight: 700, letterSpacing: 0.6 }}>●</span>
      <span style={{ fontWeight: 600 }}>{name}</span>
      {detail ? <span style={{ opacity: 0.7 }}>· {detail}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expected mount checklist — describes which named badges *should* be mounted
// at a given phase. The overlay walks this list to render OK / missing rows.
// Keep names in sync with MountBadge call-sites.
// ---------------------------------------------------------------------------

export interface ExpectedMount {
  name: string;
  phases: ReadonlyArray<string>; // phases in which the badge is expected
  hint: string;                  // human-friendly explanation
}

export const EXPECTED_MOUNTS: ReadonlyArray<ExpectedMount> = [
  {
    name: "StudioV3SignatureMap",
    phases: ["map", "storyboard"],
    hint: "Geographic map (phase: map → storyboard)",
  },
  {
    name: "SignaturePriceCard",
    phases: ["storyboard"],
    hint: "Reveal price card (phase: storyboard)",
  },
  {
    name: "TrustStrip",
    phases: ["storyboard"],
    hint: "Trust strip — only if a real price resolved",
  },
  {
    name: "ExitIntent",
    phases: ["storyboard"],
    hint: "Exit-intent rescue (armed after 8s on reveal)",
  },
];
