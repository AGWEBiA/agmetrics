import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedPage } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Download, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { exportCSV } from "@/lib/exportCSV";
import {
  computeMultiModelAttribution,
  AttributionModel,
  MODEL_LABELS,
  MODEL_DESCRIPTIONS,
} from "@/lib/attributionEngine";
import type { GroupBy } from "@/hooks/useChannelROIData";

const MODEL_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function fetchAllPaginated(table: "sales_events" | "lead_events", projectId: string, selectCols: string, orderCol: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const query = supabase
      .from(table)
      .select(selectCols)
      .eq("project_id", projectId)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) throw error;
    if (data) allData = allData.concat(data);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allData;
}

export default function AdvancedAttribution() {
  const { projectId } = useParams();
  const [groupBy, setGroupBy] = useState<GroupBy>("utm_source");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<string>("comparison");

  const { data: salesData, isLoading } = useQuery({
    queryKey: ["adv_attr_sales", projectId],
    enabled: !!projectId,
    queryFn: () =>
      fetchAllPaginated(
        "sales_events",
        projectId!,
        "buyer_email, buyer_name, amount, sale_date, utm_source, utm_campaign, utm_medium, tracking_src, tracking_sck, status, product_name, is_ignored",
        "sale_date"
      ).then((d) => d.filter((s: any) => !s.is_ignored)),
    refetchInterval: 300000,
  });

  const { data: leadEvents } = useQuery({
    queryKey: ["adv_attr_leads", projectId],
    enabled: !!projectId,
    queryFn: () =>
      fetchAllPaginated(
        "lead_events",
        projectId!,
        "buyer_email, event_date, event_type, utm_source, utm_campaign, utm_medium, tracking_src, tracking_sck",
        "event_date"
      ),
  });

  const productNames = useMemo(() => {
    if (!salesData) return [];
    const names = new Set<string>();
    salesData.forEach((s: any) => { if (s.product_name) names.add(s.product_name); });
    return Array.from(names).sort();
  }, [salesData]);

  const multiModel = useMemo(() => {
    if (!salesData) return null;
    return computeMultiModelAttribution(salesData, leadEvents || [], groupBy, dateFrom, dateTo, productFilter);
  }, [salesData, leadEvents, groupBy, dateFrom, dateTo, productFilter]);

  // Build comparison data: top channels across all models
  const comparisonData = useMemo(() => {
    if (!multiModel) return [];
    const allChannels = new Set<string>();
    (Object.values(multiModel) as any[]).forEach((results: any[]) =>
      results.forEach((r: any) => allChannels.add(r.channel))
    );

    return Array.from(allChannels)
      .map((channel) => {
        const row: any = { channel };
        (Object.keys(multiModel) as AttributionModel[]).forEach((model) => {
          const found = multiModel[model].find((r) => r.channel === channel);
          row[`${model}_revenue`] = found?.revenue || 0;
          row[`${model}_percent`] = found?.revenuePercent || 0;
          row[`${model}_clients`] = found?.clients || 0;
        });
        return row;
      })
      .sort((a, b) => b.first_touch_revenue - a.first_touch_revenue);
  }, [multiModel]);

  // Radar chart data (top 6 channels, normalized)
  const radarData = useMemo(() => {
    if (!comparisonData.length) return [];
    return comparisonData.slice(0, 6).map((c) => ({
      channel: c.channel.length > 15 ? c.channel.slice(0, 15) + "…" : c.channel,
      "First-touch": c.first_touch_percent,
      "Last-click": c.last_touch_percent,
      "Linear": c.linear_percent,
      "Time-decay": c.time_decay_percent,
    }));
  }, [comparisonData]);

  const chartConfig = {
    "First-touch": { label: "First-touch", color: MODEL_COLORS[0] },
    "Last-click": { label: "Last-click", color: MODEL_COLORS[1] },
    "Linear": { label: "Linear", color: MODEL_COLORS[2] },
    "Time-decay": { label: "Time-decay", color: MODEL_COLORS[3] },
  };

  const handleExportCSV = () => {
    const rows = comparisonData.map((c) => ({
      Canal: c.channel,
      "First-touch (R$)": c.first_touch_revenue.toFixed(2),
      "First-touch (%)": c.first_touch_percent.toFixed(1),
      "Last-click (R$)": c.last_touch_revenue.toFixed(2),
      "Last-click (%)": c.last_touch_percent.toFixed(1),
      "Linear (R$)": c.linear_revenue.toFixed(2),
      "Linear (%)": c.linear_percent.toFixed(1),
      "Time-decay (R$)": c.time_decay_revenue.toFixed(2),
      "Time-decay (%)": c.time_decay_percent.toFixed(1),
    }));
    exportCSV(rows, "atribuicao-avancada-comparativo");
  };

  const models: AttributionModel[] = ["first_touch", "last_touch", "linear", "time_decay"];

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Atribuição Avançada</h1>
          <p className="text-sm text-muted-foreground">
            Compare modelos de atribuição lado a lado para entender o impacto real de cada canal
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utm_source">UTM Source</SelectItem>
              <SelectItem value="utm_campaign">UTM Campanha</SelectItem>
              <SelectItem value="tracking_src">SRC</SelectItem>
              <SelectItem value="tracking_sck">SCK</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!comparisonData.length}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          {projectId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/projects/${projectId}/channel-roi`}>
                ROI por Canal <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Data Início</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Data Fim</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Produto</label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {productNames.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(dateFrom || dateTo || productFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setProductFilter("all"); }}>
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Model legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {models.map((model, i) => (
          <Card key={model} className="border-l-4" style={{ borderLeftColor: COLORS[i] }}>
            <CardContent className="p-3">
              <p className="text-sm font-semibold">{MODEL_LABELS[model]}</p>
              <p className="text-xs text-muted-foreground">{MODEL_DESCRIPTIONS[model]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
            <TabsTrigger value="radar">Radar</TabsTrigger>
            <TabsTrigger value="table">Tabela Detalhada</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="mt-4">
            {comparisonData.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Receita Atribuída por Modelo</CardTitle>
                  <CardDescription>Top 10 canais · barras agrupadas por modelo de atribuição</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs fill-muted-foreground" />
                        <YAxis type="category" dataKey="channel" width={130} className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtBRL(Number(v))} />} />
                        <Bar dataKey="first_touch_revenue" name="First-touch" fill={COLORS[0]} />
                        <Bar dataKey="last_touch_revenue" name="Last-click" fill={COLORS[1]} />
                        <Bar dataKey="linear_revenue" name="Linear" fill={COLORS[2]} />
                        <Bar dataKey="time_decay_revenue" name="Time-decay" fill={COLORS[3]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda encontrada.</p>
            )}
          </TabsContent>

          <TabsContent value="radar" className="mt-4">
            {radarData.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Radar de Atribuição</CardTitle>
                  <CardDescription>% de receita atribuída por canal em cada modelo (top 6)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid className="stroke-muted" />
                        <PolarAngleAxis dataKey="channel" className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis className="text-xs fill-muted-foreground" />
                        <Radar name="First-touch" dataKey="First-touch" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} />
                        <Radar name="Last-click" dataKey="Last-click" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.15} />
                        <Radar name="Linear" dataKey="Linear" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.15} />
                        <Radar name="Time-decay" dataKey="Time-decay" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.15} />
                        <Legend />
                        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda encontrada.</p>
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Comparativo Detalhado
                  <Tooltip>
                    <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Cada coluna mostra a receita e % atribuída ao canal sob o respectivo modelo.
                      Divergências indicam canais que iniciam vs. que fecham a conversão.
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comparisonData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda encontrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2}>Canal</TableHead>
                          {models.map((m) => (
                            <TableHead key={m} colSpan={2} className="text-center border-l border-border">
                              {MODEL_LABELS[m]}
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow>
                          {models.map((m) => (
                            <React.Fragment key={m}>
                              <TableHead className="text-right text-xs border-l border-border">Receita</TableHead>
                              <TableHead className="text-right text-xs">%</TableHead>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparisonData.map((row) => (
                          <TableRow key={row.channel}>
                            <TableCell className="font-medium max-w-[180px] truncate">{row.channel}</TableCell>
                            {models.map((m) => (
                              <React.Fragment key={`${row.channel}-${m}`}>
                                <TableCell className="text-right border-l border-border">
                                  {fmtBRL(row[`${m}_revenue`])}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline">{row[`${m}_percent`].toFixed(1)}%</Badge>
                                </TableCell>
                              </React.Fragment>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Insights */}
      {comparisonData.length > 0 && multiModel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Insights de Atribuição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(() => {
              const ft = multiModel.first_touch[0];
              const lt = multiModel.last_touch[0];
              const divergent = comparisonData.find(
                (c) => Math.abs(c.first_touch_percent - c.last_touch_percent) > 10
              );

              return (
                <>
                  {ft && lt && ft.channel !== lt.channel && (
                    <p>
                      🔀 <strong>Divergência de atribuição:</strong> <Badge variant="secondary">{ft.channel}</Badge> lidera em first-touch,
                      mas <Badge variant="secondary">{lt.channel}</Badge> lidera em last-click.
                      Isso indica que {ft.channel} inicia jornadas que são finalizadas por {lt.channel}.
                    </p>
                  )}
                  {divergent && (
                    <p>
                      📐 <strong>Maior divergência:</strong> <Badge variant="secondary">{divergent.channel}</Badge> tem{" "}
                      {divergent.first_touch_percent.toFixed(1)}% no first-touch vs {divergent.last_touch_percent.toFixed(1)}% no last-click
                      — diferença de {Math.abs(divergent.first_touch_percent - divergent.last_touch_percent).toFixed(1)}pp.
                    </p>
                  )}
                  <p>
                    💡 <strong>Recomendação:</strong> Use first-touch para avaliar canais de aquisição e last-click para otimizar conversão.
                    O modelo linear é útil para distribuir budget de forma equilibrada.
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </AnimatedPage>
  );
}
