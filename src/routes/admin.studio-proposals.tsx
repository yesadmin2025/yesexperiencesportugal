import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminSectionTitle, AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/studio-proposals")({
  head: () => ({
    meta: [
      { title: "Studio Proposals | YES Operations" },
      { name: "description", content: "Every private day proposal revealed in Studio." },
      { property: "og:title", content: "Studio Proposals | YES Operations" },
      { property: "og:description", content: "Every private day proposal revealed in Studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudioProposalsPage,
});

interface Row {
  id: string;
  created_at: string;
  title: string;
  duration: string | null;
  per_pax_eur: number | null;
  guests: number | null;
  date_label: string | null;
  pickup: string | null;
}

function StudioProposalsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supabase
      .from("studio_proposals")
      .select("id, created_at, title, duration, per_pax_eur, guests, date_label, pickup")
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data ?? []) as Row[]);
      });
  }, []);

  return (
    <AdminShell>
      <AdminSectionTitle>Studio proposals</AdminSectionTitle>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {!rows && !error ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : null}
      {rows && rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No proposals yet.</p>
      ) : null}
      <ul className="mt-6 divide-y divide-border">
        {rows?.map((r) => (
          <li key={r.id} className="py-4">
            <p className="font-medium text-foreground">{r.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                r.duration,
                r.per_pax_eur ? `€${r.per_pax_eur} / person` : null,
                r.guests ? `${r.guests} guest${r.guests > 1 ? "s" : ""}` : null,
                r.date_label ? `Trip: ${r.date_label}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.pickup ? `${r.pickup} · ` : ""}Created{" "}
              {new Date(r.created_at).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
