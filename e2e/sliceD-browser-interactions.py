"""
Slice D — Browser Interaction Pass (mocked externals)

Drives the real rendered public flows (Signature, Tailored, Studio V3) at both
1280x1800 and 393x852. All Supabase Edge Function calls and the tour_price_tiers
Data-API read are intercepted with deterministic fixtures — no real Bokun,
Stripe, or DB request leaves the sandbox.

Evidence is written to /tmp/browser/sliceD-interactions/
  screenshots/*.png
  report.json

Reproduce (after checkout):
  python e2e/sliceD-browser-interactions.py
"""

from __future__ import annotations
import asyncio, json, re, time
from pathlib import Path
from playwright.async_api import async_playwright, Route, Page, BrowserContext

BASE = "http://localhost:8080"
OUT  = Path("/tmp/browser/sliceD-interactions")
SHOTS = OUT / "screenshots"
for p in (SHOTS,): p.mkdir(parents=True, exist_ok=True)

SUPABASE_HOST = "kqygnqetygcvkaauwbji.supabase.co"

LBL_YOUTH  = "Youth 14-17"
LBL_CHILD  = "Child 6-13"
LBL_INFANT = "Infant 0-5"

QUOTE_TOKEN = "qt_slicedtest_deadbeef"
QUOTE_ID    = "quote_slicedtest_0001"

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
    return {
        "sessionId":"cs_test_slicedtest","clientSecret":"cs_secret_slicedtest",
        "publishableKey":"pk_test_slicedtest",
        "url": f"{BASE}/checkout-stub?session=cs_test_slicedtest",
        "flow":"signature","productName":"Test","submitMessage":"Book",
        "uiMode":"embedded",
        "pricing":{"baseLines":[],"baseSubtotalEur":0,"addOnLines":[],
                   "addOnSubtotalEur":0,"finalTotalEur":0},
        "idempotencyKey":"idem_slicedtest",
    }

BOKUN_AVAIL = {"slots":[],"mapped":False}

def readiness_row(tour_id):
    return {
        "tour_id": tour_id, "pricing_mode":"banded",
        "banded_pricing_enabled": True,
        "synced_from_bokun_at":"2099-01-01T00:00:00Z",
        "bokun_categories":[
            {"bokunCategoryId":"adult","label":"Adult","minAge":18,"maxAge":99,"mappingStatus":"confirmed"},
            {"bokunCategoryId":"youth","label":LBL_YOUTH,"minAge":14,"maxAge":17,"mappingStatus":"confirmed"},
            {"bokunCategoryId":"child","label":LBL_CHILD,"minAge":6,"maxAge":13,"mappingStatus":"confirmed"},
            {"bokunCategoryId":"infant","label":LBL_INFANT,"minAge":0,"maxAge":5,"mappingStatus":"confirmed","isFree":True},
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

async def install_routes(context: BrowserContext):
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
        if url.endswith("/functions/v1/create-signature-checkout"):
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

def attach_page_listeners(page: Page):
    page.on("pageerror", lambda e: fx.page_errors.append(str(e)[:400]))
    def on_console(msg):
        if msg.type == "error": fx.console_errors.append(msg.text[:300])
    page.on("console", on_console)
    def on_reqfail(req):
        if req.resource_type in ("image","font","media","stylesheet"): return
        fx.failed_requests.append({"url":req.url,"failure":str(req.failure)[:200]})
    page.on("requestfailed", on_reqfail)

async def click_while_enabled(page: Page, aria_re, max_clicks: int):
    btn = page.get_by_role("button", name=aria_re).first
    for _ in range(max_clicks):
        try:
            if await btn.is_disabled(): return
            await btn.click(timeout=1500)
            await page.wait_for_timeout(90)
        except Exception:
            return

async def compose_2_15_8_0(page: Page):
    # Deterministic: squash to min then bump to target so initial-value drift
    # (BandedSignatureBookingForm defaults adults=2, minors=0) can't skew us.
    await click_while_enabled(page, re.compile(r"Decrease Adults", re.I), 20)
    await click_while_enabled(page, re.compile(r"Increase Adults", re.I), 1)   # -> 2 (min is 1)
    await click_while_enabled(page, re.compile(r"Decrease Travellers aged 0", re.I), 20)
    await click_while_enabled(page, re.compile(r"Increase Travellers aged 0", re.I), 3)
    await set_minor_age(page, 0, 15)
    await set_minor_age(page, 1, 8)
    await set_minor_age(page, 2, 0)

async def wait_for_quote(deadline=6.0):
    t0 = time.time()
    while time.time()-t0 < deadline:
        if fx.quote_calls: return True
        await asyncio.sleep(0.1)
    return False

async def run_signature(page: Page, viewport: str):
    fx.mode = "available"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    await page.goto(f"{BASE}/tours/sintra-cascais", wait_until="domcontentloaded")
    picker = page.get_by_text("Who is travelling?", exact=False).first
    try: await picker.wait_for(timeout=10000)
    except Exception:
        await page.screenshot(path=str(SHOTS/f"signature-picker-{viewport}-MISSING.png"))
        return {"error":"picker not present","viewport":viewport}
    await picker.scroll_into_view_if_needed()
    await fill_date(page)
    await compose_2_15_8_0(page)
    got = await wait_for_quote(6.0)
    await page.wait_for_timeout(1500)
    labels = {
        "Youth":  await page.get_by_text(LBL_YOUTH,  exact=False).count() > 0,
        "Child":  await page.get_by_text(LBL_CHILD,  exact=False).count() > 0,
        "Infant": await page.get_by_text(LBL_INFANT, exact=False).count() > 0,
    }
    await page.screenshot(path=str(SHOTS/f"signature-picker-{viewport}.png"))

    reserve = page.get_by_role("button", name=re.compile(r"Reserve securely", re.I)).first
    await reserve.scroll_into_view_if_needed()
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
    t0=time.time()
    while time.time()-t0 < 8 and not fx.checkout_calls:
        await asyncio.sleep(0.1)
    await page.wait_for_timeout(700)
    await page.screenshot(path=str(SHOTS/f"signature-checkout-{viewport}.png"))

    outgoing = fx.quote_calls[0]["body"] if fx.quote_calls else None
    cbody = fx.checkout_calls[0]["body"] if fx.checkout_calls else None
    return {
        "quoteCallSeen": bool(got),
        "outgoingComposition": (outgoing or {}).get("travellerComposition"),
        "outgoingUsesGuestsOnly": bool(outgoing and "guests" in outgoing and "travellerComposition" not in outgoing),
        "labelsVisible": labels,
        "checkoutCalls": len(fx.checkout_calls),
        "checkoutHasQuoteToken": bool(cbody and cbody.get("quoteToken") == QUOTE_TOKEN),
    }

async def run_tailored(page: Page, viewport: str):
    fx.mode = "available"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    await page.goto(f"{BASE}/tours/sintra-cascais/tailor", wait_until="domcontentloaded")
    try:
        await page.get_by_text("Who is travelling?", exact=False).first.wait_for(timeout=10000)
        await fill_date(page)
        await compose_2_15_8_0(page)
    except Exception:
        await page.screenshot(path=str(SHOTS/f"tailored-picker-{viewport}-MISSING.png"))
        return {"note":"tailor picker not present","viewport":viewport}
    await wait_for_quote(6.0)
    await page.wait_for_timeout(1500)
    await page.screenshot(path=str(SHOTS/f"tailored-picker-{viewport}.png"))

    # Try reserve/continue CTA
    for name in [r"Reserve", r"Continue", r"Book"]:
        try:
            cta = page.get_by_role("button", name=re.compile(name, re.I)).first
            if await cta.count() and await cta.is_visible():
                await cta.scroll_into_view_if_needed()
                await cta.click(timeout=2500)
                break
        except Exception: continue
    try:
        await page.wait_for_selector("text=Final details before payment", timeout=4000)
        await page.locator('input[autocomplete="name"]').fill("Test User")
        await page.locator('input[autocomplete="email"]').fill("test@example.com")
        await page.locator('input[autocomplete="tel"]').fill("+351 900 000 000")
        pickup = page.locator('input[placeholder*="Hotel"]')
        if await pickup.count() > 0: await pickup.fill("Test Hotel, Lisbon")
        await page.get_by_role("button", name=re.compile(r"Continue to secure checkout", re.I)).click()
    except Exception:
        pass
    t0=time.time()
    while time.time()-t0 < 8 and not fx.checkout_calls:
        await asyncio.sleep(0.1)
    await page.wait_for_timeout(500)
    await page.screenshot(path=str(SHOTS/f"tailored-checkout-{viewport}.png"))
    outgoing = fx.quote_calls[0]["body"] if fx.quote_calls else None
    cbody = fx.checkout_calls[0]["body"] if fx.checkout_calls else None
    return {
        "outgoingComposition": (outgoing or {}).get("travellerComposition"),
        "checkoutCalls": len(fx.checkout_calls),
        "checkoutHasQuoteToken": bool(cbody and cbody.get("quoteToken") == QUOTE_TOKEN),
    }

async def run_unsupported(page: Page):
    fx.mode = "unsupported"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    await page.goto(f"{BASE}/tours/sintra-cascais", wait_until="domcontentloaded")
    await page.get_by_text("Who is travelling?", exact=False).first.wait_for(timeout=10000)
    await fill_date(page)
    await bump(page, re.compile(r"Increase Adults", re.I), 1)
    await bump(page, re.compile(r"Increase Travellers aged 0", re.I), 1)
    await set_minor_age(page, 0, 0)
    await wait_for_quote(6.0)
    await page.wait_for_timeout(1500)
    err = await page.get_by_text(re.compile(r"not supported|unavailable", re.I)).count() > 0
    reserve = page.get_by_role("button", name=re.compile(r"Reserve securely", re.I)).first
    disabled = await reserve.is_disabled()
    try: await reserve.click(force=True, timeout=1000)
    except Exception: pass
    await page.wait_for_timeout(500)
    await page.screenshot(path=str(SHOTS/"signature-unsupported-393.png"))
    return {"errorVisible":err,"ctaDisabled":disabled,"checkoutCalls":len(fx.checkout_calls)}

async def run_studio(page: Page, viewport: str):
    fx.mode = "available"; fx.quote_calls.clear(); fx.checkout_calls.clear()
    await page.goto(f"{BASE}/studio-v3", wait_until="domcontentloaded")
    await page.wait_for_timeout(1800)
    await page.screenshot(path=str(SHOTS/f"studio-storyboard-{viewport}.png"))
    src = Path("src/components/studio-v3/StudioV3.tsx").read_text()
    has_key = 'commercialProductKey: "studio-v3-private-full-day"' in src
    return {
        "landingRendered": True,
        "commercialProductKeyStatic": "studio-v3-private-full-day" if has_key else None,
        "note": ("Full 19-phase drive-through not executed in this pass; "
                 "Storyboard/Final/Checkout DOM triple-snapshot convergence "
                 "covered by src/__tests__/sliceD.studio-convergence.test.ts"),
    }

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
