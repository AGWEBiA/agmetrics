import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabContent } from "@/components/AnimatedTabContent";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { MetricCardsSkeleton, ChartSkeleton } from "@/components/MobileLoadingSkeleton";
import { formatNumber } from "@/lib/formatters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Eye, Users, MousePointerClick, ArrowDownRight, Globe, MonitorSmartphone,
  TrendingUp, TrendingDown, Filter, X, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const COLORS = [
  "hsl(var(--primary))", "hsl(220, 90%, 56%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(265, 80%, 60%)", "hsl(340, 80%, 55%)",
];

const TRAFFIC_DROP_THRESHOLD = 30; // % drop to trigger alert

export default function PixelAnalytics() {
  const { projectId } = useParams();
  const [period, setPeriod] = useState("7");

  // Advanced filters
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterMedium, setFilterMedium] = useState<string>("all");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [filterEventType, setFilterEventType] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const periodDays = parseInt(period);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays);
    return d.toISOString();
  }, [periodDays]);

  // Previous period for comparison
  const prevStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays * 2);
    return d.toISOString();
  }, [periodDays]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["tracking_events", projectId, period],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_events")
        .select("*")
        .eq("project_id", projectId!)
        .gte("created_at", startDate)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Previous period events for traffic drop detection
  const { data: prevEvents = [] } = useQuery({
    queryKey: ["tracking_events_prev", projectId, period],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_events")
        .select("id, event_type, visitor_id")
        .eq("project_id", projectId!)
        .gte("created_at", prevStartDate)
        .lt("created_at", startDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: salesCount = 0 } = useQuery({
    queryKey: ["pixel_sales_count", projectId, period],
    enabled: !!projectId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sales_events")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!)
        .gte("created_at", startDate)
        .eq("status", "approved");
      if (error) throw error;
      return count || 0;
    },
  });

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const sources = new Set<string>();
    const mediums = new Set<string>();
    const campaigns = new Set<string>();
    const eventTypes = new Set<string>();
    events.forEach((e) => {
      if (e.utm_source) sources.add(e.utm_source);
      if (e.utm_medium) mediums.add(e.utm_medium);
      if (e.utm_campaign) campaigns.add(e.utm_campaign);
      eventTypes.add(e.event_type);
    });
    return {
      sources: Array.from(sources).sort(),
      mediums: Array.from(mediums).sort(),
      campaigns: Array.from(campaigns).sort(),
      eventTypes: Array.from(eventTypes).sort(),
    };
  }, [events]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterSource !== "all" && (e.utm_source || "(direto)") !== filterSource) return false;
      if (filterMedium !== "all" && (e.utm_medium || "(nenhum)") !== filterMedium) return false;
      if (filterCampaign !== "all" && (e.utm_campaign || "(nenhuma)") !== filterCampaign) return false;
      if (filterEventType !== "all" && e.event_type !== filterEventType) return false;
      return true;
    });
  }, [events, filterSource, filterMedium, filterCampaign, filterEventType]);

  const activeFilterCount = [filterSource, filterMedium, filterCampaign, filterEventType].filter((f) => f !== "all").length;

  const clearFilters = () => {
    setFilterSource("all");
    setFilterMedium("all");
    setFilterCampaign("all");
    setFilterEventType("all");
  };

  // Traffic drop alert
  const trafficAlert = useMemo(() => {
    const currentViews = events.filter((e) => e.event_type === "page_view").length;
    const prevViews = prevEvents.filter((e) => e.event_type === "page_view").length;
    const currentVisitors = new Set(events.map((e) => e.visitor_id).filter(Boolean)).size;
    const prevVisitors = new Set(prevEvents.map((e) => e.visitor_id).filter(Boolean)).size;

    const alerts: { metric: string; current: number; previous: number; dropPct: number }[] = [];

    if (prevViews > 10) {
      const dropPct = ((prevViews - currentViews) / prevViews) * 100;
      if (dropPct >= TRAFFIC_DROP_THRESHOLD) {
        alerts.push({ metric: "Page Views", current: currentViews, previous: prevViews, dropPct });
      }
    }
    if (prevVisitors > 5) {
      const dropPct = ((prevVisitors - currentVisitors) / prevVisitors) * 100;
      if (dropPct >= TRAFFIC_DROP_THRESHOLD) {
        alerts.push({ metric: "Visitantes Únicos", current: currentVisitors, previous: prevVisitors, dropPct });
      }
    }
    return alerts;
  }, [events, prevEvents]);

  // Stats using filtered events
  const stats = useMemo(() => {
    const pageViews = filteredEvents.filter((e) => e.event_type === "page_view").length;
    const uniqueVisitors = new Set(filteredEvents.map((e) => e.visitor_id).filter(Boolean)).size;
    const customEvents = filteredEvents.filter((e) => e.event_type !== "page_view").length;
    const thankYouPages = filteredEvents.filter((e) => e.event_type === "thank_you_page").length;
    const conversionRate = uniqueVisitors > 0 ? ((salesCount / uniqueVisitors) * 100) : 0;
    return { pageViews, uniqueVisitors, customEvents, thankYouPages, conversionRate };
  }, [filteredEvents, salesCount]);

  // Comparison with previous period
  const prevStats = useMemo(() => {
    const pageViews = prevEvents.filter((e) => e.event_type === "page_view").length;
    const uniqueVisitors = new Set(prevEvents.map((e) => e.visitor_id).filter(Boolean)).size;
    return { pageViews, uniqueVisitors };
  }, [prevEvents]);

  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Daily chart data
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; views: number; visitors: Set<string> }>();
    filteredEvents.forEach((e) => {
      const day = e.created_at.split("T")[0];
      if (!map.has(day)) map.set(day, { date: day, views: 0, visitors: new Set() });
      const entry = map.get(day)!;
      if (e.event_type === "page_view") entry.views++;
      if (e.visitor_id) entry.visitors.add(e.visitor_id);
    });
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        "Page Views": d.views,
        "Visitantes": d.visitors.size,
      }));
  }, [filteredEvents]);

  // UTM source breakdown
  const utmData = useMemo(() => {
    const map = new Map<string, number>();
    filteredEvents.forEach((e) => {
      const src = e.utm_source || "(direto)";
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredEvents]);

  // UTM campaign breakdown
  const campaignData = useMemo(() => {
    const map = new Map<string, { views: number; visitors: Set<string> }>();
    filteredEvents.forEach((e) => {
      const campaign = e.utm_campaign || "(sem campanha)";
      if (!map.has(campaign)) map.set(campaign, { views: 0, visitors: new Set() });
      const entry = map.get(campaign)!;
      if (e.event_type === "page_view") entry.views++;
      if (e.visitor_id) entry.visitors.add(e.visitor_id);
    });
    return Array.from(map.entries())
      .map(([campaign, d]) => ({ campaign, views: d.views, visitors: d.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);
  }, [filteredEvents]);

  // Top pages
  const topPages = useMemo(() => {
    const map = new Map<string, number>();
    filteredEvents.filter((e) => e.event_type === "page_view" && e.page_url).forEach((e) => {
      try {
        const path = new URL(e.page_url!).pathname;
        map.set(path, (map.get(path) || 0) + 1);
      } catch {
        map.set(e.page_url!, (map.get(e.page_url!) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [filteredEvents]);

  // Referrers
  const referrerData = useMemo(() => {
    const map = new Map<string, number>();
    filteredEvents.filter((e) => e.referrer).forEach((e) => {
      try {
        const host = new URL(e.referrer!).hostname;
        map.set(host, (map.get(host) || 0) + 1);
      } catch {
        map.set(e.referrer!, (map.get(e.referrer!) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredEvents]);

  // Funnel data
  const funnelData = useMemo(() => {
    const steps = [
      { stage: "Visitantes", value: stats.uniqueVisitors, color: COLORS[0] },
      { stage: "Page Views", value: stats.pageViews, color: COLORS[1] },
    ];
    if (stats.thankYouPages > 0) {
      steps.push({ stage: "Obrigado (LP)", value: stats.thankYouPages, color: COLORS[3] || "#f59e0b" });
    }
    steps.push({ stage: "Vendas", value: salesCount, color: COLORS[2] });
    return steps;
  }, [stats, salesCount]);

  const VariationBadge = ({ current, previous }: { current: number; previous: number }) => {
    const variation = getVariation(current, previous);
    if (variation === null) return null;
    const isPositive = variation >= 0;
    return (
      <Badge variant="outline" className={`text-[10px] ${isPositive ? "text-emerald-600 border-emerald-200" : "text-destructive border-destructive/30"}`}>
        {isPositive ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
        {isPositive ? "+" : ""}{variation.toFixed(1)}%
      </Badge>
    );
  };

  const metricCards = [
    { title: "Page Views", value: formatNumber(stats.pageViews), icon: Eye, color: "text-primary", prev: prevStats.pageViews },
    { title: "Visitantes Únicos", value: formatNumber(stats.uniqueVisitors), icon: Users, color: "text-blue-500", prev: prevStats.uniqueVisitors },
    { title: "Eventos Customizados", value: formatNumber(stats.customEvents), icon: MousePointerClick, color: "text-amber-500", prev: null },
    { title: "Taxa de Conversão", value: `${stats.conversionRate.toFixed(2)}%`, icon: TrendingUp, color: "text-emerald-500", prev: null },
  ];

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics do Pixel</h1>
          <p className="text-sm text-muted-foreground">Dados de rastreamento de visitantes e conversões</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-[10px] bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Filtros Avançados</p>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-muted-foreground">
                  <X className="h-3 w-3 mr-1" /> Limpar filtros
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">UTM Source</label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="(direto)">(direto)</SelectItem>
                    {filterOptions.sources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">UTM Medium</label>
                <Select value={filterMedium} onValueChange={setFilterMedium}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="(nenhum)">(nenhum)</SelectItem>
                    {filterOptions.mediums.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">UTM Campaign</label>
                <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="(nenhuma)">(nenhuma)</SelectItem>
                    {filterOptions.campaigns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tipo de Evento</label>
                <Select value={filterEventType} onValueChange={setFilterEventType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterOptions.eventTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traffic Drop Alerts */}
      {trafficAlert.length > 0 && (
        <div className="space-y-2">
          {trafficAlert.map((alert) => (
            <Alert key={alert.metric} variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Queda de tráfego detectada</AlertTitle>
              <AlertDescription className="text-xs">
                <strong>{alert.metric}</strong> caiu <strong>{alert.dropPct.toFixed(1)}%</strong> em relação ao período anterior
                ({formatNumber(alert.previous)} → {formatNumber(alert.current)}).
                Verifique suas campanhas e fontes de tráfego.
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m, i) => (
          <AnimatedCard key={m.title} index={i}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{m.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold">{m.value}</p>
                      {m.prev !== null && (
                        <VariationBadge
                          current={m.title === "Page Views" ? stats.pageViews : stats.uniqueVisitors}
                          previous={m.prev}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="pages">Páginas</TabsTrigger>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
        </TabsList>

        <AnimatedTabContent value="overview" className="space-y-4">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tráfego Diário</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    Nenhum dado de tráfego neste período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Area type="monotone" dataKey="Page Views" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" />
                      <Area type="monotone" dataKey="Visitantes" fill="hsl(220, 90%, 56%, 0.15)" stroke="hsl(220, 90%, 56%)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </AnimatedTabContent>

        <AnimatedTabContent value="sources" className="grid gap-4 md:grid-cols-2">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" /> UTM Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                {utmData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={utmData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {utmData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard index={1}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4" /> Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {referrerData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={referrerData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </AnimatedTabContent>

        <AnimatedTabContent value="campaigns">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance por Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados de campanha</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-right">Page Views</TableHead>
                        <TableHead className="text-right">Visitantes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignData.map((c) => (
                        <TableRow key={c.campaign}>
                          <TableCell className="font-medium text-sm max-w-[250px] truncate">{c.campaign}</TableCell>
                          <TableCell className="text-right">{formatNumber(c.views)}</TableCell>
                          <TableCell className="text-right">{formatNumber(c.visitors)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </AnimatedTabContent>

        <AnimatedTabContent value="pages">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MonitorSmartphone className="h-4 w-4" /> Páginas Mais Visitadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Página</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map((p) => (
                        <TableRow key={p.page}>
                          <TableCell className="font-mono text-sm truncate max-w-[300px]">{p.page}</TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(p.views)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </AnimatedTabContent>

        <AnimatedTabContent value="funnel">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnelData.map((step, i) => {
                    const maxVal = Math.max(...funnelData.map((f) => f.value), 1);
                    const pct = (step.value / maxVal) * 100;
                    const dropoff = i > 0 && funnelData[i - 1].value > 0
                      ? ((1 - step.value / funnelData[i - 1].value) * 100).toFixed(1)
                      : null;
                    return (
                      <div key={step.stage} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{step.stage}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{formatNumber(step.value)}</span>
                            {dropoff && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                -{dropoff}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="h-8 bg-muted rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: step.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  );
}
