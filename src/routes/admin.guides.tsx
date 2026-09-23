/**
 * /admin/guides — the guides directory used when sending a day's brief.
 * Contacts only: no pricing, no booking mutation.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteGuide, listGuides, saveGuide } from "@/lib/guides.functions";
import { Button } from "@/components/ui/button";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/guides")({
  component: AdminGuidesPage,
  head: () => ({
    meta: [{ title: "Guides · Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-red-700">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Guide = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
};

const EMPTY = { id: "", name: "", email: "", phone: "", notes: "", active: true };

function AdminGuidesPage() {
  const load = useServerFn(listGuides);
  const save = useServerFn(saveGuide);
  const remove = useServerFn(deleteGuide);

  const [guides, setGuides] = useState<Guide[]>([]);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    load({})
      .then((res) => setGuides((res.guides ?? []) as Guide[]))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const field =
    "mt-1 min-h-11 w-full border border-[color:var(--sand)] bg-white px-3 text-base normal-case tracking-normal md:text-sm";
  const labelClass = "block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/admin/bookings" className="text-sm text-[color:var(--teal)]">
        ← Guest trips
      </Link>
      <h1 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl text-[color:var(--charcoal)]">
        Guides
      </h1>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        Saved contacts for sending a day's brief by email or WhatsApp.
      </p>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <section className="mt-6 border border-[color:var(--sand)] bg-white p-4">
        <h2 className="font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
          {draft.id ? "Edit guide" : "Add a guide"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={field}
            />
          </label>
          <label className={labelClass}>
            Email
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className={field}
            />
          </label>
          <label className={labelClass}>
            WhatsApp
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="+351 900 000 000"
              className={field}
            />
          </label>
          <label className={labelClass}>
            Notes
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className={field}
            />
          </label>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-[color:var(--charcoal)]">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Active
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            className="min-h-11"
            disabled={busy || draft.name.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await save({
                  data: {
                    ...(draft.id ? { id: draft.id } : {}),
                    name: draft.name.trim(),
                    email: draft.email.trim() || null,
                    phone: draft.phone.trim() || null,
                    notes: draft.notes.trim() || null,
                    active: draft.active,
                  },
                });
                setDraft({ ...EMPTY });
                await refresh();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not save.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : draft.id ? "Save changes" : "Add guide"}
          </Button>
          {draft.id ? (
            <Button variant="ghost" className="min-h-11" onClick={() => setDraft({ ...EMPTY })}>
              Cancel
            </Button>
          ) : null}
        </div>
      </section>

      <ul className="mt-6 divide-y divide-[color:var(--sand)]">
        {guides.map((g) => (
          <li key={g.id} className="py-3">
            <div className="text-sm text-[color:var(--charcoal)]">
              {g.name} {g.active ? "" : "· inactive"}
            </div>
            <div className="text-sm text-[color:var(--charcoal-soft)]">
              {[g.email, g.phone].filter(Boolean).join(" · ") || "No contact saved"}
            </div>
            {g.notes ? (
              <div className="text-xs text-[color:var(--charcoal-soft)]">{g.notes}</div>
            ) : null}
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() =>
                  setDraft({
                    id: g.id,
                    name: g.name,
                    email: g.email ?? "",
                    phone: g.phone ?? "",
                    notes: g.notes ?? "",
                    active: g.active,
                  })
                }
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={async () => {
                  if (!window.confirm(`Remove ${g.name}?`)) return;
                  await remove({ data: { id: g.id } });
                  await refresh();
                }}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
        {guides.length === 0 ? (
          <li className="py-3 text-sm text-[color:var(--charcoal-soft)]">No guides saved yet.</li>
        ) : null}
      </ul>
    </main>
  );
}
