import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatPercent, formatNumber } from "@/lib/formatters";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = [
  "hsl(265, 80%, 60%)", "hsl(220, 90%, 56%)", "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)", "hsl(340, 80%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(290, 70%, 50%)", "hsl(30, 80%, 55%)", "hsl(200, 70%, 50%)",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

interface DemographicItem {
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

interface BuyerLocation {
  name: string;
  count: number;
  revenue: number;
  pct: number;
}

interface DemographicsSectionProps {
  platform: "meta" | "google";
  demographics: DemographicItem[];
  buyerLocationData: BuyerLocation[];
  paymentPieData: { name: string; value: number }[];
  productData: { name: string; count: number; revenue: number; pct: number; type: string | null }[];
}

function aggregateByType(demographics: DemographicItem[], type: string) {
  return demographics
    .filter(d => d.breakdown_type === type)
    .sort((a, b) => b.spend - a.spend);
}

function AgeGenderSection({ data }: { data: DemographicItem[] }) {
  // Aggregate by age range
  const ageMap = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number }>();
  const genderMap = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number }>();

  data.forEach(d => {
    const age = d.dimension_1;
    const gender = d.dimension_2;
    
    const ageAgg = ageMap.get(age) || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    ageAgg.spend += Number(d.spend); ageAgg.impressions += d.impressions; ageAgg.clicks += d.clicks; ageAgg.conversions += d.conversions;
    ageMap.set(age, ageAgg);

    if (gender) {
      const gAgg = genderMap.get(gender) || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      gAgg.spend += Number(d.spend); gAgg.impressions += d.impressions; gAgg.clicks += d.clicks; gAgg.conversions += d.conversions;
      genderMap.set(gender, gAgg);
    }
  });

  const ageData = Array.from(ageMap.entries())
    .map(([age, v]) => ({ name: age, gasto: v.spend, impressoes: v.impressions, cliques: v.clicks, conversoes: v.conversions }))
    .sort((a, b) => {
      const order = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  const totalSpend = data.reduce((s, d) => s + Number(d.spend), 0);
  const genderData = Array.from(genderMap.entries())
    .map(([g, v]) => ({ name: g === "male" ? "Masculino" : g === "female" ? "Feminino" : g, value: v.spend, pct: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0 }));

  if (ageData.length === 0) return null;

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Gasto por Faixa Etária</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="gasto" name="Gasto" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {genderData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Gênero</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, pct }) => `${name} ${pct.toFixed(1)}%`}>
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento por Idade</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Faixa Etária</TableHead>
                <TableHead className="text-[10px] text-right">Gasto</TableHead>
                <TableHead className="text-[10px] text-right">Impressões</TableHead>
                <TableHead className="text-[10px] text-right">Cliques</TableHead>
                <TableHead className="text-[10px] text-right">CTR</TableHead>
                <TableHead className="text-[10px] text-right">CPC</TableHead>
                <TableHead className="text-[10px] text-right">% Gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ageData.map(d => (
                <TableRow key={d.name}>
                  <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatBRL(d.gasto)}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatNumber(d.impressoes)}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatNumber(d.cliques)}</TableCell>
                  <TableCell className="text-[10px] text-right">{d.impressoes > 0 ? formatPercent((d.cliques / d.impressoes) * 100) : "—"}</TableCell>
                  <TableCell className="text-[10px] text-right">{d.cliques > 0 ? formatBRL(d.gasto / d.cliques) : "—"}</TableCell>
                  <TableCell className="text-[10px] text-right">{totalSpend > 0 ? formatPercent((d.gasto / totalSpend) * 100) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceSection({ data }: { data: DemographicItem[] }) {
  const totalSpend = data.reduce((s, d) => s + Number(d.spend), 0);
  const chartData = data.map(d => ({
    name: d.dimension_1 === "mobile_app" || d.dimension_1 === "mobile_web" || d.dimension_1 === "mobile" ? "Mobile"
      : d.dimension_1 === "desktop" ? "Desktop"
      : d.dimension_1 === "tablet" ? "Tablet"
      : d.dimension_1,
    gasto: Number(d.spend),
    impressoes: d.impressions,
    cliques: d.clicks,
  }));

  // Merge duplicates (mobile_app + mobile_web = Mobile)
  const merged = new Map<string, { gasto: number; impressoes: number; cliques: number }>();
  chartData.forEach(d => {
    const existing = merged.get(d.name) || { gasto: 0, impressoes: 0, cliques: 0 };
    merged.set(d.name, { gasto: existing.gasto + d.gasto, impressoes: existing.impressoes + d.impressoes, cliques: existing.cliques + d.cliques });
  });
  const pieData = Array.from(merged.entries()).map(([name, v]) => ({
    name, value: v.gasto, pct: totalSpend > 0 ? (v.gasto / totalSpend) * 100 : 0
  }));

  if (pieData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Dispositivo</CardTitle></CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name"
              label={({ name, pct }) => `${name} ${pct.toFixed(1)}%`}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PlacementSection({ data }: { data: DemographicItem[] }) {
  const totalSpend = data.reduce((s, d) => s + Number(d.spend), 0);
  const chartData = data
    .map(d => ({
      name: `${d.dimension_1}${d.dimension_2 ? ` / ${d.dimension_2}` : ""}`,
      gasto: Number(d.spend),
      impressoes: d.impressions,
      cliques: d.clicks,
      pct: totalSpend > 0 ? (Number(d.spend) / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 10);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Performance por Posicionamento</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px]">Posicionamento</TableHead>
              <TableHead className="text-[10px] text-right">Gasto</TableHead>
              <TableHead className="text-[10px] text-right">Impressões</TableHead>
              <TableHead className="text-[10px] text-right">Cliques</TableHead>
              <TableHead className="text-[10px] text-right">CTR</TableHead>
              <TableHead className="text-[10px] text-right">CPC</TableHead>
              <TableHead className="text-[10px] text-right">% Gasto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map(d => (
              <TableRow key={d.name}>
                <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                <TableCell className="text-[10px] text-right">{formatBRL(d.gasto)}</TableCell>
                <TableCell className="text-[10px] text-right">{formatNumber(d.impressoes)}</TableCell>
                <TableCell className="text-[10px] text-right">{formatNumber(d.cliques)}</TableCell>
                <TableCell className="text-[10px] text-right">{d.impressoes > 0 ? formatPercent((d.cliques / d.impressoes) * 100) : "—"}</TableCell>
                <TableCell className="text-[10px] text-right">{d.cliques > 0 ? formatBRL(d.gasto / d.cliques) : "—"}</TableCell>
                <TableCell className="text-[10px] text-right">{formatPercent(d.pct)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LocationSection({ data, title }: { data: DemographicItem[]; title: string }) {
  const totalSpend = data.reduce((s, d) => s + Number(d.spend), 0);
  const chartData = data
    .map(d => ({
      name: d.dimension_1,
      gasto: Number(d.spend),
      impressoes: d.impressions,
      cliques: d.clicks,
      pct: totalSpend > 0 ? (Number(d.spend) / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 15);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={80} />
              <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="gasto" name="Gasto" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Local</TableHead>
                <TableHead className="text-[10px] text-right">Gasto</TableHead>
                <TableHead className="text-[10px] text-right">Impressões</TableHead>
                <TableHead className="text-[10px] text-right">Cliques</TableHead>
                <TableHead className="text-[10px] text-right">% Gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map(d => (
                <TableRow key={d.name}>
                  <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatBRL(d.gasto)}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatNumber(d.impressoes)}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatNumber(d.cliques)}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatPercent(d.pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function BuyerLocationSection({ data }: { data: BuyerLocation[] }) {
  if (data.length === 0) return null;

  const chartData = data.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Localização dos Compradores</CardTitle></CardHeader>
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={50} />
              <Tooltip cursor={false} contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Compras" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Estado</TableHead>
                <TableHead className="text-[10px] text-right">Compras</TableHead>
                <TableHead className="text-[10px] text-right">Faturamento</TableHead>
                <TableHead className="text-[10px] text-right">% Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.name}>
                  <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                  <TableCell className="text-[10px] text-right">{d.count}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatBRL(d.revenue)}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatPercent(d.pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodSection({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Método de Pagamento</CardTitle></CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name"
              label={({ name, value }) => `${name} (${value})`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ProductDistributionSection({ data }: { data: { name: string; count: number; revenue: number; pct: number; type: string | null }[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Produto</CardTitle></CardHeader>
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={false} formatter={(v: number, name: string) => name === "revenue" ? formatBRL(v) : v} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="revenue" name="Faturamento" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Produto</TableHead>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px] text-right">Vendas</TableHead>
                <TableHead className="text-[10px] text-right">Faturamento</TableHead>
                <TableHead className="text-[10px] text-right">% Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.name}>
                  <TableCell className="text-[10px] font-medium">{d.name}</TableCell>
                  <TableCell className="text-[10px]">{d.type === "main" ? "Principal" : "Order Bump"}</TableCell>
                  <TableCell className="text-[10px] text-right">{d.count}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatBRL(d.revenue)}</TableCell>
                  <TableCell className="text-[10px] text-right">{formatPercent(d.pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function DemographicsSection({ platform, demographics, buyerLocationData, paymentPieData, productData }: DemographicsSectionProps) {
  const ageGenderData = useMemo(() => aggregateByType(demographics, "age_gender"), [demographics]);
  const deviceData = useMemo(() => aggregateByType(demographics, "device"), [demographics]);
  const placementData = useMemo(() => aggregateByType(demographics, "placement"), [demographics]);
  const locationData = useMemo(() => aggregateByType(demographics, "location"), [demographics]);

  const hasAdDemos = ageGenderData.length > 0 || deviceData.length > 0 || placementData.length > 0 || locationData.length > 0;
  const hasGatewayDemos = buyerLocationData.length > 0 || paymentPieData.length > 0 || productData.length > 0;

  if (!hasAdDemos && !hasGatewayDemos) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-muted-foreground text-sm">
          Dados demográficos serão exibidos após a próxima sincronização.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ad Platform Demographics */}
      {hasAdDemos && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Dados Demográficos — {platform === "meta" ? "Meta Ads" : "Google Ads"}
          </h3>

          {ageGenderData.length > 0 && <AgeGenderSection data={ageGenderData} />}

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {deviceData.length > 0 && <DeviceSection data={deviceData} />}
            {placementData.length > 0 && <PlacementSection data={placementData} />}
          </div>

          {locationData.length > 0 && (
            <LocationSection data={locationData} title={`Localização do Público — ${platform === "meta" ? "Meta" : "Google"}`} />
          )}
        </>
      )}

      {/* Gateway Demographics */}
      {hasGatewayDemos && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Dados Demográficos — Gateways
          </h3>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <PaymentMethodSection data={paymentPieData} />
            <BuyerLocationSection data={buyerLocationData} />
          </div>

          {productData.length > 0 && <ProductDistributionSection data={productData} />}
        </>
      )}
    </div>
  );
}
