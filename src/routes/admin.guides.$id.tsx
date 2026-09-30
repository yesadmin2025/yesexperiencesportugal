import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listGuides, saveGuide, sendGuideAppInvite, reviewGuideRequest } from "@/lib/guides.functions";
import { getOperationsBoard } from "@/lib/operations.functions";
import { guideAccessState, GUIDE_ACCESS_LABEL, canInvite, inviteButtonLabel, assignmentResponseLabel } from "@/lib/guide-access";

type Guide = Awaited<ReturnType<typeof listGuides>>["guides"][number];
type Board = Awaited<ReturnType<typeof getOperationsBoard>>;
const date = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
export const Route = createFileRoute("/admin/guides/$id")({
  component: GuidePage,
  head: () => ({ meta: [{ title: "Guide profile · YES Admin" }, { name: "description", content: "Guide profile, availability and assigned tours." }, { property: "og:title", content: "Guide profile · YES Admin" }, { property: "og:description", content: "Guide profile, availability and assigned tours." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
});
function GuidePage() {
  const { id } = Route.useParams();
  const load = useServerFn(listGuides);
  const getBoard = useServerFn(getOperationsBoard);
  const save = useServerFn(saveGuide);
  const invite = useServerFn(sendGuideAppInvite);
  const review = useServerFn(reviewGuideRequest);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", notes: "", active: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => { const [g, b] = await Promise.all([load(), getBoard({ data: { from: date(0), to: date(90) } })]); const found = g.guides.find((x) => x.id === id) ?? null; setGuide(found); setBoard(b); if (found) setDraft({ name: found.name, email: found.email ?? "", phone: found.phone ?? "", notes: found.notes ?? "", active: found.active }); };
  useEffect(() => { let live = true; Promise.all([load(), getBoard({ data: { from: date(0), to: date(90) } })]).then(([g, b]) => { if (!live) return; const found = g.guides.find((x) => x.id === id) ?? null; setGuide(found); setBoard(b); if (found) setDraft({ name: found.name, email: found.email ?? "", phone: found.phone ?? "", notes: found.notes ?? "", active: found.active }); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load guide."); }); return () => { live = false; }; }, [id, load, getBoard]);
  const act = async (fn: () => Promise<unknown>, message: string) => { setBusy(true); try { await fn(); await refresh(); toast.success(message); setEditing(false); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } };
  const assignments = board?.assignments.filter((a) => a.guide_id === id).sort((a, b) => a.start_at.localeCompare(b.start_at)) ?? [];
  const slots = board?.availability.filter((a) => a.guide_id === id) ?? [];
  const recurring = board?.recurring.filter((a) => a.guide_id === id) ?? [];
  return <AdminShell eyebrow="Team" title={guide?.name ?? "Guide profile"}>
    <Link to="/admin/guides" className="inline-flex min-h-11 items-center text-sm text-primary">← All guides</Link>
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    {guide ? <div className="mt-5 space-y-8">
      <section className="border-t border-border pt-5"><h2 className="font-[family-name:var(--font-editorial)] text-2xl">Profile</h2><div className="mt-3 space-y-2 text-sm"><p className="break-all">{guide.email || "No email saved"}</p><p>{guide.phone || "No phone saved"}</p><p>{guide.active ? "Active" : "Inactive"}</p>{guide.notes ? <p className="text-muted-foreground">{guide.notes}</p> : null}</div><Button className="mt-4" variant="outline" onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit profile"}</Button>
      {editing ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{(["name", "email", "phone", "notes"] as const).map((field) => <label key={field} className="text-sm capitalize">{field}<Input className="mt-1" value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} /></label>)}<label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />Active</label><div className="sm:col-span-2"><Button disabled={busy || draft.name.trim().length < 2} onClick={() => void act(() => save({ data: { id, name: draft.name.trim(), email: draft.email.trim() || null, phone: draft.phone.trim() || null, notes: draft.notes.trim() || null, active: draft.active } }), "Profile saved.")}>Save changes</Button></div></div> : null}</section>
      <section className="border-t border-border pt-5"><h2 className="font-[family-name:var(--font-editorial)] text-2xl">Availability</h2><ul className="mt-3 divide-y divide-border text-sm">{slots.map((s) => <li key={s.id} className="py-2">{new Date(s.start_at).toLocaleDateString("en-GB")} · {s.status} · {new Date(s.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}–{new Date(s.end_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</li>)}{recurring.map((r) => <li key={r.id} className="py-2">Every {new Date(Date.UTC(2026, 8, 27 + r.weekday)).toLocaleDateString("en-GB", { weekday: "long" })} · {r.status}</li>)}</ul>{!slots.length && !recurring.length ? <p className="mt-2 text-sm text-muted-foreground">No availability set.</p> : null}</section>
      <section className="border-t border-border pt-5"><h2 className="font-[family-name:var(--font-editorial)] text-2xl">Upcoming tours</h2><ul className="mt-3 divide-y divide-border">{assignments.map((a) => { const b = board?.bookings.find((x) => x.id === a.booking_id); return <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{b?.preferred_date ?? "Date to confirm"} · {b?.tour_title ?? "Tour to confirm"} · <strong className="font-medium">{assignmentResponseLabel(a)}</strong></span>{b ? <Link to="/admin/bookings/$id" params={{ id: b.id }} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Open booking →</Link> : null}</li>; })}</ul>{!assignments.length ? <p className="mt-2 text-sm text-muted-foreground">No upcoming tours.</p> : null}</section>
      <section className="border-t border-border pt-5"><h2 className="font-[family-name:var(--font-editorial)] text-2xl">App access</h2>{(() => { const st = guideAccessState(guide); return <><p className="mt-2 text-sm font-medium">{GUIDE_ACCESS_LABEL[st]}</p>{guide.app_invited_at ? <p className="mt-1 text-sm text-muted-foreground">Last invite sent {new Date(guide.app_invited_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p> : null}<p className="mt-2 text-sm text-muted-foreground">The guide opens yesexperiencesportugal.com/guide, creates a password with this same email, and their tours appear automatically.</p><div className="mt-3 flex flex-wrap gap-2">{st === "pending_approval" ? <><Button disabled={busy} onClick={() => void act(() => review({ data: { guideId: id, decision: "approve" } }), "Guide approved.")}>Approve</Button><Button variant="outline" disabled={busy} onClick={() => { if (window.confirm("Reject this guide request?")) void act(() => review({ data: { guideId: id, decision: "reject" } }), "Request declined."); }}>Reject</Button></> : null}{st === "needs_email" ? <Button variant="outline" onClick={() => setEditing(true)}>Add email before inviting</Button> : null}{canInvite(st) ? <Button disabled={busy} variant="outline" onClick={() => { if (window.confirm(`Email the Guide App invite to ${guide.email}?`)) void act(() => invite({ data: { guideId: id } }), "App invite sent."); }}>{inviteButtonLabel(st)}</Button> : null}</div></>; })()}</section>
    </div> : !error ? <p className="mt-5 text-sm text-muted-foreground">Loading guide…</p> : null}
  </AdminShell>;
}
