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
  "hsl(220, 90%, 56%)", "hsl(265, 80%, 60%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(300, 60%, 50%)", "hsl(30, 80%, 55%)",
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

export function BuyerDemographicProfile({ sales, adDemographics }: BuyerDemographicProfileProps) {
  const approvedSales = useMemo(() => sales.filter(s => s.status === "approved"), [sales]);
  const totalSales = approvedSales.length;
  const totalRevenue = useMemo(() =>
    approvedSales.reduce((s, e) => s + Number(e.amount || 0) + Number(e.coproducer_commission || 0), 0),
    [approvedSales]
  );

  // ── Location from actual sales ──
  const locationData = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    approvedSales.forEach(s => {
      const state = s.buyer_state || (s.payload as any)?.estado || "";
      if (!state) return;
      const rev = Number(s.amount || 0) + Number(s.coproducer_commission || 0);
      const existing = map.get(state) || { count: 0, revenue: 0 };
      map.set(state, { count: existing.count + 1, revenue: existing.revenue + rev });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d, pct: totalSales > 0 ? (d.count / totalSales) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [approvedSales, totalSales]);

  // ── City from actual sales ──
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

  // ── Payment method from actual sales ──
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
      .map(([name, d]) => ({ name, ...d, pct: totalSales > 0 ? (d.count / totalSales) * 100 : 0 }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [approvedSales, totalSales]);

  // ── Temporal: day of week & hour from actual sales ──
  const temporalData = useMemo(() => {
    const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const byDay = Array.from({ length: 7 }, (_, i) => ({ name: DAY_NAMES[i], vendas: 0, revenue: 0 }));
    const byHour = Array.from({ length: 24 }, (_, i) => ({ name: `${String(i).padStart(2, "0")}h`, vendas: 0, revenue: 0 }));

    approvedSales.forEach(s => {
      const d = new Date(s.sale_date || s.created_at || "");
      if (isNaN(d.getTime())) return;
      const rev = Number(s.amount || 0) + Number(s.coproducer_commission || 0);
      byDay[d.getDay()].vendas++;
      byDay[d.getDay()].revenue += rev;
      byHour[d.getHours()].vendas++;
      byHour[d.getHours()].revenue += rev;
    });

    const bestDay = byDay.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, byDay[0]);
    const bestHour = byHour.reduce((best, cur) => cur.vendas > best.vendas ? cur : best, byHour[0]);

    return { byDay, byHour, bestDay, bestHour };
  }, [approvedSales]);

  // ── Ad demographics (separate — these are ad platform numbers, NOT sales) ──
  const adAgeData = useMemo(() => {
    const demos = adDemographics.filter(d => d.breakdown_type === "age_gender");
    if (demos.length === 0) return [];
    const totalSpend = demos.reduce((s, d) => s + Number(d.spend), 0);
    if (totalSpend === 0) return [];

    const map = new Map<string, { spend: number; clicks: number; purchases: number }>();
    demos.forEach(d => {
      const age = d.dimension_1;
      const agg = map.get(age) || { spend: 0, clicks: 0, purchases: 0 };
      agg.spend += Number(d.spend);
      agg.clicks += d.clicks;
      agg.purchases += d.purchases;
      map.set(age, agg);
    });

    const ageOrder = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        gasto: v.spend,
        cliques: v.clicks,
        comprasAds: v.purchases,
        pct: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0,
        cpa: v.purchases > 0 ? v.spend / v.purchases : 0,
      }))
      .sort((a, b) => ageOrder.indexOf(a.name) - ageOrder.indexOf(b.name));
  }, [adDemographics]);

  const adGenderData = useMemo(() => {
    const demos = adDemographics.filter(d => d.breakdown_type === "age_gender");
    if (demos.length === 0) return [];
    const totalSpend = demos.reduce((s, d) => s + Number(d.spend), 0);
    if (totalSpend === 0) return [];

    const map = new Map<string, { spend: number; purchases: number }>();
    demos.forEach(d => {
      const gender = d.dimension_2;
      if (!gender) return;
      const agg = map.get(gender) || { spend: 0, purchases: 0 };
      agg.spend += Number(d.spend);
      agg.purchases += d.purchases;
      map.set(gender, agg);
    });

    return Array.from(map.entries()).map(([g, v]) => ({
      name: g === "male" ? "Masculino" : g === "female" ? "Feminino" : g === "unknown" ? "Desconhecido" : g,
      value: v.spend,
      comprasAds: v.purchases,
      pct: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0,
    }));
  }, [adDemographics]);

  const adDeviceData = useMemo(() => {
    const demos = adDemographics.filter(d => d.breakdown_type === "device");
    if (demos.length === 0) return [];
    const totalPixelPurchases = demos.reduce((s, d) => s + (d.purchases || 0), 0);
    if (totalPixelPurchases === 0) return [];

    const merged = new Map<string, number>();
    demos.forEach(d => {
      const name = d.dimension_1 === "mobile_app" || d.dimension_1 === "mobile_web" || d.dimension_1 === "mobile" ? "Mobile"
        : d.dimension_1 === "desktop" ? "Desktop"
        : d.dimension_1 === "tablet" ? "Tablet"
        : d.dimension_1;
      merged.set(name, (merged.get(name) || 0) + (d.purchases || 0));
    });

    // Apply pixel proportions to actual approved sales count
    return Array.from(merged.entries())
      .filter(([, pixelCount]) => pixelCount > 0)
      .map(([name, pixelCount]) => {
        const ratio = pixelCount / totalPixelPurchases;
        const estimatedSales = Math.round(ratio * totalSales);
        return {
          name,
          value: estimatedSales,
          pct: ratio * 100,
        };
      })
      .filter(d => d.value > 0);
  }, [adDemographics, totalSales]);

  const hasAdDemos = adAgeData.length > 0 || adDeviceData.length > 0;
  const hasDirectDemos = locationData.length > 0 || cityData.length > 0;

  if (totalSales === 0) {
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
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <AnimatedCard index={0}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Vendas Aprovadas</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{totalSales}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={1}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Receita Total</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-success">{formatBRL(totalRevenue)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={2}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Estados</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{locationData.length}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard index={3}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Ticket Médio</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatBRL(totalSales > 0 ? totalRevenue / totalSales : 0)}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* ═══ DIRECT BUYER DATA (from actual sales) ═══ */}

      {/* Location */}
      {hasDirectDemos && (
        <>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Localização dos Compradores
          </h4>
          <p className="text-xs text-muted-foreground -mt-4">
            Dados reais de {totalSales} vendas aprovadas (Kiwify/Hotmart)
          </p>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {locationData.length > 0 && (
              <AnimatedCard index={0}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Mapa por Estado</CardTitle>
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

            {locationData.length > 0 && (
              <AnimatedCard index={1}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top Estados</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {locationData[0]?.name} lidera com {locationData[0]?.count} vendas ({formatPercent(locationData[0]?.pct || 0)})
                    </p>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={40} />
                        <Tooltip cursor={false}
                          formatter={(v: number, name: string) => name === "Receita" ? formatBRL(v) : formatNumber(v)} />
                        <Legend />
                        <Bar dataKey="count" name="Vendas" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                        <Bar dataKey="revenue" name="Receita" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}
          </div>

          {cityData.length > 0 && (
            <AnimatedCard index={2}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top Cidades</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Cidade</TableHead>
                        <TableHead className="text-[10px] text-right">Vendas</TableHead>
                        <TableHead className="text-[10px] text-right">Faturamento</TableHead>
                        <TableHead className="text-[10px] text-right">% Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cityData.map(d => (
                        <TableRow key={d.name}>
                          <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                          <TableCell className="text-[10px] text-right">{d.count}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.revenue)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatPercent(totalSales > 0 ? (d.count / totalSales) * 100 : 0)}</TableCell>
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

      {/* Temporal */}
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Quando os Compradores Compram
      </h4>
      <p className="text-xs text-muted-foreground -mt-4">
        Padrões temporais de {totalSales} vendas aprovadas
      </p>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <AnimatedCard index={3}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vendas por Dia da Semana</CardTitle>
              <p className="text-xs text-muted-foreground">
                Melhor dia: <span className="font-semibold text-foreground">{temporalData.bestDay.name}</span> ({temporalData.bestDay.vendas} vendas)
              </p>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={temporalData.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                  <Tooltip cursor={false}
                    formatter={(v: number, name: string) => name === "Receita" ? formatBRL(v) : formatNumber(v)} />
                  <Legend />
                  <Bar dataKey="vendas" name="Vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Receita" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard index={4}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vendas por Horário</CardTitle>
              <p className="text-xs text-muted-foreground">
                Melhor horário: <span className="font-semibold text-foreground">{temporalData.bestHour.name}</span> ({temporalData.bestHour.vendas} vendas)
              </p>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={temporalData.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={8} interval={2} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                  <Tooltip cursor={false}
                    formatter={(v: number, name: string) => name === "Receita" ? formatBRL(v) : formatNumber(v)} />
                  <Legend />
                  <Bar dataKey="vendas" name="Vendas" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Receita" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Payment method */}
      {paymentData.length > 0 && (
        <>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Método de Pagamento
          </h4>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <AnimatedCard index={5}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição por Método</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {paymentData[0]?.name} lidera com {paymentData[0]?.count} vendas ({formatPercent(paymentData[0]?.pct || 0)})
                  </p>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={2}
                        dataKey="count" nameKey="name"
                        label={({ name, pct }) => `${name} ${pct.toFixed(0)}%`}
                      >
                        {paymentData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip cursor={false}
                        formatter={(v: number, name: string) => [formatNumber(v), "Vendas"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard index={6}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Receita por Método</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10}
                        tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip cursor={false}
                        formatter={(v: number, name: string) => name === "Receita" ? formatBRL(v) : formatNumber(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Receita" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="count" name="Vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </>
      )}

      {/* ═══ AD DEMOGRAPHICS (from Meta/Google — clearly labeled) ═══ */}
      {hasAdDemos && (
        <>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Público dos Anúncios — Meta / Google Ads
          </h4>
          <p className="text-xs text-muted-foreground -mt-4">
            Dados demográficos do público atingido pelos anúncios (não representam vendas diretas)
          </p>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Age */}
            {adAgeData.length > 0 && (
              <AnimatedCard index={7}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Investimento por Faixa Etária</CardTitle>
                    <p className="text-xs text-muted-foreground">Onde o orçamento de ads é distribuído</p>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adAgeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10}
                          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip cursor={false}
                          formatter={(v: number, name: string) => name === "Gasto" ? formatBRL(v) : formatNumber(v)} />
                        <Legend />
                        <Bar dataKey="gasto" name="Gasto" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Gender */}
            {adGenderData.length > 0 && (
              <AnimatedCard index={8}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Gênero do Público</CardTitle>
                    <p className="text-xs text-muted-foreground">Distribuição de investimento por gênero</p>
                  </CardHeader>
                  <CardContent className="h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={adGenderData}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85}
                          paddingAngle={2}
                          dataKey="value" nameKey="name"
                          label={({ name, pct }) => `${name} ${pct.toFixed(1)}%`}
                        >
                          {adGenderData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip cursor={false}
                          formatter={(v: number) => formatBRL(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}
          </div>

          {/* Age detail table */}
          {adAgeData.length > 0 && (
            <AnimatedCard index={9}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detalhamento por Faixa Etária</CardTitle>
                  <p className="text-xs text-muted-foreground">Performance dos anúncios segmentada por idade</p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Faixa Etária</TableHead>
                        <TableHead className="text-[10px] text-right">Gasto (Ads)</TableHead>
                        <TableHead className="text-[10px] text-right">Cliques</TableHead>
                        <TableHead className="text-[10px] text-right">Compras (Pixel)</TableHead>
                        <TableHead className="text-[10px] text-right">CPA</TableHead>
                        <TableHead className="text-[10px] text-right">% Gasto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adAgeData.map(d => (
                        <TableRow key={d.name}>
                          <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatBRL(d.gasto)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.cliques)}</TableCell>
                          <TableCell className="text-[10px] text-right">{formatNumber(d.comprasAds)}</TableCell>
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

           {/* Device */}
           {adDeviceData.length > 0 && (
             <AnimatedCard index={10}>
               <Card>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-base">Vendas por Dispositivo</CardTitle>
                   <p className="text-xs text-muted-foreground">Compras detectadas pelo pixel, por tipo de dispositivo</p>
                 </CardHeader>
                 <CardContent className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={adDeviceData}
                         cx="50%" cy="50%"
                         innerRadius={55} outerRadius={85}
                         paddingAngle={2}
                         dataKey="value" nameKey="name"
                         label={({ name, pct }) => `${name} ${pct.toFixed(1)}%`}
                       >
                         {adDeviceData.map((_, i) => (
                           <Cell key={i} fill={COLORS[i % COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip cursor={false}
                         formatter={(v: number, name: string) => [formatNumber(v), "Compras"]} />
                       <Legend />
                     </PieChart>
                   </ResponsiveContainer>
                 </CardContent>
               </Card>
             </AnimatedCard>
           )}
        </>
      )}

      {!hasAdDemos && (
        <Card className="border-dashed">
          <CardContent className="flex h-24 items-center justify-center text-muted-foreground text-sm">
            Dados de idade, gênero e dispositivo ficarão disponíveis após sincronização com Meta/Google Ads.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
