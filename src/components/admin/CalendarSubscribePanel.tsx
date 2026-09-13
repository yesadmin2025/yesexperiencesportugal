/**
 * Admin-only panel: subscribe your own calendar app to paid reservations.
 * Reveals the private feed URL on request; never renders it by default.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBookingCalendarFeedUrl } from "@/lib/bookingCalendarFeed.functions";

export function CalendarSubscribePanel() {
  const fetchUrl = useServerFn(getBookingCalendarFeedUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const reveal = async () => {
    setState("loading");
    try {
      const result = (await fetchUrl({ data: {} })) as { url: string | null };
      setUrl(result.url);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-[color:var(--sand)] bg-white p-4">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
        Sync to your calendar
      </h2>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">
        Add this private link to Google or Apple Calendar and every paid reservation appears with its
        date, start time and party size. Keep the link private — anyone with it can read the feed.
      </p>

      {url ? (
        <div className="mt-3">
          <code className="block break-all rounded-md bg-[color:var(--ivory)] p-3 text-[12px] text-[color:var(--charcoal)]">
            {url}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(url);
              setCopied(true);
            }}
            className="mt-3 min-h-11 rounded-full border border-[color:var(--charcoal)] px-5 text-[11px] uppercase tracking-[0.18em]"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void reveal()}
          disabled={state === "loading"}
          className="mt-3 min-h-11 rounded-full border border-[color:var(--charcoal)] px-5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-60"
        >
          {state === "loading" ? "Loading…" : "Show calendar link"}
        </button>
      )}

      {state === "error" ? (
        <p className="mt-3 text-sm text-red-700">
          Could not load the calendar link. Sign in again as an admin and retry.
        </p>
      ) : null}
      {url === null && state === "idle" && copied ? null : null}
    </section>
  );
}
