/**
 * StudioV3DebugOverlay
 * --------------------
 * Lightweight, opt-in debug pill that surfaces the live Studio V3 state
 * (current phase, composerHidden, key picks) directly on the UI for
 * validation. Never renders unless explicitly enabled.
 *
 * Enable via any of:
 *   - URL:        ?debug=studio        (persists in localStorage)
 *   - URL off:    ?debug=off
 *   - localStorage: studio-v3-debug = "1"
 *   - env:        VITE_STUDIO_V3_DEBUG = "1"
 *
 * Keyboard: press "D" (with Shift) to toggle at runtime.
 */
import { useEffect, useMemo, useState } from "react";
import type { StudioV3State } from "./types";
import { EXPECTED_MOUNTS, useMountRegistry } from "./useStudioDebug";
import { signatureTours } from "@/data/signatureTours";
import {
  INTEREST_TO_STOP_INTENTS,
  interestCoverageFromProfile,
  tourIntentProfile,
} from "@/data/stopIntents";
import { pickPrimaryTourWithFit } from "./curation";

const btnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--ivory)",
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
      window.localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    if (q === "off" || q === "0") {
      window.localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    /* noop */
  }
  if ((import.meta as { env?: Record<string, string> }).env?.VITE_STUDIO_V3_DEBUG === "1")
    return true;
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
  const mounted = useMountRegistry();
  const mountedNames = new Set(mounted.map((m) => m.name));

  useEffect(() => {
    setEnabled(readInitialEnabled());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        setEnabled((v) => {
          const next = !v;
          try {
            if (next) window.localStorage.setItem(STORAGE_KEY, "1");
            else window.localStorage.removeItem(STORAGE_KEY);
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

  // ---- Intent coverage (dev-only): resolve current primary tour +
  //      FitReport so we can visualize why it beat its neighbours. ----
  const intentPanel = useMemo(() => {
    const tour =
      (state.tourId && signatureTours.find((t) => t.id === state.tourId)) || null;
    let fitBundle: ReturnType<typeof pickPrimaryTourWithFit> | null = null;
    if (state.feeling && state.companions) {
      try {
        fitBundle = pickPrimaryTourWithFit(
          state.feeling,
          state.companions,
          (state.interests ?? []) as never,
          state.pickup ?? null,
          state.destinationIntent ?? null,
          0,
          state.rhythm ?? null,
        );
      } catch {
        fitBundle = null;
      }
    }
    const resolvedTour = tour ?? fitBundle?.tour ?? null;
    const profile = resolvedTour ? tourIntentProfile(resolvedTour) : null;
    return { resolvedTour, profile, fitBundle };
  }, [
    state.tourId,
    state.feeling,
    state.companions,
    state.interests,
    state.pickup,
    state.destinationIntent,
    state.rhythm,
  ]);

  if (!enabled) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const rows: Array<[string, string]> = [
    ["phase", state.phase],
    ["viewport", `${vw}×${vh}`],
    ["composerHidden", composerHidden ? "true" : "false"],
    ["reaction", reactionActive ? "active" : "—"],
    ["tourId", state.tourId || "—"],
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
        color: "var(--ivory)",
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
        <strong
          style={{
            color: "var(--gold)",
            letterSpacing: 1,
            textTransform: "uppercase",
            fontSize: 10,
          }}
        >
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
                window.localStorage.removeItem(STORAGE_KEY);
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
                    color: k === "composerHidden" && v === "true" ? "#FF8A8A" : "var(--ivory)",
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
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(201,169,106,0.25)", paddingTop: 6 }}>
          <div
            style={{
              color: "var(--gold)",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontSize: 9,
              marginBottom: 4,
            }}
          >
            Mount checklist
          </div>
          {EXPECTED_MOUNTS.map((exp) => {
            const isExpectedPhase = exp.phases.includes(state.phase);
            const isMounted = mountedNames.has(exp.name);
            let icon = "·";
            let color = "rgba(250,248,243,0.45)";
            let label = "idle";
            if (isMounted) {
              icon = "✓";
              color = "#7FE3A1";
              label = "mounted";
            } else if (isExpectedPhase) {
              icon = "✕";
              color = "#FF8A8A";
              label = `missing (phase=${state.phase})`;
            } else {
              label = `waits for ${exp.phases.join(" / ")}`;
            }
            return (
              <div
                key={exp.name}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  fontSize: 10,
                  lineHeight: 1.35,
                  marginBottom: 2,
                }}
              >
                <span style={{ color, fontWeight: 700, width: 10 }}>{icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{exp.name}</span>
                  <span style={{ opacity: 0.6 }}> · {label}</span>
                  <div style={{ opacity: 0.45, fontSize: 9 }}>{exp.hint}</div>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {!collapsed && intentPanel.resolvedTour && intentPanel.profile && (
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(201,169,106,0.25)", paddingTop: 6 }}>
          <div
            style={{
              color: "var(--gold)",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontSize: 9,
              marginBottom: 4,
            }}
          >
            Intent coverage
          </div>
          <div style={{ fontSize: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{intentPanel.resolvedTour.id}</span>
            <span style={{ opacity: 0.6 }}> · {intentPanel.profile.region}</span>
            {intentPanel.fitBundle && (
              <span style={{ opacity: 0.8 }}>
                {" · score "}
                <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                  {intentPanel.fitBundle.fit.totalScore.toFixed(1)}
                </span>
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
            {intentPanel.profile.dominant.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 3,
                  border: "1px solid rgba(201,169,106,0.55)",
                  color: "var(--gold)",
                }}
              >
                {tag} · {intentPanel.profile!.tags[tag] ?? 0}
              </span>
            ))}
          </div>
          {(state.interests ?? []).length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, opacity: 0.55, marginBottom: 2 }}>
                Guest interests → evidence
              </div>
              {(state.interests ?? []).map((interest) => {
                const known = interest in INTEREST_TO_STOP_INTENTS;
                const cov = known
                  ? interestCoverageFromProfile(intentPanel.profile!, interest as never)
                  : null;
                const fitLine = intentPanel.fitBundle?.fit.coverage.interests.find(
                  (i) => i.interest === interest,
                );
                const strength = cov?.strength ?? "none";
                const color =
                  strength === "strong"
                    ? "#F4E1B5"
                    : strength === "partial"
                      ? "var(--ivory)"
                      : "#FF8A8A";
                return (
                  <div
                    key={interest}
                    style={{ fontSize: 10, lineHeight: 1.35, marginBottom: 2 }}
                  >
                    <span style={{ fontWeight: 600 }}>{interest}</span>
                    <span style={{ color, marginLeft: 6 }}>
                      {strength}
                      {fitLine ? (fitLine.satisfied ? " ✓" : " ✕") : ""}
                    </span>
                    <div style={{ opacity: 0.6, fontSize: 9 }}>
                      {cov && cov.evidence.length > 0
                        ? cov.evidence.join(" · ")
                        : known
                          ? "— no stops carry this intent"
                          : "— no stop-intent mapping"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {intentPanel.fitBundle && intentPanel.fitBundle.topReports.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 9, opacity: 0.55, marginBottom: 2 }}>
                Top candidates
              </div>
              {intentPanel.fitBundle.topReports.map(({ tour: t, fit }) => {
                const dom = tourIntentProfile(t).dominant.slice(0, 3).join(",");
                const sat = fit.coverage.interests.filter((i) => i.satisfied).map((i) => i.interest);
                const miss = fit.coverage.interests.filter((i) => !i.satisfied).map((i) => i.interest);
                const chosen = t.id === intentPanel.resolvedTour!.id;
                return (
                  <div
                    key={t.id}
                    style={{
                      fontSize: 10,
                      lineHeight: 1.35,
                      marginBottom: 2,
                      borderLeft: chosen ? "2px solid var(--gold)" : "2px solid transparent",
                      paddingLeft: 4,
                    }}
                  >
                    <span style={{ fontWeight: chosen ? 700 : 500 }}>{t.id}</span>
                    <span style={{ opacity: 0.7 }}> · {fit.totalScore.toFixed(1)}</span>
                    <div style={{ opacity: 0.55, fontSize: 9 }}>
                      {dom || "—"}
                      {sat.length > 0 ? ` · ✓ ${sat.join(",")}` : ""}
                      {miss.length > 0 ? ` · ✕ ${miss.join(",")}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {intentPanel.fitBundle && intentPanel.fitBundle.filtered.length > 0 && (
            <div>
              <div style={{ fontSize: 9, opacity: 0.55, marginBottom: 2 }}>Filtered out</div>
              {intentPanel.fitBundle.filtered.map(({ tour: t, reason }) => (
                <div key={t.id} style={{ fontSize: 9, opacity: 0.7 }}>
                  <span style={{ color: "#FF8A8A" }}>✕</span> {t.id} · {reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!collapsed && (
        <div style={{ marginTop: 6, fontSize: 10, color: "rgba(250,248,243,0.45)" }}>
          Shift+D toggles · ?debug=off to hide
        </div>
      )}
    </div>
  );
}
