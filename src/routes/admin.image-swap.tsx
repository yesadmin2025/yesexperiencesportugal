/**
 * /admin/image-swap — Compare current editorial slot with best real
 * alternatives from the stock pool, apply overrides that publish via
 * `editorial_image_overrides` (RLS: admin-only writes, public reads
 * limited to `status = 'published'`).
 *
 * Access: admin role — same gate as /admin/photos.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, Undo2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  EDITORIAL_MODULES,
  buildUsageIndex,
  type ModuleShape,
} from "@/lib/image-swap/registry";
import { loadFullPool, type PoolPhoto } from "@/lib/image-swap/pool";
import { rankCandidates, type RankedCandidate } from "@/lib/image-swap/rank";
import type { EditorialModuleKey, EditorialSlot } from "@/lib/editorial-overrides";
import { BeforeAfterSlider } from "@/components/admin/BeforeAfterSlider";

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
  const [activeKey, setActiveKey] = useState<EditorialModuleKey>(EDITORIAL_MODULES[0].key);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ candidate: PoolPhoto; slotIndex: number } | null>(null);
  const [saving, setSaving] = useState(false);

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

  // Merged (defaults + published/draft overrides) per module for usage index.
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

  function findDraft(slotIndex: number): OverrideRow | undefined {
    return overrides.find(
      (o) => o.module_key === activeKey && o.slot_index === slotIndex && o.status === "draft",
    );
  }
  function findPublished(slotIndex: number): OverrideRow | undefined {
    return overrides.find(
      (o) => o.module_key === activeKey && o.slot_index === slotIndex && o.status === "published",
    );
  }

  async function upsertOverride(
    slotIndex: number,
    candidate: PoolPhoto,
    status: "draft" | "published",
  ) {
    setSaving(true);
    const existing = overrides.find(
      (o) => o.module_key === activeKey && o.slot_index === slotIndex && o.status === status,
    );
    const defaultSlot = activeModule.defaults[slotIndex];
    const payload = {
      module_key: activeKey,
      slot_index: slotIndex,
      photo_src: candidate.src,
      alt: defaultSlot.alt, // preserve editorial alt by default
      caption: defaultSlot.caption,
      status,
    };
    const { error } = existing
      ? await supabase.from("editorial_image_overrides").update(payload).eq("id", existing.id)
      : await supabase.from("editorial_image_overrides").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Aplicada no site" : "Rascunho guardado");
    setPreview(null);
    loadOverrides();
  }

  async function revertOverride(slotIndex: number) {
    setSaving(true);
    const { error } = await supabase
      .from("editorial_image_overrides")
      .delete()
      .eq("module_key", activeKey)
      .eq("slot_index", slotIndex);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Restaurado ao original");
    loadOverrides();
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
            Selecione um módulo, veja o slot atual e compare com as melhores
            alternativas reais do stock antes de substituir.
          </p>

          {/* Module tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
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

          {/* Slots */}
          <div className="space-y-6">
            {activeSlots.map((slot, i) => {
              const isOpen = openSlot === i;
              const draft = findDraft(i);
              const published = findPublished(i);
              return (
                <div key={`${activeKey}-${i}`} className="border border-[color:var(--border)] p-4">
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
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                        Slot {i + 1}
                        {published && (
                          <span className="ml-2 bg-[color:var(--gold)] text-[color:var(--charcoal)] px-1.5 py-0.5">
                            override ativo
                          </span>
                        )}
                        {draft && (
                          <span className="ml-2 border border-[color:var(--charcoal)]/30 px-1.5 py-0.5">
                            rascunho
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
                            onClick={() => revertOverride(i)}
                            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] border border-[color:var(--border)] px-3 py-1.5"
                          >
                            <Undo2 size={12} /> Restaurar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <CandidatesPanel
                      module={activeModule}
                      slot={slot}
                      slotIndex={i}
                      pool={pool}
                      poolLoading={poolLoading}
                      usageIndex={usageIndex}
                      onCompare={(candidate) => setPreview({ candidate, slotIndex: i })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compare modal */}
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
                  onClick={() => upsertOverride(preview.slotIndex, preview.candidate, "published")}
                  className="flex-1 bg-[color:var(--charcoal)] text-[color:var(--ivory)] py-2.5 text-[11px] uppercase tracking-[0.22em] disabled:opacity-60"
                >
                  Aplicar no site
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => upsertOverride(preview.slotIndex, preview.candidate, "draft")}
                  className="flex-1 border border-[color:var(--border)] py-2.5 text-[11px] uppercase tracking-[0.22em] disabled:opacity-60"
                >
                  Rascunho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
  onCompare,
}: {
  module: ModuleShape;
  slot: EditorialSlot;
  slotIndex: number;
  pool: PoolPhoto[];
  poolLoading: boolean;
  usageIndex: Map<string, string[]>;
  onCompare: (p: PoolPhoto) => void;
}) {
  const ranked: RankedCandidate[] = useMemo(
    () =>
      rankCandidates(
        pool,
        {
          currentSrc: slot.src,
          desiredOrientation: module.orientation,
          desiredTags: module.desiredTags,
        },
        usageIndex,
        12,
      ),
    [pool, slot.src, module.orientation, module.desiredTags, usageIndex],
  );

  if (poolLoading) {
    return (
      <div className="mt-4 py-6 text-center text-sm text-[color:var(--charcoal-soft)]">
        <Loader2 className="inline animate-spin" size={16} /> A carregar candidatos…
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] mb-3">
        Alternativas para o slot {slotIndex + 1}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ranked.map((c) => (
          <button
            key={c.photo.id}
            type="button"
            onClick={() => onCompare(c.photo)}
            className="text-left group"
          >
            <div
              className={`overflow-hidden bg-[color:var(--sand)] ${module.orientation === "portrait" ? "aspect-[4/5]" : "aspect-[3/2]"}`}
            >
              <img
                src={c.photo.src}
                alt={c.photo.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              {c.photo.source}
              {c.alreadyUsedIn.length > 0 && (
                <span className="ml-1 text-[color:var(--charcoal)]">· em uso</span>
              )}
            </p>
            <p className="text-[11px] text-[color:var(--charcoal-soft)] leading-snug mt-0.5">
              {c.reason}
            </p>
          </button>
        ))}
      </div>
      {ranked.length === 0 && (
        <p className="text-sm text-[color:var(--charcoal-soft)]">
          Sem candidatos disponíveis no stock atual.
        </p>
      )}
    </div>
  );
}
