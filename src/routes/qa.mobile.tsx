import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";

/**
 * /qa/mobile — Internal pre-publish checklist
 *
 *  - Mirrors docs/qa/mobile-regression.md, but interactive.
 *  - Progress is persisted in localStorage so a reviewer can pause and
 *    come back. A "Reset" button clears the run.
 *  - This is intentionally unlinked from the public nav. Reach it by
 *    typing /qa/mobile.
 *
 *  Keep this list in sync with docs/qa/mobile-regression.md.
 */

type Section = {
  id: string;
  title: string;
  items: string[];
};

const SECTIONS: Section[] = [
  {
    id: "states",
    title: "1 — States: hover / active / focus",
    items: [
      "Primary CTAs show visible gold focus ring with offset",
      "Secondary CTAs flip to --charcoal and shrink to 0.98 on :active",
      "Card hover lifts ≤2px, never overlapping neighbours",
      "Sticky CTA focus ring not clipped by safe-area inset",
      "WhatsApp FAB tooltip appears on focus (not hover only)",
      "Header menu trigger focus ring visible on transparent + scrolled",
      "Arrow icons only translate on hover, never disappear",
    ],
  },
  {
    id: "spacing",
    title: "2 — Spacing & alignment",
    items: [
      "No element clipped at right edge by WhatsApp FAB halo",
      "Hero eyebrow / h1 / body / CTAs share the same gutter",
      "Why YES 01..05 numbers fully readable, never under FAB",
      "Signature cards share consistent vertical rhythm",
      "Premium blocks: gold rule 16–20px above title, below image",
      "FAQ chevron and label baseline aligned, no wrap",
      "Final CTA centered, ≥44px tall, single button",
      "Trustmary frame has visible padding on all 4 sides",
    ],
  },
  {
    id: "typography",
    title: "3 — Typography & wording",
    items: [
      "No truncation of headlines on 360px width",
      "No invisible text (light grey on ivory)",
      "No text overlapping floating UI (FAB, sticky CTA)",
      "Letter-spaced labels wrap cleanly",
      "Hero animation completes ≤1.7s, no permanently invisible text",
    ],
  },
  {
    id: "motion",
    title: "4 — Motion & images",
    items: [
      "Clip-path reveal completes when block enters viewport",
      "Ken Burns drift is gentle (≤6% scale)",
      "3D tilt is desktop-only (no jitter on touch)",
      "prefers-reduced-motion disables parallax/sheen/glow/tilt",
      "Images load at correct aspect ratio, no layout shift",
    ],
  },
  {
    id: "trustmary",
    title: "5 — Trustmary widget",
    items: [
      "Widget frame visible before script loads (≥280px)",
      "Widget renders inside sand frame, no overflow on 360px",
      "Caption 'Independently collected via Trustmary' is visible",
    ],
  },
  {
    id: "smoke",
    title: "6 — Pre-publish smoke",
    items: [
      "Lighthouse mobile ≥85 perf / 95 a11y",
      "No console errors on the homepage",
      "All hero/signature/premium images load",
      "Sticky CTA + FAB respect iOS safe-area-inset-bottom",
    ],
  },
];

const STORAGE_KEY = "qa-mobile-checklist-v1";

export const Route = createFileRoute("/qa/mobile")({
  component: QaMobilePage,
  head: () => ({
    meta: [
      { title: "Mobile QA — YesExperiences (internal)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function QaMobilePage() {
  const allItems = useMemo(
    () => SECTIONS.flatMap((s) => s.items.map((label) => `${s.id}::${label}`)),
    [],
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      /* noop */
    }
  }, [checked]);

  const total = allItems.length;
  const done = Object.values(checked).filter(Boolean).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const toggle = (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const reset = () => {
    if (
      typeof window !== "undefined" &&
      done > 0 &&
      !window.confirm("Clear all checked items on this device?")
    ) {
      return;
    }
    setChecked({});
    toast.success("Checklist reset");
  };

  /* ── Export ──────────────────────────────────────────────────────
     Snapshot the current run as a portable JSON payload that can be
     re-imported on another device. We include a schema version so we
     can evolve the format without breaking older exports. */
  const SCHEMA_NAME = "yes-qa-mobile-checklist" as const;
  const SCHEMA_VERSION = 1 as const;

  type ChecklistExport = {
    schema: typeof SCHEMA_NAME;
    version: typeof SCHEMA_VERSION;
    exportedAt: string; // ISO string
    progress: { done: number; total: number; pct: number };
    checked: Record<string, boolean>;
  };

  const buildExport = (): ChecklistExport => ({
    schema: SCHEMA_NAME,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    progress: { done, total, pct },
    checked,
  });

  const exportJson = async () => {
    const payload = buildExport();
    const json = JSON.stringify(payload, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `yes-qa-mobile-${stamp}.json`;

    // Prefer the native share sheet on mobile when a File can be shared
    // (iOS 15+ / modern Android Chrome). Falls back to a download link.
    try {
      const blob = new Blob([json], { type: "application/json" });
      const file = new File([blob], filename, { type: "application/json" });
      const navAny = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
      };
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "YES Mobile QA checklist",
          text: `Mobile QA checklist · ${done}/${total} (${pct}%)`,
        });
        toast.success("Shared checklist");
        return;
      }
    } catch {
      /* fall through to download */
    }

    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Checklist exported");
    } catch {
      toast.error("Could not export — try copy instead");
    }
  };

  const copyJson = async () => {
    const json = JSON.stringify(buildExport(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Copied JSON to clipboard");
    } catch {
      toast.error("Clipboard blocked — use Export instead");
    }
  };

  /* ── Import ──────────────────────────────────────────────────────
     Accept either a .json file (file input) or a pasted JSON string
     (textarea inside a small inline panel). Validate the shape before
     overwriting state, and ask for confirmation if there's existing
     progress so a careless paste can't wipe a run.                   */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const applyImport = (raw: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error("Invalid JSON", {
        description: "The file isn't valid JSON. Your current progress is unchanged.",
      });
      return false;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      toast.error("Unrecognized checklist format", {
        description: "Expected a JSON object. Your current progress is unchanged.",
      });
      return false;
    }
    const obj = parsed as Record<string, unknown>;

    // Strict path — payload looks like our envelope (has schema or version).
    // We refuse anything that doesn't match the exact name + supported
    // version, so an export from a future or unrelated tool can't quietly
    // overwrite the run.
    const looksLikeEnvelope = "schema" in obj || "version" in obj;
    let nextChecked: Record<string, boolean> | null = null;

    if (looksLikeEnvelope) {
      if (obj.schema !== SCHEMA_NAME) {
        toast.error("Wrong checklist schema", {
          description: `Expected "${SCHEMA_NAME}", got "${String(obj.schema ?? "—")}". Your current progress is unchanged.`,
        });
        return false;
      }
      if (obj.version !== SCHEMA_VERSION) {
        toast.error("Incompatible checklist version", {
          description: `This tool supports version ${SCHEMA_VERSION}; the file is version ${String(obj.version ?? "—")}. Your current progress is unchanged.`,
        });
        return false;
      }
      const inner = obj.checked;
      if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
        toast.error("Checklist payload is missing items", {
          description:
            "Expected a `checked` object inside the envelope. Your current progress is unchanged.",
        });
        return false;
      }
      nextChecked = inner as Record<string, boolean>;
    } else {
      // Bare {key: boolean} map — unversioned, accept but flag.
      nextChecked = obj as Record<string, boolean>;
    }
    // Strict type check: every value in `checked` must be a real boolean.
    // If any value isn't, refuse the import entirely and keep the current
    // run intact — no silent coercion, no partial apply.
    const invalidEntries: Array<{ key: string; type: string; value: string }> = [];
    for (const [k, v] of Object.entries(nextChecked)) {
      if (typeof v !== "boolean") {
        let preview: string;
        try {
          preview = JSON.stringify(v);
        } catch {
          preview = String(v);
        }
        if (preview && preview.length > 24) preview = preview.slice(0, 21) + "…";
        invalidEntries.push({
          key: k,
          type: v === null ? "null" : Array.isArray(v) ? "array" : typeof v,
          value: preview ?? String(v),
        });
      }
    }
    if (invalidEntries.length > 0) {
      const sample = invalidEntries
        .slice(0, 2)
        .map((e) => `"${e.key}": ${e.value} (${e.type})`)
        .join(", ");
      const more = invalidEntries.length > 2 ? ` …and ${invalidEntries.length - 2} more` : "";
      toast.error("Checklist has non-boolean values", {
        description: `Every \`checked\` value must be true or false. Got ${sample}${more}. Your current progress is unchanged.`,
      });
      return false;
    }
    // Sanitize: drop keys we no longer know about (stale items from older
    // schema versions). All remaining values are guaranteed booleans.
    const known = new Set(allItems);
    const clean: Record<string, boolean> = {};
    let kept = 0;
    let dropped = 0;
    for (const [k, v] of Object.entries(nextChecked as Record<string, boolean>)) {
      if (known.has(k)) {
        clean[k] = v;
        kept += 1;
      } else {
        dropped += 1;
      }
    }
    // No recognizable items → refuse rather than wipe the run.
    if (kept === 0) {
      toast.error("No matching checklist items", {
        description:
          dropped > 0
            ? `All ${dropped} item${dropped === 1 ? "" : "s"} in the file are unknown to this checklist. Your current progress is unchanged.`
            : "The file didn't contain any boolean items. Your current progress is unchanged.",
      });
      return false;
    }
    if (
      done > 0 &&
      typeof window !== "undefined" &&
      !window.confirm("Replace your current progress with the imported run?")
    ) {
      return false;
    }
    setChecked(clean);
    toast.success(
      `Imported ${kept} item${kept === 1 ? "" : "s"}` +
        (dropped > 0 ? ` · ${dropped} unknown skipped` : ""),
      looksLikeEnvelope
        ? undefined
        : { description: "No schema/version found — accepted as a bare map." },
    );
    return true;
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      applyImport(text);
    };
    reader.onerror = () => toast.error("Could not read file");
    reader.readAsText(file);
  };

  const submitPastedImport = () => {
    if (!importText.trim()) {
      toast.error("Paste a JSON payload first");
      return;
    }
    if (applyImport(importText)) {
      setImportText("");
      setImportPanelOpen(false);
    }
  };

  return (
    <SiteLayout>
      <section className="section-y bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <span className="inline-flex items-center gap-2.5 text-[10.5px] uppercase tracking-[0.32em] font-bold text-[color:var(--charcoal)]">
            <span
              aria-hidden="true"
              className="inline-block h-[5px] w-[5px] rounded-full bg-[color:var(--gold)]"
            />
            Internal · pre-publish
          </span>
          <h1 className="serif mt-5 text-[2.4rem] md:text-[3.4rem] leading-[1.04] tracking-[-0.016em] text-[color:var(--charcoal)] font-semibold">
            Mobile visual regression <span className="italic font-medium">checklist.</span>
          </h1>
          <p className="mt-5 text-[15.5px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.65]">
            Run through this list at <strong>393 × 852</strong> and spot-check 360 / 414 widths
            before publishing. Progress is saved on this device.
          </p>

          <div className="mt-8 rounded-[4px] border border-[color:var(--border)] bg-[color:var(--sand)]/60 p-4 md:p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                Progress
              </span>
              <span className="text-[13px] font-semibold text-[color:var(--teal)]">
                {done} / {total} · {pct}%
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-[color:var(--ivory)] rounded-full overflow-hidden border border-[color:var(--border)]">
              <div
                className="h-full bg-[color:var(--teal)] transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Action row — wraps cleanly on 360px. All buttons share
                the same min-height so the touch targets stay even. */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center justify-center min-h-[44px] px-5 text-[12px] uppercase tracking-[0.2em] font-semibold bg-[color:var(--teal)] text-[color:var(--ivory)] hover:bg-[color:var(--teal-2)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sand)] transition-colors"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => setImportPanelOpen((v) => !v)}
                aria-expanded={importPanelOpen}
                className="inline-flex items-center justify-center min-h-[44px] px-5 text-[12px] uppercase tracking-[0.2em] font-semibold border border-[color:var(--charcoal)] bg-[color:var(--ivory)] text-[color:var(--charcoal)] hover:bg-[color:var(--charcoal)] hover:text-[color:var(--ivory)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-colors"
              >
                {importPanelOpen ? "Close import" : "Import JSON"}
              </button>
              <button
                type="button"
                onClick={copyJson}
                className="inline-flex items-center justify-center min-h-[44px] px-5 text-[12px] uppercase tracking-[0.2em] font-semibold border border-[color:var(--border)] bg-[color:var(--ivory)] text-[color:var(--charcoal)] hover:border-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              >
                Copy JSON
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center min-h-[44px] px-5 text-[12px] uppercase tracking-[0.2em] font-semibold border border-[color:var(--border)] bg-[color:var(--ivory)] text-[color:var(--charcoal-soft)] hover:border-[color:var(--charcoal)] hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              >
                Reset
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onFilePicked}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />

            {importPanelOpen ? (
              <div className="mt-5 rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-4">
                <p className="text-[12.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]">
                  Import a saved run
                </p>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-[color:var(--charcoal)]">
                  Pick a previously exported <code>.json</code> file, or paste the JSON below. Your
                  current progress will be replaced.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center min-h-[44px] px-5 text-[12px] uppercase tracking-[0.2em] font-semibold bg-[color:var(--charcoal)] text-[color:var(--ivory)] hover:bg-[color:var(--charcoal-soft)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] transition-colors"
                  >
                    Choose file
                  </button>
                </div>
                <label className="mt-4 block">
                  <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal-soft)]">
                    Or paste JSON
                  </span>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={6}
                    spellCheck={false}
                    placeholder='{"schema":"yes-qa-mobile-checklist", ...}'
                    className="mt-2 w-full rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-3 font-mono text-[12.5px] leading-[1.55] text-[color:var(--charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={submitPastedImport}
                    className="inline-flex items-center justify-center min-h-[44px] px-5 text-[12px] uppercase tracking-[0.2em] font-semibold bg-[color:var(--teal)] text-[color:var(--ivory)] hover:bg-[color:var(--teal-2)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] transition-colors"
                  >
                    Apply paste
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportText("");
                      setImportPanelOpen(false);
                    }}
                    className="inline-flex items-center justify-center min-h-[44px] px-5 text-[12px] uppercase tracking-[0.2em] font-semibold border border-[color:var(--border)] bg-[color:var(--ivory)] text-[color:var(--charcoal)] hover:border-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-12 space-y-12">
            {SECTIONS.map((section) => (
              <div key={section.id}>
                <h2 className="serif text-[1.7rem] md:text-[2rem] leading-[1.15] text-[color:var(--charcoal)] font-semibold">
                  {section.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {section.items.map((label) => {
                    const key = `${section.id}::${label}`;
                    const isOn = !!checked[key];
                    return (
                      <li key={key}>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isOn}
                            onChange={() => toggle(key)}
                            className="mt-[3px] h-5 w-5 accent-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                          />
                          <span
                            className={
                              "text-[15px] leading-[1.55] transition-colors " +
                              (isOn
                                ? "text-[color:var(--charcoal-soft)] line-through"
                                : "text-[color:var(--charcoal)]")
                            }
                          >
                            {label}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-14 text-[11px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
            Source of truth · docs/qa/mobile-regression.md
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
