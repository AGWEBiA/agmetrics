import { useMemo } from "react";
import { AnimatedCard } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL, formatPercent } from "@/lib/formatters";
import { COLORS, TOOLTIP_STYLE } from "./constants";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface BudgetSectionProps {
  project: any;
  totalInvestment: number;
  metaMetrics: any[];
  googleMetrics: any[];
}

export interface BudgetData {
  budget: number;
  spent: number;
  available: number;
  usePct: number;
  dailyAvg: number;
  daysRemaining: number | null;
  exhaustionDate: Date | null;
  chartData: { date: string; real: number; projecao?: number }[];
  periodDays: number;
  dailyBudgetTarget: number;
}

export function useBudgetData(project: any, totalInvestment: number, metaMetrics: any[], googleMetrics: any[]): BudgetData | null {
  return useMemo(() => {
    const budget = Number(project?.budget || 0);
    if (budget <= 0) return null;
    const spent = totalInvestment;
    const available = Math.max(0, budget - spent);
    const usePct = budget > 0 ? (spent / budget) * 100 : 0;
    const strategy = project?.strategy;
    const isLaunch = strategy === "lancamento" || strategy === "lancamento_pago";
    let periodDays = 30;
    if (isLaunch && project?.start_date && project?.end_date) {
      const start = new Date(project.start_date);
      const end = new Date(project.end_date);
      periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
    }
    const dailySpending = new Map<string, number>();
    (metaMetrics || []).forEach((met: any) => {
      dailySpending.set(met.date, (dailySpending.get(met.date) || 0) + Number(met.investment || 0));
    });
    (googleMetrics || []).forEach((met: any) => {
      dailySpending.set(met.date, (dailySpending.get(met.date) || 0) + Number(met.investment || 0));
    });
    const sortedDays = Array.from(dailySpending.entries()).sort(([a], [b]) => a.localeCompare(b));
    const daysWithSpending = sortedDays.filter(([, v]) => v > 0).length;
    const dailyAvg = daysWithSpending > 0 ? spent / daysWithSpending : 0;
    let daysRemaining: number | null = null;
    let exhaustionDate: Date | null = null;
    if (isLaunch && project?.end_date) {
      const end = new Date(project.end_date);
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
      exhaustionDate = end;
    } else {
      daysRemaining = dailyAvg > 0 ? Math.ceil(available / dailyAvg) : null;
      exhaustionDate = daysRemaining ? new Date(Date.now() + daysRemaining * 86400000) : null;
    }
    const dailyBudgetTarget = periodDays > 0 ? budget / periodDays : 0;
    let cumulative = 0;
    const chartData: { date: string; real: number; projecao?: number }[] = [];
    sortedDays.forEach(([date, val]) => {
      cumulative += val;
      chartData.push({ date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "numeric" }), real: cumulative });
    });
    const maxProjectionDays = isLaunch ? (daysRemaining ?? 0) : Math.min(daysRemaining || 60, 60);
    if (dailyAvg > 0 && chartData.length > 0 && maxProjectionDays > 0) {
      let projCum = cumulative;
      const lastDate = new Date(sortedDays[sortedDays.length - 1][0]);
      for (let i = 1; i <= maxProjectionDays; i++) {
        const d = new Date(lastDate.getTime() + i * 86400000);
        projCum += dailyAvg;
        if (projCum > budget * 1.1) break;
        chartData.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "numeric" }), real: undefined as any, projecao: projCum });
      }
    }
    return { budget, spent, available, usePct, dailyAvg, daysRemaining, exhaustionDate, chartData, periodDays, dailyBudgetTarget };
  }, [project, totalInvestment, metaMetrics, googleMetrics]);
}

export function BudgetSection({ budgetData }: { budgetData: BudgetData }) {
  return (
    <AnimatedCard index={0}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">💲 Orçamento Provisionado</CardTitle>
          <p className="text-xs text-muted-foreground">Acompanhe o uso do orçamento total do projeto</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Uso do Orçamento</span>
              <span className={budgetData.usePct > 90 ? "text-destructive font-semibold" : budgetData.usePct > 70 ? "text-warning font-semibold" : "text-success font-semibold"}>
                {formatPercent(budgetData.usePct)}
              </span>
            </div>
            <Progress value={Math.min(budgetData.usePct, 100)} className="h-3" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><p className="text-muted-foreground">Provisionado</p><p className="text-lg font-bold">{formatBRL(budgetData.budget)}</p></div>
            <div><p className="text-muted-foreground">Gasto</p><p className="text-lg font-bold text-destructive">{formatBRL(budgetData.spent)}</p></div>
            <div><p className="text-muted-foreground">Disponível</p><p className="text-lg font-bold text-success">{formatBRL(budgetData.available)}</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">📊 Média Diária</p><p className="text-lg font-bold">{formatBRL(budgetData.dailyAvg)}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">📅 Dias Restantes</p><p className="text-lg font-bold text-warning">~{budgetData.daysRemaining ?? "∞"} dias</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">📅 Esgotamento</p><p className="text-lg font-bold">{budgetData.exhaustionDate ? budgetData.exhaustionDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p></div>
          </div>
          {budgetData.chartData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={budgetData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Line type="monotone" dataKey="real" name="Gasto Real" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                  <Line type="monotone" dataKey="projecao" name="Projeção" stroke="hsl(38, 92%, 50%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}
