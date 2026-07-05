// Painel dedicado ao acompanhamento da remoção do Google Business Profile antigo
// (Yes!experiences Portugal — R. Central do Meco 13, já "Encerrado permanentemente").
// Mostra o estado dos dois perfis, os passos oficiais com links, um checklist
// persistido em Supabase, notas partilhadas e evidências (screenshots) num bucket
// privado admin-only (gbp-evidence).

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/gbp-legacy-removal")({
  head: () => ({
    meta: [
      { title: "GBP legacy removal — YES Experiences" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GbpLegacyRemovalPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">GBP legacy removal — erro</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 border border-[color:var(--border)] px-4 py-2 text-sm hover:border-[color:var(--gold)]"
        >
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

type Step = {
  id: string;
  title: string;
  body: string;
  danger?: boolean;
  action?: { label: string; href: string };
  copyText?: string;
};

const STEPS: Step[] = [
  {
    id: "confirm-old-closed",
    title: "1. Confirmar que o perfil antigo está 'Encerrado permanentemente'",
    body: 'No perfil antigo (R. Central do Meco 13) confirma que está marcado como "Encerrado permanentemente". É o sinal mais forte que podemos dar ao Google sem apagar o histórico.',
    action: {
      label: "Abrir Google Business Profile",
      href: "https://business.google.com/",
    },
  },
  {
    id: "support-request",
    title: "2. Pedido de remoção via Google Business Profile Support",
    body: 'Abre o formulário de contacto do GBP, seleciona o perfil antigo e escolhe "Remove a business profile I own". Cola o texto abaixo. Costuma ser resolvido em 2–5 dias úteis.',
    action: {
      label: "Contactar Google Business Support",
      href: "https://support.google.com/business/gethelp",
    },
    copyText:
      'Hi Google Business Profile team,\n\nThe business "Yes!experiences Portugal" at R. Central do Meco 13, 2970-058 has permanently closed and rebranded. Our new profile, "Yes Experiences Portugal" at Av. 25 de Abril, 2970-130 Sesimbra (yesexperiencesportugal.com), is already live.\n\nThe old profile is still surfacing in Search and Maps for brand queries and causes customer confusion. Please remove it from Search and Maps.\n\nImportant: do NOT merge or mark it as a duplicate of the new profile — the two are distinct businesses at different addresses. We simply need the old profile removed.\n\nOwner of both profiles: yesexperiences@gmail.com\nWebsite: https://yesexperiencesportugal.com\n\nThank you.',
  },
  {
    id: "maps-suggest-edit",
    title: "3. Sugerir edição no Maps ('Não existe')",
    body: 'No perfil antigo dentro do Google Maps, abre "⋯ → Sugerir uma edição → Fechar ou remover → Não existe". Podes pedir a 2–3 pessoas de confiança para fazerem o mesmo — acelera a moderação. NUNCA escolhas "Duplicado".',
    action: {
      label: "Abrir Google Maps",
      href: "https://www.google.com/maps/search/yes+experiences+portugal+meco",
    },
  },
  {
    id: "search-console-remove-url",
    title: "4. Search Console — Removals (URLs antigas)",
    body: "Se ainda houver URLs de yesexperiences.pt no índice, pede remoção temporária (6 meses) enquanto o 410 Gone propaga. NÃO uses Change of Address entre os dois domínios.",
    action: {
      label: "Abrir /admin/gsc",
      href: "/admin/gsc",
    },
  },
  {
    id: "strengthen-new-profile",
    title: "5. Reforçar o perfil novo enquanto esperas",
    body: "Adiciona 10+ fotos novas, publica pelo menos um post por semana e responde a todas as reviews. Isto empurra o novo perfil para cima no ranking de marca, fazendo o antigo desaparecer da 1.ª dobra mesmo antes de ser removido.",
    action: {
      label: "Gerir perfil novo",
      href: "https://business.google.com/",
    },
  },
  {
    id: "monitor-decay",
    title: "6. Monitorizar o desaparecimento no Search",
    body: "De 3 em 3 dias, pesquisa no Google (modo anónimo) por 'yes experiences', 'yes experiences portugal' e 'yes experiences meco' e regista o que vês. Guarda os screenshots aqui em baixo como evidência da timeline.",
  },
];

const DONT_DO: string[] = [
  "❌ Marcar como duplicado do perfil novo — fundia histórico e o domínio yesexperiences.pt voltaria a colar-se ao novo perfil.",
  "❌ Reabrir o antigo 'só para editar' — perde o estado 'Encerrado permanentemente' e volta ao início do processo.",
  "❌ Pedir Change of Address entre os dois GBPs.",
  "❌ Criar um segundo perfil novo com o mesmo nome enquanto o antigo estiver ativo.",
];

type ChecklistState = Record<string, boolean>;

type EvidenceRow = {
  id: string;
  file_path: string;
  caption: string;
  created_at: string;
  signedUrl?: string;
};

function GbpLegacyRemovalPage() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [notes, setNotes] = useState("");
  const [savingState, setSavingState] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth guard (mesmo padrão de /admin/)
  useEffect(() => {
    let cancelled = false;
    async function check(s: { user: { id: string; email?: string | null } } | null) {
      if (!s) {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(null);
          setAuthChecked(true);
        }
        return;
      }
      if (!cancelled) setSession({ id: s.user.id, email: s.user.email });
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: s.user.id,
        _role: "admin",
      });
      if (!cancelled) {
        setIsAdmin(!error && data === true);
        setAuthChecked(true);
      }
    }
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthChecked(false);
      check(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authChecked || redirectedRef.current) return;
    if (!session) {
      redirectedRef.current = true;
      toast.error("Precisas de iniciar sessão com uma conta admin.");
      navigate({ to: "/auth" });
      return;
    }
    if (isAdmin === false) {
      redirectedRef.current = true;
      toast.error("Esta conta não tem o papel de admin.");
      supabase.auth.signOut().finally(() => navigate({ to: "/auth" }));
    }
  }, [authChecked, session, isAdmin, navigate]);

  const loadState = useCallback(async () => {
    const { data, error } = await supabase
      .from("gbp_removal_state")
      .select("checklist, notes, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      toast.error(`Erro a carregar estado: ${error.message}`);
      return;
    }
    if (data) {
      setChecklist((data.checklist as ChecklistState) ?? {});
      setNotes(data.notes ?? "");
    }
  }, []);

  const loadEvidence = useCallback(async () => {
    const { data, error } = await supabase
      .from("gbp_removal_evidence")
      .select("id, file_path, caption, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Erro a carregar evidências: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as EvidenceRow[];
    // Sign each URL for viewing (bucket is private).
    const signed = await Promise.all(
      rows.map(async (r) => {
        const { data: s } = await supabase.storage
          .from("gbp-evidence")
          .createSignedUrl(r.file_path, 3600);
        return { ...r, signedUrl: s?.signedUrl };
      }),
    );
    setEvidence(signed);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadState();
    loadEvidence();
  }, [isAdmin, loadState, loadEvidence]);

  const persist = useCallback(
    async (nextChecklist: ChecklistState, nextNotes: string) => {
      setSavingState(true);
      const { error } = await supabase
        .from("gbp_removal_state")
        .update({
          checklist: nextChecklist,
          notes: nextNotes,
          updated_at: new Date().toISOString(),
          updated_by: session?.id ?? null,
        })
        .eq("id", 1);
      setSavingState(false);
      if (error) {
        toast.error(`Erro a guardar: ${error.message}`);
        return;
      }
      setSavedAt(new Date());
    },
    [session?.id],
  );

  const toggle = (id: string) => {
    const next = { ...checklist, [id]: !checklist[id] };
    setChecklist(next);
    persist(next, notes);
  };

  // Debounced notes save
  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => {
      persist(checklist, notes);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gbp-evidence")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase
        .from("gbp_removal_evidence")
        .insert({ file_path: path, caption, created_by: session?.id ?? null });
      if (insErr) throw insErr;
      toast.success("Evidência guardada.");
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadEvidence();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row: EvidenceRow) => {
    if (!confirm("Apagar esta evidência?")) return;
    await supabase.storage.from("gbp-evidence").remove([row.file_path]);
    await supabase.from("gbp_removal_evidence").delete().eq("id", row.id);
    await loadEvidence();
  };

  const completed = useMemo(
    () => STEPS.filter((s) => checklist[s.id]).length,
    [checklist],
  );
  const progress = Math.round((completed / STEPS.length) * 100);

  if (!authChecked || !session || isAdmin !== true) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
          <h1 className="mt-1 text-3xl">
            {!authChecked ? "A verificar sessão…" : !session ? "A redirecionar…" : "Sem autorização"}
          </h1>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-5 py-2.5 text-sm hover:bg-black"
          >
            Ir para o login
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-28 pb-20 container-x max-w-4xl">
        <header>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Admin · Reputação
          </p>
          <h1 className="mt-1 text-3xl">Remoção do GBP antigo</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)] max-w-2xl">
            Acompanhamento do processo para remover o perfil "Yes!experiences Portugal"
            (R. Central do Meco 13) das pesquisas do Google. O perfil já está marcado como
            "Encerrado permanentemente" — a remoção total é sempre feita pelo Google e demora
            2–8 semanas.
          </p>
        </header>

        {/* Estado dos dois perfis */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-rose-200 bg-rose-50/60 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-rose-700">Perfil antigo</div>
            <div className="mt-1 text-sm font-medium text-[color:var(--charcoal)]">
              Yes!experiences Portugal
            </div>
            <div className="text-xs text-[color:var(--charcoal-soft)] mt-0.5">
              R. Central do Meco 13, 2970-058
            </div>
            <div className="mt-2 text-xs">
              <span className="inline-block bg-rose-600 text-white px-1.5 py-0.5 tracking-wide">
                Encerrado permanentemente
              </span>
              <span className="ml-2 text-rose-700">4,6 ★ · 93 reviews</span>
            </div>
            <div className="text-[11px] text-rose-700 mt-1">Website: — (removido)</div>
          </div>
          <div className="border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-700">
              Perfil novo (canónico)
            </div>
            <div className="mt-1 text-sm font-medium text-[color:var(--charcoal)]">
              Yes Experiences Portugal
            </div>
            <div className="text-xs text-[color:var(--charcoal-soft)] mt-0.5">
              Av. 25 de Abril, 2970-130 Sesimbra
            </div>
            <div className="mt-2 text-xs">
              <span className="inline-block bg-emerald-600 text-white px-1.5 py-0.5 tracking-wide">
                Ativo
              </span>
              <span className="ml-2 text-emerald-700">5,0 ★ · 8 reviews</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Website: yesexperiencesportugal.com
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-[color:var(--charcoal-soft)]">
            Progresso: {completed}/{STEPS.length} passos concluídos
          </div>
          <div className="text-xs text-[color:var(--charcoal-soft)]">
            {savingState ? "A guardar…" : savedAt ? `Guardado ${savedAt.toLocaleTimeString("pt-PT")}` : ""}
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full bg-[color:var(--sand)]">
          <div
            className="h-full bg-[color:var(--gold)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Passos */}
        <div className="mt-10 space-y-4">
          {STEPS.map((s) => {
            const done = !!checklist[s.id];
            return (
              <article
                key={s.id}
                className={`border p-5 transition-colors ${
                  done
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-[color:var(--border)] bg-white"
                }`}
              >
                <header className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="mt-0.5 shrink-0"
                    aria-label={done ? "Marcar por fazer" : "Marcar concluído"}
                  >
                    {done ? (
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    ) : (
                      <Circle size={20} className="text-[color:var(--charcoal-soft)]" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h2 className="text-base font-medium">{s.title}</h2>
                    <p className="mt-1.5 text-sm text-[color:var(--charcoal-soft)] leading-relaxed">
                      {s.body}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.action && (
                        <a
                          href={s.action.href}
                          target={s.action.href.startsWith("http") ? "_blank" : undefined}
                          rel={s.action.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-1.5 border border-[color:var(--border)] px-3 py-1.5 text-xs hover:border-[color:var(--gold)]"
                        >
                          {s.action.label}
                          <ExternalLink size={11} />
                        </a>
                      )}
                      {s.copyText && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(s.copyText!)}
                          className="inline-flex items-center gap-1.5 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-3 py-1.5 text-xs hover:bg-black"
                        >
                          <Copy size={11} /> Copiar texto para o Google Support
                        </button>
                      )}
                    </div>
                    {s.copyText && (
                      <details className="mt-3">
                        <summary className="text-xs text-[color:var(--teal)] cursor-pointer">
                          Ver texto
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs bg-[color:var(--sand)]/50 p-3 border border-[color:var(--border)] font-sans">
                          {s.copyText}
                        </pre>
                      </details>
                    )}
                  </div>
                </header>
              </article>
            );
          })}
        </div>

        {/* Não fazer */}
        <div className="mt-10 border border-rose-200 bg-rose-50/40 p-5">
          <h2 className="text-base font-medium text-rose-800">O que NÃO fazer</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-rose-900">
            {DONT_DO.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        {/* Notas */}
        <div className="mt-10">
          <h2 className="text-xl">Notas do processo</h2>
          <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
            Regista datas, IDs de casos do Google Support, respostas recebidas. Guarda automaticamente.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: 12/12 — abri caso no GBP Support, ref #4-XXXX. Resposta prometida em 5 dias úteis."
            className="mt-3 w-full min-h-32 border border-[color:var(--border)] bg-white p-3 text-sm focus:outline-none focus:border-[color:var(--gold)]"
          />
        </div>

        {/* Evidências */}
        <div className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl">Evidências (screenshots)</h2>
              <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">
                Guarda screenshots das pesquisas Google, respostas do Support, estado no Maps.
                Ficheiros privados, apenas admins têm acesso.
              </p>
            </div>
          </div>

          <div className="mt-4 border border-dashed border-[color:var(--border)] bg-white p-4">
            <label className="block text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              Legenda (opcional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder='Ex.: "Pesquisa yes experiences — 03/07, ainda aparecem os dois"'
              className="mt-1 w-full border border-[color:var(--border)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--gold)]"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
                className="text-xs"
              />
              {uploading && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--charcoal-soft)]">
                  <Upload size={12} className="animate-pulse" /> A carregar…
                </span>
              )}
            </div>
          </div>

          {evidence.length === 0 ? (
            <div className="mt-4 border border-[color:var(--border)] bg-[color:var(--ivory)] p-6 text-center">
              <ImageIcon size={20} className="mx-auto text-[color:var(--charcoal-soft)]" />
              <p className="mt-2 text-xs text-[color:var(--charcoal-soft)]">
                Ainda não há evidências.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {evidence.map((row) => (
                <figure
                  key={row.id}
                  className="border border-[color:var(--border)] bg-white p-2"
                >
                  {row.signedUrl ? (
                    <a href={row.signedUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={row.signedUrl}
                        alt={row.caption || "Evidência GBP"}
                        loading="lazy"
                        className="w-full h-40 object-cover"
                      />
                    </a>
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center bg-[color:var(--sand)]/40 text-xs text-[color:var(--charcoal-soft)]">
                      (sem preview)
                    </div>
                  )}
                  <figcaption className="mt-1.5 text-[11px] text-[color:var(--charcoal)]">
                    {row.caption || <span className="text-[color:var(--charcoal-soft)]">—</span>}
                  </figcaption>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[color:var(--charcoal-soft)]">
                    <span>{new Date(row.created_at).toLocaleDateString("pt-PT")}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="inline-flex items-center gap-1 hover:text-rose-600"
                      aria-label="Apagar evidência"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </figure>
              ))}
            </div>
          )}
        </div>

        {/* Links úteis */}
        <div className="mt-10 border-t border-[color:var(--border)] pt-6">
          <h2 className="text-sm font-medium">Ligações úteis</h2>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <li>
              <Link
                to="/admin/legacy-domains-monitor"
                className="text-[color:var(--teal)] hover:underline inline-flex items-center gap-1"
              >
                Legacy domains monitor (410 Gone) <ExternalLink size={11} />
              </Link>
            </li>
            <li>
              <Link
                to="/admin/gsc"
                className="text-[color:var(--teal)] hover:underline inline-flex items-center gap-1"
              >
                Google Search Console <ExternalLink size={11} />
              </Link>
            </li>
            <li>
              <a
                href="https://business.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--teal)] hover:underline inline-flex items-center gap-1"
              >
                Google Business Profile <ExternalLink size={11} />
              </a>
            </li>
            <li>
              <a
                href="https://support.google.com/business/answer/4569145"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--teal)] hover:underline inline-flex items-center gap-1"
              >
                Docs: fechar/remover perfil <ExternalLink size={11} />
              </a>
            </li>
          </ul>
        </div>
      </section>
    </SiteLayout>
  );
}
