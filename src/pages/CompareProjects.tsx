import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useCompareMetrics, type ProjectCompareMetrics } from "@/hooks/useCompareMetrics";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { formatBRL, formatPercent, formatNumber } from "@/lib/formatters";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckSquare, Square } from "lucide-react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 80%, 60%)"];

const STRATEGY_LABELS: Record<string, string> = {
  perpetuo: "Perpétuo",
  lancamento: "Lançamento",
  lancamento_pago: "Lançamento_pago",
  funis: "Funis",
};

export default function CompareProjects() {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const selectedProjects = useMemo(
    () =>
      (projects || [])
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({ id: p.id, name: p.name, strategy: p.strategy })),
    [projects, selectedIds]
  );

  const metrics = useCompareMetrics(selectedProjects, dateRange);
  const isAnyLoading = metrics.some((m) => m.isLoading);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bar chart data
  const barData = useMemo(
    () =>
      metrics.map((m) => ({
        name: m.projectName.length > 25 ? m.projectName.slice(0, 22) + "..." : m.projectName,
        "ROI (%)": parseFloat(m.roi.toFixed(2)),
        "Investimento (R$)": m.investment,
        "Receita (R$)": m.revenue,
      })),
    [metrics]
  );

  // Radar chart data — normalize values 0-100
  const radarData = useMemo(() => {
    if (metrics.length === 0) return [];
    const dims = ["roi", "revenue", "salesCount", "clicks", "results"] as const;
    const labels: Record<string, string> = {
      roi: "ROI",
      revenue: "Receita",
      salesCount: "Vendas",
      clicks: "Cliques",
      results: "Resultados",
    };
    const maxVals = dims.reduce(
      (acc, dim) => {
        acc[dim] = Math.max(...metrics.map((m) => Math.abs(m[dim])), 1);
        return acc;
      },
      {} as Record<string, number>
    );
    return dims.map((dim) => {
      const point: any = { metric: labels[dim] };
      metrics.forEach((m) => {
        point[m.projectName] = parseFloat(((Math.abs(m[dim]) / maxVals[dim]) * 100).toFixed(1));
      });
      return point;
    });
  }, [metrics]);

  if (projectsLoading) {
    return (
      <AnimatedPage className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/projects")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar ao Hub
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Comparar Projetos</h1>
            <p className="text-sm text-muted-foreground">Compare métricas de performance entre múltiplos projetos</p>
          </div>
        </div>
      </div>

      {/* Project selection */}
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  ⊕ Selecionar Projetos para Comparação
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Selecione 2 ou mais projetos para comparar suas métricas</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Período:</span>
                <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {(projects || []).map((p) => {
                const selected = selectedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {selected ? (
                      <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{STRATEGY_LABELS[p.strategy] || p.strategy}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Results */}
      {selectedIds.size >= 2 && (
        <>
          {/* Comparison table */}
          <AnimatedCard index={1}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  💲 Tabela Comparativa de Métricas
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {isAnyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Projeto</TableHead>
                        <TableHead className="text-right">ROI (%)</TableHead>
                        <TableHead className="text-right">Investimento</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Resultado</TableHead>
                        <TableHead className="text-right">Custo/Resultado</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">CTR (%)</TableHead>
                        <TableHead className="text-right">CPC</TableHead>
                        <TableHead className="text-right">Connect Rate (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((m) => (
                        <TableRow key={m.projectId}>
                          <TableCell className="font-medium text-sm">{m.projectName}</TableCell>
                          <TableCell className={`text-right font-semibold ${m.roi >= 0 ? "text-success" : "text-destructive"}`}>
                            {formatPercent(m.roi, 2)}
                          </TableCell>
                          <TableCell className="text-right">{formatBRL(m.investment)}</TableCell>
                          <TableCell className={`text-right font-semibold ${m.revenue > 0 ? "text-success" : "text-destructive"}`}>
                            {formatBRL(m.revenue)}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(m.salesCount)}</TableCell>
                          <TableCell className={`text-right ${m.results > 0 ? "text-success" : "text-destructive"}`}>
                            {formatNumber(m.results)}
                          </TableCell>
                          <TableCell className="text-right">{formatBRL(m.costPerResult)}</TableCell>
                          <TableCell className={`text-right ${m.clicks > 0 ? "text-success" : "text-destructive"}`}>
                            {formatNumber(m.clicks)}
                          </TableCell>
                          <TableCell className="text-right">{formatPercent(m.ctr, 2)}</TableCell>
                          <TableCell className="text-right">{formatBRL(m.cpc)}</TableCell>
                          <TableCell className={`text-right ${m.connectRate > 0 ? "text-success" : ""}`}>
                            {formatPercent(m.connectRate, 2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Charts */}
          {!isAnyLoading && metrics.length >= 2 && (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {/* Bar chart */}
              <AnimatedCard index={2}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      📈 Comparação de ROI, Investimento e Receita
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "13px",
                          }}
                          formatter={(v: number, name: string) =>
                            name.includes("R$") ? formatBRL(v) : `${v}%`
                          }
                        />
                        <Legend />
                        <Bar dataKey="ROI (%)" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Investimento (R$)" fill="hsl(0, 70%, 55%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Receita (R$)" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Radar chart */}
              <AnimatedCard index={3}>
                <Card>
                  <CardHeader className="pb-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        ⊙ Análise Multidimensional
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Comparação normalizada de múltiplas métricas</p>
                    </div>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <PolarRadiusAxis stroke="hsl(var(--border))" fontSize={10} />
                        {metrics.map((m, i) => (
                          <Radar
                            key={m.projectId}
                            name={m.projectName}
                            dataKey={m.projectName}
                            stroke={COLORS[i % COLORS.length]}
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "13px",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          )}
        </>
      )}

      {selectedIds.size > 0 && selectedIds.size < 2 && (
        <Card>
          <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
            Selecione pelo menos 2 projetos para comparar.
          </CardContent>
        </Card>
      )}
    </AnimatedPage>
  );
}
