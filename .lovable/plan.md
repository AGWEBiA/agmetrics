

## Problema

Para estratégias "perpétuo" e "lançamento pago", o RPL já usa `rplLeads` (compradores únicos = 1.159), mas o **CPL ainda usa `totalLeads`** (leads do Meta + Google = apenas 2). Isso resulta em R$ 15.469 / 2 = R$ 7.734,62 — errado.

O CPL deveria usar a mesma base de leads: **R$ 15.469 / 1.159 = ~R$ 13,35**.

## Correção

**Arquivo: `src/hooks/useDashboardMetrics.ts`** (linha 242)

Alterar o cálculo de `avgCpl` para usar `rplLeads` quando a estratégia for perpétuo ou lançamento pago:

```typescript
// ANTES:
const avgCpl = totalLeads > 0 ? totalInvestment / totalLeads : 0;

// DEPOIS:
const cplBase = isRplStrategy ? rplLeads : totalLeads;
const avgCpl = cplBase > 0 ? totalInvestment / cplBase : 0;
```

**Arquivo: `src/components/dashboard/OverviewSections.tsx`** (linha 161)

Atualizar o subtitle do CPL para refletir a base correta:

```typescript
// ANTES:
subtitle="Custo por lead"

// DEPOIS:
subtitle={m.isRplStrategy ? "Investimento ÷ compradores únicos" : "Custo por lead"}
```

Isso garante consistência: tanto RPL quanto CPL usam a mesma definição de "lead" (compradores únicos) nas estratégias perpétuo e lançamento pago.

