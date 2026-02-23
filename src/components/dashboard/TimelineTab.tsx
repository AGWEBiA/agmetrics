import { AnimatedCard } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/formatters";
import { COLORS, TOOLTIP_STYLE } from "./constants";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface TimelineTabProps {
  salesChartData: any[];
}

export function TimelineTab({ salesChartData }: TimelineTabProps) {
  if (salesChartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          Nenhuma venda registrada ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AnimatedCard index={0}>
        <Card>
          <CardHeader><CardTitle className="text-lg">Evolução de Vendas</CardTitle></CardHeader>
          <CardContent className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip cursor={false} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="vendas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </AnimatedCard>
      <AnimatedCard index={1}>
        <Card>
          <CardHeader><CardTitle className="text-lg">Evolução de Receita</CardTitle></CardHeader>
          <CardContent className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip cursor={false} formatter={(v: number) => formatBRL(v)} contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="receita" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </AnimatedCard>
    </>
  );
}
