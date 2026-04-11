import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "@/hooks/useProjects";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportDebriefingPDF } from "@/lib/exportDebriefingPDF";
import {
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  History,
  CalendarDays,
  ThumbsUp,
  ThumbsDown,
  ListOrdered,
  ArrowRight,
  Sparkles,
  BarChart3,
  FileDown,
} from "lucide-react";

interface Strength {
  area: string;
  title: string;
  description: string;
  metric_highlight?: string;
}

interface Weakness {
  area: string;
  title: string;
  description: string;
  severity: "critico" | "importante" | "atencao";
  how_to_fix: string;
  expected_impact: string;
}

interface ActionItem {
  priority: number;
  action: string;
  area: string;
  timeline: string;
  effort: string;
  expected_result: string;
}

interface ComparisonData {
  score_change: number | null;
  improvements: string[];
  regressions: string[];
  pending_actions: string[];
}

interface MetricsSnapshot {
  revenue: number;
  totalInvestment: number;
  roi: number;
  roas: number;
  cpa: number;
  ticketMedio: number;
  salesCount: number;
  refundCount: number;
  refundRate: number;
  totalLeads: number;
  uniqueBuyers: number;
  repeatBuyerRate: number;
}

interface DebriefingData {
  overall_score: number;
  summary: string;
  strengths: Strength[];
  weaknesses: Weakness[];
  action_plan: ActionItem[];
  comparison_with_previous: ComparisonData | null;
  metrics_snapshot: MetricsSnapshot;
  strategy: string;
  period_start: string;
  period_end: string;
}

interface HistoryEntry {
  id: string;
  overall_score: number;
  summary: string;
  strengths: Strength[];
  weaknesses: Weakness[];
  action_plan: ActionItem[];
  comparison_with_previous: ComparisonData | null;
  metrics_snapshot: MetricsSnapshot;
  strategy: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

const areaLabels: Record<string, string> = {
  trafego: "Tráfego",
  conversao: "Conversão",
  produto: "Produto",
  financeiro: "Financeiro",
  criativos: "Criativos",
  comunidade: "Comunidade",
  funil: "Funil",
  recompra: "Recompra",
};

const severityConfig = {
  critico: { label: "Crítico", className: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
  importante: { label: "Importante", className: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
  atencao: { label: "Atenção", className: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Zap },
};

const timelineLabels: Record<string, string> = {
  imediato: "Imediato",
  "1_semana": "1 Semana",
  "2_semanas": "2 Semanas",
  proximo_ciclo: "Próximo Ciclo",
};

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "stroke-emerald-400" : score >= 40 ? "stroke-amber-400" : "stroke-red-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <motion.circle
          cx="65" cy="65" r={radius} fill="none"
          className={color}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-muted/40">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function StrengthCard({ item, index }: { item: Strength; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}>
      <div className="flex gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <ThumbsUp className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{item.title}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{areaLabels[item.area] || item.area}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          {item.metric_highlight && (
            <p className="text-[10px] text-emerald-400 mt-1 font-medium">{item.metric_highlight}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function WeaknessCard({ item, index }: { item: Weakness; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const sev = severityConfig[item.severity] || severityConfig.atencao;
  const SevIcon = sev.icon;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}>
      <div
        className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/30 ${sev.className}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-2 min-w-0">
            <SevIcon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{areaLabels[item.area] || item.area}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground mb-1">Como Corrigir</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.how_to_fix}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground mb-1">Impacto Esperado</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.expected_impact}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ActionPlanCard({ item, index }: { item: ActionItem; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card/60">
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">{item.priority}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{item.action}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{areaLabels[item.area] || item.area}</Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {timelineLabels[item.timeline] || item.timeline}
            </span>
            <span className="text-[10px] text-muted-foreground">Esforço: {item.effort}</span>
          </div>
          <p className="text-[10px] text-primary/80 mt-1 flex items-center gap-1">
            <ArrowRight className="h-2.5 w-2.5" /> {item.expected_result}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Debriefing() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const [data, setData] = useState<DebriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["project_debriefings", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_debriefings" as any)
        .select("id, overall_score, summary, strengths, weaknesses, action_plan, comparison_with_previous, metrics_snapshot, strategy, period_start, period_end, created_at")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as HistoryEntry[];
    },
  });

  useEffect(() => {
    if (history && history.length > 0 && !data && !loading) {
      const latest = history[0];
      setData({
        overall_score: latest.overall_score,
        summary: latest.summary,
        strengths: latest.strengths as Strength[],
        weaknesses: latest.weaknesses as Weakness[],
        action_plan: latest.action_plan as ActionItem[],
        comparison_with_previous: latest.comparison_with_previous as ComparisonData | null,
        metrics_snapshot: latest.metrics_snapshot as MetricsSnapshot,
        strategy: latest.strategy,
        period_start: latest.period_start,
        period_end: latest.period_end,
      });
      setSelectedHistoryId(latest.id);
    }
  }, [history]);

  const generate = async () => {
    if (!projectId) return;
    setLoading(true);
    setData(null);
    setSelectedHistoryId(null);
    try {
      const { data: result, error } = await supabase.functions.invoke("ai-debriefing", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      const debriefingData = result as DebriefingData;
      setData(debriefingData);

      // Save to history
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: inserted } = await supabase
          .from("project_debriefings" as any)
          .insert({
            project_id: projectId,
            user_id: userData.user.id,
            period_start: debriefingData.period_start,
            period_end: debriefingData.period_end,
            strategy: debriefingData.strategy,
            overall_score: debriefingData.overall_score,
            summary: debriefingData.summary,
            strengths: debriefingData.strengths as any,
            weaknesses: debriefingData.weaknesses as any,
            action_plan: debriefingData.action_plan as any,
            metrics_snapshot: debriefingData.metrics_snapshot as any,
            comparison_with_previous: debriefingData.comparison_with_previous as any,
          })
          .select("id")
          .single();
        if (inserted) setSelectedHistoryId((inserted as any).id);
        refetchHistory();
      }
      toast.success("Debriefing gerado e salvo!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar debriefing");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setData({
      overall_score: entry.overall_score,
      summary: entry.summary,
      strengths: entry.strengths as Strength[],
      weaknesses: entry.weaknesses as Weakness[],
      action_plan: entry.action_plan as ActionItem[],
      comparison_with_previous: entry.comparison_with_previous as ComparisonData | null,
      metrics_snapshot: entry.metrics_snapshot as MetricsSnapshot,
      strategy: entry.strategy,
      period_start: entry.period_start,
      period_end: entry.period_end,
    });
    setSelectedHistoryId(entry.id);
    setShowHistory(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Debriefing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise completa do período com pontos fortes, fracos e plano de ação para o próximo ciclo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportDebriefingPDF({
                    projectName: project?.name || "Projeto",
                    overallScore: data.overall_score,
                    summary: data.summary,
                    strengths: data.strengths,
                    weaknesses: data.weaknesses,
                    actionPlan: data.action_plan,
                    metricsSnapshot: data.metrics_snapshot,
                    periodStart: data.period_start,
                    periodEnd: data.period_end,
                    generatedAt: new Date().toLocaleDateString("pt-BR"),
                  });
                  toast.success("PDF exportado!");
                }}
                className="gap-1.5"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant={showHistory ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-1.5"
              >
                <History className="h-4 w-4" />
                Histórico {history && history.length > 0 && `(${history.length})`}
              </Button>
            </>
          )}
          <Button onClick={generate} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            {loading ? "Analisando..." : data ? "Novo Debriefing" : "Gerar Debriefing"}
          </Button>
        </div>
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && history && history.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Histórico de Debriefings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {history.map((entry) => {
                    const isSelected = selectedHistoryId === entry.id;
                    const scoreColor = entry.overall_score >= 70 ? "text-emerald-400" : entry.overall_score >= 40 ? "text-amber-400" : "text-red-400";
                    return (
                      <button
                        key={entry.id}
                        onClick={() => loadFromHistory(entry)}
                        className={`text-left rounded-lg border p-3 transition-all hover:border-primary/40 ${isSelected ? "border-primary bg-primary/5" : "border-border/40"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          <span className={`text-sm font-bold ${scoreColor}`}>{entry.overall_score}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{entry.summary}</p>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground/60">
                          <span>{(entry.strengths as any[]).length} fortes</span>
                          <span>{(entry.weaknesses as any[]).length} fracos</span>
                          <span>{(entry.action_plan as any[]).length} ações</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardHeader className="pb-2"><Skeleton className="h-4 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Faça o Debriefing do seu projeto</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              A IA vai analisar todos os dados do período — vendas, anúncios, funil, reembolsos, produtos e comunidade —
              para identificar o que funcionou, o que precisa melhorar e montar um plano de ação concreto.
            </p>
            <Button onClick={generate} size="lg" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Gerar Debriefing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Score + Summary + Metrics */}
          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            <Card className="border-border/40 bg-card/60 flex items-center justify-center px-6">
              <div className="text-center">
                <ScoreRing score={data.overall_score} />
                {data.comparison_with_previous?.score_change != null && (
                  <div className={`flex items-center justify-center gap-1 mt-2 text-xs font-medium ${data.comparison_with_previous.score_change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {data.comparison_with_previous.score_change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {data.comparison_with_previous.score_change > 0 ? "+" : ""}{data.comparison_with_previous.score_change} pts
                  </div>
                )}
              </div>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Resumo do Período
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    {data.period_start && data.period_end && `${format(new Date(data.period_start + "T12:00:00"), "dd/MM/yy")} → ${format(new Date(data.period_end + "T12:00:00"), "dd/MM/yy")}`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
                {data.metrics_snapshot && (
                  <div className="flex flex-wrap gap-2">
                    <MetricPill label="Receita" value={fmt(data.metrics_snapshot.revenue)} />
                    <MetricPill label="Investimento" value={fmt(data.metrics_snapshot.totalInvestment)} />
                    <MetricPill label="ROI" value={`${data.metrics_snapshot.roi?.toFixed(1)}%`} />
                    <MetricPill label="Vendas" value={String(data.metrics_snapshot.salesCount)} />
                    <MetricPill label="Ticket Médio" value={fmt(data.metrics_snapshot.ticketMedio)} />
                    <MetricPill label="Reembolsos" value={`${data.metrics_snapshot.refundRate?.toFixed(1)}%`} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-emerald-400" /> O que está funcionando ({data.strengths.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.strengths.map((s, i) => <StrengthCard key={i} item={s} index={i} />)}
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-400" /> O que precisa melhorar ({data.weaknesses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.weaknesses.map((w, i) => <WeaknessCard key={i} item={w} index={i} />)}
              </CardContent>
            </Card>
          </div>

          {/* Action Plan */}
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" /> Plano de Ação — Próximos Passos ({data.action_plan.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.action_plan.sort((a, b) => a.priority - b.priority).map((a, i) => (
                <ActionPlanCard key={i} item={a} index={i} />
              ))}
            </CardContent>
          </Card>

          {/* Comparison with previous */}
          {data.comparison_with_previous && (data.comparison_with_previous.improvements?.length > 0 || data.comparison_with_previous.regressions?.length > 0) && (
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Evolução vs Debriefing Anterior
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.comparison_with_previous.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Melhorias
                      </p>
                      <ul className="space-y-1.5">
                        {data.comparison_with_previous.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-emerald-400" />
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.comparison_with_previous.regressions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Pontos de Atenção
                      </p>
                      <ul className="space-y-1.5">
                        {data.comparison_with_previous.regressions.map((reg, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-red-400" />
                            <span>{reg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {data.comparison_with_previous.pending_actions?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/30">
                    <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Ações Pendentes do Plano Anterior
                    </p>
                    <ul className="space-y-1.5">
                      {data.comparison_with_previous.pending_actions.map((pa, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Target className="h-3 w-3 mt-0.5 shrink-0 text-amber-400" />
                          <span>{pa}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
