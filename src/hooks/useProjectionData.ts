import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SimulationParams } from "@/lib/monteCarloEngine";

export interface ProjectHistoricalData {
  projectId: string;
  projectName: string;
  totalRevenue: number;
  totalSales: number;
  avgTicket: number;
  refundRate: number;
  totalInvestment: number;
  avgCPA: number;
  conversionRate: number;
  dailyAvgRevenue: number;
  dailyAvgSales: number;
  daysWithData: number;
}

export function useProjectionData(projectIds: string[]) {
  return useQuery({
    queryKey: ["projection-data", projectIds],
    queryFn: async () => {
      if (!projectIds.length) return [];

      const results: ProjectHistoricalData[] = [];

      for (const pid of projectIds) {
        // Fetch project info
        const { data: project } = await supabase
          .from("projects")
          .select("id, name, budget, manual_investment")
          .eq("id", pid)
          .single();

        if (!project) continue;

        // Fetch approved sales only (exclude pending)
        const { data: sales } = await supabase
          .from("sales_events")
          .select("amount, status, sale_date, is_ignored")
          .eq("project_id", pid)
          .eq("is_ignored", false)
          .neq("status", "pending");

        const approvedSales = (sales || []).filter(s => s.status === "approved");
        const refundedSales = (sales || []).filter(s => s.status === "refunded");

        const totalRevenue = approvedSales.reduce((s, r) => s + (r.amount || 0), 0);
        const totalSalesCount = approvedSales.length;
        const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
        const refundRate = (approvedSales.length + refundedSales.length) > 0
          ? refundedSales.length / (approvedSales.length + refundedSales.length)
          : 0;

        // Fetch meta + google investment
        const { data: metaMetrics } = await supabase
          .from("meta_metrics")
          .select("investment, leads, impressions, clicks")
          .eq("project_id", pid);

        const { data: googleMetrics } = await supabase
          .from("google_metrics")
          .select("investment, clicks")
          .eq("project_id", pid);

        const metaInv = (metaMetrics || []).reduce((s, m) => s + (m.investment || 0), 0);
        const googleInv = (googleMetrics || []).reduce((s, m) => s + (m.investment || 0), 0);
        const manualInv = project.manual_investment || 0;
        const totalInvestment = metaInv + googleInv + manualInv;

        const totalLeads = (metaMetrics || []).reduce((s, m) => s + (m.leads || 0), 0);
        const conversionRate = totalLeads > 0 ? totalSalesCount / totalLeads : 0.05;
        const avgCPA = totalSalesCount > 0 ? totalInvestment / totalSalesCount : 0;

        // Calculate days span
        const dates = approvedSales.map(s => s.sale_date).filter(Boolean).sort();
        let daysWithData = 30;
        if (dates.length >= 2) {
          const first = new Date(dates[0]!);
          const last = new Date(dates[dates.length - 1]!);
          daysWithData = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
        }

        results.push({
          projectId: pid,
          projectName: project.name,
          totalRevenue,
          totalSales: totalSalesCount,
          avgTicket,
          refundRate,
          totalInvestment,
          avgCPA,
          conversionRate: Math.min(conversionRate, 1),
          dailyAvgRevenue: daysWithData > 0 ? totalRevenue / daysWithData : 0,
          dailyAvgSales: daysWithData > 0 ? totalSalesCount / daysWithData : 0,
          daysWithData,
        });
      }

      return results;
    },
    enabled: projectIds.length > 0,
  });
}

export function buildSimulationParams(
  historicalData: ProjectHistoricalData[],
  overrides: Partial<SimulationParams> = {}
): SimulationParams {
  // Aggregate across selected projects
  const totalRevenue = historicalData.reduce((s, d) => s + d.totalRevenue, 0);
  const totalSales = historicalData.reduce((s, d) => s + d.totalSales, 0);
  const totalInvestment = historicalData.reduce((s, d) => s + d.totalInvestment, 0);
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 100;
  const avgRefundRate = historicalData.length > 0
    ? historicalData.reduce((s, d) => s + d.refundRate, 0) / historicalData.length
    : 0.05;
  const avgConversion = historicalData.length > 0
    ? historicalData.reduce((s, d) => s + d.conversionRate, 0) / historicalData.length
    : 0.05;
  const avgCPA = totalSales > 0 ? totalInvestment / totalSales : 50;

  // Monthly base
  const totalDays = historicalData.reduce((s, d) => s + d.daysWithData, 0) / (historicalData.length || 1);
  const monthlyRevenue = totalDays > 0 ? (totalRevenue / totalDays) * 30 : totalRevenue;
  const monthlySales = totalDays > 0 ? (totalSales / totalDays) * 30 : totalSales;

  return {
    baseRevenue: monthlyRevenue,
    baseSales: Math.round(monthlySales),
    avgTicket,
    conversionRate: avgConversion,
    investmentBudget: totalInvestment > 0 ? (totalInvestment / totalDays) * 30 : 5000,
    costPerAcquisition: avgCPA,
    refundRate: avgRefundRate,
    priceVariation: 0.15,
    demandVariation: 0.2,
    marketGrowth: 0.05,
    projectionDays: 30,
    iterations: 1000,
    ...overrides,
  };
}
