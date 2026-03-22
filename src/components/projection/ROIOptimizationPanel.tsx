import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { calculateOptimalBudget, calculateMaxCPA, projectRefundCohorts } from "@/lib/advancedProjectionAnalysis";
import type { SimulationParams, SimulationOutput } from "@/lib/monteCarloEngine";
import type { ProjectHistoricalData } from "@/hooks/useProjectionData";
import { PiggyBank, AlertTriangle, Shield } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function ROIOptimizationPanel({ params, simulation, historicalData }: {
  params: SimulationParams;
  simulation: SimulationOutput;
  historicalData: ProjectHistoricalData[];
}) {
  const budgetAllocations = useMemo(() => calculateOptimalBudget(historicalData, params), [historicalData, params]);
  const maxCPA = useMemo(() => calculateMaxCPA(params), [params]);
  const refundCohorts = useMemo(() => projectRefundCohorts(params, simulation), [params, simulation]);

  return (
    <div className="space-y-4">
      {/* Max CPA Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-[11px] text-muted-foreground">CPA Máx. Sustentável</span>
            </div>
            <p className="text-base font-bold">{fmt(maxCPA.maxCPA)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">CPA Atual</span>
            </div>
            <p className={`text-base font-bold ${maxCPA.margin > 0 ? "text-green-500" : "text-destructive"}`}>{fmt(maxCPA.currentCPA)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Margem de Segurança</span>
            </div>
            <Badge variant={maxCPA.margin > 20 ? "default" : maxCPA.margin > 0 ? "outline" : "destructive"}>
              {maxCPA.margin.toFixed(0)}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Budget Allocation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            Alocação Ótima de Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetAllocations} margin={{ left: -10, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="scenario" tick={{ fontSize: 8 }} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v.toFixed(0)}%`} width={35} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="expectedROI" name="ROI Esperado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Refund Cohorts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Projeção de Reembolsos por Cohort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {refundCohorts.map((c, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2 rounded-md bg-muted/30">
                <span className="text-xs font-medium sm:w-20">{c.period}</span>
                <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive/50 rounded-full"
                    style={{ width: `${Math.min((c.expectedRefunds / (refundCohorts[0]?.expectedRefunds || 1)) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between sm:justify-end gap-2">
                  <span className="text-[10px] text-muted-foreground">{c.expectedRefunds} reemb.</span>
                  <span className="text-[10px] font-medium">{fmt(c.refundAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
