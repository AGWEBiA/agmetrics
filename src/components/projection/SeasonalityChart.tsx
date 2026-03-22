import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Calendar } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface SeasonalityPattern {
  dayOfWeek: string;
  avgSales: number;
  avgRevenue: number;
  index: number;
}

export function SeasonalityChart({ data }: { data: SeasonalityPattern[] }) {
  if (!data.length || data.every(d => d.avgSales === 0)) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Sazonalidade por Dia da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-8">Dados insuficientes para análise de sazonalidade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Sazonalidade por Dia da Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="dayOfWeek" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number, name: string) => name === "Receita" ? fmt(v) : v}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: "Média", fontSize: 9 }} />
              <Bar dataKey="index" name="Índice" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-7 gap-1 mt-3">
          {data.map(d => (
            <div key={d.dayOfWeek} className="text-center">
              <p className="text-[10px] text-muted-foreground">{d.dayOfWeek.slice(0, 3)}</p>
              <p className="text-[10px] font-semibold">{d.avgSales} vendas</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
