import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { calculateGrowthMetrics } from "@/lib/advancedProjectionAnalysis";
import type { SimulationOutput } from "@/lib/monteCarloEngine";
import type { ProjectHistoricalData } from "@/hooks/useProjectionData";
import { TrendingUp, Gauge, LineChart } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function GrowthMetricsPanel({ historicalData, simulation, projectionDays }: {
  historicalData: ProjectHistoricalData[];
  simulation: SimulationOutput;
  projectionDays: number;
}) {
  const metrics = useMemo(
    () => calculateGrowthMetrics(historicalData, simulation, projectionDays),
    [historicalData, simulation, projectionDays]
  );

  const saturationLabels = { growing: "Em Crescimento", stable: "Estável", declining: "Em Declínio" };
  const saturationColors = { growing: "text-green-500", stable: "text-yellow-500", declining: "text-destructive" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">CAGR</span>
            </div>
            <p className={`text-base font-bold ${metrics.cagr >= 0 ? "text-green-500" : "text-destructive"}`}>
              {metrics.cagr.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Vel. Vendas/dia</span>
            </div>
            <p className="text-base font-bold">{metrics.velocitySales.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <LineChart className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Vel. Receita/dia</span>
            </div>
            <p className="text-base font-bold">{fmt(metrics.velocityRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Tendência</span>
            </div>
            <Badge variant="outline" className={saturationColors[metrics.saturationType]}>
              {saturationLabels[metrics.saturationType]}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {metrics.projectedMonthlyRevenue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Receita Projetada por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.projectedMonthlyRevenue} margin={{ left: -10, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={0} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
