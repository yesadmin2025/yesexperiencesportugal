import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * /e2e/postmessage-probe — end-to-end probe for the
 * RESET_BLANK_CHECK postMessage filter.
 *
 * Dev-only smoke route. Loaded inside the preview iframe (so the real
 * `installResetBlankCheckFilter` has already run via __root.tsx), it:
 *   1. Attaches a downstream "message" listener (bubble phase),
 *   2. Dispatches a battery of postMessage payloads — both the
 *      RESET_BLANK_CHECK marker and unrelated ones,
 *   3. Asserts the marker is swallowed and every unrelated payload
 *      reaches the listener,
 *   4. Renders a deterministic JSON result + visible PASS/FAIL banner.
 *
 * The page exposes `window.__E2E_POSTMESSAGE_RESULT__` so external
 * harnesses (Playwright, browser tool, curl-of-DOM) can read it
 * without scraping. Stable IDs are also used for screenshot/observe.
 */

type Probe = {
  label: string;
  data: unknown;
  /** true → expect listener to receive it; false → expect it swallowed */
  shouldPass: boolean;
};

const PROBES: Probe[] = [
  { label: "string marker", data: "RESET_BLANK_CHECK", shouldPass: false },
  {
    label: "object marker (.type)",
    data: { type: "RESET_BLANK_CHECK" },
    shouldPass: false,
  },
  {
    label: "namespaced object marker",
    data: { type: "lovable:RESET_BLANK_CHECK", payload: 1 },
    shouldPass: false,
  },
  { label: "unrelated string", data: "hello-world", shouldPass: true },
  {
    label: "ROUTE_CHANGE event",
    data: { type: "ROUTE_CHANGE", to: "/about" },
    shouldPass: true,
  },
  { label: "app:ready ping", data: { type: "app:ready", ts: 1 }, shouldPass: true },
  {
    label: "marker only in unrelated key",
    // Filter looks at .type, not arbitrary keys → must pass through
    data: { payload: "RESET_BLANK_CHECK" },
    shouldPass: true,
  },
  { label: "null payload", data: null, shouldPass: true },
  { label: "numeric payload", data: 42, shouldPass: true },
];

type ProbeResult = Probe & { received: boolean; ok: boolean };

declare global {
  interface Window {
    __E2E_POSTMESSAGE_RESULT__?: {
      pass: boolean;
      results: ProbeResult[];
      ranAt: string;
    };
  }
}

function runProbeSync(): ProbeResult[] {
  const received: unknown[] = [];
  const listener = (e: MessageEvent) => received.push(e.data);
  window.addEventListener("message", listener);
  try {
    for (const p of PROBES) {
      window.dispatchEvent(new MessageEvent("message", { data: p.data }));
    }
  } finally {
    window.removeEventListener("message", listener);
  }
  return PROBES.map((p) => {
    const wasReceived = received.some((d) => deepEqual(d, p.data));
    return { ...p, received: wasReceived, ok: wasReceived === p.shouldPass };
  });
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function ProbePage() {
  const [results, setResults] = useState<ProbeResult[] | null>(null);

  useEffect(() => {
    const r = runProbeSync();
    setResults(r);
    window.__E2E_POSTMESSAGE_RESULT__ = {
      pass: r.every((x) => x.ok),
      results: r,
      ranAt: new Date().toISOString(),
    };
  }, []);

  const pass = results?.every((r) => r.ok) ?? null;

  return (
    <main
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "24px",
        maxWidth: 720,
        margin: "0 auto",
        color: "var(--charcoal)",
        background: "var(--ivory)",
        minHeight: "100vh",
      }}
    >
      <h1
        data-testid="probe-status"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: 28,
          margin: 0,
          color: pass === null ? "var(--teal)" : pass ? "var(--teal)" : "#a3271f",
        }}
      >
        {pass === null
          ? "Running…"
          : pass
            ? "PASS — RESET_BLANK_CHECK filter holds"
            : "FAIL — see results"}
      </h1>
      <p style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
        E2E probe for the postMessage noise filter. Read{" "}
        <code>window.__E2E_POSTMESSAGE_RESULT__</code> for machine-readable output.
      </p>
      {results && (
        <table
          data-testid="probe-table"
          style={{
            marginTop: 16,
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #2E2E2E22" }}>
              <th style={{ padding: "6px 4px" }}>Probe</th>
              <th style={{ padding: "6px 4px" }}>Expected</th>
              <th style={{ padding: "6px 4px" }}>Received?</th>
              <th style={{ padding: "6px 4px" }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr
                key={i}
                data-testid={`probe-row-${i}`}
                style={{ borderBottom: "1px solid #2E2E2E11" }}
              >
                <td style={{ padding: "6px 4px" }}>{r.label}</td>
                <td style={{ padding: "6px 4px" }}>{r.shouldPass ? "pass through" : "blocked"}</td>
                <td style={{ padding: "6px 4px" }}>{r.received ? "yes" : "no"}</td>
                <td
                  style={{
                    padding: "6px 4px",
                    color: r.ok ? "var(--teal)" : "#a3271f",
                    fontWeight: 600,
                  }}
                >
                  {r.ok ? "✓" : "✗"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export const Route = createFileRoute("/e2e/postmessage-probe")({
  component: ProbePage,
});
