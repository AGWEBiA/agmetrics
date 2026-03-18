import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

type InsightCategory = "vendas" | "anuncios" | "funil" | "leads" | "financeiro" | "tracking";
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

const categoryConfig: Record<InsightCategory, { label: string; icon: React.ElementType; color: string }> = {
  vendas: { label: "Vendas", icon: ShoppingCart, color: "text-emerald-400" },
  anuncios: { label: "Anúncios", icon: Megaphone, color: "text-blue-400" },
  funil: { label: "Funil", icon: Filter, color: "text-purple-400" },
  leads: { label: "Leads", icon: Users, color: "text-amber-400" },
  financeiro: { label: "Financeiro", icon: DollarSign, color: "text-green-400" },
  tracking: { label: "Tracking", icon: Crosshair, color: "text-cyan-400" },
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
  const cat = categoryConfig[insight.category];
  const impact = impactConfig[insight.impact];
  const prio = priorityConfig[insight.priority];
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
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InsightCategory | "all">("all");

  const generate = async () => {
    if (!projectId) return;
    setLoading(true);
    setData(null);
    try {
      const { data: result, error } = await supabase.functions.invoke("ai-insights", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result as InsightsData);
      toast.success("Insights gerados com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = data?.insights.filter(
    i => activeFilter === "all" || i.category === activeFilter
  ) || [];

  const categories = data ? [...new Set(data.insights.map(i => i.category))] : [];

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
        <Button onClick={generate} disabled={loading} size="lg" className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
          {loading ? "Analisando dados..." : data ? "Atualizar Insights" : "Gerar Insights"}
        </Button>
      </div>

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
