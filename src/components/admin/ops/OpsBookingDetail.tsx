/**
 * Booking detail panel — the operational record for one reservation.
 *
 * Grouped sections (customer / booking / payment / experience choices /
 * operations), safe quick actions, and an editable guide briefing. Amounts are
 * displayed only; nothing here recalculates money, and refunds still run
 * through the existing cancel-and-refund action on the full booking page.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getOpsBooking, saveOpsBriefDraft, updateOpsBooking } from "@/lib/bookingsOps.functions";
import { ChannelBadge, GuideBadge, PaymentBadge, ReviewBadge, StatusBadge } from "./badges";

type Guide = { id: string; name: string; email?: string | null; phone?: string | null; active?: boolean | null };
type Booking = Record<string, unknown> & { id: string };
type Section = { heading: string; lines: string[] };

const money = (cents: unknown, currency: unknown): string => {
  if (typeof cents !== "number" || cents <= 0) return "—";
  const code = (typeof currency === "string" ? currency : "eur").toUpperCase();
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: code }).format(cents / 100);
};

const str = (value: unknown, fallback = "—"): string =>
  typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" ? String(value) : fallback;

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((entry) => (typeof entry === "string" ? entry : "")).filter(Boolean) : [];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--charcoal)]/8 py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">{label}</span>
      <span className="min-w-0 flex-1 text-right text-[13.5px] text-[color:var(--charcoal)] break-words">{value}</span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-4">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">{title}</h3>
      {children}
    </section>
  );
}

export function OpsBookingDetail({ bookingId, onChanged }: { bookingId: string; onChanged?: () => void }) {
  const load = useServerFn(getOpsBooking);
  const update = useServerFn(updateOpsBooking);
  const saveDraft = useServerFn(saveOpsBriefDraft);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [brief, setBrief] = useState<Section[]>([]);
  const [briefDraft, setBriefDraft] = useState("");
  const [ingestion, setIngestion] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await load({ data: { id: bookingId } });
      setBooking((result.booking ?? null) as Booking | null);
      setGuides((result.guides ?? []) as Guide[]);
      setBrief((result.brief ?? []) as Section[]);
      setBriefDraft(result.briefDraft ?? result.briefText ?? "");
      setIngestion((result.ingestion ?? []) as Array<Record<string, unknown>>);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load this reservation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const guideName = useMemo(() => {
    const id = booking?.["assigned_guide_id"];
    return guides.find((guide) => guide.id === id)?.name ?? null;
  }, [booking, guides]);

  const apply = async (patch: Record<string, unknown>, message: string) => {
    setBusy(true);
    try {
      await update({ data: { id: bookingId, ...patch } });
      toast.success(message);
      await refresh();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Change not saved.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !booking) {
    return <p className="p-4 text-sm text-[color:var(--charcoal-soft)]">Loading reservation…</p>;
  }
  if (!booking) return <p className="p-4 text-sm">Reservation not found.</p>;

  const snapshot = (booking["booking_details"] ?? {}) as Record<string, unknown>;
  const inner = (snapshot["snapshot"] ?? {}) as Record<string, unknown>;
  const itinerary = Array.isArray(inner["itinerary"]) ? (inner["itinerary"] as Array<Record<string, unknown>>) : [];
  const pax = booking["pax_breakdown"] as Record<string, number> | null;
  const emailUrl = booking["source_email_url"];

  return (
    <div className="space-y-3 pb-24">
      <div className="flex flex-wrap items-center gap-1.5">
        <ChannelBadge channel={booking["source_channel"] as string | null} source={booking["source"] as string | null} />
        <StatusBadge status={booking["status"] as string | null} />
        <PaymentBadge paymentStatus={booking["payment_status"] as string | null} />
        <GuideBadge guideName={guideName} />
        {booking["review_required"] === true ? <ReviewBadge reason={booking["review_reason"] as string | null} /> : null}
      </div>

      <Group title="Customer">
        <Row label="Name" value={str(booking["customer_name"])} />
        <Row
          label="Email"
          value={
            <a className="underline" href={`mailto:${str(booking["customer_email"], "")}`}>
              {str(booking["customer_email"])}
            </a>
          }
        />
        <Row
          label="Phone"
          value={
            typeof booking["customer_phone"] === "string" && booking["customer_phone"] ? (
              <a className="underline" href={`tel:${booking["customer_phone"] as string}`}>
                {booking["customer_phone"] as string}
              </a>
            ) : (
              "—"
            )
          }
        />
      </Group>

      <Group title="Booking">
        <Row label="Source" value={`${str(booking["source"], "WEBSITE")} · ${str(booking["source_channel"], "website")}`} />
        <Row label="External ref" value={str(booking["external_booking_ref"])} />
        <Row label="Product ref" value={str(booking["external_product_ref"])} />
        <Row label="Internal id" value={<code className="text-[11.5px]">{bookingId}</code>} />
        <Row label="Tour / product" value={str(booking["tour_title"] ?? booking["source_tour_id"])} />
        <Row label="Option / rate" value={str(booking["selected_rate"])} />
        <Row label="Date" value={str(booking["preferred_date"])} />
        <Row label="Start time" value={str(booking["start_time"] ?? inner["startTime"])} />
        <Row
          label="Guests"
          value={
            pax
              ? Object.entries(pax).map(([key, count]) => `${count} ${key}`).join(", ")
              : `${str(booking["guests"], "—")} guests`
          }
        />
        <Row label="Pick-up" value={str(booking["pickup_location"] ?? inner["pickup"])} />
        <Row label="Drop-off" value={str(booking["dropoff_location"])} />
        <Row label="Language" value={str(booking["language"] ?? inner["language"])} />
        <Row label="Status" value={str(booking["status"])} />
      </Group>

      <Group title="Payment">
        <Row label="Payment status" value={str(booking["payment_status"], "—")} />
        <Row label="Amount paid" value={money(booking["amount_paid"] ?? booking["amount_total"], booking["currency"])} />
        <Row label="Booking total" value={money(booking["amount_total"], booking["currency"])} />
        <Row label="Stripe session" value={str(booking["stripe_session_id"])} />
      </Group>

      <Group title="Experience choices">
        <Row label="Extras" value={list(booking["extras"]).join(", ") || "—"} />
        <Row label="Included" value={list(booking["inclusions"]).join(", ") || "—"} />
        <Row label="Not included" value={list(booking["exclusions"]).join(", ") || "—"} />
        <Row label="Preferences" value={str(booking["preferences"] ?? inner["specialRequests"])} />
        {itinerary.length > 0 ? (
          <ol className="mt-2 space-y-1 text-[13px] text-[color:var(--charcoal)]">
            {itinerary.map((stop, index) => (
              <li key={index}>
                {index + 1}. {str(stop["label"] ?? stop["name"])}
                {typeof stop["note"] === "string" && stop["note"] ? ` — ${stop["note"] as string}` : ""}
              </li>
            ))}
          </ol>
        ) : null}
      </Group>

      <Group title="Operations">
        <label className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
          Assigned guide
        </label>
        <select
          className="mt-1 w-full rounded-md border border-[color:var(--charcoal)]/20 bg-white px-3 py-2 text-sm"
          value={(booking["assigned_guide_id"] as string | null) ?? ""}
          disabled={busy}
          onChange={(event) =>
            void apply({ assignedGuideId: event.target.value || null }, "Guide updated.")
          }
        >
          <option value="">Unassigned</option>
          {guides.map((guide) => (
            <option key={guide.id} value={guide.id}>
              {guide.name}
            </option>
          ))}
        </select>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <QuickField
            label="Pick-up"
            initial={str(booking["pickup_location"], "")}
            disabled={busy}
            onSave={(value) => apply({ pickupLocation: value }, "Pick-up updated.")}
          />
          <QuickField
            label="Date (YYYY-MM-DD)"
            initial={str(booking["preferred_date"], "")}
            disabled={busy}
            onSave={(value) => apply({ preferredDate: value }, "Date updated.")}
          />
          <QuickField
            label="Start time"
            initial={str(booking["start_time"], "")}
            disabled={busy}
            onSave={(value) => apply({ startTime: value }, "Start time updated.")}
          />
          <QuickField
            label="Drop-off"
            initial={str(booking["dropoff_location"], "")}
            disabled={busy}
            onSave={(value) => apply({ dropoffLocation: value }, "Drop-off updated.")}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void apply({ paymentStatus: "PAID" }, "Marked paid.")}>
            Mark paid
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void apply({ paymentStatus: "PENDING_PAYMENT" }, "Marked awaiting payment.")}>
            Awaiting payment
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void apply({ status: "paid" }, "Booking confirmed.")}>
            Confirm booking
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void apply({ status: "pending" }, "Booking set to pending.")}>
            Set pending
          </Button>
          {booking["review_required"] === true ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void apply({ reviewRequired: false, reviewReason: null }, "Review resolved.")}>
              Resolve review
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void apply({ reviewRequired: true, reviewReason: "Flagged by operator" }, "Flagged for review.")}>
              Flag for review
            </Button>
          )}
          {typeof emailUrl === "string" && emailUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={emailUrl} target="_blank" rel="noreferrer">
                Open source email
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost">
            <Link to="/admin/bookings/$id" params={{ id: bookingId }}>
              Full booking page
            </Link>
          </Button>
        </div>

        <Row label="Sync status" value={`${str(booking["sync_status"], "—")} · ${str(booking["last_synced_at"], "never")}`} />
        <Row label="Client notes" value={str(booking["client_notes"] ?? booking["notes"])} />

        <div className="mt-3">
          <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
            Operational notes
          </label>
          <pre className="mt-1 whitespace-pre-wrap rounded-md bg-[color:var(--sand)] p-2 text-[12.5px]">
            {str(booking["operational_notes"], "No notes yet.")}
          </pre>
          <div className="mt-2 flex gap-2">
            <Input
              value={note}
              placeholder="Add an operational note"
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              size="sm"
              disabled={busy || note.trim().length < 2}
              onClick={async () => {
                await apply({ appendOperationalNote: note.trim() }, "Note added.");
                setNote("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </Group>

      <Group title="Guide briefing">
        <p className="mb-2 text-[12.5px] text-[color:var(--charcoal-soft)]">
          Generated from this reservation. Edit before sending — prices and payment details are never included.
        </p>
        <Textarea
          value={briefDraft}
          rows={16}
          className="font-mono text-[12.5px]"
          onChange={(event) => setBriefDraft(event.target.value)}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await saveDraft({ data: { id: bookingId, draft: briefDraft } });
                toast.success("Briefing saved.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Briefing not saved.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save briefing
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(briefDraft);
              toast.success("Briefing copied.");
            }}
          >
            Copy
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBriefDraft(brief.map((section) => [section.heading.toUpperCase(), ...section.lines].join("\n")).join("\n\n"))}
          >
            Regenerate
          </Button>
        </div>
      </Group>

      {ingestion.length > 0 ? (
        <Group title="Ingestion history">
          <ul className="space-y-1 text-[12.5px] text-[color:var(--charcoal-soft)]">
            {ingestion.map((entry) => (
              <li key={String(entry["id"])}>
                {String(entry["created_at"]).slice(0, 16).replace("T", " ")} · {String(entry["action"])}
                {entry["reason"] ? ` · ${String(entry["reason"])}` : ""}
              </li>
            ))}
          </ul>
        </Group>
      ) : null}
    </div>
  );
}

function QuickField({
  label,
  initial,
  disabled,
  onSave,
}: {
  label: string;
  initial: string;
  disabled?: boolean;
  onSave: (value: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const dirty = value.trim() !== initial.trim();
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">{label}</label>
      <div className="mt-1 flex gap-2">
        <Input value={value} onChange={(event) => setValue(event.target.value)} />
        <Button size="sm" variant="outline" disabled={disabled || !dirty} onClick={() => void onSave(value.trim())}>
          Save
        </Button>
      </div>
    </div>
  );
}
