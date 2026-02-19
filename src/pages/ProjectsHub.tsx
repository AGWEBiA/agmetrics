import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, BarChart3, Calendar, Trash2, ExternalLink, Settings, Pencil, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStrategyForm, strategyLabel, type ProjectFormData } from "@/components/ProjectStrategyForm";
import type { Project, ProjectStrategy } from "@/types/database";

const emptyForm: ProjectFormData = {
  name: "",
  description: "",
  strategy: "perpetuo",
  startDate: "",
  endDate: "",
  cartOpenDate: "",
  manualInvestment: "0,00",
  isActive: true,
  budget: "0,00",
  metaLeads: false,
  googleLeads: false,
};

function projectToForm(p: Project): ProjectFormData {
  return {
    name: p.name,
    description: p.description || "",
    strategy: (p.strategy as ProjectStrategy) || "perpetuo",
    startDate: p.start_date || "",
    endDate: p.end_date || "",
    cartOpenDate: p.cart_open_date || "",
    manualInvestment: Number(p.manual_investment || 0).toFixed(2).replace(".", ","),
    isActive: p.is_active ?? true,
    budget: Number(p.budget || 0).toFixed(2).replace(".", ","),
    metaLeads: p.meta_leads_enabled ?? false,
    googleLeads: p.google_leads_enabled ?? false,
  };
}

export default function ProjectsHub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProjectFormData>(emptyForm);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProjectFormData>(emptyForm);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    try {
      const project = await createProject.mutateAsync({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        strategy: createForm.strategy,
        start_date: createForm.startDate || undefined,
        end_date: createForm.endDate || undefined,
        cart_open_date: createForm.cartOpenDate || undefined,
      });
      toast({ title: "Projeto criado!", description: `"${project.name}" foi criado com sucesso.` });
      setCreateOpen(false);
      setCreateForm(emptyForm);
      navigate(`/admin/projects/${project.id}/config`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (project: Project) => {
    setEditingId(project.id);
    setEditForm(projectToForm(project));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    try {
      await updateProject.mutateAsync({
        id: editingId,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        strategy: editForm.strategy as any,
        start_date: editForm.startDate || null,
        end_date: editForm.endDate || null,
        cart_open_date: editForm.cartOpenDate || null,
        manual_investment: parseFloat(editForm.manualInvestment.replace(",", ".")) || 0,
        is_active: editForm.isActive,
        budget: parseFloat(editForm.budget.replace(",", ".")) || 0,
        meta_leads_enabled: editForm.metaLeads,
        google_leads_enabled: editForm.googleLeads,
      });
      toast({ title: "Projeto atualizado!" });
      setEditOpen(false);
      setEditingId(null);
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/compare")}>
            <GitCompare className="mr-2 h-4 w-4" />
            Comparar
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Projeto
              </Button>
            </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Projeto</DialogTitle>
              <DialogDescription>Preencha as informações do seu projeto digital.</DialogDescription>
            </DialogHeader>
            <ProjectStrategyForm data={createForm} onChange={setCreateForm} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!createForm.name.trim() || createProject.isPending}>
                {createProject.isPending ? "Criando..." : "Criar Projeto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>Atualize as informações do projeto.</DialogDescription>
          </DialogHeader>
          <ProjectStrategyForm data={editForm} onChange={setEditForm} showExtendedFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={!editForm.name.trim() || updateProject.isPending}>
              {updateProject.isPending ? "Salvando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <div className="flex items-center gap-2">
                    {!project.is_active && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                    {project.strategy && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {strategyLabel(project.strategy as ProjectStrategy)}
                      </Badge>
                    )}
                  </div>
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
                <Button size="sm" onClick={() => navigate(`/admin/projects/${project.id}/dashboard`)}>
                  <BarChart3 className="mr-1 h-3 w-3" />
                  Dashboard
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/projects/${project.id}/config`)}>
                  <Settings className="mr-1 h-3 w-3" />
                  Config
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(project)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.open(`https://agmetrics.lovable.app/view/${project.slug || project.view_token}`, "_blank")}>
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
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Projeto
          </Button>
        </Card>
      )}
    </div>
  );
}
