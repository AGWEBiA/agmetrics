import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatters";
import {
  RefreshCw, Loader2, Search, Route, Users, TrendingUp, Target,
  MousePointerClick, ShoppingCart, ArrowRight, Filter
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const EVENT_COLORS: Record<string, string> = {
  ad_click: "hsl(220, 90%, 56%)",
  lead: "hsl(265, 80%, 60%)",
  checkout: "hsl(38, 92%, 50%)",
  purchase: "hsl(152, 60%, 42%)",
  refund: "hsl(0, 72%, 51%)",
  other: "hsl(220, 10%, 46%)",
};

const EVENT_LABELS: Record<string, string> = {
  ad_click: "Clique no Anúncio",
  lead: "Lead",
  checkout: "Checkout",
  purchase: "Compra",
  refund: "Reembolso",
  other: "Outro",
};

const EVENT_ICONS: Record<string, typeof MousePointerClick> = {
  ad_click: MousePointerClick,
  checkout: ShoppingCart,
  purchase: Target,
  refund: RefreshCw,
};

const CHART_COLORS = [
  "hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
];

export default function LeadJourney() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["lead_events", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_events")
        .select("*")
        .eq("project_id", projectId!)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const populateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("populate-lead-events", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead_events", projectId] });
      toast({ title: "Jornada mapeada!", description: `${data.events_created} eventos criados de ${data.sales_processed} vendas` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(e => {
      if (searchEmail && !e.buyer_email?.toLowerCase().includes(searchEmail.toLowerCase()) &&
          !e.buyer_name?.toLowerCase().includes(searchEmail.toLowerCase())) return false;
      if (filterSource !== "all" && e.utm_source !== filterSource && e.event_source !== filterSource) return false;
      if (filterEventType !== "all" && e.event_type !== filterEventType) return false;
      return true;
    });
  }, [events, searchEmail, filterSource, filterEventType]);

  // Unique sources for filter
  const uniqueSources = useMemo(() => {
    if (!events) return [];
    const sources = new Set<string>();
    events.forEach(e => {
      if (e.utm_source) sources.add(e.utm_source);
      if (e.event_source) sources.add(e.event_source);
    });
    return Array.from(sources).sort();
  }, [events]);

  // KPIs
  const kpis = useMemo(() => {
    if (!events) return { totalLeads: 0, totalPurchases: 0, conversionRate: 0, totalRevenue: 0, uniqueBuyers: 0, topSource: "—" };
    const purchases = events.filter(e => e.event_type === "purchase");
    const adClicks = events.filter(e => e.event_type === "ad_click");
    const uniqueEmails = new Set(events.filter(e => e.buyer_email).map(e => e.buyer_email));
    const totalRevenue = purchases.reduce((s, e) => s + Number(e.amount || 0), 0);

    // Top source
    const sourceCount = new Map<string, number>();
    purchases.forEach(e => {
      const src = e.utm_source || e.event_source || "direto";
      sourceCount.set(src, (sourceCount.get(src) || 0) + 1);
    });
    const topSource = Array.from(sourceCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return {
      totalLeads: adClicks.length,
      totalPurchases: purchases.length,
      conversionRate: adClicks.length > 0 ? (purchases.length / adClicks.length) * 100 : 0,
      totalRevenue,
      uniqueBuyers: uniqueEmails.size,
      topSource,
    };
  }, [events]);

  // Source attribution chart
  const sourceChart = useMemo(() => {
    if (!events) return [];
    const sourceMap = new Map<string, { clicks: number; purchases: number; revenue: number }>();
    events.forEach(e => {
      const src = e.utm_source || e.event_source || "direto";
      const existing = sourceMap.get(src) || { clicks: 0, purchases: 0, revenue: 0 };
      if (e.event_type === "ad_click") existing.clicks++;
      if (e.event_type === "purchase") {
        existing.purchases++;
        existing.revenue += Number(e.amount || 0);
      }
      sourceMap.set(src, existing);
    });
    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 10);
  }, [events]);

  // Campaign attribution
  const campaignChart = useMemo(() => {
    if (!events) return [];
    const map = new Map<string, { clicks: number; purchases: number; revenue: number }>();
    events.forEach(e => {
      const campaign = e.utm_campaign || e.event_detail || "(sem campanha)";
      const existing = map.get(campaign) || { clicks: 0, purchases: 0, revenue: 0 };
      if (e.event_type === "ad_click") existing.clicks++;
      if (e.event_type === "purchase") {
        existing.purchases++;
        existing.revenue += Number(e.amount || 0);
      }
      map.set(campaign, existing);
    });
    return Array.from(map.entries())
      .map(([campaign, data]) => ({ campaign: campaign.length > 30 ? campaign.slice(0, 30) + "…" : campaign, ...data }))
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 10);
  }, [events]);

  // Event type distribution for pie chart
  const eventTypeDist = useMemo(() => {
    if (!events) return [];
    const map = new Map<string, number>();
    events.forEach(e => {
      map.set(e.event_type, (map.get(e.event_type) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name: EVENT_LABELS[name] || name,
      value,
      color: EVENT_COLORS[name] || EVENT_COLORS.other,
    }));
  }, [events]);

  // Lead journey per buyer (timeline)
  const buyerJourneys = useMemo(() => {
    if (!filteredEvents) return [];
    const map = new Map<string, any[]>();
    filteredEvents.forEach(e => {
      const key = e.buyer_email || e.buyer_name || "anônimo";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries())
      .map(([email, evts]) => ({
        email,
        name: evts[0].buyer_name || email,
        events: evts.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()),
        totalSpent: evts.filter(e => e.event_type === "purchase").reduce((s, e) => s + Number(e.amount || 0), 0),
        hasPurchase: evts.some(e => e.event_type === "purchase"),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 50);
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Route className="h-6 w-6 text-primary" />
            Jornada do Lead
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rastreie a jornada completa desde o clique até a conversão
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => populateMutation.mutate()}
          disabled={populateMutation.isPending}
        >
          {populateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Mapear Jornada
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Cliques Rastreados", value: formatNumber(kpis.totalLeads), icon: MousePointerClick },
          { label: "Compras", value: formatNumber(kpis.totalPurchases), icon: ShoppingCart },
          { label: "Taxa de Conversão", value: formatPercent(kpis.conversionRate), icon: TrendingUp },
          { label: "Receita Atribuída", value: formatBRL(kpis.totalRevenue), icon: Target },
          { label: "Compradores Únicos", value: formatNumber(kpis.uniqueBuyers), icon: Users },
          { label: "Top Fonte", value: kpis.topSource, icon: Filter },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="text-lg font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !events || events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <Route className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum evento de jornada encontrado. Clique em "Mapear Jornada" para processar os dados de vendas existentes.
            </p>
            <Button size="sm" onClick={() => populateMutation.mutate()} disabled={populateMutation.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Mapear Jornada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="attribution">
          <TabsList>
            <TabsTrigger value="attribution" className="text-xs">Atribuição</TabsTrigger>
            <TabsTrigger value="journeys" className="text-xs">Jornadas</TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs">Campanhas</TabsTrigger>
          </TabsList>

          {/* Attribution Tab */}
          <TabsContent value="attribution" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Source Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Compras por Fonte</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={sourceChart} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="source" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(v: number, name: string) =>
                          name === "revenue" ? formatBRL(v) : formatNumber(v)
                        }
                      />
                      <Bar dataKey="purchases" fill="hsl(152, 60%, 42%)" name="Compras" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="clicks" fill="hsl(220, 90%, 56%)" name="Cliques" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Event Type Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição de Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={eventTypeDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {eventTypeDist.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatNumber(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Source Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Atribuição por Fonte</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead className="text-xs text-right">Cliques</TableHead>
                      <TableHead className="text-xs text-right">Compras</TableHead>
                      <TableHead className="text-xs text-right">Taxa Conv.</TableHead>
                      <TableHead className="text-xs text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceChart.map((row) => (
                      <TableRow key={row.source}>
                        <TableCell className="text-xs font-medium">{row.source}</TableCell>
                        <TableCell className="text-xs text-right">{formatNumber(row.clicks)}</TableCell>
                        <TableCell className="text-xs text-right">{formatNumber(row.purchases)}</TableCell>
                        <TableCell className="text-xs text-right">
                          {row.clicks > 0 ? formatPercent((row.purchases / row.clicks) * 100) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatBRL(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Journeys Tab */}
          <TabsContent value="journeys" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por e-mail ou nome..."
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas fontes</SelectItem>
                  {uniqueSources.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterEventType} onValueChange={setFilterEventType}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos tipos</SelectItem>
                  {Object.entries(EVENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Journey Cards */}
            <div className="space-y-3">
              {buyerJourneys.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Nenhuma jornada encontrada com os filtros atuais.
                  </CardContent>
                </Card>
              ) : (
                buyerJourneys.map(journey => (
                  <Card key={journey.email} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold">{journey.name}</p>
                          <p className="text-xs text-muted-foreground">{journey.email}</p>
                        </div>
                        <div className="text-right">
                          {journey.hasPurchase && (
                            <Badge variant="default" className="text-[10px] bg-[hsl(152,60%,42%)]">
                              Convertido
                            </Badge>
                          )}
                          {journey.totalSpent > 0 && (
                            <p className="text-xs font-semibold mt-0.5">{formatBRL(journey.totalSpent)}</p>
                          )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {journey.events.map((evt: any, i: number) => {
                          const Icon = EVENT_ICONS[evt.event_type] || Target;
                          return (
                            <div key={evt.id} className="flex items-center shrink-0">
                              <div
                                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md border border-border/50"
                                style={{ borderColor: EVENT_COLORS[evt.event_type] + "40" }}
                              >
                                <Icon className="h-3.5 w-3.5" style={{ color: EVENT_COLORS[evt.event_type] }} />
                                <span className="text-[9px] font-medium" style={{ color: EVENT_COLORS[evt.event_type] }}>
                                  {EVENT_LABELS[evt.event_type] || evt.event_type}
                                </span>
                                <span className="text-[8px] text-muted-foreground">
                                  {new Date(evt.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                </span>
                                {evt.utm_source && (
                                  <span className="text-[8px] text-muted-foreground/70">{evt.utm_source}</span>
                                )}
                              </div>
                              {i < journey.events.length - 1 && (
                                <ArrowRight className="h-3 w-3 text-muted-foreground/30 mx-0.5 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance por Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campaignChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="campaign" type="category" width={150} tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(v: number, name: string) =>
                        name === "revenue" ? formatBRL(v) : formatNumber(v)
                      }
                    />
                    <Bar dataKey="purchases" fill="hsl(152, 60%, 42%)" name="Compras" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="clicks" fill="hsl(220, 90%, 56%)" name="Cliques" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Detalhamento por Campanha</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Campanha</TableHead>
                      <TableHead className="text-xs text-right">Cliques</TableHead>
                      <TableHead className="text-xs text-right">Compras</TableHead>
                      <TableHead className="text-xs text-right">Taxa Conv.</TableHead>
                      <TableHead className="text-xs text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignChart.map((row) => (
                      <TableRow key={row.campaign}>
                        <TableCell className="text-xs font-medium">{row.campaign}</TableCell>
                        <TableCell className="text-xs text-right">{formatNumber(row.clicks)}</TableCell>
                        <TableCell className="text-xs text-right">{formatNumber(row.purchases)}</TableCell>
                        <TableCell className="text-xs text-right">
                          {row.clicks > 0 ? formatPercent((row.purchases / row.clicks) * 100) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatBRL(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
