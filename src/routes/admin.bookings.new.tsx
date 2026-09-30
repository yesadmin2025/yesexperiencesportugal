import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { signatureTours } from "@/data/signatureTours";
import { createManualBooking } from "@/lib/manualBooking.functions";

export const Route = createFileRoute("/admin/bookings/new")({
  head: () => ({
    meta: [
      { title: "New booking · YES Operations" },
      { name: "description", content: "Enter a phone, email or partner booking by hand." },
      { property: "og:title", content: "New booking · YES Operations" },
      { property: "og:description", content: "Enter a phone, email or partner booking by hand." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewBookingPage,
});

const field =
  "mt-1 min-h-11 w-full border border-[color:var(--sand)] bg-white px-3 text-base normal-case tracking-normal text-[color:var(--charcoal)] md:text-sm";
const label = "block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]";

function NewBookingPage() {
  const create = useServerFn(createManualBooking);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    tourId: "", tourTitle: "", date: "", startTime: "", pickup: "", guests: "2", language: "English",
    name: "", email: "", phone: "", notes: "", channel: "DIRECT", reference: "", amount: "", paid: true,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await create({
        data: {
          tourId: f.tourId || null,
          tourTitle: f.tourTitle || null,
          date: f.date,
          startTime: f.startTime || null,
          pickup: f.pickup,
          guests: Number(f.guests),
          language: f.language || null,
          name: f.name,
          email: f.email,
          phone: f.phone || null,
          notes: f.notes || null,
          channel: f.channel as "DIRECT",
          reference: f.reference || null,
          amountEuros: Number(f.amount || 0),
          paid: f.paid,
        },
      });
      toast.success(res.assignedGuideId ? "Booking saved and a guide was assigned." : "Booking saved. No guide was free — assign one on the booking.");
      void navigate({ to: "/admin/bookings/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the booking.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell eyebrow="Bookings" title="New booking">
      <form onSubmit={submit} className="space-y-8">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">Tour</legend>
          <label className={`${label} sm:col-span-2`}>
            Tour
            <select value={f.tourId} onChange={set("tourId")} className={field}>
              <option value="">Other / custom (type below)</option>
              {signatureTours.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>
          {!f.tourId ? (
            <label className={`${label} sm:col-span-2`}>
              Tour name
              <input required value={f.tourTitle} onChange={set("tourTitle")} className={field} />
            </label>
          ) : null}
          <label className={label}>Date<input required type="date" value={f.date} onChange={set("date")} className={field} /></label>
          <label className={label}>Pickup time<input type="time" value={f.startTime} onChange={set("startTime")} className={field} /></label>
          <label className={`${label} sm:col-span-2`}>Pickup point<input required value={f.pickup} onChange={set("pickup")} placeholder="Hotel name and address" className={field} /></label>
          <label className={label}>Guests<input required type="number" min={1} max={50} value={f.guests} onChange={set("guests")} className={field} /></label>
          <label className={label}>Language<input value={f.language} onChange={set("language")} className={field} /></label>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">Guest</legend>
          <label className={label}>Name<input required value={f.name} onChange={set("name")} className={field} /></label>
          <label className={label}>Email<input required type="email" value={f.email} onChange={set("email")} className={field} /></label>
          <label className={label}>Phone<input type="tel" value={f.phone} onChange={set("phone")} className={field} /></label>
          <label className={`${label} sm:col-span-2`}>
            Special requests
            <textarea rows={3} value={f.notes} onChange={set("notes")} className={`${field} py-2`} />
          </label>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">Payment & source</legend>
          <label className={label}>
            Booked through
            <select value={f.channel} onChange={set("channel")} className={field}>
              <option value="DIRECT">Direct (phone, email, WhatsApp)</option>
              <option value="VIATOR">Viator</option>
              <option value="GETYOURGUIDE">GetYourGuide</option>
              <option value="BOKUN">Bókun</option>
            </select>
          </label>
          <label className={label}>Booking / voucher reference<input value={f.reference} onChange={set("reference")} className={field} /></label>
          <label className={label}>Amount (€)<input type="number" min={0} step="0.01" value={f.amount} onChange={set("amount")} className={field} /></label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm text-[color:var(--charcoal)]">
            <input type="checkbox" checked={f.paid} onChange={set("paid")} className="h-5 w-5" /> Already paid
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-full bg-[color:var(--teal)] px-6 text-[12px] uppercase tracking-[0.16em] text-[color:var(--ivory)] disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Saving…" : "Save booking"}
        </button>
      </form>
    </AdminShell>
  );
}
