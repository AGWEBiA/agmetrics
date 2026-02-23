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
import type { SalesEvent } from "@/types/database";

const COLORS = [
  "hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(300, 60%, 50%)", "hsl(45, 90%, 48%)",
];

type Sale = Partial<SalesEvent>;

interface SalesTrackingAnalysisProps {
  sales: Sale[];
  totalInvestment: number;
}

function extractUtm(sale: Sale, field: string): string {
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

/** Smart tooltip formatter: currency for revenue fields, number for counts */
function tooltipFormatter(value: number, name: string) {
  const currencyNames = ["Receita", "Faturamento", "Gasto", "Ticket Médio", "CPA"];
  if (currencyNames.some((n) => name.includes(n))) return formatBRL(value);
  return formatNumber(value);
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

  const topCampaigns = useMemo(() => groupBy(trackedSales, "utm_campaign")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 10),
    [trackedSales]
  );

  const topContent = useMemo(() => groupBy(trackedSales, "utm_content")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 10),
    [trackedSales]
  );

  const sourceBreakdown = useMemo(() => groupBy(trackedSales, "utm_source")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 8),
    [trackedSales]
  );

  const mediumBreakdown = useMemo(() => groupBy(trackedSales, "utm_medium")
    .filter((c) => c.name !== "(sem tracking)")
    .slice(0, 8),
    [trackedSales]
  );

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
                <CardTitle className="text-base">Vendas por Fonte</CardTitle>
                <p className="text-xs text-muted-foreground">Distribuição de vendas por utm_source</p>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceBreakdown}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + "…" : name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sourceBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      formatter={(v: number, name: string) => [formatBRL(v), "Receita"]}
                    />
                    <Legend />
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
                <CardTitle className="text-base">Vendas por Mídia</CardTitle>
                <p className="text-xs text-muted-foreground">Canal de mídia (utm_medium)</p>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mediumBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10}
                      tickFormatter={(v) => formatBRL(v)} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={100} />
                    <Tooltip cursor={false}
                      formatter={(v: number, name: string) => name === "Receita" ? formatBRL(v) : formatNumber(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Receita" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="count" name="Vendas" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
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
              <CardTitle className="text-base">Top Campanhas por Receita</CardTitle>
              <p className="text-xs text-muted-foreground">Campanhas com melhor resultado em vendas (utm_campaign)</p>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCampaigns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={8} interval={0} angle={-25} textAnchor="end" height={70}
                    tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={false}
                    formatter={(v: number, name: string) => name === "Receita" ? formatBRL(v) : formatNumber(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Receita" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="count" name="Vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
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
              <CardTitle className="text-base">Top Anúncios por Receita</CardTitle>
              <p className="text-xs text-muted-foreground">Criativos/anúncios com melhor resultado (utm_content)</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Anúncio (utm_content)</TableHead>
                    <TableHead className="text-[10px] text-right">Vendas</TableHead>
                    <TableHead className="text-[10px] text-right">Receita</TableHead>
                    <TableHead className="text-[10px] text-right">Ticket Médio</TableHead>
                    <TableHead className="text-[10px] text-right">% Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topContent.map((item, i) => (
                    <TableRow key={item.name}>
                      <TableCell className="text-[10px] font-medium max-w-[200px] truncate" title={item.name}>
                        <Badge variant="outline" className="text-[9px] mr-1">{i + 1}</Badge>
                        {item.name}
                      </TableCell>
                      <TableCell className="text-[10px] text-right">{formatNumber(item.count)}</TableCell>
                      <TableCell className="text-[10px] text-right text-success">{formatBRL(item.revenue)}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatBRL(item.count > 0 ? item.revenue / item.count : 0)}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatPercent(totalTrackedRevenue > 0 ? (item.revenue / totalTrackedRevenue) * 100 : 0)}</TableCell>
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
              <CardTitle className="text-base">Top Conjuntos / Termos</CardTitle>
              <p className="text-xs text-muted-foreground">Segmentação por utm_term (conjuntos de anúncios)</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Termo (utm_term)</TableHead>
                    <TableHead className="text-[10px] text-right">Vendas</TableHead>
                    <TableHead className="text-[10px] text-right">Receita</TableHead>
                    <TableHead className="text-[10px] text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTerms.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="text-[10px] font-medium max-w-[200px] truncate" title={item.name}>{item.name}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatNumber(item.count)}</TableCell>
                      <TableCell className="text-[10px] text-right text-success">{formatBRL(item.revenue)}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatBRL(item.count > 0 ? item.revenue / item.count : 0)}</TableCell>
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
                <CardTitle className="text-base">Explorador por Dimensão</CardTitle>
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
                  <TableHead className="text-[10px]">{dimensionLabels[dimension]}</TableHead>
                  <TableHead className="text-[10px] text-right">Vendas</TableHead>
                  <TableHead className="text-[10px] text-right">Receita</TableHead>
                  <TableHead className="text-[10px] text-right">Ticket Médio</TableHead>
                  <TableHead className="text-[10px] text-right">% Vendas</TableHead>
                  <TableHead className="text-[10px] text-right">% Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.slice(0, 20).map((item) => {
                  const totalRev = grouped.reduce((s, g) => s + g.revenue, 0);
                  const totalCount = grouped.reduce((s, g) => s + g.count, 0);
                  return (
                    <TableRow key={item.name}>
                      <TableCell className="text-[10px] font-medium max-w-[250px] truncate" title={item.name}>
                        {item.name === "(sem tracking)" ? (
                          <span className="text-muted-foreground italic">{item.name}</span>
                        ) : item.name}
                      </TableCell>
                      <TableCell className="text-[10px] text-right">{formatNumber(item.count)}</TableCell>
                      <TableCell className="text-[10px] text-right text-success">{formatBRL(item.revenue)}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatBRL(item.count > 0 ? item.revenue / item.count : 0)}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatPercent(totalCount > 0 ? (item.count / totalCount) * 100 : 0)}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatPercent(totalRev > 0 ? (item.revenue / totalRev) * 100 : 0)}</TableCell>
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
