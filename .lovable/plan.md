## Goal
Cumprir a obrigação legal portuguesa: exibir o logótipo do **Livro de Reclamações Eletrónico** em todas as páginas do site, com link para o portal oficial `https://www.livroreclamacoes.pt/`.

## What ships

1. **Upload de 1 logótipo via Lovable Assets (CDN)**
   - Ficheiro escolhido: `logo_LRE_azul negativo.png` (fundo azul, texto branco) — a versão *negativo* é a única legível sobre o footer em `--charcoal`, e o azul institucional é o mais reconhecível pelos consumidores (as versões preto/vermelho são para outros contextos gráficos).
   - Comando: `lovable-assets create --file "/tmp/lre/logo_LRE_azul negativo.png" --filename logo-livro-reclamacoes.png > src/assets/logo-livro-reclamacoes.png.asset.json`.
   - Os restantes 5 ficheiros do zip ficam **fora** do repo (só um logo é usado; sem binários no `src/`).

2. **Novo componente `<LivroReclamacoesBadge />`** em `src/components/trust/LivroReclamacoesBadge.tsx`
   - `<a href="https://www.livroreclamacoes.pt/" target="_blank" rel="noopener noreferrer nofollow">` com `aria-label="Livro de Reclamações — abrir portal oficial (novo separador)"`.
   - `<img>` importando o `.asset.json`, `alt="Livro de Reclamações"`, `loading="lazy"`, `decoding="async"`, largura fixa (~140px) e `height` proporcional para evitar CLS.
   - Foco visível a `--gold` (consistente com os restantes links do footer).

3. **Integração no `src/components/Footer.tsx`**
   - Adicionar o badge na linha do trust strip (junto ao `RNAVT`, `Turismo de Portugal`, `Secure checkout · Stripe`), como um `<li>` extra — mesma altura visual, alinhado com os outros selos oficiais.
   - Isto garante que aparece em **todas as páginas** (o `Footer` está montado no `SiteLayout`, que envolve todas as rotas públicas).

4. **Verificar cobertura**
   - Confirmar que `SiteLayout` renderiza o `Footer` nas rotas públicas (incluindo `/studio-v3`, `/checkout`, e rotas admin públicas). Se alguma rota importante não usar `SiteLayout` (ex: `/admin`), documenta-se — mas admin não é público e não precisa cumprir a obrigação.

## Não incluído (a confirmar caso queiras)
- Não vou adicionar uma página dedicada tipo `/reclamacoes` nem texto legal extra em português — o logótipo com link para o portal oficial cumpre a obrigação legal do DL 74/2017. Se quiseres também uma frase adicional (“Este estabelecimento dispõe de Livro de Reclamações Eletrónico”), diz e acrescento.
- Não vou adicionar o logo da **ASAE / RAL / Centro de Arbitragem de Consumo** — se precisares desses também (obrigatórios para venda a consumidores em PT), envia os logos ou peço para eu procurar os links oficiais.

## Detalhes técnicos
```text
src/assets/logo-livro-reclamacoes.png.asset.json     (novo, pointer CDN)
src/components/trust/LivroReclamacoesBadge.tsx       (novo)
src/components/Footer.tsx                            (add <li> no trust strip)
```

Sem migrations, sem novas dependências, sem alterações a lógica de negócio.
