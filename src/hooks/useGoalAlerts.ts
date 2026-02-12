import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoalAlert {
  type: string;
  target: number;
  current: number;
  reached: boolean;
}

export function useGoalAlerts(
  projectId: string | undefined,
  metrics: {
    totalRevenue: number;
    salesCount: number;
    roi: number;
    margin: number;
    totalLeads: number;
  }
) {
  const { toast } = useToast();
  const alertedGoals = useRef<Set<string>>(new Set());

  const { data: goals = [] } = useQuery({
    queryKey: ["project_goals", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_goals")
        .select("*")
        .eq("project_id", projectId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!goals.length) return;

    goals.forEach((goal: any) => {
      const key = `${goal.id}-${goal.type}`;
      if (alertedGoals.current.has(key)) return;

      let current = 0;
      switch (goal.type) {
        case "revenue": current = metrics.totalRevenue; break;
        case "sales": current = metrics.salesCount; break;
        case "roi": current = metrics.roi; break;
        case "margin": current = metrics.margin; break;
        case "leads": current = metrics.totalLeads; break;
      }

      const pct = goal.target_value > 0 ? (current / goal.target_value) * 100 : 0;

      if (pct >= 100) {
        alertedGoals.current.add(key);
        const labels: Record<string, string> = {
          revenue: "Receita", sales: "Vendas", roi: "ROI", margin: "Margem", leads: "Leads",
        };
        toast({
          title: `🎯 Meta atingida: ${labels[goal.type] || goal.type}!`,
          description: `A meta de ${labels[goal.type]} foi alcançada com sucesso.`,
        });
      } else if (goal.type === "roi" && current < -20 && current !== 0) {
        const roiKey = `${key}-low`;
        if (!alertedGoals.current.has(roiKey)) {
          alertedGoals.current.add(roiKey);
          toast({
            title: "⚠️ ROI abaixo de -20%",
            description: `O ROI atual está em ${current.toFixed(1)}%. Revise suas campanhas.`,
            variant: "destructive",
          });
        }
      }
    });
  }, [goals, metrics, toast]);
}
