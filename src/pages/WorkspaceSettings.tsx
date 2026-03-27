import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Paintbrush, Globe, Palette, Type, Shield, Save, Eye, Users, UserPlus, Trash2, Building2 } from "lucide-react";
import { useCurrentOrganization, useOrgMembers, useInviteToOrg, useRemoveFromOrg } from "@/hooks/useOrganization";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

export default function WorkspaceSettings() {
  const { data: currentOrg } = useCurrentOrganization();
  const { data: members } = useOrgMembers(currentOrg?.id);
  const { data: allUsers } = useAdminUsers();
  const { data: currentUser } = useCurrentUser();
  const inviteToOrg = useInviteToOrg();
  const removeFromOrg = useRemoveFromOrg();

  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");

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

  const update = (key: keyof BrandingConfig, value: any) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  };

  const handleInvite = async () => {
    if (!inviteUserId || !currentOrg?.id) return;
    try {
      await inviteToOrg.mutateAsync({ orgId: currentOrg.id, userId: inviteUserId, role: inviteRole });
      toast({ title: "Membro adicionado", description: "O usuário foi adicionado à organização." });
      setInviteUserId("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!currentOrg?.id) return;
    try {
      await removeFromOrg.mutateAsync({ memberId, orgId: currentOrg.id });
      toast({ title: "Membro removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // Users not yet in org
  const memberUserIds = new Set((members || []).map((m) => m.user_id));
  const availableUsers = (allUsers || []).filter((u) => !memberUserIds.has(u.id));

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

      {/* Organization Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Organização: {currentOrg?.name || "—"}
          </CardTitle>
          <CardDescription>Gerencie os membros da sua organização. Todos os membros terão acesso aos projetos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Member list */}
          <div className="space-y-2">
            {(members || []).map((member) => (
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
                  <Badge variant="outline" className="text-xs">
                    {orgRoleLabels[member.role] || member.role}
                  </Badge>
                  {member.role !== "owner" && member.user_id !== currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Add member */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              Adicionar membro
            </Label>
            <div className="flex gap-2">
              <Select value={inviteUserId} onValueChange={setInviteUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={!inviteUserId || inviteToOrg.isPending} size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
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
              <Input value={branding.appName} onChange={(e) => update("appName", e.target.value)} placeholder="Nome da plataforma" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">URL do Logo</Label>
              <Input value={branding.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Cor Primária</Label>
              <div className="flex gap-2">
                <input type="color" value={branding.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={branding.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Cor de Destaque</Label>
              <div className="flex gap-2">
                <input type="color" value={branding.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={branding.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Ocultar branding do rodapé</Label>
              <p className="text-xs text-muted-foreground">Remove "Powered by AGMetrics" dos dashboards públicos</p>
            </div>
            <Switch checked={branding.hideFooterBranding} onCheckedChange={(v) => update("hideFooterBranding", v)} />
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
            <Input value={branding.customLoginTitle} onChange={(e) => update("customLoginTitle", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Subtítulo</Label>
            <Input value={branding.customLoginSubtitle} onChange={(e) => update("customLoginSubtitle", e.target.value)} />
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
            <Input value={branding.customDomain} onChange={(e) => update("customDomain", e.target.value)} placeholder="analytics.seudominio.com" />
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
        <Button variant="outline" onClick={handleReset}>Restaurar Padrão</Button>
      </div>
    </div>
  );
}
