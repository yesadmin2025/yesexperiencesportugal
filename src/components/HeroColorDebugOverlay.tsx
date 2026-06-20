/**
 * HeroColorDebugOverlay — opt-in dev overlay that surfaces the *computed*
 * foreground colors of the hero eyebrow + headline lines in real time and
 * names the nearest YES brand token (with per-channel delta).
 *
 * Activate by adding `?heroColorDebug=1` to the URL. Off by default — never
 * renders in production unless the flag is set, so it can ship safely.
 *
 * Mirrors the allow-list used by e2e/hero-typography-colors.spec.ts so the
 * panel and the regression test stay in lock-step. If the panel says
 * "off-brand", the spec will fail in CI.
 */

import { useEffect, useState } from "react";

type RGB = { r: number; g: number; b: number };

const TOKENS: Array<{ name: string; hex: string; rgb: RGB }> = [
  { name: "teal", hex: "color:var(--teal)", rgb: { r: 41, g: 91, b: 97 } },
  { name: "teal-2", hex: "color:var(--teal-2)", rgb: { r: 42, g: 124, b: 130 } },
  { name: "gold", hex: "var(--gold)", rgb: { r: 201, g: 169, b: 106 } },
  { name: "gold-soft", hex: "var(--gold-soft)", rgb: { r: 225, g: 207, b: 166 } },
  { name: "gold-warm", hex: "#D8BE82", rgb: { r: 216, g: 190, b: 130 } },
  { name: "gold-deep", hex: "#B89452", rgb: { r: 184, g: 148, b: 82 } },
  { name: "ivory", hex: "var(--ivory)", rgb: { r: 250, g: 248, b: 243 } },
  { name: "sand", hex: "var(--sand)", rgb: { r: 244, g: 239, b: 231 } },
  { name: "charcoal", hex: "var(--charcoal)", rgb: { r: 46, g: 46, b: 46 } },
  { name: "charcoal-soft", hex: "#555555", rgb: { r: 85, g: 85, b: 85 } },
  { name: "charcoal-deep", hex: "var(--charcoal-deep)", rgb: { r: 31, g: 31, b: 31 } },
];

/** Allow-list per slot — matches the regression spec. */
const SLOT_ALLOW: Record<string, string[]> = {
  eyebrow: ["gold"],
  headlineLine1: ["ivory"],
  headlineLine2: ["gold-soft"],
};

const TARGETS: Array<{ key: keyof typeof SLOT_ALLOW; selector: string; label: string }> = [
  { key: "eyebrow", selector: '[data-hero-field="eyebrow"]', label: "Eyebrow" },
  {
    key: "headlineLine1",
    selector: '[data-hero-field="headlineLine1"]:not(h1)',
    label: "Headline · line 1",
  },
  {
    key: "headlineLine2",
    selector: '[data-hero-field="headlineLine2"]',
    label: "Headline · line 2 (italic)",
  },
];

function parseColor(input: string): RGB | null {
  const m = input.replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3] };
}

function nearest(rgb: RGB) {
  let best = TOKENS[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const t of TOKENS) {
    const d = Math.abs(rgb.r - t.rgb.r) + Math.abs(rgb.g - t.rgb.g) + Math.abs(rgb.b - t.rgb.b);
    if (d < bestDelta) {
      best = t;
      bestDelta = d;
    }
  }
  return { token: best, delta: bestDelta };
}

function fmtHex(rgb: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return /[?&]heroColorDebug=1(?:&|$)/.test(window.location.search);
}

type Sample = {
  key: keyof typeof SLOT_ALLOW;
  label: string;
  selector: string;
  rgb: RGB | null;
  nearestName: string;
  nearestHex: string;
  delta: number;
  inAllowList: boolean;
};

export function HeroColorDebugOverlay() {
  const [enabled] = useState(isEnabled);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      const next: Sample[] = TARGETS.map(({ key, selector, label }) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        const rgb = el ? parseColor(getComputedStyle(el).color) : null;
        if (!rgb) {
          return {
            key,
            label,
            selector,
            rgb: null,
            nearestName: "—",
            nearestHex: "—",
            delta: Number.POSITIVE_INFINITY,
            inAllowList: false,
          };
        }
        const { token, delta } = nearest(rgb);
        return {
          key,
          label,
          selector,
          rgb,
          nearestName: token.name,
          nearestHex: token.hex,
          delta,
          inAllowList: SLOT_ALLOW[key].includes(token.name) && delta <= 30,
        };
      });
      setSamples(next);
      raf = window.setTimeout(() => requestAnimationFrame(tick), 250) as unknown as number;
    };
    requestAnimationFrame(tick);
    return () => {
      if (raf) clearTimeout(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      role="complementary"
      aria-label="Hero color debug overlay"
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        maxWidth: "min(360px, calc(100vw - 24px))",
        background: "rgba(15,12,9,0.92)",
        color: "var(--ivory)",
        font: "11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
        border: "1px solid rgba(201,169,106,0.5)",
        borderRadius: 10,
        padding: collapsed ? "6px 10px" : "10px 12px",
        boxShadow: "0 12px 32px -12px rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      data-hero-color-debug="true"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 8,
          color: "var(--gold)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: 10,
        }}
        aria-expanded={!collapsed}
      >
        <span>Hero · computed colors</span>
        <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {samples.map((s) => (
            <li
              key={s.key}
              style={{
                display: "grid",
                gridTemplateColumns: "14px 1fr auto",
                gap: 8,
                alignItems: "center",
                padding: "6px 8px",
                borderRadius: 6,
                background: s.inAllowList ? "rgba(41,91,97,0.22)" : "rgba(180,52,52,0.28)",
                border: `1px solid ${s.inAllowList ? "rgba(201,169,106,0.35)" : "rgba(220,80,80,0.55)"}`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: s.rgb ? fmtHex(s.rgb) : "transparent",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              />
              <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <span style={{ color: "var(--ivory)", fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: "rgba(250,248,243,0.75)" }}>
                  {s.rgb ? fmtHex(s.rgb) : "not found"} ·{" "}
                  <span style={{ color: s.inAllowList ? "var(--gold-soft)" : "#F2A9A9" }}>
                    {s.nearestName} {s.nearestHex} (Δ{Number.isFinite(s.delta) ? s.delta : "—"})
                  </span>
                </span>
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: s.inAllowList ? "#A9E1B6" : "#F2A9A9",
                }}
              >
                {s.inAllowList ? "OK" : "OFF"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!collapsed && (
        <p style={{ margin: "8px 0 0", color: "rgba(250,248,243,0.55)", fontSize: 10 }}>
          ?heroColorDebug=1 · matches the e2e color regression allow-list.
        </p>
      )}
    </div>
  );
}

export default HeroColorDebugOverlay;
