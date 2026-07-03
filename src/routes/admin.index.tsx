// Admin overview page — live snapshot of bookings, contact messages and
// Studio leads so the operator can see incoming activity at a glance while
// automatic notification emails are not yet delivering.

import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Mail, Sparkles, CalendarCheck2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

type BookingRow = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  guests: number | null;
  preferred_date: string | null;
  source_tour_id: string | null;
  amount_total: number | null;
  currency: string | null;
  status: string | null;
  bokun_status: string | null;
};

type ContactRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  message: string | null;
  source: string | null;
  locale: string | null;
};

type LeadRow = {
  id: string;
  created_at: string;
  journey_title: string | null;
  skeleton_tour_key: string | null;
  status: string | null;
  intent: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_note: string | null;
};

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Admin overview failed</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 inline-flex items-center gap-2 border border-[color:var(--border)] px-4 py-2 text-sm hover:border-[color:var(--gold)]"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    </SiteLayout>
  );
}

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin overview — YES" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOverviewPage,
  errorComponent: ErrorView,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

function formatMoney(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: (currency || "EUR").toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function AdminOverviewPage() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession(s: { user: { id: string; email?: string | null } } | null) {
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
      // eslint-disable-next-line no-console
      console.log("[admin] has_role", { data, error });
      if (!cancelled) {
        setIsAdmin(!error && data === true);
        setAuthChecked(true);
      }
    }
    supabase.auth.getSession().then(({ data }) => loadSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setAuthChecked(false);
      loadSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [b, c, l] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, created_at, customer_name, customer_email, customer_phone, guests, preferred_date, source_tour_id, amount_total, currency, status, bokun_status",
        )
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("contact_messages")
        .select("id, created_at, first_name, last_name, email, message, source, locale")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("studio_v3_leads")
        .select(
          "id, created_at, journey_title, skeleton_tour_key, status, intent, contact_name, contact_email, contact_phone, contact_note",
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setBookings((b.data ?? []) as BookingRow[]);
    setContacts((c.data ?? []) as ContactRow[]);
    setLeads((l.data ?? []) as LeadRow[]);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
    // Realtime auto-refresh every 30s so the operator sees new activity without reloading.
    const t = setInterval(fetchAll, 30_000);
    return () => clearInterval(t);
  }, [isAdmin, fetchAll]);

  // Realtime inserts (bookings + contact + leads) → refresh immediately.
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_messages" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "studio_v3_leads" }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchAll]);

  // Auto-redirect to /auth when unauthenticated OR when the account has no admin role.
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
      toast.error(
        `A conta ${session.email ?? "atual"} não tem o papel de admin. Contacta o administrador.`,
      );
      supabase.auth.signOut().finally(() => navigate({ to: "/auth" }));
    }
  }, [authChecked, session, isAdmin, navigate]);

  if (!authChecked || !session || isAdmin !== true) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
          <h1 className="mt-1 text-3xl">
            {!authChecked ? "A verificar sessão…" : !session ? "A redirecionar…" : "Sem autorização"}
          </h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            {!session
              ? "Redireciona-te para a página de login."
              : "Esta conta não tem o papel de admin. A voltar para a página de login…"}
          </p>
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
      <section className="pt-28 pb-20 container-x max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">Admin</p>
            <h1 className="mt-1 text-3xl">Painel de atividade</h1>
            <p className="mt-2 text-sm text-[color:var(--charcoal-soft)] max-w-2xl">
              Reservas, mensagens de contacto e pedidos do Studio em tempo real. Atualiza automaticamente a cada 30 s
              e a cada nova entrada.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-[color:var(--charcoal-soft)]">
                Atualizado {formatDate(lastRefresh.toISOString())}
              </span>
            )}
            <button
              type="button"
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center gap-2 border border-[color:var(--border)] px-3 py-1.5 text-xs hover:border-[color:var(--gold)] disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar
            </button>
          </div>
        </header>

        {/* Summary tiles */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryTile
            icon={<CalendarCheck2 size={16} />}
            label="Reservas (últimas 20)"
            value={bookings?.length ?? 0}
          />
          <SummaryTile
            icon={<Mail size={16} />}
            label="Mensagens de contacto"
            value={contacts?.length ?? 0}
          />
          <SummaryTile
            icon={<Sparkles size={16} />}
            label="Pedidos do Studio"
            value={leads?.length ?? 0}
          />
        </div>

        {/* Bookings */}
        <Panel
          title="Últimas reservas"
          hint="Cada linha é um pagamento/pedido em bookings. Para gestão detalhada abre a review completa."
          action={
            <Link
              to="/admin/bookings"
              className="text-xs inline-flex items-center gap-1 text-[color:var(--teal)] hover:underline"
            >
              Ver todas <ExternalLink size={11} />
            </Link>
          }
        >
          {bookings && bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
                  <tr className="border-b border-[color:var(--border)]">
                    <Th>Data</Th>
                    <Th>Cliente</Th>
                    <Th>Contacto</Th>
                    <Th>Tour</Th>
                    <Th>Data pretendida</Th>
                    <Th>Pax</Th>
                    <Th>Valor</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-[color:var(--border)] align-top">
                      <Td>{formatDate(b.created_at)}</Td>
                      <Td>{b.customer_name ?? "—"}</Td>
                      <Td>
                        <div>{b.customer_email ?? "—"}</div>
                        {b.customer_phone && (
                          <div className="text-[11px] text-[color:var(--charcoal-soft)]">{b.customer_phone}</div>
                        )}
                      </Td>
                      <Td>{b.source_tour_id ?? "—"}</Td>
                      <Td>{b.preferred_date ?? "—"}</Td>
                      <Td>{b.guests ?? "—"}</Td>
                      <Td>{formatMoney(b.amount_total, b.currency)}</Td>
                      <Td>
                        <StatusBadge value={b.status} />
                        {b.bokun_status && (
                          <div className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
                            bokun: {b.bokun_status}
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="Sem reservas ainda." />
          )}
        </Panel>

        {/* Contact messages */}
        <Panel
          title="Últimas mensagens de contacto"
          hint="Formulário /contact. Enquanto os emails automáticos não estão ativos, responde daqui manualmente."
        >
          {contacts && contacts.length > 0 ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {contacts.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-sm font-medium">
                      {[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"}
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className="ml-2 text-[color:var(--teal)] hover:underline text-xs"
                        >
                          {m.email}
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                      {formatDate(m.created_at)}
                      {m.source && ` · ${m.source}`}
                      {m.locale && ` · ${m.locale}`}
                    </div>
                  </div>
                  {m.message && (
                    <p className="mt-1 text-sm text-[color:var(--charcoal)] whitespace-pre-wrap">{m.message}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState label="Sem mensagens ainda." />
          )}
        </Panel>

        {/* Studio leads */}
        <Panel
          title="Últimos pedidos do Studio"
          hint="Jornadas guardadas ou pedidos de contacto vindos do Studio."
        >
          {leads && leads.length > 0 ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {leads.map((l) => (
                <li key={l.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-sm font-medium">
                      {l.journey_title || l.skeleton_tour_key || "Jornada sem título"}
                    </div>
                    <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                      {formatDate(l.created_at)}
                      {l.status && ` · ${l.status}`}
                      {l.intent && ` · ${l.intent}`}
                    </div>
                  </div>
                  <div className="mt-1 text-sm">
                    {l.contact_name && <span>{l.contact_name}</span>}
                    {l.contact_email && (
                      <a
                        href={`mailto:${l.contact_email}`}
                        className="ml-2 text-[color:var(--teal)] hover:underline text-xs"
                      >
                        {l.contact_email}
                      </a>
                    )}
                    {l.contact_phone && (
                      <span className="ml-2 text-xs text-[color:var(--charcoal-soft)]">{l.contact_phone}</span>
                    )}
                  </div>
                  {l.contact_note && (
                    <p className="mt-1 text-sm text-[color:var(--charcoal)] whitespace-pre-wrap">{l.contact_note}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState label="Sem pedidos do Studio ainda." />
          )}
        </Panel>
      </section>
    </SiteLayout>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        {icon} {label}
      </div>
      <div className="mt-2 text-3xl font-medium">{value}</div>
    </div>
  );
}

function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      <div className="flex items-end justify-between gap-4 border-b border-[color:var(--border)] pb-2">
        <div>
          <h2 className="text-xl">{title}</h2>
          {hint && <p className="mt-1 text-xs text-[color:var(--charcoal-soft)]">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-normal py-2 pr-4">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2 pr-4">{children}</td>;
}

function StatusBadge({ value }: { value: string | null }) {
  const s = (value ?? "").toLowerCase();
  const tone =
    s === "paid" || s === "confirmed"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : s === "pending"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : s === "failed" || s === "canceled"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-[color:var(--sand)] text-[color:var(--charcoal)] border-[color:var(--border)]";
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[11px] uppercase tracking-wider ${tone}`}>
      {value ?? "—"}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-[color:var(--charcoal-soft)]">{label}</p>;
}
