import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, BarChart3, Calendar, Trash2, ExternalLink, Settings, Pencil, GitCompare, MoreVertical } from "lucide-react";
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
    strategy: p.strategy || "perpetuo",
    startDate: p.start_date || "",
    endDate: p.end_date || "",
    cartOpenDate: p.cart_open_date || "",
    manualInvestment: (p.manual_investment ?? 0).toFixed(2).replace(".", ","),
    isActive: p.is_active,
    budget: (p.budget ?? 0).toFixed(2).replace(".", ","),
    metaLeads: p.meta_leads_enabled ?? false,
    googleLeads: p.google_leads_enabled ?? false,
  };
}

export default function ProjectsHub() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProjectFormData>(emptyForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProjectFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    try {
      const created = await createProject.mutateAsync({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        strategy: createForm.strategy as any,
        start_date: createForm.startDate || null,
        end_date: createForm.endDate || null,
        cart_open_date: createForm.cartOpenDate || null,
        manual_investment: parseFloat(createForm.manualInvestment.replace(",", ".")) || 0,
        is_active: createForm.isActive,
        budget: parseFloat(createForm.budget.replace(",", ".")) || 0,
        meta_leads_enabled: createForm.metaLeads,
        google_leads_enabled: createForm.googleLeads,
      });
      toast({ title: "Projeto criado com sucesso!" });
      setCreateOpen(false);
      setCreateForm(emptyForm);
      if (created?.id) navigate(`/admin/projects/${created.id}/dashboard`);
    } catch (err: any) {
      toast({ title: "Erro ao criar projeto", description: err.message, variant: "destructive" });
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync(deleteTarget.id);
      toast({ title: "Projeto deletado", description: `"${deleteTarget.name}" foi removido.` });
      setDeleteTarget(null);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus lançamentos digitais</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/compare")}>
            <GitCompare className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Comparar</span>
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Novo Projeto</span>
                <span className="sm:hidden">Novo</span>
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

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados de "{deleteTarget?.name}" serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group relative transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer"
              onClick={() => navigate(`/admin/projects/${project.id}/dashboard`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug line-clamp-2">{project.name}</CardTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!project.is_active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inativo</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize whitespace-nowrap">
                      {strategyLabel(project.strategy as ProjectStrategy)}
                    </Badge>
                  </div>
                </div>
                {project.description && (
                  <CardDescription className="text-xs line-clamp-1 mt-1">{project.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="pb-3 pt-0">
                {project.start_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(project.start_date)}
                      {project.end_date && ` — ${formatDate(project.end_date)}`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/projects/${project.id}/dashboard`); }}
                  >
                    <BarChart3 className="mr-1 h-3.5 w-3.5" />
                    Dashboard
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => navigate(`/admin/projects/${project.id}/config`)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`https://agmetrics.lovable.app/view/${project.slug || project.view_token}`, "_blank")}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Dashboard Público
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
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
