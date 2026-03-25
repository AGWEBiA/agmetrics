import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useChannelROIData, GroupBy } from "@/hooks/useChannelROIData";
import { AnimatedPage } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingUp, Users, DollarSign, Repeat, Target, Info, ShoppingCart, GitCompare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { exportCSV } from "@/lib/exportCSV";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--primary))",
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ChannelROIReport() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const {
    channelReport,
    totals,
    isLoading,
    groupBy,
    setGroupBy,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    productFilter,
    setProductFilter,
    productNames,
  } = useChannelROIData(projectId);

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    channelReport.slice(0, 10).forEach((ch, i) => {
      cfg[ch.channel] = { label: ch.channel, color: COLORS[i % COLORS.length] };
    });
    return cfg;
  }, [channelReport]);

  const handleExportCSV = () => {
    const rows = channelReport.map((ch) => ({
      Canal: ch.channel,
      Vendas: ch.totalSales,
      "% Vendas": ch.salesPercent.toFixed(1) + "%",
      Clientes: ch.totalClients,
      "Ticket Médio 1ª Compra": ch.avgFirstOrder.toFixed(2),
      "Receita 1ª Compra": ch.totalFirstOrderRevenue.toFixed(2),
      "Receita Subsequente": ch.totalSubsequentRevenue.toFixed(2),
      "Receita Total": ch.totalRevenue.toFixed(2),
      "% Receita": ch.revenuePercent.toFixed(1) + "%",
      "Compradores Recorrentes": ch.repeatBuyers,
      "Taxa Retenção (%)": ch.retentionRate.toFixed(1),
      "LTV Médio": ch.avgLTV.toFixed(2),
      "Investimento Estimado": ch.adSpend.toFixed(2),
      "ROI (%)": ch.roi.toFixed(1),
    }));
    exportCSV(rows, `roi-por-canal-${project?.name || "projeto"}`);
  };

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ROI por Canal</h1>
          <p className="text-sm text-muted-foreground">
            Atribuição first-touch (lead/1ª venda) · Dados até {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
            {totals && <> · <strong>{totals.sales} vendas</strong> de <strong>{totals.clients} clientes</strong></>}
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
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={channelReport.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          {projectId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/projects/${projectId}/advanced-attribution`}>
                <GitCompare className="mr-1.5 h-4 w-4" />
                Atribuição Avançada
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
                {productNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
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

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : totals ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <ShoppingCart className="h-3.5 w-3.5" /> Total Vendas
              </div>
              <p className="text-2xl font-bold mt-1">{totals.sales}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Users className="h-3.5 w-3.5" /> Clientes Únicos
              </div>
              <p className="text-2xl font-bold mt-1">{totals.clients}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <DollarSign className="h-3.5 w-3.5" /> Receita Total
              </div>
              <p className="text-2xl font-bold mt-1">{fmtBRL(totals.revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Repeat className="h-3.5 w-3.5" /> Receita Recorrente
              </div>
              <p className="text-2xl font-bold mt-1">{fmtBRL(totals.subsequent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Target className="h-3.5 w-3.5" /> Retenção Geral
              </div>
              <p className="text-2xl font-bold mt-1">
                {totals.clients > 0 ? ((totals.repeat / totals.clients) * 100).toFixed(1) : "0"}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <TrendingUp className="h-3.5 w-3.5" /> Investimento Ads
              </div>
              <p className="text-2xl font-bold mt-1">{fmtBRL(totals.adSpend)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts */}
      {channelReport.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelReport.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs fill-muted-foreground" />
                    <YAxis type="category" dataKey="channel" width={120} className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtBRL(Number(v))} />} />
                    <Bar dataKey="totalFirstOrderRevenue" name="1ª Compra" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="totalSubsequentRevenue" name="Recorrente" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição de Vendas por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelReport.slice(0, 8).map((ch) => ({ name: ch.channel, value: ch.totalSales }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {channelReport.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Resumo por Canal
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                First-touch: agrupa clientes pelo canal do primeiro contato (lead capturado ou primeira compra).
                Todas as vendas subsequentes são atribuídas ao canal de origem, sem dupla contagem.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Clique em um canal para ver os clientes · Todas as vendas do projeto estão incluídas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : channelReport.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda encontrada para este projeto.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">% Vendas</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Ticket 1ª</TableHead>
                    <TableHead className="text-right">Receita 1ª</TableHead>
                    <TableHead className="text-right">Receita Recorrente</TableHead>
                    <TableHead className="text-right">Receita Total</TableHead>
                    <TableHead className="text-right">% Receita</TableHead>
                    <TableHead className="text-right">Retenção</TableHead>
                    <TableHead className="text-right">LTV Médio</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {channelReport.map((ch) => (
                    <React.Fragment key={ch.channel}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedChannel(expandedChannel === ch.channel ? null : ch.channel)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">{ch.channel}</TableCell>
                        <TableCell className="text-right font-semibold">{ch.totalSales}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{ch.salesPercent.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{ch.totalClients}</TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.avgFirstOrder)}</TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.totalFirstOrderRevenue)}</TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.totalSubsequentRevenue)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtBRL(ch.totalRevenue)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{ch.revenuePercent.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={ch.retentionRate >= 30 ? "default" : ch.retentionRate >= 10 ? "secondary" : "outline"}>
                            {ch.retentionRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.avgLTV)}</TableCell>
                        <TableCell className="text-right">
                          {ch.adSpend > 0 ? (
                            <span className={`font-semibold ${ch.roi > 0 ? "text-primary" : "text-destructive"}`}>
                              {ch.roi.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedChannel === ch.channel && (
                        <TableRow key={`${ch.channel}-detail`}>
                          <TableCell colSpan={12} className="bg-muted/30 p-0">
                            <div className="max-h-60 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Cliente</TableHead>
                                    <TableHead className="text-xs">Produtos</TableHead>
                                    <TableHead className="text-xs text-right">1ª Compra</TableHead>
                                    <TableHead className="text-xs text-right">Subsequentes</TableHead>
                                    <TableHead className="text-xs text-right">Nº Compras</TableHead>
                                    <TableHead className="text-xs text-right">Data 1ª</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {ch.clients.slice(0, 100).map((client) => (
                                    <TableRow key={client.email}>
                                      <TableCell className="text-xs max-w-[180px] truncate">{client.name}</TableCell>
                                      <TableCell className="text-xs max-w-[150px] truncate text-muted-foreground">
                                        {client.productNames.join(", ") || "—"}
                                      </TableCell>
                                      <TableCell className="text-xs text-right">{fmtBRL(client.firstAmount)}</TableCell>
                                      <TableCell className="text-xs text-right">{fmtBRL(client.subsequentAmount)}</TableCell>
                                      <TableCell className="text-xs text-right">{client.totalPurchases}</TableCell>
                                      <TableCell className="text-xs text-right">
                                        {client.firstDate ? format(new Date(client.firstDate), "dd/MM/yy") : "—"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {channelReport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Insights Automáticos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(() => {
              const bestRetention = [...channelReport].filter((c) => c.totalClients >= 3).sort((a, b) => b.retentionRate - a.retentionRate)[0];
              const bestLTV = [...channelReport].filter((c) => c.totalClients >= 3).sort((a, b) => b.avgLTV - a.avgLTV)[0];
              const bestROI = [...channelReport].filter((c) => c.adSpend > 0).sort((a, b) => b.roi - a.roi)[0];
              const direto = channelReport.find((c) => c.channel === "direto");
              const untrackedPct = totals && direto ? (direto.totalRevenue / totals.revenue) * 100 : 0;

              return (
                <>
                  {bestRetention && (
                    <p>
                      🏆 <strong>Maior retenção:</strong> <Badge variant="secondary">{bestRetention.channel}</Badge> com{" "}
                      {bestRetention.retentionRate.toFixed(1)}% dos clientes repetindo compras ({bestRetention.repeatBuyers} de {bestRetention.totalClients}).
                    </p>
                  )}
                  {bestLTV && (
                    <p>
                      💎 <strong>Maior LTV:</strong> <Badge variant="secondary">{bestLTV.channel}</Badge> com LTV médio de{" "}
                      {fmtBRL(bestLTV.avgLTV)} por cliente.
                    </p>
                  )}
                  {bestROI && (
                    <p>
                      📈 <strong>Melhor ROI:</strong> <Badge variant="secondary">{bestROI.channel}</Badge> com retorno de {bestROI.roi.toFixed(0)}%
                      sobre investimento estimado.
                    </p>
                  )}
                  {untrackedPct > 50 && (
                    <p className="text-destructive">
                      ⚠️ <strong>{untrackedPct.toFixed(0)}% da receita</strong> vem de tráfego sem rastreamento (direto).
                      Padronize o uso de UTMs para melhorar a atribuição.
                    </p>
                  )}
                  {totals && totals.sales > 0 && (
                    <p>
                      📦 <strong>Total geral:</strong> {totals.sales} vendas atribuídas a {channelReport.length} canais distintos.
                      Nenhuma venda foi omitida da análise.
                    </p>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </AnimatedPage>
  );
}
