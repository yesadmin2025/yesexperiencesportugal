/**
 * StudioBuilderChrome — restrained persistent overlay for Studio v2 quiz beats.
 *
 * Per Studio philosophy v6 the interface progressively disappears. This
 * chrome therefore appears ONLY on capture beats (feeling, who-rhythm,
 * mood-*) and stays out of the cinematic prologue/opening, the silent
 * "thinking" beat and the final Reveal. It also disappears entirely on
 * `prefers-reduced-motion: reduce` if the user has dismissed it.
 *
 * Layout (mobile-first, 393px first):
 *   - Top-left under the chapter rule: tiny host chip (avatar + WhatsApp)
 *   - Bottom safe-area (above the scene's own dock): thin progress hair
 *     + "from €X / guest" + optional "Email me this draft" pill
 */

import { useState } from "react";
import { MessageCircle, Mail, Copy, Check, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { whatsappHref } from "@/components/WhatsAppFab";
import { emailStudioDraft } from "@/lib/studio-v2/draft.functions";

interface Props {
  step: number; // 0-based index in the cinematic sequence
  total: number;
  /** Live from-price per guest. */
  pricePerGuestFrom: number;
  /** Show "Email me this draft" pill (step ≥ 2 by spec). */
  canEmailDraft: boolean;
  /** Serialisable snapshot of the current draft for the email-me flow. */
  draftSnapshot: Record<string, unknown>;
}

/** 20% floor on step 1, 100% on last step. */
function progressPct(step: number, total: number): number {
  const safeTotal = Math.max(2, total);
  const idx = Math.max(0, Math.min(safeTotal - 1, step));
  const t = idx / (safeTotal - 1);
  return Math.round((0.2 + 0.8 * t) * 100);
}

const HOST_WA_MSG =
  "Olá Tiago! Estou a desenhar o meu dia no YES Studio e gostava da tua ajuda.";

export function StudioBuilderChrome({
  step,
  total,
  pricePerGuestFrom,
  canEmailDraft,
  draftSnapshot,
}: Props) {
  const pct = progressPct(step, total);
  const [emailOpen, setEmailOpen] = useState(false);

  return (
    <>
      {/* Host chip — top-left, sits under the chapter eyebrow. Restrained,
          gold rule + tiny avatar + WhatsApp icon. Pointer-events-auto only
          on the interactive child so the rest of the scene stays tappable. */}
      <aside
        aria-label="Your host in Portugal"
        className="pointer-events-none absolute left-4 top-4 z-30 sm:left-6 sm:top-6"
      >
        <div
          className="pointer-events-auto flex items-center gap-2 rounded-full px-2 py-1.5"
          style={{
            background: "color-mix(in oklab, var(--ivory) 80%, transparent)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid color-mix(in oklab, var(--gold) 35%, transparent)",
          }}
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold"
            style={{
              background: "var(--teal)",
              color: "var(--ivory)",
              fontFamily: "var(--font-display, Montserrat), sans-serif",
            }}
          >
            T
          </span>
          <span className="hidden sm:inline-flex flex-col leading-tight">
            <span
              className="text-[9.5px] uppercase tracking-[0.28em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
            >
              Your host
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--charcoal)", fontWeight: 600 }}
            >
              Tiago · Sesimbra
            </span>
          </span>
          <a
            href={whatsappHref(HOST_WA_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with your host on WhatsApp"
            className="ml-1 grid h-8 w-8 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ background: "var(--teal)", color: "var(--ivory)" }}
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.9} />
          </a>
        </div>
      </aside>

      {/* Bottom strip — sits above the scene's own dock; gold hair progress
          + "from €X / guest" + optional Email-me pill. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        <div
          aria-hidden
          className="h-[2px] w-full"
          style={{
            background:
              "color-mix(in oklab, var(--charcoal) 18%, transparent)",
          }}
        >
          <div
            role="progressbar"
            aria-label="Journey progress"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--gold) 65%, transparent), var(--gold))",
              boxShadow:
                "0 0 8px color-mix(in oklab, var(--gold) 45%, transparent)",
            }}
          />
        </div>

        <div className="pointer-events-auto mx-auto flex w-full max-w-[42rem] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <span
            className="inline-flex items-baseline gap-1.5"
            style={{
              background: "color-mix(in oklab, var(--ivory) 82%, transparent)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              padding: "6px 10px",
              borderRadius: 2,
              border: "1px solid color-mix(in oklab, var(--gold) 35%, transparent)",
            }}
          >
            <span
              className="text-[9.5px] uppercase tracking-[0.28em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
            >
              From
            </span>
            <span
              className="tabular-nums"
              style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                color: "var(--charcoal)",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              €{pricePerGuestFrom}
            </span>
            <span
              className="text-[10px]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              / guest
            </span>
          </span>

          {canEmailDraft && (
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[2px] px-3 text-[10.5px] uppercase tracking-[0.28em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
              style={{
                background: "color-mix(in oklab, var(--ivory) 82%, transparent)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
                color: "var(--charcoal)",
                fontWeight: 600,
              }}
            >
              <Mail className="h-3.5 w-3.5" strokeWidth={1.9} />
              <span className="hidden sm:inline">Email me my draft</span>
              <span className="sm:hidden">Email draft</span>
            </button>
          )}
        </div>
      </div>

      {emailOpen && (
        <EmailDraftModal
          draft={draftSnapshot}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </>
  );
}

function EmailDraftModal({
  draft,
  onClose,
}: {
  draft: Record<string, unknown>;
  onClose: () => void;
}) {
  const sendFn = useServerFn(emailStudioDraft);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setErrorMsg(null);
    try {
      const res = await sendFn({
        data: { email, draftJson: JSON.stringify(draft) },
      });
      setResumeUrl(res.resumeUrl);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save draft");
      setState("error");
    }
  };

  const copy = async () => {
    if (!resumeUrl) return;
    try {
      await navigator.clipboard.writeText(resumeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* */ }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Email me my draft"
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[28rem] rounded-t-[8px] sm:rounded-[2px] p-6"
        style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.36em]"
              style={{ color: "color-mix(in oklab, var(--gold) 78%, var(--charcoal))", fontWeight: 700 }}
            >
              Keep your draft
            </p>
            <h3
              className="mt-2 text-[22px] leading-tight"
              style={{
                fontFamily: "var(--font-display, Montserrat), sans-serif",
                fontWeight: 700,
              }}
            >
              Email me{" "}
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
                my draft
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {state !== "done" ? (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span
                className="block text-[10px] uppercase tracking-[0.32em]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
              >
                Your email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border-b bg-transparent py-2 text-[16px] focus:outline-none"
                style={{ borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)" }}
                placeholder="you@example.com"
                autoFocus
              />
            </label>
            {state === "error" && errorMsg && (
              <p className="text-[12px]" style={{ color: "#b3261e" }}>{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={state === "sending"}
              className="inline-flex h-11 items-center justify-center w-full rounded-[2px] px-6 text-[11.5px] uppercase tracking-[0.32em] transition disabled:opacity-50"
              style={{ background: "var(--charcoal)", color: "var(--ivory)", fontWeight: 700 }}
            >
              {state === "sending" ? "Saving…" : "Save & email me"}
            </button>
            <p
              className="text-[11px]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              We'll send you a private link to pick up exactly where you left off.
            </p>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-[14px]" style={{ color: "var(--charcoal)" }}>
              Saved. We'll email <strong>{email}</strong> the resume link.
              You can also copy it now:
            </p>
            <div
              className="flex items-center gap-2 rounded-[2px] border p-2"
              style={{ borderColor: "color-mix(in oklab, var(--gold) 50%, transparent)" }}
            >
              <code
                className="flex-1 truncate text-[11px]"
                style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
              >
                {resumeUrl}
              </code>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy resume link"
                className="grid h-8 w-8 place-items-center rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <a
              href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
                "Your YES Studio draft",
              )}&body=${encodeURIComponent(
                `Pick up where you left off:\n\n${resumeUrl}\n\n— YES experiences Portugal`,
              )}`}
              className="inline-flex h-10 items-center justify-center w-full rounded-[2px] px-6 text-[11px] uppercase tracking-[0.32em]"
              style={{
                background: "transparent",
                color: "var(--charcoal)",
                border: "1px solid color-mix(in oklab, var(--charcoal) 30%, transparent)",
                fontWeight: 600,
              }}
            >
              Open in mail app
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
