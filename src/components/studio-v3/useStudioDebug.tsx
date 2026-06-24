/**
 * useStudioDebug — shared hook + MountBadge for Studio V3 debug instrumentation.
 *
 * Reads the same enable signal as `StudioV3DebugOverlay`:
 *   ?debug=studio  ·  localStorage["studio-v3-debug"]="1"  ·  Shift+D toggles
 *
 * MountBadge is a tiny pill rendered by individual components (SignaturePriceCard,
 * StudioV3SignatureMap, StudioTrustStrip, ExitIntentSave, …) so we can confirm
 * — on the actual mobile preview — which pieces are mounting at the current
 * phase. Invisible when debug is off.
 */
import { useEffect, useState } from "react";

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

interface MountBadgeProps {
  name: string;
  /** Extra one-liner shown under the name (e.g. tour id, guests). */
  detail?: string | null;
  /** Visual tone — "ok" gold (default), "warn" amber. */
  tone?: "ok" | "warn";
}

/**
 * Inline pill rendered at the component root. Stays in normal flow so it
 * doesn't collide with the fixed overlay in the bottom-right.
 */
export function MountBadge({ name, detail, tone = "ok" }: MountBadgeProps) {
  const enabled = useStudioDebugEnabled();
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
