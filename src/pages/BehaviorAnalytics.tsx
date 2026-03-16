import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { formatNumber, formatPercent } from "@/lib/formatters";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { MousePointer2, ScrollText, Flame, Eye } from "lucide-react";

const COLORS = [
  "hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
];
const tooltipStyle = {};

export default function BehaviorAnalytics() {
  const { projectId } = useParams();
  const [period, setPeriod] = useState("7");
  const [selectedPage, setSelectedPage] = useState<string>("all");

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  // Fetch all behavior events
  const { data: events = [] } = useQuery({
    queryKey: ["behavior_events", projectId, period],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_events")
        .select("event_type, page_url, metadata, visitor_id, created_at")
        .eq("project_id", projectId!)
        .gte("created_at", fromDate)
        .in("event_type", ["click", "scroll_depth", "mouse_move", "page_view"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Extract unique pages
  const pages = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.page_url) {
        try {
          const url = new URL(e.page_url);
          set.add(url.pathname);
        } catch { /* ignore */ }
      }
    });
    return Array.from(set).sort();
  }, [events]);

  // Filter by page
  const filtered = useMemo(() => {
    if (selectedPage === "all") return events;
    return events.filter((e) => {
      try {
        return new URL(e.page_url || "").pathname === selectedPage;
      } catch { return false; }
    });
  }, [events, selectedPage]);

  // Click analytics
  const clickData = useMemo(() => {
    const clicks = filtered.filter((e) => e.event_type === "click");
    const elementMap = new Map<string, { count: number; text: string; tag: string }>();
    clicks.forEach((e) => {
      const m = e.metadata as any;
      if (!m) return;
      const key = m.selector || m.tag || "unknown";
      const existing = elementMap.get(key) || { count: 0, text: m.text || "", tag: m.tag || "" };
      existing.count++;
      if (m.text && !existing.text) existing.text = m.text;
      elementMap.set(key, existing);
    });
    return Array.from(elementMap.entries())
      .map(([selector, data]) => ({ selector, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [filtered]);

  // Scroll depth stats
  const scrollData = useMemo(() => {
    const scrollEvents = filtered.filter((e) => e.event_type === "scroll_depth");
    const depths = { 25: 0, 50: 0, 75: 0, 100: 0 };
    const visitors = new Set<string>();
    scrollEvents.forEach((e) => {
      const m = e.metadata as any;
      if (!m?.depth) return;
      visitors.add(e.visitor_id || "");
      depths[m.depth as keyof typeof depths] = (depths[m.depth as keyof typeof depths] || 0) + 1;
    });
    const totalVisitors = new Set(filtered.filter((e) => e.event_type === "page_view").map((e) => e.visitor_id)).size || 1;
    return [
      { depth: "25%", count: depths[25], pct: (depths[25] / totalVisitors) * 100 },
      { depth: "50%", count: depths[50], pct: (depths[50] / totalVisitors) * 100 },
      { depth: "75%", count: depths[75], pct: (depths[75] / totalVisitors) * 100 },
      { depth: "100%", count: depths[100], pct: (depths[100] / totalVisitors) * 100 },
    ];
  }, [filtered]);

  // Heatmap data (aggregate mouse positions into grid)
  const heatmapGrid = useMemo(() => {
    const mouseEvents = filtered.filter((e) => e.event_type === "mouse_move");
    const gridCols = 20;
    const gridRows = 30;
    const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
    let maxVal = 0;
    let maxPageH = 1;

    mouseEvents.forEach((e) => {
      const m = e.metadata as any;
      if (!m?.points || !m.vw || !m.page_h) return;
      if (m.page_h > maxPageH) maxPageH = m.page_h;
      m.points.forEach((p: any) => {
        const col = Math.min(gridCols - 1, Math.floor((p.x / m.vw) * gridCols));
        const row = Math.min(gridRows - 1, Math.floor((p.y / m.page_h) * gridRows));
        if (col >= 0 && row >= 0) {
          grid[row][col]++;
          if (grid[row][col] > maxVal) maxVal = grid[row][col];
        }
      });
    });

    return { grid, maxVal, gridCols, gridRows };
  }, [filtered]);

  // Click heatmap
  const clickHeatmap = useMemo(() => {
    const clicks = filtered.filter((e) => e.event_type === "click");
    const gridCols = 20;
    const gridRows = 30;
    const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
    let maxVal = 0;

    clicks.forEach((e) => {
      const m = e.metadata as any;
      if (!m?.x || !m?.vw || !m?.page_h) return;
      const col = Math.min(gridCols - 1, Math.floor((m.x / m.vw) * gridCols));
      const row = Math.min(gridRows - 1, Math.floor((m.y / m.page_h) * gridRows));
      if (col >= 0 && row >= 0) {
        grid[row][col]++;
        if (grid[row][col] > maxVal) maxVal = grid[row][col];
      }
    });

    return { grid, maxVal, gridCols, gridRows };
  }, [filtered]);

  // Summary stats
  const summary = useMemo(() => {
    const totalClicks = filtered.filter((e) => e.event_type === "click").length;
    const totalPageViews = filtered.filter((e) => e.event_type === "page_view").length;
    const uniqueVisitors = new Set(filtered.map((e) => e.visitor_id).filter(Boolean)).size;
    const avgScrollDepth = scrollData.length > 0
      ? scrollData.reduce((sum, s) => sum + s.pct, 0) / scrollData.length
      : 0;
    return { totalClicks, totalPageViews, uniqueVisitors, avgScrollDepth };
  }, [filtered, scrollData]);

  const getHeatColor = (value: number, max: number) => {
    if (max === 0 || value === 0) return "transparent";
    const intensity = value / max;
    if (intensity > 0.7) return `hsla(0, 80%, 50%, ${0.4 + intensity * 0.5})`;
    if (intensity > 0.4) return `hsla(38, 90%, 50%, ${0.3 + intensity * 0.4})`;
    if (intensity > 0.1) return `hsla(220, 80%, 56%, ${0.2 + intensity * 0.3})`;
    return `hsla(220, 80%, 56%, ${intensity * 0.3})`;
  };

  const HeatGrid = ({ data, title }: { data: typeof heatmapGrid; title: string }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {data.maxVal === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm bg-muted rounded-lg">
          Sem dados suficientes para gerar o mapa
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border" style={{ aspectRatio: `${data.gridCols}/${data.gridRows}` }}>
          <div
            className="grid w-full h-full"
            style={{
              gridTemplateColumns: `repeat(${data.gridCols}, 1fr)`,
              gridTemplateRows: `repeat(${data.gridRows}, 1fr)`,
            }}
          >
            {data.grid.flat().map((val, i) => (
              <div
                key={i}
                className="transition-colors"
                style={{ backgroundColor: getHeatColor(val, data.maxVal) }}
              />
            ))}
          </div>
          {/* Legend overlay */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1">
            <span>Baixo</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getHeatColor(v, 1) }} />
              ))}
            </div>
            <span>Alto</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Comportamento</h1>
          <p className="text-sm text-muted-foreground">Mapa de calor, cliques e profundidade de scroll</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="w-48 text-xs h-8">
              <SelectValue placeholder="Todas as páginas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as páginas</SelectItem>
              {pages.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de Cliques", value: formatNumber(summary.totalClicks), icon: MousePointer2, color: "text-primary" },
          { label: "Page Views", value: formatNumber(summary.totalPageViews), icon: Eye, color: "text-accent" },
          { label: "Visitantes", value: formatNumber(summary.uniqueVisitors), icon: Flame, color: "text-success" },
          { label: "Scroll Médio", value: formatPercent(summary.avgScrollDepth), icon: ScrollText, color: "text-warning" },
        ].map((card, i) => (
          <AnimatedCard key={card.label} index={i}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList>
          <TabsTrigger value="heatmap" className="text-xs">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="clicks" className="text-xs">Cliques</TabsTrigger>
          <TabsTrigger value="scroll" className="text-xs">Scroll</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatedCard index={0}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="h-4 w-4 text-destructive" />
                    Mapa de Calor — Mouse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HeatGrid data={heatmapGrid} title="" />
                </CardContent>
              </Card>
            </AnimatedCard>
            <AnimatedCard index={1}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MousePointer2 className="h-4 w-4 text-primary" />
                    Mapa de Calor — Cliques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HeatGrid data={clickHeatmap} title="" />
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </TabsContent>

        <TabsContent value="clicks" className="mt-4 space-y-4">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Elementos Mais Clicados</CardTitle>
              </CardHeader>
              <CardContent>
                {clickData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum clique registrado ainda.</p>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={clickData.slice(0, 10)} layout="vertical">
                          <XAxis type="number" fontSize={11} />
                          <YAxis type="category" dataKey="text" width={120} fontSize={10} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
                          <Tooltip cursor={false} contentStyle={tooltipStyle} />
                          <Bar dataKey="count" name="Cliques" radius={[0, 4, 4, 0]}>
                            {clickData.slice(0, 10).map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Elemento</TableHead>
                          <TableHead className="text-xs">Texto</TableHead>
                          <TableHead className="text-xs text-right">Cliques</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clickData.map((row) => (
                          <TableRow key={row.selector}>
                            <TableCell className="text-xs font-mono">{row.tag}</TableCell>
                            <TableCell className="text-xs truncate max-w-[200px]">{row.text || "—"}</TableCell>
                            <TableCell className="text-xs text-right font-bold">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="scroll" className="mt-4 space-y-4">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Profundidade de Scroll</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scrollData.map((s, i) => (
                    <div key={s.depth} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.depth}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(s.count)} visitantes · {formatPercent(s.pct)}
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, s.pct)}%`,
                            backgroundColor: COLORS[i],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 h-48">
                  <ResponsiveContainer>
                    <BarChart data={scrollData}>
                      <XAxis dataKey="depth" fontSize={12} />
                      <YAxis fontSize={11} />
                      <Tooltip cursor={false} contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="Visitantes" radius={[4, 4, 0, 0]}>
                        {scrollData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  );
}
