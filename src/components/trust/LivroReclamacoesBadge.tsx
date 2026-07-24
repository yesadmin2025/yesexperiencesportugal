import logoAsset from "@/assets/logo-livro-reclamacoes.png.asset.json";

/**
 * Livro de Reclamações Eletrónico badge.
 *
 * Legally required in Portugal for consumer-facing businesses (DL 74/2017):
 * every public page must expose the official complaints-book logo linking to
 * the government portal at https://www.livroreclamacoes.pt/. Rendered inside
 * the shared <Footer /> so it appears on every SiteLayout route.
 *
 * Uses the "azul negativo" variant (white text on institutional blue) — the
 * only version legible on the charcoal footer surface.
 */
export function LivroReclamacoesBadge() {
  return (
    <a
      href="https://www.livroreclamacoes.pt/"
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label="Livro de Reclamações — abrir portal oficial (novo separador)"
      className="tap inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)] hover:opacity-90 transition-opacity duration-[var(--dur-quick)]"
    >
      <img
        src={logoAsset.url}
        alt="Livro de Reclamações"
        width={140}
        height={58}
        loading="lazy"
        decoding="async"
        className="block h-[34px] w-auto select-none"
      />
    </a>
  );
}
