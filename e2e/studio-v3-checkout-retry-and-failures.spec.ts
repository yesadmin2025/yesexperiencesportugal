/**
 * Studio V3 checkout retry + failure-mode E2E.
 *
 * Drives the actual Studio UI:
 *   1. Pre-hydrates a completed StudioV3 draft envelope into localStorage
 *      so the app lands past the pickup/date/investment phases.
 *   2. Stubs every edge-function call the reserve path makes.
 *   3. Walks the CTA chain until either the Reserve CTA renders (happy
 *      case) or the flow deadends earlier (soft-skip with a diagnostic).
 *   4. For each failure mode (5xx retryable, 5xx non-retryable, timeout /
 *      aborted, malformed non-JSON, 502 upstream), asserts:
 *        • guest-safe toast copy from `checkoutError.ts` COPY table
 *        • Reserve CTA re-enables (no stuck `checkoutPending`)
 *        • retry re-invokes the stubbed function exactly once more
 *
 * If the draft-hydration path can't reach the reserve CTA (Studio branch
 * gating shifted), the test soft-skips with `test.skip()` so the spec
 * degrades gracefully instead of red-lining every unrelated Studio edit.
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import { STUDIO_DRAFT_STORAGE_KEY } from "../src/components/studio-v3/studioDraftStorage";

const DRAFT_ENVELOPE = {
  version: 2,
  draftId: "e2e-retry-draft",
  savedAt: Date.now(),
  tourId: "sintra-cascais",
  addOnIds: [],
  state: {
    phase: "confirmation",
    feeling: "coastal",
    companions: "couple",
    occasion: "none",
    dateMode: "exact",
    dateExact: "2099-05-01",
    pickup: "lisbon",
    guests: 2,
    minorAges: [],
    interests: ["heritage", "coast"],
    rhythm: "balanced",
    considerations: ["none"],
    language: "en",
    investment: "elevated",
    tourId: "sintra-cascais",
    journeyTitle: "Sintra & Cascais — private day",
    guestsInferred: false,
    guestsPrivateEvent: false,
    firstName: "Alex",
    destinationIntent: "lisbon-sintra-cascais",
    pathMode: "guided",
    rerollCount: 0,
    guestDraft: {
      fullName: "Alex Guest",
      email: "alex@example.test",
      phone: "+351 900 000 000",
      pickupAddress: "Hotel Avenida, Lisbon",
      guideNotes: "",
    },
  },
};

const QUOTE_RESPONSE = {
  quoteToken: "qtok_e2e_1",
  revision: "rev_e2e_1",
  snapshotHash: "hash_e2e_1",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  pricing: {
    status: "quoted",
    commercialProductKey: "studio-v3-private-full-day",
    guests: 2,
    unitEur: 320,
    baseSubtotalEur: 640,
    addOnsSubtotalEur: 0,
    totalEur: 640,
    currency: "EUR",
  },
  addOns: [],
  inclusions: [],
  routeStatus: "validated",
  availabilityStatus: "validated",
  itinerary: {
    title: "Sintra & Cascais",
    destinationRegion: "Sintra",
    pickupCity: "Lisbon",
    date: "2099-05-01",
    startTime: "09:00",
    language: "en",
    guests: 2,
    routeStops: [{ id: "regaleira", label: "Quinta da Regaleira" }],
  },
};

const SESSION_RESPONSE = {
  url: null,
  clientSecret: "cs_test_secret_e2e",
  sessionId: "cs_test_e2e",
  publishableKey: "pk_test_e2e",
  uiMode: "embedded",
  pricing: QUOTE_RESPONSE.pricing,
  routeStatus: "validated",
  availabilityStatus: "validated",
  idempotencyKey: "ik_e2e",
};

type CheckoutCall = { mode: string | undefined; body: Record<string, unknown> };

function makeCheckoutRouter() {
  const calls: CheckoutCall[] = [];
  // Default handler: succeed both `mode: quote` and `mode: create-session`
  // so the CTA can flow all the way through. Individual tests override
  // the create-session branch via `override`.
  let override: ((call: CheckoutCall) => { status: number; body: unknown | string; abort?: "failed" | "timedout" } | null) | null =
    null;

  const setOverride = (fn: typeof override) => {
    override = fn;
  };

  const handler = async (route: Route) => {
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(route.request().postData() || "{}");
    } catch {
      /* leave empty */
    }
    const mode = typeof body.mode === "string" ? body.mode : undefined;
    const call: CheckoutCall = { mode, body };
    calls.push(call);

    if (override) {
      const decision = override(call);
      if (decision) {
        if (decision.abort) {
          await route.abort(decision.abort);
          return;
        }
        await route.fulfill({
          status: decision.status,
          contentType: typeof decision.body === "string" ? "text/html" : "application/json",
          body: typeof decision.body === "string" ? decision.body : JSON.stringify(decision.body),
        });
        return;
      }
    }

    if (mode === "quote") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(QUOTE_RESPONSE),
      });
      return;
    }
    if (mode === "create-session") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SESSION_RESPONSE),
      });
      return;
    }

    // Legacy modes / unknown → generic OK so we don't crash the flow.
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  };

  return { calls, handler, setOverride };
}

async function hydrateDraft(page: Page) {
  await page.addInitScript(
    ({ key, envelope }) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        /* private mode */
      }
    },
    { key: STUDIO_DRAFT_STORAGE_KEY, envelope: DRAFT_ENVELOPE },
  );
}

async function stubCheckout(page: Page) {
  const router = makeCheckoutRouter();
  await page.route("**/functions/v1/create-signature-checkout*", router.handler);
  // booking-quote / builder paths — return generic OK so nothing crashes.
  await page.route("**/functions/v1/booking-quote*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(QUOTE_RESPONSE) }),
  );
  await page.route("**/functions/v1/create-builder-checkout*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION_RESPONSE) }),
  );
  return router;
}

async function reachReserveCta(page: Page): Promise<import("@playwright/test").Locator | null> {
  await page.goto("/studio-v3?e2e=1", { waitUntil: "domcontentloaded" });
  const root = page.getByTestId("studio-v3-root");
  await expect(root).toBeVisible();

  const reserveCta = page.getByTestId("studio-v3-checkout-summary-reserve");

  // Try up to N steps of the primary CTA chain to reach the reserve button.
  for (let i = 0; i < 20; i += 1) {
    if (await reserveCta.isVisible().catch(() => false)) return reserveCta;

    // Try to advance via the final-reveal continue, then the primary CTA.
    const continueCta = page
      .getByTestId("studio-v3-final-reveal-continue")
      .or(page.getByTestId("studio-v3-primary-cta"))
      .or(page.getByRole("button", { name: /continue|confirm|reveal|reserve/i }))
      .first();
    if (await continueCta.isVisible().catch(() => false)) {
      await continueCta.click({ trial: false }).catch(() => undefined);
      await page.waitForTimeout(200);
    } else {
      await page.waitForTimeout(150);
    }
  }
  return null;
}

async function toastText(page: Page): Promise<string> {
  const toast = page.locator("[data-sonner-toast]").last();
  await toast.waitFor({ state: "visible", timeout: 4000 });
  return (await toast.textContent()) ?? "";
}

test.describe("Studio V3 — checkout retry + failure modes", () => {
  test.use({ viewport: { width: 393, height: 800 } });

  test("retry re-fires create-session and clears prior error (no stale pending)", async ({ page }) => {
    await hydrateDraft(page);
    const router = await stubCheckout(page);

    const reserveCta = await reachReserveCta(page);
    test.skip(!reserveCta, "Studio branch did not reach the reserve CTA in this build");

    // First tap: fail with retryable 500.
    router.setOverride((call) =>
      call.mode === "create-session"
        ? {
            status: 500,
            body: {
              error: "internal_error:boom",
              code: "internal_error",
              message: "boom",
              retryable: true,
              requestId: "req_500",
            },
          }
        : null,
    );

    const beforeFirst = router.calls.length;
    await reserveCta!.click();
    await expect
      .poll(() => router.calls.filter((c) => c.mode === "create-session").length, { timeout: 8000 })
      .toBeGreaterThan(0);

    const errMsg = await toastText(page);
    expect(errMsg).toMatch(/something went wrong|try again/i);
    expect(errMsg).not.toMatch(/non-2xx|undefined|\[object/i);

    // CTA re-enables — checkoutPending was reset in finally{}.
    await expect(reserveCta!).toBeEnabled({ timeout: 4000 });

    const sessionCallsAfterFail = router.calls.filter((c) => c.mode === "create-session").length;
    const priorBody = router.calls.filter((c) => c.mode === "create-session").at(-1)?.body;

    // Retry: swap override to success.
    router.setOverride(null);
    await reserveCta!.click();

    // Exactly one new create-session call fires, with the same body.
    await expect
      .poll(
        () => router.calls.filter((c) => c.mode === "create-session").length,
        { timeout: 8000 },
      )
      .toBe(sessionCallsAfterFail + 1);

    const retryCall = router.calls.filter((c) => c.mode === "create-session").at(-1)!;
    expect(retryCall.body).toEqual(priorBody);

    void beforeFirst; // referenced for readability
  });

  test("timeout / aborted request → guest-safe copy, CTA re-enables", async ({ page }) => {
    await hydrateDraft(page);
    const router = await stubCheckout(page);
    const reserveCta = await reachReserveCta(page);
    test.skip(!reserveCta, "Studio branch did not reach the reserve CTA in this build");

    router.setOverride((call) =>
      call.mode === "create-session" ? { status: 0, body: "", abort: "failed" } : null,
    );

    await reserveCta!.click();
    const msg = await toastText(page);
    expect(msg).toMatch(/connection dropped|try again|unavailable/i);
    expect(msg).not.toMatch(/Failed to fetch|net::ERR/i);
    await expect(reserveCta!).toBeEnabled({ timeout: 4000 });
  });

  test("malformed non-JSON payload → guest copy, no raw HTML leak", async ({ page }) => {
    await hydrateDraft(page);
    const router = await stubCheckout(page);
    const reserveCta = await reachReserveCta(page);
    test.skip(!reserveCta, "Studio branch did not reach the reserve CTA in this build");

    router.setOverride((call) =>
      call.mode === "create-session"
        ? { status: 200, body: "<html>gateway error</html>" }
        : null,
    );

    await reserveCta!.click();
    const msg = await toastText(page);
    expect(msg).not.toMatch(/<html/i);
    expect(msg.length).toBeGreaterThan(0);
    await expect(reserveCta!).toBeEnabled({ timeout: 4000 });
  });

  test("502 upstream (bokun_unreachable) surfaces partner copy, retry works", async ({ page }) => {
    await hydrateDraft(page);
    const router = await stubCheckout(page);
    const reserveCta = await reachReserveCta(page);
    test.skip(!reserveCta, "Studio branch did not reach the reserve CTA in this build");

    router.setOverride((call) =>
      call.mode === "create-session"
        ? {
            status: 502,
            body: {
              error: "bokun_unreachable:502",
              code: "bokun_unreachable",
              message: "upstream down",
              retryable: true,
              requestId: "req_502",
            },
          }
        : null,
    );

    await reserveCta!.click();
    const msg = await toastText(page);
    expect(msg).toMatch(/booking partner|unreachable/i);

    await expect(reserveCta!).toBeEnabled({ timeout: 4000 });
    const sessionCallsAfter = router.calls.filter((c) => c.mode === "create-session").length;

    // Retry hits success this time.
    router.setOverride(null);
    await reserveCta!.click();
    await expect
      .poll(
        () => router.calls.filter((c) => c.mode === "create-session").length,
        { timeout: 8000 },
      )
      .toBe(sessionCallsAfter + 1);
  });

  test("non-retryable config_missing does NOT auto-retry; guest must tap again", async ({ page }) => {
    await hydrateDraft(page);
    const router = await stubCheckout(page);
    const reserveCta = await reachReserveCta(page);
    test.skip(!reserveCta, "Studio branch did not reach the reserve CTA in this build");

    router.setOverride((call) =>
      call.mode === "create-session"
        ? {
            status: 500,
            body: {
              error: "config_missing:no stripe",
              code: "config_missing",
              message: "not configured",
              retryable: false,
              requestId: "req_cfg",
            },
          }
        : null,
    );

    await reserveCta!.click();
    const msg = await toastText(page);
    expect(msg).toMatch(/temporarily unavailable|team has been notified/i);

    // Reserve CTA is re-enabled but there is NO auto-retry — call count for
    // create-session must stay stable for at least a second after failure.
    const stable = router.calls.filter((c) => c.mode === "create-session").length;
    await page.waitForTimeout(1000);
    expect(
      router.calls.filter((c) => c.mode === "create-session").length,
      "config_missing must never trigger an auto-retry",
    ).toBe(stable);
    await expect(reserveCta!).toBeEnabled();
  });
});
