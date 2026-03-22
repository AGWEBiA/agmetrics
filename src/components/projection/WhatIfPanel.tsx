import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runWhatIfAnalysis } from "@/lib/advancedProjectionAnalysis";
import type { SimulationParams, SimulationOutput } from "@/lib/monteCarloEngine";
import { FlaskConical, ArrowUp, ArrowDown } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function WhatIfPanel({ params, simulation }: { params: SimulationParams; simulation: SimulationOutput }) {
  const results = useMemo(() => runWhatIfAnalysis(params, simulation), [params, simulation]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          Análise What-If — Cenários Estratégicos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{r.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  Receita: {fmt(r.originalRevenue)} → {fmt(r.newRevenue)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={r.revenueImpact >= 0 ? "default" : "destructive"} className="text-[10px] px-1.5">
                  {r.revenueImpact >= 0 ? <ArrowUp className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDown className="h-2.5 w-2.5 mr-0.5" />}
                  {Math.abs(r.revenueImpact).toFixed(1)}%
                </Badge>
                <Badge variant={r.profitImpact >= 0 ? "outline" : "destructive"} className="text-[10px] px-1.5">
                  {r.profitImpact >= 0 ? "+" : ""}{r.profitImpact.toFixed(1)}% lucro
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
