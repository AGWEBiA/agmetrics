import { useParams } from "react-router-dom";
import { useProjectByToken } from "@/hooks/useProjects";
import { usePublicDashboardMetrics } from "@/hooks/usePublicDashboardMetrics";
import { formatBRL, formatPercent, formatDecimal, formatNumber } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const COLORS = ["hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)"];

const GOAL_LABELS: Record<string, string> = {
  revenue: "Receita", sales: "Vendas", roi: "ROI", leads: "Leads", margin: "Margem",
};

export default function PublicDashboard() {
  const { viewToken } = useParams();
  const { data: project, isLoading: projectLoading, error } = useProjectByToken(viewToken);
  const m = usePublicDashboardMetrics(project?.id);

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
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
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-muted-foreground">{project.description}</p>}
        </div>

        {m.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <>
            {/* ROI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard title="ROI Total" value={formatPercent(m.roi)} color={m.roi >= 0 ? "text-emerald-600" : "text-destructive"} icon={m.roi >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} />
              <MetricCard title="ROAS" value={`${formatDecimal(m.roas)}x`} subtitle="Retorno sobre ads" />
              <MetricCard title="Margem Líquida" value={formatPercent(m.margin)} color={m.margin >= 0 ? "text-emerald-600" : "text-destructive"} />
            </div>

            {/* Sales overview */}
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard title="Receita Líquida" value={formatBRL(m.totalRevenue)} />
              <MetricCard title="Nº de Vendas" value={formatNumber(m.salesCount)} />
              <MetricCard title="Ticket Médio" value={formatBRL(m.avgTicket)} />
              <MetricCard title="Investimento Total" value={formatBRL(m.totalInvestment)} />
            </div>

            {/* Goals */}
            {m.goalsProgress.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Metas do Projeto</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {m.goalsProgress.map((g, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{GOAL_LABELS[g.type] || g.type}</span>
                        <span className="text-muted-foreground">
                          {g.type === "revenue" ? formatBRL(g.current) : g.type === "roi" || g.type === "margin" ? formatPercent(g.current) : formatNumber(g.current)}
                          {" / "}
                          {g.type === "revenue" ? formatBRL(g.target) : g.type === "roi" || g.type === "margin" ? formatPercent(g.target) : formatNumber(g.target)}
                        </span>
                      </div>
                      <Progress value={Math.min(g.pct, 100)} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Products table */}
            {m.productData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Vendas por Produto</CardTitle></CardHeader>
                <CardContent>
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
            )}

            {/* Platform pie */}
            {m.platformChartData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Receita por Plataforma</CardTitle></CardHeader>
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
            )}

            {/* Sales timeline */}
            {m.salesChartData.length > 0 && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Evolução de Vendas</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={m.salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        <Bar dataKey="vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Evolução de Receita</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={m.salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        <Line type="monotone" dataKey="receita" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
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
    </div>
  );
}

function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-4">
        <BarChart3 className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">LaunchMetrics</span>
      </div>
    </header>
  );
}

function MetricCard({ title, value, subtitle, color, icon }: { title: string; value: string; subtitle?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          {icon && <span className={color}>{icon}</span>}
          <p className={`text-2xl font-bold tracking-tight ${color || ""}`}>{value}</p>
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
