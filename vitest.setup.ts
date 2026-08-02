import "@testing-library/jest-dom/vitest";

// Tell React 19 we're in a test environment so act() works without warnings.
// See: https://react.dev/reference/react/act
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom runs on http://localhost, which the shared analytics traffic-exclusion
// guard (src/lib/analytics-exclusions.ts) intentionally treats as internal.
// Unit tests assert push behaviour, so opt them into the documented QA
// escape hatch. Exclusion logic itself is covered by pure-function tests.
try {
  window.localStorage.setItem("YES_ANALYTICS_FORCE", "1");
} catch {
  /* storage unavailable */
}
