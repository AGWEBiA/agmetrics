import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatters";
import { AlertTriangle, TrendingUp, TrendingDown, Bell, Shield, Loader2 } from "lucide-react";
import { detectAllAnomalies, type AnomalyAlert } from "@/lib/anomalyDetection";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceDot,
} from "recharts";

export default function AnomalyAlertsPage() {
  const { projectId } = useParams();
  const [filterMetric, setFilterMetric] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ["anomaly_sales", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events")
        .select("amount, sale_date, status")
        .eq("project_id", projectId!)
        .eq("is_ignored", false)
        .eq("status", "approved")
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: metaMetrics, isLoading: metaLoading } = useQuery({
    queryKey: ["anomaly_meta", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_metrics")
        .select("date, investment, clicks, impressions, leads, cost_per_lead, cpc, ctr")
        .eq("project_id", projectId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = salesLoading || metaLoading;

  // Aggregate sales by day
  const salesByDay = useMemo(() => {
    if (!sales) return [];
    const map = new Map<string, { revenue: number; count: number }>();
    sales.forEach(s => {
      const day = s.sale_date ? s.sale_date.split("T")[0] : null;
      if (!day) return;
      const existing = map.get(day) || { revenue: 0, count: 0 };
      existing.revenue += Number(s.amount || 0);
      existing.count += 1;
      map.set(day, existing);
    });
    return Array.from(map.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const metaByDay = useMemo(() => {
    if (!metaMetrics) return [];
    return metaMetrics.map((m: any) => ({
      date: m.date,
      investment: Number(m.investment || 0),
      clicks: Number(m.clicks || 0),
      impressions: Number(m.impressions || 0),
      leads: Number(m.leads || 0),
      cpl: Number(m.cost_per_lead || 0),
      cpc: Number(m.cpc || 0),
      ctr: Number(m.ctr || 0),
    }));
  }, [metaMetrics]);

  const alerts = useMemo(() => detectAllAnomalies(salesByDay, metaByDay), [salesByDay, metaByDay]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filterMetric !== "all" && a.metric !== filterMetric) return false;
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      return true;
    });
  }, [alerts, filterMetric, filterSeverity]);

  const uniqueMetrics = useMemo(() => {
    return Array.from(new Set(alerts.map(a => a.metric)));
  }, [alerts]);

  const kpis = useMemo(() => {
    const critical = alerts.filter(a => a.severity === "critical").length;
    const warning = alerts.filter(a => a.severity === "warning").length;
    const spikes = alerts.filter(a => a.type === "spike").length;
    const drops = alerts.filter(a => a.type === "drop").length;
    return { critical, warning, spikes, drops, total: alerts.length };
  }, [alerts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Alertas de Anomalia
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Detecção automática de picos e quedas atípicos nas suas métricas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={kpis.critical > 0 ? "border-destructive" : ""}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Críticos</p>
            </div>
            <p className="text-lg font-bold text-destructive">{kpis.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Bell className="h-3 w-3 text-yellow-500" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avisos</p>
            </div>
            <p className="text-lg font-bold">{kpis.warning}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Picos</p>
            </div>
            <p className="text-lg font-bold">{kpis.spikes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Quedas</p>
            </div>
            <p className="text-lg font-bold">{kpis.drops}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterMetric} onValueChange={setFilterMetric}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Métrica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas métricas</SelectItem>
            {uniqueMetrics.map(m => (
              <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <Shield className="h-10 w-10 text-green-500/30 mb-3" />
            <p className="text-sm font-medium text-green-600">Tudo Normal!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhuma anomalia detectada nas suas métricas com os filtros atuais.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.slice(0, 30).map(alert => (
            <Card
              key={alert.id}
              className={alert.severity === "critical" ? "border-destructive/50" : "border-yellow-500/30"}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {alert.type === "spike" ? (
                      <TrendingUp className={`h-5 w-5 mt-0.5 shrink-0 ${alert.severity === "critical" ? "text-destructive" : "text-yellow-500"}`} />
                    ) : (
                      <TrendingDown className={`h-5 w-5 mt-0.5 shrink-0 ${alert.severity === "critical" ? "text-destructive" : "text-yellow-500"}`} />
                    )}
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Valor: <strong>{formatNumber(alert.value)}</strong> · 
                        Esperado: <strong>{formatNumber(alert.expectedValue)}</strong> · 
                        Desvio: <strong>{Math.abs(alert.deviation).toFixed(1)}σ</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={alert.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">
                      {alert.severity === "critical" ? "Crítico" : "Aviso"}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(alert.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* How it works */}
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">📊 Como funciona a detecção</p>
          <p>• Analisamos os últimos 14 dias como janela de referência para cada métrica.</p>
          <p>• Calculamos o <strong>z-score</strong> (desvios padrão da média) de cada ponto.</p>
          <p>• <strong>Aviso</strong>: desvio ≥ 2σ (evento ocorre em ~5% dos dias). <strong>Crítico</strong>: desvio ≥ 3σ (evento ocorre em ~0.3% dos dias).</p>
          <p>• Métricas monitoradas: Receita, Vendas, Investimento, CPL, CPC, CTR, Leads.</p>
        </CardContent>
      </Card>
    </div>
  );
}
