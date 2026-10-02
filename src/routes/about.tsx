import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript, personFounderLd } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { MaskReveal } from "@/components/motion/MaskReveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { SITE_RATING_LABEL } from "@/config/trust-certificate";
import { CTA_LABELS } from "@/content/cta-vocabulary";
import founderAsset from "@/assets/about-founder-wine-experience.jpg.asset.json";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import {
  ADDRESS_LINE,
  BASED_IN_SHORT,
  CANCELLATION,
  EMAIL,
  EMAIL_HREF,
  LICENSE_LABEL,
  LICENSE_LONG,
  NIF_LABEL,
  PHONE_DISPLAY,
  whatsappUrl,
} from "@/config/business-nap";

const TITLE = "About YES Experiences Portugal · Our Story & Founder";
const DESCRIPTION =
  "YES Experiences Portugal is a private tour company founded by Nídia Almeida. Meet the local team behind our private days and journeys across Portugal.";
const founderSrcSet = [480, 720, 900, 1200]
  .map((width) => `${founderAsset.url}?w=${width}&q=78 ${width}w`)
  .join(", ");
const socialImage = `https://yesexperiencesportugal.com${founderAsset.url}?w=1200&h=630&fit=crop&q=82`;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://yesexperiencesportugal.com/about" },
      { property: "og:image", content: socialImage },
      { property: "og:image:alt", content: "Nídia Almeida hosting a private wine experience in Portugal" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: socialImage },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "pt_PT" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/about" },
      ...localeAlternateLinks("/about"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ),
      jsonLdScript(personFounderLd()),
    ],
  }),
  component: AboutPage,
});

const storyClass = "about-copy-sequence mt-8 max-w-[66ch] space-y-5 text-[color:var(--charcoal-soft)] leading-[1.75]";

function StoryChapter({
  title,
  children,
  tone = "ivory",
  id,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "ivory" | "sand";
  id?: string;
}) {
  return (
    <section id={id} className={`reveal about-story section-y-major chapter-flow ${tone === "sand" ? "bg-[color:var(--sand)]" : ""}`}>
      <div className="container-x max-w-3xl">
        <SectionTitle as="h2" size="default" spacing="tight">{title}</SectionTitle>
        <div className={storyClass}>{children}</div>
      </div>
    </section>
  );
}

function AboutPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="page-hero public-page-header text-left" data-section="hero">
        <div className="container-x max-w-4xl">
          <div>
            <div className="scene-atmosphere"><h1 className="m-0"><Eyebrow>About YES! Experiences Portugal · Private tours &amp; travel design</Eyebrow></h1></div>
            <div className="scene-title">
              <SectionTitle as="p" size="anchor" spacing="loose">
                Portugal is the stage. <SectionTitle.Em>You write the story.</SectionTitle.Em>
              </SectionTitle>
            </div>
            <div className="page-header-support scene-body mt-8 max-w-[66ch] space-y-4 text-[color:var(--charcoal-soft)] leading-[1.75]">
              <p>YES! EXPERIENCES PORTUGAL was born from a very simple belief:</p>
              <p className="font-medium text-[color:var(--charcoal)]">Travel should feel personal.</p>
              <p>Not like following somebody else's itinerary. Not like ticking places off a list. And certainly not like having to adapt yourself to a tour that was designed for everyone.</p>
              <p className="font-medium text-[color:var(--charcoal)]">We believe the experience should adapt to you.</p>
              <p>But that idea didn't begin in a meeting room or with a business plan. It began much earlier.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal about-story section-y-major chapter-flow bg-[color:var(--sand)]">
        <div className="container-x grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:gap-16">
          <div>
            <SectionTitle as="h2" size="default" spacing="tight">A love of travel. And a love of home.</SectionTitle>
            <div className={storyClass}>
              <p>I never planned to build a travel company.</p>
              <p>In fact, I never imagined I would work in tourism.</p>
              <p>Travel, however, had always been part of my life.</p>
              <p>I travelled from childhood, lived in different countries from a young age, and grew up fascinated by other cultures, different ways of life and the people you meet when you step outside your own world.</p>
              <p>And the more I travelled, the more I realised how extraordinary my own country was.</p>
              <p>Portugal may be small, but it carries an incredible richness of history, culture, traditions and gastronomy.</p>
              <p>History was my favourite subject at school. But some of the stories I remember most didn't come from books.</p>
              <p>They came from my grandparents.</p>
              <p>I loved listening to them talk about people, places, traditions and the way life used to be. They taught me, without ever calling it that, that the history of a country doesn't live only inside monuments.</p>
              <p>It lives in families. In villages. In recipes. In expressions. In traditions. And in stories passed from one generation to the next.</p>
              <p className="font-medium text-[color:var(--charcoal)]">Perhaps that is where the storyteller in me began.</p>
            </div>
          </div>
          <MaskReveal as="figure" className="lg:sticky lg:top-28">
            <img
              src={`${founderAsset.url}?w=900&q=78`}
              srcSet={founderSrcSet}
              alt="Nídia Almeida hosting a private wine experience with YES Experiences Portugal guests."
              loading="lazy"
              fetchPriority="low"
              decoding="async"
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="aspect-[4/5] w-full object-cover"
            />
            <figcaption className="mt-3 text-xs leading-relaxed text-[color:var(--charcoal-soft)]">
              Nídia Almeida, founder of YES Experiences Portugal, hosting a private wine experience in Portugal.
            </figcaption>
          </MaskReveal>
        </div>
      </section>

      <StoryChapter title={'Showing friends "my Portugal"'}>
        <p>Whenever friends from abroad came to visit, I loved showing them Portugal.</p>
        <p>Not simply taking them to the places they were supposed to see.</p>
        <p>I wanted to show them the places I loved. Tell them the stories behind them. Take them somewhere they might never have found by themselves. Introduce them to our food, our wine, our people and our way of life.</p>
        <p>The more I travelled outside Portugal, the more I understood that we had things here that were genuinely unique.</p>
        <p>And I loved sharing them.</p>
        <p>I just never imagined that one day it would become my profession.</p>
      </StoryChapter>

      <StoryChapter title="Then tourism found me" tone="sand">
        <p>That happened almost completely by accident.</p>
        <p>A friend who was already a tour operator once needed some help and asked me to do a tour.</p>
        <p>He explained the itinerary to me, gave me the basics I needed to know, and I went.</p>
        <p>I fell in love with it almost immediately.</p>
        <p>Suddenly, so many things I had always loved came together in one place.</p>
        <p className="font-medium text-[color:var(--charcoal)]">People. Travel. History. Culture. Gastronomy. Storytelling. And the opportunity to share my country with people from all over the world.</p>
        <p>I loved listening to guests. I loved understanding what interested them. I loved the conversations, the questions, the unexpected stops and the way every group could experience the same place completely differently.</p>
        <p>Something clicked.</p>
      </StoryChapter>

      <StoryChapter title="One car. A couple of tours a week.">
        <p>As a single mother, I wasn't dreaming of building a large travel company.</p>
        <p>I started on my own, with one car and a very simple goal.</p>
        <p>If I could have a couple of tours a week, doing something I genuinely loved, it would be enough to support us.</p>
        <p>That was the plan.</p>
        <p>Then something unexpected happened.</p>
        <p>People started coming.</p>
        <p>One booking became another. Guests recommended their experiences to other travellers. Reviews appeared. A couple of tours a week became more tours, more guests, more places and more ideas.</p>
        <p>And almost without realising it, I was building YES! EXPERIENCES PORTUGAL.</p>
      </StoryChapter>

      <StoryChapter title="But I never liked standard tours" tone="sand">
        <p>Not as a traveller.</p>
        <p>And, eventually, not as the person creating them either.</p>
        <p>The more guests I met, the more obvious it became that people didn't all want the same thing.</p>
        <div className="space-y-2 text-[color:var(--charcoal)]">
          <p>One person could spend hours talking about history.</p>
          <p>Another wanted wine and long conversations around a table.</p>
          <p>Someone wanted the ocean.</p>
          <p>Someone else wanted local markets, hidden villages or gastronomy.</p>
          <p>Some wanted to see everything.</p>
          <p>Others wanted to see less and actually have time to enjoy it.</p>
        </div>
        <p>So why should all of them have exactly the same day?</p>
        <p>I was already changing and adapting experiences naturally depending on the people travelling with me.</p>
        <p>And gradually, one question became central to the way I thought about travel:</p>
        <blockquote className="my-10 border-l-2 border-[color:var(--gold)] py-2 pl-6 font-[family-name:var(--font-editorial)] text-[1.65rem] leading-[1.3] text-[color:var(--charcoal)] md:pl-8 md:text-[2rem]">
          <p>Why should the traveller have to adapt to the tour?</p>
          <p className="mt-4 italic text-[color:var(--teal)]">Why couldn't the tour adapt to the traveller?</p>
        </blockquote>
        <p>That idea became part of the DNA of YES.</p>
      </StoryChapter>

      <StoryChapter title="From an idea to the YES Studio">
        <p>Years later, technology finally gave us a way to take that philosophy much further.</p>
        <p>The YES Studio was born from the same idea I had experienced with guests for years: instead of choosing a standard tour and trying to make it fit, travellers should be able to shape the day around themselves.</p>
        <div className="space-y-2 text-[color:var(--charcoal)]">
          <p>What interests you?</p>
          <p>What would you rather skip?</p>
          <p>Do you want wine, history, food, the ocean, a local market, a slow lunch or something completely different?</p>
        </div>
        <p>The experience begins with the person.<br />Then we build the day.</p>
        <p>The technology came later.<br />The idea came from people.</p>
        <div className="pt-3"><CtaButton to="/studio" variant="primary">{CTA_LABELS.studio}</CtaButton></div>
      </StoryChapter>

      <StoryChapter title="And then one day became an entire journey" tone="sand">
        <p>The same thing happened naturally with longer trips.</p>
        <p>Guests began asking us not only to design a day, but to help them experience Portugal over several days.</p>
        <p>And the principle remained exactly the same.</p>
        <p>We don't believe the perfect Portugal itinerary exists before we know who is travelling.</p>
        <p>A couple celebrating an anniversary should not necessarily travel like a family discovering Portugal for the first time.</p>
        <p>A wine lover shouldn't experience the country in the same way as someone fascinated by history, crafts, food or the ocean.</p>
        <p>So our Travel Designer begins with you.</p>
        <p>Your interests. Your pace. Your reasons for travelling. Your idea of a perfect day.</p>
        <p>And from there, we create the journey.</p>
        <div className="pt-3"><CtaButton to="/contact" search={{ type: "multi_day" }} variant="primary">{CTA_LABELS.travelDesigner}</CtaButton></div>
      </StoryChapter>

      <StoryChapter title="YES today">
        <p>Today, YES! EXPERIENCES PORTUGAL creates private day experiences, tailor-made itineraries, full journeys, celebrations, proposals and experiences for private and corporate groups across Portugal.</p>
        <p>The company has grown considerably since those first days with one car.</p>
        <p>We work with guides, local producers, wineries, restaurants, boats, artisans and trusted partners throughout the country.</p>
        <p>Technology has become an important part of what we do.</p>
        <p>But technology isn't what defines us.</p>
        <p className="font-medium text-[color:var(--charcoal)]">People do.</p>
        <p>Our role is still to listen, understand and create.</p>
        <p>Because behind every booking there is a person who has chosen to spend something incredibly valuable with us:</p>
        <p className="font-[family-name:var(--font-editorial)] text-[1.5rem] text-[color:var(--teal)]">their time in Portugal.</p>
        <p>And we never forget that.</p>
      </StoryChapter>

      <section className="reveal about-story section-y-major chapter-flow bg-teal text-ivory [&_h2]:!text-ivory [&_p]:!text-ivory">
        <div className="container-x max-w-3xl">
          <h2 className="font-[family-name:var(--font-editorial)] text-[1.8125rem] font-medium leading-[1.18] md:text-[2.25rem] md:leading-[1.1]">The Portugal that feels right for you</h2>
          <div className="mt-8 max-w-[66ch] space-y-5 leading-[1.75] text-ivory">
            <p>There are countless ways to discover this country.</p>
            <p>Ours begins by asking who you are.</p>
            <p>Sometimes the most memorable moment isn't the famous monument.</p>
            <div className="space-y-2 text-ivory">
              <p>It is the conversation nobody planned.</p>
              <p>The family-run place you almost drove past.</p>
              <p>The story behind a village.</p>
              <p>A long lunch that lasts longer than expected.</p>
              <p>A glass of wine with the person who made it.</p>
              <p>Or simply having enough time to stop somewhere beautiful because you want to.</p>
            </div>
            <p>That is the Portugal we love sharing.</p>
            <p>Not a country reduced to a checklist.</p>
            <p>A country experienced through its stories, flavours, landscapes and people.</p>
            <p>And shaped around yours.</p>
          </div>
          <p className="mt-12 border-t border-[color:var(--gold-soft)]/50 pt-8 font-[family-name:var(--font-editorial)] text-[2rem] leading-tight md:text-[2.5rem]">Portugal is the stage. <em className="font-normal text-[color:var(--gold-soft)]">You write the story.</em></p>
        </div>
      </section>

      <section className="reveal about-story section-y-major chapter-flow">
        <div className="container-x max-w-5xl">
          <Eyebrow>Travel with confidence</Eyebrow>
          <SectionTitle as="h2" size="default" spacing="tight">Licensed, insured and personally accountable.</SectionTitle>
          <div className="mt-10 grid gap-8 border-y border-[color:var(--border)] py-8 md:grid-cols-3">
            <div><p className="text-[11px] uppercase text-[color:var(--charcoal-soft)]">Registration</p><p className="mt-2 font-[family-name:var(--font-editorial)] text-xl">{LICENSE_LABEL}</p><p className="mt-2 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">{LICENSE_LONG}.</p></div>
            <div><p className="text-[11px] uppercase text-[color:var(--charcoal-soft)]">Guest protection</p><p className="mt-2 font-[family-name:var(--font-editorial)] text-xl">Civil liability</p><p className="mt-2 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">Vehicles, guests and operations covered under Portuguese tourism law.</p></div>
            <div><p className="text-[11px] uppercase text-[color:var(--charcoal-soft)]">Guest reviews</p><p className="mt-2 font-[family-name:var(--font-editorial)] text-xl">{SITE_RATING_LABEL}</p><p className="mt-2 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">Verified guest reviews across established travel platforms.</p></div>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-[family-name:var(--font-editorial)] text-2xl">Clear before you book</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
                <li><strong className="text-[color:var(--charcoal)]">Signature cancellation:</strong> {CANCELLATION.signature.en}</li>
                <li><strong className="text-[color:var(--charcoal)]">Custom travel:</strong> {CANCELLATION.custom.en}</li>
                <li>Read our <Link to="/terms" className="underline underline-offset-4">terms</Link> and <Link to="/privacy" className="underline underline-offset-4">privacy policy</Link>.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-editorial)] text-2xl">Talk to us directly</h3>
              <p className="mt-5 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">{NIF_LABEL} · {ADDRESS_LINE}<br /><a href={EMAIL_HREF} className="underline underline-offset-4">{EMAIL}</a><br /><a href={whatsappUrl()} className="underline underline-offset-4">WhatsApp {PHONE_DISPLAY}</a><br />{BASED_IN_SHORT}</p>
              <div className="mt-6"><CtaButton href={whatsappUrl()} target="_blank" rel="noopener noreferrer" variant="ghost">Talk to a local</CtaButton></div>
            </div>
          </div>
          <nav aria-label="Explore YES" className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-[color:var(--border)] pt-8 text-sm">
            <Link to="/experiences" className="underline underline-offset-4">Explore Signature Experiences</Link>
            <Link to="/studio" className="underline underline-offset-4">Design your day</Link>
            <Link to="/portugal-travel-designer" className="underline underline-offset-4">Travel Designer</Link>
            <Link to="/contact" className="underline underline-offset-4">Contact</Link>
          </nav>
          <p className="mt-12 font-[family-name:var(--font-editorial)] text-[1.5rem] text-[color:var(--teal)]">Private by design. Personal by nature. Portuguese at heart.</p>
        </div>
      </section>
    </SiteLayout>
  );
}
