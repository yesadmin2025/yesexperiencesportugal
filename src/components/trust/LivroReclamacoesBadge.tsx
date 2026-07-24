import logoAsset from "@/assets/logo-livro-reclamacoes-mark.png.asset.json";

/**
 * Livro de Reclamações Eletrónico badge.
 *
 * Legally required in Portugal for consumer-facing businesses (DL 74/2017):
 * every public page must expose the official complaints-book logo linking to
 * the government portal at https://www.livroreclamacoes.pt/. Rendered inside
 * the shared <Footer /> so it appears on every SiteLayout route.
 *
 * Uses the "preto positivo" variant (mark on transparent background) and
 * recolors it to pure white via CSS (`brightness(0) invert(1)`) so it sits
 * quietly on the charcoal footer as a legal signature — no colored block.
 */
export function LivroReclamacoesBadge() {
  return (
    <a
      href="https://www.livroreclamacoes.pt/"
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label="Livro de Reclamações — abrir portal oficial (novo separador)"
      className="tap inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)] opacity-70 hover:opacity-100 transition-opacity duration-[var(--dur-quick)]"
    >
      <img
        src={logoAsset.url}
        alt="Livro de Reclamações"
        width={140}
        height={58}
        loading="lazy"
        decoding="async"
        className="block h-[26px] w-auto select-none"
        style={{ filter: "brightness(0) invert(1)" }}
      />
    </a>
  );
}
