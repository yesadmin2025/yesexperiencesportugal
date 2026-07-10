import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { CtaButton } from "@/components/ui/CtaButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useT } from "@/i18n/locale-context";
import { buildLocaleUrl } from "@/i18n/config";

/**
 * Portuguese landing (`/pt`). Phase 3a delivers chrome-only Portuguese
 * (nav / footer / cookies / 404 / CTAs) — full body copy for each page
 * lands in subsequent human-authored translation passes.
 */
export const Route = createFileRoute("/pt/")({
  head: () => ({
    meta: [
      { title: "YES Experiences Portugal — Experiências privadas em Portugal" },
      {
        name: "description",
        content:
          "YES Experiences Portugal — experiências privadas, editoriais e locais em Portugal. Versão portuguesa em lançamento.",
      },
      { property: "og:title", content: "YES Experiences Portugal" },
      {
        property: "og:description",
        content: "Experiências privadas em Portugal, com guias locais.",
      },
      { property: "og:locale", content: "pt_PT" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt" },
      { rel: "alternate", hrefLang: "en", href: buildLocaleUrl("/", "en") },
      { rel: "alternate", hrefLang: "pt-PT", href: buildLocaleUrl("/", "pt") },
      { rel: "alternate", hrefLang: "x-default", href: buildLocaleUrl("/", "en") },
    ],
  }),
  component: PtLandingPage,
});

function PtLandingPage() {
  const t = useT();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-6 py-24 md:py-32 text-center">
        <Eyebrow>{t("pt_landing.eyebrow")}</Eyebrow>
        <h1 className="mt-6 font-[family-name:var(--font-editorial)] text-4xl md:text-5xl leading-[1.05] text-[color:var(--charcoal)]">
          {t("pt_landing.title")}
        </h1>
        <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          {t("pt_landing.body")}
        </p>
        <div className="mt-10 flex justify-center">
          <CtaButton to="/">{t("pt_landing.cta")}</CtaButton>
        </div>
      </section>
    </SiteLayout>
  );
}
