/**
 * Guide brief panel — preview the operational summary of a reservation (or a
 * whole day) and send it to a guide by email or WhatsApp.
 *
 * The brief is built on the server and never contains prices or payment data.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuideBrief, listGuides, sendGuideBrief } from "@/lib/guides.functions";
import { whatsappLink } from "@/lib/guide-brief";
import { Button } from "@/components/ui/button";

type Guide = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
};

export function GuideBriefPanel({
  bookingId,
  date,
  tourId,
  label = "Guide brief",
}: {
  bookingId?: string;
  date?: string;
  tourId?: string;
  label?: string;
}) {
  const loadBrief = useServerFn(getGuideBrief);
  const loadGuides = useServerFn(listGuides);
  const send = useServerFn(sendGuideBrief);

  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<{ title: string; text: string; count: number } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guideId, setGuideId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selection = useCallback(
    () => (bookingId ? { bookingId } : { date: date as string, ...(tourId ? { tourId } : {}) }),
    [bookingId, date, tourId],
  );

  useEffect(() => {
    if (!open) return;
    let active = true;
    setError(null);
    loadBrief({ data: selection() })
      .then((res) => active && setBrief(res))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
    loadGuides({ data: {} })
      .then((res) => active && setGuides((res.guides ?? []) as Guide[]))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, loadBrief, loadGuides, selection]);

  const chooseGuide = (id: string) => {
    setGuideId(id);
    const guide = guides.find((g) => g.id === id);
    if (guide) {
      setEmail(guide.email ?? "");
      setPhone(guide.phone ?? "");
    }
  };

  const guideName = guides.find((g) => g.id === guideId)?.name;

  return (
    <div className="mt-3">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="min-h-11">
        {open ? "Close brief" : label}
      </Button>

      {open ? (
        <div className="mt-3 border border-[color:var(--sand)] bg-[color:var(--ivory)] p-3">
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {brief ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                No prices are included
              </p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap border border-[color:var(--sand)] bg-white p-3 text-[13px] leading-relaxed text-[color:var(--charcoal)]">
                {brief.text}
              </pre>

              <label className="mt-3 block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                Guide
                <select
                  value={guideId}
                  onChange={(e) => chooseGuide(e.target.value)}
                  className="mt-1 min-h-11 w-full border border-[color:var(--sand)] bg-white px-3 text-base normal-case tracking-normal md:text-sm"
                >
                  <option value="">One-off contact…</option>
                  {guides
                    .filter((g) => g.active)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  Guide email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guide@example.com"
                    className="mt-1 min-h-11 w-full border border-[color:var(--sand)] bg-white px-3 text-base normal-case tracking-normal md:text-sm"
                  />
                </label>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                  Guide WhatsApp
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351 900 000 000"
                    className="mt-1 min-h-11 w-full border border-[color:var(--sand)] bg-white px-3 text-base normal-case tracking-normal md:text-sm"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="min-h-11"
                  disabled={busy || !email.trim()}
                  onClick={async () => {
                    setBusy(true);
                    setStatus(null);
                    setError(null);
                    try {
                      const res = await send({
                        data: {
                          ...selection(),
                          email: email.trim(),
                          ...(guideId ? { guideId } : {}),
                          ...(guideName ? { guideName } : {}),
                        },
                      });
                      setStatus(`Sent to ${email.trim()} (${res.count} trip(s)).`);
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : "The email could not be sent.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Sending…" : "Send by email"}
                </Button>

                <a
                  href={phone.trim() ? whatsappLink(phone, brief.text) : undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!phone.trim()}
                  className={`inline-flex min-h-11 items-center border border-[color:var(--charcoal)] px-4 text-sm text-[color:var(--charcoal)] ${
                    phone.trim() ? "" : "pointer-events-none opacity-50"
                  }`}
                >
                  Send by WhatsApp
                </a>

                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(brief.text);
                      setStatus("Brief copied.");
                    } catch {
                      setStatus("Copy failed — select the text above.");
                    }
                  }}
                >
                  Copy brief
                </Button>
              </div>

              {status ? (
                <p className="mt-2 text-sm text-[color:var(--teal)]">{status}</p>
              ) : null}
            </>
          ) : (
            !error && <p className="text-sm text-[color:var(--charcoal-soft)]">Loading brief…</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
