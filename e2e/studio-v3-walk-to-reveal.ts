// Shared cinematic-funnel walker for Studio V3 E2E specs. Extracted from
// `studio-v3-add-ons-total.spec.ts` so the "walk to reveal" logic stays
// in lockstep across specs that only care about behaviour ON the reveal
// (price card, add-ons total, summary/CTA, exit-intent, …).
//
// Contract:
//   - `walkToReveal(page)` drives the builder from intro until the reveal
//     is mounted (or gives up after a bounded number of steps).
//   - Callers check `[data-testid="studio-v3-reveal"]` visibility and
//     `test.skip(...)` when the funnel didn't reach it — this file is
//     about lightning-in-a-bottle reveal-side contracts, not funnel QA.

import type { Page } from "@playwright/test";

export const PHASE_CTA_PRIMARY = '[data-phase-cta]:not([data-selected="true"])';
export const PHASE_CTA_CONTINUE_ENABLED =
  '[data-phase-cta="continue"]:not([data-phase-cta-disabled="true"])';
export const STUDIO_ROOT = '[data-testid="studio-v3-root"]';

async function currentPhase(page: Page): Promise<string | null> {
  const root = page.locator(STUDIO_ROOT).first();
  if ((await root.count()) === 0) return "intro";
  return root.getAttribute("data-phase", { timeout: 2_000 }).catch(() => null);
}

async function dismissReactionOverlay(page: Page): Promise<void> {
  const overlay = page.locator('button[aria-label="Continue"].fixed.inset-0').first();
  if (await overlay.isVisible({ timeout: 200 }).catch(() => false)) {
    await overlay.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(250);
  }
}

async function safeClick(page: Page, sel: string): Promise<boolean> {
  const el = page.locator(sel).first();
  if (!(await el.isVisible().catch(() => false))) return false;
  await el.scrollIntoViewIfNeeded().catch(() => undefined);
  const clicked = await el.click({ timeout: 2_000 }).then(
    () => true,
    () => false,
  );
  if (clicked) return true;
  return el
    .evaluate((node) => (node as HTMLElement).click())
    .then(
      () => true,
      () => false,
    );
}

// Steering picks — Arrábida is the add-on-rich region, Full rhythm unlocks
// minStops add-ons, and the adaptive wine answer keeps the new refinement
// phase deterministic instead of relying on the first generic option.
const PREFERRED_OPTION_IDS = [
  "wine-food",
  "couple",
  "arrabida-setubal-azeitao",
  "lisbon-airport",
  "elevated",
  "full",
  "wine",
  "gastronomy",
  "coast",
  "wine-cellar-depth",
  "coast-clifftop-views",
  "flexible",
];

async function walkOnce(page: Page): Promise<boolean> {
  const hasSelection = (await page.locator('[data-phase-cta][data-selected="true"]').count()) > 0;
  const contVisible = await page
    .locator(PHASE_CTA_CONTINUE_ENABLED)
    .first()
    .isVisible()
    .catch(() => false);
  if (contVisible && hasSelection) return safeClick(page, PHASE_CTA_CONTINUE_ENABLED);

  for (const id of PREFERRED_OPTION_IDS) {
    const selector = `[data-option-id="${id}"]:not([data-selected="true"])`;
    if (
      await page
        .locator(selector)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return safeClick(page, selector);
    }
  }

  const choice = page.locator(PHASE_CTA_PRIMARY).first();
  if (await choice.isVisible().catch(() => false)) {
    const kind = await choice.getAttribute("data-phase-cta");
    if (kind === "continue") {
      const nonContinue =
        '[data-phase-cta]:not([data-phase-cta="continue"]):not([data-selected="true"])';
      if (
        await page
          .locator(nonContinue)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return safeClick(page, nonContinue);
      }
    }
    return safeClick(page, PHASE_CTA_PRIMARY);
  }
  if (contVisible) return safeClick(page, PHASE_CTA_CONTINUE_ENABLED);
  return advanceGeneric(page);
}

/**
 * Selector-agnostic fallback. Some phases (intro, name form, interstitials)
 * render CTAs without `data-phase-cta`. Rather than stall, look for the
 * conventional forward affordance by testid, then by accessible name, and
 * finally any single enabled button inside the live phase.
 */
export async function advanceGeneric(page: Page, extraTestIds?: string[]): Promise<boolean> {
  const testIds = extraTestIds ?? ["studio-v3-intro-begin", "studio-v3-intro-path-option"];
  for (const id of testIds) {
    const sel = `[data-testid="${id}"]:not([disabled])`;
    if (
      await page
        .locator(sel)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      if (await safeClick(page, sel)) return true;
    }
  }

  const names = [/^begin$/i, /^guided/i, /^continue$/i];
  for (const name of names) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      const disabled = await btn.isDisabled().catch(() => true);
      if (!disabled) {
        const ok = await btn.click({ timeout: 2_000 }).then(
          () => true,
          () => false,
        );
        if (ok) return true;
      }
    }
  }

  // Last resort: exactly one enabled, visible button in the phase surface.
  const scope = page.locator(`${STUDIO_ROOT}, [data-studio-v3-screen]`).first();
  const buttons = scope.locator("button:not([disabled]):visible");
  if ((await buttons.count().catch(() => 0)) === 1) {
    return buttons
      .first()
      .click({ timeout: 2_000 })
      .then(
        () => true,
        () => false,
      );
  }
  return false;
}

/**
 * Deterministic intro handler. The intro is a single `data-phase` ("intro")
 * with three sub-steps (welcome → name → path), so the generic
 * phase-changed heuristic can mis-read it as a stall. Detect the sub-step
 * from the DOM and advance explicitly.
 */
export async function advanceIntro(page: Page): Promise<boolean> {
  if (
    await page
      .locator('[data-phase-cta="intro-begin"]')
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return safeClick(page, '[data-phase-cta="intro-begin"]');
  }
  if (
    await page
      .locator('[data-phase-cta="intro-name"]')
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    const input = page.locator('input[aria-label="Your first name (optional)"]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill("Ana").catch(() => undefined);
    }
    return safeClick(page, '[data-phase-cta="intro-name"]');
  }
  const guided = page
    .locator('[data-phase-cta="intro-path"][data-phase-cta-recommended="true"]')
    .first();
  if (await guided.isVisible().catch(() => false)) {
    return safeClick(page, '[data-phase-cta="intro-path"][data-phase-cta-recommended="true"]');
  }
  if (
    await page
      .locator('[data-phase-cta="intro-path"]')
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return safeClick(page, '[data-phase-cta="intro-path"]');
  }
  return false;
}

/**
 * Linear phase order — mirrors PHASE_ORDER in `src/components/studio-v3/StudioV3.tsx`.
 * Phases can be skipped (irrelevant answers), so "advanced" means the live
 * `data-phase` moved to a STRICTLY LATER index, never merely "changed".
 */
// Mirrors STUDIO_V3_PHASE_ORDER in src/components/studio-v3/curation.ts.
// Studio reform (2026-08): desire before logistics; investment never asked.
export const PHASE_SEQUENCE = [
  "intro",
  "feeling",
  "destination",
  "who",
  "interests",
  "rhythm",
  "refinement",
  // Consolidated logistics beat (date + pickup + party). The legacy
  // standalone phases stay listed after it so saved/deep-linked states that
  // still report them keep a monotonic index for the transition contract.
  "logistics",
  "date",
  "pickup",
  "guests",
  "investment",
  "occasion",
  "considerations",
  "language",
  "map",
  "storyboard",
  "confirmation",
  "guestDetails",
  "checkoutSummary",
] as const;



export type StudioWalkPhase = (typeof PHASE_SEQUENCE)[number];

function phaseIndex(phase: string | null): number {
  return phase ? (PHASE_SEQUENCE as readonly string[]).indexOf(phase) : -1;
}

async function refineVisible(page: Page): Promise<boolean> {
  return page
    .locator('[data-studio-v3-screen="refine"]')
    .first()
    .isVisible()
    .catch(() => false);
}

/**
 * Explicit expected-next-phase contract. After acting on `from`, poll until
 * the Studio reports a later phase (or the Refine screen mounts, which is
 * the walk's terminal state). Returns the phase we landed on, or null when
 * the contract was not satisfied inside `timeout`.
 */
async function waitForPhaseAfter(
  page: Page,
  from: string | null,
  timeout = 6_000,
): Promise<string | null> {
  const fromIdx = phaseIndex(from);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await refineVisible(page)) return "storyboard";
    const now = await currentPhase(page);
    if (phaseIndex(now) > fromIdx) return now;
    await page.waitForTimeout(150);
  }
  return null;
}

/**
 * Storyboard/map moments reel — advance through the moments until the
 * "hold journey" CTA becomes interactive, then commit. Its contract is the
 * Refine screen rather than a phase index bump.
 */
async function playMomentsReel(page: Page): Promise<boolean> {
  await dismissReactionOverlay(page);
  const hold = page.locator('[data-phase-cta="hold-journey"]').first();
  const nextMoment = page.locator('button[aria-label="Next moment"]').first();
  const holdInteractive = () =>
    hold.evaluate((el) => {
      const wrap = el.closest("[aria-hidden]");
      const aria = wrap?.getAttribute("aria-hidden");
      const styles = wrap ? window.getComputedStyle(wrap as Element) : null;
      return aria !== "true" && styles?.pointerEvents !== "none" && styles?.opacity !== "0";
    });
  for (let j = 0; j < 30; j++) {
    if (await holdInteractive().catch(() => false)) break;
    const isDisabled = await nextMoment.isDisabled({ timeout: 200 }).catch(() => true);
    if (!isDisabled) {
      await nextMoment.click({ timeout: 1_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(400);
  if (!(await holdInteractive().catch(() => false))) return false;
  await hold.click({ timeout: 4_000 }).catch(() => undefined);
  return true;
}

/**
 * Intro sub-step contract. The intro is a single `data-phase` ("intro") with
 * three sub-steps (welcome → name → path), so its contract is expressed on
 * the visible `data-phase-cta` instead of the phase index: consume each
 * sub-step, waiting for the CTA identity to change, until the intro is done.
 */
async function introSubStep(page: Page): Promise<string | null> {
  const cta = page.locator('[data-phase-cta^="intro-"]').first();
  if (!(await cta.isVisible().catch(() => false))) return null;
  return cta.getAttribute("data-phase-cta").catch(() => null);
}

async function advanceThroughIntro(page: Page): Promise<boolean> {
  for (let step = 0; step < 4; step++) {
    const before = await introSubStep(page);
    if (before === null) return true; // intro fully consumed
    if (!(await advanceIntro(page))) return false;
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const after = await introSubStep(page);
      if (after !== before) break;
      await page.waitForTimeout(120);
    }
  }
  return (await introSubStep(page)) === null;
}

/**
 * Per-phase action contract. Each entry knows how to act on its phase; the
 * walker then asserts the expected transition instead of retrying blindly.
 * Phases without an entry fall back to the answer/continue heuristic.
 */
const PHASE_ACTIONS: Partial<Record<string, (page: Page) => Promise<boolean>>> = {
  intro: advanceThroughIntro,
  map: playMomentsReel,
  storyboard: playMomentsReel,
};

/**
 * Walk the funnel to the Refine screen using explicit expected-next-phase
 * contracts: act on the current phase, then require the Studio to report a
 * strictly later phase (or Refine) before moving on. Multi-tap phases
 * (answer → continue) get a bounded number of actions; a phase that neither
 * accepts an action nor satisfies its contract stops the walk instead of
 * spinning through a generic retry loop.
 */
export async function walkToReveal(page: Page): Promise<void> {
  let momentRuns = 0;

  for (let i = 0; i < PHASE_SEQUENCE.length * 3; i++) {
    await dismissReactionOverlay(page);
    if (await refineVisible(page)) return;

    const phase = await currentPhase(page);
    if (!phase) return;

    if (phase === "map" || phase === "storyboard") {
      momentRuns += 1;
      if (momentRuns > 3) return;
    }

    const act = PHASE_ACTIONS[phase] ?? walkOnce;
    // Answer phases need up to two taps (select an option, then Continue);
    // the moments reel commits in one. Anything beyond that is a stall.
    const maxActions = phase === "map" || phase === "storyboard" ? 2 : 3;

    let landed: string | null = null;
    let idleActions = 0;
    for (let attempt = 0; attempt < maxActions && landed === null; attempt++) {
      const acted = await act(page);
      if (!acted) {
        idleActions += 1;
        if (idleActions >= 2) break;
        await page.waitForTimeout(300);
        continue;
      }
      idleActions = 0;

      // Short poll: a tap that only records an answer leaves the phase in
      // place, so fall through to the next action rather than burning the
      // full contract budget on it.
      landed = await waitForPhaseAfter(page, phase, attempt === maxActions - 1 ? 8_000 : 1_800);
    }

    if (process.env["STUDIO_WALK_DEBUG"]) {
      console.log(`[walk] ${phase} -> ${landed ?? "STALLED"}`);
    }
    if (landed === null) return;
  }
}

export type Addon = { id: string; eur: number };

export async function readInteractableAddons(page: Page): Promise<Addon[]> {
  const buttons = page.locator(
    '[data-testid="studio-v3-add-ons"] button[data-addon-id]:not([data-state="disabled"])',
  );
  const count = await buttons.count();
  const out: Addon[] = [];
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const id = (await button.getAttribute("data-addon-id")) ?? "";
    const text = (await button.textContent()) ?? "";
    const match = text.match(/\+€(\d+)/);
    if (id && match) out.push({ id, eur: Number(match[1]) });
  }
  return out;
}

export async function addOnsTotalText(page: Page): Promise<string> {
  return (
    (await page.locator('[data-testid="studio-v3-add-ons-total"]').first().textContent()) ?? ""
  );
}

export async function parseAddOnsTotalEur(page: Page): Promise<number | null> {
  const text = await addOnsTotalText(page);
  const match = text.match(/€\s?(\d+)/);
  return match ? Number(match[1]) : null;
}

/** Party-total "investment" line — visible on the price card next to the
 *  guest-count multiplier. Reflects base×guests + addOns×guests. */
export async function parsePartyTotalEur(page: Page): Promise<number | null> {
  const node = page.locator('[data-testid="studio-v3-party-total"]').first();
  if (!(await node.isVisible().catch(() => false))) return null;
  const text = (await node.textContent()) ?? "";
  const match = text.match(/€\s?(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * After `walkToReveal` lands on Refine (phase=storyboard), advance to
 * Storytelling (phase=confirmation) by clicking the Refine primary CTA.
 * Shared across mobile reveal / navigation / a11y specs so the transition
 * stays in lockstep.
 */
export async function advanceRefineToStorytelling(
  page: import("@playwright/test").Page,
): Promise<void> {
  // Stable production contract: the Refine primary CTA carries
  // data-testid="studio-v3-handoff-primary" regardless of its label copy.
  const refineCta = page
    .locator('[data-studio-v3-screen="refine"]')
    .getByTestId("studio-v3-handoff-primary")
    .first();
  if (!(await refineCta.isVisible().catch(() => false))) return;
  await refineCta.scrollIntoViewIfNeeded().catch(() => undefined);
  await refineCta.click({ timeout: 4_000 }).catch(() => undefined);
  await page
    .getByTestId("studio-v3-final-reveal")
    .waitFor({ timeout: 8_000 })
    .catch(() => undefined);
}

/**
 * Drive the funnel all the way to the Guest Details phase.
 *
 * Shared by every spec that needs the bottom of the funnel (checkout,
 * resilience, a11y) so the navigation contract lives in exactly one place.
 * Returns false when the funnel didn't get there — callers `test.skip`.
 */
export async function reachGuestDetails(page: Page): Promise<boolean> {
  await page.goto("/studio-v3");
  await walkToReveal(page);
  await advanceRefineToStorytelling(page);

  const reveal = page.getByTestId("studio-v3-final-reveal");
  await reveal.waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
  if (!(await reveal.isVisible().catch(() => false))) return false;

  const continueCta = page.getByTestId("studio-v3-final-reveal-continue");
  const guestDetails = page.getByTestId("studio-v3-guest-details");

  // The reveal runs a short dissolve before the CTA is interactive; retry the
  // tap a couple of times rather than assuming a single click always lands.
  for (let i = 0; i < 3; i++) {
    await continueCta.scrollIntoViewIfNeeded().catch(() => undefined);
    await continueCta.click({ timeout: 5_000 }).catch(() => undefined);
    const landed = await guestDetails
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (landed) return true;
  }
  return false;
}

export interface GuestFixture {
  fullName?: string;
  email?: string;
  phone?: string;
  pickupAddress?: string;
}

/**
 * Fill the required Guest Details fields with valid values, including a tour
 * date that respects the Studio's three-day lead time (read from the input's
 * own `min`, so the test can never drift from the production rule).
 */
export async function fillGuestDetails(page: Page, fixture: GuestFixture = {}): Promise<void> {
  const form = page.getByTestId("studio-v3-guest-details");
  await form
    .getByLabel(/full name/i)
    .first()
    .fill(fixture.fullName ?? "Ana Test");
  await form
    .getByLabel(/^email/i)
    .first()
    .fill(fixture.email ?? "qa+studio@example.com");
  const phone = form.getByLabel(/phone/i).first();
  if (await phone.isVisible().catch(() => false)) {
    await phone.fill(fixture.phone ?? "+351912345678");
  }
  const pickup = form.getByLabel(/pickup/i).first();
  if (await pickup.isVisible().catch(() => false)) {
    await pickup.fill(fixture.pickupAddress ?? "Hotel Avenida, Lisbon");
  }

  const dateInput = form.locator('input[type="date"]').first();
  if (await dateInput.isVisible().catch(() => false)) {
    const iso = await dateInput.evaluate((el: HTMLInputElement) => {
      const min = el.min ? new Date(el.min + "T00:00:00") : new Date();
      min.setDate(min.getDate() + 7);
      return min.toISOString().slice(0, 10);
    });
    await dateInput.fill(iso);
  }
}
