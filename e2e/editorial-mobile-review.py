"""Read-only Chromium regression: python3 e2e/editorial-mobile-review.py.
All writes/tracking are blocked; no lead or checkout session is created.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/tmp/browser/editorial')
ROUTES = ['/', '/experiences', '/pt/experiences', '/studio',
          '/portugal-travel-designer', '/corporate', '/about',
          '/tours/arrabida-wine-allinclusive']

async def guard(route):
    url = route.request.url
    if route.request.method not in ['GET', 'HEAD'] or any(x in url for x in [
        'google-analytics.com', 'googletagmanager.com', '/api/public/visit']):
        await route.abort()
    else:
        await route.continue_()

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'pages': [], 'clicks': [], 'failures': []}
    baseline_path = OUT / 'baseline.json'
    baseline = json.loads(baseline_path.read_text()) if baseline_path.exists() else {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for width in [320, 393, 768, 1366]:
            for path in ROUTES:
                context = await browser.new_context(viewport={'width': width, 'height': 852})
                await context.route('**/*', guard)
                page = await context.new_page()
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                response = await page.goto('http://localhost:8080' + path, wait_until='domcontentloaded')
                await page.wait_for_timeout(2200)
                await page.evaluate('''() => {
                  window.__reviewCLS = 0;
                  new PerformanceObserver(l => { for (const e of l.getEntries())
                    if (!e.hadRecentInput) window.__reviewCLS += e.value;
                  }).observe({type:'layout-shift', buffered:true});
                }''')
                for y in range(0, await page.evaluate('document.documentElement.scrollHeight'), 700):
                    await page.evaluate('(y) => window.scrollTo(0,y)', y)
                    await page.wait_for_timeout(100)
                await page.wait_for_timeout(800)
                await page.evaluate('window.scrollTo(0,0)')
                info = await page.evaluate('''() => ({
                  title:document.title,
                  meta:[...document.head.querySelectorAll('meta')].map(x=>x.outerHTML),
                  links:[...document.head.querySelectorAll('link[rel="canonical"],link[rel="alternate"]')].map(x=>x.outerHTML),
                  ld:[...document.querySelectorAll('script[type="application/ld+json"]')].map(x=>x.textContent),
                  h1:[...document.querySelectorAll('h1')].map(x=>x.textContent),
                  overflow:document.documentElement.scrollWidth > innerWidth,
                  height:document.documentElement.scrollHeight, cls:window.__reviewCLS,
                  broken:[...document.images].filter(i=>getComputedStyle(i).display!=='none' && (!i.complete||!i.naturalWidth)).map(i=>i.currentSrc||i.src),
                  cards:[...document.querySelectorAll('article')].map(x=>({
                    title:x.querySelector('h3')?.textContent || x.querySelector('a.serif')?.textContent,
                    price:x.querySelector('[data-price-eur]')?.getAttribute('data-price-eur'),
                    links:[...x.querySelectorAll('a')].map(a=>a.getAttribute('href')),
                    priceY:x.querySelector('[data-price-eur]')?.getBoundingClientRect().top,
                    ctaY:[...x.querySelectorAll('a')].find(a=>/reservar|reserve/i.test(a.textContent))?.getBoundingClientRect().top,
                    highlightY:x.querySelector('ul')?.getBoundingClientRect().top,
                    teaserY:x.querySelector('p.order-last, .experience-card-promise')?.getBoundingClientRect().top,
                    notice:x.innerText.includes('inglês')
                  }))
                })''')
                entry = {'width':width,'path':path,'status':response.status if response else None,
                         'overflow':info['overflow'],'cls':info['cls'],'broken':info['broken'],
                         'errors':errors,'height':info['height']}
                report['pages'].append(entry)
                if info['overflow']: report['failures'].append(f'overflow {width} {path}')
                if errors: report['failures'].append(f'page errors {width} {path}: {errors}')
                if path in baseline:
                    for key in ['title','meta','links','ld','h1']:
                        if info[key] != baseline[path][key]: report['failures'].append(f'protected {key} changed {path}')
                if path in ['/experiences','/pt/experiences']:
                    if len(info['cards']) != 12: report['failures'].append(f'card count {path}')
                    for card in info['cards']:
                        if path.startswith('/pt') or width < 640:
                            if not card['priceY'] < card['ctaY'] < card['teaserY'] <= card['highlightY']:
                                report['failures'].append(f'card order {width} {path} {card["title"]}')
                        if path.startswith('/pt') and not card['notice']: report['failures'].append('PT notice missing')
                    if path in baseline:
                        before = baseline[path]['cards']
                        for index, card in enumerate(info['cards']):
                            if card['links'] != before[index]['links']: report['failures'].append(f'card links changed {path} {index}')
                    (OUT / f'cards-{width}-{path.strip("/").replace("/","-")}.json').write_text(json.dumps(info['cards'],ensure_ascii=False))
                if width in [320,393]:
                    await page.screenshot(path=str(OUT / f'after-{width}-{path.strip("/").replace("/","-") or "home"}.png'))
                await context.close()
        # Real clicks, open and dismissed consent, at both narrow widths.
        for width in [320,393]:
            for path, selector, destination in [
                ('/', '.hero-cta-group a', '/studio'),
                ('/portugal-travel-designer', '.public-page-header a[href="#journey-enquiry"]', '#journey-enquiry'),
                ('/corporate', '.public-page-header a[href^="/contact"]', '/contact')]:
                for closed in [False, True]:
                    context = await browser.new_context(viewport={'width':width,'height':852})
                    await context.route('**/*',guard)
                    page = await context.new_page()
                    await page.goto('http://localhost:8080'+path,wait_until='domcontentloaded')
                    banner = page.locator('[data-cookie-consent-dialog]')
                    await banner.wait_for(state='visible',timeout=20000)
                    await page.wait_for_timeout(1200)
                    if closed:
                        await banner.get_by_role('button',name='Essential only').click()
                        await banner.wait_for(state='hidden')
                    else:
                        buttons = banner.get_by_role('button')
                        for index in range(3):
                            box = await buttons.nth(index).bounding_box()
                            assert box and box['height'] >= 44
                    cta = page.locator(selector).first
                    await cta.evaluate('(el) => el.scrollIntoView({block:"end",behavior:"instant"})')
                    await page.wait_for_timeout(800)
                    box = await cta.bounding_box()
                    banner_box = await banner.bounding_box() if not closed else None
                    assert box and box['y'] >= 0 and box['y']+box['height'] <= (banner_box['y'] if banner_box else 852), (width,path,box,banner_box)
                    await page.screenshot(path=str(OUT / f'cta-{width}-{path.strip("/") or "home"}-{closed}.png'))
                    await cta.click()
                    await page.wait_for_timeout(500)
                    assert destination in page.url, (page.url,destination)
                    report['clicks'].append({'width':width,'path':path,'closed':closed,'url':page.url,'cta':box,'banner':banner_box})
                    await context.close()
        await browser.close()
    (OUT / 'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))
    assert not report['failures'], report['failures']

asyncio.run(main())