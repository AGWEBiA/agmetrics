import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cartOpenDate, setCartOpenDate] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        cart_open_date: cartOpenDate || undefined,
      });
      toast({ title: "Projeto criado!", description: `"${project.name}" foi criado com sucesso.` });
      setOpen(false);
      setName("");
      setDescription("");
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Projeto</DialogTitle>
              <DialogDescription>
                Preencha as informações do seu lançamento digital.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Nome *</Label>
                <Input
                  id="project-name"
                  placeholder="Ex: Lançamento Curso X"
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
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Início</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Término</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cart-date">Abertura Carrinho</Label>
                  <Input
                    id="cart-date"
                    type="date"
                    value={cartOpenDate}
                    onChange={(e) => setCartOpenDate(e.target.value)}
                  />
                </div>
              </div>
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
                <CardTitle className="text-lg">{project.name}</CardTitle>
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
