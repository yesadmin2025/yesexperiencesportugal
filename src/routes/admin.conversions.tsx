import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getConversionReport } from "@/lib/conversions.functions";
import { recoverPaidBooking } from "@/lib/booking-recovery.functions";

export const Route = createFileRoute("/admin/conversions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conversions — Studio Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: ConversionsPage,
});

const PATH_LABEL: Record<string, string> = {
  signature: "Signature",
  studio: "Studio / Tailor",
  travel_designer: "Travel Designer",
  moments: "Moments",
  corporate: "Corporate",
};

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

function ConversionsPage() {
  const [days, setDays] = useState(30);
  const fetchReport = useServerFn(getConversionReport);
  const resend = useServerFn(recoverPaidBooking);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["conversions", days],
    queryFn: () => fetchReport({ data: { days } }),
  });
  const r = q.data;

  async function onResend(sessionId: string) {
    setBusy(sessionId);
    try {
      await resend({ data: { sessionId, resendEmails: true } });
      toast.success("Confirmation resent");
      await q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resend failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/admin/more" className="text-sm text-muted-foreground">← More</Link>
      <h1 className="mt-3 font-serif text-3xl">Conversions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live site only. Previews, test payments and admin visits are excluded.
      </p>

      <div className="mt-5 flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`min-h-11 rounded-full border px-4 text-sm ${days === d ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {d} days
          </button>
        ))}
      </div>

      {q.isLoading && <p className="mt-6 text-sm">Loading…</p>}
      {q.error && <p className="mt-6 text-sm text-destructive">{String(q.error.message)}</p>}

      {r && (
        <>
          {r.emailIssues.length > 0 && (
            <section className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <h2 className="font-medium text-destructive">
                {r.emailIssues.length} paid booking{r.emailIssues.length > 1 ? "s" : ""} without a confirmed email
              </h2>
              <ul className="mt-3 space-y-3">
                {r.emailIssues.map((i) => (
                  <li key={i.bookingId} className="text-sm">
                    <Link to="/admin/bookings/$id" params={{ id: i.bookingId }} className="font-medium underline">
                      {i.customer ?? i.email ?? "Guest"}
                    </Link>{" "}
                    · {new Date(i.createdAt).toLocaleDateString()} · client: {i.receipt} · team: {i.team}
                    {i.sessionId && (
                      <button
                        disabled={busy === i.sessionId}
                        onClick={() => onResend(i.sessionId!)}
                        className="ml-2 min-h-11 rounded border px-3 text-xs"
                      >
                        {busy === i.sessionId ? "Sending…" : "Resend"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Visitors" value={r.visitors} />
            <Stat label="Started booking" value={r.bookingStarts} sub={pct(r.bookingStarts, r.visitors)} />
            <Stat label="Leads" value={r.leads} sub={pct(r.leads, r.visitors)} />
            <Stat label="Paid reservations" value={r.paid} sub={pct(r.paid, r.visitors)} />
            <Stat label="Revenue" value={`€${r.revenueEur.toLocaleString()}`} />
            <Stat label="Average booking" value={`€${r.avgEur}`} />
            <Stat label="Lead → paid" value={pct(r.paid, r.leads)} />
            <Stat label="Page views" value={r.pageViews} />
          </section>

          <h2 className="mt-8 font-serif text-xl">CTA clicks</h2>
          <section className="mt-2 grid grid-cols-3 gap-3">
            {r.ctaClicks.map((c) => (
              <Stat key={c.cta} label={c.cta === "tailor" ? "Tailor" : c.cta === "studio" ? "Studio" : "Signature"} value={c.clicks} sub={pct(c.visitors, r.visitors)} />
            ))}
          </section>

          <h2 className="mt-8 font-serif text-xl">Where clicks happen</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Page</th><th>Tailor</th><th>Studio</th><th>Signature</th></tr>
              </thead>
              <tbody>
                {r.ctaByPage.map((p) => (
                  <tr key={p.path} className="border-t">
                    <td className="max-w-[160px] truncate py-2">{p.path}</td>
                    <td>{p.tailor}</td><td>{p.studio}</td><td>{p.signature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-8 font-serif text-xl">Landing pages</h2>
          <p className="text-xs text-muted-foreground">First page of each visit, and how many of those visitors went on to click a CTA or start a booking.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Page</th><th>Visitors</th><th>CTA</th><th>Booking</th></tr>
              </thead>
              <tbody>
                {r.landingPages.map((p) => (
                  <tr key={p.path} className="border-t">
                    <td className="max-w-[160px] truncate py-2">{p.path}</td>
                    <td>{p.visitors}</td><td>{p.clickedCta}</td><td>{p.startedBooking}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-8 font-serif text-xl">By path</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2">Path</th><th>Visitors</th><th>Paid</th><th>Rate</th></tr>
            </thead>
            <tbody>
              {r.byPath.map((p) => (
                <tr key={p.path} className="border-t">
                  <td className="py-2">{PATH_LABEL[p.path] ?? p.path}</td>
                  <td>{p.visitors}</td><td>{p.paid}</td><td>{pct(p.paid, p.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mt-8 font-serif text-xl">Leads by form</h2>
          <ul className="mt-2 text-sm">
            {r.leadsBySource.map((l) => (
              <li key={l.source} className="flex justify-between border-t py-2"><span>{l.source}</span><span>{l.count}</span></li>
            ))}
          </ul>

          <h2 className="mt-8 font-serif text-xl">Top pages</h2>
          <ul className="mt-2 text-sm">
            {r.topPages.map((p) => (
              <li key={p.path} className="flex justify-between gap-3 border-t py-2">
                <span className="truncate">{p.path}</span><span>{p.visitors}</span>
              </li>
            ))}
            {r.topPages.length === 0 && <li className="py-2 text-muted-foreground">Visits start counting after the next publish.</li>}
          </ul>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-medium">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub} of visitors</div>}
    </div>
  );
}
