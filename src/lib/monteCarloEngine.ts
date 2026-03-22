// Monte Carlo Simulation Engine for Advanced Projections

export interface SimulationParams {
  baseRevenue: number;
  baseSales: number;
  avgTicket: number;
  conversionRate: number; // 0-1
  investmentBudget: number;
  costPerAcquisition: number;
  refundRate: number; // 0-1
  priceVariation: number; // % variation range e.g. 0.2 = ±20%
  demandVariation: number; // % variation
  marketGrowth: number; // annual % e.g. 0.05
  projectionDays: number; // 30, 90, 180, 365
  iterations: number; // 1000+
}

export interface ScenarioResult {
  label: string;
  revenue: number;
  profit: number;
  sales: number;
  roi: number;
  breakEvenDays: number;
  probability: number; // % of iterations in this bucket
}

export interface SimulationOutput {
  scenarios: {
    pessimistic: ScenarioResult;
    realistic: ScenarioResult;
    optimistic: ScenarioResult;
    millionaire: ScenarioResult;
  };
  distribution: { revenue: number; profit: number; sales: number }[];
  sensitivityMatrix: SensitivityEntry[];
  summary: {
    avgRevenue: number;
    avgProfit: number;
    avgROI: number;
    successProbability: number; // % iterations with profit > 0
    avgBreakEvenDays: number;
  };
}

export interface SensitivityEntry {
  variable: string;
  lowValue: number;
  highValue: number;
  impactOnRevenue: number; // % change
  impactOnProfit: number;
}

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

function runSingleIteration(params: SimulationParams): { revenue: number; profit: number; sales: number; roi: number; breakEvenDays: number } {
  const daysRatio = params.projectionDays / 30;

  // Vary key parameters with gaussian noise
  const priceMultiplier = gaussianRandom(1, params.priceVariation / 3);
  const demandMultiplier = gaussianRandom(1 + params.marketGrowth * (params.projectionDays / 365), params.demandVariation / 3);
  const refundMultiplier = gaussianRandom(1, 0.15);

  const adjustedTicket = params.avgTicket * Math.max(0.5, priceMultiplier);
  const adjustedSales = Math.max(0, Math.round(params.baseSales * daysRatio * demandMultiplier));
  const adjustedRefundRate = Math.min(0.5, Math.max(0, params.refundRate * refundMultiplier));

  const grossRevenue = adjustedSales * adjustedTicket;
  const refunds = grossRevenue * adjustedRefundRate;
  const netRevenue = grossRevenue - refunds;

  const totalCost = params.investmentBudget + (adjustedSales * params.costPerAcquisition * gaussianRandom(1, 0.1));
  const profit = netRevenue - totalCost;
  const roi = totalCost > 0 ? ((netRevenue - totalCost) / totalCost) * 100 : 0;

  // Break-even estimation
  const dailyRevenue = netRevenue / params.projectionDays;
  const breakEvenDays = dailyRevenue > 0 ? Math.ceil(totalCost / dailyRevenue) : params.projectionDays * 2;

  return { revenue: netRevenue, profit, sales: adjustedSales, roi, breakEvenDays };
}

export function runMonteCarloSimulation(params: SimulationParams): SimulationOutput {
  const iterations = Math.max(500, params.iterations);
  const results: { revenue: number; profit: number; sales: number; roi: number; breakEvenDays: number }[] = [];

  for (let i = 0; i < iterations; i++) {
    results.push(runSingleIteration(params));
  }

  // Sort by revenue for percentile extraction
  const sorted = [...results].sort((a, b) => a.revenue - b.revenue);

  const p10 = sorted[Math.floor(iterations * 0.10)];
  const p50 = sorted[Math.floor(iterations * 0.50)];
  const p75 = sorted[Math.floor(iterations * 0.75)];
  const p95 = sorted[Math.floor(iterations * 0.95)];

  const successCount = results.filter(r => r.profit > 0).length;

  const avgRevenue = results.reduce((s, r) => s + r.revenue, 0) / iterations;
  const avgProfit = results.reduce((s, r) => s + r.profit, 0) / iterations;
  const avgROI = results.reduce((s, r) => s + r.roi, 0) / iterations;
  const avgBreakEven = results.reduce((s, r) => s + r.breakEvenDays, 0) / iterations;

  // Build distribution (sample 100 points)
  const step = Math.max(1, Math.floor(iterations / 100));
  const distribution = sorted.filter((_, i) => i % step === 0).map(r => ({
    revenue: r.revenue,
    profit: r.profit,
    sales: r.sales,
  }));

  // Sensitivity analysis
  const sensitivityMatrix = runSensitivityAnalysis(params);

  return {
    scenarios: {
      pessimistic: {
        label: "Pessimista",
        revenue: p10.revenue,
        profit: p10.profit,
        sales: p10.sales,
        roi: p10.roi,
        breakEvenDays: p10.breakEvenDays,
        probability: 10,
      },
      realistic: {
        label: "Realista",
        revenue: p50.revenue,
        profit: p50.profit,
        sales: p50.sales,
        roi: p50.roi,
        breakEvenDays: p50.breakEvenDays,
        probability: 50,
      },
      optimistic: {
        label: "Otimista",
        revenue: p75.revenue,
        profit: p75.profit,
        sales: p75.sales,
        roi: p75.roi,
        breakEvenDays: p75.breakEvenDays,
        probability: 25,
      },
      millionaire: {
        label: "Cenário Milionário",
        revenue: p95.revenue,
        profit: p95.profit,
        sales: p95.sales,
        roi: p95.roi,
        breakEvenDays: p95.breakEvenDays,
        probability: 5,
      },
    },
    distribution,
    sensitivityMatrix,
    summary: {
      avgRevenue,
      avgProfit,
      avgROI,
      successProbability: (successCount / iterations) * 100,
      avgBreakEvenDays: avgBreakEven,
    },
  };
}

function runSensitivityAnalysis(params: SimulationParams): SensitivityEntry[] {
  const baseResult = runMonteCarloMini(params, 200);
  const variables: { key: keyof SimulationParams; label: string; delta: number }[] = [
    { key: "avgTicket", label: "Ticket Médio", delta: 0.15 },
    { key: "conversionRate", label: "Taxa de Conversão", delta: 0.2 },
    { key: "investmentBudget", label: "Investimento", delta: 0.2 },
    { key: "refundRate", label: "Taxa de Reembolso", delta: 0.3 },
    { key: "costPerAcquisition", label: "CPA", delta: 0.2 },
  ];

  return variables.map(v => {
    const lowParams = { ...params, [v.key]: (params[v.key] as number) * (1 - v.delta) };
    const highParams = { ...params, [v.key]: (params[v.key] as number) * (1 + v.delta) };
    const lowResult = runMonteCarloMini(lowParams, 200);
    const highResult = runMonteCarloMini(highParams, 200);

    return {
      variable: v.label,
      lowValue: (params[v.key] as number) * (1 - v.delta),
      highValue: (params[v.key] as number) * (1 + v.delta),
      impactOnRevenue: baseResult.avgRevenue > 0
        ? ((highResult.avgRevenue - lowResult.avgRevenue) / baseResult.avgRevenue) * 100
        : 0,
      impactOnProfit: baseResult.avgProfit !== 0
        ? ((highResult.avgProfit - lowResult.avgProfit) / Math.abs(baseResult.avgProfit)) * 100
        : 0,
    };
  });
}

function runMonteCarloMini(params: SimulationParams, iters: number) {
  let totalRevenue = 0, totalProfit = 0;
  for (let i = 0; i < iters; i++) {
    const r = runSingleIteration(params);
    totalRevenue += r.revenue;
    totalProfit += r.profit;
  }
  return { avgRevenue: totalRevenue / iters, avgProfit: totalProfit / iters };
}
