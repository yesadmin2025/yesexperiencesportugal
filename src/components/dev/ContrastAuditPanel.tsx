import { useEffect, useMemo, useState } from "react";

/**
 * ContrastAuditPanel — dev-only floating panel that lists every WCAG AA
 * contrast failure inside a given root selector, with the measured ratio
 * and a concrete suggested fix.
 *
 * Designed to be dropped onto pages where we want an on-page audit (e.g.
 * /experiences) without polluting production. It mirrors the math used by
 * ContrastAudit but renders human-readable findings into a fixed panel.
 *
 * Mobile-first: collapses to a small badge in the bottom-right corner;
 * tap to expand into a scrollable report.
 */

type Rgb = { r: number; g: number; b: number; a: number };

function parseColor(str: string): Rgb | null {
  if (!str) return null;
  const m = str.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map((p) => p.trim());
  if (parts.length < 3) return null;
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
  return { r, g, b, a };
}

function relLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function composite(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function resolveBackground(el: Element): Rgb {
  let cur: Element | null = el;
  while (cur) {
    const cs = getComputedStyle(cur);
    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) {
      if (bg.a < 1) return composite(bg, { r: 255, g: 255, b: 255, a: 1 });
      return bg;
    }
    cur = cur.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

function isLargeText(cs: CSSStyleDeclaration): boolean {
  const px = parseFloat(cs.fontSize);
  const weight = parseInt(cs.fontWeight, 10) || 400;
  return px >= 24 || (px >= 18.66 && weight >= 700);
}

function hasDirectText(el: Element): boolean {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim().length > 0) {
      return true;
    }
  }
  return false;
}

/** Build a short, stable selector string for a node (tag + classes + id). */
function describeSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const cls = (el.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((c) => `.${c}`)
    .join("");
  const audit = el.closest("[data-audit]")?.getAttribute("data-audit");
  const scope = audit ? `[data-audit="${audit}"] ` : "";
  return `${scope}${tag}${id}${cls}`.slice(0, 80);
}

/** Suggest a concrete remediation for the finding. */
function suggestFix(ratio: number, required: number, large: boolean): string {
  const gap = required - ratio;
  if (large) {
    if (gap > 1.5)
      return "Use a darker token (e.g. --charcoal) or add a solid surface behind text.";
    return "Bump weight to ≥700 or darken color one step (e.g. --charcoal-soft → --charcoal).";
  }
  if (gap > 2) return "Replace soft token with --charcoal, or place text on --ivory/--sand.";
  if (gap > 0.8)
    return "Darken text one token step, or increase font-size to ≥24px to qualify as large text.";
  return "Slightly darken the foreground (one token step) to clear AA.";
}

type Finding = {
  selector: string;
  ratio: number;
  required: number;
  fg: string;
  bg: string;
  text: string;
  large: boolean;
  fix: string;
};

function audit(root: Element): Finding[] {
  const findings: Finding[] = [];
  const all = root.querySelectorAll("*");
  for (const el of Array.from(all)) {
    if (!hasDirectText(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity) < 0.1) continue;
    if ((el as HTMLElement).getAttribute("aria-hidden") === "true") continue;
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;

    const fg = parseColor(cs.color);
    if (!fg) continue;
    const bg = resolveBackground(el);
    const effectiveFg = fg.a < 1 ? composite(fg, bg) : fg;
    const ratio = contrastRatio(effectiveFg, bg);
    const large = isLargeText(cs);
    const required = large ? 3 : 4.5;
    if (ratio + 0.01 < required) {
      const round = Math.round(ratio * 100) / 100;
      findings.push({
        selector: describeSelector(el),
        ratio: round,
        required,
        fg: cs.color,
        bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        text: (el.textContent ?? "").trim().slice(0, 60),
        large,
        fix: suggestFix(round, required, large),
      });
    }
  }
  return findings;
}

type Props = {
  /** CSS selector for the audit root (defaults to <main> / body). */
  rootSelector?: string;
  /** Panel label shown in the header. */
  label?: string;
};

const STORAGE_KEY_PREFIX = "contrast-audit-panel:open:";

export function ContrastAuditPanel({ rootSelector, label = "Contrast Audit" }: Props) {
  const storageKey = `${STORAGE_KEY_PREFIX}${label}`;
  const [findings, setFindings] = useState<Finding[]>([]);
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [open, storageKey]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const raf = window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const root = (rootSelector && document.querySelector(rootSelector)) || document.body;
        setFindings(audit(root));
      }, 800);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [rootSelector, tick]);

  const summary = useMemo(() => {
    const worst = findings.reduce((m, f) => Math.min(m, f.ratio), Infinity);
    return {
      count: findings.length,
      worst: Number.isFinite(worst) ? worst : null,
    };
  }, [findings]);

  if (!import.meta.env.DEV) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: summary.count === 0 ? "#16a34a" : "#dc2626",
            color: "white",
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 6px 20px -8px rgba(0,0,0,0.4)",
            border: "none",
          }}
          aria-label="Open contrast audit panel"
        >
          {summary.count === 0
            ? `✓ ${label}`
            : `⚠ ${label} · ${summary.count} fail${summary.count === 1 ? "" : "s"}`}
        </button>
      ) : (
        <div
          role="dialog"
          aria-label={label}
          style={{
            width: 340,
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: 12,
            boxShadow: "0 18px 50px -12px rgba(0,0,0,0.6)",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              background: "#111827",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
              {label}{" "}
              <span style={{ opacity: 0.6, fontWeight: 500 }}>
                · {summary.count} fail{summary.count === 1 ? "" : "s"}
                {summary.worst !== null ? ` · worst ${summary.worst}:1` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setTick((t) => t + 1)}
                style={panelBtn}
                aria-label="Re-run audit"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={panelBtn}
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
          </header>
          <div style={{ overflowY: "auto", padding: 8, fontSize: 11, lineHeight: 1.45 }}>
            {findings.length === 0 ? (
              <div style={{ padding: 12, color: "#86efac" }}>
                ✅ No AA failures detected in this scope.
              </div>
            ) : (
              findings.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: 8,
                    marginBottom: 6,
                    background: "rgba(255,255,255,0.04)",
                    borderLeft: `3px solid ${f.ratio < f.required - 1.5 ? "#dc2626" : "#f59e0b"}`,
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <code style={{ fontSize: 10, opacity: 0.85, wordBreak: "break-all" }}>
                      {f.selector}
                    </code>
                    <span style={{ fontWeight: 700, color: "#fca5a5", whiteSpace: "nowrap" }}>
                      {f.ratio}:1 / {f.required}:1
                    </span>
                  </div>
                  {f.text && (
                    <div style={{ marginTop: 4, opacity: 0.75, fontStyle: "italic" }}>
                      "{f.text}"
                    </div>
                  )}
                  <div style={{ marginTop: 4, display: "flex", gap: 8, opacity: 0.7 }}>
                    <span>fg {f.fg}</span>
                    <span>bg {f.bg}</span>
                    {f.large && <span style={{ color: "#fde68a" }}>large</span>}
                  </div>
                  <div style={{ marginTop: 4, color: "#a7f3d0" }}>→ {f.fix}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const panelBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "#f8fafc",
  border: "none",
  borderRadius: 6,
  width: 24,
  height: 24,
  fontSize: 12,
  cursor: "pointer",
};
