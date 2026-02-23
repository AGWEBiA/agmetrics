import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedCard } from "@/components/AnimatedCard";
import { formatBRL, formatPercent, formatNumber, formatDecimal } from "@/lib/formatters";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from "recharts";

const COLORS = ["hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

interface AdsVendasCrossTabProps {
  m: any;
  strategy?: string;
}

export function AdsVendasCrossTab({ m, strategy }: AdsVendasCrossTabProps) {
  const isPerpetuo = strategy === "perpetuo";
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  // Build daily cross-data: merge ads metrics + sales by date
  const crossData = useMemo(() => {
    const dailyMap = new Map<string, {
      date: string;
      metaSpend: number; googleSpend: number; totalSpend: number;
      metaClicks: number; googleClicks: number;
      metaImpressions: number; googleImpressions: number;
      metaLeads: number; googleLeads: number;
      metaPurchases: number;
      salesCount: number; revenue: number;
      kiwifySales: number; hotmartSales: number;
      kiwifyRevenue: number; hotmartRevenue: number;
    }>();

    const getOrCreate = (date: string) => {
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date, metaSpend: 0, googleSpend: 0, totalSpend: 0,
          metaClicks: 0, googleClicks: 0,
          metaImpressions: 0, googleImpressions: 0,
          metaLeads: 0, googleLeads: 0, metaPurchases: 0,
          salesCount: 0, revenue: 0,
          kiwifySales: 0, hotmartSales: 0,
          kiwifyRevenue: 0, hotmartRevenue: 0,
        });
      }
      return dailyMap.get(date)!;
    };

    // Meta metrics
    (m.metaMetrics || []).forEach((met: any) => {
      const d = getOrCreate(met.date);
      d.metaSpend += Number(met.investment || 0);
      d.totalSpend += Number(met.investment || 0);
      d.metaClicks += Number(met.clicks || 0);
      d.metaImpressions += Number(met.impressions || 0);
      d.metaLeads += Number(met.leads || 0);
      d.metaPurchases += Number(met.purchases || 0);
    });

    // Google metrics
    (m.googleMetrics || []).forEach((met: any) => {
      const d = getOrCreate(met.date);
      d.googleSpend += Number(met.investment || 0);
      d.totalSpend += Number(met.investment || 0);
      d.googleClicks += Number(met.clicks || 0);
      d.googleImpressions += Number(met.impressions || 0);
      d.googleLeads += Number(met.conversions || 0);
    });

    // Sales
    const allSales = [...(m.kiwifySales || []), ...(m.hotmartSales || [])];
    allSales.forEach((s: any) => {
      const dateStr = (s.sale_date || s.created_at || "").split("T")[0];
      if (!dateStr) return;
      const d = getOrCreate(dateStr);
      d.salesCount++;
      d.revenue += Number(s.amount || 0);
      if (s.platform === "kiwify") { d.kiwifySales++; d.kiwifyRevenue += Number(s.amount || 0); }
      if (s.platform === "hotmart") { d.hotmartSales++; d.hotmartRevenue += Number(s.amount || 0); }
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        dateLabel: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        roi: d.totalSpend > 0 ? ((d.revenue - d.totalSpend) / d.totalSpend) * 100 : 0,
        roas: d.totalSpend > 0 ? d.revenue / d.totalSpend : 0,
        cpa: d.salesCount > 0 ? d.totalSpend / d.salesCount : 0,
      }));
  }, [m.metaMetrics, m.googleMetrics, m.kiwifySales, m.hotmartSales]);

  // Filtered data
  const filteredData = useMemo(() => {
    if (platformFilter === "all") return crossData;
    return crossData.map((d) => {
      if (platformFilter === "kiwify") return { ...d, salesCount: d.kiwifySales, revenue: d.kiwifyRevenue };
      if (platformFilter === "hotmart") return { ...d, salesCount: d.hotmartSales, revenue: d.hotmartRevenue };
      return d;
    });
  }, [crossData, platformFilter]);

  // Aggregate metrics
  const totals = useMemo(() => {
    const t = filteredData.reduce(
      (acc, d) => ({
        spend: acc.spend + d.totalSpend,
        revenue: acc.revenue + d.revenue,
        sales: acc.sales + d.salesCount,
        metaSpend: acc.metaSpend + d.metaSpend,
        googleSpend: acc.googleSpend + d.googleSpend,
        kiwifySales: acc.kiwifySales + d.kiwifySales,
        hotmartSales: acc.hotmartSales + d.hotmartSales,
        kiwifyRevenue: acc.kiwifyRevenue + d.kiwifyRevenue,
        hotmartRevenue: acc.hotmartRevenue + d.hotmartRevenue,
        clicks: acc.clicks + d.metaClicks + d.googleClicks,
        impressions: acc.impressions + d.metaImpressions + d.googleImpressions,
        leads: acc.leads + d.metaLeads + d.googleLeads,
      }),
      { spend: 0, revenue: 0, sales: 0, metaSpend: 0, googleSpend: 0, kiwifySales: 0, hotmartSales: 0, kiwifyRevenue: 0, hotmartRevenue: 0, clicks: 0, impressions: 0, leads: 0 }
    );
    const roi = t.spend > 0 ? ((t.revenue - t.spend) / t.spend) * 100 : 0;
    const roas = t.spend > 0 ? t.revenue / t.spend : 0;
    const cpa = t.sales > 0 ? t.spend / t.sales : 0;
    const convRate = isPerpetuo
      ? (t.clicks > 0 ? (t.sales / t.clicks) * 100 : 0)
      : (t.leads > 0 ? (t.sales / t.leads) * 100 : 0);
    return { ...t, roi, roas, cpa, convRate };
  }, [filteredData]);

  // Platform comparison data
  const platformComparison = useMemo(() => [
    {
      platform: "Kiwify",
      vendas: totals.kiwifySales,
      receita: totals.kiwifyRevenue,
      ticketMedio: totals.kiwifySales > 0 ? totals.kiwifyRevenue / totals.kiwifySales : 0,
      pctVendas: totals.sales > 0 ? (totals.kiwifySales / totals.sales) * 100 : 0,
      pctReceita: totals.revenue > 0 ? (totals.kiwifyRevenue / totals.revenue) * 100 : 0,
    },
    {
      platform: "Hotmart",
      vendas: totals.hotmartSales,
      receita: totals.hotmartRevenue,
      ticketMedio: totals.hotmartSales > 0 ? totals.hotmartRevenue / totals.hotmartSales : 0,
      pctVendas: totals.sales > 0 ? (totals.hotmartSales / totals.sales) * 100 : 0,
      pctReceita: totals.revenue > 0 ? (totals.hotmartRevenue / totals.revenue) * 100 : 0,
    },
  ], [totals]);

  // Ads platform ROI
  const adsComparison = useMemo(() => {
    const metaRoi = totals.metaSpend > 0 ? ((totals.revenue - totals.metaSpend) / totals.metaSpend) * 100 : 0;
    const googleRoi = totals.googleSpend > 0 ? ((totals.revenue - totals.googleSpend) / totals.googleSpend) * 100 : 0;
    return [
      { name: "Meta Ads", investimento: totals.metaSpend, roi: metaRoi },
      { name: "Google Ads", investimento: totals.googleSpend, roi: googleRoi },
    ].filter((d) => d.investimento > 0);
  }, [totals]);

  // Top performing days
  const topDays = useMemo(() =>
    [...filteredData]
      .filter((d) => d.salesCount > 0)
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5),
  [filteredData]);

  // Funnel data — perpétuo skips "Leads" step
  const funnelData = useMemo(() => {
    const steps = [
      { name: "Impressões", value: totals.impressions },
      { name: "Cliques", value: totals.clicks },
    ];
    if (!isPerpetuo) {
      steps.push({ name: "Leads", value: totals.leads });
    }
    steps.push({ name: "Vendas", value: totals.sales });
    return steps;
  }, [totals, isPerpetuo]);

  if (crossData.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          Nenhum dado de anúncios ou vendas encontrado para cruzamento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Plataforma de pagamento:</span>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="kiwify">Kiwify</SelectItem>
            <SelectItem value="hotmart">Hotmart</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <AnimatedCard index={0}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Investimento</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatBRL(totals.spend)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={1}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Receita</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-success">{formatBRL(totals.revenue)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={2}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">ROI</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${totals.roi >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(totals.roi)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={3}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">ROAS</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatDecimal(totals.roas)}x</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={4}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">CPA</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatBRL(totals.cpa)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={5}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversão</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatPercent(totals.convRate)}</p>
              <p className="text-[10px] text-muted-foreground">{isPerpetuo ? "Cliques → Vendas" : "Leads → Vendas"}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Investment vs Revenue Chart */}
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">📊 Investimento vs Receita (diário)</CardTitle>
            <p className="text-xs text-muted-foreground">Comparação diária entre gasto em ads e receita de vendas</p>
          </CardHeader>
          <CardContent className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dateLabel" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="totalSpend" name="Investimento" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Line type="monotone" dataKey="revenue" name="Receita" stroke="hsl(152, 60%, 42%)" strokeWidth={2.5} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* ROI Trend */}
      <AnimatedCard index={1}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">📈 Tendência de ROI</CardTitle>
            <p className="text-xs text-muted-foreground">Evolução do retorno sobre investimento ao longo do tempo</p>
          </CardHeader>
          <CardContent className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData.filter((d) => d.totalSpend > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dateLabel" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip cursor={false} formatter={(v: number) => formatPercent(v)} contentStyle={tooltipStyle} />
                <defs>
                  <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="roi" name="ROI" stroke="hsl(220, 90%, 56%)" strokeWidth={2} fill="url(#roiGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </AnimatedCard>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Platform Comparison */}
        <AnimatedCard index={2}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">🔄 Comparativo por Plataforma de Pagamento</CardTitle>
              <p className="text-xs text-muted-foreground">Kiwify vs Hotmart</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plataforma</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformComparison.map((p) => (
                    <TableRow key={p.platform}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{p.platform}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(p.vendas)}</TableCell>
                      <TableCell className="text-right">{formatBRL(p.receita)}</TableCell>
                      <TableCell className="text-right">{formatBRL(p.ticketMedio)}</TableCell>
                      <TableCell className="text-right">{formatPercent(p.pctReceita)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Ads Platform ROI */}
        {adsComparison.length > 0 && (
          <AnimatedCard index={3}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">🎯 ROI por Plataforma de Anúncio</CardTitle>
                <p className="text-xs text-muted-foreground">Retorno de cada canal de aquisição</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {adsComparison.map((ad, i) => (
                  <div key={ad.name} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{ad.name}</span>
                      <span className={`text-lg font-bold ${ad.roi >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatPercent(ad.roi)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Investido: {formatBRL(ad.investimento)}</span>
                      <span>Receita atribuída: {formatBRL(totals.revenue)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </AnimatedCard>
        )}
      </div>

      {/* Funnel */}
      <AnimatedCard index={4}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">🔽 Funil Ads → Vendas</CardTitle>
            <p className="text-xs text-muted-foreground">Conversão em cada etapa do funil</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {funnelData.map((step, i) => {
                const prevValue = i > 0 ? funnelData[i - 1].value : 0;
                const convRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;
                return (
                  <div key={step.name} className="text-center rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-1">{step.name}</p>
                    <p className="text-2xl font-bold">{formatNumber(step.value)}</p>
                    {i > 0 && prevValue > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ↓ {formatPercent(convRate)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Sales by Platform Over Time */}
      <AnimatedCard index={5}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">📆 Vendas por Plataforma ao Longo do Tempo</CardTitle>
            <p className="text-xs text-muted-foreground">Tendência de vendas Kiwify vs Hotmart</p>
          </CardHeader>
          <CardContent className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crossData.filter((d) => d.salesCount > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dateLabel" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip cursor={false} contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="kiwifySales" name="Kiwify" fill={COLORS[0]} radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="hotmartSales" name="Hotmart" fill={COLORS[1]} radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Top Performing Days */}
      {topDays.length > 0 && (
        <AnimatedCard index={6}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">🏆 Dias Mais Rentáveis</CardTitle>
              <p className="text-xs text-muted-foreground">Top 5 dias com melhor ROI</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDays.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">{d.dateLabel}</TableCell>
                      <TableCell className="text-right">{formatBRL(d.totalSpend)}</TableCell>
                      <TableCell className="text-right text-success">{formatBRL(d.revenue)}</TableCell>
                      <TableCell className="text-right">{d.salesCount}</TableCell>
                      <TableCell className={`text-right font-semibold ${d.roi >= 0 ? "text-success" : "text-destructive"}`}>{formatPercent(d.roi)}</TableCell>
                      <TableCell className="text-right">{formatDecimal(d.roas)}x</TableCell>
                      <TableCell className="text-right">{formatBRL(d.cpa)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}
    </div>
  );
}
