import { useEffect, useRef } from "react";
import logoAsset from "@/assets/logo-livro-reclamacoes-lockup.png.asset.json";
import { assertContrast } from "@/lib/a11y/contrast-check";

/**
 * Livro de Reclamações Eletrónico badge.
 *
 * Legally required in Portugal for consumer-facing businesses (DL 74/2017):
 * every public page must expose the official complaints-book logo linking to
 * the government portal at https://www.livroreclamacoes.pt/.
 *
 * Rendering: horizontal wordmark lockup, pre-rendered as pure white glyphs on
 * transparency (no CSS invert — the previous square mark had a white disc
 * behind "LIVRO" that turned black when inverted and swallowed the word). A
 * soft drop-shadow keeps the edges crisp on the charcoal footer. A dev-only
 * WCAG contrast check runs on mount to catch footer/theme regressions.
 */
export function LivroReclamacoesBadge() {
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    assertContrast(imgRef.current, {
      foreground: "#FFFFFF",
      level: "AAA",
      size: "graphic",
      label: "LivroReclamacoesBadge",
    });
  }, []);

  return (
    <a
      href="https://www.livroreclamacoes.pt/"
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label="Livro de Reclamações — abrir portal oficial (novo separador)"
      className="tap mx-auto inline-flex min-h-[44px] max-w-full shrink-0 items-center justify-center rounded-sm transition-opacity duration-[var(--dur-quick)] hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
    >
      <img
        ref={imgRef}
        src={logoAsset.url}
        alt="Livro de Reclamações"
        width={737}
        height={294}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          // Never let a failed asset expand into a large empty alt-text box;
          // the link stays reachable through its aria-label.
          e.currentTarget.style.display = "none";
        }}
        className="mx-auto block h-[52px] w-[130px] max-w-full select-none object-contain sm:h-[60px] sm:w-[150px]"
      />

    </a>
  );
}
