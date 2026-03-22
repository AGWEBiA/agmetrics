/**
 * Advanced Projection Analysis Module
 * Cash Flow, What-If, Seasonality, Growth Metrics, ROI Optimization
 */

import type { SimulationOutput, SimulationParams } from "./monteCarloEngine";
import { runMonteCarloSimulation } from "./monteCarloEngine";
import type { ProjectHistoricalData } from "@/hooks/useProjectionData";

// ─── Cash Flow Projection ───
export interface CashFlowPoint {
  day: number;
  label: string;
  revenueAccum: number;
  costAccum: number;
  profit: number;
  isBreakEven: boolean;
}

export function generateCashFlowProjection(
  params: SimulationParams,
  scenario: "pessimistic" | "realistic" | "optimistic"
): CashFlowPoint[] {
  const result = runMonteCarloSimulation({ ...params, iterations: 500 });
  const s = result.scenarios[scenario];
  const dailyRevenue = s.revenue / params.projectionDays;
  const dailyCost = (params.investmentBudget + s.sales * params.costPerAcquisition) / params.projectionDays;
  const points: CashFlowPoint[] = [];
  let hitBreakEven = false;

  for (let d = 1; d <= params.projectionDays; d++) {
    const rev = dailyRevenue * d;
    const cost = dailyCost * d;
    const profit = rev - cost;
    const isBreakEven = !hitBreakEven && profit >= 0;
    if (isBreakEven) hitBreakEven = true;
    points.push({
      day: d,
      label: `Dia ${d}`,
      revenueAccum: rev,
      costAccum: cost,
      profit,
      isBreakEven,
    });
  }
  return points;
}

// ─── What-If Scenarios ───
export interface WhatIfResult {
  label: string;
  variable: string;
  change: number; // % change applied
  originalRevenue: number;
  newRevenue: number;
  originalProfit: number;
  newProfit: number;
  revenueImpact: number; // %
  profitImpact: number; // %
}

export function runWhatIfAnalysis(
  baseParams: SimulationParams,
  baseResult: SimulationOutput
): WhatIfResult[] {
  const scenarios: { label: string; variable: keyof SimulationParams; change: number }[] = [
    { label: "Ticket +20%", variable: "avgTicket", change: 0.2 },
    { label: "Ticket -15%", variable: "avgTicket", change: -0.15 },
    { label: "Investimento +50%", variable: "investmentBudget", change: 0.5 },
    { label: "Investimento +100%", variable: "investmentBudget", change: 1.0 },
    { label: "CPA -20%", variable: "costPerAcquisition", change: -0.2 },
    { label: "CPA +30%", variable: "costPerAcquisition", change: 0.3 },
    { label: "Conversão +25%", variable: "conversionRate", change: 0.25 },
    { label: "Reembolso -50%", variable: "refundRate", change: -0.5 },
    { label: "Order Bump (+15% ticket)", variable: "avgTicket", change: 0.15 },
    { label: "Downsell (-30% ticket, +40% vendas)", variable: "baseSales", change: 0.4 },
  ];

  return scenarios.map(s => {
    const newParams = { ...baseParams, [s.variable]: (baseParams[s.variable] as number) * (1 + s.change) };
    // Special case for downsell: also reduce ticket
    if (s.label.includes("Downsell")) {
      newParams.avgTicket = baseParams.avgTicket * 0.7;
    }
    const newResult = runMonteCarloSimulation({ ...newParams, iterations: 500 });
    const origRev = baseResult.summary.avgRevenue;
    const origProfit = baseResult.summary.avgProfit;
    return {
      label: s.label,
      variable: s.variable,
      change: s.change * 100,
      originalRevenue: origRev,
      newRevenue: newResult.summary.avgRevenue,
      originalProfit: origProfit,
      newProfit: newResult.summary.avgProfit,
      revenueImpact: origRev > 0 ? ((newResult.summary.avgRevenue - origRev) / origRev) * 100 : 0,
      profitImpact: origProfit !== 0 ? ((newResult.summary.avgProfit - origProfit) / Math.abs(origProfit)) * 100 : 0,
    };
  });
}

// ─── Seasonality Analysis ───
export interface SeasonalityPattern {
  dayOfWeek: string;
  avgSales: number;
  avgRevenue: number;
  index: number; // 1.0 = average
}

export function analyzeSeasonality(
  salesData: { sale_date: string; amount: number }[]
): SeasonalityPattern[] {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const buckets: { sales: number; revenue: number; count: number }[] = Array.from({ length: 7 }, () => ({ sales: 0, revenue: 0, count: 0 }));

  salesData.forEach(s => {
    if (!s.sale_date) return;
    const dow = new Date(s.sale_date).getDay();
    buckets[dow].sales++;
    buckets[dow].revenue += s.amount || 0;
    buckets[dow].count++;
  });

  const totalSales = buckets.reduce((s, b) => s + b.sales, 0);
  const avgPerDay = totalSales / 7;

  return days.map((name, i) => ({
    dayOfWeek: name,
    avgSales: buckets[i].sales,
    avgRevenue: buckets[i].revenue,
    index: avgPerDay > 0 ? buckets[i].sales / avgPerDay : 0,
  }));
}

// ─── Growth Metrics ───
export interface GrowthMetrics {
  cagr: number; // compound annual growth rate
  velocitySales: number; // sales per day trend
  velocityRevenue: number;
  saturationType: "growing" | "stable" | "declining";
  monthlyGrowthRates: { month: string; growth: number }[];
  projectedMonthlyRevenue: { month: string; revenue: number }[];
}

export function calculateGrowthMetrics(
  historicalData: ProjectHistoricalData[],
  simulationResult: SimulationOutput,
  projectionDays: number
): GrowthMetrics {
  const totalRevenue = historicalData.reduce((s, d) => s + d.totalRevenue, 0);
  const totalDays = historicalData.reduce((s, d) => s + d.daysWithData, 0) / (historicalData.length || 1);
  const dailyAvg = totalDays > 0 ? totalRevenue / totalDays : 0;
  const projectedDailyAvg = simulationResult.summary.avgRevenue / projectionDays;

  // CAGR based on historical vs projected
  const yearsSpan = totalDays / 365 || 1;
  const endValue = projectedDailyAvg * 365;
  const startValue = dailyAvg * 365;
  const cagr = startValue > 0 ? (Math.pow(endValue / startValue, 1 / yearsSpan) - 1) * 100 : 0;

  // Velocity
  const velocitySales = historicalData.reduce((s, d) => s + d.dailyAvgSales, 0);
  const velocityRevenue = historicalData.reduce((s, d) => s + d.dailyAvgRevenue, 0);

  // Saturation type
  const growthDelta = projectedDailyAvg - dailyAvg;
  const saturationType = growthDelta > dailyAvg * 0.05 ? "growing" : growthDelta < -dailyAvg * 0.05 ? "declining" : "stable";

  // Project next 6 months
  const projectedMonthlyRevenue: { month: string; revenue: number }[] = [];
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const now = new Date();
  for (let m = 0; m < 6; m++) {
    const date = new Date(now.getFullYear(), now.getMonth() + m + 1, 0);
    const monthIdx = date.getMonth();
    const monthlyGrowthFactor = 1 + (cagr / 100 / 12) * (m + 1);
    projectedMonthlyRevenue.push({
      month: `${monthNames[monthIdx]}/${date.getFullYear().toString().slice(-2)}`,
      revenue: dailyAvg * 30 * Math.max(0.5, monthlyGrowthFactor),
    });
  }

  return {
    cagr: Math.min(Math.max(cagr, -100), 500),
    velocitySales,
    velocityRevenue,
    saturationType,
    monthlyGrowthRates: [],
    projectedMonthlyRevenue,
  };
}

// ─── Goal Probability ───
export interface GoalProbability {
  goalLabel: string;
  targetValue: number;
  probability: number; // % of iterations reaching goal
  avgTimeToGoal: number; // days
}

export function calculateGoalProbability(
  simulation: SimulationOutput,
  goals: { label: string; value: number; metric: "revenue" | "profit" | "sales" }[]
): GoalProbability[] {
  return goals.map(goal => {
    const dist = simulation.distribution;
    const reachingGoal = dist.filter(d => d[goal.metric] >= goal.value).length;
    const probability = (reachingGoal / dist.length) * 100;
    return {
      goalLabel: goal.label,
      targetValue: goal.value,
      probability: Math.min(probability, 100),
      avgTimeToGoal: probability > 0 ? Math.ceil(30 / (probability / 100)) : 999,
    };
  });
}

// ─── Optimal Budget Allocation ───
export interface BudgetAllocation {
  scenario: string;
  metaBudget: number;
  googleBudget: number;
  totalBudget: number;
  expectedROI: number;
  expectedRevenue: number;
}

export function calculateOptimalBudget(
  historicalData: ProjectHistoricalData[],
  baseParams: SimulationParams
): BudgetAllocation[] {
  const totalBudget = baseParams.investmentBudget;
  const allocations = [
    { label: "100% Meta", meta: 1.0, google: 0.0 },
    { label: "80% Meta / 20% Google", meta: 0.8, google: 0.2 },
    { label: "60% Meta / 40% Google", meta: 0.6, google: 0.4 },
    { label: "50% / 50%", meta: 0.5, google: 0.5 },
    { label: "40% Meta / 60% Google", meta: 0.4, google: 0.6 },
    { label: "100% Google", meta: 0.0, google: 1.0 },
  ];

  return allocations.map(a => {
    // Simulate with different CPA based on allocation (meta typically cheaper)
    const metaCPA = baseParams.costPerAcquisition * 0.9;
    const googleCPA = baseParams.costPerAcquisition * 1.1;
    const blendedCPA = metaCPA * a.meta + googleCPA * a.google;
    const adjustedParams = { ...baseParams, costPerAcquisition: blendedCPA, iterations: 300 };
    const result = runMonteCarloSimulation(adjustedParams);

    return {
      scenario: a.label,
      metaBudget: totalBudget * a.meta,
      googleBudget: totalBudget * a.google,
      totalBudget,
      expectedROI: result.summary.avgROI,
      expectedRevenue: result.summary.avgRevenue,
    };
  });
}

// ─── Max Sustainable CPA ───
export function calculateMaxCPA(baseParams: SimulationParams): {
  maxCPA: number;
  currentCPA: number;
  margin: number; // % above/below max
} {
  // Max CPA = ticket * conversion * (1 - refund) - minimum margin
  const netTicket = baseParams.avgTicket * (1 - baseParams.refundRate);
  const maxCPA = netTicket * 0.85; // 15% minimum margin
  const currentCPA = baseParams.costPerAcquisition;
  const margin = maxCPA > 0 ? ((maxCPA - currentCPA) / maxCPA) * 100 : 0;

  return { maxCPA, currentCPA, margin };
}

// ─── Refund Cohort Projection ───
export interface RefundProjection {
  period: string;
  expectedRefunds: number;
  refundAmount: number;
  netRevenue: number;
}

export function projectRefundCohorts(
  params: SimulationParams,
  simulation: SimulationOutput
): RefundProjection[] {
  const periods = [
    { label: "Semana 1", days: 7 },
    { label: "Semana 2", days: 14 },
    { label: "Mês 1", days: 30 },
    { label: "Mês 2", days: 60 },
    { label: "Mês 3", days: 90 },
  ];

  const dailySales = simulation.scenarios.realistic.sales / params.projectionDays;
  const dailyRevenue = simulation.scenarios.realistic.revenue / params.projectionDays;

  // Refunds typically concentrate in first 7-14 days
  const refundDistribution = [0.4, 0.3, 0.2, 0.07, 0.03];

  return periods.map((p, i) => {
    const salesInPeriod = dailySales * p.days;
    const revenueInPeriod = dailyRevenue * p.days;
    const expectedRefunds = salesInPeriod * params.refundRate * refundDistribution[i];
    const refundAmount = expectedRefunds * params.avgTicket;

    return {
      period: p.label,
      expectedRefunds: Math.round(expectedRefunds),
      refundAmount,
      netRevenue: revenueInPeriod - refundAmount,
    };
  });
}
