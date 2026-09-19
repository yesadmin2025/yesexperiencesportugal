import { pinBrowsersPath } from "/dev-server/scripts/playwright-env.mjs";
pinBrowsersPath();
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: "/opt/ms-playwright/chromium-1223/chrome-linux64/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
const logs = [];
page.on("console", (msg) => logs.push(`${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`pageerror: ${err.message}`));
await page.goto("http://localhost:4322/contact", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/contact-393-full.png", fullPage: true });
await page.screenshot({ path: "/tmp/contact-393-top.png" });

// check horizontal overflow
const overflow = await page.evaluate(() => {
  const docWidth = document.documentElement.scrollWidth;
  const winWidth = window.innerWidth;
  const offenders = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > winWidth + 2 && r.width > 0) {
      offenders.push({ tag: el.tagName, cls: el.className?.toString().slice(0,80), right: r.right, text: el.textContent?.slice(0,40) });
    }
  });
  return { docWidth, winWidth, offenders: offenders.slice(0, 20) };
});
console.log(JSON.stringify(overflow, null, 2));
console.log("---LOGS---");
console.log(logs.join("\n"));
await browser.close();
