import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useState, useMemo } from "react";
import { generateCashFlowProjection, type CashFlowPoint } from "@/lib/advancedProjectionAnalysis";
import type { SimulationParams } from "@/lib/monteCarloEngine";
import { Wallet } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CashFlowChart({ params }: { params: SimulationParams }) {
  const [scenario, setScenario] = useState<"pessimistic" | "realistic" | "optimistic">("realistic");

  const data = useMemo(() => generateCashFlowProjection(params, scenario), [params, scenario]);
  const breakEvenDay = data.find(d => d.isBreakEven)?.day;

  // Sample points for readability
  const sampled = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 60)) === 0 || i === data.length - 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Fluxo de Caixa Projetado
          </CardTitle>
          <Select value={scenario} onValueChange={v => setScenario(v as any)}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pessimistic">Pessimista</SelectItem>
              <SelectItem value="realistic">Realista</SelectItem>
              <SelectItem value="optimistic">Otimista</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {breakEvenDay && (
          <p className="text-xs text-muted-foreground mt-1">
            Break-even estimado: <strong className="text-green-500">Dia {breakEvenDay}</strong>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sampled}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="revenueAccum" name="Receita Acum." fill="hsl(var(--primary))" fillOpacity={0.15} stroke="hsl(var(--primary))" />
              <Area type="monotone" dataKey="costAccum" name="Custo Acum." fill="hsl(var(--destructive))" fillOpacity={0.1} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="profit" name="Lucro" fill="hsl(142 71% 45%)" fillOpacity={0.1} stroke="hsl(142 71% 45%)" />
              {breakEvenDay && <ReferenceLine x={`Dia ${breakEvenDay}`} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" label={{ value: "Break-even", fontSize: 10 }} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
