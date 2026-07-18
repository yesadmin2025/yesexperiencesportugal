/**
 * /admin/image-swap — Compare current editorial slot with best real
 * alternatives from the stock pool, apply overrides that publish via
 * `editorial_image_overrides` (RLS: admin-only writes, public reads
 * limited to `status = 'published'`).
 *
 * Access: admin role — same gate as /admin/photos.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, Undo2, Zap, CheckSquare, Square, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  EDITORIAL_MODULES,
  buildUsageIndex,
  type ModuleShape,
} from "@/lib/image-swap/registry";
import { loadFullPool, type PoolPhoto } from "@/lib/image-swap/pool";
import { rankCandidates, type RankedCandidate } from "@/lib/image-swap/rank";
import { estimateQuality, qualityLabel, resolutionLabel } from "@/lib/image-swap/quality";
import {
  publishOverridesBatch,
  revertOverridesBatch,
  type BatchSnapshotEntry,
  type EditorialModuleKey,
  type EditorialSlot,
} from "@/lib/editorial-overrides";
import { BeforeAfterSlider } from "@/components/admin/BeforeAfterSlider";
import {
  CandidateFilters,
  defaultFilterState,
  type CandidateFilterState,
} from "@/components/admin/CandidateFilters";
import { DuplicatesPanel } from "@/components/admin/DuplicatesPanel";
import { BatchSelectionBar, type BatchPending } from "@/components/admin/BatchSelectionBar";


export const Route = createFileRoute("/admin/image-swap")({
  head: () => ({
    meta: [
      { title: "Image swap · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminImageSwapPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Image swap failed</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
      </section>
    </SiteLayout>
  ),
});

type AuthState = "loading" | "signed-out" | "not-admin" | "ready";
type Tab = "slots" | "duplicates";

type OverrideRow = {
  id: string;
  module_key: string;
  slot_index: number;
  photo_src: string;
  alt: string;
  caption: string | null;
  status: "draft" | "published";
};

function AdminImageSwapPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [pool, setPool] = useState<PoolPhoto[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [tab, setTab] = useState<Tab>("slots");
  const [activeKey, setActiveKey] = useState<EditorialModuleKey>(EDITORIAL_MODULES[0].key);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ candidate: PoolPhoto; slotIndex: number } | null>(null);
  const [filters, setFilters] = useState<CandidateFilterState>(defaultFilterState);
  const [saving, setSaving] = useState(false);
  const undoRef = useRef<{ timer: number; prev: OverrideRow | null } | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batch, setBatch] = useState<Map<number, PoolPhoto>>(new Map());
  const batchUndoRef = useRef<{ timer: number; snapshot: BatchSnapshotEntry[]; moduleKey: EditorialModuleKey } | null>(null);


  const checkAuth = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setAuthState("signed-out");
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    setAuthState(isAdmin ? "ready" : "not-admin");
  }, []);

  const loadOverrides = useCallback(async () => {
    const { data, error } = await supabase
      .from("editorial_image_overrides")
      .select("id, module_key, slot_index, photo_src, alt, caption, status");
    if (error) return toast.error(error.message);
    setOverrides((data ?? []) as OverrideRow[]);
  }, []);

  useEffect(() => {
    checkAuth();
    const { data: sub } = supabase.auth.onAuthStateChange(() => checkAuth());
    return () => sub.subscription.unsubscribe();
  }, [checkAuth]);

  useEffect(() => {
    if (authState !== "ready") return;
    setPoolLoading(true);
    loadFullPool()
      .then((p) => setPool(p))
      .finally(() => setPoolLoading(false));
    loadOverrides();
  }, [authState, loadOverrides]);

  const overridesByModule = useMemo(() => {
    const map = new Map<EditorialModuleKey, EditorialSlot[]>();
    for (const m of EDITORIAL_MODULES) {
      const modOverrides = overrides.filter((o) => o.module_key === m.key);
      const effective = m.defaults.map((d, i) => {
        const o = modOverrides.find((x) => x.slot_index === i && x.status === "published");
        if (!o) return d;
        return { ...d, src: o.photo_src, alt: o.alt, caption: o.caption ?? d.caption };
      });
      map.set(m.key, effective);
    }
    return map;
  }, [overrides]);

  const usageIndex = useMemo(() => buildUsageIndex(overridesByModule), [overridesByModule]);
  const activeModule = EDITORIAL_MODULES.find((m) => m.key === activeKey)!;
  const activeSlots = overridesByModule.get(activeKey) ?? activeModule.defaults;

  const findRow = (moduleKey: EditorialModuleKey, slotIndex: number, status: "draft" | "published") =>
    overrides.find(
      (o) => o.module_key === moduleKey && o.slot_index === slotIndex && o.status === status,
    );

  async function upsertOverride(
    moduleKey: EditorialModuleKey,
    slotIndex: number,
    candidate: PoolPhoto,
    status: "draft" | "published",
    opts: { silent?: boolean } = {},
  ) {
    setSaving(true);
    const module = EDITORIAL_MODULES.find((m) => m.key === moduleKey);
    if (!module) {
      setSaving(false);
      return toast.error("Módulo desconhecido");
    }
    const existing = findRow(moduleKey, slotIndex, status);
    const defaultSlot = module.defaults[slotIndex];
    const payload = {
      module_key: moduleKey,
      slot_index: slotIndex,
      photo_src: candidate.src,
      alt: defaultSlot.alt,
      caption: defaultSlot.caption,
      status,
    };
    const { error } = existing
      ? await supabase.from("editorial_image_overrides").update(payload).eq("id", existing.id)
      : await supabase.from("editorial_image_overrides").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!opts.silent) {
      toast.success(status === "published" ? "Aplicada no site" : "Rascunho guardado");
    }
    setPreview(null);
    await loadOverrides();
    return existing ?? null;
  }

  async function revertOverride(moduleKey: EditorialModuleKey, slotIndex: number) {
    setSaving(true);
    const { error } = await supabase
      .from("editorial_image_overrides")
      .delete()
      .eq("module_key", moduleKey)
      .eq("slot_index", slotIndex);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Restaurado ao original");
    loadOverrides();
  }

  /** One-click publish with an 8s undo toast reverting to the prior state. */
  async function applyAndPublish(
    moduleKey: EditorialModuleKey,
    slotIndex: number,
    candidate: PoolPhoto,
  ) {
    const prev = findRow(moduleKey, slotIndex, "published") ?? null;
    await upsertOverride(moduleKey, slotIndex, candidate, "published", { silent: true });
    if (undoRef.current) window.clearTimeout(undoRef.current.timer);
    const timer = window.setTimeout(() => {
      undoRef.current = null;
    }, 8000);
    undoRef.current = { timer, prev };
    toast.success("Aplicada no site", {
      duration: 8000,
      action: {
        label: "Desfazer",
        onClick: async () => {
          if (prev) {
            await supabase
              .from("editorial_image_overrides")
              .update({ photo_src: prev.photo_src, alt: prev.alt, caption: prev.caption })
              .eq("id", prev.id);
          } else {
            await supabase
              .from("editorial_image_overrides")
              .delete()
              .eq("module_key", moduleKey)
              .eq("slot_index", slotIndex)
              .eq("status", "published");
          }
          await loadOverrides();
          toast.success("Alteração revertida");
        },
      },
    });
  }

  // ---------- Batch (multi-slot) ----------
  const addToBatch = (slotIndex: number, photo: PoolPhoto) => {
    const module = EDITORIAL_MODULES.find((m) => m.key === activeKey)!;
    if (slotIndex < 0 || slotIndex >= module.defaults.length) {
      toast.error("Slot inválido — esta ferramenta só substitui slots existentes.");
      return;
    }
    for (const [idx, p] of batch) {
      if (idx !== slotIndex && p.src === photo.src) {
        toast.error(`Essa imagem já está atribuída ao slot ${idx + 1} deste módulo.`);
        return;
      }
    }
    setBatch((prev) => {
      const next = new Map(prev);
      next.set(slotIndex, photo);
      return next;
    });
  };

  const removeFromBatch = (slotIndex: number) => {
    setBatch((prev) => {
      const next = new Map(prev);
      next.delete(slotIndex);
      return next;
    });
  };

  const clearBatch = () => setBatch(new Map());

  async function publishBatch() {
    const module = EDITORIAL_MODULES.find((m) => m.key === activeKey)!;
    const entries = Array.from(batch.entries()).map(([slotIndex, photo]) => {
      const defaultSlot = module.defaults[slotIndex];
      return {
        slotIndex,
        photoSrc: photo.src,
        alt: defaultSlot.alt,
        caption: defaultSlot.caption,
      };
    });
    if (entries.length === 0) return;
    setSaving(true);
    try {
      const { snapshot } = await publishOverridesBatch(
        activeKey,
        entries,
        module.defaults.length,
      );
      if (batchUndoRef.current) window.clearTimeout(batchUndoRef.current.timer);
      const timer = window.setTimeout(() => {
        batchUndoRef.current = null;
      }, 10000);
      batchUndoRef.current = { timer, snapshot, moduleKey: activeKey };
      const savedModuleKey = activeKey;
      clearBatch();
      setBatchMode(false);
      await loadOverrides();
      toast.success(
        `${entries.length} substituição${entries.length === 1 ? "" : "ões"} publicada${entries.length === 1 ? "" : "s"}`,
        {
          duration: 10000,
          action: {
            label: "Desfazer tudo",
            onClick: async () => {
              try {
                await revertOverridesBatch(savedModuleKey, snapshot);
                await loadOverrides();
                toast.success("Batch revertido");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Falha ao reverter");
              }
            },
          },
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao publicar batch");
    } finally {
      setSaving(false);
    }
  }



  if (authState === "loading") {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 container-x">
          <Loader2 className="animate-spin" size={20} />
        </section>
      </SiteLayout>
    );
  }
  if (authState !== "ready") {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 container-x max-w-md">
          <h1 className="text-2xl mb-3">
            {authState === "signed-out" ? "Sessão necessária" : "Sem permissão"}
          </h1>
          <p className="text-sm text-[color:var(--charcoal-soft)] mb-6">
            Esta área é reservada a administradores.
          </p>
          <Link
            to="/admin/photos"
            className="inline-block border border-[color:var(--border)] px-4 py-2 text-sm"
          >
            Ir para /admin/photos para autenticar
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-24 pb-20">
        <div className="container-x max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/admin/photos"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            >
              <ArrowLeft size={12} /> Admin
            </Link>
            <button
              type="button"
              onClick={() => loadOverrides()}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            >
              <RefreshCw size={12} /> Recarregar
            </button>
          </div>

          <h1 className="text-3xl mb-2">Comparar & trocar imagens</h1>
          <p className="text-sm text-[color:var(--charcoal-soft)] mb-6">
            Filtre por fonte, tag ou qualidade, veja o motivo do ranking e aplique
            trocas com um clique. A tab Duplicados agrupa imagens repetidas entre
            módulos e sugere substituições.
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[color:var(--border)]">
            {(
              [
                { id: "slots", label: "Slots" },
                { id: "duplicates", label: "Duplicados" },
              ] as { id: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[11px] uppercase tracking-[0.2em] border-b-2 -mb-px ${
                  tab === t.id
                    ? "border-[color:var(--charcoal)] text-[color:var(--charcoal)]"
                    : "border-transparent text-[color:var(--charcoal-soft)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "slots" && (
            <>
              <div className="flex flex-wrap gap-2 mb-6">
                {EDITORIAL_MODULES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setActiveKey(m.key);
                      setOpenSlot(null);
                    }}
                    className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] border ${
                      activeKey === m.key
                        ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)] border-[color:var(--charcoal)]"
                        : "bg-white text-[color:var(--charcoal)] border-[color:var(--border)]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap border-t border-b border-[color:var(--border)] py-3">
                <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  <Sparkles size={12} className="text-[color:var(--gold)]" />
                  <span>
                    Curadoria = substituir. Nº de imagens de cada módulo é fixo ({activeModule.defaults.length}).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBatchMode((v) => !v);
                    if (batchMode) clearBatch();
                  }}
                  className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] px-3 py-1.5 border ${
                    batchMode
                      ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)] border-[color:var(--charcoal)]"
                      : "bg-white border-[color:var(--border)]"
                  }`}
                >
                  {batchMode ? <CheckSquare size={12} /> : <Square size={12} />}
                  Selecção múltipla
                </button>
              </div>


              <div className="space-y-6">
                {activeSlots.map((slot, i) => {
                  const isOpen = openSlot === i;
                  const draft = findRow(activeKey, i, "draft");
                  const published = findRow(activeKey, i, "published");
                  return (
                    <div
                      key={`${activeKey}-${i}`}
                      className="border border-[color:var(--border)] p-4"
                    >
                      <div className="flex gap-4">
                        <div className="w-32 flex-shrink-0">
                          <div
                            className={`bg-[color:var(--sand)] overflow-hidden ${activeModule.orientation === "portrait" ? "aspect-[4/5]" : "aspect-[3/2]"}`}
                          >
                            <img
                              src={slot.src}
                              alt={slot.alt}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] flex items-center gap-2 flex-wrap">
                            <span>Slot {i + 1}</span>
                            {published && (
                              <span className="bg-[color:var(--gold)] text-[color:var(--charcoal)] px-1.5 py-0.5">
                                override ativo
                              </span>
                            )}
                            {draft && (
                              <span className="border border-[color:var(--charcoal)]/30 px-1.5 py-0.5">
                                rascunho
                              </span>
                            )}
                            {batchMode && batch.has(i) && (
                              <span className="bg-[color:var(--teal)] text-[color:var(--ivory)] px-1.5 py-0.5 inline-flex items-center gap-1">
                                <CheckSquare size={10} /> em batch
                              </span>
                            )}
                          </div>

                          <p className="mt-1 font-serif italic text-[color:var(--teal)]">
                            {slot.caption}
                          </p>
                          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)] truncate">
                            {slot.alt}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setOpenSlot(isOpen ? null : i)}
                              className="text-[11px] uppercase tracking-[0.2em] bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-3 py-1.5"
                            >
                              {isOpen ? "Fechar" : "Ver alternativas"}
                            </button>
                            {(published || draft) && (
                              <button
                                type="button"
                                onClick={() => revertOverride(activeKey, i)}
                                className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] border border-[color:var(--border)] px-3 py-1.5"
                              >
                                <Undo2 size={12} /> Restaurar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-[color:var(--border)] space-y-3">
                          <CandidateFilters value={filters} onChange={setFilters} />
                          <CandidatesPanel
                            module={activeModule}
                            slot={slot}
                            slotIndex={i}
                            pool={pool}
                            poolLoading={poolLoading}
                            usageIndex={usageIndex}
                            filters={filters}
                            batchMode={batchMode}
                            inBatch={batch.get(i) ?? null}
                            onCompare={(candidate) => setPreview({ candidate, slotIndex: i })}
                            onQuickApply={(candidate) =>
                              applyAndPublish(activeKey, i, candidate)
                            }
                            onAddToBatch={(candidate) => addToBatch(i, candidate)}
                            onRemoveFromBatch={() => removeFromBatch(i)}
                          />

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "duplicates" && (
            <DuplicatesPanel
              effectiveByModule={overridesByModule}
              pool={pool}
              usageIndex={usageIndex}
              onApply={(mk, i, c) => applyAndPublish(mk, i, c)}
              onJumpToSlot={(mk, i) => {
                setTab("slots");
                setActiveKey(mk);
                setOpenSlot(i);
              }}
            />
          )}
        </div>
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[color:var(--ivory)] w-full max-w-md">
            <div className="p-3 flex items-center justify-between border-b border-[color:var(--border)]">
              <span className="text-[11px] uppercase tracking-[0.2em]">Comparar</span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]"
              >
                Fechar
              </button>
            </div>
            <div className="p-3">
              <BeforeAfterSlider
                beforeSrc={activeSlots[preview.slotIndex].src}
                afterSrc={preview.candidate.src}
                beforeAlt="Imagem atual"
                afterAlt={preview.candidate.name}
                aspect={activeModule.orientation === "portrait" ? "4/5" : "3/2"}
              />
              <p className="mt-3 text-xs text-[color:var(--charcoal-soft)] break-all">
                {preview.candidate.name}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    upsertOverride(activeKey, preview.slotIndex, preview.candidate, "published")
                  }
                  className="flex-1 bg-[color:var(--charcoal)] text-[color:var(--ivory)] py-2.5 text-[11px] uppercase tracking-[0.22em] disabled:opacity-60"
                >
                  Aplicar no site
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    upsertOverride(activeKey, preview.slotIndex, preview.candidate, "draft")
                  }
                  className="flex-1 border border-[color:var(--border)] py-2.5 text-[11px] uppercase tracking-[0.22em] disabled:opacity-60"
                >
                  Rascunho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BatchSelectionBar
        pending={Array.from(batch.entries())
          .sort((a, b) => a[0] - b[0])
          .map(
            ([slotIndex, photo]): BatchPending => ({
              slotIndex,
              photoSrc: photo.src,
              photoName: photo.name,
            }),
          )}
        saving={saving}
        onClear={clearBatch}
        onPublish={publishBatch}
        onRemove={removeFromBatch}
      />
    </SiteLayout>

  );
}

function CandidatesPanel({
  module,
  slot,
  slotIndex,
  pool,
  poolLoading,
  usageIndex,
  filters,
  batchMode,
  inBatch,
  onCompare,
  onQuickApply,
  onAddToBatch,
  onRemoveFromBatch,
}: {
  module: ModuleShape;
  slot: EditorialSlot;
  slotIndex: number;
  pool: PoolPhoto[];
  poolLoading: boolean;
  usageIndex: Map<string, string[]>;
  filters: CandidateFilterState;
  batchMode: boolean;
  inBatch: PoolPhoto | null;
  onCompare: (p: PoolPhoto) => void;
  onQuickApply: (p: PoolPhoto) => void;
  onAddToBatch: (p: PoolPhoto) => void;
  onRemoveFromBatch: () => void;
}) {

  const filteredPool = useMemo(() => {
    return pool.filter((p) => {
      if (!filters.sources.has(p.source)) return false;
      if (filters.tags.size > 0 && !p.tags.some((t) => filters.tags.has(t))) return false;
      const q = estimateQuality(p);
      if (!filters.qualities.has(q)) return false;
      if (filters.onlyFresh && (usageIndex.get(p.src)?.length ?? 0) > 0) return false;
      if (filters.onlyOrientationMatch) {
        const orient =
          p.width && p.height
            ? p.width >= p.height
              ? "landscape"
              : "portrait"
            : /aerial|cliff|coast|bay|cove|sunset|boardwalk/.test(p.name.toLowerCase())
              ? "landscape"
              : "portrait";
        if (orient !== module.orientation) return false;
      }
      return true;
    });
  }, [pool, filters, usageIndex, module.orientation]);

  const ranked: RankedCandidate[] = useMemo(
    () =>
      rankCandidates(
        filteredPool,
        {
          currentSrc: slot.src,
          desiredOrientation: module.orientation,
          desiredTags: module.desiredTags,
        },
        usageIndex,
        18,
      ),
    [filteredPool, slot.src, module.orientation, module.desiredTags, usageIndex],
  );

  if (poolLoading) {
    return (
      <div className="py-6 text-center text-sm text-[color:var(--charcoal-soft)]">
        <Loader2 className="inline animate-spin" size={16} /> A carregar candidatos…
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-3">
        {ranked.length} alternativas para o slot {slotIndex + 1}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ranked.map((c) => {
          const q = estimateQuality(c.photo);
          const res = resolutionLabel(c.photo);
          return (
            <div
              key={c.photo.id}
              className="border border-[color:var(--border)] bg-white flex flex-col"
            >
              <button
                type="button"
                onClick={() => onCompare(c.photo)}
                className="text-left"
                title="Comparar antes/depois"
              >
                <div
                  className={`overflow-hidden bg-[color:var(--sand)] ${module.orientation === "portrait" ? "aspect-[4/5]" : "aspect-[3/2]"}`}
                >
                  <img
                    src={c.photo.src}
                    alt={c.photo.name}
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
              </button>
              <div className="p-2 space-y-1 flex-1 flex flex-col">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] uppercase tracking-[0.18em] bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-1.5 py-0.5">
                    {c.photo.source}
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 border ${
                      q === "alta"
                        ? "bg-[color:var(--gold)] text-[color:var(--charcoal)] border-[color:var(--gold)]"
                        : q === "media"
                          ? "border-[color:var(--charcoal)]/30"
                          : q === "baixa"
                            ? "border-[color:var(--charcoal)]/20 text-[color:var(--charcoal-soft)]"
                            : "border-dashed border-[color:var(--charcoal)]/20 text-[color:var(--charcoal-soft)]"
                    }`}
                  >
                    {qualityLabel(q)}
                    {res && <span className="ml-1 normal-case tracking-normal">· {res}</span>}
                  </span>
                </div>
                {c.photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.photo.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] uppercase tracking-[0.15em] text-[color:var(--charcoal-soft)] border border-[color:var(--border)] px-1"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10.5px] text-[color:var(--charcoal-soft)] leading-snug flex-1">
                  {c.reason}
                </p>
                {c.alreadyUsedIn.length > 0 && (
                  <p className="text-[10px] text-[color:var(--gold)] uppercase tracking-[0.15em]">
                    ⚠ em uso: {c.alreadyUsedIn.join(", ")}
                  </p>
                )}
                {batchMode ? (
                  inBatch?.src === c.photo.src ? (
                    <button
                      type="button"
                      onClick={onRemoveFromBatch}
                      className="mt-1 inline-flex items-center justify-center gap-1 bg-[color:var(--teal)] text-[color:var(--ivory)] text-[10px] uppercase tracking-[0.2em] py-1.5"
                    >
                      <CheckSquare size={10} /> No batch (remover)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddToBatch(c.photo)}
                      className="mt-1 inline-flex items-center justify-center gap-1 border border-[color:var(--charcoal)] text-[color:var(--charcoal)] text-[10px] uppercase tracking-[0.2em] py-1.5"
                    >
                      <Square size={10} /> Atribuir ao slot {slotIndex + 1}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onQuickApply(c.photo)}
                    className="mt-1 inline-flex items-center justify-center gap-1 bg-[color:var(--charcoal)] text-[color:var(--ivory)] text-[10px] uppercase tracking-[0.2em] py-1.5"
                  >
                    <Zap size={10} /> Aplicar
                  </button>
                )}

              </div>
            </div>
          );
        })}
      </div>
      {ranked.length === 0 && (
        <p className="text-sm text-[color:var(--charcoal-soft)]">
          Sem candidatos disponíveis com os filtros actuais.
        </p>
      )}
    </div>
  );
}
