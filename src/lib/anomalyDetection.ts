/**
 * Statistical anomaly detection for marketing metrics.
 * Uses z-score with rolling window to detect unusual spikes/drops.
 */

export interface AnomalyAlert {
  id: string;
  metric: string;
  metricLabel: string;
  date: string;
  value: number;
  expectedValue: number;
  deviation: number; // z-score
  type: "spike" | "drop";
  severity: "warning" | "critical";
  message: string;
}

interface DataPoint {
  date: string;
  value: number;
}

const METRIC_LABELS: Record<string, string> = {
  revenue: "Receita",
  sales: "Vendas",
  investment: "Investimento",
  cpl: "CPL",
  cpa: "CPA",
  ctr: "CTR",
  cpc: "CPC",
  leads: "Leads",
  roi: "ROI",
};

/**
 * Detect anomalies using z-score method with rolling window.
 * Z-score > 2 = warning, > 3 = critical.
 */
export function detectAnomalies(
  data: DataPoint[],
  metricName: string,
  windowSize: number = 14,
  warningThreshold: number = 2,
  criticalThreshold: number = 3
): AnomalyAlert[] {
  if (data.length < windowSize + 1) return [];

  const alerts: AnomalyAlert[] = [];
  const label = METRIC_LABELS[metricName] || metricName;

  for (let i = windowSize; i < data.length; i++) {
    const window = data.slice(i - windowSize, i);
    const values = window.map(d => d.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);

    if (stdDev === 0) continue;

    const current = data[i];
    const zScore = (current.value - mean) / stdDev;
    const absZ = Math.abs(zScore);

    if (absZ >= warningThreshold) {
      const type = zScore > 0 ? "spike" as const : "drop" as const;
      const severity = absZ >= criticalThreshold ? "critical" as const : "warning" as const;
      const pctChange = mean > 0 ? ((current.value - mean) / mean) * 100 : 0;
      const direction = type === "spike" ? "acima" : "abaixo";

      alerts.push({
        id: `${metricName}_${current.date}`,
        metric: metricName,
        metricLabel: label,
        date: current.date,
        value: current.value,
        expectedValue: mean,
        deviation: zScore,
        type,
        severity,
        message: `${label} ${Math.abs(pctChange).toFixed(0)}% ${direction} da média (${severity === "critical" ? "crítico" : "atenção"})`,
      });
    }
  }

  return alerts;
}

/**
 * Detect anomalies across multiple metrics from dashboard data.
 */
export function detectAllAnomalies(
  salesByDay: { date: string; revenue: number; count: number }[],
  metaByDay: { date: string; investment: number; clicks: number; impressions: number; leads: number; cpl: number; cpc: number; ctr: number }[],
): AnomalyAlert[] {
  const allAlerts: AnomalyAlert[] = [];

  // Revenue
  if (salesByDay.length > 0) {
    allAlerts.push(...detectAnomalies(
      salesByDay.map(d => ({ date: d.date, value: d.revenue })),
      "revenue"
    ));
    allAlerts.push(...detectAnomalies(
      salesByDay.map(d => ({ date: d.date, value: d.count })),
      "sales"
    ));
  }

  // Meta metrics
  if (metaByDay.length > 0) {
    allAlerts.push(...detectAnomalies(
      metaByDay.map(d => ({ date: d.date, value: d.investment })),
      "investment"
    ));
    allAlerts.push(...detectAnomalies(
      metaByDay.filter(d => d.cpl > 0).map(d => ({ date: d.date, value: d.cpl })),
      "cpl"
    ));
    allAlerts.push(...detectAnomalies(
      metaByDay.filter(d => d.cpc > 0).map(d => ({ date: d.date, value: d.cpc })),
      "cpc"
    ));
    allAlerts.push(...detectAnomalies(
      metaByDay.filter(d => d.ctr > 0).map(d => ({ date: d.date, value: d.ctr })),
      "ctr"
    ));
    allAlerts.push(...detectAnomalies(
      metaByDay.map(d => ({ date: d.date, value: d.leads })),
      "leads"
    ));
  }

  // Sort by date descending, severity first
  return allAlerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
}
