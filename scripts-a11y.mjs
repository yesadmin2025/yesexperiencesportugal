import { JSDOM } from "jsdom";

const ORIGIN = "https://dreamscape-builder-co.lovable.app";
const ROUTES = [
  "/",
  "/about",
  "/experiences",
  "/builder",
  "/proposals",
  "/contact",
  "/corporate",
  "/day-tours",
  "/multi-day",
  "/local-stories",
];

// WCAG / platform thresholds we are enforcing
const RULES = {
  bodyMinPx: 14, // WCAG SC 1.4.4 + readability — body must be ≥ 14 px (16 ideal)
  bodyMinLineHeight: 1.5, // WCAG 1.4.12 Text Spacing
  headingMinLineHeight: 1.0, // headings allowed tighter, but not <1.0
  buttonMinPx: 12, // interactive control text floor (WCAG 2.5.5 + Apple HIG ≥ 11pt ≈ 14.6 px ideal)
  buttonMinLineHeight: 1.2,
  contrastNormal: 4.5, // WCAG AA normal text
  contrastLarge: 3.0, // WCAG AA large text (≥ 18 pt / 24 px, or 14 pt / 18.66 px bold)
};

// sRGB → relative luminance
const lum = (hex) => {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return null;
  const [r, g, b] = m.map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const la = lum(a),
    lb = lum(b);
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

// Convert oklch / rgb / named colors via tiny lookup of project tokens.
// We pull the actual computed background/text colors from the page after we set up jsdom.
const RESOLVED_TOKENS = {}; // filled per page
const resolveColor = (raw, win) => {
  if (!raw) return null;
  raw = raw.trim();
  if (raw.startsWith("#") && (raw.length === 7 || raw.length === 4))
    return raw.length === 4 ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}` : raw;
  // rgb()/rgba()
  const m = raw.match(/^rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1]
      .split(/[ ,/]+/)
      .slice(0, 3)
      .map((n) => parseFloat(n));
    return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  }
  // For oklch and var(), fall back to canvas conversion via a temp element
  try {
    const probe = win.document.createElement("div");
    probe.style.color = raw;
    win.document.body.appendChild(probe);
    const cs = win.getComputedStyle(probe).color;
    probe.remove();
    return resolveColor(cs, win);
  } catch {
    return null;
  }
};

const auditRoute = async (path) => {
  const url = ORIGIN + path;
  const html = await (await fetch(url)).text();
  // Find the bundled CSS link(s) and inline them so jsdom evaluates real cascade
  const cssHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  const cssTexts = await Promise.all(
    cssHrefs.map(async (h) => (await fetch(h.startsWith("http") ? h : ORIGIN + h)).text()),
  );
  const inlinedHtml = html.replace(/<\/head>/i, `<style>${cssTexts.join("\n")}</style></head>`);
  const dom = new JSDOM(inlinedHtml, { pretendToBeVisual: true, runScripts: "outside-only", url });
  const { window } = dom;
  const { document } = window;

  const findings = [];
  const sample = (selector, kind, rules) => {
    const els = [...document.querySelectorAll(selector)];
    els.forEach((el, i) => {
      const cs = window.getComputedStyle(el);
      const fontPx = parseFloat(cs.fontSize) || 0;
      let lh = cs.lineHeight;
      const lhRatio =
        lh === "normal" ? 1.2 : lh.endsWith("px") ? parseFloat(lh) / fontPx : parseFloat(lh);
      const fg = resolveColor(cs.color, window);
      // Walk up to find first non-transparent background
      let bg = null,
        p = el;
      while (p && p !== document.documentElement) {
        const bgRaw = window.getComputedStyle(p).backgroundColor;
        if (bgRaw && !/rgba?\(0,\s*0,\s*0,\s*0\)/.test(bgRaw) && bgRaw !== "transparent") {
          bg = resolveColor(bgRaw, window);
          break;
        }
        p = p.parentElement;
      }
      bg = bg || "#ffffff";
      const ratio = fg && bg ? contrast(fg, bg) : null;
      const isLarge = fontPx >= 24 || (fontPx >= 18.66 && parseInt(cs.fontWeight) >= 700);
      const requiredContrast = isLarge ? RULES.contrastLarge : RULES.contrastNormal;
      const issues = [];
      if (fontPx < rules.minPx) issues.push(`font-size ${fontPx}px < ${rules.minPx}px floor`);
      if (lhRatio && lhRatio < rules.minLh)
        issues.push(`line-height ${lhRatio.toFixed(2)} < ${rules.minLh}`);
      if (ratio != null && ratio < requiredContrast)
        issues.push(
          `contrast ${ratio.toFixed(2)}:1 < ${requiredContrast}:1 (${isLarge ? "large" : "normal"})`,
        );
      if (issues.length)
        findings.push({
          kind,
          idx: i,
          sel: selector,
          sample: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          fontPx,
          lh: lhRatio?.toFixed(2),
          fg,
          bg,
          ratio: ratio?.toFixed(2),
          weight: cs.fontWeight,
          issues,
        });
    });
  };

  sample("h1", "H1", { minPx: 20, minLh: RULES.headingMinLineHeight });
  sample("h2", "H2", { minPx: 18, minLh: RULES.headingMinLineHeight });
  sample("h3", "H3", { minPx: 16, minLh: RULES.headingMinLineHeight });
  sample("p", "BODY", { minPx: RULES.bodyMinPx, minLh: RULES.bodyMinLineHeight });
  sample("button, .hero-cta-button, a[role=button]", "BUTTON", {
    minPx: RULES.buttonMinPx,
    minLh: RULES.buttonMinLineHeight,
  });
  sample(".eyebrow", "EYEBROW", { minPx: RULES.buttonMinPx, minLh: 1.2 });

  return { path, findings };
};

const results = [];
for (const r of ROUTES) {
  try {
    results.push(await auditRoute(r));
  } catch (e) {
    results.push({ path: r, error: String(e) });
  }
}

// Render report
console.log("WCAG TYPOGRAPHY AUDIT");
console.log(
  "Rules: body ≥14px & lh ≥1.5 · headings lh ≥1.0 · buttons ≥12px lh ≥1.2 · contrast AA (4.5:1 normal, 3:1 large)\n",
);
let totalIssues = 0;
for (const r of results) {
  if (r.error) {
    console.log(`❌ ${r.path}: ${r.error}`);
    continue;
  }
  if (!r.findings.length) {
    console.log(`✓ ${r.path}  — no violations`);
    continue;
  }
  console.log(`\n⚠ ${r.path}  — ${r.findings.length} violation${r.findings.length > 1 ? "s" : ""}`);
  // Deduplicate identical findings so the report is readable (same selector + same issues = one row with count)
  const grouped = new Map();
  for (const f of r.findings) {
    const key = `${f.kind}|${f.fontPx}|${f.lh}|${f.ratio}|${f.issues.join(",")}`;
    const prev = grouped.get(key) || { ...f, count: 0 };
    prev.count++;
    grouped.set(key, prev);
  }
  for (const f of grouped.values()) {
    console.log(
      `  ${f.kind.padEnd(7)} ×${String(f.count).padStart(2)}  "${f.sample.padEnd(35).slice(0, 35)}"  ${String(f.fontPx).padStart(5)}px  lh=${f.lh}  ${f.fg}/${f.bg} ${f.ratio}:1`,
    );
    f.issues.forEach((i) => console.log(`           ↳ ${i}`));
  }
  totalIssues += r.findings.length;
}
console.log(
  `\nTOTAL: ${totalIssues} violation${totalIssues === 1 ? "" : "s"} across ${results.length} routes`,
);
