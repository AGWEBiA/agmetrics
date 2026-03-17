import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatNumber } from "@/lib/formatters";
import { Users, TrendingUp, DollarSign, Loader2, Calendar } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

interface CohortRow {
  cohort: string; // YYYY-MM
  totalBuyers: number;
  months: { month: number; buyers: number; revenue: number; retention: number }[];
  ltv: number;
}

export default function CohortLTVPage() {
  const { projectId } = useParams();
  const [groupBy, setGroupBy] = useState<"month" | "source">("month");

  const { data: sales, isLoading } = useQuery({
    queryKey: ["cohort_sales", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events")
        .select("buyer_email, buyer_name, amount, sale_date, status, utm_source, platform")
        .eq("project_id", projectId!)
        .eq("is_ignored", false)
        .eq("status", "approved")
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Build cohorts
  const cohorts = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    // Group buyers by their first purchase month
    const buyerFirstPurchase = new Map<string, { firstMonth: string; firstSource: string }>();
    const buyerPurchases = new Map<string, { month: string; amount: number }[]>();

    sales.forEach(s => {
      const key = s.buyer_email || s.buyer_name || "anônimo";
      const month = s.sale_date ? s.sale_date.slice(0, 7) : "unknown";
      const source = s.utm_source || "direto";

      if (!buyerFirstPurchase.has(key)) {
        buyerFirstPurchase.set(key, { firstMonth: month, firstSource: source });
      }

      if (!buyerPurchases.has(key)) buyerPurchases.set(key, []);
      buyerPurchases.get(key)!.push({ month, amount: Number(s.amount || 0) });
    });

    // Group by cohort
    const cohortMap = new Map<string, { buyers: Set<string>; monthData: Map<string, { buyers: Set<string>; revenue: number }> }>();

    buyerFirstPurchase.forEach(({ firstMonth, firstSource }, buyer) => {
      const cohortKey = groupBy === "month" ? firstMonth : firstSource;
      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, { buyers: new Set(), monthData: new Map() });
      }
      const cohort = cohortMap.get(cohortKey)!;
      cohort.buyers.add(buyer);

      const purchases = buyerPurchases.get(buyer) || [];
      purchases.forEach(p => {
        if (!cohort.monthData.has(p.month)) {
          cohort.monthData.set(p.month, { buyers: new Set(), revenue: 0 });
        }
        const md = cohort.monthData.get(p.month)!;
        md.buyers.add(buyer);
        md.revenue += p.amount;
      });
    });

    // Build rows
    const rows: CohortRow[] = Array.from(cohortMap.entries())
      .map(([cohort, data]) => {
        const totalBuyers = data.buyers.size;
        const allMonths = Array.from(data.monthData.keys()).sort();
        const firstMonth = groupBy === "month" ? cohort : allMonths[0] || cohort;

        const months = allMonths.map((m, i) => {
          const md = data.monthData.get(m)!;
          return {
            month: i,
            buyers: md.buyers.size,
            revenue: md.revenue,
            retention: totalBuyers > 0 ? (md.buyers.size / totalBuyers) * 100 : 0,
          };
        });

        const ltv = months.reduce((s, m) => s + m.revenue, 0) / Math.max(totalBuyers, 1);

        return { cohort, totalBuyers, months, ltv };
      })
      .sort((a, b) => a.cohort.localeCompare(b.cohort));

    return rows;
  }, [sales, groupBy]);

  // KPIs
  const kpis = useMemo(() => {
    if (!sales || sales.length === 0) return { totalBuyers: 0, avgLTV: 0, repeatRate: 0, avgOrders: 0 };

    const buyerRevenue = new Map<string, { total: number; orders: number }>();
    sales.forEach(s => {
      const key = s.buyer_email || s.buyer_name || "anônimo";
      const existing = buyerRevenue.get(key) || { total: 0, orders: 0 };
      existing.total += Number(s.amount || 0);
      existing.orders += 1;
      buyerRevenue.set(key, existing);
    });

    const totalBuyers = buyerRevenue.size;
    const totalRevenue = Array.from(buyerRevenue.values()).reduce((s, b) => s + b.total, 0);
    const avgLTV = totalBuyers > 0 ? totalRevenue / totalBuyers : 0;
    const repeatBuyers = Array.from(buyerRevenue.values()).filter(b => b.orders > 1).length;
    const repeatRate = totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0;
    const totalOrders = Array.from(buyerRevenue.values()).reduce((s, b) => s + b.orders, 0);
    const avgOrders = totalBuyers > 0 ? totalOrders / totalBuyers : 0;

    return { totalBuyers, avgLTV, repeatRate, avgOrders };
  }, [sales]);

  // LTV by source chart
  const ltvBySourceChart = useMemo(() => {
    if (!sales) return [];
    const sourceMap = new Map<string, { buyers: Set<string>; revenue: number }>();
    const buyerFirst = new Map<string, string>();

    sales.forEach(s => {
      const key = s.buyer_email || s.buyer_name || "anônimo";
      const source = s.utm_source || "direto";
      if (!buyerFirst.has(key)) buyerFirst.set(key, source);
    });

    sales.forEach(s => {
      const key = s.buyer_email || s.buyer_name || "anônimo";
      const source = buyerFirst.get(key) || "direto";
      if (!sourceMap.has(source)) sourceMap.set(source, { buyers: new Set(), revenue: 0 });
      const sm = sourceMap.get(source)!;
      sm.buyers.add(key);
      sm.revenue += Number(s.amount || 0);
    });

    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source: source.length > 15 ? source.slice(0, 15) + "…" : source,
        ltv: data.revenue / Math.max(data.buyers.size, 1),
        buyers: data.buyers.size,
      }))
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 10);
  }, [sales]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Cohort & LTV
          </h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada para análise de cohort.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Heatmap color based on retention
  const getRetentionColor = (retention: number) => {
    if (retention >= 80) return "bg-green-500/80 text-white";
    if (retention >= 60) return "bg-green-500/60 text-white";
    if (retention >= 40) return "bg-green-500/40";
    if (retention >= 20) return "bg-green-500/20";
    if (retention > 0) return "bg-green-500/10";
    return "bg-muted/30";
  };

  const maxMonths = Math.max(...cohorts.map(c => c.months.length), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Cohort & LTV
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise de retenção e valor vitalício por coorte de aquisição
          </p>
        </div>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "month" | "source")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Por Mês de Entrada</SelectItem>
            <SelectItem value="source">Por Fonte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Compradores Únicos", value: formatNumber(kpis.totalBuyers), icon: Users },
          { label: "LTV Médio", value: formatBRL(kpis.avgLTV), icon: DollarSign },
          { label: "Taxa de Recompra", value: `${kpis.repeatRate.toFixed(1)}%`, icon: TrendingUp },
          { label: "Pedidos por Cliente", value: kpis.avgOrders.toFixed(2), icon: Calendar },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="text-lg font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* LTV by Source Chart */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">LTV por Fonte de Aquisição</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ltvBySourceChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="source" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => name === "ltv" ? formatBRL(v) : formatNumber(v)} />
                <Bar dataKey="ltv" fill="hsl(var(--primary))" name="LTV" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Compradores por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ltvBySourceChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="source" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="buyers" fill="hsl(var(--chart-2))" name="Compradores" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Retention Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mapa de Retenção por Coorte</CardTitle>
          <p className="text-xs text-muted-foreground">
            Porcentagem de compradores que voltaram a comprar em cada período
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-2 sticky left-0 bg-background">{groupBy === "month" ? "Coorte" : "Fonte"}</th>
                <th className="text-center py-2 px-2">Comprad.</th>
                <th className="text-center py-2 px-2">LTV</th>
                {Array.from({ length: Math.min(maxMonths, 12) }, (_, i) => (
                  <th key={i} className="text-center py-2 px-2 min-w-[50px]">M{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(cohort => (
                <tr key={cohort.cohort} className="border-b border-border/50">
                  <td className="py-1.5 px-2 font-medium sticky left-0 bg-background whitespace-nowrap">
                    {cohort.cohort}
                  </td>
                  <td className="py-1.5 px-2 text-center">{cohort.totalBuyers}</td>
                  <td className="py-1.5 px-2 text-center font-medium">{formatBRL(cohort.ltv)}</td>
                  {Array.from({ length: Math.min(maxMonths, 12) }, (_, i) => {
                    const m = cohort.months[i];
                    return (
                      <td key={i} className="py-1 px-1 text-center">
                        {m ? (
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${getRetentionColor(m.retention)}`}>
                            {m.retention.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* LTV Evolution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução do LTV por Coorte</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cohorts.map(c => ({
              cohort: c.cohort,
              ltv: c.ltv,
              buyers: c.totalBuyers,
            }))}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="cohort" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number, name: string) => name === "ltv" ? formatBRL(v) : formatNumber(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ltv" stroke="hsl(var(--primary))" strokeWidth={2} name="LTV" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
