import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/AnimatedCard";
import { formatBRL, formatPercent, formatNumber } from "@/lib/formatters";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BrazilStateMap } from "./BrazilStateMap";

const COLORS = [
  "hsl(265, 80%, 60%)", "hsl(220, 90%, 56%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(290, 70%, 50%)", "hsl(30, 80%, 55%)",
];

interface Sale {
  amount?: number;
  gross_amount?: number;
  coproducer_commission?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  tracking_src?: string;
  tracking_sck?: string;
  buyer_state?: string;
  buyer_city?: string;
  buyer_country?: string;
  payment_method?: string;
  product_name?: string;
  status?: string;
  sale_date?: string;
  created_at?: string;
  payload?: Record<string, any>;
}

interface AdDemographic {
  platform: string;
  breakdown_type: string;
  dimension_1: string;
  dimension_2: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  purchases: number;
}

interface BuyerDemographicProfileProps {
  sales: Sale[];
  adDemographics: AdDemographic[];
}

function extractUtm(sale: Sale, field: string): string {
  const directValue = (sale as any)[field];
  if (directValue) return directValue;
  const p = sale.payload || {};
  switch (field) {
    case "utm_source": return p["tracking utm_source"] || p["utm_source"] || "";
    case "utm_medium": return p["tracking utm_medium"] || p["utm_medium"] || "";
    case "utm_campaign": return p["tracking utm_campaign"] || p["utm_campaign"] || "";
    case "utm_content": return p["tracking utm_content"] || p["utm_content"] || "";
    case "tracking_src": return p["tracking src"] || p["src"] || "";
    default: return "";
  }
}

export function BuyerDemographicProfile({ sales, adDemographics }: BuyerDemographicProfileProps) {
  const approvedSales = useMemo(() => sales.filter(s => s.status === "approved"), [sales]);

  // 1. Direct buyer demographics: location from sales
  const locationData = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    approvedSales.forEach(s => {
      const state = s.buyer_state || (s.payload as any)?.estado || "";
      if (!state) return;
      const rev = Number(s.amount || 0) + Number(s.coproducer_commission || 0);
      const existing = map.get(state) || { count: 0, revenue: 0 };
      map.set(state, { count: existing.count + 1, revenue: existing.revenue + rev });
    });
    const total = approvedSales.length;
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d, pct: total > 0 ? (d.count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [approvedSales]);

  // 2. City breakdown
  const cityData = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    approvedSales.forEach(s => {
      const city = s.buyer_city || "";
      if (!city) return;
      const rev = Number(s.amount || 0) + Number(s.coproducer_commission || 0);
      const existing = map.get(city) || { count: 0, revenue: 0 };
      map.set(city, { count: existing.count + 1, revenue: existing.revenue + rev });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [approvedSales]);

  // 3. Inferred demographics: cross-reference tracked sales with ad demographics
  // Weight ad demographic data by number of sales from that source
  const inferredAgeGender = useMemo(() => {
    const ageGenderDemos = adDemographics.filter(d => d.breakdown_type === "age_gender");
    if (ageGenderDemos.length === 0) return { ageData: [], genderData: [] };

    // Get total spend to weight demographics
    const totalSpend = ageGenderDemos.reduce((s, d) => s + Number(d.spend), 0);
    if (totalSpend === 0) return { ageData: [], genderData: [] };

    // Aggregate by age
    const ageMap = new Map<string, { spend: number; clicks: number; purchases: number; pctSpend: number }>();
    const genderMap = new Map<string, { spend: number; clicks: number; purchases: number }>();

    ageGenderDemos.forEach(d => {
      const age = d.dimension_1;
      const gender = d.dimension_2;
      const spend = Number(d.spend);

      const ageAgg = ageMap.get(age) || { spend: 0, clicks: 0, purchases: 0, pctSpend: 0 };
      ageAgg.spend += spend;
      ageAgg.clicks += d.clicks;
      ageAgg.purchases += d.purchases;
      ageMap.set(age, ageAgg);

      if (gender) {
        const gAgg = genderMap.get(gender) || { spend: 0, clicks: 0, purchases: 0 };
        gAgg.spend += spend;
        gAgg.clicks += d.clicks;
        gAgg.purchases += d.purchases;
        genderMap.set(gender, gAgg);
      }
    });

    const ageOrder = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
    const ageData = Array.from(ageMap.entries())
      .map(([name, v]) => ({
        name,
        gasto: v.spend,
        cliques: v.clicks,
        compras: v.purchases,
        pct: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0,
        cpa: v.purchases > 0 ? v.spend / v.purchases : 0,
      }))
      .sort((a, b) => ageOrder.indexOf(a.name) - ageOrder.indexOf(b.name));

    const genderData = Array.from(genderMap.entries())
      .map(([g, v]) => ({
        name: g === "male" ? "Masculino" : g === "female" ? "Feminino" : g === "unknown" ? "Desconhecido" : g,
        value: v.spend,
        compras: v.purchases,
        pct: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0,
      }));

    return { ageData, genderData };
  }, [adDemographics]);

  // 4. Device demographics from ads
  const deviceData = useMemo(() => {
    const deviceDemos = adDemographics.filter(d => d.breakdown_type === "device");
    if (deviceDemos.length === 0) return [];

    const totalSpend = deviceDemos.reduce((s, d) => s + Number(d.spend), 0);
    const merged = new Map<string, { spend: number; clicks: number; purchases: number }>();
    deviceDemos.forEach(d => {
      const name = d.dimension_1 === "mobile_app" || d.dimension_1 === "mobile_web" || d.dimension_1 === "mobile" ? "Mobile"
        : d.dimension_1 === "desktop" ? "Desktop"
        : d.dimension_1 === "tablet" ? "Tablet"
        : d.dimension_1;
      const existing = merged.get(name) || { spend: 0, clicks: 0, purchases: 0 };
      merged.set(name, {
        spend: existing.spend + Number(d.spend),
        clicks: existing.clicks + d.clicks,
        purchases: existing.purchases + d.purchases,
      });
    });

    return Array.from(merged.entries()).map(([name, v]) => ({
      name,
      value: v.spend,
      compras: v.purchases,
      pct: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0,
    }));
  }, [adDemographics]);

  // 5. Payment method from sales
  const paymentData = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    approvedSales.forEach(s => {
      const payload = s.payload || {};
      const method = (
        (payload as any).pagamento ||
        (payload as any).payment_method ||
        (payload as any).data?.purchase?.payment?.type ||
        (payload as any).purchase?.payment?.type ||
        s.payment_method ||
        ""
      ).toLowerCase();
      let label = "Outros";
      if (method === "pix") label = "PIX";
      else if (["boleto", "billet", "bank_slip", "boleto_bancario"].includes(method)) label = "Boleto";
      else if (method.includes("credit") || method.includes("card") || method.includes("cartao") || method.includes("cartão")) label = "Cartão";
      else if (method) label = "Cartão";

      const rev = Number(s.amount || 0) + Number(s.coproducer_commission || 0);
      const existing = map.get(label) || { count: 0, revenue: 0 };
      map.set(label, { count: existing.count + 1, revenue: existing.revenue + rev });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [approvedSales]);

  // 6. Sales by day of week and hour
  const temporalData = useMemo(() => {
    const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const byDay = Array.from({ length: 7 }, (_, i) => ({ name: DAY_NAMES[i], vendas: 0 }));
    const byHour = Array.from({ length: 24 }, (_, i) => ({ name: `${String(i).padStart(2, "0")}h`, vendas: 0 }));

    approvedSales.forEach(s => {
      const d = new Date(s.sale_date || s.created_at || "");
      if (isNaN(d.getTime())) return;
      byDay[d.getDay()].vendas++;
      byHour[d.getHours()].vendas++;
    });

    const bestDay = byDay.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, byDay[0]);
    const bestHour = byHour.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, byHour[0]);

    return { byDay, byHour, bestDay, bestHour };
  }, [approvedSales]);

  const hasAdDemos = inferredAgeGender.ageData.length > 0 || deviceData.length > 0;
  const hasDirectDemos = locationData.length > 0 || cityData.length > 0;
  const hasSales = approvedSales.length > 0;

  if (!hasSales) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-muted-foreground text-sm">
          Nenhuma venda aprovada para traçar perfil demográfico.
        </CardContent>
      </Card>
    );
  }

  const mapData = locationData.map(d => ({
    name: d.name,
    value: d.count,
    secondaryValue: d.revenue,
    pct: d.pct,
  }));

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          👤 Perfil Demográfico dos Compradores
        </h3>
        <Badge variant="outline" className="text-[10px]">{approvedSales.length} vendas</Badge>
      </div>

      {/* Age & Gender from Ads */}
      {hasAdDemos && (
        <>
          <p className="text-xs text-muted-foreground -mt-3">
            Dados inferidos a partir da performance demográfica dos anúncios (Meta/Google Ads)
          </p>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Age Bar Chart */}
            {inferredAgeGender.ageData.length > 0 && (
              <AnimatedCard index={0}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">📊 Faixa Etária que Mais Converte</CardTitle>
                    <p className="text-xs text-muted-foreground">Gasto e compras por idade nos anúncios</p>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inferredAgeGender.ageData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v: number, name: string) =>
                            name === "Gasto" ? formatBRL(v) :
                            name === "CPA" ? formatBRL(v) :
                            formatNumber(v)
                          }
                        />
                        <Legend />
                        <Bar dataKey="gasto" name="Gasto" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="compras" name="Compras" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Gender Pie */}
            {inferredAgeGender.genderData.length > 0 && (
              <AnimatedCard index={1}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">🧑‍🤝‍🧑 Gênero dos Compradores</CardTitle>
                    <p className="text-xs text-muted-foreground">Distribuição de gasto por gênero nos anúncios</p>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inferredAgeGender.genderData}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80}
                          dataKey="value" nameKey="name"
                          label={({ name, pct }) => `${name} ${pct.toFixed(1)}%`}
                        >
                          {inferredAgeGender.genderData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatBRL(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}
          </div>

          {/* Age detail table */}
          {inferredAgeGender.ageData.length > 0 && (
            <AnimatedCard index={2}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detalhamento por Idade — Conversão em Vendas</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Faixa Etária</TableHead>
                        <TableHead className="text-[10px] text-right">Gasto</TableHead>
                        <TableHead className="text-[10px] text-right">Cliques</TableHead>
                        <TableHead className="text-[10px] text-right">Compras (Ads)</TableHead>
                        <TableHead className="text-[10px] text-right">CPA</TableHead>
                        <TableHead className="text-[10px] text-right">% Gasto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inferredAgeGender.ageData.map(d => (
                        <TableRow key={d.name}>
                          <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.gasto)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.cliques)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.compras)}</TableCell>
                          <TableCell className="text-[10px] text-right">{d.cpa > 0 ? formatBRL(d.cpa) : "—"}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(d.pct)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}

          {/* Device pie */}
          {deviceData.length > 0 && (
            <AnimatedCard index={3}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">📱 Dispositivo dos Compradores</CardTitle>
                  <p className="text-xs text-muted-foreground">De qual dispositivo vêm as conversões</p>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        dataKey="value" nameKey="name"
                        label={({ name, pct }) => `${name} ${pct.toFixed(1)}%`}
                      >
                        {deviceData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatBRL(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}
        </>
      )}

      {/* Direct buyer demographics: Location */}
      {hasDirectDemos && (
        <>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            📍 Localização Real dos Compradores
          </h4>
          <p className="text-xs text-muted-foreground -mt-3">
            Dados reais extraídos das plataformas de venda (Kiwify/Hotmart)
          </p>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Map */}
            {locationData.length > 0 && (
              <AnimatedCard index={4}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Mapa de Compradores por Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BrazilStateMap
                      data={mapData}
                      valueLabel="Compras"
                      secondaryLabel="Faturamento"
                      formatValue={(v) => String(Math.round(v))}
                      formatSecondary={formatBRL}
                      colorScheme="green"
                    />
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Top states bar chart */}
            {locationData.length > 0 && (
              <AnimatedCard index={5}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top Estados</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={50} />
                        <Tooltip formatter={(v: number) => formatNumber(v)} />
                        <Bar dataKey="count" name="Compras" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}
          </div>

          {/* Top cities */}
          {cityData.length > 0 && (
            <AnimatedCard index={6}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🏙️ Top Cidades</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Cidade</TableHead>
                        <TableHead className="text-[10px] text-right">Compras</TableHead>
                        <TableHead className="text-[10px] text-right">Faturamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cityData.map(d => (
                        <TableRow key={d.name}>
                          <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                          <TableCell className="text-[10px] text-right">{d.count}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}
        </>
      )}

      {/* Temporal patterns */}
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        ⏰ Quando os Compradores Compram
      </h4>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <AnimatedCard index={7}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vendas por Dia da Semana</CardTitle>
              <p className="text-xs text-muted-foreground">
                Melhor dia: <span className="font-semibold text-foreground">{temporalData.bestDay.name}</span> ({temporalData.bestDay.vendas} vendas)
              </p>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={temporalData.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="vendas" name="Vendas" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard index={8}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vendas por Horário</CardTitle>
              <p className="text-xs text-muted-foreground">
                Melhor horário: <span className="font-semibold text-foreground">{temporalData.bestHour.name}</span> ({temporalData.bestHour.vendas} vendas)
              </p>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={temporalData.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={8} interval={2} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="vendas" name="Vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Payment method */}
      {paymentData.length > 0 && (
        <AnimatedCard index={9}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">💳 Método de Pagamento Preferido</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    dataKey="count" nameKey="name"
                    label={({ name, count }) => `${name} (${count})`}
                  >
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* No ad demographics notice */}
      {!hasAdDemos && (
        <Card className="border-dashed">
          <CardContent className="flex h-24 items-center justify-center text-muted-foreground text-sm">
            📢 Dados demográficos de idade, gênero e dispositivo ficarão disponíveis após a sincronização com Meta/Google Ads.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
