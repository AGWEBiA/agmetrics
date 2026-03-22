import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateGoalProbability } from "@/lib/advancedProjectionAnalysis";
import type { SimulationOutput } from "@/lib/monteCarloEngine";
import { Target } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function GoalProbabilityPanel({ simulation }: { simulation: SimulationOutput }) {
  const goals = useMemo(() => {
    const realistic = simulation.scenarios.realistic;
    return calculateGoalProbability(simulation, [
      { label: "Lucro Positivo", value: 0, metric: "profit" },
      { label: `Receita > ${fmt(realistic.revenue * 0.8)}`, value: realistic.revenue * 0.8, metric: "revenue" },
      { label: `Receita > ${fmt(realistic.revenue)}`, value: realistic.revenue, metric: "revenue" },
      { label: `Receita > ${fmt(realistic.revenue * 1.5)}`, value: realistic.revenue * 1.5, metric: "revenue" },
      { label: `Vendas > ${Math.round(realistic.sales * 1.2)}`, value: realistic.sales * 1.2, metric: "sales" },
    ]);
  }, [simulation]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Probabilidade de Atingir Metas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((g, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{g.goalLabel}</span>
              <span className={`text-xs font-bold ${g.probability > 50 ? "text-green-500" : g.probability > 25 ? "text-yellow-500" : "text-destructive"}`}>
                {g.probability.toFixed(0)}%
              </span>
            </div>
            <Progress value={g.probability} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
