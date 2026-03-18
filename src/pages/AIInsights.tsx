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
import { exportInsightsPDF } from "@/lib/exportInsightsPDF";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Lightbulb,
  TrendingUp,
  Target,
  ShoppingCart,
  Megaphone,
  Filter,
  Users,
  DollarSign,
  Crosshair,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  FileDown,
  History,
  CalendarDays,
} from "lucide-react";

type InsightCategory = "vendas" | "anuncios" | "funil" | "leads" | "financeiro" | "tracking" | "produtos";
type Impact = "alto" | "medio" | "baixo";
type Priority = "urgente" | "importante" | "oportunidade";

interface Insight {
  category: InsightCategory;
  title: string;
  analysis: string;
  actions: string[];
  impact: Impact;
  priority: Priority;
  metric_reference?: string;
}

interface InsightsData {
  summary: string;
  health_score: number;
  insights: Insight[];
}

interface HistoryEntry {
  id: string;
  summary: string;
  health_score: number;
  insights: Insight[];
  created_at: string;
}

const categoryConfig: Record<InsightCategory, { label: string; icon: React.ElementType; color: string }> = {
  vendas: { label: "Vendas", icon: ShoppingCart, color: "text-emerald-400" },
  anuncios: { label: "Anúncios", icon: Megaphone, color: "text-blue-400" },
  funil: { label: "Funil", icon: Filter, color: "text-purple-400" },
  leads: { label: "Leads", icon: Users, color: "text-amber-400" },
  financeiro: { label: "Financeiro", icon: DollarSign, color: "text-green-400" },
  tracking: { label: "Tracking", icon: Crosshair, color: "text-cyan-400" },
  produtos: { label: "Produtos", icon: Target, color: "text-pink-400" },
};

const impactConfig: Record<Impact, { label: string; variant: "default" | "secondary" | "outline" }> = {
  alto: { label: "Impacto Alto", variant: "default" },
  medio: { label: "Impacto Médio", variant: "secondary" },
  baixo: { label: "Impacto Baixo", variant: "outline" },
};

const priorityConfig: Record<Priority, { label: string; icon: React.ElementType; className: string }> = {
  urgente: { label: "Urgente", icon: AlertTriangle, className: "text-red-400" },
  importante: { label: "Importante", icon: Clock, className: "text-amber-400" },
  oportunidade: { label: "Oportunidade", icon: Zap, className: "text-blue-400" },
};

function HealthScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "stroke-emerald-400" : score >= 40 ? "stroke-amber-400" : "stroke-red-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <motion.circle
          cx="70" cy="70" r={radius} fill="none"
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
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Saúde</span>
      </div>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryConfig[insight.category] || categoryConfig.vendas;
  const impact = impactConfig[insight.impact] || impactConfig.medio;
  const prio = priorityConfig[insight.priority] || priorityConfig.importante;
  const PrioIcon = prio.icon;
  const CatIcon = cat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Card
        className="border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CatIcon className={`h-4 w-4 shrink-0 ${cat.color}`} />
              <CardTitle className="text-sm font-semibold truncate">{insight.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <PrioIcon className={`h-3.5 w-3.5 ${prio.className}`} />
              <Badge variant={impact.variant} className="text-[10px] px-1.5 py-0">
                {impact.label}
              </Badge>
              {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          </div>
          {insight.metric_reference && (
            <p className="text-[10px] text-muted-foreground mt-1">{insight.metric_reference}</p>
          )}
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.analysis}</p>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Ações Recomendadas
                  </p>
                  <ul className="space-y-1.5">
                    {insight.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function AIInsights() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InsightCategory | "all">("all");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Load history
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["ai_insights_history", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights_history" as any)
        .select("id, summary, health_score, insights, created_at")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as HistoryEntry[];
    },
  });

  // Load most recent on mount
  useEffect(() => {
    if (history && history.length > 0 && !data && !loading) {
      const latest = history[0];
      setData({
        summary: latest.summary,
        health_score: latest.health_score,
        insights: latest.insights as Insight[],
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
      const { data: result, error } = await supabase.functions.invoke("ai-insights", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      const insightsData = result as InsightsData;
      setData(insightsData);

      // Save to history
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: inserted } = await supabase
          .from("ai_insights_history" as any)
          .insert({
            project_id: projectId,
            user_id: userData.user.id,
            summary: insightsData.summary,
            health_score: insightsData.health_score,
            insights: insightsData.insights as any,
          })
          .select("id")
          .single();
        if (inserted) setSelectedHistoryId((inserted as any).id);
        refetchHistory();
      }

      toast.success("Insights gerados e salvos no histórico!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setData({
      summary: entry.summary,
      health_score: entry.health_score,
      insights: entry.insights as Insight[],
    });
    setSelectedHistoryId(entry.id);
    setShowHistory(false);
    setActiveFilter("all");
  };

  const handleExportPDF = () => {
    if (!data) return;
    const selectedEntry = history?.find(h => h.id === selectedHistoryId);
    exportInsightsPDF({
      projectName: project?.name || "Projeto",
      summary: data.summary,
      health_score: data.health_score,
      insights: data.insights,
      generatedAt: selectedEntry
        ? format(new Date(selectedEntry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
    });
    toast.success("PDF exportado com sucesso!");
  };

  const filteredInsights = data?.insights.filter(
    i => activeFilter === "all" || i.category === activeFilter
  ) || [];

  const categories = data ? [...new Set(data.insights.map(i => i.category))] : [];

  // Health score trend from history
  const scoreTrend = (history || []).slice(0, 8).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Inteligência de Conversão
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise inteligente dos seus dados com recomendações acionáveis para maximizar conversões.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                <FileDown className="h-4 w-4" />
                Exportar PDF
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
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            {loading ? "Analisando..." : data ? "Atualizar" : "Gerar Insights"}
          </Button>
        </div>
      </div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && history && history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Histórico de Análises
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Score trend mini chart */}
                {scoreTrend.length >= 2 && (
                  <div className="flex items-end gap-1 h-12">
                    {scoreTrend.map((entry, i) => {
                      const color = entry.health_score >= 70 ? "bg-emerald-400" : entry.health_score >= 40 ? "bg-amber-400" : "bg-red-400";
                      return (
                        <div
                          key={entry.id}
                          className={`flex-1 rounded-t-sm ${color} ${selectedHistoryId === entry.id ? "ring-2 ring-primary" : ""} cursor-pointer transition-all hover:opacity-80`}
                          style={{ height: `${Math.max(entry.health_score, 10)}%` }}
                          title={`${format(new Date(entry.created_at), "dd/MM HH:mm")} — Score: ${entry.health_score}`}
                          onClick={() => loadFromHistory(entry)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* History list */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {history.map((entry) => {
                    const isSelected = selectedHistoryId === entry.id;
                    const scoreColor = entry.health_score >= 70 ? "text-emerald-400" : entry.health_score >= 40 ? "text-amber-400" : "text-red-400";
                    return (
                      <button
                        key={entry.id}
                        onClick={() => loadFromHistory(entry)}
                        className={`text-left rounded-lg border p-3 transition-all hover:border-primary/40 ${
                          isSelected ? "border-primary bg-primary/5" : "border-border/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          <span className={`text-sm font-bold ${scoreColor}`}>{entry.health_score}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{entry.summary}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{(entry.insights as any[]).length} insights</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Descubra oportunidades escondidas</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Nossa IA analisa seus dados de vendas, anúncios, funil e tracking para identificar
              gargalos e sugerir ações concretas para aumentar suas conversões.
            </p>
            <Button onClick={generate} size="lg" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Gerar Insights Agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Summary + Health Score */}
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Resumo Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60 backdrop-blur-sm flex items-center justify-center px-8">
              <HealthScoreRing score={data.health_score} />
            </Card>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="text-xs"
            >
              Todos ({data.insights.length})
            </Button>
            {categories.map(cat => {
              const cfg = categoryConfig[cat];
              const CatIcon = cfg.icon;
              const count = data.insights.filter(i => i.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant={activeFilter === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(cat)}
                  className="text-xs gap-1"
                >
                  <CatIcon className="h-3 w-3" />
                  {cfg.label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Insights Grid */}
          <div className="grid gap-3 md:grid-cols-2">
            {filteredInsights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
