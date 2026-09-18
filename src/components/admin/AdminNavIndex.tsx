/**
 * AdminNavIndex — the single, complete index of every admin screen.
 *
 * Why this exists: the admin overview previously linked only ten screens while
 * dozens existed, so most tools could only be reached by typing the address.
 * Every admin route in `src/routes/admin.*` is listed here exactly once, in
 * English, grouped by the job the operator is doing. Add a new admin route?
 * Add it to a group below.
 *
 * Presentation only — no new backend, no data mutations.
 */

import { Link } from "@tanstack/react-router";

type AdminLink = { to: string; label: string; hint?: string };
type AdminGroup = { title: string; note?: string; links: AdminLink[] };

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    title: "Guests & bookings",
    note: "Everything a paid or requested trip touches.",
    links: [
      { to: "/admin/bookings", label: "Bookings", hint: "Date, guests, payment, refunds" },
      { to: "/admin/availability", label: "Availability calendar" },
      { to: "/admin/enquiries", label: "Enquiries & messages" },
      { to: "/admin/emails", label: "Email delivery" },
      { to: "/admin/webhook-events", label: "Payment events" },
      { to: "/admin/payments-env", label: "Payment settings" },
    ],
  },
  {
    title: "Reviews",
    note: "Guest reviews stay unpublished until you approve them.",
    links: [{ to: "/admin/reviews", label: "Approve guest reviews" }],
  },
  {
    title: "Prices",
    links: [
      { to: "/admin/pricing", label: "Experience prices" },
      { to: "/admin/price-map", label: "Price map (all at once)" },
      { to: "/admin/pricing-tool", label: "Quick price tool" },
      { to: "/admin/composable-stops", label: "Composed moments (prices)" },
    ],
  },
  {
    title: "Experiences & content",
    links: [
      { to: "/admin/experiences", label: "Experiences & operations" },
      { to: "/admin/photos", label: "Photos" },
      { to: "/admin/image-swap", label: "Swap an image" },
      { to: "/admin/builder-images", label: "Builder images" },
      { to: "/admin/import-tours", label: "Import experiences" },
      { to: "/admin/sot-refresh", label: "Refresh source of truth" },
      { to: "/admin/sot-diff", label: "Source-of-truth differences" },
      { to: "/admin/viator-validation", label: "Viator check" },
      { to: "/admin/stop-parity", label: "Stop parity" },
    ],
  },
  {
    title: "Search & visibility",
    links: [
      { to: "/admin/gsc", label: "Google Search Console" },
      { to: "/admin/seo-monitor", label: "SEO monitor" },
      {
        to: "/admin/seo-experiences",
        label: "SEO by experience",
        hint: "Clicks, position and paid bookings per experience",
      },
      { to: "/admin/seo-strategy", label: "SEO authority strategy" },
      { to: "/admin/seo-jsonld", label: "Structured data" },
      { to: "/admin/tour-link-audit", label: "Internal link audit" },
      { to: "/admin/guide-attribution", label: "Guide attribution" },
      { to: "/admin/gbp-legacy-removal", label: "Old Google profile removal" },
      { to: "/admin/legacy-domain-unlink", label: "Unlink old domains" },
      { to: "/admin/legacy-domains-monitor", label: "Old domains monitor" },
      { to: "/admin/legacy-scan", label: "Legacy scan" },
      { to: "/admin/redirects-monitor", label: "Redirects monitor" },
      { to: "/admin/domains-health", label: "Domains health" },
      { to: "/admin/dns-watch", label: "DNS watch" },
    ],
  },
  {
    title: "Health & diagnostics",
    note: "Read-only checks. Useful when something looks wrong.",
    links: [
      { to: "/admin/analytics-health", label: "Analytics health" },
      { to: "/admin/error-logs", label: "Error log" },
      { to: "/admin/e2e-report", label: "Test report" },
      { to: "/admin/ai-audit", label: "AI audit" },
      { to: "/admin/studio-v3-audit", label: "Studio audit" },
      { to: "/admin/studio-v3-funnel", label: "Studio funnel" },
      { to: "/admin/drift-behavior", label: "Drift: behaviour" },
      { to: "/admin/drift-bible", label: "Drift: brand bible" },
      { to: "/admin/builder-images-qa", label: "Builder images QA" },
    ],
  },
];

export function AdminNavIndex({ pendingReviews }: { pendingReviews?: number | null }) {
  return (
    <nav aria-label="Admin sections" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {ADMIN_GROUPS.map((group) => (
        <section
          key={group.title}
          className="border border-[color:var(--border)] bg-white/60 p-4 sm:p-5"
        >
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            {group.title}
          </h2>
          {group.note && (
            <p className="mt-2 text-xs leading-relaxed text-[color:var(--charcoal-soft)]">
              {group.note}
            </p>
          )}
          <ul className="mt-3 space-y-1">
            {group.links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="flex min-h-11 items-center justify-between gap-3 border-b border-[color:var(--charcoal)]/[0.06] py-1 text-sm text-[color:var(--charcoal)] hover:text-[color:var(--teal)]"
                >
                  <span>
                    {link.label}
                    {link.hint && (
                      <span className="block text-[11px] text-[color:var(--charcoal-soft)]">
                        {link.hint}
                      </span>
                    )}
                  </span>
                  {link.to === "/admin/reviews" && (pendingReviews ?? 0) > 0 && (
                    <span className="shrink-0 rounded-full bg-[color:var(--teal)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--ivory)]">
                      {pendingReviews} waiting
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
