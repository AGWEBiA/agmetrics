import { useParams } from "react-router-dom";
import { useProjectBySlug } from "@/hooks/useProjects";
import { usePublicDashboardMetrics } from "@/hooks/usePublicDashboardMetrics";
import { formatBRL, formatPercent, formatDecimal, formatNumber } from "@/lib/formatters";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, TrendingDown, Target, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)"];

const GOAL_LABELS: Record<string, string> = {
  revenue: "Receita", sales: "Vendas", roi: "ROI", leads: "Leads", margin: "Margem",
};

export default function PublicDashboard() {
  const { slug } = useParams();
  const { data: project, isLoading: projectLoading, error } = useProjectBySlug(slug);
  const m = usePublicDashboardMetrics(project?.id);

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center px-4">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Dashboard não encontrado</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AnimatedPage>
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted-foreground text-sm sm:text-base">{project.description}</p>}
          </div>

          {m.isLoading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <>
              {/* ROI Hero */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <AnimatedCard index={0}>
                  <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
                    <CardContent className="p-5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">ROI Total</p>
                      <div className="mt-1 flex items-center gap-2">
                        {m.roi >= 0 ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                        <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${m.roi >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatPercent(m.roi)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedCard>
                <AnimatedCard index={1}>
                  <MetricCard title="ROAS" value={`${formatDecimal(m.roas)}x`} subtitle="Retorno sobre ads" />
                </AnimatedCard>
                <AnimatedCard index={2}>
                  <MetricCard title="Margem Líquida" value={formatPercent(m.margin)} color={m.margin >= 0 ? "text-success" : "text-destructive"} />
                </AnimatedCard>
              </div>

              {/* Sales overview */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <AnimatedCard index={0}><MetricCard title="Receita Líquida" value={formatBRL(m.totalRevenue)} /></AnimatedCard>
                <AnimatedCard index={1}><MetricCard title="Nº de Vendas" value={formatNumber(m.salesCount)} /></AnimatedCard>
                <AnimatedCard index={2}><MetricCard title="Ticket Médio" value={formatBRL(m.avgTicket)} /></AnimatedCard>
                <AnimatedCard index={3}><MetricCard title="Investimento" value={formatBRL(m.totalInvestment)} /></AnimatedCard>
              </div>

              {/* Meta Ads */}
              {(m.metaInvestment > 0 || m.metaImpressions > 0) && (
                <AnimatedCard index={0}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Meta Ads</CardTitle>
                        <Badge variant="outline">{formatBRL(m.metaInvestment)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                </AnimatedCard>
              )}

              {/* Google Ads */}
              {(m.googleInvestment > 0 || m.gImpressions > 0) && (
                <AnimatedCard index={0}>
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
                        <Stat label="CPM" value={formatBRL(m.gCpm)} />
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
              )}

              {/* Top Ads */}
              {m.topAds && m.topAds.length > 0 && (
                <AnimatedCard index={0}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Melhores Anúncios</CardTitle>
                      <p className="text-xs text-muted-foreground">Ordenados por investimento total</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {m.topAds.map((ad: any, i: number) => (
                          <div key={ad.id} className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground">#{i + 1}</p>
                                <p className="text-sm font-semibold leading-tight line-clamp-2">{ad.name || "Anúncio"}</p>
                              </div>
                              {ad.status && (
                                <Badge variant={ad.status === "ACTIVE" ? "default" : "secondary"} className="text-[9px] shrink-0">
                                  {ad.status === "ACTIVE" ? "Ativo" : ad.status}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-center bg-muted/40 rounded p-1.5">
                              <div><p className="text-[9px] text-muted-foreground">Gasto</p><p className="text-xs font-bold">{formatBRL(ad.spend || 0)}</p></div>
                              <div><p className="text-[9px] text-muted-foreground">Compras</p><p className="text-xs font-bold">{ad.purchases || 0}</p></div>
                              <div><p className="text-[9px] text-muted-foreground">Leads</p><p className="text-xs font-bold">{ad.leads || 0}</p></div>
                            </div>
                            {ad.preview_link && (
                              <a href={ad.preview_link} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                                <ExternalLink className="h-3 w-3" />
                                Ver Anúncio
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              )}

              {/* Goals */}
              {m.goalsProgress.length > 0 && (
                <AnimatedCard index={0}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Metas do Projeto</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {m.goalsProgress.map((g, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{GOAL_LABELS[g.type] || g.type}</span>
                              {g.pct >= 100 && <Badge className="bg-success text-success-foreground text-[10px]">Meta atingida!</Badge>}
                            </div>
                            <span className="text-muted-foreground text-xs sm:text-sm">
                              {g.type === "revenue" ? formatBRL(g.current) : g.type === "roi" || g.type === "margin" ? formatPercent(g.current) : formatNumber(g.current)}
                              {" / "}
                              {g.type === "revenue" ? formatBRL(g.target) : g.type === "roi" || g.type === "margin" ? formatPercent(g.target) : formatNumber(g.target)}
                            </span>
                          </div>
                          <div className="relative">
                            <Progress value={Math.min(g.pct, 100)} className="h-3" />
                            <span className="absolute right-1 top-0 text-[10px] font-bold leading-3 text-primary-foreground mix-blend-difference">
                              {g.pct.toFixed(0)}%
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </AnimatedCard>
              )}

              {/* Products table */}
              {m.productData.length > 0 && (
                <AnimatedCard index={1}>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Vendas por Produto</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Receita</TableHead>
                            <TableHead className="text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {m.productData.map((p) => (
                            <TableRow key={p.name}>
                              <TableCell className="font-medium text-sm">{p.name}</TableCell>
                              <TableCell className="hidden sm:table-cell"><Badge variant="outline">{p.type === "main" ? "Principal" : p.type === "order_bump" ? "Order Bump" : "—"}</Badge></TableCell>
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
              )}

              {/* Charts side by side on desktop */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Platform pie */}
                {m.platformChartData.length > 0 && (
                  <AnimatedCard index={2}>
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Receita por Plataforma</CardTitle></CardHeader>
                      <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={m.platformChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {m.platformChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </AnimatedCard>
                )}

                {/* Sales bar chart */}
                {m.salesChartData.length > 0 && (
                  <AnimatedCard index={3}>
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Evolução de Vendas</CardTitle></CardHeader>
                      <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={m.salesChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                            <Tooltip cursor={false} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                            <Bar dataKey="vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </AnimatedCard>
                )}
              </div>

              {/* Revenue area chart */}
              {m.salesChartData.length > 0 && (
                <AnimatedCard index={4}>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Evolução de Receita</CardTitle></CardHeader>
                    <CardContent className="h-56 sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={m.salesChartData}>
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                          <Area type="monotone" dataKey="receita" stroke={COLORS[0]} strokeWidth={2} fill="url(#revenueGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              )}

              {m.salesCount === 0 && (
                <Card>
                  <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                    Nenhuma venda registrada ainda. Os dados aparecerão quando houver vendas aprovadas.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </AnimatedPage>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>LaunchMetrics</span>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-6 py-3 sm:py-4">
        <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <span className="text-base sm:text-lg font-semibold">LaunchMetrics</span>
      </div>
    </header>
  );
}

function MetricCard({ title, value, subtitle, color, icon }: { title: string; value: string; subtitle?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          {icon && <span className={color}>{icon}</span>}
          <p className={`text-xl sm:text-2xl font-bold tracking-tight ${color || ""}`}>{value}</p>
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
