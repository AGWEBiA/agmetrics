/**
 * Multi-touch attribution models for lead journey analysis.
 * Distributes conversion credit across touchpoints.
 */

export type AttributionModel = "first_click" | "last_click" | "linear" | "time_decay";

export interface Touchpoint {
  source: string;
  campaign: string;
  medium: string;
  eventDate: string;
  eventType: string;
}

export interface AttributionResult {
  source: string;
  campaign: string;
  credit: number; // 0-1 fraction of the conversion
  revenue: number;
  conversions: number; // fractional
}

export interface BuyerJourney {
  email: string;
  touchpoints: Touchpoint[];
  converted: boolean;
  revenue: number;
}

export const ATTRIBUTION_LABELS: Record<AttributionModel, string> = {
  first_click: "Primeiro Clique",
  last_click: "Último Clique",
  linear: "Linear",
  time_decay: "Decaimento Temporal",
};

export const ATTRIBUTION_DESCRIPTIONS: Record<AttributionModel, string> = {
  first_click: "100% do crédito para o primeiro ponto de contato",
  last_click: "100% do crédito para o último ponto de contato antes da conversão",
  linear: "Crédito distribuído igualmente entre todos os pontos de contato",
  time_decay: "Mais crédito para touchpoints mais próximos da conversão (meia-vida de 7 dias)",
};

/**
 * Build buyer journeys from lead_events data
 */
export function buildBuyerJourneys(events: any[]): BuyerJourney[] {
  const byBuyer = new Map<string, any[]>();

  events.forEach(e => {
    const key = e.buyer_email || e.buyer_name;
    if (!key) return;
    if (!byBuyer.has(key)) byBuyer.set(key, []);
    byBuyer.get(key)!.push(e);
  });

  return Array.from(byBuyer.entries()).map(([email, evts]) => {
    const sorted = evts.sort((a: any, b: any) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    const touchpoints: Touchpoint[] = sorted
      .filter((e: any) => e.event_type !== "purchase" && e.event_type !== "refund")
      .map((e: any) => ({
        source: e.utm_source || e.event_source || "direto",
        campaign: e.utm_campaign || e.event_detail || "(sem campanha)",
        medium: e.utm_medium || "organic",
        eventDate: e.event_date,
        eventType: e.event_type,
      }));

    const purchases = sorted.filter((e: any) => e.event_type === "purchase");
    const revenue = purchases.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    return {
      email,
      touchpoints,
      converted: purchases.length > 0,
      revenue,
    };
  });
}

/**
 * Apply attribution model and return aggregated results by source
 */
export function applyAttribution(
  journeys: BuyerJourney[],
  model: AttributionModel,
  groupBy: "source" | "campaign" = "source"
): AttributionResult[] {
  const credits = new Map<string, { credit: number; revenue: number; conversions: number }>();

  const convertedJourneys = journeys.filter(j => j.converted && j.touchpoints.length > 0);

  convertedJourneys.forEach(journey => {
    const tps = journey.touchpoints;
    if (tps.length === 0) return;

    const weights = calculateWeights(tps, model);

    weights.forEach((weight, i) => {
      const key = groupBy === "source" ? tps[i].source : tps[i].campaign;
      const existing = credits.get(key) || { credit: 0, revenue: 0, conversions: 0 };
      existing.credit += weight;
      existing.revenue += journey.revenue * weight;
      existing.conversions += weight;
      credits.set(key, existing);
    });
  });

  return Array.from(credits.entries())
    .map(([key, data]) => ({
      source: key,
      campaign: key,
      ...data,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function calculateWeights(touchpoints: Touchpoint[], model: AttributionModel): number[] {
  const n = touchpoints.length;

  switch (model) {
    case "first_click": {
      const w = new Array(n).fill(0);
      w[0] = 1;
      return w;
    }
    case "last_click": {
      const w = new Array(n).fill(0);
      w[n - 1] = 1;
      return w;
    }
    case "linear": {
      return new Array(n).fill(1 / n);
    }
    case "time_decay": {
      // Half-life of 7 days — touchpoints closer to conversion get more weight
      const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      const lastDate = new Date(touchpoints[n - 1].eventDate).getTime();
      const raw = touchpoints.map(tp => {
        const diff = lastDate - new Date(tp.eventDate).getTime();
        return Math.pow(0.5, diff / halfLife);
      });
      const total = raw.reduce((s, v) => s + v, 0);
      return total > 0 ? raw.map(v => v / total) : new Array(n).fill(1 / n);
    }
    default:
      return new Array(n).fill(1 / n);
  }
}

/**
 * Compare all models side-by-side for a given set of journeys
 */
export function compareModels(
  journeys: BuyerJourney[],
  groupBy: "source" | "campaign" = "source"
): Record<AttributionModel, AttributionResult[]> {
  const models: AttributionModel[] = ["first_click", "last_click", "linear", "time_decay"];
  const result: Record<string, AttributionResult[]> = {};
  models.forEach(model => {
    result[model] = applyAttribution(journeys, model, groupBy);
  });
  return result as Record<AttributionModel, AttributionResult[]>;
}
