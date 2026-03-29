import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProjectBySlug, useProjectByToken } from "@/hooks/useProjects";
import { usePublicDashboardMetrics } from "@/hooks/usePublicDashboardMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setPublicViewToken } from "@/lib/publicSupabaseHeaders";
import { AnimatedPage, AnimatedCard } from "@/components/AnimatedCard";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Target, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { buildOverviewSections } from "@/components/dashboard/OverviewSections";
import { useBudgetData } from "@/components/dashboard/BudgetSection";
import { GOAL_LABELS } from "@/components/dashboard/constants";
import { formatBRL, formatPercent, formatNumber } from "@/lib/formatters";
import { MetricCard } from "@/components/dashboard/MetricCard";

export default function PublicDashboard() {
  const { slug } = useParams();

  // Prevent indexing by search engines and AI crawlers
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow, noarchive, nosnippet, noimageindex';

    let metaAI = document.querySelector('meta[name="ai-robots"]') as HTMLMetaElement;
    if (!metaAI) {
      metaAI = document.createElement('meta');
      metaAI.name = 'ai-robots';
      document.head.appendChild(metaAI);
    }
    metaAI.content = 'noindex, nofollow';

    return () => {
      metaRobots?.remove();
      metaAI?.remove();
    };
  }, []);

  const slugQuery = useProjectBySlug(slug);
  const tokenQuery = useProjectByToken(!slugQuery.data && !slugQuery.isLoading && slug ? slug : undefined);

  const project = slugQuery.data || tokenQuery.data;
  const projectLoading = slugQuery.isLoading || (!slugQuery.data && tokenQuery.isLoading);
  const error = slugQuery.error && tokenQuery.error;

  // Set the view_token header so RLS policies can validate public access
  useEffect(() => {
    if (project?.view_token) {
      setPublicViewToken(project.view_token);
    }
    return () => setPublicViewToken(null);
  }, [project?.view_token]);

  const viewToken = project?.view_token;
  const m = usePublicDashboardMetrics(project?.id, viewToken);
  const { data: whatsappGroups } = useQuery({
    queryKey: ["public_whatsapp_groups", project?.id],
    enabled: !!project?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .eq("project_id", project!.id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: whatsappHistory } = useQuery({
    queryKey: ["public_whatsapp_history", project?.id],
    enabled: !!project?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_member_history" as any)
        .select("*")
        .eq("project_id", project!.id)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const budgetData = useBudgetData(project, m.totalInvestment, m.metaMetrics, m.googleMetrics);

  // Goals
  const { data: goals } = useQuery({
    queryKey: ["public_goals", project?.id],
    enabled: !!project?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_goals")
        .select("type, target_value, period, is_active")
        .eq("project_id", project!.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const goalsProgress = (goals || []).map((g: any) => {
    let current = 0;
    switch (g.type) {
      case "revenue": current = m.grossActionRevenue; break;
      case "sales": current = m.salesCount; break;
      case "roi": current = m.roi; break;
      case "margin": current = m.margin; break;
      case "leads": current = m.totalLeads; break;
    }
    return { type: g.type, target: g.target_value, current, period: g.period, pct: g.target_value > 0 ? (current / g.target_value) * 100 : 0 };
  });

  // Computed KPIs for public summary
  const cpa = m.salesCount > 0 && m.totalInvestment > 0 ? m.totalInvestment / m.salesCount : 0;
  const cpl = m.totalLeads > 0 && m.totalInvestment > 0 ? m.totalInvestment / m.totalLeads : 0;
  const conversionRate = m.totalLeads > 0 ? (m.salesCount / m.totalLeads) * 100 : 0;

  const overviewSections = useMemo(() => {
    return buildOverviewSections({ m, budgetData, whatsappGroups, whatsappHistory, goalsProgress });
  }, [m, budgetData, whatsappGroups, whatsappHistory, goalsProgress]);

  const DEFAULT_PUBLIC_ORDER = ["budget_provisioning", "financial", "roi", "sales_overview", "sales_chart", "funnel", "meta_ads", "google_ads", "payment_methods", "temporal_analysis", "lead_journey", "whatsapp", "products", "platform_pie", "goals"];

  const overviewContent = (
    <>
      {/* Consolidated Public KPI Summary */}
      {!m.isLoading && (m.totalInvestment > 0 || m.salesCount > 0) && (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <AnimatedCard index={0}>
              <MetricCard
                title="Receita Total"
                value={formatBRL(m.totalRevenue)}
                icon={<DollarSign className="h-4 w-4" />}
                color="text-success"
              />
            </AnimatedCard>
            <AnimatedCard index={1}>
              <MetricCard
                title="Investimento"
                value={formatBRL(m.totalInvestment)}
                icon={<TrendingDown className="h-4 w-4" />}
                color="text-warning"
              />
            </AnimatedCard>
            <AnimatedCard index={2}>
              <MetricCard
                title="Vendas"
                value={formatNumber(m.salesCount)}
                icon={<ShoppingCart className="h-4 w-4" />}
              />
            </AnimatedCard>
            <AnimatedCard index={3}>
              <MetricCard
                title="CPA"
                value={cpa > 0 ? formatBRL(cpa) : "—"}
                subtitle="Custo por aquisição"
                icon={<Target className="h-4 w-4" />}
              />
            </AnimatedCard>
            <AnimatedCard index={4}>
              <MetricCard
                title="CPL"
                value={cpl > 0 ? formatBRL(cpl) : "—"}
                subtitle="Custo por lead"
                icon={<Users className="h-4 w-4" />}
              />
            </AnimatedCard>
            <AnimatedCard index={5}>
              <MetricCard
                title="Conversão"
                value={conversionRate > 0 ? formatPercent(conversionRate) : "—"}
                subtitle="Leads → Vendas"
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </AnimatedCard>
          </div>
        </div>
      )}

      {DEFAULT_PUBLIC_ORDER.map((id) => {
        const section = overviewSections[id];
        if (!section) return null;
        return <div key={id}>{section}</div>;
      })}
    </>
  );

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
            <DashboardTabs m={m} project={project} overviewContent={overviewContent} />
          )}
        </main>
      </AnimatedPage>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>AGMetrics</span>
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
        <span className="text-base sm:text-lg font-semibold">AGMetrics</span>
      </div>
    </header>
  );
}
