import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe — YES experiences Portugal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("token");
    if (!t) {
      setState({ kind: "invalid" });
      return;
    }
    setToken(t);
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) return setState({ kind: "invalid" });
        if (body.valid) return setState({ kind: "valid" });
        if (body.reason === "already_unsubscribed") return setState({ kind: "already" });
        setState({ kind: "invalid" });
      })
      .catch(() => setState({ kind: "invalid" }));
  }, []);

  async function confirm() {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.success) return setState({ kind: "done" });
      if (body.reason === "already_unsubscribed") return setState({ kind: "already" });
      setState({ kind: "error", message: "Could not process unsubscribe. Please try again." });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <SiteLayout>
      <section className="pt-32 pb-24 bg-[color:var(--sand)] min-h-[70vh]">
        <div className="container-x max-w-xl text-center">
          <Eyebrow flank>Email preferences</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Unsubscribe
          </SectionTitle>

          <div className="mt-10 border-l-4 border-[color:var(--gold)] bg-white p-8 text-left">
            {state.kind === "loading" && (
              <p className="text-[color:var(--charcoal-soft)]">Checking your link…</p>
            )}

            {state.kind === "valid" && (
              <>
                <p className="text-[color:var(--charcoal)]">
                  Confirm you want to stop receiving emails from YES Experiences Portugal.
                  You'll still receive essential transactional messages tied to any active
                  booking.
                </p>
                <button
                  onClick={confirm}
                  className="mt-6 inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] transition-colors"
                >
                  Confirm unsubscribe
                </button>
              </>
            )}

            {state.kind === "submitting" && (
              <p className="text-[color:var(--charcoal-soft)]">Processing…</p>
            )}

            {state.kind === "done" && (
              <>
                <p className="serif text-2xl text-[color:var(--teal)]">
                  You've been unsubscribed.
                </p>
                <p className="mt-3 text-[color:var(--charcoal-soft)]">
                  Change your mind? Just email{" "}
                  <a href="mailto:info@yesexperiencesportugal.com" className="underline">
                    info@yesexperiencesportugal.com
                  </a>{" "}
                  and we'll add you back.
                </p>
              </>
            )}

            {state.kind === "already" && (
              <p className="text-[color:var(--charcoal)]">
                This address is already unsubscribed. No further action needed.
              </p>
            )}

            {state.kind === "invalid" && (
              <p className="text-[color:var(--charcoal)]">
                This unsubscribe link is invalid or has expired. If you continue receiving
                emails, please contact{" "}
                <a href="mailto:info@yesexperiencesportugal.com" className="underline">
                  info@yesexperiencesportugal.com
                </a>
                .
              </p>
            )}

            {state.kind === "error" && (
              <p className="text-red-700">{state.message}</p>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
