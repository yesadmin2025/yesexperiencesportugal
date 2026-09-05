/**
 * /admin/analytics-health — client-side GA4/GTM diagnostic.
 *
 * Context: Search Console shows real traffic while GA4 reports 0
 * sessions. Everything measurable in code is checked here (container
 * boot, dataLayer, Consent Mode signals, exclusion guard, GA4 cookie);
 * whatever remains red is a container/property configuration problem
 * that must be fixed inside Google Tag Manager or GA4, not in code.
 *
 * Read-only, noindex, no data written anywhere.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isTrackingDisabled } from "@/lib/analytics-exclusions";

export const Route = createFileRoute("/admin/analytics-health")({
  component: AnalyticsHealthPage,
  head: () => ({
    meta: [
      { title: "Analytics health · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const GTM_ID = "GTM-M82SQS79";

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

function readChecks(): Check[] {
  const w = window as unknown as {
    dataLayer?: unknown[];
    google_tag_manager?: Record<string, unknown>;
    gtag?: unknown;
  };
  const dl = Array.isArray(w.dataLayer) ? w.dataLayer : [];
  const containerLoaded = Boolean(w.google_tag_manager?.[GTM_ID]);
  const gaCookie = document.cookie.split("; ").find((c) => c.startsWith("_ga="));
  const consentRaw = (() => {
    try {
      return window.localStorage.getItem("yes.cookieConsent.v1");
    } catch {
      return null;
    }
  })();
  const consent = consentRaw ? (JSON.parse(consentRaw) as { analytics?: string }) : null;

  return [
    {
      label: "Tracking allowed on this host/path",
      ok: !isTrackingDisabled(),
      detail: isTrackingDisabled()
        ? `Blocked: ${window.location.hostname}${window.location.pathname} (preview/local/admin are excluded by design — check on the live domain)`
        : `${window.location.hostname} is a measured host`,
    },
    {
      label: "dataLayer present",
      ok: dl.length > 0,
      detail: `${dl.length} entries queued/pushed`,
    },
    {
      label: `GTM container ${GTM_ID} loaded`,
      ok: containerLoaded,
      detail: containerLoaded
        ? "gtm.js executed in this page"
        : "Container script has not booted yet (it boots on idle or first interaction)",
    },
    {
      label: "Consent decision stored",
      ok: Boolean(consent),
      detail: consent
        ? `analytics_storage = ${consent.analytics ?? "unknown"}`
        : "No decision yet — Consent Mode stays denied, so GA4 collects nothing until the banner is answered",
    },
    {
      label: "GA4 client cookie (_ga) set",
      ok: Boolean(gaCookie),
      detail: gaCookie
        ? "GA4 tag has fired and created a client id"
        : "No _ga cookie: no GA4 configuration tag has fired in this browser",
    },
  ];
}

function AnalyticsHealthPage() {
  const [checks, setChecks] = useState<Check[] | null>(null);

  useEffect(() => {
    const run = () => setChecks(readChecks());
    run();
    const t = window.setInterval(run, 2000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <main className="mx-auto max-w-[720px] px-5 py-10">
      <h1 className="text-[24px] font-semibold text-[color:var(--charcoal)]">Analytics health</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
        Live client-side check of everything the site controls. Open this page on the published
        domain — preview and admin traffic are deliberately excluded from measurement.
      </p>

      <ul className="mt-6 space-y-3">
        {(checks ?? []).map((c) => (
          <li
            key={c.label}
            className="border border-[color:var(--border)] p-4"
            data-testid="analytics-health-check"
            data-ok={c.ok ? "true" : "false"}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14.5px] font-medium text-[color:var(--charcoal)]">
                {c.label}
              </span>
              <span
                className="text-[12px] uppercase tracking-[0.18em]"
                style={{ color: c.ok ? "var(--teal)" : "#9B2C2C" }}
              >
                {c.ok ? "OK" : "Check"}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-[color:var(--charcoal-soft)]">
              {c.detail}
            </p>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="text-[18px] font-semibold text-[color:var(--charcoal)]">
          If the checks are green and GA4 still shows 0 sessions
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
          The remaining causes live outside this codebase, inside Google Tag Manager / GA4:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-[color:var(--charcoal-soft)]">
          <li>
            Container {GTM_ID} must contain a <strong>GA4 Configuration tag</strong> with the
            property&apos;s Measurement ID, firing on <em>All Pages</em>. No measurement ID exists
            anywhere in this codebase — the site only pushes events into the dataLayer.
          </li>
          <li>
            That container version must be <strong>published</strong> (a workspace draft never
            serves to visitors).
          </li>
          <li>
            In the tag&apos;s Consent Settings, GA4 must be allowed to run in{" "}
            <strong>Consent Mode</strong> with <code>analytics_storage</code> denied, otherwise
            visitors who ignore the cookie banner are never counted.
          </li>
          <li>
            The GA4 property must have a <strong>web data stream</strong> whose domain matches the
            live site, and no internal-traffic/developer filter excluding it.
          </li>
        </ol>
      </section>
    </main>
  );
}

export default AnalyticsHealthPage;
