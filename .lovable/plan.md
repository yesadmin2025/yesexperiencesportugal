Experience Studio v4 — Cinematic Journey to Booking

## Intenção

Transformar o Studio numa **aventura cinematográfica** que a pessoa vive enquanto escolhe a viagem — e que termina numa reserva imediata, com alta taxa de conversão. Sem formulários, sem nomes técnicos no início, com imagens reais e revelação progressiva.

## O que vou respeitar (do que já pediste)

- **Sem nomes de locais** nas fases iniciais (chips, sugestões, ribbon, mapa) — só emoção.
- **Imagens e vídeo permitidos** (real footage, sem stock).
- **Sem página em branco / sem pressão para escrever**: entrada passiva, atmosfera primeiro.
- **Progressão clara entre fases** (não estático, sem tudo a falar ao mesmo tempo).
- **Transições cinematográficas consistentes** abrir/fechar narrador.
- **Persistência** da narração + decisões AI (localStorage já existe).
- **Multi-idioma** PT/EN/ES/FR.
- **Mobile-first**, brand guardrails (ivory/charcoal/teal/gold, Montserrat+Georgia+Inter).
- **Revelação progressiva de nomes**: só aparecem **mais tarde**, quando a pessoa já está comprometida e precisa para reservar (não no início).

## As 6 fases cinemáticas (uma de cada vez)

```text
0. PROLOGUE      → vídeo full-bleed, linha poética, "entrar"
1. SENTIR        → 4 chips de emoção visuais (cards com vídeo)
2. COM QUEM      → cards "a dois / família / amigos / só" (ícones + footage)
3. INTENÇÃO      → cards "descobrir / relaxar / celebrar / saborear"
4. REVELAÇÃO     → "Portugal está a responder…" → 3 cenas surgem (vídeo, sem nomes)
                   tap numa cena = aceita; mapa desenha-se por baixo em silêncio
5. JORNADA       → mapa vivo (protagonista), ribbon mostra durações + blurb emocional
                   AQUI nomes reais começam a aparecer suavemente (a pessoa já escolheu)
6. RESERVA       → MemoryCard fecha: hero da viagem, 3 momentos com nome+imagem,
                   preço, "Reservar agora" (Stripe embedded) + WhatsApp como fallback
```

Cada fase ocupa o ecrã inteiro com transição cinematográfica (fade + scale, 600–800ms, easing `cubic-bezier(.22,1,.36,1)`). Só uma camada visível de cada vez.

## Mudanças de UX para conversão

- **CTA único e claro** no fim ("Reservar esta viagem · €X"), sem competir com outros.
- **Trust signals discretos** no MemoryCard: "Confirmação imediata · Guia local · Cancelamento flexível".
- **Botão "Continuar a viagem"** se houver estado guardado (já temos `restored`), aparece no prologue como segunda opção subtil.
- **Tempo total + nº de momentos** visível na fase 5 para sensação de progresso.
- **Reserva embebida** (Stripe `EmbeddedCheckout`) dentro do próprio Studio — sem sair do mundo cinemático.

## Quando os nomes reais aparecem


| Fase | Nomes visíveis?                                                                        |
| ---- | -------------------------------------------------------------------------------------- |
| 0–4  | **Não** — só frases emocionais (`PHRASES_BY_TAG`) e vídeo                              |
| 5    | **Sim, suaves** — nome da paragem aparece no ribbon ao expandir + pin do mapa em hover |
| 6    | **Sim, completos** — MemoryCard mostra cada momento com nome real, duração e imagem    |


Isto resolve a tua nota: nomes acabam por aparecer, mas só depois da pessoa já estar emocionalmente comprometida.

## Trabalho técnico

### Componentes novos

- `src/components/builder/v3/JourneyPhases.tsx` — orquestrador único de fases (substitui a lógica espalhada em `StudioStageV3`).
- `src/components/builder/v3/PhaseCard.tsx` — card visual reutilizável (vídeo + frase + ícone), usado em Sentir/Com quem/Intenção/Revelação.
- `src/components/builder/v3/JourneyReveal.tsx` — momento "Portugal está a responder" com shimmer + reveal sequencial das cenas.
- `src/components/builder/v3/BookingClose.tsx` — fase final: hero, momentos com nome real, preço, CTA reservar, trust row.

### Componentes a refinar

- `StudioStageV3.tsx` — simplificar para renderizar `<JourneyPhases>` e pouco mais.
- `EmotionChips.tsx`, `EmergingChips.tsx` → consolidar dentro de `PhaseCard` (deixa de haver dois sistemas).
- `MemoryCard.tsx` → renomear/refatorar para `BookingClose` com nomes reais + CTA reserva.
- `LivingMap.tsx` → fase 5 only; ribbon mostra nome real ao expandir.
- `AmbientPrologue.tsx` → manter, simplificar (já está bom), adicionar CTA "Continuar viagem" se `restored`.

### Hooks / estado

- `useStudioState.ts` → adicionar fase derivada explícita (`'prologue'|'feel'|'who'|'intent'|'reveal'|'journey'|'booking'`) em vez de inferir.
- `useStudioLocale.ts` → adicionar copy para cada fase nas 4 línguas.

### Reserva

- Integração `EmbeddedCheckout` no `BookingClose` usando `getStripe` e a edge function `create-builder-checkout` que já existe.
- WhatsApp como link secundário (não primary CTA).

## O que NÃO vou fazer

- Não adiciono parallax/glassmorphism fora do homepage.
- Não invento tours, paragens, preços, partners.
- Não toco no homepage nem em rotas fora do `/builder`.
- Não toco em `client.ts`, `types.ts`, `.env`.

## Validação no fim

- Mobile 393×587: cada fase ocupa viewport sem scroll forçado.
- Transições suaves entre fases, sem flash.
- Estado persiste e restaura.
- Reserva abre embedded sem sair do mundo.
- Sem nomes reais antes da fase 5.

Após aprovação, implemento numa única passagem.

&nbsp;

**do NOT overcomplicate phase 1–3.**

Those phases MUST feel:

- effortless
- sensual
- fluid
- fast
- emotionally obvious

Because the risk is:

**too much “experience” before momentum.**

Especially American users:  
they LOVE immersion…  
BUT they also subconsciously need:

**progression clarity.**

😭

And honestly?  
The best decision here may actually be:

**making the map protagonist only in phase 5.**

Because before, the map was competing too early.  
Now:

**it becomes a reward reveal.**

That’s MUCH stronger emotionally.

💀

And Stripe embedded inside the cinematic world?

**VERY important.**

Because if the person suddenly:

- opens ugly checkout
- gets redirected
- loses atmosphere

…the spell breaks 😭

This:

**preserves narrative continuity into conversion.**