import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject, useAllOrganizations, type ProjectFilters } from "@/hooks/useProjects";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, BarChart3, Calendar, Trash2, ExternalLink, Settings, Pencil, GitCompare, MoreVertical, Search, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStrategyForm, strategyLabel, type ProjectFormData } from "@/components/ProjectStrategyForm";
import type { Project, ProjectStrategy } from "@/types/database";

const emptyForm: ProjectFormData = {
  name: "", description: "", strategy: "perpetuo", startDate: "", endDate: "",
  cartOpenDate: "", manualInvestment: "0,00", isActive: true, budget: "0,00",
  metaLeads: false, googleLeads: false,
};

function projectToForm(p: Project): ProjectFormData {
  return {
    name: p.name, description: p.description || "", strategy: p.strategy || "perpetuo",
    startDate: p.start_date || "", endDate: p.end_date || "", cartOpenDate: p.cart_open_date || "",
    manualInvestment: (p.manual_investment ?? 0).toFixed(2).replace(".", ","),
    isActive: p.is_active, budget: (p.budget ?? 0).toFixed(2).replace(".", ","),
    metaLeads: p.meta_leads_enabled ?? false, googleLeads: p.google_leads_enabled ?? false,
  };
}

export default function ProjectsHub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  // Filters state
  const [search, setSearch] = useState("");
  const [strategyFilter, setStrategyFilter] = useState<ProjectStrategy | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filters: ProjectFilters = {
    search, strategy: strategyFilter, status: statusFilter,
    organizationId: isAdmin ? orgFilter : undefined,
    page,
  };

  const { data, isLoading } = useProjects(filters);
  const { data: allOrgs } = useAllOrganizations();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();

  const projects = data?.projects ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Dialog state
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
        name: createForm.name.trim(), description: createForm.description.trim() || undefined,
        strategy: createForm.strategy as any, start_date: createForm.startDate || undefined,
        end_date: createForm.endDate || undefined, cart_open_date: createForm.cartOpenDate || undefined,
      });
      toast({ title: "Projeto criado com sucesso!" });
      setCreateOpen(false); setCreateForm(emptyForm);
      if (created?.id) navigate(`/admin/projects/${created.id}/dashboard`);
    } catch (err: any) {
      toast({ title: "Erro ao criar projeto", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (project: Project) => {
    setEditingId(project.id); setEditForm(projectToForm(project)); setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    try {
      await updateProject.mutateAsync({
        id: editingId, name: editForm.name.trim(), description: editForm.description.trim() || null,
        strategy: editForm.strategy as any, start_date: editForm.startDate || null,
        end_date: editForm.endDate || null, cart_open_date: editForm.cartOpenDate || null,
        manual_investment: parseFloat(editForm.manualInvestment.replace(",", ".")) || 0,
        is_active: editForm.isActive, budget: parseFloat(editForm.budget.replace(",", ".")) || 0,
        meta_leads_enabled: editForm.metaLeads, google_leads_enabled: editForm.googleLeads,
      });
      toast({ title: "Projeto atualizado!" }); setEditOpen(false); setEditingId(null);
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

  const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString("pt-BR") : null;

  // Reset page when filters change
  const updateFilter = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (val: T) => {
    setter(val); setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie seus lançamentos digitais
            {data ? ` · ${data.totalCount} projeto${data.totalCount !== 1 ? "s" : ""}` : ""}
          </p>
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => updateFilter(setSearch)(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={strategyFilter} onValueChange={(v) => updateFilter(setStrategyFilter)(v as any)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Estratégia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas estratégias</SelectItem>
            <SelectItem value="perpetuo">Perpétuo</SelectItem>
            <SelectItem value="lancamento">Lançamento</SelectItem>
            <SelectItem value="lancamento_pago">Lanç. Pago</SelectItem>
            <SelectItem value="funis">Funis</SelectItem>
            <SelectItem value="evento_presencial">Evento Presencial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => updateFilter(setStatusFilter)(v as any)}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && allOrgs && allOrgs.length > 0 && (
          <Select value={orgFilter} onValueChange={(v) => updateFilter(setOrgFilter)(v)}>
            <SelectTrigger className="w-[200px] h-9">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Organização" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas organizações</SelectItem>
              {allOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Grid */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-32" /></CardContent></Card>
          ))}
        </div>
      ) : projects.length > 0 ? (
        <>
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
                      <span>{formatDate(project.start_date)}{project.end_date && ` — ${formatDate(project.end_date)}`}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/admin/projects/${project.id}/dashboard`); }}>
                      <BarChart3 className="mr-1 h-3.5 w-3.5" />Dashboard
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => navigate(`/admin/projects/${project.id}/config`)}>
                          <Settings className="mr-2 h-4 w-4" />Configurações
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(project)}>
                          <Pencil className="mr-2 h-4 w-4" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://agmetrics.lovable.app/view/${project.slug || project.view_token}`, "_blank")}>
                          <ExternalLink className="mr-2 h-4 w-4" />Dashboard Público
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget({ id: project.id, name: project.name })}>
                          <Trash2 className="mr-2 h-4 w-4" />Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink isActive={pageNum === page} onClick={() => setPage(pageNum)} className="cursor-pointer">
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <CardTitle className="mb-2 text-lg">
            {search || strategyFilter !== "all" || statusFilter !== "all" ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
          </CardTitle>
          <CardDescription className="mb-4">
            {search || strategyFilter !== "all" || statusFilter !== "all"
              ? "Tente ajustar os filtros de busca."
              : "Crie seu primeiro projeto para começar a acompanhar as métricas do seu lançamento."}
          </CardDescription>
          {!search && strategyFilter === "all" && statusFilter === "all" && (
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Criar Projeto
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
