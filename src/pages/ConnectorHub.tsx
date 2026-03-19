import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/hooks/useProjects";
import { useMetaCredentials, useGoogleCredentials } from "@/hooks/useProjectData";
import {
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  Settings2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [configuring, setConfiguring] = useState<ConnectorConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const categories = ["ads", "analytics", "crm", "messaging"] as const;

  const handleConfigure = (connector: ConnectorConfig) => {
    const existing = getExistingValues(project, connector.id, metaCreds, googleCreds);
    setFormData(existing);
    setConfiguring(connector);
  };

  const handleSave = async () => {
    if (!configuring || !projectId) return;
    setSaving(true);

    try {
      const updates: Record<string, any> = {};

      switch (configuring.id) {
        case "kiwify":
          updates.kiwify_client_id = formData.client_id || null;
          updates.kiwify_client_secret = formData.client_secret || null;
          updates.kiwify_account_id = formData.account_id || null;
          break;
        case "hotmart":
          updates.hotmart_client_id = formData.client_id || null;
          updates.hotmart_client_secret = formData.client_secret || null;
          break;
        case "agsell":
          updates.agsell_api_key = formData.api_key || null;
          updates.agsell_base_url = formData.base_url || null;
          break;
        case "whatsapp":
          updates.evolution_api_url = formData.api_url || null;
          updates.evolution_api_key = formData.api_key || null;
          updates.evolution_instance_name = formData.instance_name || null;
          break;
        case "meta": {
          const metaPayload = {
            project_id: projectId,
            access_token: formData.access_token || "",
            ad_account_id: formData.ad_account_id || "",
          };
          if (metaCreds?.id) {
            const { error: metaErr } = await supabase.from("meta_credentials").update(metaPayload).eq("id", metaCreds.id);
            if (metaErr) throw metaErr;
          } else {
            const { error: metaErr } = await supabase.from("meta_credentials").insert(metaPayload);
            if (metaErr) throw metaErr;
          }
          refetchMeta();
          break;
        }
        case "google": {
          const googlePayload = {
            project_id: projectId,
            client_id: formData.client_id || "",
            client_secret: formData.client_secret || "",
            refresh_token: formData.refresh_token || "",
            customer_id: formData.customer_id || "",
          };
          if (googleCreds?.id) {
            const { error: googleErr } = await supabase.from("google_credentials").update(googlePayload).eq("id", googleCreds.id);
            if (googleErr) throw googleErr;
          } else {
            const { error: googleErr } = await supabase.from("google_credentials").insert(googlePayload);
            if (googleErr) throw googleErr;
          }
          refetchGoogle();
          break;
        }
        case "tiktok":
        case "ga4":
          toast({ title: "Em breve", description: `O conector ${configuring.name} será ativado em uma próxima atualização.` });
          setConfiguring(null);
          setSaving(false);
          return;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
        if (error) throw error;
      }

      toast({ title: "Conector salvo", description: `${configuring.name} configurado com sucesso.` });
      setConfiguring(null);
      refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          Hub de Conectores
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecte suas fontes de dados e gerencie integrações
        </p>
      </div>

      {categories.map((cat) => {
        const items = CONNECTORS.filter((c) => c.category === cat);
        return (
          <div key={cat} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{CATEGORY_LABELS[cat]}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((connector) => {
                const existing = getExistingValues(project, connector.id, metaCreds, googleCreds);
                const connected = isConnected(existing);
                const isComingSoon = connector.id === "tiktok" || connector.id === "ga4";

                return (
                  <Card key={connector.id} className="relative overflow-hidden transition-all hover:shadow-md">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: connector.color }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{connector.icon}</span>
                          <CardTitle className="text-base">{connector.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          {isComingSoon && <Badge variant="outline" className="text-xs">Em breve</Badge>}
                          {connected ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <XCircle className="h-3 w-3" /> Inativo
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="text-xs mt-1">{connector.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {connected && (
                        <div className="bg-muted/50 rounded-md p-2 space-y-1">
                          {connector.fields.map((field) => {
                            const val = existing[field.key];
                            if (!val) return null;
                            return (
                              <div key={field.key} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{field.label}:</span>
                                <span className="font-mono text-foreground/70">{maskValue(val, field.type)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={connected ? "outline" : "default"}
                          className="flex-1 text-xs"
                          onClick={() => handleConfigure(connector)}
                        >
                          <Settings2 className="h-3 w-3 mr-1" />
                          {connected ? "Reconfigurar" : "Configurar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="px-2" asChild>
                          <a href={connector.docsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
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

      <Dialog open={!!configuring} onOpenChange={(open) => !open && setConfiguring(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{configuring?.icon}</span>
              Configurar {configuring?.name}
            </DialogTitle>
            <DialogDescription>{configuring?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {configuring?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm">{field.label}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Salvar Conector
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
