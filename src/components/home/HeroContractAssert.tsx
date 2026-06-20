/**
 * HeroContractAssert — preview-only automated check.
 *
 * Validates each PHRASE_SCENES entry + PHRASE_GAP_MS against the
 * film-title cadence contract (1200 / ≥3200 / 900 / 400–600).
 *
 * On violation:
 *   • console.error with a structured table of every offender
 *   • renders a fixed bottom banner over the hero
 *   • exposes window.__heroContractViolations for E2E / manual checks
 *
 * Runs only in dev (import.meta.env.DEV) or when ?contract-check=1 is
 * present — never in production. Silent on PASS.
 */

import { useEffect, useState } from "react";
import {
  validateHeroContract,
  type ContractViolation,
  type ContractFix,
  type PhraseTimings,
  HERO_PHRASE_CONTRACT,
} from "@/lib/hero-phrase-contract";

declare global {
  interface Window {
    __heroContractViolations?: ContractViolation[];
    __heroContractAutoFix?: ContractFix[];
  }
}

function shouldRun(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  try {
    return new URLSearchParams(window.location.search).has("contract-check");
  } catch {
    return false;
  }
}

export function HeroContractAssert({
  scenes,
  gapMs,
  autoFixChanges = [],
}: {
  scenes: PhraseTimings[];
  gapMs: number;
  /** Diff produced by autoFixHeroContract when ?contract-fix=1 is on. */
  autoFixChanges?: ContractFix[];
}) {
  const [violations, setViolations] = useState<ContractViolation[]>([]);
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!shouldRun()) return;
    setActive(true);
    const v = validateHeroContract(scenes, gapMs);
    setViolations(v);
    window.__heroContractViolations = v;
    window.__heroContractAutoFix = autoFixChanges;
    if (autoFixChanges.length > 0) {
      console.warn(
        `[hero-contract] AUTO-FIX applied ${autoFixChanges.length} change${autoFixChanges.length === 1 ? "" : "s"}`,
      );

      console.table(autoFixChanges);
    }
    if (v.length > 0) {
      console.error(
        `[hero-contract] ${v.length} violation${v.length === 1 ? "" : "s"} ` +
          `(spec: ${HERO_PHRASE_CONTRACT.fadeInMs}/≥${HERO_PHRASE_CONTRACT.holdMinMs}/` +
          `${HERO_PHRASE_CONTRACT.fadeOutMs}ms · gap ${HERO_PHRASE_CONTRACT.gapMinMs}–${HERO_PHRASE_CONTRACT.gapMaxMs}ms)`,
      );

      console.table(v);
    } else if (autoFixChanges.length === 0) {
      console.info("[hero-contract] PASS — all phrases within contract");
    }
  }, [scenes, gapMs, autoFixChanges]);

  if (!active || dismissed) return null;
  if (violations.length === 0 && autoFixChanges.length === 0) return null;

  const isFixMode = autoFixChanges.length > 0;
  const accent = isFixMode ? "var(--gold)" : "#E58A6B";

  return (
    <div
      role="alert"
      data-hero-contract-violation={violations.length > 0 ? "true" : "false"}
      data-hero-contract-autofix={isFixMode ? "true" : "false"}
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 9999,
        maxHeight: "45vh",
        overflow: "auto",
        background: "rgba(28,12,8,0.96)",
        color: "var(--ivory)",
        border: `1px solid ${accent}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 6,
        padding: "10px 12px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11.5,
        lineHeight: 1.45,
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <strong style={{ color: accent, letterSpacing: "0.08em" }}>
          {isFixMode
            ? `HERO CONTRACT · AUTO-FIX · ${autoFixChanges.length} CHANGE${autoFixChanges.length === 1 ? "" : "S"}`
            : `HERO CONTRACT · ${violations.length} VIOLATION${violations.length === 1 ? "" : "S"}`}
        </strong>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss hero contract banner"
          style={{
            background: "transparent",
            color: "rgba(250,248,243,0.7)",
            border: "1px solid rgba(250,248,243,0.3)",
            borderRadius: 3,
            fontSize: 10,
            letterSpacing: "0.08em",
            padding: "1px 6px",
            cursor: "pointer",
          }}
        >
          DISMISS
        </button>
      </div>
      <div style={{ opacity: 0.75, marginBottom: 6 }}>
        spec: enter {HERO_PHRASE_CONTRACT.fadeInMs}ms · hold ≥{HERO_PHRASE_CONTRACT.holdMinMs}ms ·
        exit {HERO_PHRASE_CONTRACT.fadeOutMs}ms · gap {HERO_PHRASE_CONTRACT.gapMinMs}–
        {HERO_PHRASE_CONTRACT.gapMaxMs}ms (±{HERO_PHRASE_CONTRACT.toleranceMs}ms)
        {!isFixMode && " · append ?contract-fix=1 to auto-clamp"}
      </div>

      {isFixMode && (
        <>
          <div
            style={{ opacity: 0.85, margin: "6px 0 4px", color: accent, letterSpacing: "0.06em" }}
          >
            APPLIED FIXES
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th style={{ padding: "2px 6px" }}>phrase</th>
                <th style={{ padding: "2px 6px" }}>field</th>
                <th style={{ padding: "2px 6px" }}>was</th>
                <th style={{ padding: "2px 6px" }}>now</th>
                <th style={{ padding: "2px 6px" }}>spec</th>
              </tr>
            </thead>
            <tbody>
              {autoFixChanges.map((c, i) => (
                <tr key={`fix-${i}`} style={{ borderTop: "1px solid rgba(250,248,243,0.1)" }}>
                  <td style={{ padding: "2px 6px" }}>{c.phraseIndex < 0 ? "—" : c.phraseIndex}</td>
                  <td style={{ padding: "2px 6px" }}>{c.field}</td>
                  <td style={{ padding: "2px 6px", color: "#E58A6B" }}>{c.actual}ms</td>
                  <td style={{ padding: "2px 6px", color: "#7BD389" }}>{c.fixed}ms</td>
                  <td style={{ padding: "2px 6px", opacity: 0.7 }}>{c.expected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {violations.length > 0 && (
        <>
          <div
            style={{
              opacity: 0.85,
              margin: "6px 0 4px",
              color: "#E58A6B",
              letterSpacing: "0.06em",
            }}
          >
            REMAINING VIOLATIONS
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th style={{ padding: "2px 6px" }}>phrase</th>
                <th style={{ padding: "2px 6px" }}>field</th>
                <th style={{ padding: "2px 6px" }}>actual</th>
                <th style={{ padding: "2px 6px" }}>expected</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(250,248,243,0.1)" }}>
                  <td style={{ padding: "2px 6px" }}>{v.phraseIndex < 0 ? "—" : v.phraseIndex}</td>
                  <td style={{ padding: "2px 6px" }}>{v.field}</td>
                  <td style={{ padding: "2px 6px", color: "#E58A6B" }}>{v.actual}ms</td>
                  <td style={{ padding: "2px 6px" }}>{v.expected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
