import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedCard } from "@/components/AnimatedCard";
import { formatBRL, formatPercent, formatNumber, formatDecimal } from "@/lib/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { buildJourneysFromSales, getFirstTouchSources } from "@/lib/attributionModels";

const COLORS = [
  "hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
];

interface AdvancedTrackingAnalysisProps {
  sales: any[];
  totalInvestment: number;
  metaMetrics?: any[];
  googleMetrics?: any[];
}

/**
 * Extracts the real source from a sale considering all tracking fields
 */
function getRealSource(sale: any): string {
  return sale.tracking_src || sale.utm_source || "direto";
}

function getRealCampaign(sale: any): string {
  return sale.utm_campaign || "(sem campanha)";
}

function getFirstTouchFromSale(sale: any): string {
  return sale.tracking_src || sale.utm_source || "direto";
}

export function AdvancedTrackingAnalysis({ sales, totalInvestment, metaMetrics = [], googleMetrics = [] }: AdvancedTrackingAnalysisProps) {
  const [groupBy, setGroupBy] = useState<"first_touch" | "src" | "sck" | "utm_source" | "utm_campaign">("first_touch");

  const approvedSales = useMemo(() => sales.filter(s => s.status === "approved"), [sales]);

  // Build journeys from sales data directly
  const journeys = useMemo(() => buildJourneysFromSales(approvedSales), [approvedSales]);

  // First-touch map
  const firstTouchMap = useMemo(() => getFirstTouchSources(journeys), [journeys]);

  // === LTV por Origem (First Touch) ===
  const ltvByOrigin = useMemo(() => {
    const map = new Map<string, { buyers: Set<string>; totalRevenue: number; purchaseCount: number }>();

    approvedSales.forEach(s => {
      const email = s.buyer_email || s.buyer_name || "anônimo";
      const firstTouch = firstTouchMap.get(email);
      const source = groupBy === "sck"
        ? (s.tracking_sck || "(sem sck)")
        : groupBy === "src"
          ? (s.tracking_src || "(sem src)")
          : groupBy === "utm_source"
            ? (s.utm_source || "(sem utm_source)")
            : groupBy === "utm_campaign"
              ? (s.utm_campaign || "(sem campanha)")
              : (firstTouch?.source || getFirstTouchFromSale(s));

      const existing = map.get(source) || { buyers: new Set<string>(), totalRevenue: 0, purchaseCount: 0 };
      existing.buyers.add(email);
      existing.totalRevenue += Number(s.amount || 0) + Number(s.coproducer_commission || 0);
      existing.purchaseCount++;
      map.set(source, existing);
    });

    return Array.from(map.entries())
      .map(([source, data]) => ({
        source,
        buyers: data.buyers.size,
        totalRevenue: data.totalRevenue,
        purchaseCount: data.purchaseCount,
        ltv: data.buyers.size > 0 ? data.totalRevenue / data.buyers.size : 0,
        avgTicket: data.purchaseCount > 0 ? data.totalRevenue / data.purchaseCount : 0,
        recompraRate: data.buyers.size > 0 ? ((data.purchaseCount / data.buyers.size) - 1) * 100 : 0,
      }))
      .sort((a, b) => b.ltv - a.ltv);
  }, [approvedSales, firstTouchMap, groupBy]);

  // === CPL vs ROI por Campanha ===
  const cplRoiByCampaign = useMemo(() => {
    // Aggregate ads spend + leads by campaign
    const campaignAds = new Map<string, { spend: number; leads: number; clicks: number; impressions: number }>();
    metaMetrics.forEach((m: any) => {
      // Meta metrics don't have campaign breakdown at this level, use "Meta Ads" as group
      const key = "Meta Ads";
      const existing = campaignAds.get(key) || { spend: 0, leads: 0, clicks: 0, impressions: 0 };
      existing.spend += Number(m.investment || 0);
      existing.leads += Number(m.leads || 0);
      existing.clicks += Number(m.clicks || 0);
      existing.impressions += Number(m.impressions || 0);
      campaignAds.set(key, existing);
    });
    googleMetrics.forEach((m: any) => {
      const key = "Google Ads";
      const existing = campaignAds.get(key) || { spend: 0, leads: 0, clicks: 0, impressions: 0 };
      existing.spend += Number(m.investment || 0);
      existing.leads += Number(m.conversions || 0);
      existing.clicks += Number(m.clicks || 0);
      existing.impressions += Number(m.impressions || 0);
      campaignAds.set(key, existing);
    });

    // Aggregate sales revenue by utm_campaign
    const campaignSales = new Map<string, { revenue: number; count: number; buyers: Set<string> }>();
    approvedSales.forEach(s => {
      const campaign = s.utm_campaign || "(sem campanha)";
      const existing = campaignSales.get(campaign) || { revenue: 0, count: 0, buyers: new Set<string>() };
      existing.revenue += Number(s.amount || 0) + Number(s.coproducer_commission || 0);
      existing.count++;
      if (s.buyer_email) existing.buyers.add(s.buyer_email);
      campaignSales.set(campaign, existing);
    });

    // Build combined view
    const allCampaigns = new Set([...campaignAds.keys(), ...campaignSales.keys()]);
    return Array.from(allCampaigns)
      .map(campaign => {
        const ads = campaignAds.get(campaign) || { spend: 0, leads: 0, clicks: 0, impressions: 0 };
        const salesData = campaignSales.get(campaign) || { revenue: 0, count: 0, buyers: new Set() };
        const cpl = ads.leads > 0 ? ads.spend / ads.leads : 0;
        const cpa = salesData.count > 0 ? ads.spend / salesData.count : 0;
        const roi = ads.spend > 0 ? ((salesData.revenue - ads.spend) / ads.spend) * 100 : 0;
        const roas = ads.spend > 0 ? salesData.revenue / ads.spend : 0;

        return {
          campaign: campaign.length > 30 ? campaign.slice(0, 30) + "…" : campaign,
          fullName: campaign,
          spend: ads.spend,
          leads: ads.leads,
          cpl,
          sales: salesData.count,
          revenue: salesData.revenue,
          cpa,
          roi,
          roas,
          buyers: salesData.buyers.size,
        };
      })
      .filter(c => c.revenue > 0 || c.spend > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [approvedSales, metaMetrics, googleMetrics]);

  // === First-touch × Compra Crossover ===
  const firstTouchCrossover = useMemo(() => {
    const map = new Map<string, {
      firstSource: string;
      lastSource: string;
      email: string;
      revenue: number;
      purchaseCount: number;
      firstDate: string;
      lastDate: string;
    }>();

    const byBuyer = new Map<string, any[]>();
    approvedSales.forEach(s => {
      const key = s.buyer_email || s.buyer_name;
      if (!key) return;
      if (!byBuyer.has(key)) byBuyer.set(key, []);
      byBuyer.get(key)!.push(s);
    });

    byBuyer.forEach((salesList, email) => {
      const sorted = salesList.sort((a: any, b: any) =>
        new Date(a.sale_date || a.created_at).getTime() - new Date(b.sale_date || b.created_at).getTime()
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const firstSource = getRealSource(first);
      const lastSource = getRealSource(last);
      const totalRev = sorted.reduce((s: number, sale: any) => s + Number(sale.amount || 0) + Number(sale.coproducer_commission || 0), 0);

      map.set(email, {
        firstSource,
        lastSource,
        email,
        revenue: totalRev,
        purchaseCount: sorted.length,
        firstDate: first.sale_date || first.created_at,
        lastDate: last.sale_date || last.created_at,
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [approvedSales]);

  // Divergence summary: how many buyers have different first vs last source
  const divergenceStats = useMemo(() => {
    const total = firstTouchCrossover.length;
    const divergent = firstTouchCrossover.filter(c => c.firstSource !== c.lastSource).length;
    return {
      total,
      divergent,
      rate: total > 0 ? (divergent / total) * 100 : 0,
    };
  }, [firstTouchCrossover]);

  // Chart data for LTV by origin
  const ltvChartData = useMemo(() => ltvByOrigin.slice(0, 10), [ltvByOrigin]);

  const groupLabels: Record<string, string> = {
    first_touch: "Primeiro Contato (First Touch)",
    utm_source: "UTM Source",
    utm_campaign: "UTM Campanha",
    src: "SRC (tracking_src)",
    sck: "SCK (tracking_sck)",
  };

  if (approvedSales.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          Nenhuma venda aprovada para análise avançada de rastreamento.
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
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Compradores Únicos</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatNumber(firstTouchCrossover.length)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={1}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Origens Distintas</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatNumber(ltvByOrigin.length)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={2}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Divergência Origem</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatPercent(divergenceStats.rate)}</p>
              <p className="text-[10px] text-muted-foreground">{divergenceStats.divergent} de {divergenceStats.total} trocaram de fonte</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={3}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Campanhas Ativas</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatNumber(cplRoiByCampaign.filter(c => c.spend > 0).length)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* LTV por Origem */}
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base">📊 LTV por Origem</CardTitle>
                <p className="text-xs text-muted-foreground">Lifetime Value médio agrupado pela fonte de primeiro contato</p>
              </div>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_touch">Primeiro Contato</SelectItem>
                  <SelectItem value="utm_source">UTM Source</SelectItem>
                  <SelectItem value="utm_campaign">UTM Campanha</SelectItem>
                  <SelectItem value="src">SRC</SelectItem>
                  <SelectItem value="sck">SCK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* LTV Chart */}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ltvChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10}
                      tickFormatter={(v) => formatBRL(v)} />
                    <YAxis type="category" dataKey="source" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120}
                      tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
                    <Tooltip cursor={false}
                      formatter={(v: number, name: string) => name.includes("LTV") || name.includes("Receita") ? formatBRL(v) : formatNumber(v)} />
                    <Legend />
                    <Bar dataKey="ltv" name="LTV Médio" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="avgTicket" name="Ticket Médio" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* LTV Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">{groupLabels[groupBy]}</TableHead>
                      <TableHead className="text-[10px] text-right">Compradores</TableHead>
                      <TableHead className="text-[10px] text-right">Compras</TableHead>
                      <TableHead className="text-[10px] text-right">LTV</TableHead>
                      <TableHead className="text-[10px] text-right">Recompra</TableHead>
                      <TableHead className="text-[10px] text-right">Receita Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ltvByOrigin.slice(0, 15).map(item => (
                      <TableRow key={item.source}>
                        <TableCell className="text-[10px] font-medium max-w-[180px] truncate" title={item.source}>
                          {item.source}
                        </TableCell>
                        <TableCell className="text-[10px] text-right">{formatNumber(item.buyers)}</TableCell>
                        <TableCell className="text-[10px] text-right">{formatNumber(item.purchaseCount)}</TableCell>
                        <TableCell className="text-[10px] text-right font-bold text-success">{formatBRL(item.ltv)}</TableCell>
                        <TableCell className="text-[10px] text-right">
                          {item.recompraRate > 0 ? (
                            <Badge variant="default" className="text-[9px]">+{formatPercent(item.recompraRate)}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-[10px] text-right">{formatBRL(item.totalRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* CPL vs ROI por Campanha */}
      {cplRoiByCampaign.length > 0 && (
        <AnimatedCard index={1}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🎯 CPL vs ROI por Campanha</CardTitle>
              <p className="text-xs text-muted-foreground">Custo por lead, receita gerada e retorno real de cada campanha</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Campanha</TableHead>
                    <TableHead className="text-[10px] text-right">Investido</TableHead>
                    <TableHead className="text-[10px] text-right">Leads</TableHead>
                    <TableHead className="text-[10px] text-right">CPL</TableHead>
                    <TableHead className="text-[10px] text-right">Vendas</TableHead>
                    <TableHead className="text-[10px] text-right">CPA</TableHead>
                    <TableHead className="text-[10px] text-right">Receita</TableHead>
                    <TableHead className="text-[10px] text-right">ROI</TableHead>
                    <TableHead className="text-[10px] text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cplRoiByCampaign.slice(0, 20).map(item => (
                    <TableRow key={item.fullName}>
                      <TableCell className="text-[10px] font-medium max-w-[200px] truncate" title={item.fullName}>
                        {item.campaign}
                      </TableCell>
                      <TableCell className="text-[10px] text-right">{item.spend > 0 ? formatBRL(item.spend) : "—"}</TableCell>
                      <TableCell className="text-[10px] text-right">{item.leads > 0 ? formatNumber(item.leads) : "—"}</TableCell>
                      <TableCell className="text-[10px] text-right">{item.cpl > 0 ? formatBRL(item.cpl) : "—"}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatNumber(item.sales)}</TableCell>
                      <TableCell className="text-[10px] text-right">{item.cpa > 0 ? formatBRL(item.cpa) : "—"}</TableCell>
                      <TableCell className="text-[10px] text-right text-success">{formatBRL(item.revenue)}</TableCell>
                      <TableCell className="text-[10px] text-right">
                        {item.spend > 0 ? (
                          <span className={item.roi >= 0 ? "text-success font-bold" : "text-destructive font-bold"}>
                            {formatPercent(item.roi)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-[10px] text-right">
                        {item.spend > 0 ? `${formatDecimal(item.roas)}x` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* First-touch × Compra Crossover */}
      <AnimatedCard index={2}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">🔄 Cruzamento First-Touch × Compra</CardTitle>
            <p className="text-xs text-muted-foreground">
              Comparação entre a origem do primeiro contato e o último ponto de compra — identifica se a fonte real difere da aparente
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {divergenceStats.divergent > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm">
                  <strong>{formatPercent(divergenceStats.rate)}</strong> dos compradores ({divergenceStats.divergent} de {divergenceStats.total})
                  chegaram por uma fonte diferente da que registrou a última compra.
                  Isso indica que o <strong>último clique pode mascarar a fonte real</strong> de aquisição.
                </p>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Comprador</TableHead>
                  <TableHead className="text-[10px]">Origem (1ª compra)</TableHead>
                  <TableHead className="text-[10px]">Último Contato</TableHead>
                  <TableHead className="text-[10px] text-center">Diverge?</TableHead>
                  <TableHead className="text-[10px] text-right">Compras</TableHead>
                  <TableHead className="text-[10px] text-right">Receita Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firstTouchCrossover.slice(0, 30).map(item => {
                  const diverges = item.firstSource !== item.lastSource;
                  return (
                    <TableRow key={item.email}>
                      <TableCell className="text-[10px] font-medium max-w-[180px] truncate" title={item.email}>
                        {item.email}
                      </TableCell>
                      <TableCell className="text-[10px]">
                        <Badge variant="outline" className="text-[9px]">{item.firstSource}</Badge>
                      </TableCell>
                      <TableCell className="text-[10px]">
                        <Badge variant={diverges ? "secondary" : "outline"} className="text-[9px]">{item.lastSource}</Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-center">
                        {diverges ? (
                          <Badge variant="destructive" className="text-[9px]">⚠ Sim</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[10px] text-right">{item.purchaseCount}</TableCell>
                      <TableCell className="text-[10px] text-right font-bold">{formatBRL(item.revenue)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Interpretação */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">💡 Como interpretar</p>
          <p>• <strong>LTV por Origem</strong>: mostra quais fontes geram compradores de maior valor ao longo do tempo, não apenas na primeira compra.</p>
          <p>• <strong>CPL vs ROI</strong>: cruza o custo de aquisição com a receita real gerada — campanhas com CPL alto mas ROI positivo podem ser mais valiosas que aparentam.</p>
          <p>• <strong>Divergência First-touch</strong>: quando a origem real (primeiro contato) difere do último registro, significa que o modelo last-click está mascarando o canal de descoberta.</p>
          <p>• <strong>SRC/SCK</strong>: parâmetros de rastreamento customizados das plataformas (Kiwify/Hotmart) que complementam os UTMs tradicionais.</p>
        </CardContent>
      </Card>
    </div>
  );
}
