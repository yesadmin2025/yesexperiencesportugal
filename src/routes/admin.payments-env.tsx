import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPaymentsEnvStatus, testStripeWebhookSignature } from "@/lib/payments-env.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/admin/payments-env")({
  head: () => ({
    meta: [
      { title: "Payments environment · YES Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PaymentsEnvPage,
});

function Row({ label, value, good }: { label: string; value: React.ReactNode; good?: boolean | null }) {
  const color = good === true ? "text-emerald-600" : good === false ? "text-red-600" : "text-charcoal";
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-black/5">
      <span className="text-sm text-charcoal/70">{label}</span>
      <span className={`text-sm font-medium text-right ${color}`}>{value}</span>
    </div>
  );
}

function PaymentsEnvPage() {
  const fetcher = useServerFn(getPaymentsEnvStatus);
  const clientToken = (import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined) ?? "";
  const clientEnv = getStripeEnvironment();
  const clientIsLive = clientToken.startsWith("pk_live_");
  const clientPrefix = clientToken ? clientToken.slice(0, 12) : "(not set)";

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["payments-env-status"],
    queryFn: () => fetcher(),
  });

  const allGreen =
    clientIsLive &&
    data?.verdict.ready === true &&
    data?.stripePing.ok === true &&
    data?.stripePing.chargesEnabled === true;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/60">Admin</p>
        <h1 className="text-2xl font-semibold text-charcoal mt-1">Payments environment</h1>
        <p className="text-sm text-charcoal/70 mt-2">
          Confirms that the published site is wired to <strong>live</strong> Stripe before accepting real
          payments. Runs a server-side ping to <code>api.stripe.com</code>.
        </p>
      </header>

      <section
        className={`rounded-xl border p-5 ${
          allGreen ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-charcoal/60">Verdict</p>
        <p className={`text-xl font-semibold mt-1 ${allGreen ? "text-emerald-700" : "text-amber-800"}`}>
          {allGreen ? "✅ Ready for live payments" : "⚠ Not ready for live payments"}
        </p>
        {data && <p className="text-sm text-charcoal/80 mt-2">{data.verdict.reason}</p>}
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="text-base font-semibold text-charcoal">Client bundle (this build)</h2>
        <Row label="VITE_PAYMENTS_CLIENT_TOKEN prefix" value={clientPrefix} good={clientIsLive} />
        <Row label="getStripeEnvironment()" value={clientEnv} good={clientEnv === "live"} />
        <p className="text-xs text-charcoal/60 mt-3">
          This reflects the publishable key compiled into the JS you are viewing right now. Open this page
          on the <strong>published</strong> domain to validate the live build.
        </p>
      </section>

      {isLoading ? (
        <p className="text-sm text-charcoal/60">Pinging Stripe…</p>
      ) : error ? (
        <p className="text-sm text-red-600">Error: {(error as Error).message}</p>
      ) : data ? (
        <>
          <section className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="text-base font-semibold text-charcoal">Server secrets</h2>
            <Row
              label="STRIPE_LIVE_API_KEY"
              value={data.server.liveKeyPrefix ?? "missing"}
              good={data.server.hasLiveKey}
            />
            <Row
              label="STRIPE_WEBHOOK_SECRET_LIVE"
              value={data.server.hasLiveWebhook ? "set" : "missing"}
              good={data.server.hasLiveWebhook}
            />
            <Row
              label="STRIPE_SANDBOX_API_KEY"
              value={data.server.sandboxKeyPrefix ?? "missing"}
              good={data.server.hasSandboxKey}
            />
            <Row
              label="STRIPE_WEBHOOK_SECRET_SANDBOX"
              value={data.server.hasSandboxWebhook ? "set" : "missing"}
              good={data.server.hasSandboxWebhook}
            />
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="text-base font-semibold text-charcoal">Stripe live account ping</h2>
            <Row label="API reachable" value={data.stripePing.ok ? "yes" : "no"} good={data.stripePing.ok} />
            <Row label="Account ID" value={data.stripePing.accountId ?? "—"} />
            <Row label="Business name" value={data.stripePing.businessProfileName ?? "—"} />
            <Row label="Country" value={data.stripePing.country ?? "—"} />
            <Row label="Default currency" value={data.stripePing.defaultCurrency?.toUpperCase() ?? "—"} />
            <Row
              label="Charges enabled"
              value={String(data.stripePing.chargesEnabled ?? "—")}
              good={data.stripePing.chargesEnabled ?? null}
            />
            <Row
              label="Payouts enabled"
              value={String(data.stripePing.payoutsEnabled ?? "—")}
              good={data.stripePing.payoutsEnabled ?? null}
            />
            <Row
              label="Onboarding complete"
              value={String(data.stripePing.detailsSubmitted ?? "—")}
              good={data.stripePing.detailsSubmitted ?? null}
            />
            {data.stripePing.error && (
              <p className="text-xs text-red-600 mt-3">{data.stripePing.error}</p>
            )}
          </section>

          <WebhookSignatureTest />
        </>
      ) : null}

      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="px-4 py-2 rounded-lg bg-charcoal text-ivory text-sm disabled:opacity-50"
      >
        {isFetching ? "Checking…" : "Re-check now"}
      </button>
    </div>
  );
}

function WebhookSignatureTest() {
  const runner = useServerFn(testStripeWebhookSignature);
  const m = useMutation({ mutationFn: () => runner() });
  const r = m.data;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal">Webhook signature self-test</h2>
          <p className="text-xs text-charcoal/60 mt-1">
            Sends a synthetic event to the deployed <code>stripe-webhook</code> function with both a
            valid HMAC (signed by <code>STRIPE_WEBHOOK_SECRET_LIVE</code>) and a forged one.
            Confirms the secret here matches the deployed function before Stripe sends real events.
          </p>
        </div>
        <button
          onClick={() => m.mutate()}
          disabled={m.isPending}
          className="shrink-0 px-3 py-2 rounded-lg bg-charcoal text-ivory text-xs disabled:opacity-50"
        >
          {m.isPending ? "Testing…" : "Run test"}
        </button>
      </div>

      {m.error && <p className="text-xs text-red-600 mt-3">{(m.error as Error).message}</p>}

      {r && (
        <div className="mt-4 space-y-1">
          <Row label="Secret present" value={String(r.steps.secretPresent)} good={r.steps.secretPresent} />
          <Row
            label="Secret looks like whsec_…"
            value={String(r.steps.secretPrefixOk)}
            good={r.steps.secretPrefixOk}
          />
          <Row
            label={`Valid signature accepted (HTTP ${r.steps.validSignatureAccepted.status ?? "—"})`}
            value={r.steps.validSignatureAccepted.ok ? "pass" : "fail"}
            good={r.steps.validSignatureAccepted.ok}
          />
          <Row
            label={`Forged signature rejected (HTTP ${r.steps.invalidSignatureRejected.status ?? "—"})`}
            value={r.steps.invalidSignatureRejected.ok ? "pass" : "fail"}
            good={r.steps.invalidSignatureRejected.ok}
          />
          <p
            className={`text-sm mt-3 ${
              r.ok ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {r.ok ? "✅ " : "⚠ "} {r.reason}
          </p>
          <p className="text-[10px] text-charcoal/40 break-all mt-1">Endpoint: {r.endpoint}</p>
        </div>
      )}
    </section>
  );
}
