/**
 * FROZEN BRAND TOKENS — single source of truth for YES experiences
 * PORTUGAL brand colors and logo assets.
 *
 * Do NOT edit these values without an explicit brand sign-off. The
 * `src/lib/brand-tokens.test.ts` lock asserts that:
 *
 *   1. Every color here matches the corresponding CSS custom property
 *      declared in `src/styles.css` byte-for-byte.
 *   2. Every logo asset here is exactly the import target used by
 *      `src/components/Logo.tsx`.
 *   3. No other source file hard-codes a brand hex — components MUST
 *      consume the CSS tokens (var(--teal), var(--gold), …) instead.
 *
 * Together these three checks make accidental brand drift impossible:
 * a single edit to a hex or a swapped logo file breaks `bun run test`,
 * and the Hero Copy Lock CI workflow extends to brand drift too.
 */

/**
 * Approved brand palette. Hex values are intentionally uppercase to
 * match the existing `:root` declarations in `src/styles.css`. The
 * lock test is case-sensitive — keep them uppercase here AND in CSS.
 */
export const BRAND_COLORS = {
  teal: "#295B61",
  "teal-2": "#2A7C82",
  gold: "#C9A96A",
  "gold-soft": "#E1CFA6",
  ivory: "#FAF8F3",
  sand: "#F4EFE7",
  charcoal: "#2E2E2E",
  // Deepened from #5A5A5A → #555555 (see styles.css note) so secondary
  // copy on ivory clears 7:1 mobile contrast.
  "charcoal-soft": "#555555",
  "charcoal-deep": "#1F1F1F",
} as const;

export type BrandColorToken = keyof typeof BRAND_COLORS;

/**
 * Approved logo variants. Every entry is the filename of the asset
 * inside `src/assets/`. The Logo component's `SOURCES` map is locked
 * against this object; adding/removing a theme here without updating
 * the component (and vice versa) fails the lock.
 */
export const BRAND_LOGO_VARIANTS = {
  "teal-on-ivory": "yes-logo-approved.png",
  "gold-on-charcoal": "yes-logo-approved-gold-silk.png",
} as const;

export type BrandLogoTheme = keyof typeof BRAND_LOGO_VARIANTS;

/**
 * The default theme returned by `assertBrandLogoTheme` when an invalid
 * value is passed in production. Picked because it is the
 * highest-contrast variant on the most common (light) surface, so a
 * silent fallback is still on-brand.
 */
export const DEFAULT_BRAND_LOGO_THEME: BrandLogoTheme = "teal-on-ivory";

/**
 * The set of valid `BrandLogoTheme` values, derived from
 * `BRAND_LOGO_VARIANTS`. Exported so call sites (forms, settings UIs,
 * URL parsers) can validate against it without re-typing the union.
 */
export const BRAND_LOGO_THEMES = Object.keys(BRAND_LOGO_VARIANTS) as BrandLogoTheme[];

export function isBrandLogoTheme(value: unknown): value is BrandLogoTheme {
  return typeof value === "string" && (BRAND_LOGO_THEMES as readonly string[]).includes(value);
}

/**
 * Runtime guard for any value that is supposed to be a
 * `BrandLogoTheme`. Behaviour:
 *
 *  - Valid value → returned as-is, typed.
 *  - Invalid value → in **dev** (`import.meta.env.DEV`, or NODE_ENV
 *    === "development"/"test"), logs a loud `console.error` AND throws
 *    so the React error boundary surfaces the offending call site. In
 *    **production**, logs a `console.error` and falls back to
 *    `DEFAULT_BRAND_LOGO_THEME` so a stray prop never blanks the page.
 *
 * `componentName` is included in the message so the error points
 * straight at the component that mis-routed the value.
 */
export function assertBrandLogoTheme(value: unknown, componentName = "<unknown>"): BrandLogoTheme {
  if (isBrandLogoTheme(value)) return value;
  const allowed = BRAND_LOGO_THEMES.map((t) => `"${t}"`).join(", ");
  const received =
    value === undefined
      ? "undefined"
      : value === null
        ? "null"
        : `${typeof value} ${JSON.stringify(value)}`;
  const message =
    `[brand-lock] <${componentName}> received an unsupported brand ` +
    `theme: ${received}. Allowed values: ${allowed}.`;

  console.error(message);
  if (isDevEnvironment()) {
    // Throw so React surfaces the failing component in the dev error
    // overlay (or our defaultErrorComponent) instead of silently
    // rendering a fallback theme.
    throw new Error(message);
  }
  return DEFAULT_BRAND_LOGO_THEME;
}

function isDevEnvironment(): boolean {
  // Vite client/SSR — `import.meta.env.DEV` is true in `vite dev`,
  // false in `vite build`. Wrapped in try/catch because some bundlers
  // throw on the bare `import.meta` access in non-ESM contexts.
  try {
    const envFlag = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
    if (typeof envFlag === "boolean") return envFlag;
  } catch {
    /* fall through to NODE_ENV */
  }
  if (typeof process !== "undefined" && process.env) {
    const node = process.env.NODE_ENV;
    return node === "development" || node === "test" || node === undefined;
  }
  return false;
}

/**
 * Files that are EXEMPT from the "no hard-coded brand hex" rule. These
 * are the canonical sources where the hex literally has to live:
 *  - `src/styles.css` declares the CSS custom properties.
 *  - `src/lib/brand-tokens.ts` is this file.
 *  - `src/lib/brand-tokens.test.ts` asserts the values.
 *  - Anything under `src/generated/` is auto-written by build scripts
 *    (e.g. `brand-audit.json`) and re-derived from the same tokens.
 */
export const BRAND_HEX_EXEMPT_PATH_PREFIXES = [
  "src/styles.css",
  "src/lib/brand-tokens.ts",
  "src/lib/brand-tokens.test.ts",
  "src/generated/",
  // Tailwind config mirror — defines color palette from the same tokens.
  "src/tailwind.config.lov.json",
  // Brand QA reference page — intentionally hard-codes the approved
  // palette as the source of truth for the runtime audit script.
  "src/routes/brand-qa.tsx",
  // Contrast regression test — locks the palette hex values so WCAG
  // ratios can be computed without depending on a CSS parser.
  "src/__tests__/homepage-contrast.test.ts",
  // Debug overlays that render the palette hex *as data* on screen.
  "src/components/HeroColorDebugOverlay.tsx",
  // Legacy Studio v2 mood-tint table — the hex literals ARE the data
  // (a lookup map of mood → tint). Studio v2 is deprecated; do not
  // refactor unless the file is removed.
  "src/lib/studio-v2/",
] as const;
