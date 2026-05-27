import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { runTourImport } from "@/lib/tourImporter.functions";
import {
  listMappingRules,
  saveMappingRules,
  deleteMappingRules,
} from "@/server/mappingRules.functions";
import {
  fetchViatorArrabida,
  saveViatorArrabida,
  bulkImportViatorTours,
} from "@/server/viatorTour.functions";
import { DEFAULT_MAPPING_RULES } from "@/data/defaultMappingRules";
import { signatureTours } from "@/data/signatureTours";
import { checkViatorUrlMatchesTour, type UrlMatchResult } from "@/lib/viatorUrlMatch";
import { toast } from "sonner";
import { Loader2, RefreshCw, Check, AlertTriangle, Sliders, Trash2, Plus, Image as ImageIcon, ImageOff, Link2, Link2Off, Download, Save } from "lucide-react";

const FILTER_VALUES = ["all", "with-image", "missing-image", "matched", "unmatched"] as const;
type FilterValue = (typeof FILTER_VALUES)[number];

const searchSchema = z.object({
  filter: fallback(z.enum(FILTER_VALUES), "all").default("all"),
});

export const Route = createFileRoute("/admin/import-tours")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [{ title: "Import Tours — Studio Admin" }],
  }),
  component: AdminImportPage,
});

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

type ImportedRow = {
  id: string;
  title: string;
  region_label: string;
  duration_label: string;
  duration_hours: string;
  price_from: number;
  theme: string;
  styles: string[];
  highlights: string[];
  pace: string;
  tier: string;
  fits_best: string;
  blurb: string;
  stops: { label: string; tag: string; x: number; y: number }[];
  imported_at: string;
  image_url: string | null;
  source_url: string;
};

const SELECT_COLS =
  "id,title,region_label,duration_label,duration_hours,price_from,theme,styles,highlights,pace,tier,fits_best,blurb,stops,imported_at,image_url,source_url";

function normalizeUrl(u: string): string {
  return u.replace(/\/+$/, "").toLowerCase();
}
const SIGNATURE_BY_URL = new Map(
  signatureTours.map((t) => [normalizeUrl(t.bookingUrl), t]),
);

function AdminImportPage() {
  const navigate = useNavigate();
  const { filter } = Route.useSearch();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tours, setTours] = useState<ImportedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    status: string;
    toursImported: number;
    toursFailed: number;
    errors: string[];
  } | null>(null);

  const runImport = useServerFn(runTourImport);
  const callListRules = useServerFn(listMappingRules);
  const callSaveRules = useServerFn(saveMappingRules);
  const callDeleteRules = useServerFn(deleteMappingRules);
  const callFetchViator = useServerFn(fetchViatorArrabida);
  const callSaveViator = useServerFn(saveViatorArrabida);
  const callBulkViator = useServerFn(bulkImportViatorTours);

  // ----- Bulk import: paste id|url per line, run all at once -----
  const bulkTemplate = signatureTours
    .map((t) => `${t.id} | ${t.bookingUrl}`)
    .join("\n");
  const [bulkText, setBulkText] = useState(bulkTemplate);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    results: { id: string; url: string; ok: boolean; stopsSaved?: number; error?: string }[];
  } | null>(null);

  const parseBulk = (
    text: string,
  ): { items: { id: string; url: string }[]; errors: string[] } => {
    const items: { id: string; url: string }[] = [];
    const errors: string[] = [];
    text.split(/\r?\n/).forEach((rawLine, i) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return;
      // Accept "id | url", "id, url", "id url" or "id\turl".
      const m = line.split(/\s*[|,\t]\s*|\s+/);
      if (m.length < 2) {
        errors.push(`Line ${i + 1}: expected "id | url"`);
        return;
      }
      const id = m[0];
      const url = m.slice(1).join(" ").trim();
      if (!/^https?:\/\//i.test(url)) {
        errors.push(`Line ${i + 1}: "${url}" is not a URL`);
        return;
      }
      items.push({ id, url });
    });
    return { items, errors };
  };

  const [bulkOverride, setBulkOverride] = useState(false);

  // Live mismatch check for every parsed line — runs locally on each keystroke.
  const bulkChecks = useMemo(() => {
    const { items, errors } = parseBulk(bulkText);
    const checks = items.map((it) => {
      const seed = signatureTours.find((t) => t.id === it.id);
      const check = seed
        ? checkViatorUrlMatchesTour(it.url, seed.id, seed.title)
        : ({ kind: "invalid", reason: "Unknown tour id" } as UrlMatchResult);
      return { ...it, knownId: !!seed, check };
    });
    const mismatches = checks.filter(
      (c) => c.check.kind === "mismatch" || c.check.kind === "invalid" || !c.knownId,
    );
    const weak = checks.filter((c) => c.check.kind === "weak");
    return { items, errors, checks, mismatches, weak };
  }, [bulkText]);

  const onBulkImport = async () => {
    const { items, errors, mismatches } = bulkChecks;
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    if (!items.length) {
      toast.error("Paste at least one id | url line.");
      return;
    }
    if (mismatches.length > 0 && !bulkOverride) {
      toast.error(
        `${mismatches.length} URL${mismatches.length === 1 ? "" : "s"} don't match the tour id. Tick 'Import anyway' to override.`,
      );
      return;
    }
    setBulkRunning(true);
    setBulkResults(null);
    try {
      const r = await callBulkViator({ data: { items } });
      setBulkResults(r);
      if (r.failed === 0) toast.success(`Imported ${r.succeeded}/${r.total} tours`);
      else toast.warning(`${r.succeeded} ok · ${r.failed} failed`);
      const { data: rows } = await supabase
        .from("imported_tours")
        .select(SELECT_COLS)
        .order("imported_at", { ascending: false });
      setTours((rows as ImportedRow[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk import failed");
    } finally {
      setBulkRunning(false);
    }
  };


  // ----- Arrábida P3 Viator source panel -----
  type ViatorItineraryStep = {
    order: number;
    label: string;
    description: string;
    optional: boolean;
  };
  type ViatorPreview = {
    title: string;
    durationText: string;
    pickupZone: string;
    groupType: string;
    blurb: string;
    itinerary: ViatorItineraryStep[];
    inclusions: string[];
    exclusions: string[];
    variesByOption: string[];
  };
  const [viatorUrl, setViatorUrl] = useState("");
  const [viatorPreview, setViatorPreview] = useState<ViatorPreview | null>(null);
  const [viatorFetching, setViatorFetching] = useState(false);
  const [viatorSaving, setViatorSaving] = useState(false);
  const [viatorError, setViatorError] = useState<string | null>(null);

  // Live URL match preview for the Arrábida P3 panel.
  const arrabidaSeed = signatureTours.find((t) => t.id === "arrabida-wine-allinclusive");
  const viatorUrlCheck: UrlMatchResult | null = useMemo(() => {
    if (!viatorUrl.trim() || !arrabidaSeed) return null;
    return checkViatorUrlMatchesTour(viatorUrl, arrabidaSeed.id, arrabidaSeed.title);
  }, [viatorUrl, arrabidaSeed]);
  const [viatorOverride, setViatorOverride] = useState(false);

  const onFetchViator = async () => {
    setViatorError(null);
    setViatorPreview(null);
    if (!viatorUrl.trim()) {
      setViatorError("Paste a Viator tour URL first.");
      return;
    }
    if (viatorUrlCheck && viatorUrlCheck.kind === "invalid") {
      setViatorError(viatorUrlCheck.reason);
      return;
    }
    if (
      viatorUrlCheck &&
      (viatorUrlCheck.kind === "mismatch" || viatorUrlCheck.kind === "weak") &&
      !viatorOverride
    ) {
      setViatorError(
        "This URL doesn't look like the Arrábida P3 tour. Tick 'Fetch anyway' to override.",
      );
      return;
    }
    setViatorFetching(true);
    try {
      const result = await callFetchViator({ data: { url: viatorUrl.trim() } });
      setViatorPreview(result.extraction as ViatorPreview);
      toast.success("Fetched from Viator — review and save");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fetch failed";
      setViatorError(msg);
      toast.error(msg);
    } finally {
      setViatorFetching(false);
    }
  };


  const onSaveViator = async () => {
    if (!viatorPreview) return;
    setViatorSaving(true);
    try {
      const result = await callSaveViator({
        data: { url: viatorUrl.trim(), extraction: viatorPreview },
      });
      toast.success(`Saved Arrábida P3 — ${result.stopsSaved} stops`);
      // Refresh imported_tours listing below.
      const { data: rows } = await supabase
        .from("imported_tours")
        .select(SELECT_COLS)
        .order("imported_at", { ascending: false });
      setTours((rows as ImportedRow[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setViatorError(msg);
      toast.error(msg);
    } finally {
      setViatorSaving(false);
    }
  };

  type RuleRow = {
    id: string;
    name: string;
    notes: string | null;
    rules: unknown;
    is_active: boolean;
    updated_at: string;
  };
  const [rulesList, setRulesList] = useState<RuleRow[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | "new" | null>(null);
  const [ruleDraft, setRuleDraft] = useState<{
    name: string;
    notes: string;
    json: string;
    isActive: boolean;
  }>({ name: "", notes: "", json: JSON.stringify(DEFAULT_MAPPING_RULES, null, 2), isActive: false });
  const [savingRules, setSavingRules] = useState(false);

  const refreshRules = async () => {
    try {
      const r = await callListRules();
      setRulesList(r.rules as RuleRow[]);
    } catch (e) {
      // silent — admin gate handles auth errors below
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) navigate({ to: "/auth" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate({ to: "/auth" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  // Check admin role + load existing tours.
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleRow);

      const { data: rows } = await supabase
        .from("imported_tours")
        .select(SELECT_COLS)
        .order("imported_at", { ascending: false });
      setTours((rows as ImportedRow[]) ?? []);
      if (roleRow) await refreshRules();
    })();
  }, [session]);

  const startNewRule = () => {
    setEditingRuleId("new");
    setRuleDraft({
      name: "Custom mapping",
      notes: "",
      json: JSON.stringify(DEFAULT_MAPPING_RULES, null, 2),
      isActive: rulesList.length === 0,
    });
  };

  const editRule = (r: RuleRow) => {
    setEditingRuleId(r.id);
    setRuleDraft({
      name: r.name,
      notes: r.notes ?? "",
      json: JSON.stringify(r.rules, null, 2),
      isActive: r.is_active,
    });
  };

  const cancelEdit = () => setEditingRuleId(null);

  const onSaveRule = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(ruleDraft.json);
    } catch {
      toast.error("Mapping rules JSON is invalid");
      return;
    }
    setSavingRules(true);
    try {
      await callSaveRules({
        data: {
          id: editingRuleId && editingRuleId !== "new" ? editingRuleId : undefined,
          name: ruleDraft.name,
          notes: ruleDraft.notes || null,
          rules: parsed,
          isActive: ruleDraft.isActive,
        },
      });
      toast.success("Mapping rules saved");
      setEditingRuleId(null);
      await refreshRules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingRules(false);
    }
  };

  const onDeleteRule = async (id: string) => {
    if (!confirm("Delete this mapping rule set?")) return;
    try {
      await callDeleteRules({ data: { id } });
      toast.success("Deleted");
      await refreshRules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const onImport = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const result = await runImport();
      setLastResult({
        status: result.status,
        toursImported: result.toursImported,
        toursFailed: result.toursFailed,
        errors: result.errors,
      });
      const { data: rows } = await supabase
        .from("imported_tours")
        .select(SELECT_COLS)
        .order("imported_at", { ascending: false });
      setTours((rows as ImportedRow[]) ?? []);
      if (result.status === "success") toast.success(`Imported ${result.toursImported} tours`);
      else if (result.status === "partial")
        toast.warning(`Imported ${result.toursImported}, ${result.toursFailed} failed`);
      else toast.error("Import failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const headerLine = useMemo(() => {
    if (!session) return "";
    return session.user.email ?? session.user.id;
  }, [session]);

  /**
   * Coverage stats: how many imported tours have a saved image, how many are
   * missing one, and how many were successfully matched to a curated
   * SignatureTour (so the public cards on /experiences will pick up the live
   * imagery). These power the indicator panel + the per-row badges below.
   */
  const stats = useMemo(() => {
    const total = tours.length;
    const withImage = tours.filter((t) => !!t.image_url).length;
    const matched = tours.filter((t) =>
      SIGNATURE_BY_URL.has(normalizeUrl(t.source_url)),
    ).length;
    const matchedWithImage = tours.filter(
      (t) => !!t.image_url && SIGNATURE_BY_URL.has(normalizeUrl(t.source_url)),
    ).length;
    return {
      total,
      withImage,
      missingImage: total - withImage,
      matched,
      matchedWithImage,
      signatureTotal: signatureTours.length,
    };
  }, [tours]);

  /**
   * Subset of imported tours after applying the active filter pill. The pills
   * surface the same buckets that drive the coverage stats, so users can drill
   * into "missing image" or "unmatched" rows directly without scanning.
   */
  const filteredTours = useMemo(() => {
    return tours.filter((t) => {
      const hasImage = !!t.image_url;
      const matched = SIGNATURE_BY_URL.has(normalizeUrl(t.source_url));
      switch (filter) {
        case "with-image": return hasImage;
        case "missing-image": return !hasImage;
        case "matched": return matched;
        case "unmatched": return !matched;
        case "all":
        default: return true;
      }
    });
  }, [tours, filter]);

  if (!session) return null; // redirecting

  if (isAdmin === false) {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 min-h-[70vh]">
          <div className="container-x max-w-xl">
            <span className="eyebrow">Studio Admin</span>
            <h1 className="serif text-4xl mt-4">Admin only</h1>
            <p className="mt-4 text-[color:var(--charcoal-soft)]">
              Your account ({headerLine}) doesn't have the <code>admin</code> role yet.
              Ask the workspace owner to grant it via the database.
            </p>
            <button
              onClick={signOut}
              className="mt-8 border border-[color:var(--border)] hover:border-[color:var(--gold)] px-5 py-3 text-sm"
            >
              Sign out
            </button>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-32 pb-20">
        <div className="container-x max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Studio Admin</span>
              <h1 className="serif text-4xl mt-4">Import Tours</h1>
              <p className="mt-3 text-sm text-[color:var(--charcoal-soft)] max-w-xl">
                Fetches the live YES experiences catalog, maps each tour to builder
                regions, durations, signature moments and stop coordinates with AI,
                and saves them to the database.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[color:var(--charcoal-soft)]">
              <span>{headerLine}</span>
              <button
                onClick={signOut}
                className="border border-[color:var(--border)] hover:border-[color:var(--gold)] px-3 py-1.5"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onImport}
              disabled={loading || isAdmin !== true}
              className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-6 py-3 text-sm tracking-wide transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {loading ? "Importing…" : "Run import now"}
            </button>
            <Link
              to="/experiences"
              className="inline-flex items-center justify-center border border-[color:var(--border)] hover:border-[color:var(--gold)] px-6 py-3 text-sm"
            >
              View public Signature page
            </Link>
          </div>

          {lastResult && (
            <div
              className={`mt-6 p-4 border ${
                lastResult.status === "success"
                  ? "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5"
                  : lastResult.status === "partial"
                    ? "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/10"
                    : "border-red-400/60 bg-red-50"
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                {lastResult.status === "success" ? (
                  <Check size={16} className="text-[color:var(--teal)]" />
                ) : (
                  <AlertTriangle size={16} className="text-[color:var(--gold)]" />
                )}
                <span className="font-medium uppercase tracking-[0.18em] text-xs">
                  {lastResult.status}
                </span>
                <span className="text-[color:var(--charcoal-soft)]">
                  {lastResult.toursImported} imported · {lastResult.toursFailed} failed
                </span>
              </div>
              {lastResult.errors.length > 0 && (
                <ul className="mt-3 text-xs text-[color:var(--charcoal-soft)] list-disc pl-5 space-y-1">
                  {lastResult.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ----- Arrábida P3 — Viator source-of-truth panel ----- */}
          <div className="mt-12 border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-[color:var(--teal)]" />
              <h2 className="serif text-2xl">Arrábida P3 — Viator source</h2>
            </div>
            <p className="mt-2 text-xs text-[color:var(--charcoal-soft)] max-w-2xl">
              Paste the exact Viator tour URL for the Arrábida P3 day. Lovable AI
              extracts the real itinerary, inclusions, exclusions and optional
              stops, and updates the <code>arrabida-wine-allinclusive</code>{" "}
              entry in the database. Review the preview before saving — nothing
              is written until you click <strong>Save</strong>.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                inputMode="url"
                placeholder="https://www.viator.com/tours/Lisbon/..."
                value={viatorUrl}
                onChange={(e) => setViatorUrl(e.target.value)}
                disabled={viatorFetching || viatorSaving}
                className="flex-1 border border-[color:var(--border)] px-3 py-2.5 text-sm bg-[color:var(--ivory)] focus:outline-none focus:border-[color:var(--teal)]"
              />
              <button
                onClick={onFetchViator}
                disabled={viatorFetching || viatorSaving || !viatorUrl.trim()}
                className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-5 py-2.5 text-sm tracking-wide transition-all"
              >
                {viatorFetching ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {viatorFetching ? "Fetching…" : "Fetch from Viator"}
              </button>
            </div>

            {viatorUrlCheck && viatorUrlCheck.kind !== "ok" && (
              <div
                className={`mt-3 p-3 border text-xs flex items-start gap-2 ${
                  viatorUrlCheck.kind === "weak"
                    ? "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/10 text-[color:var(--charcoal)]"
                    : "border-red-400/60 bg-red-50 text-red-700"
                }`}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div className="space-y-1">
                  {viatorUrlCheck.kind === "invalid" && (
                    <span>{viatorUrlCheck.reason}</span>
                  )}
                  {viatorUrlCheck.kind === "mismatch" && (
                    <>
                      <div>
                        This URL doesn't look like the Arrábida P3 tour. Expected
                        keywords:{" "}
                        <span className="font-mono">
                          {viatorUrlCheck.expected.slice(0, 5).join(", ")}
                        </span>
                        .
                      </div>
                      {viatorUrlCheck.productCode && (
                        <div className="opacity-80">
                          Detected product code: {viatorUrlCheck.productCode}
                        </div>
                      )}
                    </>
                  )}
                  {viatorUrlCheck.kind === "weak" && (
                    <div>
                      Only one keyword matched (
                      <span className="font-mono">
                        {viatorUrlCheck.matchedKeywords.join(", ")}
                      </span>
                      ). Double-check this is the right Viator product.
                    </div>
                  )}
                  {(viatorUrlCheck.kind === "mismatch" ||
                    viatorUrlCheck.kind === "weak") && (
                    <label className="inline-flex items-center gap-1.5 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={viatorOverride}
                        onChange={(e) => setViatorOverride(e.target.checked)}
                      />
                      <span>Fetch anyway</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {viatorError && (
              <div className="mt-3 p-3 border border-red-400/60 bg-red-50 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{viatorError}</span>
              </div>
            )}

            {viatorPreview && (
              <div className="mt-5 border-t border-[color:var(--border)] pt-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="serif text-xl">{viatorPreview.title}</h3>
                  <p className="text-xs text-[color:var(--charcoal-soft)]">
                    {viatorPreview.durationText} · {viatorPreview.groupType} ·
                    Pickup: {viatorPreview.pickupZone}
                  </p>
                  <p className="text-sm mt-2 text-[color:var(--charcoal)]">
                    {viatorPreview.blurb}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-2">
                    Itinerary ({viatorPreview.itinerary.length} stops)
                  </h4>
                  <ol className="space-y-2">
                    {viatorPreview.itinerary.map((step) => (
                      <li
                        key={step.order}
                        className="flex gap-3 text-sm border-l-2 border-[color:var(--gold)]/40 pl-3"
                      >
                        <span className="text-[color:var(--charcoal-soft)] tabular-nums w-5 shrink-0">
                          {step.order}.
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{step.label}</span>
                            {step.optional && (
                              <span className="text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 bg-[color:var(--gold)]/15 text-[color:var(--gold)]">
                                Optional
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[color:var(--charcoal-soft)] mt-0.5">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {viatorPreview.inclusions.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-2">
                        Included
                      </h4>
                      <ul className="space-y-1 list-disc pl-4">
                        {viatorPreview.inclusions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {viatorPreview.exclusions.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-2">
                        Not included
                      </h4>
                      <ul className="space-y-1 list-disc pl-4">
                        {viatorPreview.exclusions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {viatorPreview.variesByOption.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-2">
                        Varies by option
                      </h4>
                      <ul className="space-y-1 list-disc pl-4">
                        {viatorPreview.variesByOption.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={onSaveViator}
                    disabled={viatorSaving}
                    className="inline-flex items-center justify-center gap-2 bg-[color:var(--charcoal)] hover:bg-[color:var(--charcoal-deep)] disabled:opacity-60 text-[color:var(--ivory)] px-5 py-2.5 text-sm tracking-wide transition-all"
                  >
                    {viatorSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    {viatorSaving ? "Saving…" : "Save to database"}
                  </button>
                  <button
                    onClick={() => {
                      setViatorPreview(null);
                      setViatorError(null);
                    }}
                    disabled={viatorSaving}
                    className="inline-flex items-center justify-center border border-[color:var(--border)] hover:border-[color:var(--gold)] px-5 py-2.5 text-sm"
                  >
                    Discard preview
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ----- Bulk Viator import — all 10 Signature tours ----- */}
          <div className="mt-12 border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-[color:var(--teal)]" />
              <h2 className="serif text-2xl">Bulk import — paste all Viator URLs</h2>
            </div>
            <p className="mt-2 text-xs text-[color:var(--charcoal-soft)] max-w-2xl">
              One line per tour, format <code>tour-id | viator-url</code>. The
              template below is pre-filled with all {signatureTours.length} Signature
              ids and their current bookingUrl — replace each URL with the exact
              Viator product link, then click <strong>Import all</strong>. Each row
              upserts <code>imported_tours</code> with the AI-extracted itinerary.
            </p>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              disabled={bulkRunning}
              spellCheck={false}
              rows={Math.min(14, signatureTours.length + 2)}
              className="mt-4 w-full font-mono text-xs border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 py-2.5 focus:outline-none focus:border-[color:var(--teal)]"
            />

            {(bulkChecks.mismatches.length > 0 || bulkChecks.weak.length > 0) && (
              <div className="mt-3 border border-[color:var(--gold)]/60 bg-[color:var(--gold)]/10 p-3 text-xs space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle size={14} className="text-[color:var(--gold)]" />
                  URL ↔ tour-id check
                </div>
                <ul className="space-y-1">
                  {bulkChecks.checks
                    .filter((c) => c.check.kind !== "ok")
                    .map((c) => (
                      <li key={c.id + c.url} className="flex items-start gap-2">
                        <span
                          className={
                            c.check.kind === "weak"
                              ? "text-[color:var(--gold)]"
                              : "text-red-600"
                          }
                        >
                          {c.check.kind === "weak" ? "?" : "✕"}
                        </span>
                        <span className="font-mono">{c.id}</span>
                        <span className="text-[color:var(--charcoal-soft)]">
                          {c.check.kind === "invalid"
                            ? c.check.reason
                            : c.check.kind === "mismatch"
                              ? `URL doesn't match — expected: ${c.check.expected.slice(0, 4).join(", ")}`
                              : c.check.kind === "weak"
                                ? `weak match (${c.check.matchedKeywords.join(", ")})`
                                : ""}
                        </span>
                      </li>
                    ))}
                </ul>
                {bulkChecks.mismatches.length > 0 && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkOverride}
                      onChange={(e) => setBulkOverride(e.target.checked)}
                    />
                    <span>Import anyway (skip URL check)</span>
                  </label>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onBulkImport}
                disabled={bulkRunning}
                className="inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-5 py-2.5 text-sm tracking-wide transition-all"
              >

                {bulkRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {bulkRunning ? "Importing all…" : "Import all"}
              </button>
              <button
                onClick={() => setBulkText(bulkTemplate)}
                disabled={bulkRunning}
                className="inline-flex items-center justify-center border border-[color:var(--border)] hover:border-[color:var(--gold)] px-5 py-2.5 text-sm"
              >
                Reset to template
              </button>
            </div>

            {bulkResults && (
              <div className="mt-5 border-t border-[color:var(--border)] pt-4 space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  {bulkResults.succeeded} ok · {bulkResults.failed} failed ·
                  {" "}{bulkResults.total} total
                </div>
                <ul className="text-xs space-y-1">
                  {bulkResults.results.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-start gap-2 border-l-2 pl-2 ${
                        r.ok
                          ? "border-[color:var(--teal)]/60"
                          : "border-red-400/70"
                      }`}
                    >
                      {r.ok ? (
                        <Check size={12} className="mt-0.5 text-[color:var(--teal)]" />
                      ) : (
                        <AlertTriangle size={12} className="mt-0.5 text-red-600" />
                      )}
                      <span className="font-mono">{r.id}</span>
                      <span className="text-[color:var(--charcoal-soft)]">
                        {r.ok ? `${r.stopsSaved} stops saved` : r.error}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-12 border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-[color:var(--teal)]" />
                <h2 className="serif text-2xl">Mapping rules</h2>
              </div>

              <button
                onClick={startNewRule}
                className="inline-flex items-center gap-1.5 border border-[color:var(--border)] hover:border-[color:var(--gold)] px-3 py-1.5 text-xs"
              >
                <Plus size={14} /> New ruleset
              </button>
            </div>
            <p className="mt-2 text-xs text-[color:var(--charcoal-soft)] max-w-2xl">
              Choose which fetched fields populate <strong>region</strong>,{" "}
              <strong>signature moments</strong>, <strong>duration</strong> and{" "}
              <strong>stop coordinates</strong>. The active ruleset is applied on every import.
              When the source format changes, switch rulesets without redeploying.
            </p>

            {rulesList.length === 0 && editingRuleId === null && (
              <p className="mt-4 text-sm text-[color:var(--charcoal-soft)]">
                No custom rulesets yet — imports use the built-in defaults. Click{" "}
                <strong>New ruleset</strong> to override.
              </p>
            )}

            {rulesList.length > 0 && (
              <ul className="mt-4 space-y-2">
                {rulesList.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-[color:var(--border)] px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.is_active && (
                        <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 bg-[color:var(--teal)]/10 text-[color:var(--teal)]">
                          Active
                        </span>
                      )}
                      {r.notes && (
                        <span className="text-xs text-[color:var(--charcoal-soft)] truncate max-w-xs">
                          {r.notes}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editRule(r)}
                        className="text-xs border border-[color:var(--border)] hover:border-[color:var(--gold)] px-2.5 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteRule(r.id)}
                        className="text-xs border border-[color:var(--border)] hover:border-red-400 px-2.5 py-1 text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {editingRuleId !== null && (
              <div className="mt-5 border-t border-[color:var(--border)] pt-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs">
                    <span className="block uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-1">
                      Name
                    </span>
                    <input
                      value={ruleDraft.name}
                      onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })}
                      className="w-full border border-[color:var(--border)] px-3 py-2 text-sm bg-[color:var(--ivory)]"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="block uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-1">
                      Notes
                    </span>
                    <input
                      value={ruleDraft.notes}
                      onChange={(e) => setRuleDraft({ ...ruleDraft, notes: e.target.value })}
                      placeholder="Optional — when to use this ruleset"
                      className="w-full border border-[color:var(--border)] px-3 py-2 text-sm bg-[color:var(--ivory)]"
                    />
                  </label>
                </div>
                <label className="text-xs block">
                  <span className="block uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-1">
                    Rules JSON
                  </span>
                  <textarea
                    value={ruleDraft.json}
                    onChange={(e) => setRuleDraft({ ...ruleDraft, json: e.target.value })}
                    rows={18}
                    spellCheck={false}
                    className="w-full font-mono text-[11px] border border-[color:var(--border)] px-3 py-2 bg-[color:var(--ivory)]"
                  />
                </label>
                <p className="text-[11px] text-[color:var(--charcoal-soft)]">
                  Each field's <code>kind</code> can be <code>ai</code>, <code>scraped</code>,{" "}
                  <code>keyword</code>, or <code>constant</code>. Stops accept{" "}
                  <code>coordOverrides</code> keyed by lower-cased label.
                </p>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={ruleDraft.isActive}
                    onChange={(e) => setRuleDraft({ ...ruleDraft, isActive: e.target.checked })}
                  />
                  Make this the active ruleset
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={onSaveRule}
                    disabled={savingRules}
                    className="bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-4 py-2 text-sm"
                  >
                    {savingRules ? "Saving…" : "Save ruleset"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="border border-[color:var(--border)] hover:border-[color:var(--gold)] px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <h2 className="serif text-2xl mt-12">
            Imported tours{" "}
            <span className="text-sm text-[color:var(--charcoal-soft)]">
              ({filter === "all" ? tours.length : `${filteredTours.length} of ${tours.length}`})
            </span>
          </h2>

          {tours.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="With image"
                value={`${stats.withImage}/${stats.total}`}
                tone={stats.missingImage === 0 ? "good" : "warn"}
                icon={<ImageIcon size={14} />}
              />
              <StatCard
                label="Missing image"
                value={String(stats.missingImage)}
                tone={stats.missingImage === 0 ? "good" : "warn"}
                icon={<ImageOff size={14} />}
              />
              <StatCard
                label="Matched signature"
                value={`${stats.matched}/${stats.signatureTotal}`}
                tone={stats.matched > 0 ? "good" : "muted"}
                icon={<Link2 size={14} />}
              />
              <StatCard
                label="Live on cards"
                value={`${stats.matchedWithImage}/${stats.signatureTotal}`}
                tone={stats.matchedWithImage > 0 ? "good" : "muted"}
                icon={<Check size={14} />}
              />
            </div>
          )}

          {tours.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              <FilterPill value="all" current={filter} count={stats.total} icon={null}>
                All
              </FilterPill>
              <FilterPill value="with-image" current={filter} count={stats.withImage} icon={<ImageIcon size={11} />}>
                With image
              </FilterPill>
              <FilterPill value="missing-image" current={filter} count={stats.missingImage} icon={<ImageOff size={11} />}>
                Missing image
              </FilterPill>
              <FilterPill value="matched" current={filter} count={stats.matched} icon={<Link2 size={11} />}>
                Matched signature
              </FilterPill>
              <FilterPill value="unmatched" current={filter} count={stats.total - stats.matched} icon={<Link2Off size={11} />}>
                Unmatched
              </FilterPill>
            </div>
          )}

          {tours.length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--charcoal-soft)]">
              Nothing imported yet. Click <strong>Run import now</strong> to fetch.
            </p>
          ) : filteredTours.length === 0 ? (
            <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">
              No tours match this filter.{" "}
              <Link from="/admin/import-tours" to="." search={{ filter: "all" }} className="underline">
                Show all
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {filteredTours.map((t) => {
                const matched = SIGNATURE_BY_URL.has(normalizeUrl(t.source_url));
                const hasImage = !!t.image_url;
                return (
                  <li
                    key={t.id}
                    className="border border-[color:var(--border)] p-5 bg-[color:var(--card)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {hasImage ? (
                          <img
                            src={t.image_url!}
                            alt=""
                            loading="lazy"
                            className="w-16 h-16 object-cover border border-[color:var(--border)]"
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center border border-dashed border-[color:var(--border)] text-[color:var(--charcoal-soft)]">
                            <ImageOff size={18} />
                          </div>
                        )}
                        <div>
                          <h3 className="serif text-xl">{t.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Pill tone={hasImage ? "good" : "warn"} icon={hasImage ? <ImageIcon size={11} /> : <ImageOff size={11} />}>
                              {hasImage ? "Image saved" : "No image"}
                            </Pill>
                            <Pill tone={matched ? "good" : "muted"} icon={matched ? <Link2 size={11} /> : <Link2Off size={11} />}>
                              {matched ? "Signature match" : "Unmatched"}
                            </Pill>
                            {hasImage && matched && (
                              <Pill tone="accent" icon={<Check size={11} />}>Live on cards</Pill>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                        <span>{t.region_label}</span>
                        <span>{t.duration_label} · {t.duration_hours}</span>
                        <span className="text-[color:var(--teal)]">€{t.price_from}+</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{t.blurb}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
                      Fits best · {t.fits_best}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Tag>{t.theme}</Tag>
                      <Tag>{t.pace}</Tag>
                      <Tag>{t.tier}</Tag>
                      {t.styles.map((s) => <Tag key={s}>{s}</Tag>)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.highlights.map((h) => (
                        <span key={h} className="text-[11px] px-2 py-0.5 border border-[color:var(--gold)]/40 text-[color:var(--charcoal)]">
                          {h}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-[color:var(--charcoal-soft)]">
                      Stops: {t.stops.map((s) => s.label).join(" → ")}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.18em] px-2 py-0.5 bg-[color:var(--sand)] text-[color:var(--charcoal-soft)]">
      {children}
    </span>
  );
}

type Tone = "good" | "warn" | "muted" | "accent";

const TONE_CARD: Record<Tone, string> = {
  good: "border-[color:var(--teal)]/40 bg-[color:var(--teal)]/5 text-[color:var(--teal)]",
  warn: "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/10 text-[color:var(--charcoal)]",
  muted: "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--charcoal-soft)]",
  accent: "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/15 text-[color:var(--charcoal)]",
};

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: Tone;
  icon: React.ReactNode;
}) {
  return (
    <div className={`border p-3 ${TONE_CARD[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] opacity-80">
        {icon}
        {label}
      </div>
      <div className="serif text-2xl mt-1 text-[color:var(--charcoal)]">{value}</div>
    </div>
  );
}

const TONE_PILL: Record<Tone, string> = {
  good: "border-[color:var(--teal)]/50 bg-[color:var(--teal)]/10 text-[color:var(--teal)]",
  warn: "border-[color:var(--gold)]/60 bg-[color:var(--gold)]/15 text-[color:var(--charcoal)]",
  muted: "border-[color:var(--border)] text-[color:var(--charcoal-soft)]",
  accent: "border-[color:var(--gold)]/70 bg-[color:var(--gold)]/25 text-[color:var(--charcoal)]",
};

function Pill({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: Tone;
  icon: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 border ${TONE_PILL[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}


/**
 * Single filter chip in the imported-tours list. Selection is mirrored to the
 * URL via TanStack Router search params so filters survive refresh + can be
 * shared with teammates.
 */
function FilterPill({
  value,
  current,
  count,
  icon,
  children,
}: {
  value: FilterValue;
  current: FilterValue;
  count: number;
  icon: React.ReactNode | null;
  children: React.ReactNode;
}) {
  const active = value === current;
  return (
    <Link
      from="/admin/import-tours"
      to="."
      search={{ filter: value }}
      replace
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] border transition-colors",
        active
          ? "border-[color:var(--charcoal)] bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
          : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)] hover:border-[color:var(--gold)]",
      ].join(" ")}
    >
      {icon}
      {children}
      <span className={active ? "opacity-80" : "opacity-60"}>· {count}</span>
    </Link>
  );
}
