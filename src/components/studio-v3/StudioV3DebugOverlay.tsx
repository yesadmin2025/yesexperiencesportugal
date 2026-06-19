/**
 * StudioV3DebugOverlay
 * --------------------
 * Lightweight, opt-in debug pill that surfaces the live Studio V3 state
 * (current phase, composerHidden, key picks) directly on the UI for
 * validation. Never renders unless explicitly enabled.
 *
 * Enable via any of:
 *   - URL:        ?debug=studio        (persists in sessionStorage)
 *   - URL off:    ?debug=off
 *   - localStorage: studio-v3-debug = "1"
 *   - env:        VITE_STUDIO_V3_DEBUG = "1"
 *
 * Keyboard: press "D" (with Shift) to toggle at runtime.
 */
import { useEffect, useState } from "react";
import type { StudioV3State } from "./types";

const btnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#FAF8F3",
  border: "1px solid rgba(250,248,243,0.25)",
  borderRadius: 4,
  padding: "0 6px",
  fontSize: 11,
  lineHeight: "16px",
  cursor: "pointer",
};

const STORAGE_KEY = "studio-v3-debug";

function readInitialEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("debug");
    if (q === "studio" || q === "1" || q === "on") {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    if (q === "off" || q === "0") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    if (window.sessionStorage.getItem(STORAGE_KEY) === "1") return true;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* noop */
  }
  if ((import.meta as { env?: Record<string, string> }).env?.VITE_STUDIO_V3_DEBUG === "1") return true;
  return false;
}

interface Props {
  state: StudioV3State;
  composerHidden: boolean;
  reactionActive: boolean;
}

export function StudioV3DebugOverlay({ state, composerHidden, reactionActive }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setEnabled(readInitialEnabled());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        setEnabled((v) => {
          const next = !v;
          try {
            if (next) window.sessionStorage.setItem(STORAGE_KEY, "1");
            else window.sessionStorage.removeItem(STORAGE_KEY);
          } catch {
            /* noop */
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!enabled) return null;

  const rows: Array<[string, string]> = [
    ["phase", state.phase],
    ["composerHidden", composerHidden ? "true" : "false"],
    ["reaction", reactionActive ? "active" : "—"],
    ["firstName", state.firstName || "—"],
    ["pathMode", state.pathMode || "—"],
    ["feeling", state.feeling || "—"],
    ["companions", state.companions || "—"],
    ["rhythm", state.rhythm || "—"],
    ["destination", state.destinationIntent || "—"],
    ["interests", (state.interests ?? []).join(", ") || "—"],
    ["guests", state.guests != null ? String(state.guests) : "—"],
    ["language", state.language || "—"],
    ["occasion", state.occasion || "—"],
    ["investment", state.investment || "—"],
    ["pickup", state.pickup || "—"],
  ];

  return (
    <div
      role="status"
      aria-label="Studio V3 debug"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        color: "#FAF8F3",
        background: "rgba(20, 20, 20, 0.88)",
        border: "1px solid rgba(201, 169, 106, 0.55)",
        borderRadius: 8,
        padding: collapsed ? "6px 10px" : "10px 12px",
        maxWidth: 280,
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
        pointerEvents: "auto",
        userSelect: "text",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: collapsed ? 0 : 6,
        }}
      >
        <strong style={{ color: "#C9A96A", letterSpacing: 1, textTransform: "uppercase", fontSize: 10 }}>
          Studio V3 · debug
        </strong>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            style={btnStyle}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "▢" : "—"}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                window.sessionStorage.removeItem(STORAGE_KEY);
              } catch {
                /* noop */
              }
              setEnabled(false);
            }}
            style={btnStyle}
            aria-label="Close debug"
          >
            ✕
          </button>
        </div>
      </div>
      {!collapsed && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td
                  style={{
                    color: "rgba(250,248,243,0.55)",
                    paddingRight: 8,
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {k}
                </td>
                <td
                  style={{
                    color: k === "composerHidden" && v === "true" ? "#FF8A8A" : "#FAF8F3",
                    fontWeight: k === "phase" || k === "composerHidden" ? 600 : 400,
                    wordBreak: "break-word",
                  }}
                >
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!collapsed && (
        <div style={{ marginTop: 6, fontSize: 10, color: "rgba(250,248,243,0.45)" }}>
          Shift+D toggles · ?debug=off to hide
        </div>
      )}
    </div>
  );
}
