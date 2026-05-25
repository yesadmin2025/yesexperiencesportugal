import { MessageCircle } from "lucide-react";
import { whatsappHref } from "@/components/WhatsAppFab";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import { INTENT_OPTIONS } from "@/lib/studio-v2/content";

/**
 * Persistent WhatsApp affordance for the Studio v2 journey.
 *
 * Visible on every beat (including mobile) so the traveller can reach a
 * local at any moment without losing context. The message body reflects
 * current selections so the local arrives ready.
 */
export function PersistentChatFab({ profile }: { profile: TravelerProfile }) {
  const intentLabel = profile.intent
    ? INTENT_OPTIONS.find((o) => o.id === profile.intent)?.label.toLowerCase()
    : null;
  const total = profile.group
    ? profile.group.adults + profile.group.teens + profile.group.children
    : null;
  const parts = [
    "Olá! Estou a desenhar uma experiência no Studio",
    intentLabel ? `— ${intentLabel}` : null,
    total ? `para ${total} pessoa${total === 1 ? "" : "s"}` : null,
    "— gostaria de ajuda de um local.",
  ].filter(Boolean);
  const message = parts.join(" ");

  return (
    <a
      href={whatsappHref(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Talk to a local on WhatsApp"
      className="fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full px-4 py-3 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: "var(--teal)",
        color: "var(--ivory)",
        outlineColor: "var(--gold)",
      }}
    >
      <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
      <span
        className="text-[11px] uppercase tracking-[0.22em]"
        style={{ fontFamily: "var(--font-sans, Inter), sans-serif", fontWeight: 600 }}
      >
        Talk to a local
      </span>
    </a>
  );
}
