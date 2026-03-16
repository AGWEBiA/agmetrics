import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { formatNumber } from "@/lib/formatters";
import {
  Eye, Users, MousePointerClick, ArrowDownRight, Globe, MonitorSmartphone, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const COLORS = [
  "hsl(var(--primary))", "hsl(220, 90%, 56%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(265, 80%, 60%)", "hsl(340, 80%, 55%)",
];

export default function PixelAnalytics() {
  const { projectId } = useParams();
  const [period, setPeriod] = useState("7");

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(period));
    return d.toISOString();
  }, [period]);

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

  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const uniqueVisitors = new Set(events.map((e) => e.visitor_id).filter(Boolean)).size;
    const customEvents = events.filter((e) => e.event_type !== "page_view").length;
    const conversionRate = uniqueVisitors > 0 ? ((salesCount / uniqueVisitors) * 100) : 0;
    return { pageViews, uniqueVisitors, customEvents, conversionRate };
  }, [events, salesCount]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; views: number; visitors: Set<string> }>();
    events.forEach((e) => {
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
  }, [events]);

  // UTM source breakdown
  const utmData = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => {
      const src = e.utm_source || "(direto)";
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [events]);

  // Top pages
  const topPages = useMemo(() => {
    const map = new Map<string, number>();
    events.filter((e) => e.event_type === "page_view" && e.page_url).forEach((e) => {
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
  }, [events]);

  // Referrers
  const referrerData = useMemo(() => {
    const map = new Map<string, number>();
    events.filter((e) => e.referrer).forEach((e) => {
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
  }, [events]);

  // Funnel data
  const funnelData = useMemo(() => {
    return [
      { stage: "Visitantes", value: stats.uniqueVisitors, color: COLORS[0] },
      { stage: "Page Views", value: stats.pageViews, color: COLORS[1] },
      { stage: "Vendas", value: salesCount, color: COLORS[2] },
    ];
  }, [stats, salesCount]);

  const metricCards = [
    { title: "Page Views", value: formatNumber(stats.pageViews), icon: Eye, color: "text-primary" },
    { title: "Visitantes Únicos", value: formatNumber(stats.uniqueVisitors), icon: Users, color: "text-blue-500" },
    { title: "Eventos Customizados", value: formatNumber(stats.customEvents), icon: MousePointerClick, color: "text-amber-500" },
    { title: "Taxa de Conversão", value: `${stats.conversionRate.toFixed(2)}%`, icon: TrendingUp, color: "text-emerald-500" },
  ];

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics do Pixel</h1>
          <p className="text-sm text-muted-foreground">Dados de rastreamento de visitantes e conversões</p>
        </div>
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

      {/* Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m, i) => (
          <AnimatedCard key={m.title} index={i}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{m.title}</p>
                    <p className="text-xl font-bold">{m.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          <TabsTrigger value="pages">Páginas</TabsTrigger>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="sources" className="grid gap-4 md:grid-cols-2">
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
        </TabsContent>

        <TabsContent value="pages">
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
        </TabsContent>

        <TabsContent value="funnel">
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
