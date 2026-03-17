import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { WidgetType } from "@/types/widgets";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface WidgetRendererProps {
  type: WidgetType;
  metrics: any;
  isEditing?: boolean;
}

function KpiWidget({ title, value, change, icon }: { title: string; value: string; change?: number | null; icon?: string }) {
  return (
    <div className="flex flex-col justify-center h-full p-2">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-lg">{icon}</span>}
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">{title}</p>
      </div>
      <p className="text-xl sm:text-2xl font-bold tracking-tight mt-1">{value}</p>
      {change !== null && change !== undefined && (
        <span className={`inline-flex items-center gap-0.5 w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold mt-1 ${change >= 0 ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function WidgetRenderer({ type, metrics }: WidgetRendererProps) {
  const m = metrics;

  switch (type) {
    case "kpi_revenue":
      return <KpiWidget title="Receita" value={formatCurrency(m.totalRevenue || 0)} change={m.changes?.revenue} icon="💰" />;
    case "kpi_sales":
      return <KpiWidget title="Vendas" value={formatNumber(m.salesCount || 0)} change={m.changes?.sales} icon="🛒" />;
    case "kpi_roi":
      return <KpiWidget title="ROI" value={formatPercent(m.roi || 0)} change={m.changes?.roi} icon="📈" />;
    case "kpi_roas":
      return <KpiWidget title="ROAS" value={`${(m.roas || 0).toFixed(2)}x`} icon="🎯" />;
    case "kpi_investment":
      return <KpiWidget title="Investimento" value={formatCurrency(m.totalInvestment || 0)} change={m.changes?.investment} icon="💸" />;
    case "kpi_leads":
      return <KpiWidget title="Leads" value={formatNumber(m.totalLeads || 0)} change={m.changes?.leads} icon="👥" />;
    case "kpi_cpl":
      return <KpiWidget title="CPL" value={formatCurrency(m.avgCpl || 0)} icon="📊" />;
    case "kpi_ticket":
      return <KpiWidget title="Ticket Médio" value={formatCurrency(m.avgTicket || 0)} icon="🎫" />;
    case "kpi_margin":
      return <KpiWidget title="Margem" value={formatPercent(m.margin || 0)} icon="📐" />;
    case "kpi_profit":
      return <KpiWidget title="Lucro Líquido" value={formatCurrency(m.netProfit || 0)} icon="✅" />;

    case "chart_sales_line":
      return (
        <ChartWrapper title="Vendas por Dia">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.salesChartData || []}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="vendas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      );

    case "chart_revenue_line":
      return (
        <ChartWrapper title="Receita por Dia">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.salesChartData || []}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="receita" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      );

    case "chart_platform_pie":
      return (
        <ChartWrapper title="Receita por Plataforma">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={m.platformChartData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {(m.platformChartData || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
      );

    case "chart_payment_pie":
      return (
        <ChartWrapper title="Forma de Pagamento">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={m.paymentPieData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {(m.paymentPieData || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
      );

    case "chart_investment_bar":
      return (
        <ChartWrapper title="Investimento por Plataforma">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: "Meta", value: m.metaInvestment || 0 },
              { name: "Google", value: m.googleInvestment || 0 },
              { name: "Manual", value: m.manualInvestment || 0 },
            ].filter(d => d.value > 0)}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      );

    case "chart_funnel": {
      const funnelData = [
        { name: "Impressões", value: m.metaImpressions || 0 },
        { name: "Cliques", value: m.metaClicks || 0 },
        { name: "Leads", value: m.totalLeads || 0 },
        { name: "Vendas", value: m.salesCount || 0 },
      ].filter(d => d.value > 0);
      return (
        <ChartWrapper title="Funil de Conversão">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      );
    }

    case "table_recent_sales": {
      const recent = (m.approvedSales || []).slice(0, 8);
      return (
        <ChartWrapper title="Vendas Recentes">
          <div className="overflow-auto h-full text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1 px-2">Comprador</th>
                  <th className="text-right py-1 px-2">Valor</th>
                  <th className="text-left py-1 px-2">Plataforma</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 px-2 truncate max-w-[120px]">{s.buyer_name || s.buyer_email || "—"}</td>
                    <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(Number(s.amount))}</td>
                    <td className="py-1.5 px-2 capitalize">{s.platform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartWrapper>
      );
    }

    case "table_top_products": {
      const products = (m.productData || []).slice(0, 8);
      return (
        <ChartWrapper title="Top Produtos">
          <div className="overflow-auto h-full text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1 px-2">Produto</th>
                  <th className="text-right py-1 px-2">Vendas</th>
                  <th className="text-right py-1 px-2">Receita</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 px-2 truncate max-w-[150px]">{p.name}</td>
                    <td className="py-1.5 px-2 text-right">{p.count}</td>
                    <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartWrapper>
      );
    }

    case "table_top_ads": {
      const ads = (m.metaAds || []).slice(0, 8);
      return (
        <ChartWrapper title="Top Anúncios">
          <div className="overflow-auto h-full text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1 px-2">Anúncio</th>
                  <th className="text-right py-1 px-2">Gasto</th>
                  <th className="text-right py-1 px-2">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 px-2 truncate max-w-[150px]">{a.ad_name || a.ad_id}</td>
                    <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(Number(a.spend))}</td>
                    <td className="py-1.5 px-2 text-right">{a.clicks || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartWrapper>
      );
    }

    default:
      return <div className="p-4 text-muted-foreground text-sm">Widget não encontrado</div>;
  }
}

function ChartWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2 pb-1 shrink-0">{title}</p>
      <div className="flex-1 min-h-0 px-1 pb-1">
        {children}
      </div>
    </div>
  );
}
