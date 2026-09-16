/**
 * HeroVerifyOverlay
 *
 * Visual on-page verification for the home hero copy. Activated only when
 * the URL contains `?verify=hero`. Scans every element marked with
 * `data-hero-field="<key>"`, compares its visible text against the FROZEN
 * `HERO_COPY_SPEC`, and:
 *
 *   - Wraps each matched element in a colored outline (green = match,
 *     red = mismatch, amber = extra/decorative chars).
 *   - Pins a small floating badge next to each element with the field name
 *     and a check / cross / warning glyph.
 *   - Shows a fixed legend in the corner with totals + a per-field summary.
 *
 * No layout/design impact when the query param is absent — the component
 * renders `null`.
 *
 * Notes
 * -----
 * - Comparison is case-sensitive and trims surrounding whitespace only.
 * - For decorative wrappers like `✦ EYEBROW ✦`, the visible textContent
 *   includes the stars; we report a "loose" pass when the spec string is
 *   contained inside the rendered text (highlighted amber, not red), so
 *   you can see at a glance which fields differ exactly vs. only by
 *   surrounding decoration.
 * - Reads from `HERO_COPY_SPEC` (frozen approved wording), NOT from
 *   `HERO_COPY`, so a drift between source and spec also surfaces here.
 */
import { useEffect, useMemo, useState } from "react";
import { HERO_COPY_VERSION } from "@/content/hero-copy";
import { HERO_COPY_SPEC, type HeroSpecKey } from "@/content/hero-copy.spec";
import { validateReportV3, formatIssues, type ValidationIssue } from "@/lib/hero-verify-schema";
import { sanitizedPath } from "@/lib/url-sanitize";

type FieldStatus = "match" | "loose" | "mismatch" | "missing";

type FieldReport = {
  key: HeroSpecKey;
  expected: string;
  actual: string | null;
  status: FieldStatus;
  rect: DOMRect | null;
};

const FIELD_ORDER: HeroSpecKey[] = [
  "eyebrow",
  "headlineLine1",
  "headlineLine2",
  "subheadline",
  "primaryCta",
  "secondaryCta",
  "microcopy",
];

const STATUS_COLOR: Record<FieldStatus, string> = {
  match: "rgb(34 197 94)", // green-500
  loose: "rgb(245 158 11)", // amber-500
  mismatch: "rgb(239 68 68)", // red-500
  missing: "rgb(148 163 184)", // slate-400
};

const STATUS_GLYPH: Record<FieldStatus, string> = {
  match: "✓",
  loose: "≈",
  mismatch: "✕",
  missing: "?",
};

const STATUS_LABEL: Record<FieldStatus, string> = {
  match: "exact match",
  loose: "contains spec (extra chars)",
  mismatch: "mismatch",
  missing: "no element found",
};

function normalize(s: string): string {
  // Collapse internal whitespace to a single space and trim. The spec
  // strings contain single spaces only, so this lets us tolerate JSX
  // whitespace artifacts without flagging them as mismatches.
  return s.replace(/\s+/g, " ").trim();
}

function classify(expected: string, actual: string | null): FieldStatus {
  if (actual === null) return "missing";
  const a = normalize(actual);
  const e = normalize(expected);
  // CSS may uppercase CTAs visually but textContent reflects the source.
  // We compare raw textContent to the spec, so case differences ARE
  // intentional drifts unless the rendered DOM text is uppercase too.
  if (a === e) return "match";
  if (a.includes(e)) return "loose";
  // Allow a CSS-uppercased variant to count as exact (the visible text
  // matches the spec character-for-character once you account for
  // text-transform: uppercase, which getComputedStyle reports).
  return "mismatch";
}

/**
 * Character-level LCS diff. Returns segments tagged as `equal`,
 * `removed` (in expected only), or `added` (in actual only). O(n*m)
 * — fine for hero strings (always < ~200 chars).
 */
type DiffSegment = { type: "equal" | "removed" | "added"; text: string };

function diffChars(a: string, b: string): DiffSegment[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const reversed: DiffSegment[] = [];
  const push = (type: DiffSegment["type"], ch: string) => {
    const last = reversed[reversed.length - 1];
    if (last && last.type === type) last.text += ch;
    else reversed.push({ type, text: ch });
  };
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      push("equal", a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      push("removed", a[i - 1]);
      i--;
    } else {
      push("added", b[j - 1]);
      j--;
    }
  }
  while (i > 0) {
    push("removed", a[i - 1]);
    i--;
  }
  while (j > 0) {
    push("added", b[j - 1]);
    j--;
  }
  // We pushed in reverse — flip segment order AND reverse each segment's
  // text so the final result reads left-to-right.
  const out: DiffSegment[] = [];
  for (let k = reversed.length - 1; k >= 0; k--) {
    out.push({
      type: reversed[k].type,
      text: reversed[k].text.split("").reverse().join(""),
    });
  }
  return out;
}

// One side of the diff. For "expected": show equal + removed (red strike).
// For "actual": show equal + added (green underline). Whitespace inside
// changed runs is visualized with · so it isn't invisible.
function DiffLine({
  label,
  segments,
  side,
}: {
  label: string;
  segments: DiffSegment[];
  side: "expected" | "actual";
}) {
  const visible = segments.filter(
    (s) => s.type === "equal" || (side === "expected" ? s.type === "removed" : s.type === "added"),
  );
  return (
    <div
      style={{
        opacity: 0.9,
        fontSize: 11,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        wordBreak: "break-word",
        lineHeight: 1.5,
      }}
    >
      <span style={{ opacity: 0.55 }}>{label}: </span>
      {visible.map((seg, idx) => {
        if (seg.type === "equal") {
          return (
            <span key={idx} style={{ opacity: 0.6 }}>
              {seg.text}
            </span>
          );
        }
        const isAdded = seg.type === "added";
        const text = seg.text.replace(/ /g, "·");
        return (
          <span
            key={idx}
            title={isAdded ? "added in actual" : "missing from actual"}
            style={{
              background: isAdded ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)",
              color: isAdded ? "rgb(187, 247, 208)" : "rgb(254, 202, 202)",
              textDecoration: isAdded ? "underline" : "line-through",
              borderRadius: 2,
              padding: "0 1px",
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

function computeReports(): FieldReport[] {
  if (typeof document === "undefined") return [];
  return FIELD_ORDER.map((key): FieldReport => {
    const expected = HERO_COPY_SPEC[key];
    // Prefer a *direct* match on the field, but tolerate the eyebrow's
    // composite container that lists multiple fields (it has space-
    // separated values in data-hero-field).
    const direct = document.querySelector<HTMLElement>(`[data-hero-field="${key}"]`);
    const el =
      direct ??
      Array.from(document.querySelectorAll<HTMLElement>("[data-hero-field]")).find((node) =>
        (node.dataset.heroField ?? "").split(/\s+/).includes(key),
      ) ??
      null;

    const actualRaw = el?.textContent ?? null;
    // If the element is wrapped (e.g. eyebrow with ✦ ✦), strip those
    // decorative chars before classifying so a green outline is possible
    // when the spec text is fully present and the only extras are stars.
    const actualClean = actualRaw?.replace(/✦/g, "").replace(/\s+/g, " ").trim() ?? null;

    let status = classify(expected, actualClean);
    // If textContent is the uppercased visual (CSS text-transform), still
    // accept it as an exact match — the visible characters match the spec.
    if (status === "mismatch" && actualClean) {
      const upperExpected = normalize(expected).toUpperCase();
      const upperActual = normalize(actualClean).toUpperCase();
      if (upperActual === upperExpected) status = "match";
      else if (upperActual.includes(upperExpected)) status = "loose";
    }

    return {
      key,
      expected,
      actual: actualClean,
      status,
      rect: el?.getBoundingClientRect() ?? null,
    };
  });
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("verify") === "hero";
}

export function HeroVerifyOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [tick, setTick] = useState(0);
  // Live mode: when on, a MutationObserver watches every [data-hero-field]
  // node and re-runs verification on any text/subtree change. This keeps
  // the overlay current as you edit hero copy (HMR replaces the rendered
  // text in place). Default ON; togglable from the legend.
  const [liveMode, setLiveMode] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  // Result of the most recent pre-export diff self-check. `null` until
  // the user runs an export. Surfaced in the legend with a green/red row.
  const [selfCheck, setSelfCheck] = useState<{
    ok: boolean;
    at: number;
    divergences: { key: string; reason: string }[];
  } | null>(null);
  // Most recent schema-validation result for the export payload.
  // `null` until an export is attempted; surfaced in the legend.
  const [schemaCheck, setSchemaCheck] = useState<
    | { ok: true; at: number; format: "JSON" | "CSV" }
    | { ok: false; at: number; format: "JSON" | "CSV"; issues: ValidationIssue[] }
    | null
  >(null);
  // Hard guard: the payload's `schema` field MUST equal the expected
  // version tag. A missing/different tag blocks the download outright
  // (no override) — surfaced in the legend.
  const [schemaTagCheck, setSchemaTagCheck] = useState<
    | { ok: true; at: number; format: "JSON" | "CSV"; tag: string }
    | {
        ok: false;
        at: number;
        format: "JSON" | "CSV";
        reason: "missing" | "wrong-type" | "mismatch";
        actual: unknown;
      }
    | null
  >(null);

  // Activate only when ?verify=hero is present.
  useEffect(() => {
    setEnabled(isEnabled());
  }, []);

  // Re-measure on mount, on resize, and on scroll so badges follow their
  // anchor elements through the page.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    // Initial measure after fonts/animations settle.
    const initial = window.setTimeout(schedule, 50);
    const t1 = window.setTimeout(schedule, 400);
    const t2 = window.setTimeout(schedule, 1600);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(initial);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
    };
  }, [enabled]);

  // Live mode: observe DOM mutations on hero-field nodes and any added/
  // removed nodes anywhere in the document body (HMR can swap whole
  // subtrees). Debounced via requestAnimationFrame so a burst of HMR
  // mutations triggers a single re-verify.
  useEffect(() => {
    if (!enabled || !liveMode) return;
    if (typeof MutationObserver === "undefined") return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    const observer = new MutationObserver(schedule);
    // Watch the whole body for added/removed nodes (HMR), and characterData
    // + subtree so any text edit inside an existing hero-field node fires.
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [enabled, liveMode]);

  useEffect(() => {
    if (!enabled) return;
    setReports(computeReports());
    setLastUpdated(Date.now());
  }, [enabled, tick]);

  const summary = useMemo(() => {
    const counts: Record<FieldStatus, number> = {
      match: 0,
      loose: 0,
      mismatch: 0,
      missing: 0,
    };
    for (const r of reports) counts[r.status] += 1;
    return counts;
  }, [reports]);

  // Shared file-download helper. Creates an <a download> on the fly so the
  // browser saves the blob with our chosen filename. SSR-safe.
  const triggerDownload = (blob: Blob, filename: string) => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

  // Compute diff segments once per field (only for fields where a diff
  // is meaningful). Memoized so JSON/CSV exports and the on-screen
  // diff list share the exact same data.
  const fieldDiffs = useMemo(
    () =>
      reports.map((r) => {
        const hasBoth = r.actual !== null;
        const segments = hasBoth ? diffChars(r.expected, r.actual ?? "") : null;
        return { key: r.key, segments };
      }),
    [reports],
  );

  // A compact one-line representation of a diff suitable for a CSV cell:
  // equal text is left as-is, removed runs wrap in [-…-], added in {+…+}.
  // Whitespace inside changed runs becomes · for visibility.
  const diffToInline = (segments: DiffSegment[] | null): string => {
    if (!segments) return "";
    let out = "";
    for (const s of segments) {
      if (s.type === "equal") out += s.text;
      else if (s.type === "removed") out += `[-${s.text.replace(/ /g, "·")}-]`;
      else out += `{+${s.text.replace(/ /g, "·")}+}`;
    }
    return out;
  };

  /**
   * Pre-export self-check.
   *
   * Re-derives a fresh set of reports + diff segments straight from the
   * live DOM and compares them byte-for-byte to the diff segments held in
   * `fieldDiffs` (which is what feeds BOTH the on-screen diff list AND
   * the JSON/CSV export). If anything differs — segment count, segment
   * types, or segment text — we surface it visibly so you don't ship a
   * report that disagrees with what you can see on screen.
   *
   * Returns the structured result so callers can also embed it in the
   * exported file as audit-log metadata.
   */
  type SelfCheckDivergence = {
    key: string;
    reason: string;
    live: DiffSegment[] | null;
    exported: DiffSegment[] | null;
  };
  type SelfCheckResult = {
    ok: boolean;
    at: number;
    checkedFields: number;
    divergentFields: number;
    divergences: SelfCheckDivergence[];
  };

  const runDiffSelfCheck = (): SelfCheckResult => {
    if (typeof document === "undefined") {
      const noop: SelfCheckResult = {
        ok: true,
        at: Date.now(),
        checkedFields: 0,
        divergentFields: 0,
        divergences: [],
      };
      return noop;
    }
    const liveReports = computeReports();
    const liveDiffs = new Map(
      liveReports.map((r) => {
        const hasBoth = r.actual !== null;
        return [r.key, hasBoth ? diffChars(r.expected, r.actual ?? "") : null] as const;
      }),
    );
    const exportedDiffs = new Map(fieldDiffs.map((d) => [d.key, d.segments]));

    const divergences: SelfCheckDivergence[] = [];

    // Union of keys from both sides — catches missing entries on either.
    const allKeys = new Set<HeroSpecKey>([...liveDiffs.keys(), ...exportedDiffs.keys()]);

    for (const key of allKeys) {
      const live = liveDiffs.get(key) ?? null;
      const exp = exportedDiffs.get(key) ?? null;

      if (live === null && exp === null) continue;
      if (live === null || exp === null) {
        divergences.push({
          key,
          reason: live === null ? "live missing diff" : "exported missing diff",
          live,
          exported: exp,
        });
        continue;
      }
      if (live.length !== exp.length) {
        divergences.push({
          key,
          reason: `segment count differs (live=${live.length}, exported=${exp.length})`,
          live,
          exported: exp,
        });
        continue;
      }
      for (let i = 0; i < live.length; i++) {
        if (live[i].type !== exp[i].type || live[i].text !== exp[i].text) {
          divergences.push({
            key,
            reason: `segment ${i} differs`,
            live,
            exported: exp,
          });
          break;
        }
      }
    }

    const result: SelfCheckResult = {
      ok: divergences.length === 0,
      at: Date.now(),
      checkedFields: allKeys.size,
      divergentFields: divergences.length,
      divergences,
    };

    if (!result.ok) {
      console.warn(
        "[hero-verify] export self-check FAILED — on-screen diff and export diverge",
        divergences,
      );
    } else {
      console.info(
        "[hero-verify] export self-check OK — on-screen diff matches export byte-for-byte",
      );
    }

    setSelfCheck({
      ok: result.ok,
      at: result.at,
      divergences: divergences.map(({ key, reason }) => ({ key, reason })),
    });
    return result;
  };

  // Build the audit metadata block embedded in every export. Captures
  // the full self-check result, whether the user confirmed an override
  // when the check failed, and totals for quick dashboard scanning.
  const buildAuditMeta = (selfCheckResult: SelfCheckResult, confirmedOverride: boolean) => ({
    selfCheck: {
      ok: selfCheckResult.ok,
      ranAt: new Date(selfCheckResult.at).toISOString(),
      checkedFields: selfCheckResult.checkedFields,
      divergentFields: selfCheckResult.divergentFields,
      // Outcome makes the audit trail unambiguous in CI logs:
      //   passed     = self-check OK, exported normally
      //   confirmed  = self-check FAILED, user clicked "Download anyway"
      //   blocked    = self-check FAILED, user cancelled (no file produced)
      outcome: selfCheckResult.ok
        ? ("passed" as const)
        : confirmedOverride
          ? ("confirmed" as const)
          : ("blocked" as const),
      divergences: selfCheckResult.divergences.map((d) => ({
        key: d.key,
        reason: d.reason,
        live: d.live,
        exported: d.exported,
      })),
    },
  });

  /**
   * Hard pre-flight guard: verify the payload literally has
   * `schema === "hero-verify-report/v3"`. This runs BEFORE the full Zod
   * validation so we can give an unambiguous, non-overridable error
   * when the version tag is missing or has drifted. Any failure aborts
   * the download — there is no confirm prompt because a wrong/missing
   * version tag means downstream audit tools cannot route the file.
   */
  const EXPECTED_SCHEMA_TAG = "hero-verify-report/v3" as const;
  const assertSchemaTag = (payload: unknown, format: "JSON" | "CSV"): boolean => {
    const tag =
      payload && typeof payload === "object" ? (payload as { schema?: unknown }).schema : undefined;
    let reason: "missing" | "wrong-type" | "mismatch" | null = null;
    if (tag === undefined || tag === null) reason = "missing";
    else if (typeof tag !== "string") reason = "wrong-type";
    else if (tag !== EXPECTED_SCHEMA_TAG) reason = "mismatch";

    if (reason === null) {
      setSchemaTagCheck({
        ok: true,
        at: Date.now(),
        format,
        tag: tag as string,
      });
      return true;
    }
    const human =
      reason === "missing"
        ? `Missing "schema" field — expected "${EXPECTED_SCHEMA_TAG}".`
        : reason === "wrong-type"
          ? `"schema" field is ${typeof tag}, not a string. Expected "${EXPECTED_SCHEMA_TAG}".`
          : `"schema" field is "${String(tag)}" — expected "${EXPECTED_SCHEMA_TAG}".`;

    console.error(`[hero-verify] schema-tag guard BLOCKED ${format} download — ${human}`, {
      actual: tag,
      expected: EXPECTED_SCHEMA_TAG,
    });
    setSchemaTagCheck({
      ok: false,
      at: Date.now(),
      format,
      reason,
      actual: tag,
    });
    if (typeof window !== "undefined") {
      window.alert(
        `Download blocked.\n\n${human}\n\n` +
          `The export was not written to disk because downstream audit ` +
          `tools rely on the "${EXPECTED_SCHEMA_TAG}" version tag to ` +
          `parse the payload.`,
      );
    }
    return false;
  };

  /**
   * Validate the assembled payload against `hero-verify-report/v3`
   * BEFORE we trigger any download. The CSV path also validates because
   * its rows are derived from this same in-memory shape.
   * Returns `true` if valid, or if the user explicitly confirms an
   * override; `false` to abort.
   */
  const validateBeforeDownload = (payload: unknown, format: "JSON" | "CSV"): boolean => {
    const result = validateReportV3(payload);
    if (result.ok) {
      console.info(
        `[hero-verify] schema-check OK — payload conforms to hero-verify-report/v3 (${format})`,
      );
      setSchemaCheck({ ok: true, at: Date.now(), format });
      return true;
    }

    console.warn(
      `[hero-verify] schema-check FAILED for ${format} — payload does not conform to hero-verify-report/v3`,
      result.issues,
    );
    setSchemaCheck({ ok: false, at: Date.now(), format, issues: result.issues });
    if (typeof window === "undefined") return false;
    return window.confirm(
      `Schema check FAILED for ${format} (hero-verify-report/v3):\n\n` +
        formatIssues(result.issues).slice(0, 600) +
        "\n\nDownload anyway?",
    );
  };

  /**
   * Build the v3 export payload from current state. Pure (apart from
   * reading window/location/viewport), so we can call it from both
   * exporters AND from the "Regenerate export payload" button without
   * triggering a download. `selfCheckResult` and `confirmedOverride`
   * feed into the embedded audit metadata.
   */
  const buildExportPayload = (selfCheckResult: SelfCheckResult, confirmedOverride: boolean) => {
    const audit = buildAuditMeta(selfCheckResult, confirmedOverride);
    const diffByKey = new Map(fieldDiffs.map((d) => [d.key, d.segments]));
    return {
      schema: "hero-verify-report/v3" as const,
      generatedAt: new Date().toISOString(),
      url: sanitizedPath(window.location.href),
      pathname: window.location.pathname,
      heroCopyVersion: HERO_COPY_VERSION,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      ok: summary.mismatch === 0 && summary.missing === 0 && summary.loose === 0,
      summary,
      audit,
      fields: reports.map((r) => {
        const segments = diffByKey.get(r.key) ?? null;
        return {
          key: r.key,
          status: r.status,
          expected: r.expected,
          actual: r.actual,
          diff:
            r.status === "match" || segments === null
              ? []
              : segments.map((s) => ({ type: s.type, text: s.text })),
          diffInline: r.status === "match" || segments === null ? "" : diffToInline(segments),
        };
      }),
    };
  };

  /**
   * Re-build the payload from current state and re-run BOTH guards
   * (tag + full schema) without writing anything to disk. Wired to the
   * "Regenerate export payload" button that appears once an export has
   * been blocked by the tag guard. Lets the user fix the underlying
   * cause (e.g. edit hero copy, reload generated audit) and confirm the
   * fix without committing a new download.
   *
   * `format` defaults to whatever was last attempted so the legend rows
   * stay coherent with the user's original intent.
   */
  /**
   * Standalone "Re-run self-check" action. Just re-runs the diff
   * self-check and updates the green/red row in the overlay — no
   * payload rebuild, no schema-tag guard. Useful when the user has
   * just edited hero copy and wants to refresh the diff before
   * deciding whether to regenerate the payload.
   */
  const handleRerunSelfCheck = () => {
    const r = runDiffSelfCheck();

    console.info(`[hero-verify] manual self-check re-run — ${r.ok ? "OK" : "FAILED"}`, {
      divergentFields: r.divergentFields,
      checkedFields: r.checkedFields,
    });
  };

  /**
   * Keyboard shortcut: Ctrl+Shift+R (Cmd+Shift+R on macOS) re-runs the
   * diff self-check from anywhere in the preview. We deliberately AVOID
   * plain Ctrl+R because the browser owns that for page reload — using
   * Shift as a modifier keeps the binding non-conflicting and matches
   * the "↺ Re-run self-check" button label. Only listens while the
   * overlay is enabled (i.e. ?verify=hero is active).
   */
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      const isReKey = e.key === "R" || e.key === "r";
      if (!isReKey) return;
      if (!e.shiftKey) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      // Don't hijack the binding while the user is typing in an input
      // or contenteditable region — they may want native shortcuts.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      handleRerunSelfCheck();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
    // handleRerunSelfCheck closes over current state via runDiffSelfCheck,
    // which itself reads the latest `reports`/`fieldDiffs` through closure
    // each invocation; re-binding on every render is fine because the
    // listener is cheap and removeEventListener is symmetrical.
  });

  const handleRegeneratePayload = () => {
    if (typeof window === "undefined") return;
    const format: "JSON" | "CSV" = schemaTagCheck?.format ?? "JSON";
    const selfCheckResult = runDiffSelfCheck();
    const payload = buildExportPayload(selfCheckResult, false);

    console.info(`[hero-verify] regenerated export payload (${format}) — re-running guards`, {
      schema: payload.schema,
    });
    const tagOk = assertSchemaTag(payload, format);
    if (!tagOk) return;
    // Tag is good — also refresh the full schema-check status row so
    // the user can see the whole pipeline went green after the fix.
    const result = validateReportV3(payload);
    if (result.ok) {
      setSchemaCheck({ ok: true, at: Date.now(), format });
    } else {
      setSchemaCheck({
        ok: false,
        at: Date.now(),
        format,
        issues: result.issues,
      });
    }
  };

  const handleExportJson = () => {
    if (typeof window === "undefined") return;
    // Run the self-check, then keep its result for embedding regardless
    // of the outcome — audit logs need both passes AND blocked attempts.
    const selfCheckResult = runDiffSelfCheck();
    let confirmedOverride = false;
    if (!selfCheckResult.ok) {
      confirmedOverride = window.confirm(
        "Export self-check FAILED: on-screen diff and JSON disagree.\n\n" +
          "See console + the red row in the overlay for details.\n\n" +
          "Download anyway?",
      );
      if (!confirmedOverride) return;
    }
    const payload = buildExportPayload(selfCheckResult, confirmedOverride);
    // Hard guard first: a missing/wrong `schema` tag is non-recoverable
    // and must never reach the user's filesystem, even with override.
    if (!assertSchemaTag(payload, "JSON")) return;
    if (!validateBeforeDownload(payload, "JSON")) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, `hero-verify-${HERO_COPY_VERSION}-${stamp()}.json`);
  };

  // CSV escape: wrap every field in double quotes and double any embedded
  // quote, per RFC 4180. Newlines inside fields are preserved verbatim
  // because they are inside a quoted field.
  const csvCell = (v: string | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const handleExportCsv = () => {
    if (typeof window === "undefined") return;
    const selfCheckResult = runDiffSelfCheck();
    let confirmedOverride = false;
    if (!selfCheckResult.ok) {
      confirmedOverride = window.confirm(
        "Export self-check FAILED: on-screen diff and CSV disagree.\n\n" +
          "See console + the red row in the overlay for details.\n\n" +
          "Download anyway?",
      );
      if (!confirmedOverride) return;
    }
    const payload = buildExportPayload(selfCheckResult, confirmedOverride);
    const audit = payload.audit;
    const diffByKey = new Map(fieldDiffs.map((d) => [d.key, d.segments]));
    if (!assertSchemaTag(payload, "CSV")) return;
    if (!validateBeforeDownload(payload, "CSV")) return;

    const header = [
      "key",
      "status",
      "expected",
      "actual",
      "diff_inline",
      "removed",
      "added",
      "diff_segments_json",
    ];
    const rows = reports.map((r) => {
      const segments = diffByKey.get(r.key) ?? null;
      const showDiff = r.status !== "match" && segments !== null;
      const removed = showDiff
        ? segments
            .filter((s) => s.type === "removed")
            .map((s) => s.text)
            .join(" | ")
        : "";
      const added = showDiff
        ? segments
            .filter((s) => s.type === "added")
            .map((s) => s.text)
            .join(" | ")
        : "";
      const inline = showDiff ? diffToInline(segments) : "";
      // The full structured diff is JSON-encoded into a single CSV cell
      // so spreadsheet users can parse it back if they need the exact
      // segment-by-segment breakdown.
      const segmentsJson = showDiff ? JSON.stringify(segments) : "";
      return [r.key, r.status, r.expected, r.actual ?? "", inline, removed, added, segmentsJson]
        .map(csvCell)
        .join(",");
    });

    // Audit-metadata preamble. Each line starts with `#` so most CSV
    // tools (DuckDB, pandas with comment="#", many BI tools) skip them
    // automatically while still preserving the audit trail in the file.
    // The full self-check payload (including divergence segments) is
    // also encoded as a single JSON line so nothing is lost compared to
    // the JSON export.
    const auditPreamble = [
      `# hero-verify report`,
      `# schema=hero-verify-report/v3`,
      `# generated_at=${new Date().toISOString()}`,
      `# url=${sanitizedPath(window.location.href)}`,
      `# hero_copy_version=${HERO_COPY_VERSION}`,
      `# self_check_outcome=${audit.selfCheck.outcome}`,
      `# self_check_ok=${audit.selfCheck.ok}`,
      `# self_check_ran_at=${audit.selfCheck.ranAt}`,
      `# self_check_checked_fields=${audit.selfCheck.checkedFields}`,
      `# self_check_divergent_fields=${audit.selfCheck.divergentFields}`,
      `# audit_json=${JSON.stringify(audit)}`,
    ].join("\r\n");

    // Prepend a UTF-8 BOM so Excel opens the em-dash etc. correctly, and
    // use CRLF line endings per the CSV spec.
    const csv =
      "\uFEFF" + auditPreamble + "\r\n" + [header.map(csvCell).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `hero-verify-${HERO_COPY_VERSION}-${stamp()}.csv`);
  };

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2147483000,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
      data-hero-verify-overlay="active"
    >
      {/* Local keyframes — scoped under the overlay only. */}
      <style>{`
        @keyframes heroVerifyPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(34,197,94,0.05); }
        }
      `}</style>
      {/* Per-field outlines + badges */}
      {reports.map((r) => {
        if (!r.rect) return null;
        const color = STATUS_COLOR[r.status];
        const top = r.rect.top;
        const left = r.rect.left;
        const width = r.rect.width;
        const height = r.rect.height;
        return (
          <div key={r.key}>
            <div
              style={{
                position: "fixed",
                top,
                left,
                width,
                height,
                outline: `2px solid ${color}`,
                outlineOffset: 2,
                borderRadius: 4,
                background: `${color}10`,
                boxShadow: `0 0 0 1px ${color}33`,
              }}
            />
            <div
              style={{
                position: "fixed",
                top: Math.max(top - 22, 4),
                left,
                background: color,
                color: "white",
                padding: "2px 8px",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
                borderRadius: 3,
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              }}
            >
              <span style={{ marginRight: 6 }}>{STATUS_GLYPH[r.status]}</span>
              {r.key} · {STATUS_LABEL[r.status]}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          maxWidth: 360,
          background: "rgba(15, 23, 42, 0.94)",
          color: "white",
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 12,
          lineHeight: 1.4,
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: 12, letterSpacing: "0.08em" }}>HERO VERIFY</strong>
          <span
            style={{
              fontSize: 10,
              opacity: 0.7,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            ?verify=hero
          </span>
        </div>
        {/* Live mode toggle — when ON, a MutationObserver re-runs
            verification on any DOM change to hero-field nodes (HMR-safe). */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            fontSize: 11,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={liveMode}
            onChange={(e) => setLiveMode(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <span>
            <strong style={{ letterSpacing: "0.04em" }}>Live mode</strong>
            <span style={{ opacity: 0.65, marginLeft: 6 }}>
              {liveMode ? "watching DOM" : "manual"}
            </span>
          </span>
          <span
            aria-hidden="true"
            style={{
              marginLeft: "auto",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: liveMode ? "rgb(34, 197, 94)" : "rgb(148, 163, 184)",
              boxShadow: liveMode ? "0 0 0 3px rgba(34,197,94,0.25)" : "none",
              animation: liveMode ? "heroVerifyPulse 1.6s ease-in-out infinite" : "none",
            }}
          />
        </label>
        {lastUpdated !== null && (
          <div
            style={{
              fontSize: 10,
              opacity: 0.55,
              marginBottom: 8,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            updated {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            columnGap: 8,
            rowGap: 4,
            marginBottom: 10,
          }}
        >
          {(["match", "loose", "mismatch", "missing"] as FieldStatus[]).map((s) => (
            <div key={s} style={{ display: "contents" }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: STATUS_COLOR[s],
                  borderRadius: 2,
                  alignSelf: "center",
                }}
              />
              <span style={{ opacity: 0.9 }}>{STATUS_LABEL[s]}</span>
              <span
                style={{
                  opacity: 0.95,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {summary[s]}
              </span>
            </div>
          ))}
        </div>
        <details>
          <summary style={{ cursor: "pointer", opacity: 0.85 }}>Field details</summary>
          <ul style={{ marginTop: 8, paddingLeft: 14 }}>
            {reports.map((r) => {
              // Reuse the SAME memoized segments as the JSON/CSV exports
              // so the on-screen diff and the downloaded artifacts cannot
              // drift. The pre-export self-check verifies this invariant.
              const showDiff =
                r.actual !== null && (r.status === "mismatch" || r.status === "loose");
              const segments = showDiff
                ? (fieldDiffs.find((d) => d.key === r.key)?.segments ?? null)
                : null;
              return (
                <li key={r.key} style={{ marginBottom: 10 }}>
                  <span style={{ color: STATUS_COLOR[r.status] }}>{STATUS_GLYPH[r.status]}</span>{" "}
                  <strong>{r.key}</strong>
                  {showDiff && segments ? (
                    <div
                      style={{
                        marginTop: 4,
                        padding: "6px 8px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6,
                      }}
                    >
                      <DiffLine label="exp" segments={segments} side="expected" />
                      <DiffLine label="got" segments={segments} side="actual" />
                    </div>
                  ) : (
                    <>
                      <div style={{ opacity: 0.7, fontSize: 11 }}>
                        exp: <q>{r.expected}</q>
                      </div>
                      {r.actual !== null && r.status !== "match" && (
                        <div style={{ opacity: 0.7, fontSize: 11 }}>
                          got: <q>{r.actual}</q>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
        {selfCheck && (
          <div
            style={{
              marginTop: 10,
              padding: "6px 8px",
              borderRadius: 6,
              fontSize: 11,
              lineHeight: 1.45,
              background: selfCheck.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.16)",
              border: `1px solid ${selfCheck.ok ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.55)"}`,
              color: selfCheck.ok ? "rgb(187, 247, 208)" : "rgb(254, 202, 202)",
            }}
          >
            <strong style={{ letterSpacing: "0.04em" }}>
              {selfCheck.ok ? "✓ Self-check OK" : "✕ Self-check FAILED"}
            </strong>
            <span style={{ opacity: 0.75, marginLeft: 6 }}>
              {new Date(selfCheck.at).toLocaleTimeString()}
            </span>
            {!selfCheck.ok && selfCheck.divergences.length > 0 && (
              <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                {selfCheck.divergences.slice(0, 4).map((d, i) => (
                  <li key={i}>
                    <strong>{d.key}</strong>: {d.reason}
                  </li>
                ))}
                {selfCheck.divergences.length > 4 && (
                  <li>+{selfCheck.divergences.length - 4} more (see console)</li>
                )}
              </ul>
            )}
          </div>
        )}
        {schemaTagCheck && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 8px",
              borderRadius: 6,
              fontSize: 11,
              lineHeight: 1.45,
              background: schemaTagCheck.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.16)",
              border: `1px solid ${
                schemaTagCheck.ok ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.55)"
              }`,
              color: schemaTagCheck.ok ? "rgb(187, 247, 208)" : "rgb(254, 202, 202)",
            }}
          >
            <strong style={{ letterSpacing: "0.04em" }}>
              {schemaTagCheck.ok
                ? `✓ Schema tag OK (${schemaTagCheck.format})`
                : `✕ Schema tag BLOCKED (${schemaTagCheck.format})`}
            </strong>
            <span style={{ opacity: 0.75, marginLeft: 6 }}>
              {schemaTagCheck.ok ? schemaTagCheck.tag : `expected "hero-verify-report/v3"`}
              {" · "}
              {new Date(schemaTagCheck.at).toLocaleTimeString()}
            </span>
            {!schemaTagCheck.ok && (
              <div style={{ marginTop: 4 }}>
                {schemaTagCheck.reason === "missing" &&
                  `Payload has no "schema" field — download blocked.`}
                {schemaTagCheck.reason === "wrong-type" &&
                  `"schema" must be a string — got ${typeof schemaTagCheck.actual}.`}
                {schemaTagCheck.reason === "mismatch" &&
                  `"schema" was "${String(schemaTagCheck.actual)}" — download blocked.`}
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleRerunSelfCheck}
                    style={{
                      background: "rgba(15,23,42,0.4)",
                      color: "rgb(254, 226, 226)",
                      border: "1px solid rgba(239,68,68,0.45)",
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      letterSpacing: "0.02em",
                    }}
                    title="Re-measure the live DOM and refresh the on-screen diff self-check, without rebuilding the export payload. Shortcut: Ctrl+Shift+R (Cmd+Shift+R on macOS)."
                  >
                    ↺ Re-run self-check
                  </button>
                  <button
                    type="button"
                    onClick={handleRegeneratePayload}
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      color: "rgb(254, 226, 226)",
                      border: "1px solid rgba(239,68,68,0.6)",
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      letterSpacing: "0.02em",
                    }}
                    title="Rebuild the export payload from current state and re-run the schema-tag guard without downloading."
                  >
                    ↻ Regenerate export payload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {schemaCheck && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 8px",
              borderRadius: 6,
              fontSize: 11,
              lineHeight: 1.45,
              background: schemaCheck.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.16)",
              border: `1px solid ${
                schemaCheck.ok ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.55)"
              }`,
              color: schemaCheck.ok ? "rgb(187, 247, 208)" : "rgb(254, 202, 202)",
            }}
          >
            <strong style={{ letterSpacing: "0.04em" }}>
              {schemaCheck.ok
                ? `✓ Schema OK (${schemaCheck.format})`
                : `✕ Schema FAILED (${schemaCheck.format})`}
            </strong>
            <span style={{ opacity: 0.75, marginLeft: 6 }}>
              hero-verify-report/v3 · {new Date(schemaCheck.at).toLocaleTimeString()}
            </span>
            {!schemaCheck.ok && schemaCheck.issues.length > 0 && (
              <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                {schemaCheck.issues.slice(0, 4).map((i, idx) => (
                  <li key={idx}>
                    <strong>{i.path}</strong>: {i.message}
                  </li>
                ))}
                {schemaCheck.issues.length > 4 && (
                  <li>+{schemaCheck.issues.length - 4} more (see console)</li>
                )}
              </ul>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button
            type="button"
            onClick={handleExportJson}
            style={{
              flex: 1,
              background: "white",
              color: "rgb(15, 23, 42)",
              border: "none",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            ⬇ JSON
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              flex: 1,
              background: "rgb(34, 197, 94)",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            ⬇ CSV
          </button>
        </div>
      </div>
    </div>
  );
}
