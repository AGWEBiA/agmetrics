import { useParams, Navigate } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrazilStateMap } from "@/components/BrazilStateMap";
import {
  DollarSign,
  ShoppingCart,
  CalendarDays,
  Clock,
  MapPin,
  Wallet,
  TrendingUp,
  Package,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useState } from "react";
import type { DateFilter } from "@/types/database";

const ALLOWED_STRATEGIES = ["perpetuo", "funis", "evento_presencial", "lancamento_pago"];

export default function PerpetualPanel() {
  const { projectId } = useParams();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { globalFilters } = useGlobalFilters();
  const [dateFilter, setDateFilter] = useState<DateFilter>({});

  const metrics = useDashboardMetrics(
    projectId,
    dateFilter,
    project?.strategy,
    globalFilters
  );

  if (projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!project || !ALLOWED_STRATEGIES.includes(project.strategy)) {
    return <Navigate to={`/admin/projects/${projectId}/dashboard`} replace />;
  }

  const { grossRevenue, salesCount, producerRevenue, productData, salesByDayOfWeek, salesByHour, bestDay, bestHour, buyerLocationData } = metrics;

  // Top 15 cities from sales
  const cityMap = new Map<string, { count: number; revenue: number }>();
  const approvedSales = (metrics as any).kiwifySales?.concat((metrics as any).hotmartSales) || [];
  // We already have buyerLocationData (states). For cities, derive from raw sales if available.
  // Use the hook's internal data - buyerLocationData is states. Let's also build city data.

  // Top 5 days of week sorted
  const topDays = [...salesByDayOfWeek].sort((a, b) => b.vendas - a.vendas).filter(d => d.vendas > 0).slice(0, 5);
  // Top 5 hours sorted
  const topHours = [...salesByHour].sort((a, b) => b.vendas - a.vendas).filter(h => h.vendas > 0).slice(0, 5);
  // Top 15 states
  const topStates = buyerLocationData.slice(0, 15);

  const strategyLabel: Record<string, string> = {
    perpetuo: "Perpétuo",
    funis: "Funis",
    evento_presencial: "Evento Presencial",
    lancamento_pago: "Lançamento Pago",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Painel do Perpétuo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada de vendas • {strategyLabel[project.strategy] || project.strategy}
          </p>
        </div>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Receita Bruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(grossRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Valor total das vendas (bruto)</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              Número de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(salesCount)}</p>
            <p className="text-xs text-muted-foreground mt-1">Vendas aprovadas no período</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-500" />
              Receita do Produtor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(producerRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Líquido que fica para o produtor</p>
          </CardContent>
        </Card>
      </div>

      {/* Product breakdown */}
      {productData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Vendas por Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productData.sort((a, b) => b.count - a.count).map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{p.name}</span>
                      {p.type && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {p.type === "main" ? "Principal" : p.type === "order_bump" ? "Order Bump" : p.type === "upsell" ? "Upsell" : p.type}
                        </Badge>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(p.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{p.count} vendas</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best days & hours */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Melhores Dias de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
            ) : (
              <div className="space-y-2">
                {topDays.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      <span className="font-medium text-sm">{d.name}</span>
                      {i === 0 && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Top</Badge>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{d.vendas} vendas</span>
                      <span className="text-xs text-muted-foreground ml-2">{formatCurrency(d.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Melhores Horários de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topHours.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
            ) : (
              <div className="space-y-2">
                {topHours.map((h, i) => (
                  <div key={h.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      <span className="font-medium text-sm">{h.name}</span>
                      {i === 0 && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Top</Badge>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{h.vendas} vendas</span>
                      <span className="text-xs text-muted-foreground ml-2">{formatCurrency(h.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geographic mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Mapeamento por Região (Top 15)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Map */}
            <div className="flex items-center justify-center">
              <BrazilStateMap data={topStates.map(s => ({ name: s.name, value: s.count }))} />
            </div>

            {/* Table */}
            <div>
              {topStates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de localização</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[2rem_1fr_5rem_6rem_4rem] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b">
                    <span>#</span>
                    <span>Estado</span>
                    <span className="text-right">Vendas</span>
                    <span className="text-right">Receita</span>
                    <span className="text-right">%</span>
                  </div>
                  {topStates.map((s, i) => (
                    <div key={s.name} className="grid grid-cols-[2rem_1fr_5rem_6rem_4rem] gap-2 text-sm items-center py-1">
                      <span className="text-xs text-muted-foreground font-bold">{i + 1}</span>
                      <span className="font-medium truncate">{s.name}</span>
                      <span className="text-right">{s.count}</span>
                      <span className="text-right text-xs">{formatCurrency(s.revenue)}</span>
                      <span className="text-right text-xs text-muted-foreground">{s.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
