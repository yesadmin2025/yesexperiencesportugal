/**
 * /admin/settings — everything that is not daily work, grouped and quiet.
 *
 * Connections & automation holds the existing technical panels (Gmail, Bókun,
 * WhatsApp, payment reconciliation) behind disclosures so nothing runs or
 * shows a wall of buttons until the owner opens it. Every other admin screen
 * stays reachable through the grouped links below — no address was removed.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AdminSectionTitle, AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_GROUPS } from "@/components/admin/AdminNavIndex";
import { OpsIntegrationsPanel } from "@/components/admin/ops/OpsIntegrationsPanel";
import { OpsWhatsAppPanel } from "@/components/admin/ops/OpsWhatsAppPanel";
import { OpsReconciliationPanel } from "@/components/admin/ops/OpsReconciliationPanel";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "Settings · YES Operations" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm">Could not load Settings: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Disclosure({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <details className="group border-b border-[color:var(--charcoal)]/[0.07]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[14px] text-[color:var(--charcoal)]">{title}</span>
          <span className="block text-[12.5px] text-[color:var(--charcoal-soft)]">{hint}</span>
        </span>
        <span aria-hidden className="text-[color:var(--charcoal-soft)] transition-transform duration-200 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

const LINK_GROUPS: Array<{ title: string; groups: string[]; extra?: Array<{ to: string; label: string }> }> = [
  {
    title: "Prices & experiences",
    groups: ["Prices", "Experiences & content"],
  },
  { title: "Reviews", groups: ["Reviews"] },
  { title: "Search & visibility", groups: ["Search & visibility"] },
  { title: "Diagnostics", groups: ["Health & diagnostics"] },
];

const byTitle = new Map(ADMIN_GROUPS.map((group) => [group.title, group]));

function LinkList({ links }: { links: Array<{ to: string; label: string; hint?: string }> }) {
  return (
    <ul className="divide-y divide-[color:var(--charcoal)]/[0.06] border-y border-[color:var(--charcoal)]/[0.06]">
      {links.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            className="flex min-h-11 items-center justify-between gap-3 py-2 text-[13.5px] text-[color:var(--charcoal)] hover:text-[color:var(--teal)]"
          >
            <span>
              {link.label}
              {link.hint ? <span className="block text-[11.5px] text-[color:var(--charcoal-soft)]">{link.hint}</span> : null}
            </span>
            <span aria-hidden className="text-[color:var(--charcoal-soft)]">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SettingsPage() {
  const bookingLinks = (byTitle.get("Guests & bookings")?.links ?? []).filter((link) => link.to !== "/admin/bookings");

  return (
    <AdminShell eyebrow="Admin" title="Settings">
      <p className="max-w-xl text-[14px] text-[color:var(--charcoal-soft)]">
        Connections run on their own in the background. Open a section only when you need to check or change something.
      </p>

      <section className="mt-10">
        <AdminSectionTitle>Connections & automation</AdminSectionTitle>
        <div className="mt-2">
          <Disclosure title="Email bookings (Gmail) and Bókun" hint="Automatic scan every 15 minutes · health and manual runs">
            <OpsIntegrationsPanel />
          </Disclosure>
          <Disclosure title="WhatsApp Business" hint="Connection, incoming messages and chat matching">
            <OpsWhatsAppPanel />
          </Disclosure>
          <Disclosure title="Payment and email matching" hint="How card payments were matched to confirmations">
            <OpsReconciliationPanel />
          </Disclosure>
          <Disclosure title="Payments, emails and enquiries" hint="Card payment events, sent emails, guest messages">
            <LinkList links={bookingLinks} />
          </Disclosure>
        </div>
      </section>

      {LINK_GROUPS.map((section) => {
        const links = section.groups.flatMap((title) => byTitle.get(title)?.links ?? []);
        return (
          <section key={section.title} className="mt-10">
            <AdminSectionTitle>{section.title}</AdminSectionTitle>
            <div className="mt-2">
              <Disclosure title={`${links.length} screen${links.length === 1 ? "" : "s"}`} hint={links.slice(0, 3).map((link) => link.label).join(" · ")}>
                <LinkList links={links} />
              </Disclosure>
            </div>
          </section>
        );
      })}
    </AdminShell>
  );
}
