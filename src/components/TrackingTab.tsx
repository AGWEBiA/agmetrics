import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatBRL, formatPercent, formatNumber, formatDecimal } from "@/lib/formatters";
import { AnimatedCard } from "@/components/AnimatedCard";
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(265, 80%, 60%)", "hsl(220, 90%, 56%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)"];

interface TrackingTabProps {
  m: any; // dashboard metrics
  project: any;
}

// KPI Card with progress bar and comparison
function KPICard({ label, value, comparisonPct, comparisonDays, prevValue, colorClass }: {
  label: string;
  value: string;
  comparisonPct?: number | null;
  comparisonDays?: number;
  prevValue?: string;
  colorClass?: string;
}) {
  const pct = comparisonPct ?? 0;
  const isPositive = pct >= 0;
  const barColor = pct > 80 ? "bg-emerald-500" : pct > 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl sm:text-2xl font-bold tracking-tight ${colorClass || ""}`}>{value}</p>
        {comparisonPct !== null && comparisonPct !== undefined && (
          <>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                {formatPercent(Math.abs(pct))}
              </span>
              {comparisonDays && (
                <span className="text-muted-foreground">of {comparisonDays} dias anteriores</span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
              />
            </div>
            {prevValue && (
              <p className="text-[10px] text-muted-foreground text-right">{prevValue}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Small metric card used in the grid
function SmallMetric({ label, value, change, colorClass }: {
  label: string;
  value: string;
  change?: number | null;
  colorClass?: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-lg sm:text-xl font-bold tracking-tight mt-0.5 ${colorClass || ""}`}>{value}</p>
        {change !== null && change !== undefined && (
          <div className="flex items-center gap-1 mt-0.5">
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-400" />
            )}
            <span className={`text-[10px] font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatPercent(Math.abs(change))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrackingTab({ m, project }: TrackingTabProps) {
  const hasMetaData = m.metaInvestment > 0 || m.metaImpressions > 0;
  const hasGoogleData = m.googleInvestment > 0 || m.gImpressions > 0;

  // Revenue by day of week with faturamento + compras
  const revenueByDayOfWeek = useMemo(() => {
    return m.salesByDayOfWeek.map((d: any) => ({
      name: d.name,
      faturamento: d.revenue,
      compras: d.vendas,
    }));
  }, [m.salesByDayOfWeek]);

  // Revenue by day of month
  const revenueByDayOfMonth = useMemo(() => {
    const dayMap = new Map<number, { revenue: number; compras: number }>();
    // Group approved sales by day of month
    const approvedSales = (m.kiwifySales || []).concat(m.hotmartSales || []);
    approvedSales.forEach((s: any) => {
      const dateStr = s.sale_date || s.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const day = d.getDate();
      const existing = dayMap.get(day) || { revenue: 0, compras: 0 };
      dayMap.set(day, {
        revenue: existing.revenue + Number(s.amount || 0),
        compras: existing.compras + 1,
      });
    });
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, data]) => ({
        name: String(day),
        faturamento: data.revenue,
        compras: data.compras,
      }));
  }, [m.kiwifySales, m.hotmartSales]);

  // Purchases over time chart data
  const purchasesOverTime = useMemo(() => {
    return m.salesChartData.map((d: any) => ({
      date: d.date,
      compras: d.vendas,
    }));
  }, [m.salesChartData]);

  // Revenue scenarios (ticket médio × N vendas)
  const scenarios = useMemo(() => {
    const ticket = m.avgTicket;
    if (ticket <= 0) return [];
    return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((qty) => ({
      vendas: qty,
      faturamento: ticket * qty,
    }));
  }, [m.avgTicket]);

  // Meta daily chart for investment over time
  const metaDailyChart = useMemo(() => {
    return (m.metaMetrics || []).map((met: any) => ({
      date: new Date(met.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      investimento: Number(met.investment || 0),
      compras: Number(met.purchases || 0),
    }));
  }, [m.metaMetrics]);

  // Google daily chart
  const googleDailyChart = useMemo(() => {
    return (m.googleMetrics || []).map((met: any) => ({
      date: new Date(met.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      custo: Number(met.investment || 0),
      conversoes: Number(met.conversions || 0),
    }));
  }, [m.googleMetrics]);

  // Custo por compra (site)
  const costPerPurchase = m.metaPurchases > 0 ? m.metaInvestment / m.metaPurchases : 0;
  const metaRoas = m.metaInvestment > 0 ? m.totalRevenue / m.metaInvestment : 0;
  
  // Google cost per conversion
  const gCostPerConv = m.gConversions > 0 ? m.googleInvestment / m.gConversions : 0;
  const gConvRate = m.gImpressions > 0 ? (m.gConversions / m.gImpressions) * 100 : 0;

  // Period days for comparison
  const periodDays = useMemo(() => {
    if (!m.metaMetrics?.length) return 0;
    const dates = (m.metaMetrics as any[]).map((met: any) => met.date);
    if (dates.length < 2) return dates.length;
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    return Math.ceil((last.getTime() - first.getTime()) / 86400000) + 1;
  }, [m.metaMetrics]);

  if (!hasMetaData && !hasGoogleData) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          Nenhum dado de rastreamento disponível. Conecte suas contas de anúncios na aba Integrações.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={hasMetaData ? "meta" : "google"}>
        <TabsList>
          {hasMetaData && <TabsTrigger value="meta">Meta Ads</TabsTrigger>}
          {hasGoogleData && <TabsTrigger value="google">Google Ads</TabsTrigger>}
          {m.salesCount > 0 && <TabsTrigger value="revenue">Faturamento</TabsTrigger>}
        </TabsList>

        {/* ========== META ADS ========== */}
        {hasMetaData && (
          <TabsContent value="meta" className="space-y-6 pt-4">
            {/* Top KPI Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <AnimatedCard index={0}>
                <KPICard
                  label="Investimento"
                  value={formatBRL(m.metaInvestment)}
                  comparisonPct={m.investmentChange}
                  comparisonDays={periodDays}
                />
              </AnimatedCard>
              <AnimatedCard index={1}>
                <KPICard
                  label="Faturamento"
                  value={formatBRL(m.totalRevenue)}
                  comparisonPct={m.revenueChange}
                  comparisonDays={periodDays}
                />
              </AnimatedCard>
              <AnimatedCard index={2}>
                <KPICard
                  label="Compras"
                  value={formatNumber(m.salesCount)}
                  comparisonPct={m.salesCountChange}
                  comparisonDays={periodDays}
                />
              </AnimatedCard>
              <AnimatedCard index={3}>
                <KPICard
                  label="Custo por Compra (Site)"
                  value={formatBRL(costPerPurchase)}
                  comparisonDays={periodDays}
                />
              </AnimatedCard>
              <AnimatedCard index={4}>
                <KPICard
                  label="ROAS (Site)"
                  value={formatDecimal(metaRoas)}
                  comparisonDays={periodDays}
                />
              </AnimatedCard>
            </div>

            {/* Main metrics grid - 3 columns layout */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
              {/* Left column - Video/Impression metrics */}
              <div className="lg:col-span-3 space-y-3">
                <SmallMetric label="Impressões" value={formatNumber(m.metaImpressions)} />
                <SmallMetric label="Views LP" value={formatNumber(m.metaLpViews)} />
                <SmallMetric
                  label="Hook Rate"
                  value={m.metaImpressions > 0 ? formatPercent((m.metaLpViews / m.metaImpressions) * 100) : "0%"}
                />
                <SmallMetric
                  label="Connect Rate"
                  value={formatPercent(m.metaConnectRate)}
                />
                <SmallMetric
                  label="Conv. Página"
                  value={formatPercent(m.metaPageConversion)}
                />
              </div>

              {/* Center - Charts */}
              <div className="lg:col-span-5 space-y-4">
                {/* Compras over time */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Compras</CardTitle>
                  </CardHeader>
                  <CardContent className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={purchasesOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} interval="preserveStartEnd" />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Line type="monotone" dataKey="compras" name="Compras" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={{ r: 1.5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Campaign summary table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Resumo por Período</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Métrica</TableHead>
                          <TableHead className="text-xs text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow><TableCell className="text-xs">Investimento</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.metaInvestment)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Impressões</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.metaImpressions)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Cliques</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.metaClicks)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">CTR</TableCell><TableCell className="text-xs text-right font-medium">{formatPercent(m.metaCtr)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">CPC</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.metaCpc)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">CPM</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.metaCpm)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Views LP</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.metaLpViews)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Checkouts</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.metaCheckouts)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Compras (Meta)</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.metaPurchases)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Leads</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.metaLeads)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">CPL</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.metaCostPerLead)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">Custo/Compra</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.metaCostPerPurchase)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-xs">ROAS</TableCell><TableCell className="text-xs text-right font-medium">{formatDecimal(metaRoas)}</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Small metric cards */}
              <div className="lg:col-span-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                  <SmallMetric label="Cliques" value={formatNumber(m.metaClicks)} />
                  <SmallMetric label="CTR" value={formatPercent(m.metaCtr)} />
                  <SmallMetric label="CPC" value={formatBRL(m.metaCpc)} />
                  <SmallMetric label="CPM" value={formatBRL(m.metaCpm)} />
                  <SmallMetric label="Link Clicks" value={formatNumber(m.metaLinkClicks)} />
                  <SmallMetric label="Link CTR" value={formatPercent(m.metaLinkCtr)} />
                  <SmallMetric label="PageView" value={formatNumber(m.metaLpViews)} />
                  <SmallMetric label="Checkouts" value={formatNumber(m.metaCheckouts)} />
                  <SmallMetric label="Conv. Checkout" value={formatPercent(m.metaCheckoutConversion)} />
                </div>
              </div>
            </div>

            {/* Investment over time chart */}
            {metaDailyChart.length > 0 && (
              <AnimatedCard index={5}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Investimento × Compras (Meta)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={metaDailyChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} interval="preserveStartEnd" />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} formatter={(v: number, name: string) => name === "investimento" ? formatBRL(v) : v} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="investimento" name="Investimento" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Line yAxisId="right" type="monotone" dataKey="compras" name="Compras" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 2 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}
          </TabsContent>
        )}

        {/* ========== GOOGLE ADS ========== */}
        {hasGoogleData && (
          <TabsContent value="google" className="space-y-6 pt-4">
            {/* Top KPI Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <AnimatedCard index={0}>
                <KPICard label="Custo" value={formatBRL(m.googleInvestment)} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={1}>
                <KPICard label="Conversões" value={formatNumber(m.gConversions)} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={2}>
                <KPICard label="Custo/conv." value={formatBRL(gCostPerConv)} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={3}>
                <KPICard label="Taxa conv." value={formatPercent(m.gConversionRate)} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={4}>
                <KPICard label="Valor total de conversão" value={formatBRL(m.totalRevenue)} comparisonDays={periodDays} />
              </AnimatedCard>
            </div>

            {/* Google metrics grid */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
              {/* Left column */}
              <div className="lg:col-span-3 space-y-3">
                <SmallMetric label="Impressões" value={formatNumber(m.gImpressions)} />
                <SmallMetric label="Cliques" value={formatNumber(m.gClicks)} />
                <SmallMetric label="CTR" value={formatPercent(m.gCtr)} />
                <SmallMetric label="CPC médio" value={formatBRL(m.gCpc)} />
              </div>

              {/* Center chart */}
              <div className="lg:col-span-5">
                {googleDailyChart.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Custo/conv. × Conversões</CardTitle>
                    </CardHeader>
                    <CardContent className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={googleDailyChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} interval="preserveStartEnd" />
                          <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${v.toFixed(0)}`} />
                          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <Tooltip cursor={false} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="custo" name="Custo/conv." stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
                          <Line yAxisId="right" type="monotone" dataKey="conversoes" name="Conversões" stroke={COLORS[3]} strokeWidth={1.5} dot={{ r: 2 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right metrics */}
              <div className="lg:col-span-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                  <SmallMetric label="Conversões" value={formatNumber(m.gConversions)} />
                  <SmallMetric label="Taxa Conv." value={formatPercent(m.gConversionRate)} />
                  <SmallMetric label="Custo/Conv." value={formatBRL(m.gCostPerConversion)} />
                  <SmallMetric label="CPM" value={m.gImpressions > 0 ? formatBRL((m.googleInvestment / m.gImpressions) * 1000) : "R$ 0,00"} />
                  <SmallMetric label="Cliques" value={formatNumber(m.gClicks)} />
                  <SmallMetric label="CPC" value={formatBRL(m.gCpc)} />
                </div>
              </div>
            </div>

            {/* Summary table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumo Google Ads</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Métrica</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="text-xs">Custo</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.googleInvestment)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-xs">Impressões</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.gImpressions)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-xs">Cliques</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.gClicks)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-xs">CTR</TableCell><TableCell className="text-xs text-right font-medium">{formatPercent(m.gCtr)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-xs">CPC</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.gCpc)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-xs">Conversões</TableCell><TableCell className="text-xs text-right font-medium">{formatNumber(m.gConversions)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-xs">Taxa de Conversão</TableCell><TableCell className="text-xs text-right font-medium">{formatPercent(m.gConversionRate)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-xs">Custo/Conversão</TableCell><TableCell className="text-xs text-right font-medium">{formatBRL(m.gCostPerConversion)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ========== FATURAMENTO ========== */}
        {m.salesCount > 0 && (
          <TabsContent value="revenue" className="space-y-6 pt-4">
            {/* Cenários de Previsão */}
            {scenarios.length > 0 && (
              <AnimatedCard index={0}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cenários - Previsão de Faturamento</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Ticket Médio: <span className="font-semibold">{formatBRL(m.avgTicket)}</span>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {scenarios.slice(0, 10).map((s) => (
                        <div key={s.vendas} className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">{s.vendas} vendas</p>
                          <p className="text-lg font-bold mt-0.5">{formatBRL(s.faturamento)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Faturamento por dia da semana */}
            {revenueByDayOfWeek.some((d: any) => d.faturamento > 0) && (
              <AnimatedCard index={1}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Faturamento por dia da semana</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revenueByDayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} formatter={(v: number, name: string) => name === "faturamento" ? formatBRL(v) : v} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.8} />
                        <Line yAxisId="right" type="monotone" dataKey="compras" name="Compras" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Faturamento por dia do mês */}
            {revenueByDayOfMonth.length > 0 && (
              <AnimatedCard index={2}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Faturamento por dia do mês</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revenueByDayOfMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} formatter={(v: number, name: string) => name === "faturamento" ? formatBRL(v) : v} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.8} />
                        <Line yAxisId="right" type="monotone" dataKey="compras" name="Compras" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Detalhamento por Dia da Semana - Table */}
            <AnimatedCard index={3}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detalhamento por Dia da Semana</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Dia da Semana</TableHead>
                        <TableHead className="text-xs text-right">Compras</TableHead>
                        <TableHead className="text-xs text-right">Faturamento</TableHead>
                        <TableHead className="text-xs text-right">Ticket Médio</TableHead>
                        <TableHead className="text-xs text-right">% Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.salesByDayOfWeek.map((d: any) => (
                        <TableRow key={d.name}>
                          <TableCell className="text-xs font-medium">{d.name}</TableCell>
                          <TableCell className="text-xs text-right">{d.vendas}</TableCell>
                          <TableCell className="text-xs text-right">{formatBRL(d.revenue)}</TableCell>
                          <TableCell className="text-xs text-right">{d.vendas > 0 ? formatBRL(d.revenue / d.vendas) : "—"}</TableCell>
                          <TableCell className="text-xs text-right">{m.salesCount > 0 ? formatPercent((d.vendas / m.salesCount) * 100) : "—"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold border-t-2">
                        <TableCell className="text-xs">Total</TableCell>
                        <TableCell className="text-xs text-right">{m.salesCount}</TableCell>
                        <TableCell className="text-xs text-right">{formatBRL(m.totalRevenue)}</TableCell>
                        <TableCell className="text-xs text-right">{formatBRL(m.avgTicket)}</TableCell>
                        <TableCell className="text-xs text-right">100%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </AnimatedCard>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
