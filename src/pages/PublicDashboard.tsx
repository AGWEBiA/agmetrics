import { useParams } from "react-router-dom";
import { useProjectByToken } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicDashboard() {
  const { viewToken } = useParams();
  const { data: project, isLoading, error } = useProjectByToken(viewToken);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-4">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">LaunchMetrics</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Dashboard não encontrado</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-4">
          <BarChart3 className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">LaunchMetrics</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}

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
            Será implementado nas próximas fases
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
