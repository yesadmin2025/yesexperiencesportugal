/**
 * Needs Review inbox — email-derived candidates the parser would not confirm.
 *
 * Nothing here is created automatically: each candidate shows what was
 * detected, what is missing and why, and the operator approves, matches,
 * edits-then-approves, or ignores it.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listOpsReviewCandidates, resolveOpsReviewCandidate } from "@/lib/bookingsOps.functions";
import { ChannelBadge } from "./badges";

type Candidate = {
  id: string;
  created_at: string;
  received_at: string | null;
  source: string;
  source_channel: string | null;
  subject: string | null;
  source_email_url: string | null;
  detected: Record<string, unknown> | null;
  missing_fields: unknown;
  confidence: number | null;
  reason: string | null;
  status: string;
};

const str = (value: unknown): string => (typeof value === "string" && value.trim() ? value.trim() : "");

export function OpsReviewInbox({ onChanged }: { onChanged?: () => void }) {
  const load = useServerFn(listOpsReviewCandidates);
  const resolve = useServerFn(resolveOpsReviewCandidate);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { email: string; date: string; tour: string; pax: string; pickup: string }>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await load({ data: { status: "pending" } });
      setCandidates((result.candidates ?? []) as Candidate[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (candidate: Candidate, action: "approve" | "ignore" | "match", bookingId?: string) => {
    setBusyId(candidate.id);
    try {
      const edit = edits[candidate.id];
      await resolve({
        data: {
          id: candidate.id,
          action,
          ...(bookingId ? { bookingId } : {}),
          ...(action === "approve" && edit
            ? {
                edits: {
                  ...(edit.email ? { customerEmail: edit.email } : {}),
                  ...(edit.date ? { date: edit.date } : {}),
                  ...(edit.tour ? { tourTitle: edit.tour } : {}),
                  ...(edit.pax ? { pax: Number(edit.pax) } : {}),
                  ...(edit.pickup ? { pickup: edit.pickup } : {}),
                },
              }
            : {}),
        },
      });
      toast.success(action === "approve" ? "Booking created." : action === "ignore" ? "Ignored." : "Matched.");
      await refresh();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve this candidate.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="p-4 text-sm text-[color:var(--charcoal-soft)]">Loading review queue…</p>;
  if (candidates.length === 0) {
    return (
      <p className="rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-4 text-sm text-[color:var(--charcoal-soft)]">
        Nothing waiting for review. Every email read so far was either clear enough to record, or clearly not a booking.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {candidates.map((candidate) => {
        const detected = candidate.detected ?? {};
        const missing = Array.isArray(candidate.missing_fields) ? (candidate.missing_fields as string[]) : [];
        const edit = edits[candidate.id] ?? { email: "", date: "", tour: "", pax: "", pickup: "" };
        return (
          <article key={candidate.id} className="rounded-lg border border-[color:var(--charcoal)]/12 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ChannelBadge channel={candidate.source_channel} source={candidate.source} />
              <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--charcoal-soft)]">
                confidence {candidate.confidence ?? "—"}
              </span>
              {candidate.source_email_url ? (
                <a className="text-[12px] underline" href={candidate.source_email_url} target="_blank" rel="noreferrer">
                  Open email
                </a>
              ) : null}
            </div>
            <h3 className="mt-2 text-[14.5px] font-medium text-[color:var(--charcoal)]">{candidate.subject ?? "(no subject)"}</h3>
            <dl className="mt-2 grid gap-1 text-[13px] sm:grid-cols-2">
              <div>Client: {str(detected["customerName"]) || "—"}</div>
              <div>Email: {str(detected["customerEmail"]) || "—"}</div>
              <div>Date: {str(detected["date"]) || "—"}</div>
              <div>Tour: {str(detected["tourTitle"]) || "—"}</div>
              <div>Guests: {typeof detected["pax"] === "number" ? String(detected["pax"]) : "—"}</div>
              <div>Pick-up: {str(detected["pickup"]) || "—"}</div>
            </dl>
            <p className="mt-2 text-[12.5px] text-[#9B2C2C]">
              {candidate.reason ?? "Needs a human check."}
              {missing.length > 0 ? ` · missing: ${missing.join(", ")}` : ""}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Input
                placeholder="Email"
                value={edit.email}
                onChange={(event) => setEdits((prev) => ({ ...prev, [candidate.id]: { ...edit, email: event.target.value } }))}
              />
              <Input
                placeholder="Date YYYY-MM-DD"
                value={edit.date}
                onChange={(event) => setEdits((prev) => ({ ...prev, [candidate.id]: { ...edit, date: event.target.value } }))}
              />
              <Input
                placeholder="Tour"
                value={edit.tour}
                onChange={(event) => setEdits((prev) => ({ ...prev, [candidate.id]: { ...edit, tour: event.target.value } }))}
              />
              <Input
                placeholder="Guests"
                value={edit.pax}
                onChange={(event) => setEdits((prev) => ({ ...prev, [candidate.id]: { ...edit, pax: event.target.value } }))}
              />
              <Input
                placeholder="Pick-up"
                value={edit.pickup}
                onChange={(event) => setEdits((prev) => ({ ...prev, [candidate.id]: { ...edit, pickup: event.target.value } }))}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={busyId === candidate.id} onClick={() => void act(candidate, "approve")}>
                Approve & create
              </Button>
              <MatchAction disabled={busyId === candidate.id} onMatch={(bookingId) => void act(candidate, "match", bookingId)} />
              <Button size="sm" variant="ghost" disabled={busyId === candidate.id} onClick={() => void act(candidate, "ignore")}>
                Ignore
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MatchAction({ disabled, onMatch }: { disabled?: boolean; onMatch: (bookingId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  if (!open) {
    return (
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        Match existing
      </Button>
    );
  }
  return (
    <span className="flex gap-2">
      <Input placeholder="Booking id" value={value} onChange={(event) => setValue(event.target.value)} />
      <Button size="sm" variant="outline" disabled={disabled || value.trim().length < 30} onClick={() => onMatch(value.trim())}>
        Link
      </Button>
    </span>
  );
}
