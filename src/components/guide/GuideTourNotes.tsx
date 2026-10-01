import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { db, errMsg } from "@/components/guide/guide-data";

type Note = { id: string; note: string; expense_amount: number | null; created_at: string; guide_id?: string; guides?: { name: string } | null };
const eur = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(n);
const when = (s: string) => new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Guide's private notes for one tour (expenses, info for the office). Admin reads them on the booking page. */
export function GuideTourNotes({ bookingId }: { bookingId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await db.from("guide_tour_notes").select("id, note, expense_amount, created_at").eq("booking_id", bookingId).order("created_at", { ascending: false });
    setNotes(data ?? []);
  }, [bookingId]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    const value = amount.trim() ? Number(amount.replace(",", ".")) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0)) return toast.error("Enter a valid amount.");
    setBusy(true);
    try {
      const { data: guideId } = await db.rpc("current_guide_id");
      if (!guideId) throw new Error("Your guide profile isn't linked yet.");
      const { error } = await db.from("guide_tour_notes").insert({ booking_id: bookingId, guide_id: guideId, note: text.trim(), expense_amount: value });
      if (error) throw new Error(error.message);
      setText(""); setAmount(""); toast.success("Note saved for the office"); await load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    const { error } = await db.from("guide_tour_notes").delete().eq("id", id);
    if (error) toast.error(error.message); else void load();
  };

  return (
    <section>
      <h2 className="text-[12px] uppercase tracking-[0.18em] font-medium mb-1">My notes</h2>
      <p className="mb-3 text-sm text-muted-foreground">Expenses or anything the office should know. Only you and the office see these.</p>
      <div className="space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000} className="w-full border border-border bg-background p-2 text-base" placeholder="e.g. Parking at Sintra, guests asked for an earlier pickup…" />
        <div className="flex gap-2">
          <label className="flex min-h-12 flex-1 items-center gap-2 border border-border px-3 text-sm">
            <span className="text-muted-foreground">Expense €</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="optional" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
          </label>
          <button disabled={busy || !text.trim()} onClick={save} className="min-h-12 bg-[color:var(--teal)] px-5 text-[12px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-50">Save</button>
        </div>
      </div>
      {notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-[color:var(--teal)] pl-3 text-sm">
              <p className="whitespace-pre-line break-words">{n.note}</p>
              <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{when(n.created_at)}{n.expense_amount != null ? ` · ${eur(Number(n.expense_amount))}` : ""}</span>
                <button onClick={() => remove(n.id)} className="min-h-11 px-2 underline underline-offset-4">Delete</button>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Admin view of every guide note on a booking. */
export function AdminGuideTourNotes({ bookingId }: { bookingId: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  useEffect(() => {
    db.from("guide_tour_notes").select("id, note, expense_amount, created_at, guides(name)").eq("booking_id", bookingId).order("created_at", { ascending: false })
      .then(({ data }: { data: Note[] | null }) => setNotes(data ?? []));
  }, [bookingId]);
  if (!notes) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!notes.length) return <p className="text-sm text-muted-foreground">No notes from the guide.</p>;
  const total = notes.reduce((s, n) => s + (n.expense_amount != null ? Number(n.expense_amount) : 0), 0);
  return (
    <div>
      <ul className="divide-y divide-border text-sm">
        {notes.map((n) => (
          <li key={n.id} className="py-2">
            <p className="whitespace-pre-line break-words">{n.note}</p>
            <p className="mt-1 text-xs text-muted-foreground">{n.guides?.name ?? "Guide"} · {when(n.created_at)}{n.expense_amount != null ? ` · Expense ${eur(Number(n.expense_amount))}` : ""}</p>
          </li>
        ))}
      </ul>
      {total > 0 && <p className="mt-2 text-sm font-medium">Total guide expenses: {eur(total)}</p>}
    </div>
  );
}
