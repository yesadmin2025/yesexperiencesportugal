import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getEmailAdminOverview,
  listEmailTemplates,
  previewEmailTemplate,
  retryDeferredEmails,
  sendTemplateTest,
  type EmailAdminOverview,
  type TemplatePreview,
  type TemplateSummary,
} from "@/lib/emailAdmin.functions";

export const Route = createFileRoute("/admin/emails")({
  head: () => ({
    meta: [
      { title: "Email delivery — Studio Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AdminEmailsPage,
});

type StatusFilter = "all" | "sent" | "failed" | "suppressed";
type Tab = "log" | "suppressions" | "deferred" | "templates";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
];

const FAILED = new Set(["dlq", "failed", "bounced", "complained"]);

function statusBucket(status: string): StatusFilter {
  if (status === "sent") return "sent";
  if (status === "suppressed") return "suppressed";
  if (FAILED.has(status)) return "failed";
  return "all";
}

function badgeStyle(status: string): string {
  const bucket = statusBucket(status);
  if (bucket === "sent") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (bucket === "failed") return "bg-red-50 text-red-800 border-red-200";
  if (bucket === "suppressed") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-[color:var(--sand)] text-[color:var(--charcoal)] border-[color:var(--gold-soft)]";
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 50;

function AdminEmailsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<EmailAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<Tab>("log");
  const [page, setPage] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [liveAt, setLiveAt] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEmailAdminOverview({ data: { days: d } });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load email logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  useEffect(() => {
    setPage(0);
  }, [template, status, days, tab]);

  // Live monitoring — refresh as soon as a send, bounce or park is recorded.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void load(days);
        setLiveAt(new Date().toISOString());
      }, 1200);
    };
    const channel = supabase
      .channel("admin-email-delivery")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_send_log" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "suppressed_emails" }, refresh)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_deferred_sends" },
        refresh,
      )
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    // Safety net: realtime can be unavailable, so still refresh periodically.
    const poll = setInterval(() => {
      void load(days);
      setLiveAt(new Date().toISOString());
    }, 60_000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [days, load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.logs.filter((row) => {
      if (template !== "all" && row.template_name !== template) return false;
      if (status !== "all" && statusBucket(row.status) !== status) return false;
      return true;
    });
  }, [data, template, status]);

  const stats = useMemo(() => {
    const rows = data?.logs ?? [];
    const scoped = template === "all" ? rows : rows.filter((r) => r.template_name === template);
    return {
      total: scoped.length,
      sent: scoped.filter((r) => statusBucket(r.status) === "sent").length,
      failed: scoped.filter((r) => statusBucket(r.status) === "failed").length,
      suppressed: scoped.filter((r) => statusBucket(r.status) === "suppressed").length,
    };
  }, [data, template]);

  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  async function handleRetry() {
    setRetrying(true);
    setRetryMsg(null);
    try {
      const res = await retryDeferredEmails({ data: undefined });
      setRetryMsg(`Reprocessed ${res.attempted} · delivered ${res.sent}`);
      await load(days);
    } catch (e) {
      setRetryMsg(e instanceof Error ? e.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold-ink)]">
        Studio admin
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-editorial)] text-3xl text-[color:var(--charcoal)]">
        Email delivery
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--charcoal)]/80">
        Sends, bounces and parked deliveries for {data?.senderDomain ?? "notify.yesexperiences.pt"}.
        Contains guest addresses — admin access only.
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[color:var(--charcoal)]/70">
        <Link to="/admin" className="underline">
          Back to admin
        </Link>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-600" : "bg-[color:var(--gold-soft)]"}`}
          />
          {live ? "Live" : "Connecting…"}
          {liveAt ? ` · updated ${fmt(liveAt)}` : ""}
        </span>
      </p>

      {/* Range */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => setDays(r.days)}
            className={`min-h-[44px] rounded-sm border px-4 text-xs uppercase tracking-[0.16em] ${
              days === r.days
                ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-white"
                : "border-[color:var(--gold-soft)] text-[color:var(--charcoal)]"
            }`}
          >
            {r.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-[color:var(--charcoal)]">
          Custom days
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Math.min(90, Math.max(1, Number(e.target.value) || 1)))}
            className="min-h-[44px] w-20 rounded-sm border border-[color:var(--gold-soft)] px-2"
          />
        </label>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total emails", value: stats.total },
          { label: "Sent", value: stats.sent },
          { label: "Failed", value: stats.failed },
          { label: "Suppressed", value: stats.suppressed },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-sm border border-[color:var(--gold-soft)] bg-[color:var(--sand)]/50 p-4"
          >
            <p className="text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--teal)]">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[color:var(--charcoal)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-[color:var(--gold-soft)] pb-2">
        {(
          [
            ["log", `Send log (${data?.logs.length ?? 0})`],
            ["suppressions", `Bounces (${data?.suppressions.length ?? 0})`],
            ["deferred", `Parked queue (${data?.deferred.length ?? 0})`],
            ["templates", "Templates"],
            ...(data?.access.canManageRoles ? ([["access", "Access"]] as Array<[Tab, string]>) : []),
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (

          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-[44px] px-3 text-xs uppercase tracking-[0.16em] ${
              tab === id
                ? "border-b-2 border-[color:var(--gold)] text-[color:var(--charcoal)]"
                : "text-[color:var(--charcoal)]/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal)]/80">Loading…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !error && data && tab === "log" ? (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-xs text-[color:var(--charcoal)]">
              Template
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="min-h-[44px] rounded-sm border border-[color:var(--gold-soft)] px-2"
              >
                <option value="all">All</option>
                {data.templates.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-[color:var(--charcoal)]">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="min-h-[44px] rounded-sm border border-[color:var(--gold-soft)] px-2"
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="suppressed">Suppressed</option>
              </select>
            </label>
          </div>

          <ul className="mt-5 space-y-3">
            {pageRows.map((row, i) => (
              <li
                key={`${row.message_id ?? i}-${row.created_at}`}
                className="rounded-sm border border-[color:var(--gold-soft)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-sm border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.16em] ${badgeStyle(row.status)}`}
                  >
                    {row.status}
                  </span>
                  <span className="text-xs text-[color:var(--charcoal)]/70">
                    {fmt(row.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[color:var(--charcoal)]">
                  {row.template_name}
                </p>
                <p className="break-all text-sm text-[color:var(--charcoal)]/85">
                  {row.recipient_email}
                </p>
                {row.error_message ? (
                  <p className="mt-1 break-words text-xs text-red-700">{row.error_message}</p>
                ) : null}
              </li>
            ))}
            {pageRows.length === 0 ? (
              <li className="text-sm text-[color:var(--charcoal)]/70">
                No emails match these filters.
              </li>
            ) : null}
          </ul>

          {pageCount > 1 ? (
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="min-h-[44px] rounded-sm border border-[color:var(--gold-soft)] px-4 text-xs uppercase tracking-[0.16em] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-[color:var(--charcoal)]/80">
                Page {page + 1} of {pageCount}
              </span>
              <button
                type="button"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="min-h-[44px] rounded-sm border border-[color:var(--gold-soft)] px-4 text-xs uppercase tracking-[0.16em] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && !error && data && tab === "suppressions" ? (
        <ul className="mt-5 space-y-3">
          {data.suppressions.map((s) => (
            <li
              key={`${s.email}-${s.created_at}`}
              className="rounded-sm border border-[color:var(--gold-soft)] p-4"
            >
              <p className="break-all text-sm font-semibold text-[color:var(--charcoal)]">
                {s.email}
              </p>
              <p className="text-xs text-[color:var(--charcoal)]/80">
                {s.reason} · {fmt(s.created_at)}
              </p>
            </li>
          ))}
          {data.suppressions.length === 0 ? (
            <li className="text-sm text-[color:var(--charcoal)]/70">
              No blocked addresses — nothing has bounced or complained.
            </li>
          ) : null}
        </ul>
      ) : null}

      {!loading && !error && data && tab === "deferred" ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying || data.deferred.length === 0}
              className="min-h-[44px] rounded-sm bg-[color:var(--teal)] px-5 text-xs uppercase tracking-[0.16em] text-white disabled:opacity-40"
            >
              {retrying ? "Reprocessing…" : "Reprocess parked queue"}
            </button>
            {retryMsg ? (
              <span className="text-xs text-[color:var(--charcoal)]/80">{retryMsg}</span>
            ) : null}
          </div>
          <ul className="mt-5 space-y-3">
            {data.deferred.map((d) => (
              <li key={d.id} className="rounded-sm border border-[color:var(--gold-soft)] p-4">
                <p className="text-sm font-semibold text-[color:var(--charcoal)]">
                  {d.template_name}
                </p>
                <p className="break-all text-sm text-[color:var(--charcoal)]/85">
                  {d.recipient_email}
                </p>
                <p className="text-xs text-[color:var(--charcoal)]/70">
                  {d.attempts} attempt{d.attempts === 1 ? "" : "s"} · {fmt(d.created_at)}
                </p>
                {d.last_error ? (
                  <p className="mt-1 break-words text-xs text-red-700">{d.last_error}</p>
                ) : null}
              </li>
            ))}
            {data.deferred.length === 0 ? (
              <li className="text-sm text-[color:var(--charcoal)]/70">
                Nothing parked — every queued email has been delivered.
              </li>
            ) : null}
          </ul>
        </>
      ) : null}

      {tab === "templates" ? <TemplateStudio /> : null}
    </main>
  );
}

function TemplateStudio() {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const list = await listEmailTemplates({ data: undefined });
        setTemplates(list);
        if (list.length > 0) setSelected(list[0]!.name);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load templates.");
      }
    })();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setRecipient(data.user.email);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setPreview(null);
    void (async () => {
      try {
        setPreview(await previewEmailTemplate({ data: { name: selected } }));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not render this template.");
      }
    })();
  }, [selected]);

  async function handleTest() {
    setSending(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await sendTemplateTest({ data: { name: selected, recipient } });
      setMsg(
        res.ok
          ? `Test queued to ${res.recipient}. It should arrive within a minute.`
          : `Not sent (${res.reason ?? "unknown"}).`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Test send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-6">
      <p className="max-w-2xl text-sm text-[color:var(--charcoal)]/80">
        Preview any email exactly as a guest receives it, then send yourself a live test through the
        verified sender domain.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs text-[color:var(--charcoal)]">
          Template
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-h-[44px] max-w-[16rem] rounded-sm border border-[color:var(--gold-soft)] px-2"
          >
            {(templates ?? []).map((t) => (
              <option key={t.name} value={t.name}>
                {t.displayName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          {(["mobile", "desktop"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`min-h-[44px] rounded-sm border px-4 text-xs uppercase tracking-[0.16em] ${
                device === d
                  ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-white"
                  : "border-[color:var(--gold-soft)] text-[color:var(--charcoal)]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2 text-xs text-[color:var(--charcoal)]">
          Send test to
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="min-h-[44px] w-full rounded-sm border border-[color:var(--gold-soft)] px-3"
          />
        </label>
        <button
          type="button"
          onClick={handleTest}
          disabled={sending || !selected || !recipient}
          className="min-h-[44px] rounded-sm bg-[color:var(--teal)] px-5 text-xs uppercase tracking-[0.16em] text-white disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send test"}
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-emerald-800">{msg}</p> : null}
      {err ? <p className="mt-2 text-xs text-red-700">{err}</p> : null}

      {preview ? (
        <div className="mt-6">
          <p className="text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--teal)]">
            Subject
          </p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--charcoal)]">
            {preview.subject}
          </p>
          <div className="mt-4 overflow-x-auto rounded-sm border border-[color:var(--gold-soft)] bg-[color:var(--sand)]/40 p-3">
            <iframe
              title={`Preview of ${preview.displayName}`}
              srcDoc={preview.html}
              sandbox=""
              className="mx-auto block h-[720px] w-full border-0 bg-white"
              style={{ maxWidth: device === "mobile" ? "390px" : "720px" }}
            />
          </div>
        </div>
      ) : selected ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal)]/70">Rendering preview…</p>
      ) : null}
    </section>
  );
}
