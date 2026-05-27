import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ImageOff, Plus, Trash2, ExternalLink, Power } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  bulkScrapeViatorImages,
  listExperienceImages,
  setExperienceImageActive,
} from "@/lib/builderImages.functions";

export const Route = createFileRoute("/admin/builder-images")({
  head: () => ({ meta: [{ title: "Builder images — Studio Admin" }] }),
  component: AdminBuilderImagesPage,
});

type Stop = { key: string; label: string; region_key: string };
type Region = { key: string; label: string };
type Mood = "slow" | "curious" | "romantic" | "open" | "energetic";
const MOODS: Mood[] = ["slow", "curious", "romantic", "open", "energetic"];

interface PendingItem {
  id: string;
  viatorUrl: string;
  stopKey: string;
  moodTags: Mood[];
  occasionTags: string;
}

function newItem(stopKey = ""): PendingItem {
  return {
    id: crypto.randomUUID(),
    viatorUrl: "",
    stopKey,
    moodTags: [],
    occasionTags: "",
  };
}

function AdminBuilderImagesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [items, setItems] = useState<PendingItem[]>([newItem()]);
  const [running, setRunning] = useState(false);
  const [images, setImages] = useState<
    Array<{
      id: string;
      image_url: string;
      alt_text: string;
      region_key: string | null;
      related_stop_key: string | null;
      mood_tags: string[];
      usage_role: string;
      priority_score: number;
      is_active: boolean;
    }>
  >([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const bulkScrape = useServerFn(bulkScrapeViatorImages);
  const listImages = useServerFn(listExperienceImages);
  const toggleActive = useServerFn(setExperienceImageActive);

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

  // Load reference data
  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.from("builder_stops").select("key,label,region_key").order("region_key"),
        supabase.from("builder_regions").select("key,label").order("sort_order"),
      ]);
      setStops((s as Stop[]) ?? []);
      setRegions((r as Region[]) ?? []);
      void refreshImages();
    })();
  }, [isAdmin]);

  async function refreshImages() {
    setLoadingImages(true);
    try {
      const r = await listImages();
      setImages(r.images as typeof images);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load images");
    } finally {
      setLoadingImages(false);
    }
  }

  const stopsByRegion = useMemo(() => {
    const map: Record<string, Stop[]> = {};
    for (const s of stops) (map[s.region_key] ??= []).push(s);
    return map;
  }, [stops]);

  function update(id: string, patch: Partial<PendingItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addRow() {
    setItems((prev) => [...prev, newItem()]);
  }
  function removeRow(id: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  }
  function toggleMood(id: string, m: Mood) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              moodTags: it.moodTags.includes(m)
                ? it.moodTags.filter((x) => x !== m)
                : [...it.moodTags, m],
            }
          : it,
      ),
    );
  }

  async function runScrape() {
    const valid = items.filter(
      (it) => /^https?:\/\/(www\.)?viator\.com\//i.test(it.viatorUrl) && it.stopKey,
    );
    if (valid.length === 0) {
      toast.error("Add at least one Viator URL paired with a stop.");
      return;
    }
    setRunning(true);
    try {
      const res = await bulkScrape({
        data: {
          items: valid.map((it) => ({
            viatorUrl: it.viatorUrl.trim(),
            stopKey: it.stopKey,
            moodTags: it.moodTags,
            occasionTags: it.occasionTags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 8),
            maxImages: 8,
          })),
        },
      });
      toast.success(
        `Scraped ${res.succeeded}/${res.total} pages · ${res.totalInserted} new images`,
      );
      await refreshImages();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setRunning(false);
    }
  }

  async function onToggle(id: string, isActive: boolean) {
    try {
      await toggleActive({ data: { id, isActive } });
      setImages((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_active: isActive } : i)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toggle failed");
    }
  }

  if (!authChecked) {
    return (
      <SiteLayout>
        <div className="container-x py-20 flex justify-center">
          <Loader2 className="animate-spin text-[color:var(--charcoal)]/40" />
        </div>
      </SiteLayout>
    );
  }
  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="container-x py-20">
          <h1 className="serif text-2xl">Admin only</h1>
          <p className="mt-2 text-[color:var(--charcoal)]/70">
            Sign in with an admin account to manage builder images.{" "}
            <Link to="/auth" className="underline">
              Sign in
            </Link>
          </p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-x py-10 md:py-14">
        <header className="mb-8">
          <span className="text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
            Studio admin
          </span>
          <h1 className="serif text-[2rem] md:text-[2.6rem] leading-[1.05] font-semibold mt-2">
            Builder images
          </h1>
          <p className="mt-2 text-[14px] text-[color:var(--charcoal)]/70 max-w-2xl">
            Paste Viator tour URLs and pair each with the matching builder stop. The
            scraper pulls real photos from each page and stores them with proper alt
            text. Images are auto-active and feed the Builder mood cards, stop cards,
            story panel, and review thumbnails.
          </p>
        </header>

        {/* Pending scrape jobs */}
        <section className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-5 md:p-6">
          <h2 className="serif text-[1.3rem] font-semibold mb-4">
            Scrape Viator pages
          </h2>
          <div className="flex flex-col gap-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="rounded-[2px] border border-[color:var(--charcoal)]/10 p-4 bg-[color:var(--sand)]/30"
              >
                <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto]">
                  <input
                    type="url"
                    placeholder="https://www.viator.com/tours/..."
                    value={it.viatorUrl}
                    onChange={(e) => update(it.id, { viatorUrl: e.target.value })}
                    className="w-full rounded-[2px] border border-[color:var(--charcoal)]/15 bg-white px-3 py-2.5 text-[13px] focus:border-[color:var(--gold)] focus:outline-none"
                  />
                  <select
                    value={it.stopKey}
                    onChange={(e) => update(it.id, { stopKey: e.target.value })}
                    className="w-full rounded-[2px] border border-[color:var(--charcoal)]/15 bg-white px-3 py-2.5 text-[13px]"
                  >
                    <option value="">— Pair with stop —</option>
                    {regions.map((r) => (
                      <optgroup key={r.key} label={r.label}>
                        {(stopsByRegion[r.key] ?? []).map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(it.id)}
                    disabled={items.length === 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]/60 hover:text-red-700 disabled:opacity-30"
                    aria-label="Remove row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/60">
                    Mood tags
                  </span>
                  {MOODS.map((m) => {
                    const on = it.moodTags.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMood(it.id, m)}
                        className={[
                          "rounded-full px-3 py-1 text-[11.5px] border transition-colors",
                          on
                            ? "border-[color:var(--gold)] bg-[color:var(--gold)]/15 text-[color:var(--charcoal)]"
                            : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]/65 hover:border-[color:var(--charcoal)]/35",
                        ].join(" ")}
                      >
                        {m}
                      </button>
                    );
                  })}
                  <input
                    type="text"
                    placeholder="Occasion tags (comma separated, e.g. celebration, corporate)"
                    value={it.occasionTags}
                    onChange={(e) => update(it.id, { occasionTags: e.target.value })}
                    className="ml-auto min-w-[260px] flex-1 rounded-[2px] border border-[color:var(--charcoal)]/15 bg-white px-3 py-1.5 text-[12px]"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/20 px-4 py-2 text-[12px] uppercase tracking-[0.18em] font-bold hover:border-[color:var(--charcoal)]/40"
            >
              <Plus size={13} /> Add row
            </button>
            <button
              type="button"
              onClick={runScrape}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-[2px] bg-[color:var(--charcoal)] px-5 py-2.5 text-[12px] uppercase tracking-[0.2em] font-bold text-[color:var(--ivory)] hover:bg-[color:var(--teal)] disabled:opacity-60"
            >
              {running ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              Scrape & save
            </button>
            <span className="text-[12px] text-[color:var(--charcoal)]/55">
              Each page yields up to 8 photos · duplicates skipped automatically.
            </span>
          </div>
        </section>

        {/* Library */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="serif text-[1.3rem] font-semibold">
              Image library{" "}
              <span className="text-[13px] text-[color:var(--charcoal)]/55">
                ({images.length})
              </span>
            </h2>
            <button
              type="button"
              onClick={() => void refreshImages()}
              disabled={loadingImages}
              className="text-[12px] underline underline-offset-4 text-[color:var(--charcoal)]/65 hover:text-[color:var(--charcoal)]"
            >
              {loadingImages ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {images.length === 0 ? (
            <div className="mt-6 rounded-[2px] border border-dashed border-[color:var(--charcoal)]/15 p-10 text-center text-[13px] text-[color:var(--charcoal)]/55">
              <ImageOff size={22} className="mx-auto mb-2 opacity-50" />
              No images yet. Paste a Viator URL above to populate the library.
            </div>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {images.map((img) => (
                <li
                  key={img.id}
                  className={[
                    "rounded-[2px] border overflow-hidden bg-[color:var(--ivory)]",
                    img.is_active
                      ? "border-[color:var(--charcoal)]/12"
                      : "border-[color:var(--charcoal)]/10 opacity-55",
                  ].join(" ")}
                >
                  <div className="relative aspect-[4/3] bg-[color:var(--charcoal)]/10">
                    <img
                      src={img.image_url}
                      alt={img.alt_text}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex flex-col gap-1.5">
                    <p className="text-[12px] font-semibold text-[color:var(--charcoal)] line-clamp-1">
                      {img.related_stop_key ?? img.region_key ?? "—"}
                    </p>
                    <p className="text-[11px] text-[color:var(--charcoal)]/60 line-clamp-2">
                      {img.alt_text}
                    </p>
                    {img.mood_tags.length > 0 && (
                      <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--gold)]">
                        {img.mood_tags.join(" · ")}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-between">
                      <a
                        href={img.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[color:var(--charcoal)]/60 hover:text-[color:var(--charcoal)]"
                      >
                        <ExternalLink size={11} /> Open
                      </a>
                      <button
                        type="button"
                        onClick={() => void onToggle(img.id, !img.is_active)}
                        className="inline-flex items-center gap-1 text-[11px] text-[color:var(--charcoal)]/65 hover:text-[color:var(--charcoal)]"
                      >
                        <Power size={11} />
                        {img.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
