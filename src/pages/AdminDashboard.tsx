import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useLeadJourneyData } from "@/hooks/useLeadJourneyData";
import { useSalesRealtime } from "@/hooks/useSalesRealtime";
import { useGoalAlerts } from "@/hooks/useGoalAlerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardPreferences, useSaveDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { exportDashboardPDF } from "@/lib/exportPDF";
import { exportCSV } from "@/lib/exportCSV";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { AnimatedPage } from "@/components/AnimatedCard";
import { Button } from "@/components/ui/button";
import { ExternalLink, GripVertical, Download, FileSpreadsheet } from "lucide-react";
import { useWhatsAppGroups } from "@/hooks/useProjectData";
import { RecentSalesCard } from "@/components/RecentSalesCard";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { buildOverviewSections } from "@/components/dashboard/OverviewSections";
import { useBudgetData } from "@/components/dashboard/BudgetSection";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatedCard } from "@/components/AnimatedCard";

const DEFAULT_OVERVIEW_ORDER = ["budget_provisioning", "financial", "roi", "sales_overview", "sales_chart", "recent_sales", "funnel", "meta_ads", "google_ads", "payment_methods", "temporal_analysis", "lead_journey", "whatsapp", "products", "platform_pie", "goals"];

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-4 z-10 cursor-grab rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const m = useDashboardMetrics(projectId, dateRange, project?.strategy);
  const { data: whatsappGroups } = useWhatsAppGroups(projectId);
  const leadJourney = useLeadJourneyData(projectId);
  const { data: whatsappHistory } = useQuery({
    queryKey: ["whatsapp_member_history", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_member_history" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const { data: onboardingSteps } = useOnboardingStatus(projectId);
  useSalesRealtime(projectId);
  useGoalAlerts(projectId, {
    totalRevenue: m.totalRevenue,
    salesCount: m.salesCount,
    roi: m.roi,
    margin: m.margin,
    totalLeads: m.totalLeads,
  });

  const { data: goalsData } = useQuery({
    queryKey: ["project_goals", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_goals")
        .select("type, target_value, period, is_active")
        .eq("project_id", projectId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const goalsProgress = (goalsData || []).map((g: any) => {
    let current = 0;
    switch (g.type) {
      case "revenue": current = m.totalRevenue; break;
      case "sales": current = m.salesCount; break;
      case "roi": current = m.roi; break;
      case "margin": current = m.margin; break;
      case "leads": current = m.totalLeads; break;
    }
    return { type: g.type, target: g.target_value, current, period: g.period, pct: g.target_value > 0 ? (current / g.target_value) * 100 : 0 };
  });

  const budgetData = useBudgetData(project, m.totalInvestment, m.metaMetrics, m.googleMetrics);

  const handleExport = () => {
    if (!project) return;
    exportDashboardPDF({
      projectName: project.name,
      totalRevenue: m.totalRevenue,
      grossRevenue: m.grossRevenue,
      salesCount: m.salesCount,
      avgTicket: m.avgTicket,
      roi: m.roi,
      roas: m.roas,
      margin: m.margin,
      netProfit: m.netProfit,
      totalInvestment: m.totalInvestment,
      totalLeads: m.totalLeads,
      conversionRate: m.conversionRate,
      productData: m.productData,
    });
  };

  const handleCSVExport = () => {
    const csvData = m.salesChartData.map((d) => ({
      Data: d.date,
      Vendas: d.vendas,
      Receita: d.receita,
    }));
    exportCSV(csvData, `${project?.name || "metricas"}-vendas`);
  };

  const { data: savedPrefs } = useDashboardPreferences(projectId, "admin");
  const savePrefs = useSaveDashboardPreferences();
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_OVERVIEW_ORDER);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (savedPrefs?.section_order && Array.isArray(savedPrefs.section_order)) {
      setSectionOrder(savedPrefs.section_order as string[]);
    }
  }, [savedPrefs]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        if (projectId) {
          savePrefs.mutate({ projectId, dashboardType: "admin", sectionOrder: newOrder });
        }
        return newOrder;
      });
    }
  }, [projectId, savePrefs]);

  const overviewSections = useMemo(() => {
    const sections = buildOverviewSections({ m, budgetData, whatsappGroups, whatsappHistory, goalsProgress, leadJourney });
    // Add recent_sales (admin-only)
    return {
      ...sections,
      recent_sales: (
        <AnimatedCard index={7}>
          <RecentSalesCard projectId={projectId} />
        </AnimatedCard>
      ),
    };
  }, [m, budgetData, whatsappGroups, whatsappHistory, projectId, leadJourney]);

  const overviewContent = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {sectionOrder.map((id) => {
            const section = overviewSections[id];
            if (!section) return null;
            return <SortableCard key={id} id={id}>{section}</SortableCard>;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project?.name || "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">Auto-refresh: 5 min</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCSVExport}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`https://agmetrics.lovable.app/view/${project?.slug || project?.view_token}`, "_blank")}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Público</span>
          </Button>
        </div>
      </div>

      {onboardingSteps && project && (
        <OnboardingWizard
          projectId={projectId!}
          projectName={project.name}
          completedSteps={onboardingSteps}
        />
      )}

      <DashboardTabs m={m} project={project} overviewContent={overviewContent} />
    </AnimatedPage>
  );
}
