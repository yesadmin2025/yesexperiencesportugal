import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LEGACY_HOSTS } from "@/lib/legacy-domain-redirect";
import {
  listLegacyUnlinkChecklist,
  upsertLegacyUnlinkChecklistItem,
} from "@/lib/legacy-domain-unlink.functions";

export const Route = createFileRoute("/admin/legacy-domain-unlink")({
  head: () => ({
    meta: [
      { title: "Desvincular Domínio Antigo — YES Experiences" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LegacyDomainUnlinkPage,
});

type Status = "todo" | "in_progress" | "done" | "blocked";

type ChecklistItem = {
  id: string;
  group: "GBP" | "TripAdvisor" | "Search Console" | "Verificação";
  title: string;
  detail: string;
  links: { label: string; href: string }[];
  hint?: string;
};

const LEGACY_HOST_LIST = Array.from(LEGACY_HOSTS);

const gscProperty = (host: string) =>
  `https://search.google.com/search-console?resource_id=${encodeURIComponent(
    `sc-domain:${host.replace(/^www\./, "")}`,
  )}`;

const gscRemovals = (host: string) =>
  `https://search.google.com/search-console/removals?resource_id=${encodeURIComponent(
    `sc-domain:${host.replace(/^www\./, "")}`,
  )}`;

const ITEMS: ChecklistItem[] = [
  {
    id: "gbp-locate",
    group: "GBP",
    title: "Localizar o perfil antigo no Google Business Profile",
    detail:
      'Abre o gestor de perfis e identifica o perfil "Yes!experiences" ligado à morada antiga do Meco (~93 reviews, marcado "Encerrado permanentemente").',
    links: [
      { label: "Abrir Google Business", href: "https://business.google.com/" },
      {
        label: "Pesquisar no Google Maps",
        href: "https://www.google.com/maps/search/Yes+experiences+Meco",
      },
    ],
  },
  {
    id: "gbp-transfer-reviews",
    group: "GBP",
    title: "Pedir transferência das reviews para o novo perfil",
    detail:
      "Antes de remover, abre um pedido no suporte do Google Business para transferir as reviews do perfil antigo (mesma marca) para o novo perfil YES Experiences Portugal. Sem este passo as 93 reviews perdem-se.",
    links: [
      {
        label: "Suporte Google Business",
        href: "https://support.google.com/business/gethelp",
      },
    ],
    hint: "Referência para o suporte: mesma entidade, mudança de nome comercial e domínio; morada e telefone atualizados.",
  },
  {
    id: "gbp-remove",
    group: "GBP",
    title: "Remover o perfil antigo (Settings → Remove business profile)",
    detail:
      "Depois da transferência confirmada, remove o perfil antigo. Isto elimina-o do Maps/Search ao fim de alguns dias, mas pode aparecer em cache até algumas semanas.",
    links: [{ label: "Abrir Google Business", href: "https://business.google.com/" }],
  },
  {
    id: "gbp-new-verify",
    group: "GBP",
    title: "Confirmar que o novo perfil está verificado e canónico",
    detail:
      'Pesquisa "YES Experiences Portugal" no Google e confirma que o card lateral aponta para yesexperiencesportugal.com, morada atual e telefone atual.',
    links: [
      {
        label: "Pesquisar no Google",
        href: "https://www.google.com/search?q=YES+Experiences+Portugal",
      },
    ],
  },
  {
    id: "tripadvisor-edit",
    group: "TripAdvisor",
    title: "Atualizar o website no TripAdvisor Management Center",
    detail:
      "No painel do TripAdvisor edita o campo Website e substitui yesexperiences.pt por https://yesexperiencesportugal.com. Confirma também nome, morada e telefone.",
    links: [
      {
        label: "TripAdvisor Owners",
        href: "https://www.tripadvisor.com/Owners",
      },
    ],
  },
  {
    id: "tripadvisor-duplicate",
    group: "TripAdvisor",
    title: "Reportar listing duplicado (se existir)",
    detail:
      "Se existir mais que uma ficha no TripAdvisor para a mesma operação, submete pedido de merge/duplicate para consolidar reviews numa única ficha ativa.",
    links: [
      {
        label: "TripAdvisor — Support",
        href: "https://www.tripadvisor.com/help",
      },
    ],
  },
  ...LEGACY_HOST_LIST.flatMap<ChecklistItem>((host) => [
    {
      id: `gsc-removals-${host}`,
      group: "Search Console",
      title: `Submeter remoção temporária para ${host}`,
      detail: `Na propriedade sc-domain:${host.replace(/^www\./, "")}, abre Removals → New request → Remove all URLs with this prefix, colando https://${host}/. Isto força de-indexação em ~24h enquanto o 410 Gone consolida.`,
      links: [
        { label: `Abrir Removals (${host})`, href: gscRemovals(host) },
        { label: `Propriedade GSC (${host})`, href: gscProperty(host) },
      ],
    },
    {
      id: `gsc-inspect-${host}`,
      group: "Search Console",
      title: `Confirmar 410 na inspeção de URL (${host})`,
      detail: `Em URL Inspection cola https://${host}/, clica Test live URL e confirma que o Google recebe 410. Repete para as páginas mais indexadas do domínio antigo se aparecerem em Pages → Indexed.`,
      links: [{ label: `Abrir propriedade GSC (${host})`, href: gscProperty(host) }],
    },
  ]),
  {
    id: "gsc-canonical-inspect",
    group: "Search Console",
    title: "Solicitar indexação da home canónica",
    detail:
      "Em yesexperiencesportugal.com abre URL Inspection para a home e clica Request Indexing. Repete para /signature, /studio, /travel-designer e /about.",
    links: [
      {
        label: "Propriedade canónica",
        href: `https://search.google.com/search-console?resource_id=${encodeURIComponent(
          "https://yesexperiencesportugal.com/",
        )}`,
      },
    ],
  },
  {
    id: "verify-serp",
    group: "Verificação",
    title: 'Verificar SERP para "Yes Experiences" e "YES Experiences Portugal"',
    detail:
      "Passados 3–5 dias das ações acima, pesquisa ambas as queries em janela anónima. O card lateral deve apontar sempre para o domínio novo. Regista prints se ainda aparecer o antigo.",
    links: [
      {
        label: "Yes Experiences",
        href: "https://www.google.com/search?q=Yes+Experiences&pws=0",
      },
      {
        label: "YES Experiences Portugal",
        href: "https://www.google.com/search?q=YES+Experiences+Portugal&pws=0",
      },
    ],
  },
  {
    id: "verify-monitor",
    group: "Verificação",
    title: "Reprobar domínios antigos no monitor interno",
    detail:
      "Confirma no monitor de domínios antigos que ambos continuam a servir 410 Gone sem Location.",
    links: [
      {
        label: "Legacy Domains Monitor",
        href: "/admin/legacy-domains-monitor",
      },
    ],
  },
];

type ItemRow = {
  item_id: string;
  status: Status;
  note: string | null;
  updated_at: string;
  updated_by: string | null;
};

const STATUS_LABEL: Record<Status, string> = {
  todo: "Por fazer",
  in_progress: "Em curso",
  done: "Concluído",
  blocked: "Bloqueado",
};

const STATUS_TONE: Record<Status, string> = {
  todo: "bg-stone-200 text-stone-700",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
  blocked: "bg-rose-100 text-rose-800",
};

const QUERY_KEY = ["admin", "legacy-domain-unlink", "checklist"] as const;

function LegacyDomainUnlinkPage() {
  const listFn = useServerFn(listLegacyUnlinkChecklist);
  const upsertFn = useServerFn(upsertLegacyUnlinkChecklistItem);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listFn(),
    retry: false,
    staleTime: 30_000,
  });

  const byId = useMemo(() => {
    const map = new Map<string, ItemRow>();
    const items = (query.data?.items ?? []) as ItemRow[];
    for (const row of items) map.set(row.item_id, row);
    return map;
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (input: { itemId: string; status?: Status; note?: string | null }) =>
      upsertFn({ data: input }),
    onSuccess: ({ item }) => {
      queryClient.setQueryData<{ items: ItemRow[] } | undefined>(QUERY_KEY, (prev) => {
        const rows = prev?.items ? [...prev.items] : [];
        const idx = rows.findIndex((r) => r.item_id === item.item_id);
        if (idx >= 0) rows[idx] = item as ItemRow;
        else rows.push(item as ItemRow);
        return { items: rows };
      });
    },
  });

  const total = ITEMS.length;
  const done = ITEMS.filter((i) => byId.get(i.id)?.status === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const isForbidden = query.isError && /Forbidden|Unauthorized/i.test(String(query.error));

  return (
    <div className="min-h-screen bg-[color:var(--ivory)] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Admin · Legacy
          </p>
          <h1 className="font-display text-3xl font-semibold text-[color:var(--charcoal)] md:text-4xl">
            Desvincular domínio antigo
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
            Checklist operacional partilhado — o estado de cada item é sincronizado no backend entre
            todos os administradores.
          </p>

          {query.isLoading && (
            <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">
              A carregar estado do checklist…
            </p>
          )}
          {isForbidden && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              Precisas de estar autenticado com role <strong>admin</strong> para ver e editar este
              checklist.{" "}
              <a className="underline" href="/auth">
                Iniciar sessão
              </a>
              .
            </div>
          )}
          {query.isError && !isForbidden && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              Erro a carregar: {String(query.error)}
            </div>
          )}

          {!isForbidden && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[color:var(--charcoal)]">Progresso</span>
                <span className="text-[color:var(--charcoal-soft)]">
                  {done} / {total} concluídos ({pct}%)
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full bg-[color:var(--teal)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {mutation.isPending && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-stone-400">
                  A sincronizar…
                </p>
              )}
            </div>
          )}
        </header>

        {!isForbidden && !query.isLoading && (
          <ChecklistGroups
            byId={byId}
            disabled={query.isError}
            onStatusChange={(itemId, status) => mutation.mutate({ itemId, status })}
            onNoteChange={(itemId, note) => mutation.mutate({ itemId, note })}
          />
        )}

        <footer className="mt-10 rounded-xl border border-stone-200 bg-white p-4 text-xs text-[color:var(--charcoal-soft)]">
          <p className="mb-1 font-medium text-[color:var(--charcoal)]">Nota importante</p>
          <p>
            Nenhuma destas ações é reversível por código — GBP, TripAdvisor e Search Console
            Removals são UI-only. Este painel serve para dar visibilidade e não perder nenhum passo.
            Depois de concluir, correr o{" "}
            <a className="underline" href="/admin/legacy-domains-monitor">
              Legacy Domains Monitor
            </a>{" "}
            para confirmar que o 410 Gone continua a servir.
          </p>
        </footer>
      </div>
    </div>
  );
}

function ChecklistGroups({
  byId,
  disabled,
  onStatusChange,
  onNoteChange,
}: {
  byId: Map<string, ItemRow>;
  disabled: boolean;
  onStatusChange: (id: string, status: Status) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const groups = Array.from(new Set(ITEMS.map((i) => i.group)));
  return (
    <>
      {groups.map((group) => {
        const items = ITEMS.filter((i) => i.group === group);
        return (
          <section key={group} className="mb-10">
            <h2 className="mb-4 font-display text-lg font-semibold text-[color:var(--charcoal)]">
              {group}
            </h2>
            <ol className="space-y-3">
              {items.map((item, idx) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  idx={idx}
                  row={byId.get(item.id)}
                  disabled={disabled}
                  onStatusChange={onStatusChange}
                  onNoteChange={onNoteChange}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}

function ChecklistRow({
  item,
  idx,
  row,
  disabled,
  onStatusChange,
  onNoteChange,
}: {
  item: ChecklistItem;
  idx: number;
  row?: ItemRow;
  disabled: boolean;
  onStatusChange: (id: string, status: Status) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const status: Status = row?.status ?? "todo";
  const [note, setNote] = useState(row?.note ?? "");
  const remoteNote = row?.note ?? "";
  const lastRemoteRef = useRef(remoteNote);
  const debounceRef = useRef<number | null>(null);

  // Sync in updates from server when they differ and user is not mid-edit.
  useEffect(() => {
    if (remoteNote !== lastRemoteRef.current) {
      lastRemoteRef.current = remoteNote;
      setNote(remoteNote);
    }
  }, [remoteNote]);

  const scheduleSave = (value: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onNoteChange(item.id, value);
    }, 600);
  };

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-content-center rounded-full bg-stone-100 text-xs font-medium text-[color:var(--charcoal-soft)]">
          {idx + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-[color:var(--charcoal)]">{item.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_TONE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
            {item.detail}
          </p>
          {item.hint && (
            <p className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
              {item.hint}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {item.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-[color:var(--charcoal)] transition hover:border-[color:var(--teal)] hover:text-[color:var(--teal)]"
              >
                {l.label} <span aria-hidden>↗</span>
              </a>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["todo", "in_progress", "done", "blocked"] as Status[]).map((st) => (
              <button
                key={st}
                type="button"
                disabled={disabled}
                onClick={() => onStatusChange(item.id, st)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                  status === st
                    ? "bg-[color:var(--charcoal)] text-white"
                    : "border border-stone-200 bg-white text-[color:var(--charcoal-soft)] hover:border-stone-400"
                }`}
              >
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>

          <textarea
            value={note}
            disabled={disabled}
            onChange={(e) => {
              setNote(e.target.value);
              scheduleSave(e.target.value);
            }}
            onBlur={() => {
              if (debounceRef.current) window.clearTimeout(debounceRef.current);
              if ((row?.note ?? "") !== note) onNoteChange(item.id, note);
            }}
            placeholder="Notas partilhadas (ex.: nº de ticket do suporte Google, data submetida…)"
            className="mt-3 w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-[color:var(--charcoal)] placeholder:text-stone-400 focus:border-[color:var(--teal)] focus:outline-none"
            rows={2}
          />

          {row?.updated_at && (
            <p className="mt-2 text-[10px] uppercase tracking-wider text-stone-400">
              Atualizado {new Date(row.updated_at).toLocaleString("pt-PT")}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
