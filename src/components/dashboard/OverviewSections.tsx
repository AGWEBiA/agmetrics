import { AnimatedCard } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { MetricCard, Stat } from "./MetricCard";
import { BudgetSection, type BudgetData } from "./BudgetSection";
import { COLORS, TOOLTIP_STYLE, GOAL_LABELS } from "./constants";
import { formatBRL, formatPercent, formatNumber, formatNumberBR, formatDecimal } from "@/lib/formatters";
import { openAdPreview } from "@/lib/openAdPreview";
import { TrendingUp, TrendingDown, ExternalLink, Video, MessageCircle } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface OverviewProps {
  m: any;
  budgetData: BudgetData | null;
  whatsappGroups?: any[];
  whatsappHistory?: any[];
  goalsProgress?: any[];
  leadJourney?: { totalLeads: number; totalPurchases: number; conversionRate: number; totalRevenue: number; topSource: string; sourceChart: { source: string; purchases: number; clicks: number }[] } | null;
}

export function buildOverviewSections({ m, budgetData, whatsappGroups, whatsappHistory, goalsProgress, leadJourney }: OverviewProps): Record<string, React.ReactNode> {
  return {
    budget_provisioning: budgetData ? <BudgetSection budgetData={budgetData} /> : null,

    financial: m.salesCount > 0 ? (
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Resumo Financeiro</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Receita Bruta da Ação" value={formatBRL(m.grossActionRevenue)} />
              <Stat label="Receita Bruta" value={formatBRL(m.grossRevenue)} />
              <Stat label="Receita Líquida (Produtor)" value={formatBRL(m.producerRevenue)} />
              <Stat label="Comissão Coprodutor" value={formatBRL(m.totalCoproducerCommission)} />
              <Stat label="Taxas Plataforma" value={formatBRL(m.totalFees)} />
              <Stat label="Lucro Líquido Projeto" value={formatBRL(m.netProfitProject)} />
              <Stat label="Lucro Líquido Produtor" value={formatBRL(m.netProfitProducer)} />
              <Stat label="Ticket Médio" value={formatBRL(m.avgTicket)} />
              {m.rpl > 0 && <Stat label="RPL (Receita/Lead)" value={formatBRL(m.rpl)} />}
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    roi: (m.totalInvestment > 0 || m.salesCount > 0) ? (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <AnimatedCard index={0}><MetricCard title="ROI Total" value={formatPercent(m.roi)} color={m.roi >= 0 ? "text-success" : "text-destructive"} icon={m.roi >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} change={m.roiChange} /></AnimatedCard>
        <AnimatedCard index={1}><MetricCard title="ROAS" value={`${formatDecimal(m.roas)}x`} subtitle="Retorno sobre gasto em ads" /></AnimatedCard>
        <AnimatedCard index={2}><MetricCard title="Margem Líquida" value={formatPercent(m.margin)} color={m.margin >= 0 ? "text-success" : "text-destructive"} /></AnimatedCard>
      </div>
    ) : null,

    sales_overview: m.totalSalesCount > 0 ? (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <AnimatedCard index={0}><MetricCard title="Total de Vendas" value={formatNumber(m.totalSalesCount)} subtitle="Todas" /></AnimatedCard>
          <AnimatedCard index={1}><MetricCard title="Aprovadas" value={formatNumber(m.salesCount)} color="text-success" /></AnimatedCard>
          <AnimatedCard index={2}><MetricCard title="Pendentes" value={formatNumber(m.pendingSalesCount)} color="text-warning" /></AnimatedCard>
          <AnimatedCard index={3}><MetricCard title="Canceladas" value={formatNumber(m.cancelledSalesCount)} color="text-destructive" /></AnimatedCard>
          <AnimatedCard index={4}><MetricCard title="Reembolsadas" value={formatNumber(m.refundedSalesCount)} /></AnimatedCard>
          <AnimatedCard index={5}><MetricCard title="Taxa de Conversão" value={formatPercent(m.conversionRate)} subtitle={m.conversionLabel} /></AnimatedCard>
        </div>
        <AnimatedCard index={6}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">📄 Boletos</CardTitle>
              <p className="text-xs text-muted-foreground">Acompanhamento de boletos gerados e taxa de conversão por plataforma</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Boletos Gerados</p><p className="text-xl font-bold mt-1">{formatNumber(m.boletoTotal)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Boletos Pagos</p><p className="text-xl font-bold mt-1 text-success">{formatNumber(m.boletoPaid)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Boletos em Aberto</p><p className="text-xl font-bold mt-1 text-warning">{formatNumber(m.boletoPending)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Taxa de Conversão</p><p className="text-xl font-bold mt-1">{formatPercent(m.boletoConversionRate)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Receita Boletos</p><p className="text-xl font-bold mt-1">{formatBRL(m.boletoRevenue)}</p></div>
              </div>
              {(m.boletoByPlatform.kiwify.total > 0 || m.boletoByPlatform.hotmart.total > 0) && (
                <div>
                  <p className="text-sm font-medium mb-2">Por Plataforma</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {m.boletoByPlatform.kiwify.total > 0 && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Kiwify</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Gerados:</span> <span className="font-semibold">{m.boletoByPlatform.kiwify.total}</span></div>
                          <div><span className="text-muted-foreground">Pagos:</span> <span className="font-semibold text-success">{m.boletoByPlatform.kiwify.paid}</span></div>
                          <div><span className="text-muted-foreground">Abertos:</span> <span className="font-semibold text-warning">{m.boletoByPlatform.kiwify.pending}</span></div>
                          <div><span className="text-muted-foreground">Conversão:</span> <span className="font-semibold">{formatPercent(m.boletoByPlatform.kiwify.total > 0 ? (m.boletoByPlatform.kiwify.paid / m.boletoByPlatform.kiwify.total) * 100 : 0)}</span></div>
                        </div>
                      </div>
                    )}
                    {m.boletoByPlatform.hotmart.total > 0 && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Hotmart</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Gerados:</span> <span className="font-semibold">{m.boletoByPlatform.hotmart.total}</span></div>
                          <div><span className="text-muted-foreground">Pagos:</span> <span className="font-semibold text-success">{m.boletoByPlatform.hotmart.paid}</span></div>
                          <div><span className="text-muted-foreground">Abertos:</span> <span className="font-semibold text-warning">{m.boletoByPlatform.hotmart.pending}</span></div>
                          <div><span className="text-muted-foreground">Conversão:</span> <span className="font-semibold">{formatPercent(m.boletoByPlatform.hotmart.total > 0 ? (m.boletoByPlatform.hotmart.paid / m.boletoByPlatform.hotmart.total) * 100 : 0)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    ) : null,

    sales_chart: m.salesChartData.length > 0 ? (
      <AnimatedCard index={6}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">📈 Evolução de Vendas e Receita</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Vendas por Dia</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip cursor={false} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="vendas" name="Vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Receita por Dia</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={m.salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="receita" name="Receita" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    funnel: (m.totalLeads > 0 || m.totalInvestment > 0 || m.rplLeads > 0) ? (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatedCard index={0}><MetricCard title={m.isRplStrategy ? "Leads (Compradores Únicos)" : "Total de Leads"} value={formatNumber(m.isRplStrategy ? m.rplLeads : m.totalLeads)} subtitle={m.isRplStrategy ? "Emails únicos" : "Meta + Google"} change={m.leadsChange} /></AnimatedCard>
        <AnimatedCard index={1}><MetricCard title="CPL Médio" value={formatBRL(m.avgCpl)} subtitle={m.isRplStrategy ? "Investimento ÷ compradores únicos" : "Custo por lead"} /></AnimatedCard>
        <AnimatedCard index={2}><MetricCard title="RPL Bruto" value={formatBRL(m.rplGross)} subtitle="Receita bruta por lead" color={m.rplGross > (m.avgCpl || 0) ? "text-success" : m.avgCpl > 0 ? "text-destructive" : undefined} /></AnimatedCard>
        <AnimatedCard index={3}><MetricCard title="RPL Líquido" value={formatBRL(m.rpl)} subtitle="Receita líquida por lead" color={m.rpl > (m.avgCpl || 0) ? "text-success" : m.avgCpl > 0 ? "text-destructive" : undefined} /></AnimatedCard>
        <AnimatedCard index={4}><MetricCard title="Compras/Lead" value={m.avgPurchasesPerLead?.toFixed(2) || "0"} subtitle="Média de compras por lead" /></AnimatedCard>
        <AnimatedCard index={5}><MetricCard title="Investimento Total" value={formatBRL(m.totalInvestment)} change={m.investmentChange} /></AnimatedCard>
        <AnimatedCard index={6}><MetricCard title="Receita Líquida" value={formatBRL(m.totalRevenue)} change={m.revenueChange} /></AnimatedCard>
        <AnimatedCard index={7}><MetricCard title="Nº Vendas Aprovadas" value={formatNumber(m.salesCount)} change={m.salesCountChange} /></AnimatedCard>
      </div>
    ) : null,

    meta_ads: (m.metaInvestment > 0 || m.metaImpressions > 0) ? (
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Meta Ads</CardTitle>
              <Badge variant="outline">{formatBRL(m.metaInvestment)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Impressões" value={formatNumber(m.metaImpressions)} />
              <Stat label="CPM" value={formatBRL(m.metaCpm)} />
              <Stat label="Cliques" value={formatNumber(m.metaClicks)} />
              <Stat label="CTR" value={formatPercent(m.metaCtr)} />
              <Stat label="CPC" value={formatBRL(m.metaCpc)} />
              <Stat label="Cliques no Link" value={formatNumber(m.metaLinkClicks)} />
              <Stat label="CTR Link" value={formatPercent(m.metaLinkCtr)} />
              <Stat label="CPC Link" value={formatBRL(m.metaLinkCpc)} />
              <Stat label="Views LP" value={formatNumber(m.metaLpViews)} />
              <Stat label="Connect Rate" value={formatPercent(m.metaConnectRate)} />
              <Stat label="Checkouts" value={formatNumber(m.metaCheckouts)} />
              <Stat label="Conv. Página" value={formatPercent(m.metaPageConversion)} />
              <Stat label="Conv. Checkout" value={formatPercent(m.metaCheckoutConversion)} />
              <Stat label="Resultados" value={formatNumber(m.metaResults)} />
              <Stat label="CPR" value={formatBRL(m.metaCostPerResult)} />
              <Stat label="Compras" value={formatNumber(m.metaPurchases)} />
              <Stat label="Custo/Compra" value={formatBRL(m.metaCostPerPurchase)} />
              <Stat label="Leads" value={formatNumber(m.metaLeads)} />
              <Stat label="CPL" value={formatBRL(m.metaCostPerLead)} />
            </div>
            {(m.metaAds || []).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">🏆 Melhores Anúncios</p>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {(m.metaAds || []).slice(0, 6).map((ad: any, i: number) => (
                    <div key={ad.ad_id} className="rounded-lg border p-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold line-clamp-1 leading-tight">{ad.ad_name || "Anúncio"}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">#{i + 1}</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span><span className="text-muted-foreground">Gasto:</span> <span className="font-semibold">{formatBRL(Number(ad.spend || 0))}</span></span>
                        {ad.purchases > 0 && <span><span className="text-muted-foreground">Compras:</span> <span className="font-semibold">{ad.purchases}</span></span>}
                        {ad.leads > 0 && <span><span className="text-muted-foreground">Leads:</span> <span className="font-semibold">{ad.leads}</span></span>}
                      </div>
                      {(Number(ad.hook_rate || 0) > 0 || Number(ad.hold_rate || 0) > 0) && (
                        <div className="flex items-center gap-3 text-xs bg-primary/5 rounded p-1.5">
                          <Video className="h-3 w-3 text-primary shrink-0" />
                          {Number(ad.hook_rate || 0) > 0 && <span><span className="text-muted-foreground">Hook:</span> <span className="font-semibold">{formatPercent(Number(ad.hook_rate))}</span></span>}
                          {Number(ad.hold_rate || 0) > 0 && <span><span className="text-muted-foreground">Hold:</span> <span className="font-semibold">{formatPercent(Number(ad.hold_rate))}</span></span>}
                        </div>
                      )}
                      {ad.ad_id && (
                        <button onClick={() => openAdPreview(ad.ad_id)} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Ver anúncio
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    google_ads: (m.googleInvestment > 0 || m.gImpressions > 0) ? (
      <AnimatedCard index={1}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Google Ads</CardTitle>
              <Badge variant="outline">{formatBRL(m.googleInvestment)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Impressões" value={formatNumber(m.gImpressions)} />
              <Stat label="CPM" value={formatBRL(m.gImpressions > 0 ? (m.googleInvestment / m.gImpressions) * 1000 : 0)} />
              <Stat label="Cliques" value={formatNumber(m.gClicks)} />
              <Stat label="CTR" value={formatPercent(m.gCtr)} />
              <Stat label="CPC" value={formatBRL(m.gCpc)} />
              <Stat label="Conversões" value={formatNumber(m.gConversions)} />
              <Stat label="Taxa de Conv." value={formatPercent(m.gConversionRate)} />
              <Stat label="Custo/Conv." value={formatBRL(m.gCostPerConversion)} />
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    products: m.productData.length > 0 ? (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {m.productData.map((p: any, i: number) => {
            const typeLabel = p.type === "main" ? "Principal" : p.type === "order_bump" ? "Order Bump" : "Produto";
            const color = COLORS[i % COLORS.length];
            return (
              <AnimatedCard key={p.name} index={i}>
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                  <CardContent className="pt-4 pb-3 pl-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">{typeLabel}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatPercent(p.pct)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendas</p>
                        <p className="text-lg font-bold">{formatNumber(p.count)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Receita</p>
                        <p className="text-lg font-bold text-success">{formatBRL(p.revenue)}</p>
                      </div>
                    </div>
                    <Progress value={Math.min(p.pct, 100)} className="mt-2 h-1.5" />
                  </CardContent>
                </Card>
              </AnimatedCard>
            );
          })}
        </div>
        <AnimatedCard index={m.productData.length}>
          <Card>
            <CardHeader><CardTitle className="text-lg">Detalhamento por Produto</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.productData.map((p: any) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.type === "main" ? "Principal" : p.type === "order_bump" ? "Order Bump" : "—"}</Badge></TableCell>
                      <TableCell className="text-right">{p.count}</TableCell>
                      <TableCell className="text-right">{formatBRL(p.revenue)}</TableCell>
                      <TableCell className="text-right">{p.count > 0 ? formatBRL(p.revenue / p.count) : "—"}</TableCell>
                      <TableCell className="text-right">{formatPercent(p.pct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    ) : null,

    whatsapp: whatsappGroups && whatsappGroups.length > 0 ? (
      <AnimatedCard index={2}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-success" />
              <CardTitle className="text-lg">Grupos WhatsApp</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Total de Grupos" value={formatNumber(whatsappGroups.length)} />
              <Stat label="Total Membros" value={formatNumber(whatsappGroups.reduce((s: number, g: any) => s + (g.member_count || 0), 0))} />
              <Stat label="Pico Total" value={formatNumber(whatsappGroups.reduce((s: number, g: any) => s + (g.peak_members || g.member_count || 0), 0))} />
              <Stat label="Saíram (Total)" value={formatNumber(whatsappGroups.reduce((s: number, g: any) => s + (g.members_left || 0), 0))} />
              <Stat label="Engajamento Médio" value={formatPercent(whatsappGroups.reduce((s: number, g: any) => s + (g.engagement_rate || 0), 0) / whatsappGroups.length)} />
            </div>
            {whatsappGroups.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Por Grupo</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whatsappGroups.slice(0, 6).map((g: any) => (
                    <div key={g.id} className="rounded-lg border p-3 space-y-1">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Membros: {formatNumber(g.member_count || 0)}</span>
                        <span>Pico: {formatNumber(g.peak_members || g.member_count || 0)}</span>
                      </div>
                      {(g.peak_members || 0) > 0 && (
                        <Progress value={((g.member_count || 0) / (g.peak_members || 1)) * 100} className="h-1.5" />
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-destructive">Saíram: {g.members_left || 0}</span>
                        <span className="text-muted-foreground">Engaj: {g.engagement_rate || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {whatsappHistory && whatsappHistory.length > 1 && (() => {
              const byDate = new Map<string, { members: number; joined: number; left: number }>();
              whatsappHistory.forEach((h: any) => {
                const d = new Date(h.recorded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "numeric" });
                const existing = byDate.get(d) || { members: 0, joined: 0, left: 0 };
                byDate.set(d, { members: existing.members + (h.member_count || 0), joined: existing.joined + (h.members_joined || 0), left: existing.left + (h.members_left || 0) });
              });
              const chartData = Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v }));
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">📈 Evolução de Membros</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <Tooltip cursor={false} contentStyle={TOOLTIP_STYLE} />
                          <Legend />
                          <Line type="monotone" dataKey="members" name="Membros" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {chartData.some(d => d.joined > 0 || d.left > 0) && (
                    <div>
                      <p className="text-sm font-medium mb-2">🔄 Entradas vs Saídas</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <Tooltip cursor={false} contentStyle={TOOLTIP_STYLE} />
                            <Legend />
                            <Bar dataKey="joined" name="Entradas" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="left" name="Saídas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    payment_methods: m.paymentPieData?.length > 0 ? (
      <AnimatedCard index={4}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">💲 Métricas de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-1">Distribuição por Tipo de Pagamento</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={m.paymentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        <Cell fill={COLORS[0]} />
                        <Cell fill="hsl(152, 60%, 42%)" />
                      </Pie>
                      <Tooltip cursor={false} formatter={(v: number) => formatNumber(v)} contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Parcelamento por Método</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.installmentBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip cursor={false} formatter={(v: number) => formatNumber(v)} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="avista" name="À vista" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="parcelado" name="Parcelado" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Cartão de Crédito</p><p className="text-xl font-bold mt-1">{m.paymentBreakdown.card.count}</p><p className="text-xs text-muted-foreground">{formatBRL(m.paymentBreakdown.card.revenue)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">PIX</p><p className="text-xl font-bold mt-1">{m.paymentBreakdown.pix.count}</p><p className="text-xs text-muted-foreground">{formatBRL(m.paymentBreakdown.pix.revenue)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">PIX - À Vista</p><p className="text-xl font-bold mt-1">{formatPercent(m.paymentBreakdown.pix.count > 0 ? 100 : 0)}</p><p className="text-xs text-muted-foreground">{m.paymentBreakdown.pix.count} vendas</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Cartão - À Vista</p><p className="text-xl font-bold mt-1">{formatPercent(m.cardCashPct)}</p><p className="text-xs text-muted-foreground">{m.paymentBreakdown.cardCash.count} vendas</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Cartão - Parcelado</p><p className="text-xl font-bold mt-1">{formatPercent(m.cardInstallmentPct)}</p><p className="text-xs text-muted-foreground">{m.paymentBreakdown.cardInstallment.count} vendas</p></div>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    temporal_analysis: m.salesCount > 0 ? (
      <AnimatedCard index={5}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Análise Temporal de Vendas</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">📅 Melhor Dia da Semana</p>
                <p className="text-2xl font-bold mt-1">{m.bestDay.name}</p>
                <div className="flex justify-between mt-3 text-sm"><span className="text-muted-foreground">Vendas:</span><span className="font-semibold">{m.bestDay.vendas}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Receita:</span><span className="font-semibold">{formatBRL(m.bestDay.revenue)}</span></div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">🕐 Melhor Horário</p>
                <p className="text-2xl font-bold mt-1">{m.bestHour.name}</p>
                <div className="flex justify-between mt-3 text-sm"><span className="text-muted-foreground">Vendas:</span><span className="font-semibold">{m.bestHour.vendas}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Receita:</span><span className="font-semibold">{formatBRL(m.bestHour.revenue)}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-3">📊 Vendas por Dia da Semana</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.salesByDayOfWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip cursor={false} formatter={(v: number) => formatNumber(v)} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="vendas" name="Vendas" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">🕐 Vendas por Horário</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.salesByHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={1} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip cursor={false} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="vendas" name="Vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    platform_pie: m.platformChartData.length > 0 ? (
      <AnimatedCard index={3}>
        <Card>
          <CardHeader><CardTitle className="text-lg">Composição de Receita</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={m.platformChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {m.platformChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,

    goals: goalsProgress && goalsProgress.length > 0 ? (
      <div className="space-y-4">
        {/* Goal status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {goalsProgress.map((g: any, i: number) => {
            const status = g.pct >= 100 ? "reached" : g.pct >= 70 ? "close" : "behind";
            const statusIcon = status === "reached" ? "🟢" : status === "close" ? "🟡" : "🔴";
            const statusLabel = status === "reached" ? "Atingida" : status === "close" ? "Em progresso" : "Abaixo";
            const fmtValue = (v: number) =>
              g.type === "revenue" ? formatBRL(v) : g.type === "roi" || g.type === "margin" ? formatPercent(v) : formatNumber(Math.round(v));
            return (
              <AnimatedCard key={i} index={i}>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{GOAL_LABELS[g.type] || g.type}</span>
                      <span className="text-[10px] whitespace-nowrap">{statusIcon} {statusLabel}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{fmtValue(g.current)}</p>
                    <div className="text-[11px] text-muted-foreground">Meta: {fmtValue(g.target)}</div>
                    <Progress value={Math.min(g.pct, 100)} className="h-2" />
                    <div className="text-[11px] text-right font-semibold">{formatPercent(Math.min(g.pct, 999))}</div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            );
          })}
        </div>
        {/* Bar chart: Meta × Atingido */}
        <AnimatedCard index={goalsProgress.length}>
          <Card>
            <CardContent className="p-4 pt-4">
              <p className="text-sm font-medium mb-3">Comparativo Meta × Atingido</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goalsProgress.map((g: any) => ({
                    name: GOAL_LABELS[g.type] || g.type,
                    meta: g.target,
                    atingido: g.current,
                    _type: g.type,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip cursor={false} contentStyle={TOOLTIP_STYLE} formatter={(value: number, _name: string, props: any) => {
                      const type = props?.payload?._type;
                      if (type === "revenue") return formatBRL(value);
                      if (type === "roi" || type === "margin") return formatPercent(value);
                      return formatNumber(Math.round(value));
                    }} />
                    <Legend />
                    <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atingido" name="Atingido" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    ) : null,

    lead_journey: leadJourney && leadJourney.totalPurchases > 0 ? (
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">🗺️ Jornada do Lead</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Cliques Rastreados</p>
                <p className="text-xl font-bold mt-1">{formatNumber(leadJourney.totalLeads)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Compras</p>
                <p className="text-xl font-bold mt-1 text-success">{formatNumber(leadJourney.totalPurchases)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
                <p className="text-xl font-bold mt-1">{formatPercent(leadJourney.conversionRate)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Receita Atribuída</p>
                <p className="text-xl font-bold mt-1">{formatBRL(leadJourney.totalRevenue)}</p>
              </div>
            </div>
            {leadJourney.sourceChart.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leadJourney.sourceChart.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="source" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="purchases" fill="hsl(152, 60%, 42%)" name="Compras" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="clicks" fill="hsl(220, 90%, 56%)" name="Cliques" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,
  };
}
