# Roadmap

## 1. Studio booking polish (mobile)
- [x] Sticky price summary during card entry
- [ ] Clear decline/error text + spinner, no double-tap
- [x] Confirmation email as a real travel document
- [x] Bookings dashboard: today / upcoming / needs attention, guest search, tap-to-call & WhatsApp

## 2. Content: Lisbon day trips + Arrábida wine
- [x] Rebuild day-trips hub with comparison table
- [x] New Arrábida wine hub
- [x] 4 supporting guides
- [x] FAQ layer + FAQ schema on hubs

## 3. Press kit and outreach
- [x] /press route (already existed)
- [ ] Researched outreach shortlist + templates document

## 4. Guide attribution + internal linking
- [x] Click-time guide attribution (session/local storage, 30 days) — internal links are clean canonical URLs, no query params
- [x] Attribution carried through checkout into bookings
- [x] /admin/guide-attribution dashboard
- [x] "Where to next" block: hub → siblings → Signature → Studio

## 5. SEO index quality (revenue recovery)
- [x] Retire `?ref=…&ref_slot=…` internal link variants (79 crawl issues); legacy shared links still attribute
- [x] Utility pages (`/pt/contact`, `/privacy`, `/cookies`, PT twins) = noindex, follow, out of sitemap, hreflang kept
- [x] 10-day sample itinerary substantive + FAQ/Trip schema; Azeitão FAQ full-day truth
- [x] Regressions: `seo-index-quality.test.ts`, `guide-attribution.test.ts`, e2e `seo-conversion-index-quality.spec.ts`
- [ ] Request re-crawl of the affected Local Stories + tour pages in Search Console once published
- [ ] After next SiteGuru crawl: confirm parameter-variant count drops to 0 and soft-404 flags clear
## 6. Cross-site premium brand alignment
- [x] Restore five first-class homepage service paths and give Proposals and Corporate distinct conversion sections
- [ ] Extend Fraunces upright + teal-italic title system to Experiences, Studio V3, and Travel Designer
- [ ] Point hero and Four Ways secondary journeys to real pages with premium editorial copy
- [ ] Optimize approved road-film mobile delivery and poster without blocking first paint
- [ ] Align Multi-day and Travel Designer cinematic language and shared CTAs

## 7. Local Stories search snippets
- [x] Tighter titles + meta descriptions on all 32 local stories (keyword-front-loaded, ≤60 / 120–165 chars)

## 8. Booking page + Signature editorial pages
- [x] Real booking page /book: name, date, party size, preferences; linked from hero + local stories
- [x] Signature day pages verified as editorial pages with real booking CTAs (already shipped)
- [x] Complete booking cancellation/refund workflow and confirmation communication
- [x] Strengthen Arrábida, Azeitão, and Alentejo wine-tour SEO
- [x] Add Portugal travel stories and link them from the American traveler guide
- [x] Verify booking, SEO, runtime, and publish
- [x] Add booking link + booking CTA on each region page to reach real booking pages
- [x] Implement/validate LocalBusiness/Organization structured data including licence and service areas, and run Google Rich Results Test
- [ ] Claim and verify the YES Experiences Portugal Google Business Profile (owner action required in Google)

## 9. Internal design-debt cleanup
- [x] Remove retired font references from active website and internal screens
- [x] Align typography audit and visual regression checks with Fraunces + Inter
- [x] Remove stale homepage-questionnaire labels while preserving the dedicated Proposals form and enquiry workflow
- [x] Verify typography, homepage structure, Proposals submission path, and mobile rendering

## 10. Homepage opening polish
- [x] Refine the cinematic phrase sequence, supporting typography, and editorial CTA
- [x] Rebuild the mobile cookie notice without clipping or overflow
- [x] Remove the Hero instant-reveal hydration mismatch
## 10. Premium System Lock hardening
- [x] Canonical Fraunces + Inter semantic typography across active public surfaces
- [x] Canonical CTA vocabulary and homepage three-primary-path hierarchy
- [x] Three-tier motion grammar with reduced-motion preservation
- [x] Studio three-chapter progress language without flow changes
- [x] Compact consent and quiet, resilient checkout states
- [ ] Regression tests, documentation, mobile/desktop verification, typecheck and build
- [ ] Keep production undeployed

## 11. Focused Hero + Experiences editorial pass
- [x] Sequence the homepage Hero and remove lower first-viewport micro-links
- [x] Simplify `/experiences` into a two-column editorial collection with one card action
- [x] Verify focused tests, mobile/desktop preview, typecheck, and production build
- [x] Keep production undeployed

## 12. Release-candidate premium polish
- [x] Expand the mobile Hero to a calm full-viewport 4–5 second cinematic sequence
- [x] Restore restrained editorial motion and canonical title styling on scoped public surfaces
- [x] Reduce Experiences collection cards to essential decision information
- [x] Simplify the representative Signature booking decision hierarchy without logic changes
- [x] Verify payment, privacy, analytics, mobile, reduced-motion, typecheck, and production build
- [x] Keep production undeployed

## 13. Premium editorial visual-system restoration
- [x] Restore gold-led Hero and shared premium CTA language
- [x] Reinstate medium-weight mixed Fraunces heading signature across requested public surfaces
- [x] Simplify Experiences page into a calm editorial collection
- [x] Restore restrained homepage continuity and motion
- [x] Align Tailor, Studio V3, Multi-day, About, Contact, Header, Footer, forms, Moments, and Corporate to the shared public system
- [x] Validate mobile/desktop, reduced motion, tests, TypeScript, and production build

## 14. Public typography and conversion-motion consistency
- [x] Normalize public labels and controls to Inter; keep Fraunces for headings and intentional editorial emphasis
- [x] Remove perpetual CTA motion and keep one-shot, interaction-led conversion cues
- [x] Make payment transitions immediate while preserving clear loading and error feedback
- [x] Validate representative public journeys at 393×852 and 1280×900, reduced motion, focused tests, and build

## 15. Site-wide editorial conversion motion
- [x] Activate the shared fade/settle controller across public storytelling and discovery routes
- [x] Extend one-shot movement to headings, imagery, cards, conversion actions, and Five Ways arrows
- [x] Keep transactional, Studio, admin, auth, and internal routes free from decorative motion
- [x] Validate public journeys at mobile/desktop sizes, reduced motion, focused tests, and build

## 16. Preview motion correction
- [x] Remove competing reveal ownership and delayed startup
- [x] Use one editorial fade language without blur, masks, scale or bounce
- [x] Validate homepage cadence, CTA and arrow response in mobile, desktop and reduced motion

## 17. Search performance reporting and wine-guide booking intent
- [x] Add Search Console clicks/impressions/position per page and per query, with 28-day period comparison
- [x] Add bookings per experience (started, guest details, paid) beside search data
- [x] Add automatic permanent-redirect verification for the retired wine guides
- [x] Add an early booking card to the surviving wine guide instead of a duplicate landing page
- [x] Validate typecheck, focused tests, mobile/desktop rendering and production build

## 18. Google-to-payment attribution
- [x] Capture first-touch acquisition source, medium and landing page (covers Google organic, which carries no utm_*)
- [x] Carry the source into Stripe metadata and onto the booking row
- [x] Add an "Origem → pagamento" panel with Google checkouts, payments and revenue in /admin/seo-monitor
- [x] Validate typecheck, tests, production build and browser capture at 393x852

## 19. SEO mercado americano — consolidação (fase 1)
- [x] 9 páginas de zona (Lisboa, Sintra, Cascais, Sesimbra, Setúbal, Azeitão, Évora, Comporta, Tróia) → 301 para a página de destino + âncora da área
- [x] /private-tours-portugal → /portugal-tours (301); /private-tours-from-lisbon → /lisbon-private-tours (301)
- [x] 5 guias consolidados em /day-trips-from-lisbon e /lisbon-private-tours (301)
- [x] Ligações internas, hub de cluster e sitemap (35 rotas) atualizados
- [ ] Fase 2: reforçar Sintra, Fátima, Évora, Comporta e luxury com blocos de resposta e FAQ para o mercado EUA

## 20. Painel de medição orgânica + publicação
- [x] Email de confirmação automático com detalhes + itinerário (já existente, verificado ponta a ponta)
- [x] Painel validado com sessão real de admin: SEO monitor, origem → pagamento, reservas por experiência, estado de cada reserva
- [x] Corrigido contador "Dados do hóspede" (usava um campo nunca preenchido, mostrava sempre 0)
- [x] Publicado e confirmado em produção: sitemap com 84 URLs reais, 301 das páginas retiradas, títulos/descrições reais

## 21. Vendas pagas, edição de experiências e estratégia SEO
- [x] Quadro de vendas em /admin/bookings: receita paga, nº de reservas, média, mês atual e tabela data · experiência · grupo · total
- [x] Editor de descrição por experiência em /admin/experiences (frase de cartão, parágrafo de abertura, para quem é) com histórico e publicar/despublicar
- [x] Páginas públicas de experiência usam o texto editado quando existe, com fallback ao texto de origem; sitemap intocado
- [x] Estratégia SEO de 12 meses publicada em docs/seo/authority-strategy-2026.md e legível em /admin/seo-strategy
- [x] Validação: typecheck, 1531 testes, route-meta, build de produção, 393x1800 + 1280x900 sem overflow nem erros

## 22. Conversão mobile, CTAs e movimento premium
- [x] Bloquear Tailor sem data e validar a mesma regra no editor, dados pessoais e repetição do checkout
- [x] Preservar datas digitadas parcialmente e mostrar erros junto ao campo
- [x] Tornar idades e resumo da data flexíveis em ecrãs estreitos
- [x] Unificar os dois calendários Studio numa geometria móvel partilhada
- [x] Normalizar as principais ações públicas e reduzir escolhas concorrentes nos artigos
- [x] Remover glow e ajustar movimentos de ação aos tempos premium
- [x] Validar visualmente 320, 360, 393 e 1280 px; testar bloqueio de data e garantia de falha/repetição do checkout
- [x] Executar verificações focadas e manter produção sem publicar
## 23. Site-wide public animations
- [x] Audit all public pages for central editorial motion coverage and missing reveal targets.
- [x] Apply calm site-wide transitions without changing checkout, Studio, routes, copy, or business logic.
- [x] Validate motion budget, reduced motion, mobile overflow, and representative public pages.

## 24. Premium motion correction — no bounce
- [x] Remove vertical entrances, automatic card lift, layered Hero rise, and returning arrow cues.
- [x] Replace them with fixed-position editorial masks, opacity cadence, film-led depth, and one-way CTA cues.
- [x] Validate real scroll sequences at 393px and 1280px, reduced motion, hydration, overflow, and conversion controls.

## 25. Visible premium storytelling on mobile
- [x] Connect selected editorial phrases to a fixed-position ink reveal.
- [x] Trigger CTA arrow drawing only when each action enters the viewport.
- [x] Compose the About page as a paced editorial story and remove its positional parallax.
- [x] Validate representative public pages at 393px and 1280px before release.

## 26. Mobile readability, visible premium motion, US SEO and booking operations
- [x] Fix Signature booking alignment and readability at 393px
- [x] Strengthen one-shot mobile arrow and editorial phrase reveals without bounce
- [x] Apply researched US search intent to all 12 Signature metadata sets
- [x] Refine Contact and FAQ presentation and metadata
- [x] Improve admin booking status and human-readable experience labels
- [x] Validate routes, sitemap, schema, checkout handoff, security, and publish

## 27. Google snippets and visible homepage motion
- [x] Separate overlapping US search intent across all 12 Signature experiences
- [x] Strengthen mobile-first phrase, card, image and arrow transitions without bounce
- [ ] Keep visible reviews and structured review data aligned — blocked until verified per-experience review totals are supplied
- [x] Remove map resize runtime warnings
- [x] Validate mobile/desktop, reduced motion, SEO/schema/sitemap, publish and resubmit sitemap

## 28. Corrective mobile motion and booking pass
- [x] Unify public CTA arrows around one viewport-aware mobile cue
- [x] Replace the repeated left-to-right homepage wipe with varied editorial sequences
- [x] Fix Signature date containment and simplify traveller composition on mobile
- [x] Validate scroll motion and booking layout at 393px and 1280px

## 29. Site-wide readability, tour highlights and Tailor semantics
- [ ] Fix animated-title clipping and verify Fraunces/Inter consistency
- [ ] Surface real tour highlights on Homepage and Experiences cards
- [ ] Let Arrábida Wine Tailor select one winery while preserving the full Signature default
- [ ] Ensure winery additions never auto-remove included moments and rely on real feasibility
- [ ] Validate conversion, metadata, schema, sitemap, mobile/desktop/reduced motion, then publish

## 30. Catálogo central de experiências para o Studio
- [ ] Criar cadastro admin único de duração, janela horária, sessões fixas, preço, unidade e disponibilidade
- [ ] Proteger leitura completa e escrita por função administrativa; expor ao público apenas experiências ativas e completas
- [ ] Fazer o Studio usar automaticamente os dados publicados para duração, viabilidade e preço
- [ ] Revalidar imediatamente o Studio após cada alteração administrativa
- [ ] Validar no telemóvel, permissões, preços apresentados e cobrança final
