import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatPercent, formatNumber, formatDecimal } from "@/lib/formatters";
import { openAdPreview } from "@/lib/openAdPreview";
import { AnimatedCard } from "@/components/AnimatedCard";
import { DemographicsSection } from "@/components/DemographicsSection";
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(265, 80%, 60%)", "hsl(220, 90%, 56%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)"];

interface TrackingTabProps {
  m: any;
  project: any;
}

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
                <span className="text-muted-foreground">vs {comparisonDays} dias anteriores</span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(Math.abs(pct), 100)}%` }} />
            </div>
            {prevValue && <p className="text-[10px] text-muted-foreground text-right">{prevValue}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

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
            {change >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
            <span className={`text-[10px] font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatPercent(Math.abs(change))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {};

function TopAdsSection({ metaAds }: { metaAds: any[] }) {
  const [page, setPage] = useState(0);
  const pageSize = 5;

  const topAds = useMemo(() => {
    return metaAds.map((ad: any) => {
      const spend = Number(ad.spend || 0);
      const impressions = Number(ad.impressions || 0);
      const clicks = Number(ad.clicks || 0);
      const purchases = Number(ad.purchases || 0);
      const leads = Number(ad.leads || 0);
      const linkClicks = Number(ad.link_clicks || 0);
      const lpViews = Number(ad.landing_page_views || 0);
      const checkouts = Number(ad.checkouts_initiated || 0);
      const results = Number(ad.results || 0) || leads || purchases;
      return {
        id: ad.ad_id,
        name: ad.ad_name,
        status: ad.status,
        spend,
        impressions,
        clicks,
        purchases,
        leads,
        linkClicks,
        lpViews,
        checkouts,
        results,
        preview_link: ad.preview_link,
        hook_rate: Number(ad.hook_rate || 0),
        hold_rate: Number(ad.hold_rate || 0),
        cpc: linkClicks > 0 ? spend / linkClicks : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        costPerResult: results > 0 ? spend / results : 0,
        costPerPurchase: purchases > 0 ? spend / purchases : 0,
        connectRate: linkClicks > 0 ? (lpViews / linkClicks) * 100 : 0,
        pageConversion: lpViews > 0 ? (checkouts / lpViews) * 100 : 0,
        checkoutConversion: checkouts > 0 ? (purchases / checkouts) * 100 : 0,
      };
    }).sort((a, b) => b.spend - a.spend);
  }, [metaAds]);

  const totalPages = Math.ceil(topAds.length / pageSize);
  const paginatedAds = topAds.slice(page * pageSize, (page + 1) * pageSize);

  if (topAds.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          Nenhum dado de anúncio disponível. Sincronize o Meta Ads para ver os melhores anúncios.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Top {Math.min(topAds.length, pageSize * totalPages)} Anúncios
        </h3>
        <p className="text-xs text-muted-foreground">Ordenados por investimento. Clique em "Ver anúncio" para abrir na Biblioteca de Anúncios.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {paginatedAds.map((ad) => (
          <Card key={ad.id} className="overflow-hidden border-border/50">
            {/* Header with hook/hold badges */}
            <div className="relative bg-muted/40 p-3 pb-2">
              {(ad.hook_rate > 0 || ad.hold_rate > 0) && (
                <div className="flex gap-1.5 mb-2">
                  {ad.hook_rate > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-semibold">
                      Hook {formatPercent(ad.hook_rate)}
                    </Badge>
                  )}
                  {ad.hold_rate > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-semibold">
                      Hold {formatPercent(ad.hold_rate)}
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-xs font-bold leading-tight line-clamp-2">{ad.name || "Anúncio sem nome"}</p>
              {ad.id && (
                <button
                  onClick={() => openAdPreview(ad.id)}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium mt-1"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Ver anúncio
                </button>
              )}
            </div>

            {/* Metrics list */}
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                <AdMetricRow label="Valor Usado" value={formatBRL(ad.spend)} />
                <AdMetricRow label="Resultados" value={formatNumber(ad.results)} />
                <AdMetricRow label="Custo por Resultado" value={formatBRL(ad.costPerResult)} />
                <AdMetricRow label="Fin. de Compras" value={formatNumber(ad.purchases)} />
                <AdMetricRow label="Custo Fin. Compras" value={formatBRL(ad.costPerPurchase)} />
                <AdMetricRow label="Cliques no Link" value={formatNumber(ad.linkClicks)} />
                <AdMetricRow label="CPC" value={formatBRL(ad.cpc)} />
                <AdMetricRow label="CTR" value={formatPercent(ad.ctr)} />
                <AdMetricRow label="Connect Rate" value={formatPercent(ad.connectRate)} />
                <AdMetricRow label="Conv. da Página" value={formatPercent(ad.pageConversion)} />
                <AdMetricRow label="Conv. do Checkout" value={formatPercent(ad.checkoutConversion)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs rounded border bg-background hover:bg-muted disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages} ({topAds.length} anúncios)
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs rounded border bg-background hover:bg-muted disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

function AdMetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-semibold text-foreground">{value}</span>
    </div>
  );
}


export function TrackingTab({ m, project }: TrackingTabProps) {
  const hasMetaData = m.metaInvestment > 0 || m.metaImpressions > 0;
  const hasGoogleData = m.googleInvestment > 0 || m.gImpressions > 0;

  // === Computed data ===
  const revenueByDayOfWeek = useMemo(() =>
    m.salesByDayOfWeek.map((d: any) => ({ name: d.name, faturamento: d.revenue, compras: d.vendas })),
  [m.salesByDayOfWeek]);

  const revenueByDayOfMonth = useMemo(() => {
    const dayMap = new Map<number, { revenue: number; compras: number }>();
    const approvedSales = (m.kiwifySales || []).concat(m.hotmartSales || []);
    approvedSales.forEach((s: any) => {
      const dateStr = s.sale_date || s.created_at;
      if (!dateStr) return;
      const day = new Date(dateStr).getDate();
      const existing = dayMap.get(day) || { revenue: 0, compras: 0 };
      dayMap.set(day, { revenue: existing.revenue + Number(s.amount || 0), compras: existing.compras + 1 });
    });
    return Array.from(dayMap.entries()).sort(([a], [b]) => a - b)
      .map(([day, data]) => ({ name: String(day), faturamento: data.revenue, compras: data.compras }));
  }, [m.kiwifySales, m.hotmartSales]);

  const purchasesOverTime = useMemo(() =>
    m.salesChartData.map((d: any) => ({ date: d.date, compras: d.vendas })),
  [m.salesChartData]);

  const scenarios = useMemo(() => {
    const ticket = m.avgTicket;
    if (ticket <= 0) return [];
    return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((qty) => ({
      vendas: qty, faturamento: ticket * qty,
    }));
  }, [m.avgTicket]);

  const metaDailyChart = useMemo(() =>
    (m.metaMetrics || []).map((met: any) => ({
      date: new Date(met.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      investimento: Number(met.investment || 0),
      compras: Number(met.purchases || 0),
    })),
  [m.metaMetrics]);

  const googleDailyChart = useMemo(() =>
    (m.googleMetrics || []).map((met: any) => ({
      date: new Date(met.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      custo: Number(met.investment || 0),
      conversoes: Number(met.conversions || 0),
    })),
  [m.googleMetrics]);

  // Meta daily detail table data
  const metaDailyDetail = useMemo(() =>
    (m.metaMetrics || []).map((met: any) => {
      const inv = Number(met.investment || 0);
      const imp = Number(met.impressions || 0);
      const clicks = Number(met.clicks || 0);
      const linkClicks = Number(met.link_clicks || 0);
      const lpViews = Number(met.landing_page_views || 0);
      const checkouts = Number(met.checkouts_initiated || 0);
      const purchases = Number(met.purchases || 0);
      const leads = Number(met.leads || 0);
      return {
        date: new Date(met.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        rawDate: met.date,
        investment: inv,
        impressions: imp,
        cpm: imp > 0 ? (inv / imp) * 1000 : 0,
        clicks,
        ctr: imp > 0 ? (clicks / imp) * 100 : 0,
        cpc: clicks > 0 ? inv / clicks : 0,
        linkClicks,
        lpViews,
        hookRate: imp > 0 ? (lpViews / imp) * 100 : 0,
        connectRate: linkClicks > 0 ? (lpViews / linkClicks) * 100 : 0,
        checkouts,
        pageConversion: lpViews > 0 ? (checkouts / lpViews) * 100 : 0,
        purchases,
        costPerPurchase: purchases > 0 ? inv / purchases : 0,
        leads,
        cpl: leads > 0 ? inv / leads : 0,
      };
    }).sort((a: any, b: any) => b.rawDate.localeCompare(a.rawDate)),
  [m.metaMetrics]);

  // Google daily detail table data
  const googleDailyDetail = useMemo(() =>
    (m.googleMetrics || []).map((met: any) => {
      const inv = Number(met.investment || 0);
      const imp = Number(met.impressions || 0);
      const clicks = Number(met.clicks || 0);
      const conversions = Number(met.conversions || 0);
      return {
        date: new Date(met.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        rawDate: met.date,
        investment: inv,
        impressions: imp,
        cpm: imp > 0 ? (inv / imp) * 1000 : 0,
        clicks,
        ctr: imp > 0 ? (clicks / imp) * 100 : 0,
        cpc: clicks > 0 ? inv / clicks : 0,
        conversions,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        costPerConversion: conversions > 0 ? inv / conversions : 0,
      };
    }).sort((a: any, b: any) => b.rawDate.localeCompare(a.rawDate)),
  [m.googleMetrics]);

  // Monthly revenue breakdown
  const revenueByMonth = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; compras: number; grossRevenue: number }>();
    const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const approvedSales = (m.kiwifySales || []).concat(m.hotmartSales || []);
    approvedSales.forEach((s: any) => {
      const dateStr = s.sale_date || s.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`;
      const existing = monthMap.get(key) || { revenue: 0, compras: 0, grossRevenue: 0, label };
      monthMap.set(key, {
        ...existing,
        revenue: existing.revenue + Number(s.amount || 0),
        grossRevenue: existing.grossRevenue + Number(s.gross_amount || 0),
        compras: existing.compras + 1,
        label,
      } as any);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]: [string, any]) => ({
        name: data.label,
        faturamento: data.revenue,
        grossRevenue: data.grossRevenue,
        compras: data.compras,
        ticket: data.compras > 0 ? data.revenue / data.compras : 0,
      }));
  }, [m.kiwifySales, m.hotmartSales]);

  // Meta monthly breakdown
  const metaMonthlyDetail = useMemo(() => {
    const monthMap = new Map<string, any>();
    const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    (m.metaMetrics || []).forEach((met: any) => {
      const d = new Date(met.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`;
      const existing = monthMap.get(key) || {
        label, investment: 0, impressions: 0, clicks: 0, linkClicks: 0,
        lpViews: 0, checkouts: 0, purchases: 0, leads: 0,
      };
      monthMap.set(key, {
        ...existing,
        investment: existing.investment + Number(met.investment || 0),
        impressions: existing.impressions + Number(met.impressions || 0),
        clicks: existing.clicks + Number(met.clicks || 0),
        linkClicks: existing.linkClicks + Number(met.link_clicks || 0),
        lpViews: existing.lpViews + Number(met.landing_page_views || 0),
        checkouts: existing.checkouts + Number(met.checkouts_initiated || 0),
        purchases: existing.purchases + Number(met.purchases || 0),
        leads: existing.leads + Number(met.leads || 0),
      });
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]: [string, any]) => ({
        label: d.label,
        investment: d.investment,
        impressions: d.impressions,
        cpm: d.impressions > 0 ? (d.investment / d.impressions) * 1000 : 0,
        clicks: d.clicks,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        cpc: d.clicks > 0 ? d.investment / d.clicks : 0,
        lpViews: d.lpViews,
        pageConv: d.lpViews > 0 ? (d.checkouts / d.lpViews) * 100 : 0,
        purchases: d.purchases,
        costPerPurchase: d.purchases > 0 ? d.investment / d.purchases : 0,
        leads: d.leads,
        cpl: d.leads > 0 ? d.investment / d.leads : 0,
      }));
  }, [m.metaMetrics]);

  // Google monthly breakdown
  const googleMonthlyDetail = useMemo(() => {
    const monthMap = new Map<string, any>();
    const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    (m.googleMetrics || []).forEach((met: any) => {
      const d = new Date(met.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`;
      const existing = monthMap.get(key) || {
        label, investment: 0, impressions: 0, clicks: 0, conversions: 0,
      };
      monthMap.set(key, {
        ...existing,
        investment: existing.investment + Number(met.investment || 0),
        impressions: existing.impressions + Number(met.impressions || 0),
        clicks: existing.clicks + Number(met.clicks || 0),
        conversions: existing.conversions + Number(met.conversions || 0),
      });
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]: [string, any]) => ({
        label: d.label,
        investment: d.investment,
        impressions: d.impressions,
        cpm: d.impressions > 0 ? (d.investment / d.impressions) * 1000 : 0,
        clicks: d.clicks,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        cpc: d.clicks > 0 ? d.investment / d.clicks : 0,
        conversions: d.conversions,
        conversionRate: d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0,
        costPerConversion: d.conversions > 0 ? d.investment / d.conversions : 0,
      }));
  }, [m.googleMetrics]);

  const costPerPurchase = m.metaPurchases > 0 ? m.metaInvestment / m.metaPurchases : 0;
  const metaRoas = m.metaInvestment > 0 ? m.totalRevenue / m.metaInvestment : 0;
  const gCostPerConv = m.gConversions > 0 ? m.googleInvestment / m.gConversions : 0;

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
        <TabsList className="w-full sm:w-auto flex overflow-x-auto no-scrollbar">
          {hasMetaData && <TabsTrigger value="meta" className="whitespace-nowrap text-xs sm:text-sm">Meta Ads</TabsTrigger>}
          {hasGoogleData && <TabsTrigger value="google" className="whitespace-nowrap text-xs sm:text-sm">Google Ads</TabsTrigger>}
          {m.salesCount > 0 && <TabsTrigger value="revenue" className="whitespace-nowrap text-xs sm:text-sm">Faturamento</TabsTrigger>}
          {hasMetaData && <TabsTrigger value="top_ads" className="whitespace-nowrap text-xs sm:text-sm">Melhores Anúncios</TabsTrigger>}
          <TabsTrigger value="demographics" className="whitespace-nowrap text-xs sm:text-sm">Demográficos</TabsTrigger>
        </TabsList>

        {/* ========== META ADS ========== */}
        {hasMetaData && (
          <TabsContent value="meta" className="space-y-6 pt-4">
            {/* KPI Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <AnimatedCard index={0}>
                <KPICard label="Investimento" value={formatBRL(m.metaInvestment)} comparisonPct={m.investmentChange} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={1}>
                <KPICard label="Faturamento" value={formatBRL(m.totalRevenue)} comparisonPct={m.revenueChange} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={2}>
                <KPICard label="Compras" value={formatNumber(m.salesCount)} comparisonPct={m.salesCountChange} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={3}>
                <KPICard label="Custo por Compra (Site)" value={formatBRL(costPerPurchase)} comparisonDays={periodDays} />
              </AnimatedCard>
              <AnimatedCard index={4}>
                <KPICard label="ROAS (Site)" value={formatDecimal(metaRoas)} comparisonDays={periodDays} />
              </AnimatedCard>
            </div>

            {/* 3-column layout */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
              {/* Left: Funnel metrics */}
              <div className="lg:col-span-3 space-y-3">
                <SmallMetric label="Impressões" value={formatNumber(m.metaImpressions)} />
                <SmallMetric label="Views LP" value={formatNumber(m.metaLpViews)} />
                <SmallMetric label="Hook Rate" value={m.metaImpressions > 0 ? formatPercent((m.metaLpViews / m.metaImpressions) * 100) : "0%"} />
                <SmallMetric label="Connect Rate" value={formatPercent(m.metaConnectRate)} />
                <SmallMetric label="Conv. Página" value={formatPercent(m.metaPageConversion)} />
              </div>

              {/* Center: Chart */}
              <div className="lg:col-span-5 space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Compras</CardTitle></CardHeader>
                  <CardContent className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={purchasesOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} interval="preserveStartEnd" />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="compras" name="Compras" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={{ r: 1.5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Metric grid */}
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
                  <SmallMetric label="Leads" value={formatNumber(m.metaLeads)} />
                  <SmallMetric label="CPL" value={formatBRL(m.metaCostPerLead)} />
                  <SmallMetric label="Compras (Meta)" value={formatNumber(m.metaPurchases)} />
                </div>
              </div>
            </div>

            {/* Investment × Purchases chart */}
            {metaDailyChart.length > 0 && (
              <AnimatedCard index={5}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Investimento × Compras (Meta)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={metaDailyChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} interval="preserveStartEnd" />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} formatter={(v: number, name: string) => name === "investimento" ? formatBRL(v) : v} contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="investimento" name="Investimento" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Line yAxisId="right" type="monotone" dataKey="compras" name="Compras" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 2 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Summary table */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Resumo por Período</CardTitle></CardHeader>
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

            {/* Daily detail table */}
            {metaDailyDetail.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento Diário - Meta Ads</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] whitespace-nowrap">Data</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Investimento</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Impressões</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPM</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Cliques</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CTR</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPC</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Views LP</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Conv. Pág.</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Checkouts</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Compras</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPA</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Leads</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metaDailyDetail.map((d: any) => (
                        <TableRow key={d.date}>
                          <TableCell className="text-[10px] whitespace-nowrap">{d.date}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.investment)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.impressions)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpm)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.clicks)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.ctr)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpc)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.lpViews)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.pageConversion)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.checkouts)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.purchases)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.costPerPurchase)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.leads)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpl)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Monthly breakdown table */}
            {metaMonthlyDetail.length > 1 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento Mensal - Meta Ads</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] whitespace-nowrap">Mês</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Investimento</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Impressões</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPM</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Cliques</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CTR</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPC</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Views LP</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Conv. Pág.</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Compras</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPA</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Leads</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metaMonthlyDetail.map((d: any) => (
                        <TableRow key={d.label}>
                          <TableCell className="text-[10px] font-medium whitespace-nowrap">{d.label}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.investment)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.impressions)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpm)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.clicks)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.ctr)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpc)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.lpViews)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.pageConv)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.purchases)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.costPerPurchase)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.leads)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpl)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ========== MELHORES ANÚNCIOS ========== */}
        {hasMetaData && (
          <TabsContent value="top_ads" className="space-y-6 pt-4">
            <TopAdsSection metaAds={m.metaAds || []} />
          </TabsContent>
        )}

        {/* ========== GOOGLE ADS ========== */}
        {hasGoogleData && (
          <TabsContent value="google" className="space-y-6 pt-4">
            {/* KPI Cards */}
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

            {/* 3-column layout */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-3 space-y-3">
                <SmallMetric label="Impressões" value={formatNumber(m.gImpressions)} />
                <SmallMetric label="Cliques" value={formatNumber(m.gClicks)} />
                <SmallMetric label="CTR" value={formatPercent(m.gCtr)} />
                <SmallMetric label="CPC médio" value={formatBRL(m.gCpc)} />
              </div>

              <div className="lg:col-span-5">
                {googleDailyChart.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Custo × Conversões</CardTitle></CardHeader>
                    <CardContent className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={googleDailyChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} interval="preserveStartEnd" />
                          <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${v.toFixed(0)}`} />
                          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <Tooltip cursor={false} contentStyle={tooltipStyle} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="custo" name="Custo" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.7} />
                          <Line yAxisId="right" type="monotone" dataKey="conversoes" name="Conversões" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 2 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

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
              <CardHeader className="pb-2"><CardTitle className="text-base">Resumo Google Ads</CardTitle></CardHeader>
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

            {/* Daily detail table */}
            {googleDailyDetail.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento Diário - Google Ads</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] whitespace-nowrap">Data</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Custo</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Impressões</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPM</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Cliques</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CTR</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPC</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Conversões</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Taxa Conv.</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Custo/Conv.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {googleDailyDetail.map((d: any) => (
                        <TableRow key={d.date}>
                          <TableCell className="text-[10px] whitespace-nowrap">{d.date}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.investment)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.impressions)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpm)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.clicks)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.ctr)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpc)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.conversions)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.conversionRate)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.costPerConversion)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Monthly breakdown */}
            {googleMonthlyDetail.length > 1 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento Mensal - Google Ads</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] whitespace-nowrap">Mês</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Custo</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Impressões</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPM</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Cliques</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CTR</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">CPC</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Conversões</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Taxa Conv.</TableHead>
                        <TableHead className="text-[10px] text-right whitespace-nowrap">Custo/Conv.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {googleMonthlyDetail.map((d: any) => (
                        <TableRow key={d.label}>
                          <TableCell className="text-[10px] font-medium whitespace-nowrap">{d.label}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.investment)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.impressions)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpm)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.clicks)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.ctr)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.cpc)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.conversions)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.conversionRate)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.costPerConversion)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
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
                      {scenarios.map((s) => (
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

            {/* Faturamento por dia da semana - Chart */}
            {revenueByDayOfWeek.some((d: any) => d.faturamento > 0) && (
              <AnimatedCard index={1}>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento por dia da semana</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revenueByDayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} formatter={(v: number, name: string) => name === "faturamento" ? formatBRL(v) : v} contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.8} />
                        <Line yAxisId="right" type="monotone" dataKey="compras" name="Compras" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Faturamento por dia do mês - Chart */}
            {revenueByDayOfMonth.length > 0 && (
              <AnimatedCard index={2}>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento por dia do mês</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revenueByDayOfMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip cursor={false} formatter={(v: number, name: string) => name === "faturamento" ? formatBRL(v) : v} contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.8} />
                        <Line yAxisId="right" type="monotone" dataKey="compras" name="Compras" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Detalhamento por Dia da Semana */}
            <AnimatedCard index={3}>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento por Dia da Semana</CardTitle></CardHeader>
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

            {/* Detalhamento por Dia do Mês */}
            {revenueByDayOfMonth.length > 0 && (
              <AnimatedCard index={4}>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento por Dia do Mês</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Dia</TableHead>
                          <TableHead className="text-xs text-right">Compras</TableHead>
                          <TableHead className="text-xs text-right">Faturamento</TableHead>
                          <TableHead className="text-xs text-right">Ticket Médio</TableHead>
                          <TableHead className="text-xs text-right">% Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueByDayOfMonth.map((d: any) => (
                          <TableRow key={d.name}>
                            <TableCell className="text-xs font-medium">Dia {d.name}</TableCell>
                            <TableCell className="text-xs text-right">{d.compras}</TableCell>
                            <TableCell className="text-xs text-right">{formatBRL(d.faturamento)}</TableCell>
                            <TableCell className="text-xs text-right">{d.compras > 0 ? formatBRL(d.faturamento / d.compras) : "—"}</TableCell>
                            <TableCell className="text-xs text-right">{m.salesCount > 0 ? formatPercent((d.compras / m.salesCount) * 100) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Faturamento Mensal */}
            {revenueByMonth.length > 1 && (
              <AnimatedCard index={5}>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Faturamento Mensal</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={revenueByMonth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <Tooltip cursor={false} formatter={(v: number, name: string) => name === "faturamento" ? formatBRL(v) : v} contentStyle={tooltipStyle} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.8} />
                          <Line yAxisId="right" type="monotone" dataKey="compras" name="Compras" stroke={COLORS[3]} strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Mês</TableHead>
                            <TableHead className="text-xs text-right">Compras</TableHead>
                            <TableHead className="text-xs text-right">Receita Bruta</TableHead>
                            <TableHead className="text-xs text-right">Receita Líquida</TableHead>
                            <TableHead className="text-xs text-right">Ticket Médio</TableHead>
                            <TableHead className="text-xs text-right">% Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueByMonth.map((d: any) => (
                            <TableRow key={d.name}>
                              <TableCell className="text-xs font-medium">{d.name}</TableCell>
                              <TableCell className="text-xs text-right">{d.compras}</TableCell>
                              <TableCell className="text-xs text-right">{formatBRL(d.grossRevenue)}</TableCell>
                              <TableCell className="text-xs text-right">{formatBRL(d.faturamento)}</TableCell>
                              <TableCell className="text-xs text-right">{formatBRL(d.ticket)}</TableCell>
                              <TableCell className="text-xs text-right">{m.totalRevenue > 0 ? formatPercent((d.faturamento / m.totalRevenue) * 100) : "—"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold border-t-2">
                            <TableCell className="text-xs">Total</TableCell>
                            <TableCell className="text-xs text-right">{m.salesCount}</TableCell>
                            <TableCell className="text-xs text-right">{formatBRL(m.grossRevenue)}</TableCell>
                            <TableCell className="text-xs text-right">{formatBRL(m.totalRevenue)}</TableCell>
                            <TableCell className="text-xs text-right">{formatBRL(m.avgTicket)}</TableCell>
                            <TableCell className="text-xs text-right">100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}
          </TabsContent>
        )}

        {/* ========== DEMOGRÁFICOS ========== */}
        <TabsContent value="demographics" className="space-y-6 pt-4">
          {hasMetaData && (
            <DemographicsSection
              platform="meta"
              demographics={m.metaDemographics || []}
              buyerLocationData={m.buyerLocationData || []}
              paymentPieData={m.paymentPieData || []}
              productData={m.productData || []}
            />
          )}
          {hasGoogleData && !hasMetaData && (
            <DemographicsSection
              platform="google"
              demographics={m.googleDemographics || []}
              buyerLocationData={m.buyerLocationData || []}
              paymentPieData={m.paymentPieData || []}
              productData={m.productData || []}
            />
          )}
          {hasMetaData && hasGoogleData && (
            <>
              <div className="border-t pt-6 mt-6">
                <DemographicsSection
                  platform="google"
                  demographics={m.googleDemographics || []}
                  buyerLocationData={[]}
                  paymentPieData={[]}
                  productData={[]}
                />
              </div>
            </>
          )}
          {!hasMetaData && !hasGoogleData && (
            <DemographicsSection
              platform="meta"
              demographics={[]}
              buyerLocationData={m.buyerLocationData || []}
              paymentPieData={m.paymentPieData || []}
              productData={m.productData || []}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
