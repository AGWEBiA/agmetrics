import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnimatedCard } from "@/components/AnimatedCard";
import { formatBRL, formatPercent, formatNumber, formatDateBR } from "@/lib/formatters";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AlertTriangle, TrendingDown, RotateCcw, DollarSign } from "lucide-react";

const COLORS = [
  "hsl(0, 72%, 51%)", "hsl(38, 92%, 50%)", "hsl(265, 80%, 60%)",
  "hsl(220, 90%, 56%)", "hsl(152, 60%, 42%)", "hsl(340, 80%, 55%)",
];

interface RefundsSectionProps {
  projectId: string | undefined;
  totalRevenue: number;
  totalSalesCount: number;
}

export function RefundsSection({ projectId, totalRevenue, totalSalesCount }: RefundsSectionProps) {
  const { data: refundedSales = [] } = useQuery({
    queryKey: ["refunded_sales", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events")
        .select("id, buyer_name, buyer_email, product_name, platform, amount, gross_amount, sale_date, refund_reason, payload")
        .eq("project_id", projectId!)
        .eq("status", "refunded")
        .eq("is_ignored", false)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60000,
  });

  const stats = useMemo(() => {
    const count = refundedSales.length;
    const totalLost = refundedSales.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const grossLost = refundedSales.reduce((s: number, e: any) => s + Number(e.gross_amount || 0), 0);
    const refundRate = totalSalesCount > 0 ? (count / totalSalesCount) * 100 : 0;

    // Group by reason
    const reasonMap = new Map<string, { count: number; amount: number }>();
    refundedSales.forEach((s: any) => {
      // Try refund_reason column first, then extract from payload
      let reason = s.refund_reason;
      if (!reason && s.payload) {
        const p = s.payload;
        reason = p.refund_reason || p.cancellation_reason || p.reason || 
                 p["motivo do reembolso"] || p["motivo"] ||
                 p.data?.refund_reason || p.data?.purchase?.refund_reason || null;
      }
      reason = reason || "Não informado";
      const existing = reasonMap.get(reason) || { count: 0, amount: 0 };
      reasonMap.set(reason, { count: existing.count + 1, amount: existing.amount + Number(s.amount || 0) });
    });

    const reasonData = Array.from(reasonMap.entries())
      .map(([name, data]) => ({ name, ...data, pct: count > 0 ? (data.count / count) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);

    // Group by product
    const productMap = new Map<string, { count: number; amount: number }>();
    refundedSales.forEach((s: any) => {
      const name = s.product_name || "Sem nome";
      const existing = productMap.get(name) || { count: 0, amount: 0 };
      productMap.set(name, { count: existing.count + 1, amount: existing.amount + Number(s.amount || 0) });
    });
    const productData = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    // Group by platform
    const byPlatform = {
      kiwify: refundedSales.filter((s: any) => s.platform === "kiwify"),
      hotmart: refundedSales.filter((s: any) => s.platform === "hotmart"),
    };

    return { count, totalLost, grossLost, refundRate, reasonData, productData, byPlatform };
  }, [refundedSales, totalSalesCount]);

  if (refundedSales.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          🎉 Nenhum reembolso registrado. Ótimo sinal!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <AnimatedCard index={0}>
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="h-4 w-4 text-destructive" />
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Reembolsos</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{formatNumber(stats.count)}</p>
              <p className="text-[10px] text-muted-foreground">de {totalSalesCount} vendas totais</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={1}>
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Taxa de Reembolso</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{formatPercent(stats.refundRate)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={2}>
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-destructive" />
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor Perdido</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{formatBRL(stats.totalLost)}</p>
              <p className="text-[10px] text-muted-foreground">líquido devolvido</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={3}>
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">% da Receita</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-destructive">
                {totalRevenue > 0 ? formatPercent((stats.totalLost / (totalRevenue + stats.totalLost)) * 100) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">impacto na receita</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Reasons Pie Chart */}
        <AnimatedCard index={4}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Motivos de Reembolso</CardTitle>
              <p className="text-xs text-muted-foreground">Distribuição por motivo informado</p>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.reasonData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${name.length > 20 ? name.slice(0, 20) + "…" : name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {stats.reasonData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* By Product */}
        <AnimatedCard index={5}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reembolsos por Produto</CardTitle>
              <p className="text-xs text-muted-foreground">Quais produtos têm mais reembolsos</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Produto</TableHead>
                    <TableHead className="text-[10px] text-right">Qtd</TableHead>
                    <TableHead className="text-[10px] text-right">Valor Perdido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.productData.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="text-[10px] font-medium truncate max-w-[200px]">{item.name}</TableCell>
                      <TableCell className="text-[10px] text-right">{formatNumber(item.count)}</TableCell>
                      <TableCell className="text-[10px] text-right text-destructive">{formatBRL(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Reasons Detail Table */}
      <AnimatedCard index={6}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhamento por Motivo</CardTitle>
            <p className="text-xs text-muted-foreground">Estatísticas detalhadas de cada motivo de reembolso</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Motivo</TableHead>
                  <TableHead className="text-[10px] text-right">Qtd</TableHead>
                  <TableHead className="text-[10px] text-right">%</TableHead>
                  <TableHead className="text-[10px] text-right">Valor Perdido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.reasonData.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="text-[10px] font-medium max-w-[250px]">
                      <Badge variant={item.name === "Não informado" ? "secondary" : "destructive"} className="text-[9px]">
                        {item.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-right">{formatNumber(item.count)}</TableCell>
                    <TableCell className="text-[10px] text-right">{formatPercent(item.pct)}</TableCell>
                    <TableCell className="text-[10px] text-right text-destructive">{formatBRL(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Recent Refunds List */}
      <AnimatedCard index={7}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Últimos Reembolsos</CardTitle>
            <p className="text-xs text-muted-foreground">Reembolsos mais recentes</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {refundedSales.slice(0, 10).map((s: any) => {
                let reason = s.refund_reason;
                if (!reason && s.payload) {
                  const p = s.payload;
                  reason = p.refund_reason || p.cancellation_reason || p.reason ||
                           p["motivo do reembolso"] || p["motivo"] ||
                           p.data?.refund_reason || p.data?.purchase?.refund_reason || null;
                }
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-destructive/20 p-3 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{s.buyer_name || "—"}</p>
                        <Badge variant="outline" className="capitalize text-[10px]">{s.platform}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{s.product_name || "—"}</p>
                      {reason && (
                        <p className="text-[10px] text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {reason}
                        </p>
                      )}
                      {!reason && (
                        <p className="text-[10px] text-muted-foreground italic">Motivo não informado</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{formatDateBR(s.sale_date)}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-bold text-destructive">-{formatBRL(Number(s.amount || 0))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    </div>
  );
}
