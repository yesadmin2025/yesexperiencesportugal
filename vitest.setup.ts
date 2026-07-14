import "@testing-library/jest-dom/vitest";

// Tell React 19 we're in a test environment so act() works without warnings.
// See: https://react.dev/reference/react/act
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
