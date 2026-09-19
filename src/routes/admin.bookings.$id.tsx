/**
 * /admin/bookings/$id — full detail of one reservation.
 *
 * Everything below the contact block renders the frozen purchase snapshot
 * captured when payment succeeded, so later edits to tours, itineraries or
 * pricing tables never change what a past guest actually bought.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  cancelAndRefundBooking,
  getAdminBooking,
  notifyBookingCustomer,
  updateAdminBooking,
} from "@/lib/bookingsAdmin.functions";
import { Button } from "@/components/ui/button";
import {
  buildSnapshotEmailPreview,
  validateBookingSnapshot,
} from "@/lib/booking-snapshot-contract";

export const Route = createFileRoute("/admin/bookings/$id")({
  component: AdminBookingDetailPage,
  head: () => ({
    meta: [{ title: "Booking · Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-red-700">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

function money(n: number | null | undefined, currency = "EUR") {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        {label}
      </div>
      <div className="text-sm text-[color:var(--charcoal)]">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-lg border border-[color:var(--sand)] bg-white p-5">
      <h2 className="font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
        {title}
      </h2>
      <div className="mt-3 divide-y divide-[color:var(--sand)]">{children}</div>
    </section>
  );
}
function PreviewList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        {label}
      </div>
      {items.length === 0 ? (
        <p className="text-[color:var(--charcoal-soft)]">— not included in the emails</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminBookingDetailPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getAdminBooking);
  const cancelAndRefund = useServerFn(cancelAndRefundBooking);
  const [booking, setBooking] = useState<AnyRec | null>(null);
  const [snapshot, setSnapshot] = useState<AnyRec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [notifyText, setNotifyText] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const saveEdit = useServerFn(updateAdminBooking);
  const notifyGuest = useServerFn(notifyBookingCustomer);

  useEffect(() => {
    let active = true;
    get({ data: { id } })
      .then((r) => {
        if (!active) return;
        const b = (r.booking as AnyRec) ?? null;
        setBooking(b);
        setSnapshot((r.snapshot as AnyRec) ?? null);
        if (b) {
          setEditName(b.customer_name ?? "");
          setEditPhone(b.customer_phone ?? "");
          setEditDate(b.preferred_date ?? "");
          setEditNotes(b.notes ?? "");
        }
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, get]);

  if (loading) return <div className="p-8 text-sm">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!booking) return <div className="p-8 text-sm">Booking not found.</div>;

  const currency = String(booking.currency || "eur").toUpperCase();
  const pricing = (snapshot?.pricing ?? {}) as AnyRec;
  const itinerary = Array.isArray(snapshot?.itinerary) ? snapshot!.itinerary : [];
  const addOns = Array.isArray(snapshot?.addOns) ? snapshot!.addOns : [];
  const removed = Array.isArray(snapshot?.removedOptions) ? snapshot!.removedOptions : [];
  const notes = Array.isArray(snapshot?.notes) ? snapshot!.notes : [];
  const emailPreview = buildSnapshotEmailPreview(snapshot);
  const snapshotCheck = validateBookingSnapshot(snapshot);
  const composition = (snapshot?.composition ??
    booking.booking_details?.composition ??
    {}) as AnyRec;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/admin/bookings" className="text-sm text-[color:var(--charcoal-soft)]">
        ← All bookings
      </Link>
      <h1 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl text-[color:var(--charcoal)]">
        {snapshot?.experienceName || booking.source_tour_id || "Booking"}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        {booking.status} · {booking.booking_type} · {new Date(booking.created_at).toLocaleString()}
      </p>

      {booking.status === "paid" ? (
        <section className="mt-6 border-y border-[color:var(--border)] py-5">
          <p className="text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
            Cancelling submits a full refund to the original payment method and emails the guest.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-4 min-h-[44px]"
            disabled={refundBusy}
            onClick={async () => {
              if (!window.confirm("Cancel this booking and submit a full refund? This cannot be undone.")) return;
              setRefundBusy(true);
              setRefundMessage(null);
              try {
                const result = await cancelAndRefund({ data: { id } });
                setBooking((current) => current ? { ...current, status: result.status } : current);
                setRefundMessage("Cancellation confirmed. The refund was submitted and the guest email was queued.");
              } catch (cause) {
                setRefundMessage(cause instanceof Error ? cause.message : "The refund could not be submitted.");
              } finally {
                setRefundBusy(false);
              }
            }}
          >
            {refundBusy ? "Submitting refund…" : "Cancel and refund booking"}
          </Button>
        </section>
      ) : null}
      {refundMessage ? (
        <p role="status" className="mt-4 rounded-[6px] border border-[color:var(--border)] bg-[color:var(--sand)] p-4 text-sm text-[color:var(--charcoal)]">
          {refundMessage}
        </p>
      ) : null}

      <section className="mt-6 rounded-lg border border-[color:var(--sand)] bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => setEditOpen((v) => !v)}
            aria-expanded={editOpen}
          >
            {editOpen ? "Close edit" : "Edit booking"}
          </Button>
        </div>

        {editOpen ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                Guest name
              </span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full rounded-md border border-[color:var(--sand)] px-3 py-2.5 text-base"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                Guest phone
              </span>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="mt-1 w-full rounded-md border border-[color:var(--sand)] px-3 py-2.5 text-base"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                Trip date
              </span>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1 block w-full min-w-0 max-w-full rounded-md border border-[color:var(--sand)] px-3 py-2.5 text-base"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                Internal notes
              </span>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-[color:var(--sand)] px-3 py-2.5 text-base"
              />
            </label>
            <p className="text-xs text-[color:var(--charcoal-soft)]">
              Only operational details. Price and payment state never change here.
            </p>
            <Button
              type="button"
              className="min-h-[44px]"
              disabled={editBusy}
              onClick={async () => {
                setEditBusy(true);
                setEditMessage(null);
                try {
                  const result = await saveEdit({
                    data: {
                      id,
                      customerName: editName.trim() || undefined,
                      customerPhone: editPhone.trim() || null,
                      preferredDate: editDate || null,
                      notes: editNotes.trim() || null,
                    },
                  });
                  if (result.changed) {
                    setBooking((current: AnyRec | null) =>
                      current
                        ? {
                            ...current,
                            customer_name: editName.trim() || current.customer_name,
                            customer_phone: editPhone.trim() || null,
                            preferred_date: editDate || null,
                            notes: editNotes.trim() || null,
                          }
                        : current,
                    );
                  }
                  setEditMessage(result.changed ? "Saved." : "Nothing changed.");
                } catch (cause) {
                  setEditMessage(cause instanceof Error ? cause.message : "Could not save.");
                } finally {
                  setEditBusy(false);
                }
              }}
            >
              {editBusy ? "Saving…" : "Save changes"}
            </Button>
            {editMessage ? (
              <p role="status" className="text-sm text-[color:var(--charcoal)]">
                {editMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 border-t border-[color:var(--sand)] pt-5">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Notify guest
          </h3>
          <textarea
            value={notifyText}
            onChange={(e) => setNotifyText(e.target.value)}
            rows={4}
            placeholder="Write the message the guest receives by email…"
            aria-label="Message to the guest"
            className="mt-2 w-full rounded-md border border-[color:var(--sand)] px-3 py-2.5 text-base"
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 min-h-[44px]"
            disabled={notifyBusy || notifyText.trim().length < 10}
            onClick={async () => {
              if (!window.confirm(`Email this message to ${booking.customer_email}?`)) return;
              setNotifyBusy(true);
              setNotifyMessage(null);
              try {
                await notifyGuest({ data: { id, message: notifyText.trim() } });
                setNotifyMessage(`Email sent to ${booking.customer_email}.`);
                setNotifyText("");
              } catch (cause) {
                setNotifyMessage(cause instanceof Error ? cause.message : "The email could not be sent.");
              } finally {
                setNotifyBusy(false);
              }
            }}
          >
            {notifyBusy ? "Sending…" : "Send email to guest"}
          </Button>
          {notifyMessage ? (
            <p role="status" className="mt-2 text-sm text-[color:var(--charcoal)]">
              {notifyMessage}
            </p>
          ) : null}
        </div>
      </section>

      <Card title="Customer">
        <Row label="Name" value={booking.customer_name ?? snapshot?.customerName} />
        <Row label="Email" value={booking.customer_email} />
        <Row label="Phone" value={booking.customer_phone ?? snapshot?.customerPhone} />
        <Row label="Booking reference" value={booking.stripe_session_id} />
      </Card>

      <Card title="Experience">
        <Row label="Experience" value={snapshot?.experienceName ?? booking.source_tour_id} />
        <Row label="Date" value={booking.preferred_date ?? snapshot?.dateExact} />
        <Row label="Start time" value={snapshot?.startTime} />
        <Row label="Duration" value={snapshot?.durationLabel} />
        <Row label="Pickup" value={snapshot?.pickup} />
        <Row
          label="Guests"
          value={
            composition?.adults != null
              ? `${booking.guests} total · ${composition.adults} adult${composition.adults === 1 ? "" : "s"}${
                  Array.isArray(composition.minorAges) && composition.minorAges.length > 0
                    ? ` · minors aged ${composition.minorAges.join(", ")}`
                    : ""
                }`
              : booking.guests
          }
        />
      </Card>

      {itinerary.length > 0 ? (
        <Card title="Booked itinerary">
          <ol className="list-decimal space-y-1 pl-5 pt-2 text-sm text-[color:var(--charcoal)]">
            {itinerary.map((s: AnyRec, i: number) => (
              <li key={i}>
                {s.label}
                {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                {s.note ? ` — ${s.note}` : ""}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {addOns.length > 0 || removed.length > 0 ? (
        <Card title="Adjustments">
          <Row
            label="Selected add-ons"
            value={
              addOns.length > 0 ? (
                <ul className="list-disc pl-5">
                  {addOns.map((a: AnyRec, i: number) => (
                    <li key={i}>
                      {a.label}
                      {a.priceEur ? ` · ${money(a.priceEur, "EUR")} pp` : ""}
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
          <Row
            label="Removed options"
            value={
              removed.length > 0 ? (
                <ul className="list-disc pl-5">
                  {removed.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : null
            }
          />
        </Card>
      ) : null}

      {notes.length > 0 ? (
        <Card title="Customer notes">
          <ul className="list-disc pl-5 pt-2 text-sm text-[color:var(--charcoal)]">
            {notes.map((n: string, i: number) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="Pricing breakdown">
        <Row label="Base per person" value={money(pricing.basePerPaxEur)} />
        <Row label="Final per person" value={money(pricing.finalPerPaxEur)} />
        <Row
          label="Stops removed"
          value={pricing.principalsRemoved ? String(pricing.principalsRemoved) : null}
        />
        <Row
          label="Tailor supplements"
          value={pricing.tailorSupplementsEur ? money(pricing.tailorSupplementsEur) : null}
        />
        <Row
          label="Lunch removal credit (pp)"
          value={
            pricing.lunchRemovalCreditEurPerPax
              ? `− ${money(pricing.lunchRemovalCreditEurPerPax)}`
              : null
          }
        />
        <Row label="Experience subtotal" value={money(pricing.tourSubtotalEur)} />
        <Row
          label="Add-ons total"
          value={pricing.addOnsTotalEur ? money(pricing.addOnsTotalEur) : null}
        />
        <Row
          label="Total paid"
          value={new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
            (booking.amount_total || 0) / 100,
          )}
        />
      </Card>

      <Card title="Confirmation email preview">
        <div className="space-y-4 pt-3 text-sm text-[color:var(--charcoal)]">
          <p className="text-[color:var(--charcoal-soft)]">
            Exactly what the guest receipt and the team alert render for this booking.
          </p>
          {snapshotCheck.ok ? null : (
            <p className="rounded border border-red-200 bg-red-50 p-3 text-red-800">
              Incomplete snapshot — these emails would be missing:{" "}
              {snapshotCheck.missing.join(", ")}.
            </p>
          )}
          <PreviewList label="Your day, stop by stop" items={emailPreview.itineraryLines} />
          <PreviewList label="Included" items={emailPreview.includedItems} />
          <PreviewList label="Add-ons" items={emailPreview.addOnLabels} />
          <PreviewList label="Adjusted for you" items={emailPreview.removedOptions} />
          <PreviewList label="Your notes" items={emailPreview.customerNotes} />
        </div>
      </Card>

      {!snapshot ? (
        <p className="mt-6 text-sm text-[color:var(--charcoal-soft)]">
          No purchase snapshot was captured for this booking (it predates snapshotting).
        </p>
      ) : null}
    </main>
  );
}
