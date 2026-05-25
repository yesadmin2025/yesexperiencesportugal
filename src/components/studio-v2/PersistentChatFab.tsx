import { MessageCircle } from "lucide-react";
import { whatsappHref } from "@/components/WhatsAppFab";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import { INTENT_OPTIONS } from "@/lib/studio-v2/content";

/**
 * Persistent WhatsApp affordance for the Studio v2 journey.
 *
 * Discreet round bubble visible on every beat (including mobile) so the
 * traveller can reach a local at any moment without losing context.
 * Per brand: WhatsApp = optional support, never a primary CTA — so this
 * stays as a small round affordance, not a labelled pill that would
 * compete with the in-beat primary actions.
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
      aria-label="Refine with a local on WhatsApp"
      className="group fixed bottom-5 right-5 z-[60] grid h-12 w-12 place-items-center rounded-full transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: "color-mix(in oklab, var(--teal) 92%, transparent)",
        color: "var(--ivory)",
        boxShadow: "0 6px 22px -8px color-mix(in oklab, var(--charcoal) 50%, transparent)",
        outlineColor: "var(--gold)",
      }}
    >
      <MessageCircle className="h-5 w-5" strokeWidth={1.6} />
      <span
        aria-hidden
        className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-[2px] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: "var(--charcoal)",
          color: "var(--ivory)",
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 600,
        }}
      >
        A local, one tap away
      </span>
      <span className="sr-only">A local is one message away</span>
    </a>
  );
}
