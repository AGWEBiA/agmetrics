import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, GripVertical, RotateCcw, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { projectId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Projeto #{projectId} · Última atualização: agora
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <GripVertical className="mr-2 h-4 w-4" />
            Reordenar
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetar
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" />
            Público
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="acquisition">Captação</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="timeline">Análise Temporal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* ROI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard title="ROI Total" value="--%" subtitle="Retorno sobre investimento" />
            <MetricCard title="ROAS" value="--x" subtitle="Retorno sobre gasto em ads" />
            <MetricCard title="Margem Líquida" value="--%" subtitle="Lucro / Receita bruta" />
          </div>

          {/* Sales Overview */}
          <div className="grid gap-4 md:grid-cols-5">
            <MetricCard title="Vendas Totais" value="R$ --" subtitle="Valor líquido" />
            <MetricCard title="Nº de Vendas" value="--" subtitle="Aprovadas" />
            <MetricCard title="Ticket Médio" value="R$ --" subtitle="Valor médio por venda" />
            <MetricCard title="Conversão" value="--%" subtitle="Leads → Vendas" />
            <MetricCard title="Pendentes" value="--" subtitle="Aguardando aprovação" />
          </div>

          {/* Platform breakdown placeholder */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meta Ads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {["Investimento", "Resultados", "CPR", "CTR", "CPC", "Impressões"].map((m) => (
                    <div key={m} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{m}</p>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Google Ads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {["Investimento", "Cliques", "CTR", "CPC", "Conversões", "CPA"].map((m) => (
                    <div key={m} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{m}</p>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="acquisition" className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Total de Leads" value="--" subtitle="Meta + Google" />
            <MetricCard title="CPL Médio" value="R$ --" subtitle="Custo por lead" />
            <MetricCard title="Conversão L→V" value="--%" subtitle="Lead para venda" />
            <MetricCard title="Investimento" value="R$ --" subtitle="Total em captação" />
          </div>
        </TabsContent>

        <TabsContent value="sales" className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Receita Bruta" value="R$ --" subtitle="Total bruto" />
            <MetricCard title="Receita Líquida" value="R$ --" subtitle="Após taxas" />
            <MetricCard title="Taxas Totais" value="R$ --" subtitle="Kiwify + Hotmart" />
            <MetricCard title="Margem" value="--%" subtitle="Margem líquida" />
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Temporal</CardTitle>
            </CardHeader>
            <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
              Gráficos serão adicionados na Fase 4
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
