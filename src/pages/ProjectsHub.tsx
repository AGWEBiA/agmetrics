import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ProjectStrategy } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, BarChart3, Calendar, Trash2, ExternalLink, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsHub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState<ProjectStrategy>("perpetuo");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cartOpenDate, setCartOpenDate] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        strategy,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        cart_open_date: cartOpenDate || undefined,
      });
      toast({ title: "Projeto criado!", description: `"${project.name}" foi criado com sucesso.` });
      setOpen(false);
      setName("");
      setDescription("");
      setStrategy("perpetuo");
      setStartDate("");
      setEndDate("");
      setCartOpenDate("");
      navigate(`/admin/projects/${project.id}/config`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    try {
      await deleteProject.mutateAsync(id);
      toast({ title: "Projeto deletado", description: `"${projectName}" foi removido.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">Gerencie seus lançamentos digitais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Projeto</DialogTitle>
              <DialogDescription>
                Preencha as informações do seu projeto digital.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="project-name">Nome do Projeto *</Label>
                <Input
                  id="project-name"
                  placeholder="Ex: Pack de IA - Contabilidade Médica"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">Descrição</Label>
                <Textarea
                  id="project-desc"
                  placeholder="Descrição opcional do projeto"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Estratégia</Label>
                  <span className="text-xs text-muted-foreground" title="Define como as métricas de conversão são calculadas">ⓘ</span>
                </div>
                <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as ProjectStrategy)} className="space-y-3">
                  <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="perpetuo" id="strat-perpetuo" className="mt-0.5" />
                    <div>
                      <Label htmlFor="strat-perpetuo" className="cursor-pointer font-semibold">Perpétuo</Label>
                      <p className="text-sm text-muted-foreground">Ideal para produtos evergreen com vendas contínuas. Taxa de conversão = vendas / visitas.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="lancamento" id="strat-lancamento" className="mt-0.5" />
                    <div>
                      <Label htmlFor="strat-lancamento" className="cursor-pointer font-semibold">Lançamento</Label>
                      <p className="text-sm text-muted-foreground">Para lançamentos com período definido e captação de leads. Taxa de conversão = vendas / leads.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="lancamento_pago" id="strat-lancamento-pago" className="mt-0.5" />
                    <div>
                      <Label htmlFor="strat-lancamento-pago" className="cursor-pointer font-semibold">Lançamento Pago</Label>
                      <p className="text-sm text-muted-foreground">Lançamento com investimento intensivo em tráfego pago. Taxa de conversão = vendas / leads.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <RadioGroupItem value="funis" id="strat-funis" className="mt-0.5" />
                    <div>
                      <Label htmlFor="strat-funis" className="cursor-pointer font-semibold">Funis (Webinar/WhatsApp/Chatbot)</Label>
                      <p className="text-sm text-muted-foreground">Para vendas via funis automatizados ou semi-automatizados. Taxa de conversão = vendas / leads.</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {(strategy === "lancamento" || strategy === "lancamento_pago") && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Início</Label>
                    <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Término</Label>
                    <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cart-date">Abertura Carrinho</Label>
                    <Input id="cart-date" type="date" value={cartOpenDate} onChange={(e) => setCartOpenDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || createProject.isPending}>
                {createProject.isPending ? "Criando..." : "Criar Projeto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group relative transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.strategy && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {project.strategy === "lancamento_pago" ? "Lanç. Pago" : project.strategy === "lancamento" ? "Lançamento" : project.strategy === "funis" ? "Funis" : "Perpétuo"}
                    </Badge>
                  )}
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {project.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.start_date)}
                      {project.end_date && ` — ${formatDate(project.end_date)}`}
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate(`/admin/projects/${project.id}/dashboard`)}
                >
                  <BarChart3 className="mr-1 h-3 w-3" />
                  Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/projects/${project.id}/config`)}
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Config
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`/view/${project.view_token}`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar projeto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Todos os dados de "{project.name}" serão removidos permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(project.id, project.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <CardTitle className="mb-2 text-lg">Nenhum projeto ainda</CardTitle>
          <CardDescription className="mb-4">
            Crie seu primeiro projeto para começar a acompanhar as métricas do seu lançamento.
          </CardDescription>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Projeto
          </Button>
        </Card>
      )}
    </div>
  );
}
