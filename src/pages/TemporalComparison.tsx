import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useProject } from "@/hooks/useProjects";
import { formatBRL, formatPercent } from "@/lib/formatters";
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type CompareMode = "wow" | "mom" | "7d" | "14d" | "30d";

function getComparisonPeriods(mode: CompareMode) {
  const now = new Date();
  switch (mode) {
    case "wow": {
      const thisStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisEnd = now;
      const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return { current: { from: thisStart, to: thisEnd }, previous: { from: prevStart, to: prevEnd }, labels: ["Semana passada", "Esta semana"] };
    }
    case "mom": {
      const thisStart = startOfMonth(now);
      const thisEnd = now;
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));
      return { current: { from: thisStart, to: thisEnd }, previous: { from: prevStart, to: prevEnd }, labels: ["Mês passado", "Este mês"] };
    }
    case "7d": {
      const currentFrom = subDays(now, 7);
      const prevFrom = subDays(now, 14);
      const prevTo = subDays(now, 8);
      return { current: { from: currentFrom, to: now }, previous: { from: prevFrom, to: prevTo }, labels: ["7d anteriores", "Últimos 7d"] };
    }
    case "14d": {
      const currentFrom = subDays(now, 14);
      const prevFrom = subDays(now, 28);
      const prevTo = subDays(now, 15);
      return { current: { from: currentFrom, to: now }, previous: { from: prevFrom, to: prevTo }, labels: ["14d anteriores", "Últimos 14d"] };
    }
    case "30d": {
      const currentFrom = subDays(now, 30);
      const prevFrom = subDays(now, 60);
      const prevTo = subDays(now, 31);
      return { current: { from: currentFrom, to: now }, previous: { from: prevFrom, to: prevTo }, labels: ["30d anteriores", "Últimos 30d"] };
    }
  }
}

function DeltaIndicator({ current, previous, format: fmt }: { current: number; previous: number; format: "currency" | "percent" | "number" }) {
  if (previous === 0 && current === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const delta = previous === 0 ? 100 : ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < 1;

  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isNeutral ? "text-muted-foreground" : isPositive ? "text-green-600" : "text-red-500"}`}>
      {isNeutral ? <Minus className="h-4 w-4" /> : isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      {formatPercent(Math.abs(delta))}
    </div>
  );
}

export default function TemporalComparison() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const [mode, setMode] = useState<CompareMode>("7d");

  const periods = useMemo(() => getComparisonPeriods(mode), [mode]);

  const currentMetrics = useDashboardMetrics(projectId, periods.current, project?.strategy);
  const previousMetrics = useDashboardMetrics(projectId, periods.previous, project?.strategy);

  const isLoading = currentMetrics.isLoading || previousMetrics.isLoading;

  const comparisons = [
    { label: "Receita", current: currentMetrics.totalRevenue, previous: previousMetrics.totalRevenue, fmt: "currency" as const },
    { label: "Vendas", current: currentMetrics.salesCount, previous: previousMetrics.salesCount, fmt: "number" as const },
    { label: "Investimento", current: currentMetrics.totalInvestment, previous: previousMetrics.totalInvestment, fmt: "currency" as const },
    { label: "ROI", current: currentMetrics.roi, previous: previousMetrics.roi, fmt: "percent" as const },
    { label: "Leads", current: currentMetrics.totalLeads, previous: previousMetrics.totalLeads, fmt: "number" as const },
    { label: "CPL", current: currentMetrics.avgCpl, previous: previousMetrics.avgCpl, fmt: "currency" as const },
    { label: "Ticket Médio", current: currentMetrics.avgTicket, previous: previousMetrics.avgTicket, fmt: "currency" as const },
    { label: "Conversão", current: currentMetrics.conversionRate, previous: previousMetrics.conversionRate, fmt: "percent" as const },
  ];

  const chartData = comparisons.map((c) => ({
    name: c.label,
    [periods.labels[0]]: c.previous,
    [periods.labels[1]]: c.current,
  }));

  const formatValue = (value: number, fmt: "currency" | "percent" | "number") => {
    if (fmt === "currency") return formatBRL(value);
    if (fmt === "percent") return formatPercent(value);
    return String(Math.round(value));
  };

  const modeLabels: Record<CompareMode, string> = {
    wow: "Semana vs Semana",
    mom: "Mês vs Mês",
    "7d": "Últimos 7d vs 7d anteriores",
    "14d": "Últimos 14d vs 14d anteriores",
    "30d": "Últimos 30d vs 30d anteriores",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Comparação Temporal
          </h1>
          <p className="text-sm text-muted-foreground">Compare o desempenho entre períodos</p>
        </div>
        <Select value={mode} onValueChange={(v: CompareMode) => setMode(v)}>
          <SelectTrigger className="w-[220px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias vs 7 dias</SelectItem>
            <SelectItem value="14d">14 dias vs 14 dias</SelectItem>
            <SelectItem value="30d">30 dias vs 30 dias</SelectItem>
            <SelectItem value="wow">Semana vs Semana</SelectItem>
            <SelectItem value="mom">Mês vs Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Badge variant="outline" className="text-xs">
        {modeLabels[mode]}
      </Badge>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando métricas...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {comparisons.map((c) => (
              <Card key={c.label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold">{formatValue(c.current, c.fmt)}</span>
                    <DeltaIndicator current={c.current} previous={c.previous} format={c.fmt} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Anterior: {formatValue(c.previous, c.fmt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativo Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData.filter((d) => d.name !== "ROI" && d.name !== "Conversão" && d.name !== "CPL")}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Bar dataKey={periods.labels[0]} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                  <Bar dataKey={periods.labels[1]} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
