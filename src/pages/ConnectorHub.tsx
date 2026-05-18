import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/hooks/useProjects";
import { useMetaCredentials, useGoogleCredentials } from "@/hooks/useProjectData";
import { useIntegrationAccounts } from "@/hooks/useIntegrationAccounts";
import { useCurrentOrganization } from "@/hooks/useOrganization";
import {
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  Settings2,
  Globe,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AGSellLogo } from "@/components/agsell/AGSellLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConnectorField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
}

interface ConnectorConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "ads" | "analytics" | "crm" | "messaging";
  fields: ConnectorField[];
  docsUrl: string;
  color: string;
}

const CONNECTORS: ConnectorConfig[] = [
  {
    id: "meta", name: "Meta Ads", icon: "📘",
    description: "Facebook & Instagram Ads — importa métricas de campanhas, anúncios e demographics.",
    category: "ads",
    fields: [
      { key: "access_token", label: "Access Token", type: "password", placeholder: "EAAGxx..." },
      { key: "ad_account_id", label: "Ad Account ID", type: "text", placeholder: "act_123456" },
    ],
    docsUrl: "https://developers.facebook.com/docs/marketing-apis/",
    color: "hsl(221, 70%, 50%)",
  },
  {
    id: "google", name: "Google Ads", icon: "🔵",
    description: "Google Ads — importa cliques, impressões, conversões e investimento.",
    category: "ads",
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "xxx.apps.googleusercontent.com" },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-..." },
      { key: "refresh_token", label: "Refresh Token", type: "password", placeholder: "1//0..." },
      { key: "customer_id", label: "Customer ID", type: "text", placeholder: "123-456-7890" },
    ],
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
    color: "hsl(210, 80%, 50%)",
  },
  {
    id: "tiktok", name: "TikTok Ads", icon: "🎵",
    description: "TikTok For Business — importa métricas de campanhas e anúncios do TikTok.",
    category: "ads",
    fields: [
      { key: "access_token", label: "Access Token", type: "password", placeholder: "Server-side token" },
      { key: "advertiser_id", label: "Advertiser ID", type: "text", placeholder: "71234567890" },
    ],
    docsUrl: "https://business-api.tiktok.com/portal/docs",
    color: "hsl(345, 80%, 50%)",
  },
  {
    id: "ga4", name: "Google Analytics 4", icon: "📊",
    description: "GA4 — importa sessões, usuários, eventos e conversões do seu site.",
    category: "analytics",
    fields: [
      { key: "property_id", label: "Property ID", type: "text", placeholder: "properties/123456789" },
      { key: "client_email", label: "Service Account Email", type: "text", placeholder: "sa@project.iam.gserviceaccount.com" },
      { key: "private_key", label: "Private Key (JSON)", type: "password", placeholder: "-----BEGIN PRIVATE KEY-----" },
    ],
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
    color: "hsl(40, 90%, 50%)",
  },
  {
    id: "kiwify", name: "Kiwify", icon: "🥝",
    description: "Plataforma de vendas — importa vendas, reembolsos e dados de compradores.",
    category: "crm",
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "..." },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "..." },
      { key: "account_id", label: "Account ID", type: "text", placeholder: "..." },
    ],
    docsUrl: "https://dashboard.kiwify.com.br",
    color: "hsl(120, 60%, 40%)",
  },
  {
    id: "hotmart", name: "Hotmart", icon: "🔥",
    description: "Plataforma de infoprodutos — importa vendas, comissões e reembolsos.",
    category: "crm",
    fields: [
      { key: "client_id", label: "Client ID", type: "text", placeholder: "..." },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "..." },
    ],
    docsUrl: "https://developers.hotmart.com/",
    color: "hsl(15, 90%, 50%)",
  },
  {
    id: "agsell", name: "AG Sell", icon: "🚀",
    description: "Automação de e-mails, WhatsApp, Instagram — importa métricas de leads, formulários e pipeline.",
    category: "crm",
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "ag_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { key: "base_url", label: "Base URL (opcional)", type: "text", placeholder: "https://gmemxbfibakfpsjbsvyt.supabase.co/functions/v1/public-api" },
    ],
    docsUrl: "https://agsell.com.br",
    color: "hsl(260, 70%, 55%)",
  },
  {
    id: "whatsapp", name: "WhatsApp (Evolution)", icon: "💬",
    description: "Evolution API — monitora grupos, membros e engajamento via WhatsApp.",
    category: "messaging",
    fields: [
      { key: "api_url", label: "API URL", type: "text", placeholder: "https://api.evolution.com.br" },
      { key: "api_key", label: "API Key", type: "password", placeholder: "..." },
      { key: "instance_name", label: "Instance Name", type: "text", placeholder: "default" },
    ],
    docsUrl: "https://doc.evolution-api.com/",
    color: "hsl(142, 70%, 40%)",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  ads: "Plataformas de Anúncios",
  analytics: "Analytics",
  crm: "Vendas & CRM",
  messaging: "Mensagens",
};

function getExistingValues(project: any, connectorId: string, metaCreds: any, googleCreds: any): Record<string, string> {
  if (!project) return {};
  switch (connectorId) {
    case "kiwify":
      return {
        client_id: project.kiwify_client_id || "",
        client_secret: project.kiwify_client_secret || "",
        account_id: project.kiwify_account_id || "",
      };
    case "hotmart":
      return {
        client_id: project.hotmart_client_id || "",
        client_secret: project.hotmart_client_secret || "",
      };
    case "agsell":
      return {
        api_key: project.agsell_api_key || "",
        base_url: project.agsell_base_url || "",
      };
    case "whatsapp":
      return {
        api_url: project.evolution_api_url || "",
        api_key: project.evolution_api_key || "",
        instance_name: project.evolution_instance_name || "",
      };
    case "meta":
      return metaCreds
        ? { access_token: metaCreds.access_token || "", ad_account_id: metaCreds.ad_account_id || "" }
        : {};
    case "google":
      return googleCreds
        ? {
            client_id: googleCreds.client_id || "",
            client_secret: googleCreds.client_secret || "",
            refresh_token: googleCreds.refresh_token || "",
            customer_id: googleCreds.customer_id || "",
          }
        : {};
    default:
      return {};
  }
}

function maskValue(value: string, type: "text" | "password"): string {
  if (!value) return "—";
  if (type === "text") return value;
  if (value.length <= 6) return "••••••";
  return value.slice(0, 3) + "••••••" + value.slice(-3);
}

function isConnected(existing: Record<string, string>): boolean {
  return Object.values(existing).some((v) => !!v);
}

export default function ConnectorHub() {
  const { projectId } = useParams();
  const { data: project, refetch } = useProject(projectId);
  const { data: metaCreds, refetch: refetchMeta } = useMetaCredentials(projectId);
  const { data: googleCreds, refetch: refetchGoogle } = useGoogleCredentials(projectId);
  const { data: globalAccounts, createAccount, deleteAccount, isLoading: accountsLoading } = useIntegrationAccounts();
  const { data: currentOrg } = useCurrentOrganization();
  
  const [configuring, setConfiguring] = useState<ConnectorConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  
  const [isCreatingGlobal, setIsCreatingGlobal] = useState(false);
  const [globalForm, setGlobalForm] = useState({ name: "", platform: "", credentials: {} as any });
  
  const categories = ["ads", "analytics", "crm", "messaging"] as const;

  const filteredAccounts = useMemo(() => {
    if (!globalAccounts || !configuring) return [];
    return globalAccounts.filter(acc => acc.platform === configuring.id);
  }, [globalAccounts, configuring]);

  const handleConfigure = (connector: ConnectorConfig) => {
    const existing = getExistingValues(project, connector.id, metaCreds, googleCreds);
    setFormData(existing);
    setConfiguring(connector);
  };

  const handleCreateGlobal = async () => {
    if (!globalForm.name || !globalForm.platform) return;
    try {
      await createAccount({
        name: globalForm.name,
        platform: globalForm.platform,
        credentials: globalForm.credentials,
        org_id: currentOrg?.id
      });
      toast({ title: "Conta Global Criada", description: `A conta "${globalForm.name}" está pronta para uso.` });
      setIsCreatingGlobal(false);
      setGlobalForm({ name: "", platform: "", credentials: {} });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!configuring || !projectId) return;
    setSaving(true);

    try {
      let finalData = { ...formData };
      
      // If a global account was selected, use its credentials
      if (selectedAccountId) {
        const acc = globalAccounts?.find(a => a.id === selectedAccountId);
        if (acc) {
          finalData = { ...acc.credentials };
        }
      }

      const updates: Record<string, any> = {};

      switch (configuring.id) {
        case "kiwify":
          updates.kiwify_client_id = finalData.client_id || null;
          updates.kiwify_client_secret = finalData.client_secret || null;
          updates.kiwify_account_id = finalData.account_id || null;
          break;
        case "hotmart":
          updates.hotmart_client_id = finalData.client_id || null;
          updates.hotmart_client_secret = finalData.client_secret || null;
          break;
        case "agsell":
          updates.agsell_api_key = finalData.api_key || null;
          updates.agsell_base_url = finalData.base_url || null;
          break;
        case "whatsapp":
          updates.evolution_api_url = finalData.api_url || null;
          updates.evolution_api_key = finalData.api_key || null;
          updates.evolution_instance_name = finalData.instance_name || null;
          break;
        case "meta": {
          const metaPayload = {
            project_id: projectId,
            access_token: finalData.access_token || "",
            ad_account_id: finalData.ad_account_id || "",
          };
          if (metaCreds?.id) {
            await supabase.from("meta_credentials").update(metaPayload).eq("id", metaCreds.id);
          } else {
            await supabase.from("meta_credentials").insert(metaPayload);
          }
          refetchMeta();
          break;
        }
        case "google": {
          const googlePayload = {
            project_id: projectId,
            client_id: finalData.client_id || "",
            client_secret: finalData.client_secret || "",
            refresh_token: finalData.refresh_token || "",
            customer_id: finalData.customer_id || "",
          };
          if (googleCreds?.id) {
            await supabase.from("google_credentials").update(googlePayload).eq("id", googleCreds.id);
          } else {
            await supabase.from("google_credentials").insert(googlePayload);
          }
          refetchGoogle();
          break;
        }
        default:
          toast({ title: "Em breve", description: `O conector ${configuring.name} será ativado em breve.` });
          return;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("projects").update(updates).eq("id", projectId);
      }

      toast({ title: "Conector salvo", description: `${configuring.name} configurado com sucesso.` });
      setConfiguring(null);
      setSelectedAccountId("");
      refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 text-gradient">
            <Zap className="h-7 w-7 text-primary" />
            Hub de Conectores
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conecte suas fontes de dados de forma global ou por projeto.
          </p>
        </div>
        <Button onClick={() => setIsCreatingGlobal(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Globe className="h-4 w-4" />
          Nova Conta Global
        </Button>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="bg-muted/50 mb-6">
          <TabsTrigger value="projects" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Conexões do Projeto
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2">
            <Globe className="h-4 w-4" />
            Contas Globais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-8">
          {categories.map((cat) => {
            const items = CONNECTORS.filter((c) => c.category === cat);
            return (
              <div key={cat} className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80 px-1">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((connector) => {
                    const existing = getExistingValues(project, connector.id, metaCreds, googleCreds);
                    const connected = isConnected(existing);
                    return (
                      <Card key={connector.id} className="glass-card hover:shadow-xl transition-all duration-300 group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full opacity-60" style={{ backgroundColor: connector.color }} />
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {connector.id === "agsell" ? <AGSellLogo className="h-7 w-7" /> : <span className="text-2xl">{connector.icon}</span>}
                              <CardTitle className="text-base">{connector.name}</CardTitle>
                            </div>
                            {connected ? (
                              <Badge className="bg-success/10 text-success border-success/20 text-[10px] h-5">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] h-5 opacity-50">Inativo</Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs line-clamp-2 leading-relaxed min-h-[2.4rem]">
                            {connector.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          {connected && (
                            <div className="bg-muted/30 rounded-lg p-2.5 space-y-1.5 border border-border/50">
                              {connector.fields.slice(0, 2).map((field) => (
                                <div key={field.key} className="flex items-center justify-between text-[10px]">
                                  <span className="text-muted-foreground font-medium">{field.label}:</span>
                                  <span className="font-mono opacity-80">{maskValue(existing[field.key], field.type)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant={connected ? "outline" : "default"} className="flex-1 text-xs h-8" onClick={() => handleConfigure(connector)}>
                              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                              {connected ? "Reconfigurar" : "Conectar"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                              <a href={connector.docsUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {globalAccounts?.map((account) => (
              <Card key={account.id} className="glass-card hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {CONNECTORS.find(c => c.id === account.platform)?.icon || account.platform[0].toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.name}</CardTitle>
                        <CardDescription className="text-xs capitalize">{account.platform}</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteAccount(account.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                   <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                      {Object.keys(account.credentials).slice(0, 2).map((key) => (
                        <div key={key} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <span className="font-mono opacity-70">••••••</span>
                        </div>
                      ))}
                   </div>
                </CardContent>
              </Card>
            ))}
            {(!globalAccounts || globalAccounts.length === 0) && (
              <div className="col-span-full py-12 text-center glass-card rounded-2xl border-dashed">
                <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Nenhuma conta global</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                  Crie contas de integração gerais para reutilizar em múltiplos projetos.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setIsCreatingGlobal(true)}>
                  Criar minha primeira conta
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Connection Dialog */}
      <Dialog open={!!configuring} onOpenChange={(open) => !open && setConfiguring(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              {configuring?.icon && <span className="text-2xl">{configuring.icon}</span>}
              Configurar {configuring?.name}
            </DialogTitle>
            <DialogDescription>{configuring?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {filteredAccounts.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Usar conta global existente</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione uma conta global..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">--- Configuração Manual ---</SelectItem>
                    {filteredAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(!selectedAccountId || selectedAccountId === "manual") && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {configuring?.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full h-11 text-base shadow-lg shadow-primary/20" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Salvar Configuração
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Account Dialog */}
      <Dialog open={isCreatingGlobal} onOpenChange={setIsCreatingGlobal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Nova Conta de Integração Global</DialogTitle>
            <DialogDescription>Uma conta que pode ser compartilhada entre todos os seus projetos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label>Nome Identificador</Label>
              <Input placeholder="Ex: Kiwify AG WEBi" value={globalForm.name} onChange={e => setGlobalForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select onValueChange={v => setGlobalForm(p => ({ ...p, platform: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma..." />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTORS.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {globalForm.platform && (
              <div className="space-y-4 pt-2 border-t border-border/50 animate-in slide-in-from-top-2">
                {CONNECTORS.find(c => c.id === globalForm.platform)?.fields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-sm">{field.label}</Label>
                    <Input 
                      type={field.type} 
                      placeholder={field.placeholder}
                      onChange={e => setGlobalForm(p => ({ ...p, credentials: { ...p.credentials, [field.key]: e.target.value } }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full h-11" onClick={handleCreateGlobal} disabled={!globalForm.name || !globalForm.platform}>
              Criar Conta Global
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
