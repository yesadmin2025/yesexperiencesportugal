import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Power, RotateCcw, Save, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { BuilderImage } from "@/components/builder/BuilderImage";
import { supabase } from "@/integrations/supabase/client";
import {
  listExperienceImages,
  setExperienceImageActive,
  updateExperienceImageAlt,
  rescrapeStopImages,
} from "@/lib/builderImages.functions";

export const Route = createFileRoute("/admin/builder-images-qa")({
  head: () => ({ meta: [{ title: "Builder image QA — Studio Admin" }] }),
  component: BuilderImagesQAPage,
});

type Stop = { key: string; label: string; region_key: string };

interface QAImage {
  id: string;
  image_url: string;
  alt_text: string;
  region_key: string | null;
  related_stop_key: string | null;
  image_type: string;
  usage_role: string;
  mood_tags: string[];
  occasion_tags: string[];
  priority_score: number;
  is_active: boolean;
  created_at: string;
}

function BuilderImagesQAPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [images, setImages] = useState<QAImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  const [savingAlt, setSavingAlt] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [rescrapeUrls, setRescrapeUrls] = useState<Record<string, string>>({});
  const [rescraping, setRescraping] = useState<Record<string, boolean>>({});

  const listImages = useServerFn(listExperienceImages);
  const toggleActive = useServerFn(setExperienceImageActive);
  const updateAlt = useServerFn(updateExperienceImageAlt);
  const rescrape = useServerFn(rescrapeStopImages);

  // Auth + admin gate
  useEffect(() => {
    void (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setAuthChecked(true);
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!role);
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const { data } = await supabase
        .from("builder_stops")
        .select("key,label,region_key")
        .order("region_key");
      setStops((data as Stop[]) ?? []);
      void refresh();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await listImages();
      setImages(r.images as QAImage[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }

  const stopsByKey = useMemo(() => {
    const m: Record<string, Stop> = {};
    for (const s of stops) m[s.key] = s;
    return m;
  }, [stops]);

  // Group images by stop key
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: Record<string, QAImage[]> = {};
    for (const img of images) {
      if (filter === "active" && !img.is_active) continue;
      if (filter === "inactive" && img.is_active) continue;
      if (q) {
        const stop = img.related_stop_key ? stopsByKey[img.related_stop_key] : null;
        const haystack = [
          img.alt_text,
          img.related_stop_key ?? "",
          img.region_key ?? "",
          stop?.label ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const key = img.related_stop_key ?? "__unassigned__";
      (out[key] ??= []).push(img);
    }
    // Sort each group: active first, then by priority desc
    for (const arr of Object.values(out)) {
      arr.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return b.priority_score - a.priority_score;
      });
    }
    return out;
  }, [images, filter, search, stopsByKey]);

  const groupOrder = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) => {
        if (a === "__unassigned__") return 1;
        if (b === "__unassigned__") return -1;
        const la = stopsByKey[a]?.label ?? a;
        const lb = stopsByKey[b]?.label ?? b;
        return la.localeCompare(lb);
      }),
    [grouped, stopsByKey],
  );

  async function onToggle(img: QAImage) {
    setTogglingId(img.id);
    try {
      await toggleActive({ data: { id: img.id, isActive: !img.is_active } });
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, is_active: !img.is_active } : i)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setTogglingId(null);
    }
  }

  async function onSaveAlt(img: QAImage) {
    const draft = (altDrafts[img.id] ?? img.alt_text).trim();
    if (!draft || draft === img.alt_text) return;
    setSavingAlt((s) => ({ ...s, [img.id]: true }));
    try {
      await updateAlt({ data: { id: img.id, altText: draft } });
      setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, alt_text: draft } : i)));
      setAltDrafts((d) => {
        const { [img.id]: _, ...rest } = d;
        return rest;
      });
      toast.success("Alt text updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingAlt((s) => ({ ...s, [img.id]: false }));
    }
  }

  async function onRescrapeStop(stopKey: string, replace: boolean) {
    const url = (rescrapeUrls[stopKey] ?? "").trim();
    if (!/^https?:\/\/(www\.)?viator\.com\//i.test(url)) {
      toast.error("Paste a valid viator.com URL for this stop.");
      return;
    }
    setRescraping((r) => ({ ...r, [stopKey]: true }));
    try {
      const res = await rescrape({
        data: {
          stopKey,
          viatorUrl: url,
          deactivateExisting: replace,
        },
      });
      toast.success(`Re-scraped — ${res.inserted} new images`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-scrape failed");
    } finally {
      setRescraping((r) => ({ ...r, [stopKey]: false }));
    }
  }

  if (!authChecked) {
    return (
      <SiteLayout>
        <div className="container-x py-24 text-center text-[color:var(--charcoal)]/60">
          <Loader2 className="mx-auto animate-spin" size={20} />
        </div>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="container-x py-24 text-center">
          <h1 className="serif text-2xl font-semibold text-[color:var(--charcoal)]">Admin only</h1>
          <p className="mt-2 text-sm text-[color:var(--charcoal)]/60">
            Sign in with an admin account to use the QA view.
          </p>
          <Link to="/auth" className="mt-6 inline-block text-sm underline underline-offset-4">
            Go to sign-in →
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-x py-8 md:py-12">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
              Studio Admin · QA
            </span>
            <h1 className="serif mt-1 text-[1.8rem] md:text-[2.2rem] font-semibold leading-[1.05] text-[color:var(--charcoal)]">
              Builder image QA
            </h1>
            <p className="mt-1 text-[13px] text-[color:var(--charcoal)]/65">
              Preview scraped photos per stop · fix alt text · deactivate bad matches · re-scrape
              one stop at a time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/builder-images"
              className="text-[12px] underline underline-offset-4 text-[color:var(--charcoal)]/70"
            >
              ← Bulk scraper
            </Link>
          </div>
        </header>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search alt, stop, region…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px] flex-1 rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3 py-2 text-[13px] outline-none focus:border-[color:var(--gold)]"
          />
          <div className="inline-flex rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] p-0.5">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-bold rounded-[2px]",
                  filter === f
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                    : "text-[color:var(--charcoal)]/65 hover:text-[color:var(--charcoal)]",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-[color:var(--charcoal)]/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-[color:var(--charcoal)]/80 hover:border-[color:var(--charcoal)]/35 disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Refresh
          </button>
        </div>

        {/* Groups */}
        <div className="mt-8 flex flex-col gap-10">
          {loading && images.length === 0 && (
            <div className="py-12 text-center text-[color:var(--charcoal)]/50">
              <Loader2 className="mx-auto animate-spin" size={20} />
            </div>
          )}
          {!loading && groupOrder.length === 0 && (
            <div className="rounded-[2px] border border-dashed border-[color:var(--charcoal)]/20 p-10 text-center text-sm text-[color:var(--charcoal)]/55">
              No images match the current filter.
            </div>
          )}
          {groupOrder.map((stopKey) => {
            const group = grouped[stopKey];
            const stop = stopsByKey[stopKey];
            const activeCount = group.filter((g) => g.is_active).length;
            const isUnassigned = stopKey === "__unassigned__";
            return (
              <section
                key={stopKey}
                className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-4 md:p-5"
              >
                <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--charcoal)]/10 pb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                      {isUnassigned ? "Region / unassigned" : (stop?.region_key ?? "Stop")}
                    </p>
                    <h2 className="serif mt-0.5 text-[1.25rem] font-semibold leading-tight text-[color:var(--charcoal)]">
                      {isUnassigned ? "Not linked to a stop" : (stop?.label ?? stopKey)}
                    </h2>
                    <p className="mt-0.5 text-[11.5px] text-[color:var(--charcoal)]/55">
                      <code className="font-mono">{isUnassigned ? "—" : stopKey}</code>
                      {" · "}
                      {group.length} image{group.length === 1 ? "" : "s"} · {activeCount} active
                    </p>
                  </div>
                  {!isUnassigned && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="url"
                        placeholder="Re-scrape from viator.com URL…"
                        value={rescrapeUrls[stopKey] ?? ""}
                        onChange={(e) =>
                          setRescrapeUrls((u) => ({
                            ...u,
                            [stopKey]: e.target.value,
                          }))
                        }
                        className="w-[260px] max-w-full rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[color:var(--gold)]"
                      />
                      <button
                        type="button"
                        onClick={() => void onRescrapeStop(stopKey, false)}
                        disabled={!!rescraping[stopKey]}
                        className="inline-flex items-center gap-1.5 rounded-[2px] border border-[color:var(--charcoal)]/20 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.16em] font-bold text-[color:var(--charcoal)]/80 hover:border-[color:var(--charcoal)]/40 disabled:opacity-50"
                      >
                        {rescraping[stopKey] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRescrapeStop(stopKey, true)}
                        disabled={!!rescraping[stopKey]}
                        className="inline-flex items-center gap-1.5 rounded-[2px] bg-[color:var(--charcoal)] px-2.5 py-1.5 text-[11px] uppercase tracking-[0.16em] font-bold text-[color:var(--ivory)] hover:bg-[color:var(--teal)] disabled:opacity-50"
                      >
                        {rescraping[stopKey] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        Replace
                      </button>
                    </div>
                  )}
                </header>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((img) => {
                    const draft = altDrafts[img.id];
                    const dirty = typeof draft === "string" && draft.trim() !== img.alt_text;
                    return (
                      <article
                        key={img.id}
                        className={[
                          "flex flex-col gap-2 rounded-[2px] border p-2",
                          img.is_active
                            ? "border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)]"
                            : "border-[color:var(--charcoal)]/10 bg-[color:var(--sand)]/40 opacity-75",
                        ].join(" ")}
                      >
                        <BuilderImage src={img.image_url} alt={img.alt_text} ratio="4/5" />
                        <div className="flex items-center justify-between gap-2 text-[10.5px] uppercase tracking-[0.18em] font-bold">
                          <span className="text-[color:var(--charcoal)]/55">
                            {img.usage_role} · {img.image_type}
                          </span>
                          <span
                            className={[
                              "tabular-nums",
                              img.is_active
                                ? "text-[color:var(--gold)]"
                                : "text-[color:var(--charcoal)]/40",
                            ].join(" ")}
                          >
                            p{img.priority_score}
                          </span>
                        </div>

                        {(img.mood_tags.length > 0 || img.occasion_tags.length > 0) && (
                          <div className="flex flex-wrap gap-1">
                            {img.mood_tags.map((t) => (
                              <span
                                key={`m-${t}`}
                                className="rounded-[2px] bg-[color:var(--teal)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--teal)]"
                              >
                                {t}
                              </span>
                            ))}
                            {img.occasion_tags.map((t) => (
                              <span
                                key={`o-${t}`}
                                className="rounded-[2px] bg-[color:var(--gold)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--charcoal)]/80"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <textarea
                          rows={2}
                          value={draft ?? img.alt_text}
                          onChange={(e) =>
                            setAltDrafts((d) => ({
                              ...d,
                              [img.id]: e.target.value,
                            }))
                          }
                          placeholder="Alt text"
                          className="w-full resize-none rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-2 py-1.5 text-[12px] leading-snug outline-none focus:border-[color:var(--gold)]"
                        />

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void onSaveAlt(img)}
                            disabled={!dirty || !!savingAlt[img.id]}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[2px] bg-[color:var(--charcoal)] px-2 py-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold text-[color:var(--ivory)] hover:bg-[color:var(--teal)] disabled:opacity-40"
                          >
                            {savingAlt[img.id] ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : dirty ? (
                              <Save size={11} />
                            ) : (
                              <Check size={11} />
                            )}
                            {dirty ? "Save alt" : "Saved"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void onToggle(img)}
                            disabled={togglingId === img.id}
                            title={img.is_active ? "Deactivate" : "Activate"}
                            className={[
                              "inline-flex items-center justify-center gap-1 rounded-[2px] border px-2 py-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold disabled:opacity-50",
                              img.is_active
                                ? "border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)]/80 hover:border-[color:var(--charcoal)]/45"
                                : "border-[color:var(--gold)] text-[color:var(--gold)]",
                            ].join(" ")}
                          >
                            {togglingId === img.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Power size={11} />
                            )}
                            {img.is_active ? "Off" : "On"}
                          </button>
                          <a
                            href={img.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open original"
                            className="inline-flex items-center justify-center rounded-[2px] border border-[color:var(--charcoal)]/15 px-2 py-1.5 text-[color:var(--charcoal)]/65 hover:border-[color:var(--charcoal)]/35"
                          >
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </SiteLayout>
  );
}
