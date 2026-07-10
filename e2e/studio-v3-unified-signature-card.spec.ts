// E2E — Unified "Your Signature" card.
//
// Locks in the reveal refactor that collapsed the map / story / stops-editor /
// DNA / shaping / price / add-ons islands into ONE cohesive card
// (`data-testid="studio-v3-signature-card"`), AND proves that add-on toggles
// still update `add-ons-total` + `party-total` immediately in the rendered
// HTML — including after expanding/collapsing any of the reveal's
// collapsible sections (Swap pool, Add-moment pool).
//
// Companion to:
//   - studio-v3-add-ons-total.spec.ts           (per-click delta)
//   - studio-v3-add-ons-same-frame.spec.ts      (same-frame update)
//   - studio-v3-add-ons-round-trip.spec.ts      (nav round-trip parity)
//
// This spec asserts the *layout invariant* (single card, QualityScore gone
// from reveal) that the other specs assume implicitly.

import { expect, test } from "@playwright/test";
import {
  parseAddOnsTotalEur,
  parsePartyTotalEur,
  readInteractableAddons,
  walkToReveal,
} from "./studio-v3-walk-to-reveal";

const REVEAL = '[data-testid="studio-v3-reveal"]';
const CARD = '[data-testid="studio-v3-signature-card"]';

test.describe("Studio V3 — unified Signature card", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/studio-v3");
    await walkToReveal(page);
  });

  test("renders exactly one cohesive card containing map, story, add-ons, totals — with locked Refine CTA contract and no retired sections", async ({
    page,
  }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();
    expect(await page.locator(CARD).count()).toBe(1);

    // Product-level screen hook (stable across testid renames).
    await expect(reveal).toHaveAttribute("data-studio-v3-screen", "refine");

    // Every scattered island must now live inside the card.
    await expect(card.locator('[data-testid="studio-v3-reveal-map"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-story-of-day"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-add-ons"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-add-ons-total"]')).toBeVisible();
    await expect(card.locator('[data-testid="studio-v3-party-total"]')).toBeVisible();

    // Editor is guarded — some regions can resolve with zero editable stops.
    const editor = card.locator('[data-testid="studio-v3-stops-editor"]');
    if ((await editor.count()) > 0) {
      await expect(editor.first()).toBeVisible();
    }

    // Refine CTA contract — exactly one visible primary "See my signature
    // story" trigger (desktop inline + mobile sticky are mutually exclusive
    // via responsive display), and exactly one ghost "Ask a curator for
    // help" link.
    const primaryCtas = card
      .getByRole("button", { name: /^See my signature story/i })
      .filter({ has: page.locator(":visible") });
    // Loose visibility check via Playwright's own filter is flaky; fall back
    // to counting visible elements manually.
    const primaryHandles = await card
      .getByRole("button", { name: /^See my signature story/i })
      .all();
    let visiblePrimary = 0;
    for (const h of primaryHandles) {
      if (await h.isVisible().catch(() => false)) visiblePrimary++;
    }
    expect(
      visiblePrimary,
      "Refine must show exactly ONE visible primary CTA (desktop inline OR mobile sticky mirror)",
    ).toBe(1);
    void primaryCtas; // silence unused

    const curator = card.getByRole("button", { name: /Ask a curator for help/i });
    await expect(curator).toBeVisible();

    // Retired sections must NOT render.
    expect(await reveal.locator('[data-testid="studio-v3-quality-score"]').count()).toBe(0);
    expect(await reveal.locator('[data-testid="studio-v3-anchor-hint"]').count()).toBe(0);
    expect(await reveal.locator("text=/Drops to\\s+€/i").count()).toBe(0);
    // "Save my signature" belongs to the Storytelling screen only.
    expect(
      await card.getByRole("button", { name: /Save my signature/i }).count(),
      "Save my signature must not appear on Refine — it belongs to Storytelling",
    ).toBe(0);

    await card.screenshot({ path: "/tmp/browser/unified-card/card.png" });
  });

  test("Included in your day header + Your additions divider ordering and styling", async ({
    page,
  }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }
    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const footnote = card.locator('[data-testid="studio-v3-inclusions-footnote"]').first();
    // Footnote only renders when there is a price + included copy or add-ons.
    if (!(await footnote.isVisible().catch(() => false))) {
      test.skip(true, "inclusions footnote not visible in this region");
    }

    // Header lock — must match INCLUDED_HEADER_REFINE exactly.
    await expect(footnote.getByText("Included in your day", { exact: true })).toBeVisible();

    // Before any add-on toggle: Your additions must not be present.
    expect(
      await footnote.getByText(/Your additions/).count(),
      "Your additions divider must be hidden until an add-on is toggled on",
    ).toBe(0);
    expect(
      await footnote.locator('[data-testid="studio-v3-included-addon-row"]').count(),
    ).toBe(0);

    // Toggle exactly one add-on ON.
    const addons = await readInteractableAddons(page);
    test.skip(addons.length === 0, "no interactable add-ons available");
    const first = addons[0];
    const btn = page
      .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${first.id}"]`)
      .first();
    await btn.scrollIntoViewIfNeeded().catch(() => undefined);
    await btn.click();

    // Divider + row now present.
    const divider = footnote.getByText(/Your additions/).first();
    await expect(divider).toBeVisible();

    const rows = footnote.locator('[data-testid="studio-v3-included-addon-row"]');
    await expect(rows).toHaveCount(1);
    const row = rows.first();
    await expect(row).toHaveAttribute("data-addon-id", first.id);
    await expect(row).toContainText(/\+€\d+/);

    // Ordering: header before divider, divider before row.
    const positions = await footnote.evaluate((root) => {
      const q = (sel: string) => root.querySelector(sel);
      const header = Array.from(root.querySelectorAll("p")).find(
        (el) => (el.textContent ?? "").trim() === "Included in your day",
      );
      const additions = Array.from(root.querySelectorAll("p")).find((el) =>
        /Your additions/.test(el.textContent ?? ""),
      );
      const rowEl = q('[data-testid="studio-v3-included-addon-row"]');
      const pos = (el: Element | null | undefined) =>
        el ? Array.from(root.querySelectorAll("*")).indexOf(el) : -1;
      return {
        header: pos(header),
        additions: pos(additions),
        row: pos(rowEl),
      };
    });
    expect(positions.header).toBeGreaterThanOrEqual(0);
    expect(positions.additions).toBeGreaterThan(positions.header);
    expect(positions.row).toBeGreaterThan(positions.additions);

    // Styling contract — uppercase eyebrow, bold, wide tracking; gold dash
    // and gold bullet on addon row; tabular-nums on price cell.
    const styles = await footnote.evaluate((root) => {
      const additions = Array.from(root.querySelectorAll("p")).find((el) =>
        /Your additions/.test(el.textContent ?? ""),
      );
      const dash = additions?.querySelector("span");
      const row = root.querySelector(
        '[data-testid="studio-v3-included-addon-row"]',
      ) as HTMLElement | null;
      const bullet = row?.querySelector("span[aria-hidden]") as HTMLElement | null;
      const priceCell = row?.querySelector(
        "span.tabular-nums, span[class*='tabular-nums']",
      ) as HTMLElement | null;
      const cs = (el: Element | null | undefined) => (el ? window.getComputedStyle(el) : null);
      const goldToken = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--gold")
        .trim();
      return {
        additionsTransform: cs(additions)?.textTransform ?? "",
        additionsWeight: Number(cs(additions)?.fontWeight ?? "0"),
        additionsLetter: parseFloat(cs(additions)?.letterSpacing ?? "0"),
        dashColor: cs(dash)?.color ?? "",
        bulletBg: cs(bullet)?.backgroundColor ?? "",
        priceTabular: (cs(priceCell)?.fontVariantNumeric ?? "").includes("tabular-nums"),
        priceWeight: Number(cs(priceCell)?.fontWeight ?? "0"),
        goldToken,
      };
    });
    expect(styles.additionsTransform).toBe("uppercase");
    expect(styles.additionsWeight).toBeGreaterThanOrEqual(600);
    expect(styles.additionsLetter).toBeGreaterThan(1);
    // Gold token is a hex; computed color is rgb(...). Both must be non-empty
    // and the dash + bullet must resolve to the SAME computed color.
    expect(styles.goldToken.length).toBeGreaterThan(0);
    expect(styles.dashColor.length).toBeGreaterThan(0);
    expect(styles.bulletBg).toBe(styles.dashColor);
    expect(styles.priceTabular).toBe(true);
    expect(styles.priceWeight).toBeGreaterThanOrEqual(600);

    // Toggle OFF — divider + row disappear.
    await btn.scrollIntoViewIfNeeded().catch(() => undefined);
    await btn.click();
    expect(await footnote.getByText(/Your additions/).count()).toBe(0);
    expect(
      await footnote.locator('[data-testid="studio-v3-included-addon-row"]').count(),
    ).toBe(0);
  });

  test("add-on toggles update totals immediately in the HTML", async ({ page }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const baselineAdd = (await parseAddOnsTotalEur(page)) ?? 0;
    const baselineParty = (await parsePartyTotalEur(page)) ?? 0;

    const addons = (await readInteractableAddons(page)).slice(0, 2);
    test.skip(addons.length === 0, "no interactable add-ons available in this region");

    let prevAdd = baselineAdd;
    let prevParty = baselineParty;
    for (const a of addons) {
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();

      const nowAdd = (await parseAddOnsTotalEur(page)) ?? 0;
      const nowParty = (await parsePartyTotalEur(page)) ?? 0;

      expect(nowAdd, `add-ons-total must grow after selecting ${a.id}`).toBeGreaterThan(prevAdd);
      expect(nowParty, `party-total must grow after selecting ${a.id}`).toBeGreaterThan(prevParty);

      prevAdd = nowAdd;
      prevParty = nowParty;
    }

    // Toggle both back off — totals must return to baseline.
    for (const a of addons) {
      const btn = page
        .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${a.id}"]`)
        .first();
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      await btn.click();
    }

    expect(await parseAddOnsTotalEur(page)).toBe(baselineAdd);
    expect(await parsePartyTotalEur(page)).toBe(baselineParty);
  });

  test("totals stay live after expanding/collapsing reveal sections", async ({ page }) => {
    const reveal = page.locator(REVEAL).first();
    if (!(await reveal.isVisible().catch(() => false))) {
      test.skip(true, "funnel did not reach the reveal");
    }

    const card = page.locator(CARD).first();
    await expect(card).toBeVisible();

    const baselineAdd = (await parseAddOnsTotalEur(page)) ?? 0;
    const baselineParty = (await parsePartyTotalEur(page)) ?? 0;

    // 1) Select one add-on, remember the moved totals.
    const [first] = await readInteractableAddons(page);
    test.skip(!first, "no interactable add-ons available");
    const addBtn = page
      .locator(`[data-testid="studio-v3-add-ons"] button[data-addon-id="${first.id}"]`)
      .first();
    await addBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await addBtn.click();
    const movedAdd = (await parseAddOnsTotalEur(page)) ?? 0;
    const movedParty = (await parsePartyTotalEur(page)) ?? 0;
    expect(movedAdd).toBeGreaterThan(baselineAdd);
    expect(movedParty).toBeGreaterThan(baselineParty);

    // 2) Expand/collapse the Swap pool on the first stop, if present.
    const swap = card.locator('button[aria-label^="Swap "]').first();
    if (await swap.isVisible().catch(() => false)) {
      await swap.scrollIntoViewIfNeeded().catch(() => undefined);
      await swap.click();
      await expect(card.locator('[data-testid="studio-v3-swap-pool"]').first()).toBeVisible();
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);

      await swap.click();
      await expect(card.locator('[data-testid="studio-v3-swap-pool"]')).toHaveCount(0);
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);
    }

    // 3) Expand/collapse the Add-a-moment pool, if present.
    const addMoment = card
      .locator('[data-testid="studio-v3-add-moment"] button[aria-expanded]')
      .first();
    if (await addMoment.isVisible().catch(() => false)) {
      await addMoment.scrollIntoViewIfNeeded().catch(() => undefined);
      await addMoment.click();
      await expect(card.locator('[data-testid="studio-v3-add-pool"]').first()).toBeVisible();
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);

      await addMoment.click();
      await expect(card.locator('[data-testid="studio-v3-add-pool"]')).toHaveCount(0);
      expect(await parseAddOnsTotalEur(page)).toBe(movedAdd);
      expect(await parsePartyTotalEur(page)).toBe(movedParty);
    }

    // 4) Toggle the add-on off — totals return to baseline.
    await addBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await addBtn.click();
    expect(await parseAddOnsTotalEur(page)).toBe(baselineAdd);
    expect(await parsePartyTotalEur(page)).toBe(baselineParty);

    await card.screenshot({ path: "/tmp/browser/unified-card/after-toggles.png" });
  });
});
