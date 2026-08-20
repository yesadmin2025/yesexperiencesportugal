import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CANCELLATION } from "@/config/business-nap";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import founderAsset from "@/assets/about-founder-wine-experience.jpg.asset.json";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";

import {
  BASED_IN_SHORT,
  EMAIL,
  EMAIL_HREF,
  LICENSE_LABEL_PT,
  PHONE_DISPLAY,
  whatsappUrl,
} from "@/config/business-nap";

const TITLE = "Sobre a YES Experiences Portugal | Viagens por quem cá vive";
const DESCRIPTION =
  "Operador turístico privado, fundado em Sesimbra em 2022. Licenciado RNAAT nº 31/2023, a desenhar viagens privadas por Portugal.";

export const Route = createFileRoute("/pt/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/about" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${founderAsset.url}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "YES Experiences Portugal — viagens privadas com quem cá vive",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${founderAsset.url}` },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_PT" },
      { property: "og:locale:alternate", content: "en_US" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/about" },
      ...localeAlternateLinks("/about"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Início", path: "/pt" },
          { name: "Sobre", path: "/pt/about" },
        ]),
      ),
    ],
  }),
  component: Page,
});

function Page() {
  useMarketingMotion();
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="reveal pt-32 pb-14 bg-[color:var(--sand)] text-center">
        <div className="container-x">
          <ParallaxLayer amount="sm">
            <Eyebrow flank>Sobre a YES</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Desenhamos <SectionTitle.Em>Portugal com sentido</SectionTitle.Em>.
            </SectionTitle>
            <p className="mt-6 max-w-2xl mx-auto text-[color:var(--charcoal-soft)] leading-relaxed">
              A YES Experiences Portugal é um operador turístico privado e licenciado, fundado em
              2022 em torno de uma ideia simples: Portugal deve ser pessoal, local e genuinamente
              seu.
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-sm text-[color:var(--charcoal-soft)]/85 leading-relaxed">
              Dias privados, experiências desenhadas ao vivo e jornadas completas — criadas a partir
              de rotas reais, hóspedes reais e conhecimento local verdadeiro.
            </p>
          </ParallaxLayer>
        </div>
      </section>

      {/* Created from real travel */}
      <section className="reveal py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Nascido da estrada</Eyebrow>
          <SectionTitle as="h2" size="default">
            Construído na estrada, <SectionTitle.Em>não a partir de um modelo</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              A YES não começou como uma ideia de agência, um conceito de marketplace ou uma
              tendência de travel-tech.
            </p>
            <p>
              Começou na estrada, a guiar hóspedes por Portugal e a ver a mesma necessidade a
              repetir-se: os viajantes queriam mais do que outro tour fixo. Queriam liberdade, mas
              sem confusão. Queriam desenhar o dia à sua medida, e ao mesmo tempo sentir-se guiados
              por alguém local.
            </p>
            <p>Queriam perceber a rota, o ritmo e o preço antes de se comprometer.</p>
            <p>Foi daí que nasceu o Experience Studio.</p>
          </div>
        </div>
      </section>

      {/* Founder-built */}
      <section className="reveal py-20 bg-[color:var(--sand)]">
        <div className="container-x grid lg:grid-cols-[1.15fr_1fr] gap-14 items-start">
          <div>
            <Eyebrow>Feito pela fundadora</Eyebrow>
            <SectionTitle as="h2" size="default">
              Construído por quem <SectionTitle.Em>viu o problema</SectionTitle.Em>.
            </SectionTitle>
            <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              <p>O Experience Studio não nasceu porque "viagens à medida" soava bem num website.</p>
              <p>
                Nasceu porque, ao fim de anos a desenhar e a guiar hóspedes privados por Portugal, a
                mesma necessidade tornou-se impossível de ignorar: as pessoas queriam escolher,
                comparar, moldar e reservar um dia privado sem formulários intermináveis, sem
                esperas, sem correios eletrónicos a saltar de lado para lado.
              </p>
              <p>A ideia era específica demais para ser entregue a uma agência padrão.</p>
            </div>

            <figure className="mt-10 lg:hidden">
              <img
                src={founderAsset.url}
                alt="Nídia Almeida a receber hóspedes numa experiência privada de vinho da YES Experiences Portugal."
                loading="lazy"
                decoding="async"
                className="w-full aspect-[4/3] object-cover"
              />
              <figcaption className="mt-3 text-xs text-[color:var(--charcoal-soft)]/80 leading-relaxed italic">
                Nídia Almeida, fundadora da YES Experiences Portugal, a receber hóspedes numa
                experiência privada de vinho.
              </figcaption>
            </figure>

            <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              <p>
                Para o tornar real, a fundadora aprendeu a traduzir a experiência de viagem em
                estrutura de produto, lógica de reserva e fluxo digital — como um hóspede escolhe,
                como uma rota se ajusta, como se calcula o preço de um dia privado, e como tudo isto
                podia tornar-se um sistema vivo de desenho de experiências.
              </p>
              <p>
                O website, o fluxo do Studio e o modelo de reserva foram pensados, estruturados,
                escritos e construídos internamente, moldados a partir de conversas reais,
                alterações de itinerário, hesitações de hóspedes e limitações operacionais.
              </p>
              <p>
                É por isso que a YES não é apenas um catálogo de tours. É uma plataforma privada de
                viagens, criada na estrada e ainda hoje refinada em cada reserva.
              </p>
            </div>
          </div>

          <figure className="hidden lg:block lg:sticky lg:top-28">
            <img
              src={founderAsset.url}
              alt="Nídia Almeida a receber hóspedes numa experiência privada de vinho da YES Experiences Portugal."
              loading="lazy"
              decoding="async"
              className="w-full aspect-[4/3] object-cover"
            />
            <figcaption className="mt-3 text-xs text-[color:var(--charcoal-soft)]/80 leading-relaxed italic">
              Nídia Almeida, fundadora da YES Experiences Portugal, a receber hóspedes numa
              experiência privada de vinho em Portugal.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Founder-led */}
      <section className="reveal py-20">
        <div className="container-x max-w-3xl">
          <Eyebrow>Liderado pela fundadora</Eyebrow>
          <SectionTitle as="h2" size="default">
            Desenhado com cuidado.{" "}
            <SectionTitle.Em>Entregue por locais de confiança</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-8 space-y-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              A YES foi criada por Nídia Almeida, anfitriã portuguesa e designer de experiências,
              após anos a desenhar e a conduzir experiências privadas por Portugal.
            </p>
            <p>
              Cada dia Signature, cada composição no Studio e cada jornada do Travel Designer começa
              com conhecimento local, rotas reais e detalhes escolhidos com atenção. As experiências
              são depois entregues por um círculo de confiança de guias locais, motoristas,
              produtores de vinho, embarcações, restaurantes, anfitriões e parceiros em todo o país.
            </p>
            <p>
              De Lisboa, Sintra e Arrábida ao Alentejo, Douro, Algarve e costa atlântica, o
              princípio mantém-se: Portugal privado, desenhado com intenção e entregue por quem
              conhece os lugares que mostra.
            </p>
            <p>
              Não é revenda anónima. Não é o autocarro de outro operador com um logótipo diferente.
            </p>
          </div>
        </div>
      </section>

      {/* What we create */}
      <section className="reveal py-20 bg-[color:var(--sand)]">
        <div className="container-x">
          <Eyebrow flank>O que criamos</Eyebrow>
          <SectionTitle as="h2" size="default">
            Dias privados, experiências desenhadas ao vivo{" "}
            <SectionTitle.Em>e jornadas completas</SectionTitle.Em>.
          </SectionTitle>
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Signature Experiences
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Dias privados prontos a partir, feitos a partir de rotas reais, parceiros de
                confiança e feedback de hóspedes.
              </p>
            </div>
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Experience Studio
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Desenhe um dia privado em tempo real: escolha o ritmo e a rota, veja o preço a
                atualizar-se e reserve em segurança.
              </p>
            </div>
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Travel Designer
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Jornadas completas por Portugal, roteiros de vários dias, luas-de-mel, viagens em
                família, celebrações e viagens privadas mais complexas.
              </p>
            </div>
            <div className="bg-[color:var(--ivory)] p-6 sm:p-8">
              <h3 className="font-display text-lg font-medium text-[color:var(--charcoal)]">
                Momentos e Corporate
              </h3>
              <p className="mt-2 text-[color:var(--charcoal-soft)] leading-relaxed">
                Pedidos de casamento, aniversários, celebrações, incentivos, hospitalidade de
                clientes e dias privados para grupos.
              </p>
            </div>
          </div>
          <p className="mt-10 text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl">
            Formatos diferentes. Mesmo princípio: Portugal deve ser desenhado à volta das pessoas
            que o vivem.
          </p>
        </div>
      </section>

      {/* Credentials & trust */}
      <section className="reveal py-16">
        <div className="container-x">
          <Eyebrow flank>Credenciais e confiança</Eyebrow>
          <SectionTitle as="h2" size="default">
            Licenciados, segurados <SectionTitle.Em>e pessoalmente responsáveis</SectionTitle.Em>.
          </SectionTitle>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Licença
              </div>
              <p className="mt-2 font-display text-lg">{LICENSE_LABEL_PT}</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Operador turístico registado no Registo Nacional dos Agentes de Animação Turística.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Fundação
              </div>
              <p className="mt-2 font-display text-lg">2022</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Sediados em Sesimbra, a desenhar viagens privadas por Portugal.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Avaliações
              </div>
              <p className="mt-2 font-display text-lg">Mais de 700 cinco-estrelas</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Avaliações verificadas de hóspedes em Tripadvisor, Viator, Google, GetYourGuide e
                outras plataformas de viagens.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
                Seguros
              </div>
              <p className="mt-2 font-display text-lg">Responsabilidade civil</p>
              <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">
                Viaturas, hóspedes e operações cobertos ao abrigo da lei portuguesa do turismo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How we work + policies */}
      <section className="reveal py-20 bg-[color:var(--sand)]">
        <div className="container-x grid lg:grid-cols-2 gap-14">
          <div>
            <Eyebrow>Como trabalhamos</Eyebrow>
            <h2 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Privado, local e responsável do princípio ao fim.
            </h2>
            <ul className="mt-6 space-y-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              <li>
                <strong className="text-[color:var(--charcoal)]">Só privado.</strong> Sem autocarros
                partilhados, sem estranhos no carro.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Desenhado para si.</strong> Escolha
                uma Signature, desenhe um dia no Studio em tempo real, ou deixe um Travel Designer
                compor a jornada completa.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Reserva imediata.</strong> A
                maioria dos dias Signature e composições do Studio confirmam-se em minutos, por
                pagamento seguro.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Recolha no hotel incluída.</strong>{" "}
                Disponível a partir de Lisboa, Cascais, Estoril, Sintra, Sesimbra, Setúbal e outros
                locais consoante a experiência.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Respostas locais, rápidas.</strong>{" "}
                Respondemos por WhatsApp e email, habitualmente dentro de uma hora, quando a equipa
                está disponível.
              </li>
            </ul>
          </div>

          <div>
            <Eyebrow>Políticas, em resumo</Eyebrow>
            <h2 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Claras, justas, por escrito.
            </h2>
            <ul className="mt-6 space-y-4 text-[color:var(--charcoal-soft)] leading-relaxed">
              <li>
                <strong className="text-[color:var(--charcoal)]">Cancelamento (Signature)</strong> —{" "}
                {CANCELLATION.signature.pt}
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">
                  Cancelamento (Studio, Travel Designer, Corporate, Moments)
                </strong>{" "}
                — {CANCELLATION.custom.pt}
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Meteorologia</strong> — as paragens
                ao ar livre podem ser substituídas no próprio dia, sem custo, sempre que a segurança
                ou o conforto o exijam.
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Privacidade</strong> — nunca
                vendemos nem partilhamos dados de hóspedes. Consulte a nossa{" "}
                <a href="/pt/privacy" className="underline">
                  política de privacidade
                </a>
                .
              </li>
              <li>
                <strong className="text-[color:var(--charcoal)]">Termos</strong> —{" "}
                <a href="/pt/terms" className="underline">
                  termos e condições completos
                </a>{" "}
                disponíveis antes da reserva.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="reveal py-20 text-center">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow flank>Fale com a YES</Eyebrow>
          <SectionTitle as="h2" size="default">
            Fale diretamente com <SectionTitle.Em>uma designer local</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-6 text-[color:var(--charcoal-soft)] leading-relaxed">
            Email{" "}
            <a href={EMAIL_HREF} className="underline">
              {EMAIL}
            </a>
            <br />
            WhatsApp{" "}
            <a href={whatsappUrl()} className="underline">
              {PHONE_DISPLAY}
            </a>
            <br />
            {BASED_IN_SHORT}
          </p>
          <p className="mt-5 serif italic text-xl text-[color:var(--teal)]">
            Portugal, desenhado à sua volta.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <CtaButton to="/pt/contact" variant="primary">
              Começar a sua experiência privada
            </CtaButton>
            <CtaButton to="/" variant="ghost">
              Abrir o Studio (em Inglês)
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
