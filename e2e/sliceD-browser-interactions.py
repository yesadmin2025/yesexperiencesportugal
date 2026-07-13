"""
Slice D — Browser Interaction Pass (mocked externals)

Drives the real rendered public flows (Signature, Tailored, Studio V3) at both
1280x1800 and 393x852. All Supabase Edge Function calls, tour_price_tiers
Data-API reads, and Stripe.js are intercepted with deterministic fixtures —
no real Bokun, Stripe, or DB request leaves the sandbox.

Evidence:
  /tmp/browser/sliceD-interactions/screenshots/*.png
  /tmp/browser/sliceD-interactions/report.json

Reproduce:
  python e2e/sliceD-browser-interactions.py
"""

from __future__ import annotations
import asyncio, json, re, time
from pathlib import Path
from playwright.async_api import async_playwright, Route, Page, BrowserContext

BASE = "http://localhost:8080"
OUT  = Path("/tmp/browser/sliceD-interactions")
SHOTS = OUT / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

SUPABASE_HOST = "kqygnqetygcvkaauwbji.supabase.co"

LBL_YOUTH  = "Youth 14-17"
LBL_CHILD  = "Child 6-13"
LBL_INFANT = "Infant 0-5"

QUOTE_TOKEN = "qt_slicedtest_deadbeef"
QUOTE_ID    = "quote_slicedtest_0001"

# ─── Stripe SDK stub (installed as init script; loadStripe returns this) ───
STRIPE_STUB_JS = r"""
(function () {
  function noop() {}
  function el() {
    return { mount: noop, unmount: noop, on: noop, destroy: noop, update: noop };
  }
  function stripeFactory() {
    return {
      elements: function () { return { create: el, getElement: el, update: noop, submit: function(){return Promise.resolve({error:null});} }; },
      initEmbeddedCheckout: function () {
        return Promise.resolve({ mount: noop, unmount: noop, destroy: noop, on: noop });
      },
      confirmPayment:   function () { return Promise.resolve({ error: null }); },
      confirmCardPayment: function () { return Promise.resolve({ error: null }); },
      redirectToCheckout: function () { return Promise.resolve({ error: null }); },
      retrievePaymentIntent: function () { return Promise.resolve({ paymentIntent: { status: 'succeeded' }, error: null }); },
    };
  }
  stripeFactory._registerWrapper = noop;
  stripeFactory.registerAppInfo = noop;
  Object.defineProperty(window, 'Stripe', {
    configurable: true, writable: true, value: stripeFactory,
  });
  window.__stripeStubActive = true;
})();
"""

def build_quote_available(composition):
    ages = composition.get("minorAges", [])
    adults = composition.get("adults", 0)
    lines = [{"bokunCategoryId":"adult","label":"Adult","quantity":adults,
              "unitEur":150.0,"subtotalEur":150.0*adults}]
    def add(cat, label, ages_in, unit):
        if not ages_in: return
        lines.append({
            "bokunCategoryId": cat, "label": label, "ages": ages_in,
            "quantity": len(ages_in), "unitEur": unit,
            "subtotalEur": unit*len(ages_in), "isFree": unit == 0,
        })
    add("youth",  LBL_YOUTH,  [a for a in ages if 14 <= a <= 17], 120.0)
    add("child",  LBL_CHILD,  [a for a in ages if 6  <= a <= 13], 75.0)
    add("infant", LBL_INFANT, [a for a in ages if 0  <= a <= 5],  0.0)
    base_sub = sum(l["subtotalEur"] for l in lines)
    return {
        "quoteId": QUOTE_ID, "quoteToken": QUOTE_TOKEN,
        "expiresAt": "2099-01-01T00:00:00Z",
        "flow": "signature", "source": "bokun-live",
        "commercialProductKey": "sintra-cascais", "commercialMappingId": "map_1",
        "productId":"bkn_prod_1","optionId":"opt_1","availabilityId":"av_1",
        "date":"2099-06-01","startTime":"09:00",
        "pricingRevision":"pr_test",
        "travellerComposition":composition,
        "resolvedGuestMix":{
            "adults": adults,
            "youths":   sum(1 for a in ages if 14<=a<=17),
            "children": sum(1 for a in ages if 6<=a<=13),
            "infants":  sum(1 for a in ages if 0<=a<=5),
            "totalParticipants": adults+len(ages),
        },
        "basePricing":{"lines":lines,"subtotalEur":base_sub},
        "addOnPricing":{"lines":[],"subtotalEur":0.0},
        "finalTotalEur": base_sub, "currency":"EUR",
        "availabilityStatus":"available",
    }

QUOTE_UNSUPPORTED = {
    "availabilityStatus":"unavailable",
    "flow":"signature","commercialProductKey":"sintra-cascais",
    "reason":"age_unsupported","unresolvedAges":[0],
    "message":"This age is not supported for the selected experience.",
}

def build_checkout_response():
    # NOTE: clientSecret + publishableKey MUST be present or the client throws
    # "Embedded checkout unavailable" and toasts a runtime error. Stripe.js is
    # stubbed globally (STRIPE_STUB_JS), so `initEmbeddedCheckout` no-ops
    # cleanly — no Invalid Checkout session at runtime.
    return {
        "sessionId":"cs_test_slicedtest",
        "clientSecret":"cs_test_slicedtest_secret_stub",
        "publishableKey":"pk_test_slicedtest_stubstubstubstubstubstub",
        "url": f"{BASE}/?checkout=stub&session=cs_test_slicedtest",
        "flow":"signature","productName":"Test","submitMessage":"Book",
        "uiMode":"embedded",
        "pricing":{"baseLines":[],"baseSubtotalEur":0,"addOnLines":[],
                   "addOnSubtotalEur":0,"finalTotalEur":0},
        "idempotencyKey":"idem_slicedtest",
    }

BOKUN_AVAIL = {"slots":[],"mapped":False}

def readiness_row(tour_id):
    # MappedBokunPricingCategory contract (src/lib/pricing/bokunCategories.ts):
    # bokunCategoryId, bokunTitle, minAge, maxAge, uiBand, countsTowardCapacity,
    # normallyFree, mappingStatus.
    return {
        "tour_id": tour_id, "pricing_mode":"banded",
        "banded_pricing_enabled": True,
        "synced_from_bokun_at":"2099-01-01T00:00:00Z",
        "bokun_categories":[
            {"bokunCategoryId":"adult","bokunTitle":"Adult","uiBand":"adult",
             "minAge":18,"maxAge":99,"countsTowardCapacity":True,
             "normallyFree":False,"mappingStatus":"confirmed"},
            {"bokunCategoryId":"youth","bokunTitle":LBL_YOUTH,"uiBand":"youth",
             "minAge":14,"maxAge":17,"countsTowardCapacity":True,
             "normallyFree":False,"mappingStatus":"confirmed"},
            {"bokunCategoryId":"child","bokunTitle":LBL_CHILD,"uiBand":"child",
             "minAge":6,"maxAge":13,"countsTowardCapacity":True,
             "normallyFree":False,"mappingStatus":"confirmed"},
            {"bokunCategoryId":"infant","bokunTitle":LBL_INFANT,"uiBand":"infant",
             "minAge":0,"maxAge":5,"countsTowardCapacity":True,
             "normallyFree":True,"mappingStatus":"confirmed"},
        ],
    }

class Fixture:
    def __init__(self): self.reset()
    def reset(self):
        self.quote_calls, self.checkout_calls = [], []
        self.unexpected, self.page_errors = [], []
        self.console_errors, self.failed_requests = [], []
        self.mode = "available"

fx = Fixture()

# Baselined console-noise regexes — pre-existing hydration / dev warnings
# unrelated to Slice D. Runtime checkout errors are NOT filtered here.
CONSOLE_ALLOW = [
    re.compile(r"hydrat", re.I),
    re.compile(r"Warning: Extra attributes from the server", re.I),
    re.compile(r"was not wrapped in act", re.I),
    re.compile(r"Download the React DevTools", re.I),
]

def console_is_baselined(text: str) -> bool:
    return any(rx.search(text) for rx in CONSOLE_ALLOW)

async def install_routes(context: BrowserContext):
    # Stripe.js — serve empty script so page injection succeeds without
    # overwriting the window.Stripe stub the init-script already installed.
    async def stripe_js(route: Route):
        await route.fulfill(status=200, content_type="application/javascript",
                            body="/* stubbed by slice-D fixture */")
    async def stripe_api(route: Route):
        await route.fulfill(status=200, content_type="application/json", body="{}")
    await context.route("https://js.stripe.com/**", stripe_js)
    await context.route("https://api.stripe.com/**", stripe_api)
    await context.route("https://m.stripe.network/**", stripe_api)
    await context.route("https://r.stripe.com/**", stripe_api)

    async def rest_readiness(route: Route):
        req = route.request
        if "tour_price_tiers" in req.url:
            tours = ["sintra-cascais","evora-alentejo","arrabida-wine-allinclusive",
                     "arrabida-boat","tiles-workshop","azeitao-cheese",
                     "troia-comporta","tomar-coimbra","fatima-nazare-obidos",
                     "wild-beaches-picnic"]
            body = json.dumps([readiness_row(t) for t in tours])
            await route.fulfill(status=200, content_type="application/json",
                                headers={"content-range":f"0-{len(tours)-1}/{len(tours)}"}, body=body)
            return
        await route.fulfill(status=200, content_type="application/json",
                            headers={"content-range":"*/0"}, body="[]")

    async def fn_route(route: Route):
        req = route.request
        url = req.url
        try: body = json.loads(req.post_data or "{}")
        except Exception: body = {}

        if url.endswith("/functions/v1/booking-quote"):
            fx.quote_calls.append({"url":url,"body":body})
            if fx.mode == "unsupported":
                await route.fulfill(status=200, content_type="application/json",
                                    body=json.dumps(QUOTE_UNSUPPORTED))
            else:
                comp = body.get("travellerComposition") or {"adults":2,"minorAges":[]}
                await route.fulfill(status=200, content_type="application/json",
                                    body=json.dumps(build_quote_available(comp)))
            return
        # All three flows currently route through create-signature-checkout
        # (Tailored + Studio reuse the same edge fn). Match variants defensively.
        if any(url.endswith(f"/functions/v1/{fn}") for fn in
               ("create-signature-checkout","create-builder-checkout","create-tailored-checkout","create-studio-checkout")):
            fx.checkout_calls.append({"url":url,"body":body})
            await route.fulfill(status=200, content_type="application/json",
                                body=json.dumps(build_checkout_response()))
            return
        if url.endswith("/functions/v1/bokun-availability"):
            await route.fulfill(status=200, content_type="application/json",
                                body=json.dumps(BOKUN_AVAIL))
            return
        fx.unexpected.append({"url":url,"method":req.method,"body":body})
        await route.fulfill(status=599, content_type="application/json",
                            body=json.dumps({"error":"unexpected_supabase_function_call"}))

    await context.route(f"https://{SUPABASE_HOST}/functions/v1/**", fn_route)
    await context.route(f"https://{SUPABASE_HOST}/rest/v1/**", rest_readiness)
    await context.add_init_script(STRIPE_STUB_JS)

def attach_page_listeners(page: Page):
    page.on("pageerror", lambda e: fx.page_errors.append(str(e)[:400]))
    def on_console(msg):
        if msg.type == "error":
            t = msg.text[:300]
            if not console_is_baselined(t):
                fx.console_errors.append(t)
    page.on("console", on_console)
    def on_reqfail(req):
        if req.resource_type in ("image","font","media","stylesheet"): return
        if "stripe.com" in req.url: return  # stubbed; blocked-by-client is expected
        fx.failed_requests.append({"url":req.url,"failure":str(req.failure)[:200]})
    page.on("requestfailed", on_reqfail)

async def click_while_enabled(page: Page, aria_re, max_clicks: int):
    # Re-query on every iteration — DOM may re-render between clicks.
    for _ in range(max_clicks):
        try:
            btn = page.get_by_role("button", name=aria_re).first
            if await btn.count() == 0: return
            await btn.scroll_into_view_if_needed(timeout=1000)
            if await btn.is_disabled(): return
            await btn.click(timeout=1500)
            await page.wait_for_timeout(120)
        except Exception:
            return

async def set_minor_age(page: Page, idx: int, age: int):
    el = page.locator(f"#minor-age-{idx}").first
    await el.wait_for(state="visible", timeout=8000)
    await el.scroll_into_view_if_needed(timeout=1000)
    # Clear then type; blur via Tab so React's controlled onChange commits.
    await el.click()
    await page.keyboard.press("Control+A")
    await page.keyboard.press("Delete")
    await el.type(str(age), delay=20)
    await page.keyboard.press("Tab")
    await page.wait_for_timeout(80)

async def fill_date(page: Page):
    d = page.locator('input[type="date"]').first
    await d.fill("2099-06-01")
    try: await d.blur()
    except Exception: pass

async def wait_for_minor_inputs(page: Page, expected):
    """Poll until visible age inputs equal `expected` (list of ints)."""
    exp = [str(a) for a in expected]
    for _ in range(60):
        vals = await page.evaluate(
            "() => Array.from(document.querySelectorAll('input[id^=\"minor-age-\"]')).map(i => i.value)"
        )
        if vals == exp:
            return True
        await page.wait_for_timeout(100)
    return False

async def read_adults(page: Page) -> int | None:
    return await page.evaluate(
        "() => { const b=document.querySelector('button[aria-label=\"Decrease Adults\"]');"
        " if(!b) return null; const s=b.parentElement.querySelector('span');"
        " return s ? parseInt(s.textContent,10) : null; }"
    )

async def read_minor_count(page: Page) -> int:
    return await page.evaluate(
        "() => document.querySelectorAll('input[id^=\"minor-age-\"]').length"
    )

async def set_adults_to(page: Page, target: int):
    # Deterministic: read the actual value, click ± until it equals target.
    for _ in range(30):
        cur = await read_adults(page)
        if cur is None or cur == target:
            return cur
        aria = "Decrease Adults" if cur > target else "Increase Adults"
        btn = page.get_by_role("button", name=re.compile(f"^{aria}$", re.I)).first
        try:
            if await btn.is_disabled(): return cur
            await btn.click(timeout=1500)
        except Exception:
            return cur
        await page.wait_for_timeout(80)
    return await read_adults(page)

async def set_minor_rows_to(page: Page, target: int):
    for _ in range(30):
        cur = await read_minor_count(page)
        if cur == target:
            return cur
        aria = "Decrease Travellers aged 0" if cur > target else "Increase Travellers aged 0"
        btn = page.get_by_role("button", name=re.compile(aria, re.I)).first
        try:
            if await btn.count() == 0 or await btn.is_disabled():
                return cur
            await btn.click(timeout=1500)
        except Exception:
            return cur
        await page.wait_for_timeout(80)
    return await read_minor_count(page)

async def compose_2_15_8_0(page: Page):
    try:
        await page.get_by_text("Who is travelling?", exact=False).first.scroll_into_view_if_needed(timeout=2000)
    except Exception:
        pass
    await set_adults_to(page, 2)
    await set_minor_rows_to(page, 3)
    await page.wait_for_function(
        "() => document.querySelectorAll('input[id^=\"minor-age-\"]').length === 3",
        timeout=8000,
    )
    await set_minor_age(page, 0, 15)
    await set_minor_age(page, 1, 8)
    await set_minor_age(page, 2, 0)
    await wait_for_minor_inputs(page, [15, 8, 0])
    # Final assertion: adults still == 2 (guard against drift).
    final_adults = await read_adults(page)
    if final_adults != 2:
        await set_adults_to(page, 2)

async def wait_for_quote_composition(page: Page, expected, deadline=6.0):
    t0 = time.time()
    while time.time() - t0 < deadline:
        if fx.quote_calls:
            last = fx.quote_calls[-1]["body"].get("travellerComposition")
            if last == expected:
                return True
        await asyncio.sleep(0.1)
    return False

async def wait_for(cond, deadline=6.0, step=0.1):
    t0 = time.time()
    while time.time()-t0 < deadline:
        if cond(): return True
        await asyncio.sleep(step)
    return False

# ─────────────────────── Signature (unchanged, passing) ────────────────────

async def run_signature(page: Page, viewport: str):
    fx.mode = "available"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    await page.goto(f"{BASE}/tours/sintra-cascais#book", wait_until="domcontentloaded")
    picker = page.get_by_text("Who is travelling?", exact=False).first
    try:
        await picker.wait_for(state="attached", timeout=20000)
        await picker.scroll_into_view_if_needed(timeout=3000)
        await picker.wait_for(state="visible", timeout=5000)
    except Exception as e:
        await page.screenshot(path=str(SHOTS/f"signature-picker-{viewport}-MISSING.png"))
        return {"error":f"picker not present: {e}","viewport":viewport}
    await fill_date(page)
    await compose_2_15_8_0(page)
    # Wait for the debounced quote to carry the fully committed composition.
    composition_committed = await wait_for_quote_composition(
        page, {"adults": 2, "minorAges": [15, 8, 0]}, deadline=8.0
    )
    labels = {
        "Youth":  await page.get_by_text(LBL_YOUTH,  exact=False).count() > 0,
        "Child":  await page.get_by_text(LBL_CHILD,  exact=False).count() > 0,
        "Infant": await page.get_by_text(LBL_INFANT, exact=False).count() > 0,
    }
    await page.screenshot(path=str(SHOTS/f"signature-picker-{viewport}.png"))

    reserve = page.get_by_role("button", name=re.compile(r"Reserve securely", re.I)).first
    await reserve.scroll_into_view_if_needed()
    # Wait until Reserve is enabled (readiness resolved).
    for _ in range(60):
        if not await reserve.is_disabled(): break
        await page.wait_for_timeout(100)
    await reserve.click()
    try:
        await page.wait_for_selector("text=Final details before payment", timeout=5000)
        await page.locator('input[autocomplete="name"]').fill("Test User")
        await page.locator('input[autocomplete="email"]').fill("test@example.com")
        await page.locator('input[autocomplete="tel"]').fill("+351 900 000 000")
        pickup = page.locator('input[placeholder*="Hotel"]')
        if await pickup.count() > 0: await pickup.fill("Test Hotel, Lisbon")
        submit = page.get_by_role("button", name=re.compile(r"Continue to secure checkout", re.I))
        await submit.click()
    except Exception as e:
        return {"error":f"dialog: {e}","viewport":viewport,
                "checkoutCalls":len(fx.checkout_calls)}
    await wait_for(lambda: bool(fx.checkout_calls), 8.0)
    await page.wait_for_timeout(1200)
    await page.screenshot(path=str(SHOTS/f"signature-checkout-{viewport}.png"))

    # Use LAST quote (fully-committed composition), not first (may be stale).
    outgoing = fx.quote_calls[-1]["body"] if fx.quote_calls else None
    cbody = fx.checkout_calls[0]["body"] if fx.checkout_calls else None
    expected = {"adults": 2, "minorAges": [15, 8, 0]}
    return {
        "outgoingComposition": (outgoing or {}).get("travellerComposition"),
        "outgoingCompositionMatchesExpected":
            (outgoing or {}).get("travellerComposition") == expected,
        "compositionCommittedBeforeReserve": composition_committed,
        "labelsVisible": labels,
        "quoteCalls": len(fx.quote_calls),
        "checkoutCalls": len(fx.checkout_calls),
        "checkoutHasQuoteToken": bool(cbody and cbody.get("quoteToken") == QUOTE_TOKEN),
    }

# ─────────────────────── Tailored (full drive) ─────────────────────────────

async def run_tailored(page: Page, viewport: str):
    fx.mode = "available"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    fx.page_errors.clear()
    await page.goto(f"{BASE}/tours/sintra-cascais/tailor", wait_until="domcontentloaded")
    picker = page.get_by_text("Who is travelling?", exact=False).first
    try:
        await picker.wait_for(state="attached", timeout=20000)
        await picker.scroll_into_view_if_needed(timeout=3000)
        await picker.wait_for(state="visible", timeout=5000)
    except Exception:
        await page.screenshot(path=str(SHOTS/f"tailored-picker-{viewport}-MISSING.png"))
        return {"note":"tailor picker not present","viewport":viewport}
    await fill_date(page)
    await compose_2_15_8_0(page)
    composition_committed = await wait_for_quote_composition(
        page, {"adults": 2, "minorAges": [15, 8, 0]}, deadline=8.0
    )

    summary_ok = False
    try:
        summary_text = await page.get_by_text(re.compile(r"Itinerary \(\d+ of \d+\)"), exact=False).first.inner_text(timeout=3000)
        m = re.search(r"Itinerary \((\d+) of", summary_text)
        summary_ok = bool(m and int(m.group(1)) > 0)
    except Exception:
        summary_ok = False

    await page.screenshot(path=str(SHOTS/f"tailored-picker-{viewport}.png"), full_page=False)

    reserve = page.get_by_role("button", name=re.compile(r"Reserve securely", re.I)).first
    if await reserve.count() == 0:
        return {"note":"no reserve button","viewport":viewport,"summaryPopulated":summary_ok}
    await reserve.scroll_into_view_if_needed()
    # Wait for readiness to enable Reserve (mixedFamilyBlocked gate).
    t0 = time.time()
    reserve_enabled = False
    for _ in range(80):
        if not await reserve.is_disabled():
            reserve_enabled = True
            break
        await page.wait_for_timeout(100)
    reserve_enabled_after_ms = int((time.time() - t0) * 1000)
    if not reserve_enabled:
        # Capture readiness diagnostic via visible minor-row hints.
        hints = await page.evaluate(
            "() => Array.from(document.querySelectorAll('[id^=\"minor-age-\"]')).map(i => (i.parentElement?.parentElement?.innerText || '').trim())"
        )
        await page.screenshot(path=str(SHOTS/f"tailored-reserve-BLOCKED-{viewport}.png"))
        return {"error":"reserve never enabled (mixedFamilyBlocked?)",
                "viewport":viewport,
                "summaryPopulated": summary_ok,
                "compositionCommittedBeforeReserve": composition_committed,
                "minorRowHints": hints,
                "reserveEnabledAfterMs": reserve_enabled_after_ms}
    await reserve.click()
    try:
        await page.wait_for_selector("text=Final details before payment", timeout=5000)
        # Fill required dialog fields (dialog has its own date input distinct from outer picker).
        dlg = page.locator('[role="dialog"], form').last
        await page.locator('input[autocomplete="name"]').fill("Test User")
        await page.locator('input[autocomplete="email"]').fill("test@example.com")
        await page.locator('input[autocomplete="tel"]').fill("+351 900 000 000")
        # Fill any date input inside the dialog (Tailored requires it).
        date_inputs = page.locator('input[type="date"]')
        for i in range(await date_inputs.count()):
            try: await date_inputs.nth(i).fill("2099-06-01")
            except Exception: pass
        pickup = page.locator('input[placeholder*="Hotel"]')
        if await pickup.count() > 0: await pickup.fill("Test Hotel, Lisbon")
        await page.screenshot(path=str(SHOTS/f"tailored-final-details-{viewport}.png"))
        await page.get_by_role("button", name=re.compile(r"Continue to secure checkout", re.I)).click()
    except Exception as e:
        await page.screenshot(path=str(SHOTS/f"tailored-final-details-{viewport}-MISSING.png"))
        return {"error":f"dialog: {e}","viewport":viewport,
                "summaryPopulated": summary_ok,
                "checkoutCalls":len(fx.checkout_calls)}
    await wait_for(lambda: bool(fx.checkout_calls), 8.0)
    await page.wait_for_timeout(1500)
    await page.screenshot(path=str(SHOTS/f"tailored-checkout-{viewport}.png"))

    quote_body    = fx.quote_calls[-1]["body"] if fx.quote_calls else None
    checkout_body = fx.checkout_calls[0]["body"] if fx.checkout_calls else None
    quote_resp_mix = build_quote_available((quote_body or {}).get("travellerComposition") or {"adults":2,"minorAges":[15,8,0]})["resolvedGuestMix"]
    labels_visible = {
        "Youth":  await page.get_by_text(LBL_YOUTH,  exact=False).count() > 0,
        "Child":  await page.get_by_text(LBL_CHILD,  exact=False).count() > 0,
        "Infant": await page.get_by_text(LBL_INFANT, exact=False).count() > 0,
    }
    return {
        "summaryPopulated": summary_ok,
        "compositionCommittedBeforeReserve": composition_committed,
        "reserveEnabledAfterMs": reserve_enabled_after_ms,
        "outgoingComposition": (quote_body or {}).get("travellerComposition"),
        "outgoingCompositionMatchesExpected":
            (quote_body or {}).get("travellerComposition") == {"adults":2,"minorAges":[15,8,0]},
        "labelsVisible": labels_visible,
        "totalParticipants": quote_resp_mix["totalParticipants"],
        "quoteCalls": len(fx.quote_calls),
        "checkoutCalls": len(fx.checkout_calls),
        "checkoutHasQuoteToken": bool(checkout_body and checkout_body.get("quoteToken") == QUOTE_TOKEN),
    }

# ─────────────────────── Studio V3 (best-effort drive) ─────────────────────

async def studio_snapshot(page: Page, surface: str):
    """
    Read a canonical snapshot from the currently-rendered Studio surface.
    Returns {commercialProductKey, travellerComposition, orderedStops:[{id,label,sequence}]}
    or {error, phase} if the surface isn't renderable.
    """
    js = r"""
    () => {
      const root = document.querySelector('[data-testid=\"studio-v3-root\"]');
      const phase = root ? root.getAttribute('data-phase') : null;
      const stopEls = Array.from(document.querySelectorAll('[data-stop-id],[data-testid^=\"studio-v3-refine-stop-card\"],[data-testid=\"studio-v3-final-reveal-timeline\"] [data-stop-id]'));
      const seen = new Set();
      const stops = [];
      let seq = 1;
      for (const el of stopEls) {
        const id = el.getAttribute('data-stop-id') || el.getAttribute('data-testid') || '';
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const labelEl = el.querySelector('[data-stop-label]') || el.querySelector('h3,h4,strong') || el;
        const label = (labelEl.textContent || '').trim().split('\n')[0].slice(0, 80);
        stops.push({ id, label, sequence: seq++ });
      }
      return {
        phase,
        commercialProductKey: window.__studioV3CommercialProductKey || 'studio-v3-private-full-day',
        orderedStops: stops,
      };
    }
    """
    try:
        return await page.evaluate(js)
    except Exception as e:
        return {"error": str(e)[:200]}

async def studio_advance_once(page: Page) -> str | None:
    """Click a plausible advance control; return the resulting phase or None."""
    candidates = [
        r"^Continue$", r"^Next$", r"^Generate", r"^See my Signature", r"^Reveal",
        r"Reserve securely", r"Confirm", r"Proceed", r"Continue to",
    ]
    for pat in candidates:
        rx = re.compile(pat, re.I)
        btn = page.get_by_role("button", name=rx).first
        try:
            if await btn.count() and await btn.is_visible() and not await btn.is_disabled():
                await btn.click(timeout=1500)
                await page.wait_for_timeout(400)
                phase = await page.evaluate(
                    "() => { const r=document.querySelector('[data-testid=\"studio-v3-root\"]'); return r?r.getAttribute('data-phase'):null; }"
                )
                return phase
        except Exception:
            continue
    return None

async def studio_pick_first_visible_choice(page: Page):
    """Pick the first visible option button (choice grid, list, etc.)."""
    # Choice grid tiles are usually role=button with distinctive labels; also
    # try radio, listitem, link fallbacks.
    for role in ("button", "radio", "listitem"):
        loc = page.get_by_role(role)
        cnt = await loc.count()
        for i in range(min(cnt, 20)):
            el = loc.nth(i)
            try:
                if not await el.is_visible(): continue
                if await el.is_disabled(): continue
                txt = (await el.inner_text(timeout=500)).strip().lower()
                # Skip nav / chrome
                if any(k in txt for k in ("close", "back", "skip", "menu", "language selector")):
                    continue
                if any(k in txt for k in ("continue", "next", "reveal", "generate", "confirm", "reserve")):
                    continue
                await el.click(timeout=1200)
                await page.wait_for_timeout(300)
                return True
            except Exception:
                continue
    return False

async def run_studio(page: Page, viewport: str):
    fx.mode = "available"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    route = "/studio-v3"
    await page.goto(f"{BASE}{route}", wait_until="domcontentloaded")
    await page.wait_for_timeout(600)

    landed_url = page.url
    if route not in landed_url:
        await page.screenshot(path=str(SHOTS/f"studio-redirect-{viewport}.png"))
        return {"error":"unexpected redirect","route":route,"landedUrl":landed_url}

    # StudioV3Intro is rendered inside StudioV3 with data-testid="studio-v3-root"
    # and data-phase="intro". Walk through: Begin -> Skip -> "Compose it quickly".
    async def click_by_text(pat, timeout=2000):
        try:
            btn = page.get_by_role("button", name=re.compile(pat, re.I)).first
            if await btn.count() and await btn.is_visible():
                await btn.click(timeout=timeout)
                return True
        except Exception: pass
        try:
            el = page.get_by_text(re.compile(pat, re.I)).first
            if await el.count() and await el.is_visible():
                await el.click(timeout=timeout)
                return True
        except Exception: pass
        return False

    async def click_cta(sel, fallback_pat=None):
        # Try native click first; if the page rejects (overlay/hydration race),
        # fall back to force + JS dispatch. Studio intro sometimes needs a
        # bare-metal click to bypass a transient parallax overlay.
        try:
            loc = page.locator(sel).first
            if await loc.count():
                try:
                    await loc.click(timeout=2500)
                except Exception:
                    await loc.click(timeout=2500, force=True)
                return True
        except Exception: pass
        try:
            ok = await page.evaluate(
                "(s) => { const el=document.querySelector(s); if(!el) return false; el.click(); return true; }",
                sel,
            )
            if ok:
                return True
        except Exception: pass
        if fallback_pat:
            return await click_by_text(fallback_pat)
        return False

    intro_steps = []

    # Step 1: Begin — target the data attribute directly.
    clicked_begin = await click_cta('[data-phase-cta="intro-begin"]', r"^Begin$")
    try:
        await page.locator('input[autocomplete="given-name"]').first.wait_for(
            state="visible", timeout=5000
        )
    except Exception:
        pass
    intro_steps.append({"step":"begin","clicked":clicked_begin})

    # Step 2: Skip the name form (there's no data-cta on Skip; text is stable).
    clicked_skip = await click_by_text(r"^Skip$")
    try:
        await page.locator('[data-testid="studio-v3-intro-path"]').first.wait_for(
            state="visible", timeout=5000
        )
    except Exception:
        pass
    intro_steps.append({"step":"skip","clicked":clicked_skip})

    # Step 3: Choose the fast path card ("Compose it quickly").
    clicked_fast = False
    try:
        card = page.locator('[data-phase-cta="intro-path"]').filter(
            has_text=re.compile(r"Compose it quickly", re.I)
        ).first
        if await card.count():
            await card.click(timeout=2500)
            clicked_fast = True
    except Exception:
        pass
    if not clicked_fast:
        clicked_fast = await click_by_text(r"Compose it quickly")
    intro_steps.append({"step":"fast","clicked":clicked_fast})
    await page.wait_for_timeout(700)

    # Wait for phase to leave "intro". studio-v3-root exists during intro too,
    # so gate on data-phase not being "intro".
    phase = "intro"
    for _ in range(80):
        phase = await page.evaluate(
            "() => { const r=document.querySelector('[data-testid=\"studio-v3-root\"]'); return r?r.getAttribute('data-phase'):null; }"
        )
        if phase and phase != "intro":
            break
        await page.wait_for_timeout(100)

    root_mounted = phase not in (None, "intro")
    if not root_mounted:
        headings = await page.evaluate(
            "() => Array.from(document.querySelectorAll('h1,h2,h3')).slice(0,10).map(e => (e.innerText||'').trim())"
        )
        body_excerpt = await page.evaluate(
            "() => (document.body.innerText||'').slice(0, 500)"
        )
        title = await page.title()
        await page.screenshot(path=str(SHOTS/f"studio-root-MISSING-{viewport}.png"))
        return {
            "error":"root-mount-failed (still on intro)",
            "route":route,"landedUrl":landed_url,"phase":phase,
            "introSteps":intro_steps,
            "title":title,"headings":headings,"bodyExcerpt":body_excerpt,
        }

    phase_sequence = [phase]
    snapshots = {"storyboard": None, "final": None, "checkout": None}

    for i in range(40):
        cur_phase = await page.evaluate(
            "() => { const r=document.querySelector('[data-testid=\"studio-v3-root\"]'); return r?r.getAttribute('data-phase'):null; }"
        )
        if cur_phase != phase_sequence[-1]:
            phase_sequence.append(cur_phase or "?")
        phase = cur_phase

        if phase == "storyboard" and not snapshots["storyboard"]:
            snapshots["storyboard"] = await studio_snapshot(page, "storyboard")
            await page.screenshot(path=str(SHOTS/f"studio-storyboard-{viewport}.png"))
        elif phase == "confirmation" and not snapshots["final"]:
            snapshots["final"] = await studio_snapshot(page, "final")
            await page.screenshot(path=str(SHOTS/f"studio-final-{viewport}.png"))
        elif phase == "checkoutSummary" and not snapshots["checkout"]:
            snapshots["checkout"] = await studio_snapshot(page, "checkout")
            await page.screenshot(path=str(SHOTS/f"studio-checkout-{viewport}.png"))
            try:
                reserve = page.locator('[data-testid="studio-v3-checkout-summary-reserve"]').first
                if await reserve.count() and not await reserve.is_disabled():
                    await reserve.click(timeout=2000)
                    await wait_for(lambda: bool(fx.checkout_calls), 6.0)
            except Exception:
                pass
            break

        advanced = await studio_advance_once(page)
        if not advanced or advanced == phase:
            picked = await studio_pick_first_visible_choice(page)
            if picked:
                await studio_advance_once(page)
            else:
                await page.screenshot(path=str(SHOTS/f"studio-deadend-{viewport}-phase-{phase or 'unknown'}.png"))
                break

    equal = (
        snapshots["storyboard"] is not None
        and snapshots["storyboard"] == snapshots["final"] == snapshots["checkout"]
    )
    return {
        "route":route,
        "landedUrl":landed_url,
        "rootMounted":root_mounted,
        "introSteps":intro_steps,
        "phaseSequence": phase_sequence,
        "snapshots": snapshots,
        "equal": equal,
        "commercialProductKey": (snapshots["storyboard"] or {}).get("commercialProductKey"),
        "checkoutCalls": len(fx.checkout_calls),
    }

# ─────────────────────── Unsupported age + mobile bounds ───────────────────

async def run_unsupported(page: Page):
    fx.mode = "unsupported"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    await page.goto(f"{BASE}/tours/sintra-cascais", wait_until="domcontentloaded")
    await page.get_by_text("Who is travelling?", exact=False).first.wait_for(timeout=10000)
    await fill_date(page)
    await click_while_enabled(page, re.compile(r"Increase Adults", re.I), 1)
    await click_while_enabled(page, re.compile(r"Increase Travellers aged 0", re.I), 1)
    await set_minor_age(page, 0, 0)
    await wait_for(lambda: bool(fx.quote_calls), 6.0)
    await page.wait_for_timeout(1000)
    err = await page.get_by_text(re.compile(r"not supported|unavailable", re.I)).count() > 0
    reserve = page.get_by_role("button", name=re.compile(r"Reserve securely", re.I)).first
    disabled = await reserve.is_disabled()
    try: await reserve.click(force=True, timeout=1000)
    except Exception: pass
    await page.wait_for_timeout(400)
    await page.screenshot(path=str(SHOTS/"signature-unsupported-393.png"))
    return {"errorVisible":err,"ctaDisabled":disabled,"checkoutCalls":len(fx.checkout_calls)}

async def check_mobile_bounds(page: Page):
    await page.goto(f"{BASE}/tours/sintra-cascais", wait_until="domcontentloaded")
    await page.get_by_text("Who is travelling?", exact=False).first.wait_for(timeout=10000)
    picker_bb = await page.locator("text=Who is travelling?").first.bounding_box()
    cta_bb    = await page.get_by_role("button", name=re.compile(r"Reserve securely", re.I)).first.bounding_box()
    vp = page.viewport_size
    def inside(bb):
        if not bb: return False
        return bb["x"] >= -1 and bb["x"]+bb["width"] <= vp["width"]+1
    overflow = await page.evaluate(
        "() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"
    )
    return {"pickerInside": inside(picker_bb), "ctaInside": inside(cta_bb),
            "horizontalOverflow": overflow, "viewportWidth": vp["width"]}

# ─────────────────────── main ──────────────────────────────────────────────

async def main():
    report = {"scenarios":{}}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            for label, w, h in (("desktop",1280,1800),("393",393,852)):
                ctx = await browser.new_context(viewport={"width":w,"height":h})
                await install_routes(ctx)
                page = await ctx.new_page()
                attach_page_listeners(page)

                bucket = report["scenarios"].setdefault(label, {})
                bucket["signature"] = await run_signature(page, label)
                bucket["tailored"]  = await run_tailored(page, label)
                bucket["studio"]    = await run_studio(page, label)
                if label == "393":
                    bucket["unsupportedAge"] = await run_unsupported(page)
                    bucket["mobileBounds"]   = await check_mobile_bounds(page)
                await ctx.close()
        finally:
            await browser.close()

    report["pageErrors"] = fx.page_errors
    report["consoleErrors"] = fx.console_errors[:20]
    report["failedRequests"] = fx.failed_requests[:20]
    report["unexpectedSupabaseCalls"] = fx.unexpected
    report["remainingLaunchBlocker"] = "real Stripe sandbox + Bókun test-channel smoke not executed"
    report["screenshots"] = sorted(str(p) for p in SHOTS.glob("*.png"))
    (OUT/"report.json").write_text(json.dumps(report, indent=2, default=str))
    print(json.dumps(report, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main())
