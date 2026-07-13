import { chromium } from 'playwright';

const urls = [
  'http://localhost:8080/experiences',
  'http://localhost:8080/pt/experiences',
];

const browser = await chromium.launch({ executablePath: '/bin/chromium', args: ['--no-sandbox'] });
for (const url of urls) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const result = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        offenders.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0,120),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          overflowRight: Math.round(r.right - vw),
        });
      }
    });
    offenders.sort((a,b) => b.overflowRight - a.overflowRight);
    return { vw, scrollWidth: document.documentElement.scrollWidth, offenders: offenders.slice(0, 15) };
  });
  console.log('====', url, '====');
  console.log(JSON.stringify(result, null, 2));
  await page.close();
}
await browser.close();
