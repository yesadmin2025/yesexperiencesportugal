import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end walkthrough — drives Studio V3 from the cinematic intro all
 * the way through to the Storyboard / Reveal, then validates:
 *
 *   1. The reveal renders (`[data-testid="studio-v3-reveal"]` visible).
 *   2. A real per-guest price block shows (`€` + digits) — never invented.
 *   3. The telemetry event `studio-v3:reveal.validation` fires with
 *      `ok: true` and a resolved `tourId` (the Signature anchor).
 *   4. The same payload lands in the localStorage audit ring buffer
 *      (`studio-v3.audit.buffer.v1`) so the audit dashboard sees it.
 *
 * The walker is generic: it relies on the `data-phase-cta` attribute
 * convention added to every actionable card across the 15 phases. For each
 * iteration it prefers an enabled `[data-phase-cta="continue"]` when at
 * least one choice is already selected; otherwise it clicks the first
 * unselected `[data-phase-cta]` card. This handles single-select,
 * multi-select, calendar bypass ("I'm flexible"), and the tier picker
 * uniformly without phase-specific code.
 */

const PHASE_CTA_PRIMARY = '[data-phase-cta]:not([data-selected="true"])';
const PHASE_CTA_CONTINUE_ENABLED =
  '[data-phase-cta="continue"]:not([data-phase-cta-disabled="true"])';
const STUDIO_ROOT = '[data-testid="studio-v3-root"]';

type CapturedEvent = { kind: string; detail: unknown; ts: number };

async function installTelemetryCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __studioV3Events?: Array<{ kind: string; detail: unknown; ts: number }> };
    w.__studioV3Events = [];
    const kinds = [
      "curation.decision",
      "phase4.timing",
      "reveal.validation",
      "builder.step",
      "reveal.premium",
    ];
    for (const k of kinds) {
      window.addEventListener(`studio-v3:${k}`, (e) => {
        w.__studioV3Events!.push({
          kind: k,
          detail: (e as CustomEvent).detail,
          ts: Date.now(),
        });
      });
    }
  });
}

async function currentPhase(page: Page): Promise<string | null> {
  const root = page.locator(STUDIO_ROOT).first();
  if ((await root.count()) === 0) return "intro";
  return root.getAttribute("data-phase", { timeout: 2_000 }).catch(() => null);
}

async function walkOnce(page: Page): Promise<{ clicked: boolean; via: string }> {
  // Prefer enabled Continue ONLY when at least one selection on this phase
  // is registered (data-selected="true"). On a brand-new multi-select phase
  // we want to pick a choice first, not jump to a disabled / empty Continue.
  const hasSelection = (await page.locator('[data-phase-cta][data-selected="true"]').count()) > 0;
  const cont = page.locator(PHASE_CTA_CONTINUE_ENABLED).first();
  const contVisible = await cont.isVisible().catch(() => false);

  if (contVisible && hasSelection) {
    await cont.click({ timeout: 2_000 });
    return { clicked: true, via: "continue" };
  }

  const choice = page.locator(PHASE_CTA_PRIMARY).first();
  const choiceVisible = await choice.isVisible().catch(() => false);
  if (choiceVisible) {
    // Skip the disabled-Continue placeholder if it happened to be first.
    const kind = await choice.getAttribute("data-phase-cta");
    if (kind === "continue") {
      // Try the next selector to avoid a disabled continue.
      const nonContinue = page
        .locator('[data-phase-cta]:not([data-phase-cta="continue"]):not([data-selected="true"])')
        .first();
      if (await nonContinue.isVisible().catch(() => false)) {
        await nonContinue.click({ timeout: 2_000 });
        return { clicked: true, via: (await nonContinue.getAttribute("data-phase-cta")) ?? "card" };
      }
    }
    await choice.click({ timeout: 2_000 });
    return { clicked: true, via: kind ?? "card" };
  }

  // Last resort: an enabled Continue even without prior selection (e.g.
  // considerations phase, where empty submission is legal).
  if (contVisible) {
    await cont.click({ timeout: 2_000 });
    return { clicked: true, via: "continue-empty" };
  }

  return { clicked: false, via: "none" };
}

test.describe("studio-v3 — full walkthrough to reveal", () => {
  test("walks intro → questions → map → storyboard, fires reveal.validation, shows price", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await installTelemetryCapture(page);
    await page.goto("/studio-v3", { waitUntil: "domcontentloaded" });

    // Reset any stale buffer from a previous session.
    await page.evaluate(() => {
      try {
        window.localStorage.removeItem("studio-v3.audit.buffer.v1");
      } catch {
        /* noop */
      }
    });

    // Wait for the cinematic intro to mount.
    await expect(page.locator('[data-phase-cta="intro-begin"]')).toBeVisible({ timeout: 15_000 });

    const seenPhases = new Set<string>();
    let lastPhase: string | null = null;
    let stuckOnSamePhase = 0;
    let finalPhase: string | null = null;

    for (let i = 0; i < 40; i++) {
      const phase = await currentPhase(page);
      if (phase) seenPhases.add(phase);
      finalPhase = phase;

      if (phase === "storyboard" || phase === "map") {
        // Give MapAwakens its cinematic beat to settle before we click "Hold this journey".
        await page.waitForTimeout(1_400);
        if ((await currentPhase(page)) === "map") {
          const hold = page.locator('[data-phase-cta="hold-journey"]').first();
          if (await hold.isVisible({ timeout: 8_000 }).catch(() => false)) {
            await hold.click();
            await page.waitForTimeout(900);
          }
        }
        if ((await currentPhase(page)) === "storyboard") break;
      }

      const step = await walkOnce(page);
      if (!step.clicked) {
        // Nothing to click — give the phase a beat to settle, then try once more.
        await page.waitForTimeout(700);
        const retry = await walkOnce(page);
        if (!retry.clicked) break;
      }

      await page.waitForTimeout(700);

      // Stuck-detector: if 4 iterations don't change phase, abort cleanly so
      // the failure surfaces a meaningful screenshot.
      if (phase && phase === lastPhase) stuckOnSamePhase++;
      else stuckOnSamePhase = 0;
      lastPhase = phase;
      if (stuckOnSamePhase > 4) break;
    }

    // Diagnostic: dump the walker's path for the trace.
    // eslint-disable-next-line no-console
    console.log("[walker] phases seen:", Array.from(seenPhases).join(" → "));
    // eslint-disable-next-line no-console
    console.log("[walker] final phase:", finalPhase);

    expect(finalPhase, "walker should reach storyboard").toBe("storyboard");

    // ─── 1. Reveal renders ────────────────────────────────────────────────
    const reveal = page.locator('[data-testid="studio-v3-reveal"]').first();
    await expect(reveal).toBeVisible({ timeout: 10_000 });

    // ─── 2. Real price visible (€ + at least 2 digits) ────────────────────
    const priceMatches = page.locator("text=/€\\s?\\d{2,}/");
    expect(await priceMatches.count(), "reveal must display a real per-guest price").toBeGreaterThan(
      0,
    );

    // ─── 3. window CustomEvent reveal.validation fired with ok=true ───────
    type Payload = { ok: boolean; missing: string[]; tourId: string | null };
    const events = await page.evaluate(
      () =>
        ((window as unknown as { __studioV3Events?: CapturedEvent[] }).__studioV3Events ?? []) as {
          kind: string;
          detail: unknown;
          ts: number;
        }[],
    );
    const revealEvents = events.filter((e) => e.kind === "reveal.validation");
    expect(revealEvents.length, "reveal.validation event must fire").toBeGreaterThan(0);
    const okEvent = revealEvents.find((e) => (e.detail as Payload).ok === true);
    expect(okEvent, "at least one reveal.validation must resolve ok=true").toBeTruthy();
    expect(
      (okEvent!.detail as Payload).tourId,
      "ok reveal.validation must carry a resolved tourId",
    ).toBeTruthy();

    // ─── 4. Same payload buffered for the audit dashboard ─────────────────
    const buffer = (await page.evaluate(() => {
      try {
        return JSON.parse(
          window.localStorage.getItem("studio-v3.audit.buffer.v1") ?? "[]",
        ) as Array<{ kind: string; payload: Payload }>;
      } catch {
        return [];
      }
    })) as Array<{ kind: string; payload: Payload }>;
    const bufferedReveal = buffer.find((b) => b.kind === "reveal.validation" && b.payload.ok);
    expect(
      bufferedReveal,
      "audit ring buffer must contain a successful reveal.validation entry",
    ).toBeTruthy();
  });
});

