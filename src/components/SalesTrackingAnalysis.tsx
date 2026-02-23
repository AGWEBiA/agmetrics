import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedCard } from "@/components/AnimatedCard";
import { formatBRL, formatPercent, formatNumber } from "@/lib/formatters";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = [
  "hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(180, 60%, 45%)",
  "hsl(300, 60%, 50%)", "hsl(45, 90%, 48%)",
];

interface Sale {
  amount?: number;
  gross_amount?: number;
  coproducer_commission?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  tracking_src?: string;
  tracking_sck?: string;
  sale_date?: string;
  created_at?: string;
  product_name?: string;
  platform?: string;
  status?: string;
  payload?: Record<string, any>;
}

interface SalesTrackingAnalysisProps {
  sales: Sale[];
  totalInvestment: number;
}

function extractUtm(sale: Sale, field: string): string {
  // Try direct column first, then fall back to payload
  const directValue = (sale as any)[field];
  if (directValue) return directValue;

  const p = sale.payload || {};
  switch (field) {
    case "utm_source": return p["tracking utm_source"] || p["utm_source"] || "";
    case "utm_medium": return p["tracking utm_medium"] || p["utm_medium"] || "";
    case "utm_campaign": return p["tracking utm_campaign"] || p["utm_campaign"] || "";
    case "utm_term": return p["tracking utm_term"] || p["utm_term"] || "";
    case "utm_content": return p["tracking utm_content"] || p["utm_content"] || "";
    case "tracking_src": return p["tracking src"] || p["src"] || "";
    case "tracking_sck": return p["tracking sck"] || p["sck"] || "";
    default: return "";
  }
}

function groupBy(sales: Sale[], field: string) {
  const map = new Map<string, { count: number; revenue: number; grossRevenue: number }>();
  sales.forEach((s) => {
    const val = extractUtm(s, field) || "(sem tracking)";
    const existing = map.get(val) || { count: 0, revenue: 0, grossRevenue: 0 };
    const revenue = Number(s.amount || 0) + Number(s.coproducer_commission || 0);
    map.set(val, {
      count: existing.count + 1,
      revenue: existing.revenue + revenue,
      grossRevenue: existing.grossRevenue + Number(s.gross_amount || 0),
    });
  });
  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function SalesTrackingAnalysis({ sales, totalInvestment }: SalesTrackingAnalysisProps) {
  const [dimension, setDimension] = useState<string>("utm_source");

  const approvedSales = useMemo(() =>
    sales.filter((s) => s.status === "approved"),
    [sales]
  );

  const trackedSales = useMemo(() =>
    approvedSales.filter((s) => {
      const src = extractUtm(s, "utm_source");
      const campaign = extractUtm(s, "utm_campaign");
      const medium = extractUtm(s, "utm_medium");
      return src || campaign || medium;
    }),
    [approvedSales]
  );

  const trackingRate = approvedSales.length > 0
    ? (trackedSales.length / approvedSales.length) * 100
    : 0;

  const grouped = useMemo(() => groupBy(approvedSales, dimension), [approvedSales, dimension]);

  // Top campaigns
  const topCampaigns = useMemo(() => groupBy(trackedSales, "utm_campaign")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 10),
    [trackedSales]
  );

  // Top content (ads)
  const topContent = useMemo(() => groupBy(trackedSales, "utm_content")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 10),
    [trackedSales]
  );

  // Source breakdown for pie
  const sourceBreakdown = useMemo(() => groupBy(trackedSales, "utm_source")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 8),
    [trackedSales]
  );

  // Medium breakdown
  const mediumBreakdown = useMemo(() => groupBy(trackedSales, "utm_medium")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 8),
    [trackedSales]
  );

  // Cross: utm_term (ad set level)
  const topTerms = useMemo(() => groupBy(trackedSales, "utm_term")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 10),
    [trackedSales]
  );

  const totalTrackedRevenue = trackedSales.reduce((s, e) =>
    s + Number(e.amount || 0) + Number(e.coproducer_commission || 0), 0
  );

  const dimensionLabels: Record<string, string> = {
    utm_source: "Fonte (utm_source)",
    utm_medium: "Mídia (utm_medium)",
    utm_campaign: "Campanha (utm_campaign)",
    utm_term: "Termo (utm_term)",
    utm_content: "Conteúdo/Anúncio (utm_content)",
    tracking_src: "SRC",
    tracking_sck: "SCK",
  };

  if (approvedSales.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          Nenhuma venda aprovada encontrada para análise de tracking.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <AnimatedCard index={0}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Vendas Rastreadas</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatNumber(trackedSales.length)}</p>
              <p className="text-[10px] text-muted-foreground">de {approvedSales.length} aprovadas</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={1}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Taxa de Rastreamento</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatPercent(trackingRate)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={2}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Receita Rastreada</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-success">{formatBRL(totalTrackedRevenue)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={3}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Fontes Identificadas</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{sourceBreakdown.length}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Source Pie */}
        {sourceBreakdown.length > 0 && (
          <AnimatedCard index={0}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">🎯 Vendas por Fonte</CardTitle>
                <p className="text-xs text-muted-foreground">Distribuição de vendas por utm_source</p>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name.length > 15 ? name.slice(0, 15) + "…" : name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sourceBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </AnimatedCard>
        )}

        {/* Medium Bar */}
        {mediumBreakdown.length > 0 && (
          <AnimatedCard index={1}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">📱 Vendas por Mídia</CardTitle>
                <p className="text-xs text-muted-foreground">Canal de mídia (utm_medium)</p>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mediumBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v: number) => formatNumber(v)} />
                    <Bar dataKey="count" name="Vendas" fill="hsl(220, 90%, 56%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </AnimatedCard>
        )}
      </div>

      {/* Top Campaigns */}
      {topCampaigns.length > 0 && (
        <AnimatedCard index={2}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">📊 Top Campanhas por Receita</CardTitle>
              <p className="text-xs text-muted-foreground">Campanhas com melhor resultado em vendas (utm_campaign)</p>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCampaigns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={8} interval={0} angle={-30} textAnchor="end" height={60}
                    tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + "…" : v} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number, name: string) => name === "Receita" ? formatBRL(v) : formatNumber(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Receita" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="count" name="Vendas" fill="hsl(220, 90%, 56%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* Top Content/Ads */}
      {topContent.length > 0 && (
        <AnimatedCard index={3}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">🎬 Top Anúncios por Receita</CardTitle>
              <p className="text-xs text-muted-foreground">Criativos/anúncios com melhor resultado (utm_content)</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anúncio (utm_content)</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">% Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topContent.map((item, i) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={item.name}>
                        <Badge variant="outline" className="text-xs">{i + 1}</Badge>{" "}
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(item.count)}</TableCell>
                      <TableCell className="text-right text-success">{formatBRL(item.revenue)}</TableCell>
                      <TableCell className="text-right">{formatBRL(item.count > 0 ? item.revenue / item.count : 0)}</TableCell>
                      <TableCell className="text-right">{formatPercent(totalTrackedRevenue > 0 ? (item.revenue / totalTrackedRevenue) * 100 : 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* Top Terms (Ad Sets) */}
      {topTerms.length > 0 && (
        <AnimatedCard index={4}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">🔑 Top Conjuntos/Termos</CardTitle>
              <p className="text-xs text-muted-foreground">Segmentação por utm_term (conjuntos de anúncios)</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Termo (utm_term)</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTerms.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={item.name}>{item.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.count)}</TableCell>
                      <TableCell className="text-right text-success">{formatBRL(item.revenue)}</TableCell>
                      <TableCell className="text-right">{formatBRL(item.count > 0 ? item.revenue / item.count : 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* Dynamic Dimension Explorer */}
      <AnimatedCard index={5}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg">🔍 Explorador por Dimensão</CardTitle>
                <p className="text-xs text-muted-foreground">Analise vendas por qualquer parâmetro de tracking</p>
              </div>
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dimensionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dimensionLabels[dimension]}</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">% Vendas</TableHead>
                  <TableHead className="text-right">% Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.slice(0, 20).map((item) => {
                  const totalRev = grouped.reduce((s, g) => s + g.revenue, 0);
                  const totalCount = grouped.reduce((s, g) => s + g.count, 0);
                  return (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium max-w-[250px] truncate" title={item.name}>
                        {item.name === "(sem tracking)" ? (
                          <span className="text-muted-foreground italic">{item.name}</span>
                        ) : item.name}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(item.count)}</TableCell>
                      <TableCell className="text-right text-success">{formatBRL(item.revenue)}</TableCell>
                      <TableCell className="text-right">{formatBRL(item.count > 0 ? item.revenue / item.count : 0)}</TableCell>
                      <TableCell className="text-right">{formatPercent(totalCount > 0 ? (item.count / totalCount) * 100 : 0)}</TableCell>
                      <TableCell className="text-right">{formatPercent(totalRev > 0 ? (item.revenue / totalRev) * 100 : 0)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AnimatedCard>
    </div>
  );
}
