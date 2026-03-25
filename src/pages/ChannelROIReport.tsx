import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/hooks/useProjects";
import { AnimatedPage } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingUp, Users, DollarSign, Repeat, Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { exportCSV } from "@/lib/exportCSV";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
];

type GroupBy = "utm_source" | "utm_campaign" | "tracking_src" | "tracking_sck";

interface ChannelData {
  channel: string;
  totalClients: number;
  avgFirstOrder: number;
  totalFirstOrderRevenue: number;
  totalSubsequentRevenue: number;
  totalRevenue: number;
  retentionRate: number;
  repeatBuyers: number;
  avgLTV: number;
  adSpend: number;
  roi: number;
  clients: { email: string; name: string; firstAmount: number; subsequentAmount: number; totalPurchases: number; firstDate: string }[];
}

export default function ChannelROIReport() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const [groupBy, setGroupBy] = useState<GroupBy>("utm_source");
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["channel_roi_sales", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events")
        .select("buyer_email, buyer_name, amount, sale_date, utm_source, utm_campaign, utm_medium, tracking_src, tracking_sck, status")
        .eq("project_id", projectId!)
        .eq("is_ignored", false)
        .eq("status", "approved" as any)
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 300000,
  });

  const { data: metaSpend } = useQuery({
    queryKey: ["channel_roi_meta_spend", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_metrics")
        .select("date, investment")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + Number(r.investment || 0), 0);
    },
  });

  const { data: googleSpend } = useQuery({
    queryKey: ["channel_roi_google_spend", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_metrics")
        .select("date, investment")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + Number(r.investment || 0), 0);
    },
  });

  const channelReport = useMemo((): ChannelData[] => {
    if (!salesData || salesData.length === 0) return [];

    const getSource = (sale: any): string => {
      const val = sale[groupBy] || "";
      return val.trim() || "direto";
    };

    // Group by buyer email, find first touch
    const buyerMap = new Map<string, any[]>();
    salesData.forEach((s) => {
      if (!s.buyer_email) return;
      const key = s.buyer_email.toLowerCase().trim();
      if (!buyerMap.has(key)) buyerMap.set(key, []);
      buyerMap.get(key)!.push(s);
    });

    // Build channel aggregation
    const channelMap = new Map<string, ChannelData>();

    buyerMap.forEach((sales, email) => {
      sales.sort((a: any, b: any) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
      const firstSale = sales[0];
      const channel = getSource(firstSale);
      const firstAmount = Number(firstSale.amount || 0);
      const subsequentAmount = sales.slice(1).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      if (!channelMap.has(channel)) {
        channelMap.set(channel, {
          channel,
          totalClients: 0,
          avgFirstOrder: 0,
          totalFirstOrderRevenue: 0,
          totalSubsequentRevenue: 0,
          totalRevenue: 0,
          retentionRate: 0,
          repeatBuyers: 0,
          avgLTV: 0,
          adSpend: 0,
          roi: 0,
          clients: [],
        });
      }

      const ch = channelMap.get(channel)!;
      ch.totalClients++;
      ch.totalFirstOrderRevenue += firstAmount;
      ch.totalSubsequentRevenue += subsequentAmount;
      ch.totalRevenue += firstAmount + subsequentAmount;
      if (sales.length > 1) ch.repeatBuyers++;
      ch.clients.push({
        email,
        name: firstSale.buyer_name || email,
        firstAmount,
        subsequentAmount,
        totalPurchases: sales.length,
        firstDate: firstSale.sale_date,
      });
    });

    // Calculate derived metrics
    const totalAdSpend = (metaSpend || 0) + (googleSpend || 0);

    return Array.from(channelMap.values())
      .map((ch) => {
        ch.avgFirstOrder = ch.totalClients > 0 ? ch.totalFirstOrderRevenue / ch.totalClients : 0;
        ch.retentionRate = ch.totalClients > 0 ? (ch.repeatBuyers / ch.totalClients) * 100 : 0;
        ch.avgLTV = ch.totalClients > 0 ? ch.totalRevenue / ch.totalClients : 0;
        // Distribute ad spend proportionally by client count for channels with known ads
        const isAdChannel = ch.channel !== "direto";
        ch.adSpend = isAdChannel ? (totalAdSpend * ch.totalClients) / Math.max(buyerMap.size, 1) : 0;
        ch.roi = ch.adSpend > 0 ? ((ch.totalRevenue - ch.adSpend) / ch.adSpend) * 100 : 0;
        ch.clients.sort((a, b) => b.subsequentAmount - a.subsequentAmount);
        return ch;
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [salesData, groupBy, metaSpend, googleSpend]);

  const totals = useMemo(() => {
    if (channelReport.length === 0) return null;
    return {
      clients: channelReport.reduce((s, c) => s + c.totalClients, 0),
      revenue: channelReport.reduce((s, c) => s + c.totalRevenue, 0),
      subsequent: channelReport.reduce((s, c) => s + c.totalSubsequentRevenue, 0),
      repeat: channelReport.reduce((s, c) => s + c.repeatBuyers, 0),
      adSpend: (metaSpend || 0) + (googleSpend || 0),
    };
  }, [channelReport, metaSpend, googleSpend]);

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
      Clientes: ch.totalClients,
      "Ticket Médio 1ª Compra": ch.avgFirstOrder.toFixed(2),
      "Receita 1ª Compra": ch.totalFirstOrderRevenue.toFixed(2),
      "Receita Subsequente": ch.totalSubsequentRevenue.toFixed(2),
      "Receita Total": ch.totalRevenue.toFixed(2),
      "Compradores Recorrentes": ch.repeatBuyers,
      "Taxa Retenção (%)": ch.retentionRate.toFixed(1),
      "LTV Médio": ch.avgLTV.toFixed(2),
      "Investimento Estimado": ch.adSpend.toFixed(2),
      "ROI (%)": ch.roi.toFixed(1),
    }));
    exportCSV(rows, `roi-por-canal-${project?.name || "projeto"}`);
  };

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const isLoading = salesLoading;

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ROI por Canal</h1>
          <p className="text-sm text-muted-foreground">
            Atribuição first-touch · Dados até {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[180px]">
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
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : totals ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <CardTitle className="text-base">Distribuição de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelReport.slice(0, 8).map((ch) => ({ name: ch.channel, value: ch.totalClients }))}
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
                First-touch: agrupa clientes pelo canal da primeira compra. Receita subsequente inclui todas as compras posteriores, independente do canal.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Clique em um canal para ver os clientes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : channelReport.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda aprovada encontrada para este projeto.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Ticket 1ª</TableHead>
                    <TableHead className="text-right">Receita 1ª</TableHead>
                    <TableHead className="text-right">Receita Recorrente</TableHead>
                    <TableHead className="text-right">Receita Total</TableHead>
                    <TableHead className="text-right">Retenção</TableHead>
                    <TableHead className="text-right">LTV Médio</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelReport.map((ch) => (
                    <>
                      <TableRow
                        key={ch.channel}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedChannel(expandedChannel === ch.channel ? null : ch.channel)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">{ch.channel}</TableCell>
                        <TableCell className="text-right">{ch.totalClients}</TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.avgFirstOrder)}</TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.totalFirstOrderRevenue)}</TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.totalSubsequentRevenue)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtBRL(ch.totalRevenue)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={ch.retentionRate >= 30 ? "default" : ch.retentionRate >= 10 ? "secondary" : "outline"}>
                            {ch.retentionRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{fmtBRL(ch.avgLTV)}</TableCell>
                        <TableCell className="text-right">
                          {ch.adSpend > 0 ? (
                            <span className={ch.roi > 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-destructive font-semibold"}>
                              {ch.roi.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedChannel === ch.channel && (
                        <TableRow key={`${ch.channel}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-0">
                            <div className="max-h-60 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Cliente</TableHead>
                                    <TableHead className="text-xs text-right">1ª Compra</TableHead>
                                    <TableHead className="text-xs text-right">Subsequentes</TableHead>
                                    <TableHead className="text-xs text-right">Nº Compras</TableHead>
                                    <TableHead className="text-xs text-right">Data 1ª</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {ch.clients.slice(0, 50).map((client) => (
                                    <TableRow key={client.email}>
                                      <TableCell className="text-xs max-w-[200px] truncate">{client.name}</TableCell>
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
                    </>
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
              const tracked = channelReport.filter((c) => c.channel !== "direto");
              const untrackedPct = totals
                ? (((channelReport.find((c) => c.channel === "direto")?.totalRevenue || 0) / totals.revenue) * 100)
                : 0;

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
                    <p className="text-amber-600 dark:text-amber-400">
                      ⚠️ <strong>{untrackedPct.toFixed(0)}% da receita</strong> vem de tráfego sem rastreamento (direto).
                      Padronize o uso de UTMs para melhorar a atribuição.
                    </p>
                  )}
                  {tracked.length > 0 && (
                    <p>
                      💡 <strong>Recomendação:</strong> Considere realocar budget para os canais com maior LTV e retenção,
                      não apenas os de maior volume.
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
