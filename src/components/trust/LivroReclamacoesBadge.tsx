import { useEffect, useRef } from "react";
import logoAsset from "@/assets/logo-livro-reclamacoes-mark.png.asset.json";
import { assertContrast } from "@/lib/a11y/contrast-check";

/**
 * Livro de Reclamações Eletrónico badge.
 *
 * Legally required in Portugal for consumer-facing businesses (DL 74/2017):
 * every public page must expose the official complaints-book logo linking to
 * the government portal at https://www.livroreclamacoes.pt/. Rendered inside
 * the shared <Footer /> so it appears on every SiteLayout route.
 *
 * Rendering: uses the "preto positivo" variant (mark on transparent
 * background) recolored to pure white via CSS filter, with a soft
 * drop-shadow for edge crispness. A dev-only WCAG contrast check runs on
 * mount to catch footer/theme regressions where the effective background
 * changes and the mark stops meeting AA (≥3:1 for non-text graphics; we
 * assert AAA ≥4.5:1 as a safety margin).
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
      className="tap inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)] opacity-85 hover:opacity-100 transition-opacity duration-[var(--dur-quick)]"
    >
      <img
        ref={imgRef}
        src={logoAsset.url}
        alt="Livro de Reclamações"
        width={140}
        height={58}
        loading="lazy"
        decoding="async"
        className="block h-[36px] sm:h-[42px] w-auto select-none"
        style={{
          filter:
            "brightness(0) invert(1) drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
        }}
      />
    </a>
  );
}
