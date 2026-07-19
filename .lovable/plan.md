# Motion — tornar visível sem quebrar o premium

## Diagnóstico

As animações estão implementadas em todo o lado, mas com valores tão contidos que praticamente não se leem no mobile:

- `.reveal` sobe **12px em 360ms**, `.reveal-stagger` **10px em 320ms** — abaixo do limite premium.
- `RouteFade` faz apenas fade de opacidade em 160ms, sem lift.
- Scope `marketing` (aplicado nas páginas públicas) força translateY 18px + blur 4px em 420ms — bom, mas homepage e Signature/editorial não recebem o mesmo tratamento porque usam `.reveal` diretamente.
- `RevealImage` está em `motion="none"` por defeito e quase nenhum call site opta por `mask`/`scale`, logo as imagens não têm o mask reveal cinematográfico do plano.
- Ken-Burns em `GuestMomentsStrip`/service blocks continua a existir mas sem stagger nem entry lift.

Resultado: o sistema funciona, mas o utilizador sente “nada acontece”.

## Implementação (dentro do plano v2 aprovado, sem reintroduzir bounce/spring)

1. **Refinar tokens de reveal (globais, exceto excluded routes)**
  - `.reveal`: translateY **20px → 0**, duração **520ms**, ease existente `--ease-premium`.
  - `.reveal-stagger`: translateY **16px → 0**, duração **460ms**, delay base 60ms mantido.
  - Adicionar um leve `filter: blur(3px) → 0` em imagens dentro de `.reveal` (via `.reveal img, .reveal [data-reveal-image]`) durante 560ms para dar textura cinematográfica sem mover layout.
  - &nbsp;
2. **Ativar mask reveal nas imagens editoriais**
  - Trocar `motion="none"` para `motion="mask"` em call sites editoriais aprovados: homepage, cards de Signature (`experiences.tsx`), heros de tour (`tours.$tourId.tsx`), cards de Local Stories e blocos `EditorialCard` com imagem.
    &nbsp;
  - Duração continua ligada a `--dur-image` (780ms) — apenas garantimos que dispara.
3. **RouteFade com micro-lift**
  - Adicionar translateY 6px → 0 em 220ms junto ao fade existente, apenas nas rotas já cobertas (mantém exclusão de Studio/Builder/Checkout/Tailor/Admin).
4. **Stagger real onde já existe intenção**
  - Em `experiences.tsx` (grelha Signature), `local-stories` (grelha de artigos) e `corporate.tsx` (blocos de serviço): aplicar `.reveal-stagger` com delays 0/80/160/240ms via nth-child para garantir sequência visível.
  - Sem alterar layout, só classes.
5. **Ken-Burns sempre ligado nos ambient reveals**
  - `AmbientLandscapeReveal` / `CinematicEditorialImage` já implementam pan, mas dependem de viewport gating; garantir que o gate ativa 200ms depois do reveal do container (não em paralelo) e que o pan corre continuamente enquanto visível, em vez de parar após um ciclo.
6. **Reading Progress mais evidente**
  - Aumentar altura da barra de 2px → 3px e opacidade da cor gold para 100% (atualmente com transição)
7. **Guardrails**
  - Nenhum valor ultrapassa: translateY 22px, duração 620ms, blur 4px, sem bounce/spring, pode usar  parallax 
  - &nbsp;
  - Correr suite existente `src/__tests__/animation-contract-regression.test.ts` — atualizar os matchers de duração/translate onde o contrato agora exige o valor novo.
  - Correr `scripts/check-css-braces.mjs` no prebuild (já existe).

## Verificação

- Playwright mobile 393×706 em `/`, `/experiences`, `/tours/arrabida-wine-secret-coves`, `/local-stories`, homepage, about , moments `/corporate`: gravar 3 screenshots por rota (pré-scroll, mid-scroll, pós-scroll) e confirmar entrada visível de secções + zoom cinematográfico em imagens editoriais.
- Verificar consola sem warnings de fallback de fonte ou hydration.
- Preços com crianças tem de estar descriminado não apenas por adulto ou apenas o total em todos os portos . 

## Fora de âmbito

- Studio V2/V3, Builder, 
  &nbsp;