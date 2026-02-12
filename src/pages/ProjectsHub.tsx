import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BarChart3, Calendar } from "lucide-react";

export default function ProjectsHub() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">Gerencie seus lançamentos digitais</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Empty state */}
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <CardTitle className="mb-2 text-lg">Nenhum projeto ainda</CardTitle>
          <CardDescription className="mb-4">
            Crie seu primeiro projeto para começar a acompanhar as métricas do seu lançamento.
          </CardDescription>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Criar Projeto
          </Button>
        </Card>
      </div>
    </div>
  );
}
