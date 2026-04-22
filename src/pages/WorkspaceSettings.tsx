import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Paintbrush, Globe, Palette, Type, Shield, Save, Eye, UserPlus, Trash2,
  Building2, Users, CheckCheck, Plus, UserCircle, Pencil, Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useCurrentOrganization, useUserOrganizations, useOrgMembers, useBulkInviteToOrg, useRemoveFromOrg, useUpdateOrgMemberRole } from "@/hooks/useOrganization";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, type Client } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BrandingConfig {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  darkMode: boolean;
  customDomain: string;
  hideFooterBranding: boolean;
  customLoginTitle: string;
  customLoginSubtitle: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  appName: "AGMetrics",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#3b82f6",
  accentColor: "#8b5cf6",
  darkMode: true,
  customDomain: "",
  hideFooterBranding: false,
  customLoginTitle: "Bem-vindo ao AGMetrics",
  customLoginSubtitle: "Faça login para acessar seus dashboards",
};

const orgRoleLabels: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
  viewer: "Visualizador",
};

const MEMBERS_PER_PAGE = 8;
const CLIENTS_PER_PAGE = 8;

export default function WorkspaceSettings() {
  const { data: currentOrg } = useCurrentOrganization();
  const { data: members } = useOrgMembers(currentOrg?.id);
  const { data: allUsers } = useAdminUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: userOrgs } = useUserOrganizations();
  const { data: clients } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const queryClient = useQueryClient();
  const bulkInvite = useBulkInviteToOrg();
  const removeFromOrg = useRemoveFromOrg();
  const updateRole = useUpdateOrgMemberRole();

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<"admin" | "member" | "viewer">("member");

  // Org creation
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Members search, filter, pagination
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");
  const [memberPage, setMemberPage] = useState(1);

  // Confirmation dialogs
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null);
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{ memberId: string; name: string; newRole: string } | null>(null);

  // Client management
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [clientSearch, setClientSearch] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const [deleteClientConfirm, setDeleteClientConfirm] = useState<{ id: string; name: string } | null>(null);

  // Filtered & grouped members
  const filteredMembers = useMemo(() => {
    let list = members || [];
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      list = list.filter(
        (m) =>
          (m.profile?.name || "").toLowerCase().includes(q) ||
          (m.profile?.email || "").toLowerCase().includes(q)
      );
    }
    if (memberRoleFilter !== "all") {
      list = list.filter((m) => m.role === memberRoleFilter);
    }
    return list;
  }, [members, memberSearch, memberRoleFilter]);

  const memberTotalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE));
  const paginatedMembers = filteredMembers.slice((memberPage - 1) * MEMBERS_PER_PAGE, memberPage * MEMBERS_PER_PAGE);

  // Group by role for display
  const groupedMembers = useMemo(() => {
    const roleOrder = ["owner", "admin", "member", "viewer"];
    const groups: { role: string; members: typeof paginatedMembers }[] = [];
    roleOrder.forEach((role) => {
      const ms = paginatedMembers.filter((m) => m.role === role);
      if (ms.length > 0) groups.push({ role, members: ms });
    });
    return groups;
  }, [paginatedMembers]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const clientTotalPages = Math.max(1, Math.ceil(filteredClients.length / CLIENTS_PER_PAGE));
  const paginatedClients = filteredClients.slice((clientPage - 1) * CLIENTS_PER_PAGE, clientPage * CLIENTS_PER_PAGE);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ name: newOrgName.trim(), created_by: session.user.id } as any)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("organization_members").insert({
        organization_id: (org as any).id, user_id: session.user.id, role: "owner",
      } as any);
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["all-organizations"] });
      toast({ title: "Organização criada!", description: `"${newOrgName.trim()}" foi criada com sucesso.` });
      setNewOrgName("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreatingOrg(false);
    }
  };

  const openCreateClient = () => {
    setEditingClient(null);
    setClientForm({ name: "", email: "", phone: "", notes: "" });
    setClientDialogOpen(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
    });
    setClientDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!clientForm.name.trim() || !currentOrg?.id) return;
    try {
      if (editingClient) {
        await updateClient.mutateAsync({
          id: editingClient.id,
          name: clientForm.name.trim(),
          email: clientForm.email.trim() || null,
          phone: clientForm.phone.trim() || null,
          notes: clientForm.notes.trim() || null,
        });
        toast({ title: "Cliente atualizado!" });
      } else {
        await createClient.mutateAsync({
          name: clientForm.name.trim(),
          organization_id: currentOrg.id,
          email: clientForm.email.trim() || undefined,
          phone: clientForm.phone.trim() || undefined,
          notes: clientForm.notes.trim() || undefined,
        });
        toast({ title: "Cliente criado!" });
      }
      setClientDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const confirmDeleteClient = async () => {
    if (!deleteClientConfirm) return;
    try {
      await deleteClient.mutateAsync(deleteClientConfirm.id);
      toast({ title: "Cliente removido", description: `"${deleteClientConfirm.name}" foi removido.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setDeleteClientConfirm(null);
    }
  };

  const [branding, setBranding] = useState<BrandingConfig>(() => {
    const saved = localStorage.getItem("workspace_branding");
    return saved ? { ...DEFAULT_BRANDING, ...JSON.parse(saved) } : DEFAULT_BRANDING;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem("workspace_branding", JSON.stringify(branding));
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Configurações salvas", description: "As configurações de marca foram atualizadas." });
    }, 500);
  };

  const handleReset = () => {
    setBranding(DEFAULT_BRANDING);
    localStorage.removeItem("workspace_branding");
    toast({ title: "Resetado", description: "Configurações restauradas ao padrão." });
  };

  const updateBranding = (key: keyof BrandingConfig, value: any) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  };

  const handleBulkInvite = async () => {
    if (selectedUserIds.size === 0 || !currentOrg?.id) return;
    try {
      const users = Array.from(selectedUserIds).map((userId) => ({ userId, role: bulkRole }));
      await bulkInvite.mutateAsync({ orgId: currentOrg.id, users });
      toast({ title: "Membros adicionados", description: `${users.length} usuário(s) adicionado(s) à organização.` });
      setSelectedUserIds(new Set());
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const confirmRemove = async () => {
    if (!removeConfirm || !currentOrg?.id) return;
    try {
      await removeFromOrg.mutateAsync({ memberId: removeConfirm.id, orgId: currentOrg.id });
      toast({ title: "Membro removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRemoveConfirm(null);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleChangeConfirm || !currentOrg?.id) return;
    try {
      await updateRole.mutateAsync({ memberId: roleChangeConfirm.memberId, orgId: currentOrg.id, role: roleChangeConfirm.newRole as any });
      toast({ title: "Papel atualizado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRoleChangeConfirm(null);
    }
  };

  const handleRoleChange = (memberId: string, memberName: string, newRole: string) => {
    setRoleChangeConfirm({ memberId, name: memberName, newRole });
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const memberUserIds = new Set((members || []).map((m) => m.user_id));
  const availableUsers = (allUsers || []).filter((u) => !memberUserIds.has(u.id));

  const selectAll = () => {
    if (selectedUserIds.size === availableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(availableUsers.map((u) => u.id)));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Paintbrush className="h-6 w-6 text-primary" />
          Configurações do Workspace
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Personalize a aparência, marca e gerencie membros da organização
        </p>
      </div>

      {/* ===== Organization Members ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Organização: {currentOrg?.name || "—"}
          </CardTitle>
          <CardDescription>Gerencie os membros da sua organização. Todos os membros terão acesso aos projetos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={memberRoleFilter} onValueChange={(v) => { setMemberRoleFilter(v); setMemberPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os roles</SelectItem>
                <SelectItem value="owner">Dono</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Members grouped by role */}
          <div className="space-y-4">
            {groupedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro encontrado.</p>
            ) : (
              groupedMembers.map((group) => (
                <div key={group.role}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {orgRoleLabels[group.role] || group.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({group.members.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {(member.profile?.name || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.profile?.name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">{member.profile?.email || ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === "owner" ? (
                            <Badge variant="default" className="text-xs">Dono</Badge>
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(v) => handleRoleChange(member.id, member.profile?.name || "membro", v)}
                              disabled={member.user_id === currentUser?.id}
                            >
                              <SelectTrigger className="h-7 w-[120px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Membro</SelectItem>
                                <SelectItem value="viewer">Visualizador</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {member.role !== "owner" && member.user_id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setRemoveConfirm({ id: member.id, name: member.profile?.name || "membro" })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {memberTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {filteredMembers.length} membro(s) · Página {memberPage} de {memberTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={memberPage <= 1} onClick={() => setMemberPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={memberPage >= memberTotalPages} onClick={() => setMemberPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Multi-select add members */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              Adicionar membros
            </Label>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os usuários já fazem parte desta organização.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={selectAll}>
                    <CheckCheck className="h-3.5 w-3.5" />
                    {selectedUserIds.size === availableUsers.length ? "Desmarcar todos" : "Selecionar todos"}
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Papel:</span>
                    <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as any)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membro</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="max-h-[240px] overflow-y-auto rounded-lg border divide-y">
                  {availableUsers.map((user) => (
                    <label key={user.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer transition-colors">
                      <Checkbox checked={selectedUserIds.has(user.id)} onCheckedChange={() => toggleUser(user.id)} />
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">{(user.name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button onClick={handleBulkInvite} disabled={selectedUserIds.size === 0 || bulkInvite.isPending} size="sm" className="w-full">
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  {bulkInvite.isPending ? "Adicionando..." : `Adicionar ${selectedUserIds.size > 0 ? `${selectedUserIds.size} usuário(s)` : ""}`}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Clients CRUD ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCircle className="h-5 w-5" />
                Clientes
              </CardTitle>
              <CardDescription>Gerencie os clientes da organização. Vincule projetos a clientes para melhor organização.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreateClient}>
              <Plus className="h-4 w-4 mr-1" /> Novo Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          {(clients?.length ?? 0) > 0 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setClientPage(1); }}
                className="pl-9"
              />
            </div>
          )}

          {paginatedClients.length > 0 ? (
            <div className="space-y-2">
              {paginatedClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[client.email, client.phone].filter(Boolean).join(" · ") || "Sem contato"}
                    </p>
                    {client.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{client.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditClient(client)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteClientConfirm({ id: client.id, name: client.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {clientSearch ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
            </p>
          )}

          {/* Pagination */}
          {clientTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {filteredClients.length} cliente(s) · Página {clientPage} de {clientTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={clientPage <= 1} onClick={() => setClientPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={clientPage >= clientTotalPages} onClick={() => setClientPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Branding ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Identidade Visual
          </CardTitle>
          <CardDescription>Configure a marca do seu workspace para todos os usuários</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Nome do App</Label>
              <Input value={branding.appName} onChange={(e) => updateBranding("appName", e.target.value)} placeholder="Nome da plataforma" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">URL do Logo</Label>
              <Input value={branding.logoUrl} onChange={(e) => updateBranding("logoUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Cor Primária</Label>
              <div className="flex gap-2">
                <input type="color" value={branding.primaryColor} onChange={(e) => updateBranding("primaryColor", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={branding.primaryColor} onChange={(e) => updateBranding("primaryColor", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Cor de Destaque</Label>
              <div className="flex gap-2">
                <input type="color" value={branding.accentColor} onChange={(e) => updateBranding("accentColor", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={branding.accentColor} onChange={(e) => updateBranding("accentColor", e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Ocultar branding do rodapé</Label>
              <p className="text-xs text-muted-foreground">Remove "Powered by AGMetrics" dos dashboards públicos</p>
            </div>
            <Switch checked={branding.hideFooterBranding} onCheckedChange={(v) => updateBranding("hideFooterBranding", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Login customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5" />
            Tela de Login
          </CardTitle>
          <CardDescription>Personalize a tela de login para refletir sua marca</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Título</Label>
            <Input value={branding.customLoginTitle} onChange={(e) => updateBranding("customLoginTitle", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Subtítulo</Label>
            <Input value={branding.customLoginSubtitle} onChange={(e) => updateBranding("customLoginSubtitle", e.target.value)} />
          </div>
          <div className="border rounded-lg p-6 bg-muted/50">
            <div className="text-center space-y-2">
              {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" className="h-10 mx-auto" />}
              <h3 className="text-lg font-bold" style={{ color: branding.primaryColor }}>{branding.customLoginTitle || "Bem-vindo"}</h3>
              <p className="text-sm text-muted-foreground">{branding.customLoginSubtitle}</p>
              <div className="max-w-[200px] mx-auto space-y-2 pt-2">
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 rounded text-white text-xs flex items-center justify-center font-medium" style={{ backgroundColor: branding.primaryColor }}>Entrar</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Domínio Personalizado
          </CardTitle>
          <CardDescription>Use seu próprio domínio para acessar a plataforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Domínio</Label>
            <Input value={branding.customDomain} onChange={(e) => updateBranding("customDomain", e.target.value)} placeholder="analytics.seudominio.com" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Configure um CNAME apontando para agmetrics.lovable.app para ativar</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <Eye className="h-3 w-3 mr-1" /> Recurso disponível em breve
          </Badge>
        </CardContent>
      </Card>

      {/* Create Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Criar Nova Organização
          </CardTitle>
          <CardDescription>Crie uma nova organização para agrupar projetos e equipe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input placeholder="Nome da organização" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} className="flex-1" />
            <Button onClick={handleCreateOrg} disabled={!newOrgName.trim() || creatingOrg}>
              {creatingOrg ? "Criando..." : "Criar"}
            </Button>
          </div>
          {userOrgs && userOrgs.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Suas organizações:</Label>
              <div className="flex flex-wrap gap-1.5">
                {userOrgs.map((org) => (
                  <Badge key={org.id} variant={org.id === currentOrg?.id ? "default" : "outline"} className="text-xs">
                    {org.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
        <Button variant="outline" onClick={handleReset}>Restaurar Padrão</Button>
      </div>

      {/* ===== Dialogs ===== */}

      {/* Client Create/Edit Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingClient
                ? `Editando "${editingClient.name}" na organização "${currentOrg?.name}".`
                : `Adicione um cliente à organização "${currentOrg?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome do cliente" value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input placeholder="email@exemplo.com" value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(00) 00000-0000" value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Notas sobre o cliente..." value={clientForm.notes} onChange={(e) => setClientForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveClient} disabled={!clientForm.name.trim() || createClient.isPending || updateClient.isPending}>
              {(createClient.isPending || updateClient.isPending) ? "Salvando..." : editingClient ? "Salvar" : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation */}
      <AlertDialog open={!!removeConfirm} onOpenChange={(open) => !open && setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeConfirm?.name}</strong> da organização? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role change confirmation */}
      <AlertDialog open={!!roleChangeConfirm} onOpenChange={(open) => !open && setRoleChangeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar papel</AlertDialogTitle>
            <AlertDialogDescription>
              Alterar o papel de <strong>{roleChangeConfirm?.name}</strong> para <strong>{orgRoleLabels[roleChangeConfirm?.newRole || ""] || roleChangeConfirm?.newRole}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete client confirmation */}
      <AlertDialog open={!!deleteClientConfirm} onOpenChange={(open) => !open && setDeleteClientConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteClientConfirm?.name}</strong>? Projetos vinculados ficarão sem cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
