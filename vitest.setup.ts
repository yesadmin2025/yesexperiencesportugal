import "@testing-library/jest-dom/vitest";

// Tell React 19 we're in a test environment so act() works without warnings.
// See: https://react.dev/reference/react/act
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom doesn't implement ResizeObserver; any component that uses it (e.g.
// RefineAccordion measuring content height for its max-height transition)
// would crash under Vitest without a polyfill. Test-environment only —
// production code paths and browser behaviour are unchanged.
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverPolyfill;
}
