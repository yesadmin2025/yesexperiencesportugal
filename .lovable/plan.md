## Objetivo

Transformar o `/studio-v2` de um questionário linear (intent → refine steps → reveal) numa **journey cinematográfica intercalada**: escolha → recompensa (story / imagem / mapa) → escolha → recompensa. Cada decisão alimenta a história escrita final.

## Princípios

- Não parece formulário. Parece uma história a ser escrita em tempo real.
- Cada escolha é seguida por uma "recompensa" visual ou narrativa antes da próxima escolha.
- Variedade de formatos: cards, input de nome, imagens cheias, mapa, chapter title, "AI is thinking…".
- Balão de WhatsApp **sempre visível** durante toda a journey.
- Resultado final: história escrita personalizada (com nome se dado) + mapa + 3 CTAs (Reserve · Talk to a Local · Save).

## Estrutura da journey (sequência de beats)

```text
1.  intro          → graphic hero, "Begin your Portugal story" + CTA
2.  name           → input opcional "What should we call this story?"
3.  reward:story   → "Let's begin writing Maria's story." (fade-in editorial)
4.  intent         → 6 cards (atmosfera) — escolha
5.  reward:image   → full-bleed cinematic image do intent escolhido + 1 linha
6.  pace           → 4 cards rhythm
7.  reward:insight → "A slower coastal arc is forming." (1 linha AI)
8.  priorities     → tap-twice priorities (mantém o padrão actual)
9.  reward:map     → mini map preview com pins a aparecerem em sequência
10. group          → guests count + tipo
11. reward:story   → próxima frase da história ("Designed for two, unhurried.")
12. ops            → data + região (logistics)
13. reward:thinking → "Composing your journey…" 1.5s
14. reveal         → história escrita completa + mapa + 3 CTAs
```

## Componentes

Refatorar `StudioV2.tsx` (1205 linhas) em sub-componentes na pasta `src/components/studio-v2/`:

- `StudioV2.tsx` — orquestrador (machine de beats + transições).
- `beats/IntroBeat.tsx` — hero gráfico de abertura.
- `beats/NameBeat.tsx` — input opcional do nome.
- `beats/ChoiceBeat.tsx` — wrapper genérico para passos de escolha (recebe `eyebrow`, `title`, `helper`, `options`, `onPick`).
- `beats/RewardStoryBeat.tsx` — frase editorial (Georgia italic) com fade.
- `beats/RewardImageBeat.tsx` — imagem full-bleed com legenda 1 linha.
- `beats/RewardMapBeat.tsx` — `BuilderMap` com pins sequenciais.
- `beats/RewardThinkingBeat.tsx` — "Composing…" com shimmer ténue (não decoração, indica progresso).
- `beats/RevealBeat.tsx` — história escrita + mapa + 3 CTAs (reutiliza o reveal actual, polido).
- `PersistentChatFab.tsx` — balão WhatsApp fixo (reusa `whatsappHref` do `WhatsAppFab` existente, mas visível em todos os viewports e em todos os beats, com mensagem pré-preenchida que reflecte o progresso).

## Máquina de beats

```ts
type Beat =
  | { kind: "intro" }
  | { kind: "name" }
  | { kind: "reward-story", line: string }
  | { kind: "choice-intent" }
  | { kind: "reward-image", intent: IntentAtmosphere }
  | { kind: "choice-pace" }
  | { kind: "reward-insight", line: string }
  | { kind: "choice-priorities" }
  | { kind: "reward-map" }
  | { kind: "choice-group" }
  | { kind: "choice-ops" }
  | { kind: "reward-thinking" }
  | { kind: "reveal" };
```

Lista de beats gerada dinamicamente a partir do profile (cada reward lê o último valor). Avanço com `next()`; reward beats auto-advance após 1.8–2.4s (skippable com tap). Choice beats avançam ao seleccionar.

## Conteúdo (copy)

Adicionar em `src/lib/studio-v2/content.ts`:

- `storyOpener(name?: string)` → "Let's begin writing your Portugal story." / "Let's begin writing Maria's story."
- `storyAfterIntent(intent)` → "A coastal, cinematic thread takes shape."
- `storyAfterPace(pace)` → "Three considered stops. Room to breathe."
- `storyAfterGroup(group)` → "Designed for two, unhurried."
- `storyFinal(profile)` → 3–4 frases editoriais que compõem a "história escrita" final.

Tom: conciso, inteligente, premium, operacionalmente fundado. Sem poesia/fantasia.

## WhatsApp persistente

`PersistentChatFab.tsx` — bolha discreta bottom-right, `z-50`, visível em todos os beats da Studio v2 (override da regra que esconde o `WhatsAppFab` em mobile, porque aqui é uma feature do builder, não navegação geral). Mensagem dinâmica reflectindo o progresso ("Olá! Estou a desenhar uma experiência [intent] para [N] pessoas — gostaria de ajuda.").

## CTAs finais (reveal)

1. **Reserve instantly** (primário — teal)
2. **Talk to a Local** (secundário — abre WhatsApp com contexto completo)
3. **Save my story** (terciário — guarda em localStorage, link partilhável depois)

## Motion

Cada beat entra com fade + translateY 12px @ 220ms. Reward beats têm uma duração mínima visível (não passar antes do utilizador conseguir ler). `prefers-reduced-motion` → sem translate, só fade.

## Imagens

Para `reward-image` por intent, usar as imagens reais já existentes em `src/assets/hero-clips/` ou tour assets. Não inventar nem gerar novas se possível.

## Fora de scope

- Não tocar no `/builder` clássico nem no `/studio-drift`.
- Não tocar no `WhatsAppFab` global da homepage.
- Sem alterações de schema / Supabase.
- Sem mudanças no engine de matching (continua a usar `designExperience`).

## Verificação

Abrir `/studio-v2` no mobile preview (393×587), percorrer toda a journey, confirmar:
- Alternância choice ↔ reward funciona.
- Chat fab sempre visível.
- Reveal final tem história + mapa + 3 CTAs.
- Sem layout shift, sem clipping no viewport mobile.
