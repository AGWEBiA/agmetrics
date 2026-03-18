import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/hooks/useProjects";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Zap,
  Globe,
  Key,
  Webhook,
  Copy,
  ExternalLink,
  TestTube,
} from "lucide-react";
import AGSellFieldMapping from "@/components/agsell/AGSellFieldMapping";

export default function AGSellConfig() {
  const { projectId } = useParams();
  const { data: project, refetch } = useProject(projectId);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (project) {
      setApiKey((project as any).agsell_api_key || "");
      setBaseUrl((project as any).agsell_base_url || "");
    }
  }, [project]);

  const formFieldMapping = (project as any)?.agsell_form_field_mapping || [];

  const isConnected = !!apiKey;

  const defaultBaseUrl = "https://gmemxbfibakfpsjbsvyt.supabase.co/functions/v1/public-api";
  const effectiveBaseUrl = baseUrl || defaultBaseUrl;

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-agsell`;

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          agsell_api_key: apiKey || null,
          agsell_base_url: baseUrl || null,
        } as any)
        .eq("id", projectId);
      if (error) throw error;
      toast({ title: "Salvo", description: "Credenciais AG Sell atualizadas." });
      refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      toast({ title: "Erro", description: "Informe a API Key primeiro.", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${effectiveBaseUrl}/metrics/overview?period=30d`, {
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      });
      if (res.ok) {
        setTestResult("success");
        toast({ title: "Conexão OK", description: "API do AG Sell respondeu com sucesso." });
      } else {
        setTestResult("error");
        toast({ title: "Falha", description: `API retornou status ${res.status}`, variant: "destructive" });
      }
    } catch (err: any) {
      setTestResult("error");
      toast({ title: "Erro de conexão", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    if (!projectId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-agsell", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      toast({ title: "Sincronizado", description: `${data?.synced || 0} métricas importadas do AG Sell.` });
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "URL copiada para a área de transferência." });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            AG Sell
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Integração com automação de e-mails, WhatsApp, Instagram e mais
          </p>
        </div>
        <Badge
          className={
            isConnected
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"
              : "gap-1"
          }
          variant={isConnected ? "default" : "secondary"}
        >
          {isConnected ? (
            <><CheckCircle2 className="h-3 w-3" /> Conectado</>
          ) : (
            <><XCircle className="h-3 w-3" /> Desconectado</>
          )}
        </Badge>
      </div>

      {/* Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credenciais
          </CardTitle>
          <CardDescription>
            Gere sua API Key em <strong>AG Sell → Configurações → API Keys</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">API Key</Label>
            <Input
              type="password"
              placeholder="ag_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Base URL (opcional)</Label>
            <Input
              type="text"
              placeholder={defaultBaseUrl}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar a URL padrão. Use para instâncias self-hosted ou white-label.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !apiKey}>
              {testing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            {testResult === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            {testResult === "error" && <XCircle className="h-5 w-5 text-destructive" />}
          </div>
        </CardContent>
      </Card>

      {/* Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sincronização de Métricas
          </CardTitle>
          <CardDescription>
            Importa overview, e-mail, leads, pipeline, automações e formulários do AG Sell
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSync} disabled={syncing || !isConnected} variant="outline">
            {syncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar Agora
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            As métricas são armazenadas e ficam disponíveis nos dashboards do projeto.
          </p>
        </CardContent>
      </Card>

      {/* Webhook Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhook (Recebimento em Tempo Real)
          </CardTitle>
          <CardDescription>
            Configure esta URL no AG Sell para receber submissões de formulários automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">URL do Webhook</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-xs"
              />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Header obrigatório</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`x-agsell-project-id: ${projectId || "SEU_PROJECT_ID"}`}
                className="font-mono text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(`x-agsell-project-id: ${projectId}`)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Adicione este header customizado na configuração do webhook do AG Sell.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Field Mapping */}
      {projectId && (
        <AGSellFieldMapping
          projectId={projectId}
          initialMapping={formFieldMapping}
          onSaved={() => refetch()}
        />
      )}

      {/* API Endpoints Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Endpoints Disponíveis
          </CardTitle>
          <CardDescription>
            Referência rápida dos endpoints consumidos pela integração
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {[
              // Métricas
              { method: "GET", path: "/metrics/overview", desc: "Resumo geral" },
              { method: "GET", path: "/metrics/email", desc: "Aberturas, cliques, entrega" },
              { method: "GET", path: "/metrics/leads", desc: "Leads por funil/tag/source" },
              { method: "GET", path: "/metrics/pipeline", desc: "Deals por etapa" },
              { method: "GET", path: "/metrics/automations", desc: "Execuções e sucesso" },
              { method: "GET", path: "/metrics/forms", desc: "Submissões e conversão" },
              // Contatos
              { method: "GET", path: "/contacts", desc: "Listar contatos (cursor)" },
              { method: "POST", path: "/contacts", desc: "Criar contato" },
              { method: "GET", path: "/contacts/:id", desc: "Buscar contato" },
              { method: "PUT", path: "/contacts/:id", desc: "Atualizar contato" },
              { method: "PATCH", path: "/contacts/:id", desc: "Atualização parcial" },
              { method: "DELETE", path: "/contacts/:id", desc: "Excluir contato" },
              // Empresas
              { method: "GET", path: "/companies", desc: "Listar empresas" },
              { method: "POST", path: "/companies", desc: "Criar empresa" },
              { method: "GET", path: "/companies/:id", desc: "Buscar empresa" },
              { method: "PUT", path: "/companies/:id", desc: "Atualizar empresa" },
              { method: "PATCH", path: "/companies/:id", desc: "Atualização parcial" },
              { method: "DELETE", path: "/companies/:id", desc: "Excluir empresa" },
              // Negócios
              { method: "GET", path: "/deals", desc: "Listar negócios" },
              { method: "POST", path: "/deals", desc: "Criar negócio" },
              { method: "GET", path: "/deals/:id", desc: "Buscar negócio" },
              { method: "PUT", path: "/deals/:id", desc: "Atualizar negócio" },
              { method: "PATCH", path: "/deals/:id", desc: "Atualização parcial" },
              { method: "DELETE", path: "/deals/:id", desc: "Excluir negócio" },
              // Tags
              { method: "GET", path: "/tags", desc: "Listar tags" },
              { method: "POST", path: "/tags", desc: "Criar tag" },
              { method: "GET", path: "/tags/:id", desc: "Buscar tag" },
              { method: "DELETE", path: "/tags/:id", desc: "Excluir tag" },
              // Formulários
              { method: "GET", path: "/forms", desc: "Listar formulários" },
              { method: "GET", path: "/forms/:id", desc: "Detalhes do formulário" },
              { method: "GET", path: "/forms/:id/submissions", desc: "Submissões com filtros" },
              { method: "POST", path: "/forms/:id/submit", desc: "Submissão pública (sem key)" },
            ].map((ep, idx) => {
              const methodColor = {
                GET: "text-emerald-600 border-emerald-500/30",
                POST: "text-blue-600 border-blue-500/30",
                PUT: "text-amber-600 border-amber-500/30",
                PATCH: "text-orange-600 border-orange-500/30",
                DELETE: "text-red-600 border-red-500/30",
              }[ep.method] || "";
              return (
                <div key={`${ep.method}-${ep.path}-${idx}`} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className={`font-mono text-xs w-16 justify-center shrink-0 ${methodColor}`}>
                    {ep.method}
                  </Badge>
                  <code className="text-xs font-mono text-muted-foreground truncate">{ep.path}</code>
                  <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">{ep.desc}</span>
                </div>
              );
            })}
          </div>
          <Separator className="my-3" />
          <Button variant="link" size="sm" className="p-0 h-auto" asChild>
            <a href="https://agsell.com.br" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Documentação completa do AG Sell
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
