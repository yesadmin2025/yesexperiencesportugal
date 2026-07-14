## Do I know what the issue is?

Sim. O erro do screenshot não vem do cálculo do preço: o Studio bloqueia a composição antes de criar o draft.

**Problema exato:** quando existe uma criança, `StudioV3.tsx` tenta validar todos os tours pelas categorias Bókun guardadas em `tour_price_tiers.bokun_categories`. Na base de dados, os 12 tours têm esse campo vazio; por isso, `filterStudioCandidatesByAges()` exclui todos, `resolveStudioV3Route()` devolve `skeletonTourKey: null` e aparece “We couldn't compose a draft…”. Isto contradiz o checkout atual, que já usa pricing manual Viator e suporta Adult/Youth/Child/Infant no servidor.

## Plano de correção

1. **Desbloquear o draft para famílias**
   - Em `StudioV3.tsx`, deixar de usar o espelho vazio de categorias Bókun como gate para o matching do Studio enquanto o produto comercial `studio-v3-private-full-day` está no modo manual.
   - Manter os gates reais de segurança existentes: idade mínima, infant permitido, stroller, capacidade e suitability por tour/stop.
   - Assim, crianças continuam a excluir apenas tours realmente incompatíveis (ex.: barco para menores de 4), sem eliminar todo o catálogo.

2. **Manter a composição no checkout**
   - Preservar `adults + minorAges` no pedido de quote.
   - Confirmar que a quote autoritativa aplica as bandas já existentes: adulto 100%, jovem 80%, criança 50%, bebé €0, mais add-ons calculados pelo servidor.
   - O frontend não enviará valores monetários confiáveis; o checkout continua a recalcular tudo no servidor.

3. **Uniformizar preço pp e total**
   - No `SignaturePriceCard`, manter o recálculo imediato do all-in pp após add/remove: `total do grupo / número de convidados`.
   - No `CheckoutSummary`, mostrar o mesmo all-in pp calculado a partir da quote autoritativa, preservando a tier base numa linha secundária quando houver add-ons ou bandas infantis.
   - O total apresentado no Refine e o `finalTotalEur` enviado ao Stripe terão a mesma fonte de verdade.

4. **Cobertura de regressão**
   - Adicionar teste de matching com 1 adulto + 1 criança, comprovando que existe draft e que tours incompatíveis continuam excluídos.
   - Adicionar teste de quote/checkout com criança + add-on, validando pp, total e linhas por banda.
   - Executar os testes focados do Studio e validar o fluxo mobile até ao checkout.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>