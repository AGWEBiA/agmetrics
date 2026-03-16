import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabContent } from "@/components/AnimatedTabContent";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { MetricCardsSkeleton, HeatmapSkeleton } from "@/components/MobileLoadingSkeleton";
import { formatNumber, formatPercent, formatDateTimeBR } from "@/lib/formatters";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { MousePointer2, ScrollText, Flame, Eye, GitCompareArrows, Video, ArrowUp, ArrowDown, Minus, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
];
const tooltipStyle = {};

interface TrackingEvent {
  event_type: string;
  page_url: string | null;
  metadata: any;
  visitor_id: string | null;
  created_at: string;
}

function getPathname(url: string | null): string {
  if (!url) return "/";
  try { return new URL(url).pathname; } catch { return url; }
}

function computePageMetrics(events: TrackingEvent[]) {
  const clicks = events.filter((e) => e.event_type === "click").length;
  const pageViews = events.filter((e) => e.event_type === "page_view").length;
  const visitors = new Set(events.map((e) => e.visitor_id).filter(Boolean)).size;
  const scrollEvents = events.filter((e) => e.event_type === "scroll_depth");
  const depths = { 25: 0, 50: 0, 75: 0, 100: 0 };
  scrollEvents.forEach((e) => {
    const m = e.metadata as any;
    if (m?.depth) depths[m.depth as keyof typeof depths]++;
  });
  const totalV = pageViews || 1;
  const avgScroll = [25, 50, 75, 100].reduce((s, d) => s + (depths[d as keyof typeof depths] / totalV) * d, 0) / 4;
  return { clicks, pageViews, visitors, avgScroll, depths, totalV };
}

export default function BehaviorAnalytics() {
  const { projectId } = useParams();
  const [period, setPeriod] = useState("7");
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [comparePage1, setComparePage1] = useState<string>("");
  const [comparePage2, setComparePage2] = useState<string>("");

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  const { data: events = [], isLoading } = useQuery({
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
      return (data || []) as TrackingEvent[];
    },
    refetchInterval: 60000,
  });

  const pages = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => { if (e.page_url) set.add(getPathname(e.page_url)); });
    return Array.from(set).sort();
  }, [events]);

  // Auto-select comparison pages
  useMemo(() => {
    if (pages.length >= 2 && !comparePage1 && !comparePage2) {
      setComparePage1(pages[0]);
      setComparePage2(pages[1]);
    }
  }, [pages]);

  const filtered = useMemo(() => {
    if (selectedPage === "all") return events;
    return events.filter((e) => getPathname(e.page_url) === selectedPage);
  }, [events, selectedPage]);

  // Per-page metrics for page selector cards
  const pageMetrics = useMemo(() => {
    const map = new Map<string, { views: number; clicks: number; visitors: Set<string> }>();
    events.forEach((e) => {
      const path = getPathname(e.page_url);
      if (!map.has(path)) map.set(path, { views: 0, clicks: 0, visitors: new Set() });
      const entry = map.get(path)!;
      if (e.event_type === "page_view") entry.views++;
      if (e.event_type === "click") entry.clicks++;
      if (e.visitor_id) entry.visitors.add(e.visitor_id);
    });
    return Array.from(map.entries())
      .map(([path, d]) => ({ path, views: d.views, clicks: d.clicks, visitors: d.visitors.size }))
      .sort((a, b) => b.views - a.views);
  }, [events]);

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
    scrollEvents.forEach((e) => {
      const m = e.metadata as any;
      if (!m?.depth) return;
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

  // Heatmap data
  const heatmapGrid = useMemo(() => {
    const mouseEvents = filtered.filter((e) => e.event_type === "mouse_move");
    const gridCols = 20, gridRows = 30;
    const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
    let maxVal = 0;
    mouseEvents.forEach((e) => {
      const m = e.metadata as any;
      if (!m?.points || !m.vw || !m.page_h) return;
      m.points.forEach((p: any) => {
        const col = Math.min(gridCols - 1, Math.floor((p.x / m.vw) * gridCols));
        const row = Math.min(gridRows - 1, Math.floor((p.y / m.page_h) * gridRows));
        if (col >= 0 && row >= 0) { grid[row][col]++; if (grid[row][col] > maxVal) maxVal = grid[row][col]; }
      });
    });
    return { grid, maxVal, gridCols, gridRows };
  }, [filtered]);

  const clickHeatmap = useMemo(() => {
    const clicks = filtered.filter((e) => e.event_type === "click");
    const gridCols = 20, gridRows = 30;
    const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
    let maxVal = 0;
    clicks.forEach((e) => {
      const m = e.metadata as any;
      if (!m?.x || !m?.vw || !m?.page_h) return;
      const col = Math.min(gridCols - 1, Math.floor((m.x / m.vw) * gridCols));
      const row = Math.min(gridRows - 1, Math.floor((m.y / m.page_h) * gridRows));
      if (col >= 0 && row >= 0) { grid[row][col]++; if (grid[row][col] > maxVal) maxVal = grid[row][col]; }
    });
    return { grid, maxVal, gridCols, gridRows };
  }, [filtered]);

  const summary = useMemo(() => {
    const totalClicks = filtered.filter((e) => e.event_type === "click").length;
    const totalPageViews = filtered.filter((e) => e.event_type === "page_view").length;
    const uniqueVisitors = new Set(filtered.map((e) => e.visitor_id).filter(Boolean)).size;
    const avgScrollDepth = scrollData.length > 0 ? scrollData.reduce((s, d) => s + d.pct, 0) / scrollData.length : 0;
    return { totalClicks, totalPageViews, uniqueVisitors, avgScrollDepth };
  }, [filtered, scrollData]);

  // ── Session replay data ──
  const sessions = useMemo(() => {
    const visitorMap = new Map<string, TrackingEvent[]>();
    events.forEach((e) => {
      if (!e.visitor_id) return;
      const arr = visitorMap.get(e.visitor_id) || [];
      arr.push(e);
      visitorMap.set(e.visitor_id, arr);
    });

    return Array.from(visitorMap.entries())
      .map(([vid, evts]) => {
        const sorted = evts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const firstAt = sorted[0]?.created_at;
        const lastAt = sorted[sorted.length - 1]?.created_at;
        const duration = firstAt && lastAt ? (new Date(lastAt).getTime() - new Date(firstAt).getTime()) / 1000 : 0;
        const pagesVisited = new Set(sorted.map((e) => getPathname(e.page_url))).size;
        const totalClicks = sorted.filter((e) => e.event_type === "click").length;
        const maxScroll = Math.max(0, ...sorted.filter((e) => e.event_type === "scroll_depth").map((e) => (e.metadata as any)?.depth || 0));
        return { vid, events: sorted, firstAt, lastAt, duration, pagesVisited, totalClicks, maxScroll, eventCount: sorted.length };
      })
      .sort((a, b) => new Date(b.firstAt || 0).getTime() - new Date(a.firstAt || 0).getTime())
      .slice(0, 50);
  }, [events]);

  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // ── Compare page metrics ──
  const compareMetrics = useMemo(() => {
    if (!comparePage1 || !comparePage2) return null;
    const evts1 = events.filter((e) => getPathname(e.page_url) === comparePage1);
    const evts2 = events.filter((e) => getPathname(e.page_url) === comparePage2);
    return { page1: computePageMetrics(evts1), page2: computePageMetrics(evts2) };
  }, [events, comparePage1, comparePage2]);

  const getHeatColor = (value: number, max: number) => {
    if (max === 0 || value === 0) return "transparent";
    const intensity = value / max;
    if (intensity > 0.7) return `hsla(0, 80%, 50%, ${0.4 + intensity * 0.5})`;
    if (intensity > 0.4) return `hsla(38, 90%, 50%, ${0.3 + intensity * 0.4})`;
    if (intensity > 0.1) return `hsla(220, 80%, 56%, ${0.2 + intensity * 0.3})`;
    return `hsla(220, 80%, 56%, ${intensity * 0.3})`;
  };

  // Resolve the full page URL for iframe background
  const resolvedPageUrl = useMemo(() => {
    if (selectedPage === "all" || !selectedPage) return null;
    // Try to find a full URL from events matching the selected page
    const match = events.find((e) => e.page_url && getPathname(e.page_url) === selectedPage);
    if (match?.page_url) {
      try {
        const url = new URL(match.page_url);
        return url.origin + url.pathname;
      } catch {
        return null;
      }
    }
    return null;
  }, [events, selectedPage]);

  const HeatGrid = ({ data, title, showPageLayout = false }: { data: typeof heatmapGrid; title: string; showPageLayout?: boolean }) => (
    <div className="space-y-2">
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {data.maxVal === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm bg-muted rounded-lg">
          Sem dados suficientes para gerar o mapa
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border bg-muted" style={{ aspectRatio: `${data.gridCols}/${data.gridRows}` }}>
          {/* Page layout iframe as background */}
          {showPageLayout && resolvedPageUrl && (
            <div className="absolute inset-0 overflow-hidden">
              <iframe
                src={resolvedPageUrl}
                title="Page layout preview"
                className="w-full border-0 pointer-events-none origin-top-left"
                style={{
                  height: "300%",
                  transform: "scale(1)",
                  transformOrigin: "top left",
                  opacity: 0.35,
                }}
                sandbox="allow-same-origin"
                loading="lazy"
                tabIndex={-1}
              />
            </div>
          )}
          {/* Show placeholder when no page layout available */}
          {showPageLayout && !resolvedPageUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 gap-1">
              <Layout className="h-8 w-8" />
              <span className="text-[10px]">Selecione uma página para ver o layout</span>
            </div>
          )}
          {/* Heatmap overlay */}
          <div className="absolute inset-0 grid w-full h-full" style={{ gridTemplateColumns: `repeat(${data.gridCols}, 1fr)`, gridTemplateRows: `repeat(${data.gridRows}, 1fr)` }}>
            {data.grid.flat().map((val, i) => (
              <div key={i} style={{ backgroundColor: getHeatColor(val, data.maxVal) }} />
            ))}
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 z-10">
            <span>Baixo</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getHeatColor(v, 1) }} />
              ))}
            </div>
            <span>Alto</span>
          </div>
          {/* Page URL indicator */}
          {showPageLayout && resolvedPageUrl && (
            <div className="absolute top-2 left-2 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded px-2 py-1 z-10 flex items-center gap-1">
              <Layout className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{selectedPage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const DiffIndicator = ({ a, b, suffix = "" }: { a: number; b: number; suffix?: string }) => {
    if (b === 0 && a === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    const diff = b !== 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0;
    const isUp = diff > 0;
    return (
      <span className={`text-xs flex items-center gap-0.5 ${isUp ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
        {isUp ? <ArrowUp className="h-3 w-3" /> : diff < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {Math.abs(diff).toFixed(1)}%{suffix}
      </span>
    );
  };

  const eventIcon = (type: string) => {
    switch (type) {
      case "page_view": return <Eye className="h-3 w-3 text-primary" />;
      case "click": return <MousePointer2 className="h-3 w-3 text-accent" />;
      case "scroll_depth": return <ScrollText className="h-3 w-3 text-warning" />;
      case "mouse_move": return <Flame className="h-3 w-3 text-destructive" />;
      default: return <Eye className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const eventLabel = (e: TrackingEvent) => {
    switch (e.event_type) {
      case "page_view": return `Visitou ${getPathname(e.page_url)}`;
      case "click": {
        const m = e.metadata as any;
        return `Clicou em "${(m?.text || m?.tag || "elemento").substring(0, 40)}"`;
      }
      case "scroll_depth": return `Scroll ${(e.metadata as any)?.depth || 0}%`;
      case "mouse_move": return `${(e.metadata as any)?.points?.length || 0} movimentos do mouse`;
      default: return e.event_type;
    }
  };

  if (isLoading) {
    return (
      <AnimatedPage className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        <MetricCardsSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HeatmapSkeleton />
          <HeatmapSkeleton />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Comportamento</h1>
          <p className="text-sm text-muted-foreground">Mapa de calor, cliques, scroll e sessões de visitantes</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-28 text-xs h-8">
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

      {/* ── Page Selector Cards ── */}
      {pageMetrics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Páginas Rastreadas</p>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedPage("all")}
              className={cn(
                "flex-shrink-0 rounded-lg border p-3 text-left transition-all min-w-[140px]",
                selectedPage === "all"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <Eye className="h-3 w-3 text-primary" />
                </div>
                <span className="text-[11px] font-medium text-foreground truncate">Todas</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{formatNumber(events.filter(e => e.event_type === "page_view").length)} views</span>
              </div>
            </button>
            {pageMetrics.map((pm) => (
              <button
                key={pm.path}
                onClick={() => setSelectedPage(pm.path)}
                className={cn(
                  "flex-shrink-0 rounded-lg border p-3 text-left transition-all min-w-[140px] max-w-[200px]",
                  selectedPage === pm.path
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                    <Layout className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground truncate">{pm.path}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{formatNumber(pm.views)} views</span>
                  <span>{formatNumber(pm.clicks)} cliques</span>
                </div>
                {/* Mini heatmap preview bar */}
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${pageMetrics[0]?.views ? (pm.views / pageMetrics[0].views) * 100 : 0}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-lg sm:text-xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList className="flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="heatmap" className="text-xs whitespace-nowrap">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="clicks" className="text-xs whitespace-nowrap">Cliques</TabsTrigger>
          <TabsTrigger value="scroll" className="text-xs whitespace-nowrap">Scroll</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs gap-1 whitespace-nowrap">
            <GitCompareArrows className="h-3 w-3" /> Comparar
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs gap-1 whitespace-nowrap">
            <Video className="h-3 w-3" /> Sessões
          </TabsTrigger>
        </TabsList>

        {/* ── Heatmap Tab ── */}
        <AnimatedTabContent value="heatmap" className="mt-4">
          {selectedPage !== "all" && (
            <div className="mb-3">
              <Badge variant="outline" className="text-xs">
                <Layout className="h-3 w-3 mr-1" />
                Filtrando: {selectedPage}
              </Badge>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatedCard index={0}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="h-4 w-4 text-destructive" /> Mapa de Calor — Mouse
                  </CardTitle>
                </CardHeader>
                <CardContent><HeatGrid data={heatmapGrid} title="" showPageLayout={true} /></CardContent>
              </Card>
            </AnimatedCard>
            <AnimatedCard index={1}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MousePointer2 className="h-4 w-4 text-primary" /> Mapa de Calor — Cliques
                  </CardTitle>
                </CardHeader>
                <CardContent><HeatGrid data={clickHeatmap} title="" /></CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </AnimatedTabContent>

        {/* ── Clicks Tab ── */}
        <AnimatedTabContent value="clicks" className="mt-4 space-y-4">
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
                            {clickData.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto mt-4">
                    <Table>
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
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        </AnimatedTabContent>

        {/* ── Scroll Tab ── */}
        <AnimatedTabContent value="scroll" className="mt-4 space-y-4">
          <AnimatedCard index={0}>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Profundidade de Scroll</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scrollData.map((s, i) => (
                    <div key={s.depth} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.depth}</span>
                        <span className="text-muted-foreground text-xs sm:text-sm">{formatNumber(s.count)} visitantes · {formatPercent(s.pct)}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, s.pct)}%`, backgroundColor: COLORS[i] }} />
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
                        {scrollData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </AnimatedTabContent>

        {/* ── Compare Tab ── */}
        <AnimatedTabContent value="compare" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-primary" /> Comparar Comportamento entre Páginas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Página A</label>
                  <Select value={comparePage1} onValueChange={setComparePage1}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Selecionar página" /></SelectTrigger>
                    <SelectContent>
                      {pages.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Página B</label>
                  <Select value={comparePage2} onValueChange={setComparePage2}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Selecionar página" /></SelectTrigger>
                    <SelectContent>
                      {pages.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pages.length < 2 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Necessário ter pelo menos 2 páginas com dados de rastreamento para comparar.
                </div>
              ) : compareMetrics ? (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Métrica</TableHead>
                        <TableHead className="text-xs text-center">
                          <Badge variant="outline" className="text-[10px]">A</Badge> <span className="hidden sm:inline">{comparePage1}</span>
                        </TableHead>
                        <TableHead className="text-xs text-center">
                          <Badge variant="secondary" className="text-[10px]">B</Badge> <span className="hidden sm:inline">{comparePage2}</span>
                        </TableHead>
                        <TableHead className="text-xs text-center">Dif.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { label: "Page Views", a: compareMetrics.page1.pageViews, b: compareMetrics.page2.pageViews },
                        { label: "Visitantes", a: compareMetrics.page1.visitors, b: compareMetrics.page2.visitors },
                        { label: "Cliques", a: compareMetrics.page1.clicks, b: compareMetrics.page2.clicks },
                        { label: "Scroll Médio", a: Math.round(compareMetrics.page1.avgScroll), b: Math.round(compareMetrics.page2.avgScroll), suffix: "%" },
                      ].map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="text-xs font-medium">{row.label}</TableCell>
                          <TableCell className="text-xs text-center font-bold">{formatNumber(row.a)}{row.suffix || ""}</TableCell>
                          <TableCell className="text-xs text-center font-bold">{formatNumber(row.b)}{row.suffix || ""}</TableCell>
                          <TableCell className="text-xs text-center"><DiffIndicator a={row.a} b={row.b} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>

                  {/* Scroll depth comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {[
                      { label: comparePage1, depths: compareMetrics.page1.depths, total: compareMetrics.page1.totalV, badge: "A" },
                      { label: comparePage2, depths: compareMetrics.page2.depths, total: compareMetrics.page2.totalV, badge: "B" },
                    ].map((page) => (
                      <div key={page.label} className="space-y-2">
                        <p className="text-xs font-medium flex items-center gap-1">
                          <Badge variant={page.badge === "A" ? "outline" : "secondary"} className="text-[10px]">{page.badge}</Badge>
                          Scroll — <span className="truncate max-w-[120px]">{page.label}</span>
                        </p>
                        {[25, 50, 75, 100].map((d, i) => {
                          const pct = (page.depths[d as keyof typeof page.depths] / page.total) * 100;
                          return (
                            <div key={d} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span>{d}%</span>
                                <span className="text-muted-foreground">{formatPercent(pct)}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: COLORS[i] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* ── Sessions Tab ── */}
        <AnimatedTabContent value="sessions" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" /> Sessões de Visitantes
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Timeline de ações de cada visitante — reconstrução da jornada com eventos reais.
              </p>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma sessão registrada no período selecionado.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const isExpanded = expandedSession === session.vid;
                    return (
                      <div key={session.vid} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => setExpandedSession(isExpanded ? null : session.vid)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Eye className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {session.vid.substring(0, 12)}…
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDateTimeBR(session.firstAt)} · {Math.round(session.duration)}s
                              </p>
                            </div>
                          </div>
                          <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground flex-shrink-0">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{session.pagesVisited} pág</span>
                            <span className="flex items-center gap-1"><MousePointer2 className="h-3 w-3" />{session.totalClicks} cliques</span>
                            <span className="flex items-center gap-1"><ScrollText className="h-3 w-3" />{session.maxScroll}%</span>
                            <Badge variant="outline" className="text-[10px]">{session.eventCount} eventos</Badge>
                          </div>
                          <div className="sm:hidden flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
                            <Badge variant="outline" className="text-[10px]">{session.eventCount} evt</Badge>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t px-4 py-3 bg-muted/20">
                            <div className="relative pl-6 space-y-0">
                              {session.events
                                .filter((e) => e.event_type !== "mouse_move")
                                .map((e, i) => (
                                  <div key={i} className="relative flex items-start gap-3 pb-3">
                                    {/* Timeline line */}
                                    <div className="absolute left-[-16px] top-0 bottom-0 w-px bg-border" />
                                    <div className="absolute left-[-20px] top-1 w-[9px] h-[9px] rounded-full bg-background border-2 border-primary z-10" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        {eventIcon(e.event_type)}
                                        <span className="text-xs text-foreground truncate">{eventLabel(e)}</span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                        {e.page_url && <span className="ml-2 hidden sm:inline">{getPathname(e.page_url)}</span>}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>
      </Tabs>
    </AnimatedPage>
  );
}
