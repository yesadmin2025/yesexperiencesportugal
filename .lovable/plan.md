## Goal
Verify the project has no remaining environment or TypeScript errors outside the known test suite issues, by running the full production build and lint in build mode.

## Steps

1. **Typecheck** — run `tsgo` across the project to surface any TypeScript errors introduced by the recent Studio V3 / stop-intent schema hardening work.
2. **Lint** — run the project's ESLint script (`bun run lint`) and capture any new warnings/errors.
3. **Production build** — run `bun run build` to confirm Vite + TanStack Start compile cleanly for the Worker target (catches SSR/env issues that dev doesn't).
4. **Triage** — for each failure:
   - Classify as (a) environment/config, (b) type error, (c) pre-existing/test-only.
   - Report a concise summary grouped by category, with file + line references.
5. **No code changes** in this pass — this is a verification run only. If real errors surface, I'll propose a follow-up plan to fix them.

## Output
A short report listing:
- Typecheck: pass/fail + error count
- Lint: pass/fail + error/warning count
- Build: pass/fail + first failing step if any
- Any actionable findings beyond the known test failures
