import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatters";
import {
  Brain, Loader2, TrendingUp, TrendingDown, Minus, Sparkles,
  Calendar, DollarSign, ShoppingCart, Target
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from "recharts";

interface ForecastData {
  historical: { date: string; revenue: number; sales: number; investment: number }[];
  forecast: { date: string; revenue: number; sales: number; investment: number; confidence: number }[];
  summary: {
    projected_revenue: number;
    projected_sales: number;
    projected_roi: number;
    trend: "up" | "down" | "stable";
    confidence: number;
    insights: string[];
  };
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, label: "Alta", color: "text-green-500" },
  down: { icon: TrendingDown, label: "Queda", color: "text-destructive" },
  stable: { icon: Minus, label: "Estável", color: "text-muted-foreground" },
};

export default function ForecastPage() {
  const { projectId } = useParams();
  const [days, setDays] = useState("14");
  const [data, setData] = useState<ForecastData | null>(null);

  const forecastMutation = useMutation({
    mutationFn: async () => {
      const { data: result, error } = await supabase.functions.invoke("ai-forecast", {
        body: { project_id: projectId, days: parseInt(days) },
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result as ForecastData;
    },
    onSuccess: (result) => setData(result),
  });

  // Combined chart data
  const chartData = data ? [
    ...data.historical.slice(-30).map(d => ({
      date: d.date.slice(5), // MM-DD
      receita: d.revenue,
      vendas: d.sales,
      tipo: "histórico" as const,
    })),
    ...data.forecast.map(d => ({
      date: d.date.slice(5),
      receita_prev: d.revenue,
      vendas_prev: d.sales,
      tipo: "previsão" as const,
    })),
  ] : [];

  const TrendIcon = data ? TREND_CONFIG[data.summary.trend].icon : Minus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Forecasting com IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Projeções de receita, vendas e ROI baseadas em inteligência artificial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 dias</SelectItem>
              <SelectItem value="14">Próximos 14 dias</SelectItem>
              <SelectItem value="30">Próximos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => forecastMutation.mutate()}
            disabled={forecastMutation.isPending}
          >
            {forecastMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Gerar Previsão
          </Button>
        </div>
      </div>

      {forecastMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            {(forecastMutation.error as Error).message}
          </CardContent>
        </Card>
      )}

      {!data && !forecastMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Brain className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Previsão Inteligente</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              A IA analisa seu histórico de vendas, investimentos e leads para projetar 
              os próximos dias com base em tendências, sazonalidade e momentum.
            </p>
            <Button onClick={() => forecastMutation.mutate()}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Primeira Previsão
            </Button>
          </CardContent>
        </Card>
      )}

      {forecastMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Analisando dados e gerando previsão...</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Receita Projetada</p>
                </div>
                <p className="text-lg font-bold">{formatBRL(data.summary.projected_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Vendas Projetadas</p>
                </div>
                <p className="text-lg font-bold">{formatNumber(data.summary.projected_sales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ROI Projetado</p>
                </div>
                <p className="text-lg font-bold">{formatPercent(data.summary.projected_roi)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendIcon className={`h-3 w-3 ${TREND_CONFIG[data.summary.trend].color}`} />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tendência</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{TREND_CONFIG[data.summary.trend].label}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {(data.summary.confidence * 100).toFixed(0)}% confiança
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Receita — Histórico + Previsão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Receita Real"
                    />
                    <Area
                      type="monotone"
                      dataKey="receita_prev"
                      stroke="hsl(var(--chart-2))"
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Previsão"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Vendas — Histórico + Previsão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="vendas"
                      stroke="hsl(152, 60%, 42%)"
                      strokeWidth={2}
                      dot={false}
                      name="Vendas Reais"
                    />
                    <Line
                      type="monotone"
                      dataKey="vendas_prev"
                      stroke="hsl(38, 92%, 50%)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Previsão"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          {data.summary.insights && data.summary.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Insights da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.summary.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Daily Forecast Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Previsão Detalhada por Dia</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-right py-2 px-2">Receita</th>
                    <th className="text-right py-2 px-2">Vendas</th>
                    <th className="text-right py-2 px-2">Investimento</th>
                    <th className="text-right py-2 px-2">Confiança</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.map(day => (
                    <tr key={day.date} className="border-b border-border/50">
                      <td className="py-1.5 px-2 font-medium">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="py-1.5 px-2 text-right">{formatBRL(day.revenue)}</td>
                      <td className="py-1.5 px-2 text-right">{formatNumber(day.sales)}</td>
                      <td className="py-1.5 px-2 text-right">{formatBRL(day.investment)}</td>
                      <td className="py-1.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(day.confidence * 100)}%` }}
                            />
                          </div>
                          <span>{(day.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
