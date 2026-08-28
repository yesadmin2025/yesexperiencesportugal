import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Euro, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/experiences")({
  head: () => ({
    meta: [
      { title: "Experiences & operations — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminExperiencesHub,
});

function AdminExperiencesHub() {
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<{ id: string; email?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!error && !!data);
        setAuthChecked(true);
      }
    }

    supabase.auth.getSession().then(({ data }) => loadSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setAuthChecked(false);
      loadSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-5xl">
          <p className="text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!session) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Experiences & operations</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">Sign in to open the admin tools.</p>
          <Link
            to="/auth"
            className="mt-6 inline-flex min-h-11 items-center bg-[color:var(--charcoal)] px-5 text-sm text-[color:var(--ivory)]"
          >
            Sign in
          </Link>
        </section>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Not authorized</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">This page requires the admin role.</p>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-28 pb-24">
        <div className="container-x max-w-5xl">
          <Link
            to="/admin"
            className="text-xs uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            ← Admin
          </Link>
          <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Content & operations
          </p>
          <h1 className="mt-1 text-3xl tracking-tight">Experiences & operations</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
            Operational controls use the same sources of truth as checkout. Pricing and availability
            are separated so changing one can never silently change the other.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ToolCard
              to="/admin/pricing"
              icon={<Euro size={20} />}
              title="Signature pricing"
              eyebrow="tour_price_tiers"
              description="Edit exact 1–8 pax rates, preview the public price card and see group-total inversion warnings before saving."
            />
            <ToolCard
              to="/admin/availability"
              icon={<CalendarDays size={20} />}
              title="Availability calendar"
              eyebrow="tour_operating_rules"
              description="Close individual dates, set operating weekdays and minimum booking notice for each Signature."
            />
          </div>

          <div className="mt-8 border-t border-[color:var(--border)] pt-5">
            <p className="text-xs leading-relaxed text-[color:var(--charcoal-soft)]">
              Signature content and add-on editing are intentionally not exposed here yet. Their current
              code/data sources still contain legacy duplication, so they will only become editable after
              the canonical migration is proven. No third source of truth.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function ToolCard({
  to,
  icon,
  title,
  eyebrow,
  description,
}: {
  to: "/admin/pricing" | "/admin/availability";
  icon: React.ReactNode;
  title: string;
  eyebrow: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group border border-[color:var(--border)] bg-white p-5 transition-colors hover:border-[color:var(--gold)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-10 place-items-center border border-[color:var(--border)] text-[color:var(--teal)]">
          {icon}
        </div>
        <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
      </div>
      <p className="mt-5 text-[9px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">{description}</p>
    </Link>
  );
}
