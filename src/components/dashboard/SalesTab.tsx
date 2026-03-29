import { AnimatedCard } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, Stat } from "./MetricCard";
import { formatBRL, formatPercent, formatNumber } from "@/lib/formatters";

interface SalesTabProps {
  m: any;
}

export function SalesTab({ m }: SalesTabProps) {
  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedCard index={0}><MetricCard title="Receita Bruta da Ação" value={formatBRL(m.grossActionRevenue)} subtitle="Preço base dos produtos" /></AnimatedCard>
        <AnimatedCard index={1}><MetricCard title="Receita Bruta" value={formatBRL(m.grossRevenue)} subtitle="Total cobrado" /></AnimatedCard>
        <AnimatedCard index={2}><MetricCard title="Receita Líquida (Produtor)" value={formatBRL(m.producerRevenue)} subtitle="Valor do produtor" /></AnimatedCard>
        <AnimatedCard index={3}><MetricCard title="Comissão Coprodutor" value={formatBRL(m.totalCoproducerCommission)} subtitle="Valor dos coprodutores" /></AnimatedCard>
        <AnimatedCard index={4}><MetricCard title="Taxas da Plataforma" value={formatBRL(m.totalFees)} subtitle="Kiwify + Hotmart" /></AnimatedCard>
        <AnimatedCard index={5}><MetricCard title="Lucro Líquido Projeto" value={formatBRL(m.netProfitProject)} color={m.netProfitProject >= 0 ? "text-success" : "text-destructive"} subtitle="Receita total - Investimento" /></AnimatedCard>
        <AnimatedCard index={6}><MetricCard title="Lucro Líquido Produtor" value={formatBRL(m.netProfitProducer)} color={m.netProfitProducer >= 0 ? "text-success" : "text-destructive"} subtitle="Receita produtor - Investimento" /></AnimatedCard>
        <AnimatedCard index={7}><MetricCard title="Margem" value={formatPercent(m.margin)} color={m.margin >= 0 ? "text-success" : "text-destructive"} /></AnimatedCard>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <AnimatedCard index={4}>
          <Card>
            <CardHeader><CardTitle className="text-lg">Kiwify</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Vendas" value={formatNumber(m.kiwifySales.length)} />
                <Stat label="Receita" value={formatBRL(m.kiwifySales.reduce((s: number, e: any) => s + Number(e.amount), 0))} />
                <Stat label="Ticket Médio" value={m.kiwifySales.length > 0 ? formatBRL(m.kiwifySales.reduce((s: number, e: any) => s + Number(e.amount), 0) / m.kiwifySales.length) : "—"} />
                <Stat label="% do Total" value={m.salesCount > 0 ? formatPercent((m.kiwifySales.length / m.salesCount) * 100) : "—"} />
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={5}>
          <Card>
            <CardHeader><CardTitle className="text-lg">Hotmart</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Vendas" value={formatNumber(m.hotmartSales.length)} />
                <Stat label="Receita" value={formatBRL(m.hotmartSales.reduce((s: number, e: any) => s + Number(e.amount), 0))} />
                <Stat label="Ticket Médio" value={m.hotmartSales.length > 0 ? formatBRL(m.hotmartSales.reduce((s: number, e: any) => s + Number(e.amount), 0) / m.hotmartSales.length) : "—"} />
                <Stat label="% do Total" value={m.salesCount > 0 ? formatPercent((m.hotmartSales.length / m.salesCount) * 100) : "—"} />
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </>
  );
}
