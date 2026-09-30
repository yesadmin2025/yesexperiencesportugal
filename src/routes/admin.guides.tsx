/**
 * /admin/guides — the guides directory used when sending a day's brief.
 * Contacts only: no pricing, no booking mutation.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteGuide, listGuides, saveGuide, sendGuideAppInvite } from "@/lib/guides.functions";
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
  app_linked: boolean;
  approval_status?: string;
};

const EMPTY = { id: "", name: "", email: "", phone: "", notes: "", active: true };

function AdminGuidesPage() {
  const load = useServerFn(listGuides);
  const save = useServerFn(saveGuide);
  const remove = useServerFn(deleteGuide);
  const invite = useServerFn(sendGuideAppInvite);
  const review = useServerFn(reviewGuideRequest);

  const [guides, setGuides] = useState<Guide[]>([]);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
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
    <AdminShell eyebrow="Team" title="Guides">
      <p className="text-sm text-[color:var(--charcoal-soft)]">
        Saved contacts for sending a day's brief by email or WhatsApp. Assign a guide from any booking.
      </p>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {guides.some((g) => g.approval_status === "pending") ? (
        <section className="mt-6 border border-[color:var(--gold)] bg-white p-4" aria-label="Sign-ups to review">
          <h2 className="font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
            Sign-ups to review
          </h2>
          <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
            Approving gives access to the Guide App and emails the guide straight away.
          </p>
          <ul className="mt-3 divide-y divide-[color:var(--sand)]">
            {guides
              .filter((g) => g.approval_status === "pending")
              .map((g) => (
                <li key={g.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-[color:var(--charcoal)]">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-[color:var(--charcoal-soft)]">{[g.email, g.phone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex gap-2">
                    {(["approve", "reject"] as const).map((decision) => (
                      <button
                        key={decision}
                        type="button"
                        disabled={reviewing === g.id}
                        onClick={async () => {
                          if (decision === "reject" && !window.confirm(`Reject ${g.name}?`)) return;
                          setReviewing(g.id);
                          try {
                            const res = await review({ data: { guideId: g.id, decision } });
                            toast.success(
                              decision === "reject"
                                ? `${g.name} rejected.`
                                : res.notified
                                  ? `${g.name} approved and emailed.`
                                  : `${g.name} approved. No email could be sent.`,
                            );
                            await refresh();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Could not save.");
                          } finally {
                            setReviewing(null);
                          }
                        }}
                        className={
                          decision === "approve"
                            ? "min-h-11 rounded-full bg-[color:var(--teal)] px-5 text-[12px] uppercase tracking-[0.14em] text-[color:var(--ivory)]"
                            : "min-h-11 rounded-full border border-[color:var(--sand)] px-5 text-[12px] uppercase tracking-[0.14em] text-[color:var(--charcoal)]"
                        }
                      >
                        {decision === "approve" ? "Approve" : "Reject"}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

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
              {g.name} {g.approval_status === "pending" ? "· awaiting approval (tick Active and save)" : g.active ? "" : "· inactive"}
              {g.app_linked ? (
                <span className="ml-2 text-xs text-[color:var(--teal)]">· App connected</span>
              ) : null}
            </div>
            <div className="text-sm text-[color:var(--charcoal-soft)]">
              {[g.email, g.phone].filter(Boolean).join(" · ") || "No contact saved"}
            </div>
            {g.notes ? (
              <div className="text-xs text-[color:var(--charcoal-soft)]">{g.notes}</div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {g.email ? (
                <Button
                  size="sm"
                  className="min-h-11"
                  disabled={inviting === g.id}
                  onClick={async () => {
                    setInviting(g.id);
                    try {
                      const res = await invite({ data: { guideId: g.id } });
                      toast.success(`App invite sent to ${res.email}`);
                    } catch (cause) {
                      toast.error(cause instanceof Error ? cause.message : "Could not send the invite.");
                    } finally {
                      setInviting(null);
                    }
                  }}
                >
                  {inviting === g.id ? "Sending…" : g.app_linked ? "Resend app invite" : "Send app invite"}
                </Button>
              ) : (
                <span className="self-center text-xs text-[color:var(--charcoal-soft)]">
                  Add an email to send an app invite
                </span>
              )}
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
    </AdminShell>
  );
}
