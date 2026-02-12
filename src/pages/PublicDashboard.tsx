import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function PublicDashboard() {
  const { viewToken } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-4">
          <BarChart3 className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">LaunchMetrics</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Público</h1>
        <p className="text-muted-foreground">Token: {viewToken}</p>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="ROI Total" value="--%" />
          <MetricCard title="ROAS" value="--x" />
          <MetricCard title="Margem Líquida" value="--%" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Vendas Totais" value="R$ --" />
          <MetricCard title="Nº de Vendas" value="--" />
          <MetricCard title="Ticket Médio" value="R$ --" />
          <MetricCard title="Conversão" value="--%" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gráficos e detalhamento</CardTitle>
          </CardHeader>
          <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
            Será implementado na Fase 5
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
