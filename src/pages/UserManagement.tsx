import { useState } from "react";
import {
  useAdminUsers,
  useUpdateUserRole,
  useDeleteUser,
  useUpdatePermissions,
  useCreateUser,
  type AdminUser,
  type AppPermission,
} from "@/hooks/useAdminUsers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, Trash2, Users, Pencil, UserPlus } from "lucide-react";

const ALL_PERMISSIONS: { value: AppPermission; label: string }[] = [
  { value: "projects.view", label: "Visualizar projetos" },
  { value: "projects.edit", label: "Editar projetos" },
  { value: "sales.view", label: "Visualizar vendas" },
  { value: "integrations.manage", label: "Gerenciar integrações" },
  { value: "data.export", label: "Exportar dados" },
];

export default function UserManagement() {
  const { data: users, isLoading, error } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const updatePermissions = useUpdatePermissions();
  const createUser = useCreateUser();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editPerms, setEditPerms] = useState<AppPermission[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPerms([...user.permissions]);
    setEditOpen(true);
  };

  const togglePerm = (perm: AppPermission) => {
    setEditPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      if (editRole !== editingUser.role) {
        await updateRole.mutateAsync({ user_id: editingUser.id, role: editRole });
      }
      const permsChanged =
        editPerms.length !== editingUser.permissions.length ||
        editPerms.some((p) => !editingUser.permissions.includes(p));
      if (permsChanged) {
        await updatePermissions.mutateAsync({ user_id: editingUser.id, permissions: editPerms });
      }
      toast({ title: "Usuário atualizado com sucesso" });
      setEditOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (user: AdminUser) => {
    try {
      await deleteUser.mutateAsync(user.id);
      toast({ title: "Usuário removido", description: `${user.email} foi removido.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast({ title: "Erro", description: "E-mail e senha são obrigatórios", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    try {
      await createUser.mutateAsync({ email: newEmail, name: newName, password: newPassword, role: newRole });
      toast({ title: "Usuário criado com sucesso" });
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("user");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-4 h-12 w-12 text-destructive/50" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7" />
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground">Gerencie os usuários, papéis e permissões do sistema</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        "Usuário"
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.role === "admin" ? (
                        <Badge variant="outline" className="text-xs">Todas</Badge>
                      ) : user.permissions.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Nenhuma</span>
                      ) : (
                        user.permissions.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {ALL_PERMISSIONS.find((ap) => ap.value === p)?.label || p}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é irreversível. O usuário "{user.email}" será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Altere o papel e as permissões do usuário.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={editingUser.avatar_url || undefined} />
                  <AvatarFallback>
                    {(editingUser.name || editingUser.email || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editingUser.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as "admin" | "user")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Administrador
                      </span>
                    </SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editRole !== "admin" && (
                <div className="space-y-3">
                  <Label>Permissões</Label>
                  <div className="space-y-2 rounded-md border p-3">
                    {ALL_PERMISSIONS.map((perm) => (
                      <div key={perm.value} className="flex items-center gap-2">
                        <Checkbox
                          id={perm.value}
                          checked={editPerms.includes(perm.value)}
                          onCheckedChange={() => togglePerm(perm.value)}
                        />
                        <Label htmlFor={perm.value} className="cursor-pointer font-normal">
                          {perm.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {editRole === "admin" && (
                <p className="text-sm text-muted-foreground">
                  Administradores possuem todas as permissões automaticamente.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateRole.isPending || updatePermissions.isPending}>
              {updateRole.isPending || updatePermissions.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Crie uma nova conta de acesso ao sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mail *</Label>
              <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha *</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "user")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Administrador
                    </span>
                  </SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={createUser.isPending}>
              {createUser.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
