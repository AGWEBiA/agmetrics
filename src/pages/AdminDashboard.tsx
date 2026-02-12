import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useSalesRealtime } from "@/hooks/useSalesRealtime";
import { useGoalAlerts } from "@/hooks/useGoalAlerts";
import { useDashboardPreferences, useSaveDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { exportDashboardPDF } from "@/lib/exportPDF";
import { exportCSV } from "@/lib/exportCSV";
import { formatBRL, formatPercent, formatNumber, formatDecimal } from "@/lib/formatters";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, TrendingUp, TrendingDown, GripVertical, Download, FileSpreadsheet, MessageCircle, Users } from "lucide-react";
import { useWhatsAppGroups } from "@/hooks/useProjectData";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLORS = ["hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)"];

const DEFAULT_OVERVIEW_ORDER = ["financial", "roi", "sales_overview", "funnel", "meta_ads", "google_ads", "whatsapp", "products", "platform_pie"];

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-4 z-10 cursor-grab rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const m = useDashboardMetrics(projectId, dateRange);
  const { data: whatsappGroups } = useWhatsAppGroups(projectId);
  const { data: onboardingSteps } = useOnboardingStatus(projectId);
  useSalesRealtime(projectId);
  useGoalAlerts(projectId, {
    totalRevenue: m.totalRevenue,
    salesCount: m.salesCount,
    roi: m.roi,
    margin: m.margin,
    totalLeads: m.totalLeads,
  });

  const handleExport = () => {
    if (!project) return;
    exportDashboardPDF({
      projectName: project.name,
      totalRevenue: m.totalRevenue,
      grossRevenue: m.grossRevenue,
      salesCount: m.salesCount,
      avgTicket: m.avgTicket,
      roi: m.roi,
      roas: m.roas,
      margin: m.margin,
      netProfit: m.netProfit,
      totalInvestment: m.totalInvestment,
      totalLeads: m.totalLeads,
      conversionRate: m.conversionRate,
      productData: m.productData,
    });
  };

  const handleCSVExport = () => {
    const csvData = m.salesChartData.map((d) => ({
      Data: d.date,
      Vendas: d.vendas,
      Receita: d.receita,
    }));
    exportCSV(csvData, `${project?.name || "metricas"}-vendas`);
  };

  const { data: savedPrefs } = useDashboardPreferences(projectId, "admin");
  const savePrefs = useSaveDashboardPreferences();
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_OVERVIEW_ORDER);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (savedPrefs?.section_order && Array.isArray(savedPrefs.section_order)) {
      setSectionOrder(savedPrefs.section_order as string[]);
    }
  }, [savedPrefs]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        if (projectId) {
          savePrefs.mutate({ projectId, dashboardType: "admin", sectionOrder: newOrder });
        }
        return newOrder;
      });
    }
  }, []);

  const overviewSections: Record<string, React.ReactNode> = useMemo(() => ({
    financial: (
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Receita Bruta" value={formatBRL(m.grossRevenue)} />
              <Stat label="Receita Líquida (Produtor)" value={formatBRL(m.totalRevenue)} />
              <Stat label="Comissão Coprodutor" value={formatBRL(m.totalCoproducerCommission)} />
              <Stat label="Taxas Plataforma" value={formatBRL(m.totalTaxes)} />
              <Stat label="Lucro Líquido" value={formatBRL(m.netProfit)} />
              <Stat label="Ticket Médio" value={formatBRL(m.avgTicket)} />
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    ),
    roi: (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <AnimatedCard index={0}>
          <MetricCard title="ROI Total" value={formatPercent(m.roi)} color={m.roi >= 0 ? "text-success" : "text-destructive"} icon={m.roi >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} change={m.roiChange} />
        </AnimatedCard>
        <AnimatedCard index={1}>
          <MetricCard title="ROAS" value={`${formatDecimal(m.roas)}x`} subtitle="Retorno sobre gasto em ads" />
        </AnimatedCard>
        <AnimatedCard index={2}>
          <MetricCard title="Margem Líquida" value={formatPercent(m.margin)} color={m.margin >= 0 ? "text-success" : "text-destructive"} />
        </AnimatedCard>
      </div>
    ),
    sales_overview: (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <AnimatedCard index={0}><MetricCard title="Total de Vendas" value={formatNumber(m.totalSalesCount)} subtitle="Todas" /></AnimatedCard>
        <AnimatedCard index={1}><MetricCard title="Aprovadas" value={formatNumber(m.salesCount)} color="text-success" /></AnimatedCard>
        <AnimatedCard index={2}><MetricCard title="Pendentes" value={formatNumber(m.pendingSalesCount)} color="text-warning" /></AnimatedCard>
        <AnimatedCard index={3}><MetricCard title="Canceladas" value={formatNumber(m.cancelledSalesCount)} color="text-destructive" /></AnimatedCard>
        <AnimatedCard index={4}><MetricCard title="Reembolsadas" value={formatNumber(m.refundedSalesCount)} /></AnimatedCard>
        <AnimatedCard index={5}><MetricCard title="Conversão L→V" value={formatPercent(m.conversionRate)} subtitle="Leads → Vendas" /></AnimatedCard>
      </div>
    ),
    funnel: (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <AnimatedCard index={0}><MetricCard title="Total de Leads" value={formatNumber(m.totalLeads)} subtitle="Meta + Google" change={m.leadsChange} /></AnimatedCard>
        <AnimatedCard index={1}><MetricCard title="CPL Médio" value={formatBRL(m.avgCpl)} subtitle="Custo por lead" /></AnimatedCard>
        <AnimatedCard index={2}><MetricCard title="Investimento Total" value={formatBRL(m.totalInvestment)} change={m.investmentChange} /></AnimatedCard>
        <AnimatedCard index={3}><MetricCard title="Receita Líquida" value={formatBRL(m.totalRevenue)} change={m.revenueChange} /></AnimatedCard>
        <AnimatedCard index={4}><MetricCard title="Nº Vendas Aprovadas" value={formatNumber(m.salesCount)} change={m.salesCountChange} /></AnimatedCard>
      </div>
    ),
    meta_ads: (
      <AnimatedCard index={0}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Meta Ads</CardTitle>
              <Badge variant="outline">{formatBRL(m.metaInvestment)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Resultados" value={formatNumber(m.metaResults)} />
              <Stat label="CPR" value={formatBRL(m.metaCostPerResult)} />
              <Stat label="Compras" value={formatNumber(m.metaPurchases)} />
              <Stat label="Custo/Compra" value={formatBRL(m.metaCostPerPurchase)} />
              <Stat label="Cliques no Link" value={formatNumber(m.metaLinkClicks)} />
              <Stat label="CTR Link" value={formatPercent(m.metaLinkCtr)} />
              <Stat label="CPC Link" value={formatBRL(m.metaLinkCpc)} />
              <Stat label="Views LP" value={formatNumber(m.metaLpViews)} />
              <Stat label="Connect Rate" value={formatPercent(m.metaConnectRate)} />
              <Stat label="Conv. Página" value={formatPercent(m.metaPageConversion)} />
              <Stat label="Conv. Checkout" value={formatPercent(m.metaCheckoutConversion)} />
              <Stat label="Impressões" value={formatNumber(m.metaImpressions)} />
              <Stat label="CPM" value={formatBRL(m.metaCpm)} />
              <Stat label="Leads" value={formatNumber(m.metaLeads)} />
              <Stat label="CPL" value={formatBRL(m.metaCostPerLead)} />
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    ),
    google_ads: (
      <AnimatedCard index={1}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Google Ads</CardTitle>
              <Badge variant="outline">{formatBRL(m.googleInvestment)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Impressões" value={formatNumber(m.gImpressions)} />
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
    ),
    products: m.productData.length > 0 ? (
      <AnimatedCard index={2}>
        <Card>
          <CardHeader><CardTitle className="text-lg">Vendas por Produto</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.productData.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.type === "main" ? "Principal" : p.type === "order_bump" ? "Order Bump" : "—"}</Badge></TableCell>
                    <TableCell className="text-right">{p.count}</TableCell>
                    <TableCell className="text-right">{formatBRL(p.revenue)}</TableCell>
                    <TableCell className="text-right">{formatPercent(p.pct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AnimatedCard>
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
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Total de Grupos" value={formatNumber(whatsappGroups.length)} />
              <Stat label="Total Membros" value={formatNumber(whatsappGroups.reduce((s, g) => s + (g.member_count || 0), 0))} />
              <Stat label="Engajamento Médio" value={formatPercent(whatsappGroups.reduce((s, g) => s + (g.engagement_rate || 0), 0) / whatsappGroups.length)} />
              {whatsappGroups.slice(0, 5).map((g) => (
                <Stat key={g.id} label={g.name} value={`${formatNumber(g.member_count || 0)} membros`} />
              ))}
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
                  {m.platformChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </AnimatedCard>
    ) : null,
  }), [m, whatsappGroups]);

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project?.name || "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">Auto-refresh: 5 min</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCSVExport}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => project?.view_token && window.open(`/view/${project.view_token}`, "_blank")}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Público</span>
          </Button>
        </div>
      </div>

      {onboardingSteps && project && (
        <OnboardingWizard
          projectId={projectId!}
          projectName={project.name}
          completedSteps={onboardingSteps}
        />
      )}

      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
          <TabsTrigger value="acquisition" className="text-xs sm:text-sm">Captação</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs sm:text-sm">Vendas</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm">Temporal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map((id) => {
                const section = overviewSections[id];
                if (!section) return null;
                return <SortableCard key={id} id={id}>{section}</SortableCard>;
              })}
            </SortableContext>
          </DndContext>
        </TabsContent>

        <TabsContent value="acquisition" className="space-y-6 pt-4">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <AnimatedCard index={0}><MetricCard title="Total de Leads" value={formatNumber(m.totalLeads)} subtitle="Meta + Google" /></AnimatedCard>
            <AnimatedCard index={1}><MetricCard title="CPL Médio" value={formatBRL(m.avgCpl)} subtitle="Custo por lead" /></AnimatedCard>
            <AnimatedCard index={2}><MetricCard title="Conversão L→V" value={formatPercent(m.conversionRate)} /></AnimatedCard>
            <AnimatedCard index={3}><MetricCard title="Investimento" value={formatBRL(m.totalInvestment)} subtitle="Total em captação" /></AnimatedCard>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <AnimatedCard index={4}><MetricCard title="Leads Meta Ads" value={formatNumber(m.metaLeads)} subtitle={`CPL: ${formatBRL(m.metaCostPerLead)}`} /></AnimatedCard>
            <AnimatedCard index={5}><MetricCard title="Leads Google Ads" value={formatNumber(m.googleLeads)} subtitle={`CPL: ${m.googleLeads > 0 ? formatBRL(m.googleInvestment / m.googleLeads) : "—"}`} /></AnimatedCard>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 pt-4">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            <AnimatedCard index={0}><MetricCard title="Receita Bruta" value={formatBRL(m.grossRevenue)} subtitle="Total cobrado" /></AnimatedCard>
            <AnimatedCard index={1}><MetricCard title="Receita Líquida (Produtor)" value={formatBRL(m.totalRevenue)} subtitle="Valor recebido" /></AnimatedCard>
            <AnimatedCard index={2}><MetricCard title="Comissão Coprodutor" value={formatBRL(m.totalCoproducerCommission)} subtitle="Valor dos coprodutores" /></AnimatedCard>
            <AnimatedCard index={3}><MetricCard title="Taxas da Plataforma" value={formatBRL(m.totalTaxes)} subtitle="Kiwify + Hotmart" /></AnimatedCard>
            <AnimatedCard index={4}><MetricCard title="Lucro Líquido" value={formatBRL(m.netProfit)} color={m.netProfit >= 0 ? "text-success" : "text-destructive"} subtitle="Receita - Investimento" /></AnimatedCard>
            <AnimatedCard index={5}><MetricCard title="Margem" value={formatPercent(m.margin)} color={m.margin >= 0 ? "text-success" : "text-destructive"} /></AnimatedCard>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <AnimatedCard index={4}>
              <Card>
                <CardHeader><CardTitle className="text-lg">Kiwify</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Vendas" value={formatNumber(m.kiwifySales.length)} />
                    <Stat label="Receita" value={formatBRL(m.kiwifySales.reduce((s, e) => s + Number(e.amount), 0))} />
                    <Stat label="Ticket Médio" value={m.kiwifySales.length > 0 ? formatBRL(m.kiwifySales.reduce((s, e) => s + Number(e.amount), 0) / m.kiwifySales.length) : "—"} />
                    <Stat label="% do Total" value={m.salesCount > 0 ? formatPercent((m.kiwifySales.length / m.salesCount) * 100) : "—"} />
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
            <AnimatedCard index={5}>
              <Card>
                <CardHeader><CardTitle className="text-lg">Hotmart</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Vendas" value={formatNumber(m.hotmartSales.length)} />
                    <Stat label="Receita" value={formatBRL(m.hotmartSales.reduce((s, e) => s + Number(e.amount), 0))} />
                    <Stat label="Ticket Médio" value={m.hotmartSales.length > 0 ? formatBRL(m.hotmartSales.reduce((s, e) => s + Number(e.amount), 0) / m.hotmartSales.length) : "—"} />
                    <Stat label="% do Total" value={m.salesCount > 0 ? formatPercent((m.hotmartSales.length / m.salesCount) * 100) : "—"} />
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6 pt-4">
          {m.salesChartData.length > 0 ? (
            <>
              <AnimatedCard index={0}>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Evolução de Vendas</CardTitle></CardHeader>
                  <CardContent className="h-56 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={m.salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "13px" }} />
                        <Bar dataKey="vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
              <AnimatedCard index={1}>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Evolução de Receita</CardTitle></CardHeader>
                  <CardContent className="h-56 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={m.salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "13px" }} />
                        <Line type="monotone" dataKey="receita" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </>
          ) : (
            <Card>
              <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
                Nenhuma venda registrada ainda. Os gráficos aparecerão quando houver dados.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  );
}

function MetricCard({ title, value, subtitle, color, icon, change }: { title: string; value: string; subtitle?: string; color?: string; icon?: React.ReactNode; change?: number | null }) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          {icon && <span className={color}>{icon}</span>}
          <p className={`text-xl sm:text-2xl font-bold tracking-tight ${color || ""}`}>{value}</p>
          {change !== null && change !== undefined && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] sm:text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm sm:text-base">{value}</p>
    </div>
  );
}
