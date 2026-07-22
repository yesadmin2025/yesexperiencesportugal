# GA4 + GTM Conversion Tracking Plan

Container `GTM-M82SQS79` já está montado em `__root.tsx`. A base (`src/lib/analytics.ts` + `src/lib/analytics-ga4.ts`) já suporta `dataLayer` push SSR-safe, delegador global via `data-analytics`, e GA4 ecommerce. Este plano consolida os eventos pedidos sem alterar UI.

## 1. Catálogo canónico (`src/lib/analytics-events.ts` — novo)

Ficheiro único que exporta:
- `EVENTS` — union type com **todos** os nomes exatos pedidos (sem sufixo `_click` extra; mantém compatibilidade dos legacy adicionando aliases).
- `trackEvent(name, params)` — wrapper sobre `track()` que:
  - injeta sempre `page_path` (do `window.location.pathname`), `language` (do `useLocale()` via provider global), `device`.
  - filtra chaves undefined; **strip de PII** (rejeita `email`, `phone`, `name`, `given-name`, `family-name`, `message`; assert em dev).
  - dedupe: mantém `Map<key, ts>` em memória e ignora repetições do mesmo `(event + experience_id + placement)` em < 800ms.
  - respeita consentimento (ver §5): se `analytics_storage !== 'granted'`, apenas queue em `pendingQueue[]` e flush no evento `consent_update`.
- Parâmetros standard: `page_path`, `language`, `experience_id`, `experience_type` (`signature | studio | tailor | moments | corporate | travel_designer`), `group_size`, `placement`, `source`, `value`, `currency`.

## 2. Mapeamento de eventos → local de disparo

| Grupo | Evento | Onde é disparado |
|---|---|---|
| Homepage | `hero_open_studio` | `HeroFinal` CTA "Open the Studio" |
| | `hero_choose_experience` | `HeroFinal` CTA "Choose an experience" |
| | `five_ways_signature_click` | `FiveWays` card Signature |
| | `five_ways_studio_click` | idem Studio |
| | `five_ways_moments_click` | idem Moments |
| | `five_ways_corporate_click` | idem Corporate |
| | `five_ways_travel_designer_click` | idem Travel Designer |
| Signature | `signature_card_view` | `IntersectionObserver` em cada card do índice `/experiences` (threshold 0.5, once) |
| | `signature_reserve_click` | Botão Reserve em `tours.$tourId.tsx` + `MobileStickyCTA` |
| | `signature_tailor_click` | Botão Tailor em `tours.$tourId.tsx` |
| | `availability_open` | Abertura do `SimpleBookingForm` / `BrandedCheckoutDrawer` |
| | `date_selected` | `onDateSelect` em `SimpleBookingForm` |
| | `participants_selected` | `onCompositionChange` (debounce 400ms) |
| | `checkout_started` | Antes do redirect Stripe (Signature + Tailor) |
| | `checkout_completed` | `booking-confirmed.tsx` mount, uma vez por `session_id` (dedupe via sessionStorage) |
| Studio | `studio_started` | `StudioV3Intro` Begin |
| | `studio_step_completed` | `useStepTimer.markExit("continue")` |
| | `studio_option_added` / `_removed` | Add-on toggle em `StudioV3` |
| | `studio_draft_resumed` | `useStudioState` restaura draft de sessionStorage |
| | `studio_checkout_started` | Antes do redirect Stripe do Studio |
| | `studio_checkout_completed` | `booking-confirmed.tsx` quando `surface=studio` |
| | `studio_abandoned` | `pagehide` mid-flow via `useStepTimer` (beacon) |
| Leads | `whatsapp_click` | delegador global (já implementado); adicionar `page_path` |
| | `contact_form_started` | primeiro `focus` num field do `contact.tsx` |
| | `contact_form_submitted` | submit OK |
| | `moments_lead` | submit do form em `moments.tsx` |
| | `corporate_lead` | submit em `corporate.tsx` |
| | `travel_designer_lead` | submit em `portugal-travel-designer.tsx` |
| Outros | `language_changed` | `LanguageSwitcher` onClick |
| | `tripadvisor_click` / `google_reviews_click` | `TourReviews` source buttons + footer badges |
| | `phone_click` | qualquer `<a href="tel:">` (delegador) |
| | `email_click` | qualquer `<a href="mailto:">` (delegador — já existe parcial) |

## 3. UTM persistence

Novo `src/lib/utm.ts`:
- No boot (efeito no `__root.tsx`), ler `utm_source|medium|campaign|term|content|gclid|fbclid` do `location.search`.
- Se presentes: guardar em `sessionStorage` (`yes.utm.v1`) e `localStorage` (30 dias) com timestamp.
- `getUtms()` retorna o objecto; `trackEvent` inclui-os automaticamente em `checkout_started`, `*_lead`, `checkout_completed`.
- `Reserve` server-fn (Stripe checkout create) recebe UTMs no `metadata` da session para atribuição server-side.

## 4. Parâmetros contextuais

- `page_path`: sempre auto (from `window.location.pathname`).
- `language`: from `useLocale()` — passado via um pequeno registry `setAnalyticsLocale(loc)` chamado no `LocaleProvider`.
- `experience_id`: `tour.id` em Signature/Tailor; `null` em Studio até resolução; `studio-<tier>` após tier chosen.
- `experience_type`: enum acima.
- `group_size`: `adults + minors` quando definido.

## 5. Consentimento de cookies

- Se existir um banner: assume-se Google Consent Mode v2. Caso não exista, adicionar snippet default **denied** em `__root.tsx` **antes** do GTM:
  ```js
  gtag('consent','default',{ analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied' });
  ```
- Emitir `consent_update` quando o utilizador aceita (integração com o banner existente — a confirmar qual está em uso; se nenhum, entregar componente mínimo `ConsentBanner` sem alterações visuais na página, sobreposto).
- `trackEvent` faz queue enquanto `denied`; flush no update.

## 6. Deduplicação

- In-memory dedupe (800ms) para clicks acidentais duplos.
- `checkout_completed` / `studio_checkout_completed`: guard por `sessionStorage["yes.purchase.<id>"]`.
- `signature_card_view`: `IntersectionObserver` com `Set<id>` já vistos.

## 7. Migração dos call sites existentes

Sem alterar comportamento visual:
- `analytics-ga4.ts`: mantém-se para ecommerce GA4 (view_item, add_to_cart, purchase). Novos eventos custom passam por `trackEvent()`.
- Substituir `track("signature_reserve_click", …)` chamadas atuais pelo novo wrapper (mesmo nome).
- Adicionar chamadas em falta nos ficheiros listados na tabela §2.

## 8. Documentação

`docs/analytics/events.md` — tabela completa (nome, quando, ficheiro, parâmetros obrigatórios, exemplo dataLayer).
`docs/analytics/gtm-setup.md` — instruções GTM: triggers `Custom Event = <nome>`, tags GA4 Event, variáveis DLV para cada parâmetro standard, conversion mapping (`checkout_completed`, `studio_checkout_completed`, `*_lead` → GA4 key events).

## 9. Funil final (documentado)

```text
ENTRADA              → INTERAÇÃO              → INTENÇÃO                 → CHECKOUT/LEAD              → CONVERSÃO
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
page_view (auto)     hero_open_studio         studio_started             studio_checkout_started      studio_checkout_completed
                     hero_choose_experience   studio_step_completed
                     five_ways_*_click        studio_option_added/removed
                                              studio_draft_resumed

page_view (/exp)     signature_card_view      signature_reserve_click    availability_open            checkout_completed
                                              signature_tailor_click     date_selected
                                                                         participants_selected
                                                                         checkout_started

page_view (leads)    whatsapp_click           contact_form_started       contact_form_submitted       *_lead (moments/corporate/
                     phone_click / email_click                                                        travel_designer)

Cross-cutting: language_changed · tripadvisor_click · google_reviews_click (trust signals, sem etapa própria)
```

## 10. Ficheiros a criar/editar

**Criar**
- `src/lib/analytics-events.ts` — catálogo + `trackEvent`.
- `src/lib/utm.ts` — captura/persistência UTM.
- `docs/analytics/events.md`, `docs/analytics/gtm-setup.md`.
- `src/lib/__tests__/analytics-events.test.ts` — dedupe, PII strip, consent queue, UTM enrichment.

**Editar (apenas instrumentação, sem alterar markup visível)**
- `src/routes/__root.tsx` — consent default, boot UTM, `setAnalyticsLocale`.
- `src/i18n/locale-context.tsx` — chama `setAnalyticsLocale`.
- `src/components/HeroFinal.tsx`, `FiveWays*.tsx` — `data-analytics` attrs.
- `src/routes/experiences.tsx` — card view observer.
- `src/routes/tours.$tourId.tsx`, `tours.$tourId.tailor.tsx`, `SimpleBookingForm.tsx`, `BrandedCheckoutDrawer.tsx`, `MobileStickyCTA.tsx`.
- `src/components/studio-v3/StudioV3.tsx`, `StudioV3Intro.tsx`; `src/hooks/useStudioState.ts` (draft resumed).
- `src/routes/contact.tsx`, `moments.tsx`, `corporate.tsx`, `portugal-travel-designer.tsx`.
- `src/components/LanguageSwitcher.tsx`.
- `src/components/TourReviews.tsx`, `Footer.tsx` (tripadvisor/google clicks).
- `supabase/functions/create-*-checkout/index.ts` — propagar UTMs para `metadata` do Stripe.

## Confirmações antes de construir

1. **Consent banner**: existe algum banner ativo? Se não, ok autorizar Consent Mode v2 default-denied + banner minimalista (sem alterar layout das páginas)?
2. **Nomes exatos**: manter `hero_open_studio` e `signature_reserve_click` como pedido (o codebase tem `hero_open_studio_click` / já `signature_reserve_click`) — ok renomear para os teus, com aliases temporários para o GTM antigo não perder dados?
