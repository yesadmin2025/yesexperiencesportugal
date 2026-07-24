## Plano — SEO rescan pós-Phase 2

### Objectivo
Medir o impacto das novas páginas SEO (Phase 1 + Phase 2) e identificar as próximas oportunidades de palavras-chave.

### Passos

1. **Correr o scanner SEO interno do Lovable** (`seo_chat--trigger_scan`)
   - Requer aprovação. Corre em ~1 minuto e aparece no painel SEO.
   - Antes do scan, listar findings actuais (`seo_chat--list_findings`) para comparação.

2. **Snapshot Semrush do domínio** (`semrush--domain_analysis` + `semrush--seo_trend`)
   - Baseline actual: ~3 keywords / ~39 visitas.
   - Comparar com o snapshot da semana passada para ver movimento inicial.
   - Nota: rankings novos costumam demorar 2–8 semanas a aparecer; este é um baseline, não um resultado final.

3. **Analisar as novas páginas** (`semrush--page_analysis`)
   - `/local-stories/best-wine-tasting-near-lisbon`
   - `/local-stories/private-tours-from-lisbon`
   - As 11 páginas Signature com novos titles.
   - Verifica se já estão indexadas e para que termos.

4. **Search Console (via connector GSC)**
   - Verificar estado das novas URLs (`inspectGscUrl`) para as 2 novas Local Stories.
   - Confirmar que o sitemap foi re-descarregado (`listGscSitemaps`).
   - Se ainda não estiverem indexadas, sinalizar acção manual: pedir indexação no GSC UI (não disponível via API).

5. **Identificar próximas oportunidades** (`semrush--keyword_research` + `serp_analysis`)
   Focar em termos alinhados com Signature tours existentes e KDI < 40:
   - "sintra private tour" / "cascais day trip"
   - "évora day trip from lisbon"
   - "comporta day trip"
   - "azulejo workshop lisbon"
   - "fátima nazaré óbidos tour"
   Escolher 3–5 como candidatos para Phase 2b (mais artigos) ou reforço de metadata.

### Entregável
Um relatório curto no chat com:
- Findings SEO antes/depois.
- Snapshot Semrush (keywords, tráfego estimado, trend).
- Estado de indexação das novas URLs no GSC.
- Top 3–5 próximas keywords a atacar, com volume, KDI e página-alvo sugerida.

### Sem alterações de código
Este plano é só de análise — não toca em ficheiros. Qualquer nova página ou ajuste de metadata que resulte da análise entra num plano separado.
