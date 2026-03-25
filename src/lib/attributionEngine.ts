import { GroupBy } from "@/hooks/useChannelROIData";

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

export interface AttributionResult {
  channel: string;
  revenue: number;
  revenuePercent: number;
  sales: number;
  salesPercent: number;
  clients: number;
}

interface TouchPoint {
  channel: string;
  date: Date;
}

const TIME_DECAY_HALF_LIFE_DAYS = 7;

function getTimeDecayWeight(touchDate: Date, conversionDate: Date): number {
  const diffMs = conversionDate.getTime() - touchDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, diffDays / TIME_DECAY_HALF_LIFE_DAYS);
}

/**
 * Given raw sales and lead events, compute attribution for each model.
 * Returns a map of model -> channel results.
 */
export function computeMultiModelAttribution(
  salesData: any[],
  leadEvents: any[],
  groupBy: GroupBy,
  dateFrom: string,
  dateTo: string,
  productFilter: string,
): Record<AttributionModel, AttributionResult[]> {
  if (!salesData || salesData.length === 0) {
    return { first_touch: [], last_touch: [], linear: [], time_decay: [] };
  }

  const getField = (record: any): string => {
    const val = record[groupBy] || "";
    return val.trim() || "direto";
  };

  // Apply filters
  let filtered = salesData;
  if (dateFrom) filtered = filtered.filter((s) => s.sale_date && s.sale_date >= dateFrom);
  if (dateTo) filtered = filtered.filter((s) => s.sale_date && s.sale_date <= dateTo + "T23:59:59");
  if (productFilter !== "all") filtered = filtered.filter((s) => s.product_name === productFilter);

  // Build touchpoints per buyer from lead_events + sales
  const buyerTouchpoints = new Map<string, TouchPoint[]>();
  const buyerSales = new Map<string, any[]>();

  // Add lead events as touchpoints
  if (leadEvents) {
    leadEvents.forEach((le) => {
      if (!le.buyer_email) return;
      const email = le.buyer_email.toLowerCase().trim();
      const channel = getField(le);
      if (channel === "direto") return; // skip empty touchpoints from leads
      if (!buyerTouchpoints.has(email)) buyerTouchpoints.set(email, []);
      buyerTouchpoints.get(email)!.push({
        channel,
        date: new Date(le.event_date),
      });
    });
  }

  // Add each sale's own channel as a touchpoint (from ALL sales, not just filtered)
  salesData.forEach((s: any) => {
    if (!s.buyer_email) return;
    const email = s.buyer_email.toLowerCase().trim();
    const channel = getField(s);
    if (!buyerTouchpoints.has(email)) buyerTouchpoints.set(email, []);
    buyerTouchpoints.get(email)!.push({
      channel,
      date: new Date(s.sale_date),
    });
  });

  filtered.forEach((s) => {
    if (!s.buyer_email) return;
    const email = s.buyer_email.toLowerCase().trim();
    if (!buyerSales.has(email)) buyerSales.set(email, []);
    buyerSales.get(email)!.push(s);
  });

  // Sort touchpoints by date
  buyerTouchpoints.forEach((tps) => tps.sort((a, b) => a.date.getTime() - b.date.getTime()));

  // Compute per-model attribution
  const models: AttributionModel[] = ["first_touch", "last_touch", "linear", "time_decay"];
  const result: Record<AttributionModel, Map<string, { revenue: number; sales: number; clients: Set<string> }>> = {
    first_touch: new Map(),
    last_touch: new Map(),
    linear: new Map(),
    time_decay: new Map(),
  };

  const ensureChannel = (model: AttributionModel, channel: string) => {
    if (!result[model].has(channel)) {
      result[model].set(channel, { revenue: 0, sales: 0, clients: new Set() });
    }
    return result[model].get(channel)!;
  };

  buyerSales.forEach((sales, email) => {
    const touchpoints = buyerTouchpoints.get(email) || [];
    const uniqueTouchChannels = [...new Set(touchpoints.map((t) => t.channel))];

    sales.forEach((sale: any) => {
      const amount = Number(sale.amount || 0);
      const saleDate = new Date(sale.sale_date);

      // Get touchpoints before or at this sale
      const priorTouches = touchpoints.filter((t) => t.date.getTime() <= saleDate.getTime());
      const effectiveTouches = priorTouches.length > 0 ? priorTouches : [{ channel: "direto", date: saleDate }];

      // First touch
      const firstChannel = effectiveTouches[0].channel;
      const ft = ensureChannel("first_touch", firstChannel);
      ft.revenue += amount;
      ft.sales += 1;
      ft.clients.add(email);

      // Last touch
      const lastChannel = effectiveTouches[effectiveTouches.length - 1].channel;
      const lt = ensureChannel("last_touch", lastChannel);
      lt.revenue += amount;
      lt.sales += 1;
      lt.clients.add(email);

      // Linear
      const uniqueLinear = [...new Set(effectiveTouches.map((t) => t.channel))];
      const share = 1 / uniqueLinear.length;
      uniqueLinear.forEach((ch) => {
        const lin = ensureChannel("linear", ch);
        lin.revenue += amount * share;
        lin.sales += share;
        lin.clients.add(email);
      });

      // Time decay
      const weights = effectiveTouches.map((t) => ({
        channel: t.channel,
        weight: getTimeDecayWeight(t.date, saleDate),
      }));
      const totalWeight = weights.reduce((s, w) => s + w.weight, 0) || 1;
      // Aggregate weights per channel
      const channelWeights = new Map<string, number>();
      weights.forEach((w) => {
        channelWeights.set(w.channel, (channelWeights.get(w.channel) || 0) + w.weight);
      });
      channelWeights.forEach((w, ch) => {
        const td = ensureChannel("time_decay", ch);
        const frac = w / totalWeight;
        td.revenue += amount * frac;
        td.sales += frac;
        td.clients.add(email);
      });
    });
  });

  // Convert to arrays
  const output: Record<AttributionModel, AttributionResult[]> = {} as any;
  models.forEach((model) => {
    const map = result[model];
    const totalRevenue = Array.from(map.values()).reduce((s, v) => s + v.revenue, 0);
    const totalSales = Array.from(map.values()).reduce((s, v) => s + v.sales, 0);

    output[model] = Array.from(map.entries())
      .map(([channel, data]) => ({
        channel,
        revenue: data.revenue,
        revenuePercent: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        sales: Math.round(data.sales),
        salesPercent: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
        clients: data.clients.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  });

  return output;
}

export const MODEL_LABELS: Record<AttributionModel, string> = {
  first_touch: "First-touch",
  last_touch: "Last-click",
  linear: "Linear",
  time_decay: "Time-decay",
};

export const MODEL_DESCRIPTIONS: Record<AttributionModel, string> = {
  first_touch: "100% do crédito para o primeiro ponto de contato do cliente",
  last_touch: "100% do crédito para o último ponto de contato antes da conversão",
  linear: "Crédito dividido igualmente entre todos os pontos de contato",
  time_decay: "Mais crédito para canais próximos da conversão (meia-vida de 7 dias)",
};
