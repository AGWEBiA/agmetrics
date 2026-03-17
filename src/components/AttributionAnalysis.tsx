import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatNumber } from "@/lib/formatters";
import {
  type AttributionModel,
  type BuyerJourney,
  ATTRIBUTION_LABELS,
  ATTRIBUTION_DESCRIPTIONS,
  buildBuyerJourneys,
  applyAttribution,
  compareModels,
} from "@/lib/attributionModels";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

const MODEL_COLORS: Record<AttributionModel, string> = {
  first_click: "hsl(220, 90%, 56%)",
  last_click: "hsl(152, 60%, 42%)",
  linear: "hsl(38, 92%, 50%)",
  time_decay: "hsl(265, 80%, 60%)",
};

interface AttributionAnalysisProps {
  events: any[];
}

export function AttributionAnalysis({ events }: AttributionAnalysisProps) {
  const [selectedModel, setSelectedModel] = useState<AttributionModel>("time_decay");
  const [groupBy, setGroupBy] = useState<"source" | "campaign">("source");

  const journeys = useMemo(() => buildBuyerJourneys(events), [events]);
  const convertedJourneys = useMemo(() => journeys.filter(j => j.converted), [journeys]);

  const currentResults = useMemo(
    () => applyAttribution(journeys, selectedModel, groupBy),
    [journeys, selectedModel, groupBy]
  );

  const comparison = useMemo(
    () => compareModels(journeys, groupBy),
    [journeys, groupBy]
  );

  // KPIs
  const kpis = useMemo(() => {
    const totalConversions = convertedJourneys.length;
    const avgTouchpoints = convertedJourneys.length > 0
      ? convertedJourneys.reduce((s, j) => s + j.touchpoints.length, 0) / convertedJourneys.length
      : 0;
    const totalRevenue = convertedJourneys.reduce((s, j) => s + j.revenue, 0);
    const multiTouch = convertedJourneys.filter(j => j.touchpoints.length > 1).length;
    const multiTouchRate = totalConversions > 0 ? (multiTouch / totalConversions) * 100 : 0;

    return { totalConversions, avgTouchpoints, totalRevenue, multiTouchRate };
  }, [convertedJourneys]);

  // Radar chart: top 6 sources across all models
  const radarData = useMemo(() => {
    const allSources = new Set<string>();
    Object.values(comparison).forEach(results => {
      results.slice(0, 6).forEach(r => allSources.add(groupBy === "source" ? r.source : r.campaign));
    });

    return Array.from(allSources).slice(0, 8).map(source => {
      const entry: any = { source: source.length > 15 ? source.slice(0, 15) + "…" : source };
      (Object.keys(comparison) as AttributionModel[]).forEach(model => {
        const match = comparison[model].find(r => (groupBy === "source" ? r.source : r.campaign) === source);
        entry[model] = match ? Math.round(match.revenue) : 0;
      });
      return entry;
    });
  }, [comparison, groupBy]);

  // Model divergence: where models disagree most
  const divergenceData = useMemo(() => {
    const sources = new Set<string>();
    Object.values(comparison).forEach(results => results.forEach(r => sources.add(r.source)));

    return Array.from(sources)
      .map(source => {
        const revenues = (Object.keys(comparison) as AttributionModel[]).map(model => {
          const match = comparison[model].find(r => r.source === source);
          return match?.revenue || 0;
        });
        const max = Math.max(...revenues);
        const min = Math.min(...revenues);
        return { source: source.length > 20 ? source.slice(0, 20) + "…" : source, divergence: max - min, max, min };
      })
      .filter(d => d.divergence > 0)
      .sort((a, b) => b.divergence - a.divergence)
      .slice(0, 8);
  }, [comparison]);

  if (convertedJourneys.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Nenhuma conversão com touchpoints encontrada para análise de atribuição.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Conversões Rastreadas", value: formatNumber(kpis.totalConversions) },
          { label: "Média de Touchpoints", value: kpis.avgTouchpoints.toFixed(1) },
          { label: "Receita Atribuída", value: formatBRL(kpis.totalRevenue) },
          { label: "Multi-touch Rate", value: `${kpis.multiTouchRate.toFixed(1)}%` },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              <p className="text-lg font-bold mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as AttributionModel)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ATTRIBUTION_LABELS) as AttributionModel[]).map(model => (
              <SelectItem key={model} value={model}>
                {ATTRIBUTION_LABELS[model]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "source" | "campaign")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="source">Por Fonte</SelectItem>
            <SelectItem value="campaign">Por Campanha</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center">
          <Badge variant="outline" className="text-[10px]">
            {ATTRIBUTION_DESCRIPTIONS[selectedModel]}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single" className="text-xs">Modelo Selecionado</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs">Comparação de Modelos</TabsTrigger>
          <TabsTrigger value="divergence" className="text-xs">Divergência</TabsTrigger>
        </TabsList>

        {/* Single Model */}
        <TabsContent value="single" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Receita Atribuída — {ATTRIBUTION_LABELS[selectedModel]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={currentResults.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis
                      dataKey={groupBy === "source" ? "source" : "campaign"}
                      type="category"
                      width={120}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="revenue" fill={MODEL_COLORS[selectedModel]} name="Receita" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Conversões Atribuídas — {ATTRIBUTION_LABELS[selectedModel]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={currentResults.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey={groupBy === "source" ? "source" : "campaign"}
                      type="category"
                      width={120}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(v: number) => v.toFixed(2)} />
                    <Bar dataKey="conversions" fill={MODEL_COLORS[selectedModel]} name="Conversões" radius={[0, 4, 4, 0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detalhamento — {ATTRIBUTION_LABELS[selectedModel]}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{groupBy === "source" ? "Fonte" : "Campanha"}</TableHead>
                    <TableHead className="text-xs text-right">Conversões</TableHead>
                    <TableHead className="text-xs text-right">Receita Atribuída</TableHead>
                    <TableHead className="text-xs text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentResults.map(row => {
                    const totalRev = currentResults.reduce((s, r) => s + r.revenue, 0);
                    const pct = totalRev > 0 ? (row.revenue / totalRev) * 100 : 0;
                    return (
                      <TableRow key={row.source}>
                        <TableCell className="text-xs font-medium">{groupBy === "source" ? row.source : row.campaign}</TableCell>
                        <TableCell className="text-xs text-right">{row.conversions.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right">{formatBRL(row.revenue)}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: MODEL_COLORS[selectedModel] }}
                              />
                            </div>
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Comparação de Modelos — Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="source" tick={{ fontSize: 9 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                  {(Object.keys(MODEL_COLORS) as AttributionModel[]).map(model => (
                    <Radar
                      key={model}
                      name={ATTRIBUTION_LABELS[model]}
                      dataKey={model}
                      stroke={MODEL_COLORS[model]}
                      fill={MODEL_COLORS[model]}
                      fillOpacity={0.1}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Side-by-side table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Receita Atribuída por Modelo</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{groupBy === "source" ? "Fonte" : "Campanha"}</TableHead>
                    {(Object.keys(ATTRIBUTION_LABELS) as AttributionModel[]).map(model => (
                      <TableHead key={model} className="text-xs text-right">{ATTRIBUTION_LABELS[model]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {radarData.map(row => (
                    <TableRow key={row.source}>
                      <TableCell className="text-xs font-medium">{row.source}</TableCell>
                      {(Object.keys(ATTRIBUTION_LABELS) as AttributionModel[]).map(model => (
                        <TableCell key={model} className="text-xs text-right">
                          {formatBRL(row[model] || 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Divergence */}
        <TabsContent value="divergence" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Onde os Modelos mais Divergem</CardTitle>
              <p className="text-xs text-muted-foreground">
                Fontes onde a diferença entre a maior e menor atribuição é mais significativa
              </p>
            </CardHeader>
            <CardContent>
              {divergenceData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sem divergência significativa — os modelos concordam nos resultados.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={divergenceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="source" type="category" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="divergence" fill="hsl(0, 72%, 51%)" name="Divergência" radius={[0, 4, 4, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">💡 Como interpretar</p>
              <p>• <strong>Alta divergência</strong>: o canal tem papel diferente conforme o modelo — investigue se ele atua mais como canal de descoberta (first-click) ou de fechamento (last-click).</p>
              <p>• <strong>Baixa divergência</strong>: os modelos concordam — boa confiança na atribuição.</p>
              <p>• <strong>Time Decay</strong> é geralmente o modelo mais equilibrado para infoprodutos, pois valoriza touchpoints recentes sem ignorar os iniciais.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
