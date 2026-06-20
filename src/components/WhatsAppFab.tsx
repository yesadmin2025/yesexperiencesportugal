import { MessageCircle } from "lucide-react";

const WA_NUMBER = "351911889992"; // +351 911 889 992

/** Build a wa.me deep link with a pre-filled message. */
// eslint-disable-next-line react-refresh/only-export-components
export function whatsappHref(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

const DEFAULT_TEXT = "Olá! Estou a montar a minha experiência e gostaria de uma sugestão.";

export function WhatsAppFab() {
  // Hidden on mobile: the MobileStickyCTA bar already exposes the
  // "Talk to a Local" affordance and the round FAB used to overlap its
  // right-side "Say YES" button at 393–430px. Per memory: WhatsApp is
  // optional support, never primary CTA — so the FAB returns from `lg`
  // up where the sticky bar is hidden (the bar itself is `lg:hidden`).
  return (
    <a
      href={whatsappHref(DEFAULT_TEXT)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="A local is one message away — chat on WhatsApp"
      className="hidden lg:flex fixed bottom-5 right-5 z-50 h-14 w-14 items-center justify-center rounded-full bg-[color:var(--teal)] text-[color:var(--ivory)] shadow-[0_8px_28px_-8px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--gold)]"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
      <span className="sr-only">A local is one message away</span>
    </a>
  );
}
