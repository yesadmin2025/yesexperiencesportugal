// Admin overview page — live snapshot of bookings, contact messages and
// Studio leads so the operator can see incoming activity at a glance while
// automatic notification emails are not yet delivering.

import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Mail, Sparkles, CalendarCheck2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { recoverPaidBooking } from "@/lib/booking-recovery.functions";

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
  stripe_session_id: string | null;
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

type StripeEventRow = {
  id: string;
  received_at: string;
  event_type: string | null;
  verified: boolean | null;
  status_code: number | null;
  error_message: string | null;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  session_id: string | null;
  stripe_env: string | null;
  payment_status: string | null;
};

type EmailLogRow = {
  id: string;
  created_at: string;
  template_name: string | null;
  recipient_email: string | null;
  status: string | null;
  error_message: string | null;
  message_id: string | null;
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
    meta: [{ title: "Admin overview — YES" }, { name: "robots", content: "noindex, nofollow" }],
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
  const [stripeEvents, setStripeEvents] = useState<StripeEventRow[] | null>(null);
  const [emailLog, setEmailLog] = useState<EmailLogRow[] | null>(null);
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
    const [b, c, l, sw, em] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, created_at, customer_name, customer_email, customer_phone, guests, preferred_date, source_tour_id, amount_total, currency, status, stripe_session_id",
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
      supabase
        .from("stripe_webhook_events")
        .select(
          "id, received_at, event_type, verified, status_code, error_message, customer_email, amount_total, currency, session_id, stripe_env, payment_status",
        )
        .order("received_at", { ascending: false })
        .limit(30),
      supabase
        .from("email_send_log")
        .select("id, created_at, template_name, recipient_email, status, error_message, message_id")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setBookings((b.data ?? []) as BookingRow[]);
    setContacts((c.data ?? []) as ContactRow[]);
    setLeads((l.data ?? []) as LeadRow[]);
    setStripeEvents((sw.data ?? []) as StripeEventRow[]);
    setEmailLog((em.data ?? []) as EmailLogRow[]);
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () =>
        fetchAll(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_messages" },
        () => fetchAll(),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "studio_v3_leads" }, () =>
        fetchAll(),
      )
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
            {!authChecked
              ? "A verificar sessão…"
              : !session
                ? "A redirecionar…"
                : "Sem autorização"}
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
              Admin
            </p>
            <h1 className="mt-1 text-3xl">Painel de atividade</h1>
            <p className="mt-2 text-sm text-[color:var(--charcoal-soft)] max-w-2xl">
              Reservas, mensagens de contacto e pedidos do Studio em tempo real. Atualiza
              automaticamente a cada 30 s e a cada nova entrada.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {(
                [
                  { to: "/admin/bookings", label: "Viagens dos hóspedes" },
                  { to: "/admin/availability", label: "Calendário de disponibilidade" },
                  { to: "/admin/pricing", label: "Preços das experiências" },
                  { to: "/admin/composable-stops", label: "Momentos compostos (preços)" },
                  { to: "/admin/price-map", label: "Mapa de preços (tudo de uma vez)" },
                  { to: "/admin/experiences", label: "Experiências & operações" },
                  { to: "/admin/emails", label: "Entrega de emails" },
                ] as const
              ).map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="inline-flex min-h-11 items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--teal)] underline underline-offset-4"
                >
                  {l.label}
                </Link>
              ))}
            </div>


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

        {/* Stripe webhook health */}
        <WebhookHealthWidget bookings={bookings} emailLog={emailLog} onRecovered={fetchAll} />

        {/* Bookings */}
        <Panel title="Últimas reservas" hint="Cada linha é um pagamento/pedido em bookings.">
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
                          <div className="text-[11px] text-[color:var(--charcoal-soft)]">
                            {b.customer_phone}
                          </div>
                        )}
                      </Td>
                      <Td>{b.source_tour_id ?? "—"}</Td>
                      <Td>{b.preferred_date ?? "—"}</Td>
                      <Td>{b.guests ?? "—"}</Td>
                      <Td>{formatMoney(b.amount_total, b.currency)}</Td>
                      <Td>
                        <StatusBadge value={b.status} />
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
                    <p className="mt-1 text-sm text-[color:var(--charcoal)] whitespace-pre-wrap">
                      {m.message}
                    </p>
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
                      <span className="ml-2 text-xs text-[color:var(--charcoal-soft)]">
                        {l.contact_phone}
                      </span>
                    )}
                  </div>
                  {l.contact_note && (
                    <p className="mt-1 text-sm text-[color:var(--charcoal)] whitespace-pre-wrap">
                      {l.contact_note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState label="Sem pedidos do Studio ainda." />
          )}
        </Panel>

        {/* Stripe webhook events */}
        <Panel
          title="Stripe webhooks (últimos 30)"
          hint="Se aparecer verified=false ou erro, o STRIPE_WEBHOOK_SECRET não bate com o endpoint no dashboard Stripe — nenhuma reserva é criada."
        >
          {stripeEvents && stripeEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
                  <tr className="border-b border-[color:var(--border)]">
                    <Th>Data</Th>
                    <Th>Evento</Th>
                    <Th>Env</Th>
                    <Th>Verif.</Th>
                    <Th>Status</Th>
                    <Th>Email</Th>
                    <Th>Valor</Th>
                    <Th>Erro</Th>
                  </tr>
                </thead>
                <tbody>
                  {stripeEvents.map((e) => (
                    <tr key={e.id} className="border-b border-[color:var(--border)] align-top">
                      <Td>{formatDate(e.received_at)}</Td>
                      <Td>{e.event_type ?? "—"}</Td>
                      <Td>{e.stripe_env ?? "—"}</Td>
                      <Td>
                        <span
                          className={e.verified ? "text-emerald-800" : "text-red-800 font-medium"}
                        >
                          {e.verified ? "ok" : "FALHA"}
                        </span>
                      </Td>
                      <Td>{e.status_code ?? "—"}</Td>
                      <Td className="max-w-[200px] truncate">{e.customer_email ?? "—"}</Td>
                      <Td>{formatMoney(e.amount_total, e.currency)}</Td>
                      <Td className="max-w-[280px] text-[11px] text-red-800 whitespace-pre-wrap">
                        {e.error_message ?? ""}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="Sem eventos Stripe registados." />
          )}
        </Panel>

        {/* Email send log */}
        <Panel
          title="Emails enviados (últimos 50)"
          hint="Se vires status 'failed' com erro 'You can only send testing emails' — o domínio de email ainda não está verificado no DNS."
        >
          {emailLog && emailLog.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[color:var(--charcoal-soft)]">
                  <tr className="border-b border-[color:var(--border)]">
                    <Th>Data</Th>
                    <Th>Template</Th>
                    <Th>Destinatário</Th>
                    <Th>Estado</Th>
                    <Th>Erro</Th>
                  </tr>
                </thead>
                <tbody>
                  {emailLog.map((r) => (
                    <tr key={r.id} className="border-b border-[color:var(--border)] align-top">
                      <Td>{formatDate(r.created_at)}</Td>
                      <Td>{r.template_name ?? "—"}</Td>
                      <Td className="max-w-[220px] truncate">{r.recipient_email ?? "—"}</Td>
                      <Td>
                        <StatusBadge value={r.status} />
                      </Td>
                      <Td className="max-w-[320px] text-[11px] text-red-800 whitespace-pre-wrap">
                        {r.error_message ?? ""}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="Sem envios registados." />
          )}
        </Panel>
      </section>
    </SiteLayout>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
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

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2 pr-4 ${className ?? ""}`}>{children}</td>;
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
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[11px] uppercase tracking-wider ${tone}`}
    >
      {value ?? "—"}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-[color:var(--charcoal-soft)]">{label}</p>;
}

type HealthCheckRow = {
  status: string | null;
  reason: string | null;
  valid_status: number | null;
  invalid_status: number | null;
  secret_present: boolean | null;
  secret_prefix_ok: boolean | null;
  endpoint: string | null;
  checked_at: string;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}

function WebhookHealthWidget({
  bookings,
  emailLog,
  onRecovered,
}: {
  bookings: BookingRow[] | null;
  emailLog: EmailLogRow[] | null;
  onRecovered: () => Promise<void>;
}) {
  const recover = useServerFn(recoverPaidBooking);
  const [env, setEnv] = useState<"live" | "sandbox">("live");
  const [health, setHealth] = useState<HealthCheckRow | null>(null);
  const [lastVerified, setLastVerified] = useState<StripeEventRow | null>(null);
  const [lastCheckout, setLastCheckout] = useState<StripeEventRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const envTag = `[${env}]`;
    const [h, v, c] = await Promise.all([
      supabase
        .from("stripe_webhook_health_checks")
        .select(
          "status, reason, valid_status, invalid_status, secret_present, secret_prefix_ok, endpoint, checked_at",
        )
        .ilike("reason", `${envTag}%`)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("stripe_webhook_events")
        .select(
          "id, received_at, event_type, verified, status_code, error_message, customer_email, amount_total, currency, session_id, stripe_env, payment_status",
        )
        .eq("verified", true)
        .eq("stripe_env", env)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("stripe_webhook_events")
        .select(
          "id, received_at, event_type, verified, status_code, error_message, customer_email, amount_total, currency, session_id, stripe_env, payment_status",
        )
        .eq("event_type", "checkout.session.completed")
        .eq("verified", true)
        .eq("stripe_env", env)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setHealth((h.data ?? null) as HealthCheckRow | null);
    setLastVerified((v.data ?? null) as StripeEventRow | null);
    setLastCheckout((c.data ?? null) as StripeEventRow | null);
    setLoading(false);
  }, [env]);

  const runTest = useCallback(async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(`/api/public/hooks/stripe-webhook-health?env=${env}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey },
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
        error?: string;
      };
      if (!res.ok) {
        setTriggerMsg(`Falhou: ${json.error ?? res.status}`);
      } else {
        setTriggerMsg(
          json.ok
            ? `Self-test OK (${env}) — assinatura válida aceite, forjada rejeitada.`
            : `Self-test FALHOU (${env}): ${json.reason ?? "sem detalhes"}`,
        );
      }
    } catch (e) {
      setTriggerMsg(`Erro: ${(e as Error).message}`);
    } finally {
      await load();
      setTriggering(false);
    }
  }, [env, load]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    // Realtime: reload immediately when a new stripe_webhook_events row arrives
    const channel = supabase
      .channel(`admin-webhook-events-${env}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stripe_webhook_events",
          filter: `stripe_env=eq.${env}`,
        },
        () => {
          load();
          onRecovered().catch(() => {});
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stripe_webhook_health_checks" },
        () => load(),
      )
      .subscribe();
    // Reload on tab focus so publishing the webhook and coming back updates instantly
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load, env, onRecovered]);

  const healthOk = health?.status === "ok";
  const checkoutHours = lastCheckout
    ? (Date.now() - new Date(lastCheckout.received_at).getTime()) / 36e5
    : Infinity;
  const receivingCheckout = lastCheckout && lastCheckout.verified && checkoutHours < 72;
  const matchingBooking = Boolean(
    lastCheckout?.session_id &&
    bookings?.some((booking) => booking.stripe_session_id === lastCheckout.session_id),
  );
  const receiptStatus = lastCheckout?.customer_email
    ? (emailLog?.find(
        (entry) =>
          entry.template_name === "checkout-receipt" &&
          entry.recipient_email?.toLowerCase() === lastCheckout.customer_email?.toLowerCase() &&
          new Date(entry.created_at).getTime() >= new Date(lastCheckout.received_at).getTime(),
      ) ?? null)
    : null;

  const runRecovery = useCallback(async () => {
    if (!lastCheckout?.session_id) return;
    setRecovering(true);
    try {
      const result = await recover({
        data: { sessionId: lastCheckout.session_id, resendEmails: true },
      });
      toast.success(
        result.emailQueued
          ? "Reserva recuperada e emails colocados em envio."
          : "Reserva recuperada. O email continua dependente da verificação do domínio.",
      );
      await Promise.all([load(), onRecovered()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível recuperar a reserva.");
    } finally {
      setRecovering(false);
    }
  }, [lastCheckout, recover, load, onRecovered]);

  return (
    <div className="mt-8 border border-[color:var(--border)] bg-[color:var(--ivory)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Stripe webhook health
          </p>
          <h2 className="mt-1 text-lg">Estado do endpoint em tempo real</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Ambiente Stripe"
            className="inline-flex border border-[color:var(--border)]"
          >
            {(["live", "sandbox"] as const).map((e) => (
              <button
                key={e}
                type="button"
                role="tab"
                aria-selected={env === e}
                onClick={() => setEnv(e)}
                disabled={triggering}
                className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${
                  env === e
                    ? "bg-[color:var(--charcoal)] text-[color:var(--ivory)]"
                    : "text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
                }`}
              >
                {e === "live" ? "Live" : "Test"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={runTest}
            disabled={triggering || loading}
            className="inline-flex items-center gap-2 border border-[color:var(--gold)] bg-[color:var(--gold)] px-3 py-1.5 text-xs text-[color:var(--ivory)] hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={12} className={triggering ? "animate-spin" : ""} />
            {triggering ? "A testar…" : `Testar ${env === "live" ? "live" : "test"} agora`}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-[color:var(--border)] px-3 py-1.5 text-xs hover:border-[color:var(--gold)] disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Verificar
          </button>
        </div>
      </div>

      {triggerMsg && (
        <p
          className={`px-4 py-2 text-xs border-b border-[color:var(--border)] ${
            triggerMsg.startsWith("Self-test OK")
              ? "text-[color:var(--teal)]"
              : "text-[color:var(--charcoal)]"
          }`}
        >
          {triggerMsg}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--border)]">
        <HealthTile
          label="Diagnóstico interno"
          status={health ? (healthOk ? "ok" : lastVerified ? "warn" : "fail") : "unknown"}
          primary={
            health
              ? healthOk
                ? "A assinar e a verificar"
                : lastVerified
                  ? "Rever configuração"
                  : "FALHA de verificação"
              : "Sem self-test recente"
          }
          detail={
            health
              ? `${relativeTime(health.checked_at)} · valid=${health.valid_status ?? "—"} · forged=${health.invalid_status ?? "—"}`
              : "O cron ainda não correu."
          }
          note={
            health && !healthOk && lastVerified
              ? "Há eventos reais verificados; este diagnóstico não invalida o endpoint."
              : (health?.reason ?? undefined)
          }
        />
        <HealthTile
          label="Último evento verificado"
          status={lastVerified ? "ok" : "unknown"}
          primary={lastVerified?.event_type ?? "Nenhum ainda"}
          detail={
            lastVerified
              ? `${relativeTime(lastVerified.received_at)} · ${lastVerified.stripe_env ?? "—"}`
              : "Nenhum webhook verificado registado."
          }
          note={
            lastVerified?.customer_email
              ? `${lastVerified.customer_email} · ${formatMoney(lastVerified.amount_total, lastVerified.currency)}`
              : undefined
          }
        />
        <HealthTile
          label="Checkout e reserva"
          status={receivingCheckout && matchingBooking ? "ok" : lastCheckout ? "warn" : "fail"}
          primary={
            receivingCheckout && matchingBooking
              ? "Reserva registada"
              : lastCheckout
                ? matchingBooking
                  ? "Evento antigo registado"
                  : "Pagamento por recuperar"
                : "Nunca recebido"
          }
          detail={
            lastCheckout
              ? `Último ${relativeTime(lastCheckout.received_at)}${lastCheckout.verified ? "" : " · NÃO verificado"}`
              : "Ainda não chegou nenhum checkout completo ao endpoint."
          }
          note={
            lastCheckout && !matchingBooking && lastCheckout.payment_status === "paid" ? (
              <button
                type="button"
                onClick={runRecovery}
                disabled={recovering}
                className="mt-2 min-h-11 border border-[color:var(--gold)] px-3 py-2 text-xs text-[color:var(--charcoal)] disabled:opacity-50"
              >
                {recovering ? "A recuperar…" : "Recuperar reserva e emails"}
              </button>
            ) : lastCheckout?.customer_email ? (
              `${lastCheckout.customer_email} · ${formatMoney(lastCheckout.amount_total, lastCheckout.currency)}`
            ) : undefined
          }
        />
        <HealthTile
          label="Email do cliente"
          status={
            receiptStatus?.status === "sent"
              ? "ok"
              : receiptStatus?.status === "failed"
                ? "fail"
                : receiptStatus
                  ? "warn"
                  : "unknown"
          }
          primary={
            receiptStatus?.status === "sent"
              ? "Entregue ao serviço"
              : receiptStatus?.status === "failed"
                ? "Falhou"
                : receiptStatus
                  ? "Em envio"
                  : "Ainda sem confirmação"
          }
          detail={
            receiptStatus
              ? `${relativeTime(receiptStatus.created_at)} · ${receiptStatus.status}`
              : "Aparece após uma reserva paga."
          }
          note={receiptStatus?.error_message ?? undefined}
        />
      </div>

      {health?.endpoint && (
        <p className="px-4 py-2 text-[10px] text-[color:var(--charcoal-soft)] break-all border-t border-[color:var(--border)]">
          Endpoint: {health.endpoint}
        </p>
      )}
    </div>
  );
}

function HealthTile({
  label,
  status,
  primary,
  detail,
  note,
}: {
  label: string;
  status: "ok" | "warn" | "fail" | "unknown";
  primary: string;
  detail: string;
  note?: React.ReactNode;
}) {
  const tone =
    status === "ok"
      ? { dot: "bg-emerald-500", text: "text-emerald-800" }
      : status === "warn"
        ? { dot: "bg-amber-500", text: "text-amber-800" }
        : status === "fail"
          ? { dot: "bg-red-500", text: "text-red-800" }
          : { dot: "bg-[color:var(--charcoal-soft)]", text: "text-[color:var(--charcoal-soft)]" };
  return (
    <div className="p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
        <span className={`text-sm font-medium ${tone.text}`}>{primary}</span>
      </div>
      <p className="mt-1 text-[11px] text-[color:var(--charcoal-soft)]">{detail}</p>
      {note && (
        <div className="mt-1 text-[11px] text-[color:var(--charcoal)] break-words">{note}</div>
      )}
    </div>
  );
}
