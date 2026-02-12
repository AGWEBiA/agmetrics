import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { ProjectStrategyForm, type ProjectFormData } from "@/components/ProjectStrategyForm";
import {
  useMetaCredentials, useSaveMetaCredentials,
  useGoogleCredentials, useSaveGoogleCredentials,
  useProducts, useCreateProduct, useDeleteProduct,
  useWhatsAppGroups, useCreateWhatsAppGroup, useDeleteWhatsAppGroup,
  useManualInvestments, useCreateManualInvestment, useDeleteManualInvestment,
  useProjectGoals, useCreateProjectGoal, useDeleteProjectGoal, useUpdateProjectGoal,
} from "@/hooks/useProjectData";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Check, Upload, RefreshCw, Send, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProjectConfig() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId);
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">{project?.name || "Carregando..."}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="meta">Meta Ads</TabsTrigger>
          <TabsTrigger value="google">Google Ads</TabsTrigger>
          <TabsTrigger value="kiwify">Kiwify</TabsTrigger>
          <TabsTrigger value="hotmart">Hotmart</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab projectId={projectId!} />
        </TabsContent>
        <TabsContent value="meta">
          <MetaTab projectId={projectId!} />
        </TabsContent>
        <TabsContent value="google">
          <GoogleTab projectId={projectId!} />
        </TabsContent>
        <TabsContent value="kiwify">
          <WebhookTab projectId={projectId!} platform="kiwify" />
        </TabsContent>
        <TabsContent value="hotmart">
          <WebhookTab projectId={projectId!} platform="hotmart" />
        </TabsContent>
        <TabsContent value="whatsapp">
          <WhatsAppTab projectId={projectId!} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab projectId={projectId!} />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsTab projectId={projectId!} />
        </TabsContent>
        <TabsContent value="investments">
          <InvestmentsTab projectId={projectId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ GENERAL TAB ============
function GeneralTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const updateProject = useUpdateProject();
  const { toast } = useToast();

  const [form, setForm] = useState<ProjectFormData>({
    name: "", description: "", strategy: "perpetuo",
    startDate: "", endDate: "", cartOpenDate: "",
    manualInvestment: "0,00", isActive: true, budget: "0,00",
    metaLeads: false, googleLeads: false,
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description || "",
        strategy: (project.strategy as any) || "perpetuo",
        startDate: project.start_date || "",
        endDate: project.end_date || "",
        cartOpenDate: project.cart_open_date || "",
        manualInvestment: Number(project.manual_investment || 0).toFixed(2).replace(".", ","),
        isActive: project.is_active ?? true,
        budget: Number(project.budget || 0).toFixed(2).replace(".", ","),
        metaLeads: project.meta_leads_enabled ?? false,
        googleLeads: project.google_leads_enabled ?? false,
      });
    }
  }, [project]);

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        strategy: form.strategy as any,
        manual_investment: parseFloat(form.manualInvestment.replace(",", ".")) || 0,
        is_active: form.isActive,
        budget: parseFloat(form.budget.replace(",", ".")) || 0,
        meta_leads_enabled: form.metaLeads,
        google_leads_enabled: form.googleLeads,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        cart_open_date: form.cartOpenDate || null,
      });
      toast({ title: "Projeto atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectStrategyForm data={form} onChange={setForm} showExtendedFields />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => window.history.back()}>Cancelar</Button>
        <Button onClick={handleSave} disabled={updateProject.isPending}>
          {updateProject.isPending ? "Salvando..." : "Atualizar"}
        </Button>
      </div>
    </div>
  );
}

// ============ META ADS TAB ============
function MetaTab({ projectId }: { projectId: string }) {
  const { data: creds } = useMetaCredentials(projectId);
  const saveCreds = useSaveMetaCredentials();
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");

  const handleSave = async () => {
    try {
      await saveCreds.mutateAsync({
        project_id: projectId,
        access_token: token || creds?.access_token || "",
        ad_account_id: accountId || creds?.ad_account_id || "",
      });
      toast({ title: "Credenciais salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Meta Ads</CardTitle>
            <CardDescription>Configure a integração com Facebook/Instagram Ads</CardDescription>
          </div>
          <Badge variant={creds ? "default" : "outline"}>{creds ? "Conectado" : "Desconectado"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Access Token</Label>
          <Input
            type="password"
            placeholder={creds ? "••••••••" : "Cole seu access token aqui"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Ad Account ID</Label>
          <Input
            placeholder={creds?.ad_account_id || "act_XXXXXXXXXX"}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saveCreds.isPending}>
            {saveCreds.isPending ? "Salvando..." : "Salvar Credenciais"}
          </Button>
          <SyncButton projectId={projectId} platform="meta" disabled={!creds} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ GOOGLE ADS TAB ============
function GoogleTab({ projectId }: { projectId: string }) {
  const { data: creds } = useGoogleCredentials(projectId);
  const saveCreds = useSaveGoogleCredentials();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [customerId, setCustomerId] = useState("");

  const handleSave = async () => {
    try {
      await saveCreds.mutateAsync({
        project_id: projectId,
        client_id: clientId || creds?.client_id || "",
        client_secret: clientSecret || creds?.client_secret || "",
        refresh_token: refreshToken || creds?.refresh_token || "",
        customer_id: customerId || creds?.customer_id || "",
      });
      toast({ title: "Credenciais salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Google Ads</CardTitle>
            <CardDescription>Configure a integração com Google Ads</CardDescription>
          </div>
          <Badge variant={creds ? "default" : "outline"}>{creds ? "Conectado" : "Desconectado"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input placeholder={creds?.client_id || "Client ID"} value={clientId} onChange={(e) => setClientId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <Input type="password" placeholder={creds ? "••••" : "Client Secret"} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Refresh Token</Label>
            <Input type="password" placeholder={creds ? "••••" : "Refresh Token"} value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Customer ID</Label>
            <Input placeholder={creds?.customer_id || "XXX-XXX-XXXX"} value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saveCreds.isPending}>
            {saveCreds.isPending ? "Salvando..." : "Salvar Credenciais"}
          </Button>
          <SyncButton projectId={projectId} platform="google" disabled={!creds} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ SYNC BUTTON ============
function SyncButton({ projectId, platform, disabled }: { projectId: string; platform: "meta" | "google"; disabled: boolean }) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const res = await fetch(`${supabaseUrl}/functions/v1/sync-${platform}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");
      toast({ title: `Sincronização concluída`, description: `${result.synced} dias sincronizados` });
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleSync} disabled={disabled || syncing}>
      <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Sincronizando..." : "Sincronizar Métricas"}
    </Button>
  );
}

// ============ WEBHOOK TAB (Kiwify / Hotmart) ============
function WebhookTab({ projectId, platform }: { projectId: string; platform: "kiwify" | "hotmart" }) {
  const { data: project } = useProject(projectId);
  const updateProject = useUpdateProject();
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [webhookToken, setWebhookToken] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = `${supabaseUrl}/functions/v1/webhook-${platform}/${projectId}`;
  const platformLabel = platform === "kiwify" ? "Kiwify" : "Hotmart";
  const tokenField = platform === "kiwify" ? "kiwify_webhook_token" : "hotmart_webhook_token";

  useEffect(() => {
    if (project) {
      setWebhookToken((project as any)[tokenField] || "");
    }
  }, [project, tokenField]);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToken = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        [tokenField]: webhookToken || null,
      });
      toast({ title: "Token salvo!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      const testPayload = platform === "kiwify"
        ? {
            order_id: `test_${Date.now()}`,
            order_status: "paid",
            order_amount: "97.00",
            net_value: "87.30",
            Product: { product_name: "Produto Teste" },
            Customer: { email: "teste@teste.com", full_name: "Cliente Teste" },
            created_at: new Date().toISOString(),
            ...(webhookToken ? { webhook_token: webhookToken } : {}),
          }
        : {
            event: "PURCHASE_COMPLETE",
            data: {
              purchase: {
                transaction: `test_${Date.now()}`,
                product: { name: "Produto Teste" },
                price: { value: "97.00", net_value: "87.30" },
                buyer: { email: "teste@teste.com", name: "Cliente Teste" },
                status: "approved",
              },
              ...(webhookToken ? { hottok: webhookToken } : {}),
            },
          };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookToken ? { "x-webhook-token": webhookToken, "x-hotmart-hottok": webhookToken } : {}),
        },
        body: JSON.stringify(testPayload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Test failed");
      toast({ title: "Webhook testado com sucesso!", description: "Uma venda de teste foi criada." });
    } catch (err: any) {
      toast({ title: "Erro no teste", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteTestSales = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("sales_events")
        .delete()
        .eq("project_id", projectId)
        .eq("platform", platform)
        .like("external_id", "test_%");

      if (error) throw error;
      toast({ title: "Vendas de teste excluídas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", projectId);
      formData.append("platform", platform);

      const res = await fetch(`${supabaseUrl}/functions/v1/import-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Import failed");
      toast({
        title: "Importação concluída",
        description: `${result.imported} vendas importadas, ${result.skipped} ignoradas`,
      });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração da {platformLabel}</CardTitle>
        <CardDescription>Configure o webhook para receber eventos de vendas automaticamente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>URL do Webhook</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole esta URL no painel da {platformLabel} em: {platform === "hotmart" ? "Ferramentas → Webhooks" : "Configurações → Webhooks"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            {platform === "hotmart" ? "Token de Validação (X-Hotmart-Hottok)" : "Token de Validação (x-webhook-token)"}
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder={platform === "hotmart" ? "Digite o token da Hotmart" : "Digite o token da Kiwify"}
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
            />
            <Button onClick={handleSaveToken} disabled={updateProject.isPending}>
              <Save className="mr-1 h-4 w-4" />
              Salvar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Token para validar a origem dos webhooks {platform === "hotmart" ? "(header X-Hotmart-Hottok)" : "(header x-webhook-token)"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleTestWebhook} disabled={testing}>
            <Send className="mr-2 h-4 w-4" />
            {testing ? "Testando..." : "Testar Webhook"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? "Importando..." : "Importar Vendas CSV"}
          </Button>
          <Button variant="destructive" onClick={handleDeleteTestSales} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Excluindo..." : "Excluir Vendas de Teste"}
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-2">
          <h4 className="font-semibold">Como configurar:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Copie a URL do webhook acima</li>
            <li>Acesse o painel da {platformLabel}</li>
            <li>Vá em {platform === "hotmart" ? "Ferramentas → Webhooks" : "Configurações → Webhooks"}</li>
            <li>Cole a URL e configure os eventos desejados</li>
            <li>Configure o token de validação {platform === "hotmart" ? "(X-Hotmart-Hottok)" : "(x-webhook-token)"}</li>
            <li>Teste enviando um evento de teste da {platformLabel}</li>
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">
          Colunas aceitas no CSV: transaction_id/order_id, product_name/produto, gross_amount/valor_bruto/total com acréscimo, net_amount/valor_liquido/valor líquido, buyer_email/email, buyer_name/cliente/nome, status, sale_date/data de criação/data
        </p>
      </CardContent>
    </Card>
  );
}

// ============ WHATSAPP TAB ============
function WhatsAppTab({ projectId }: { projectId: string }) {
  const { data: groups, isLoading } = useWhatsAppGroups(projectId);
  const createGroup = useCreateWhatsAppGroup();
  const deleteGroup = useDeleteWhatsAppGroup();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [engagement, setEngagement] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = async () => {
    try {
      await createGroup.mutateAsync({
        project_id: projectId,
        name,
        member_count: parseInt(members) || 0,
        engagement_rate: parseFloat(engagement) || 0,
        notes: notes || null,
      });
      toast({ title: "Grupo adicionado!" });
      setOpen(false);
      setName(""); setMembers(""); setEngagement(""); setNotes("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Grupos WhatsApp</CardTitle>
            <CardDescription>Gerencie os grupos do seu lançamento</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar Grupo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Grupo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-1"><Label>Membros</Label><Input type="number" value={members} onChange={(e) => setMembers(e.target.value)} /></div>
                <div className="space-y-1"><Label>Taxa de Engajamento (%)</Label><Input type="number" step="0.01" value={engagement} onChange={(e) => setEngagement(e.target.value)} /></div>
                <div className="space-y-1"><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!name || createGroup.isPending}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!groups?.length ? (
          <p className="py-8 text-center text-muted-foreground">Nenhum grupo cadastrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>Engajamento</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.member_count}</TableCell>
                  <TableCell>{g.engagement_rate}%</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteGroup.mutate({ id: g.id, project_id: projectId })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ PRODUCTS TAB ============
function ProductsTab({ projectId }: { projectId: string }) {
  const { data: products } = useProducts(projectId);
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"main" | "order_bump">("main");
  const [platform, setPlatform] = useState<"kiwify" | "hotmart" | "both">("both");
  const [price, setPrice] = useState("");

  const handleCreate = async () => {
    try {
      await createProduct.mutateAsync({
        project_id: projectId,
        name,
        type,
        platform,
        price: parseFloat(price) || 0,
      });
      toast({ title: "Produto adicionado!" });
      setOpen(false);
      setName(""); setPrice("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Produtos</CardTitle>
            <CardDescription>Configure com os mesmos nomes usados na Kiwify/Hotmart</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar Produto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Principal</SelectItem>
                      <SelectItem value="order_bump">Order Bump</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Plataforma</Label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Ambas</SelectItem>
                      <SelectItem value="kiwify">Kiwify</SelectItem>
                      <SelectItem value="hotmart">Hotmart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!name || createProduct.isPending}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!products?.length ? (
          <p className="py-8 text-center text-muted-foreground">Nenhum produto cadastrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.type === "main" ? "Principal" : "Order Bump"}</Badge></TableCell>
                  <TableCell className="capitalize">{p.platform}</TableCell>
                  <TableCell>R$ {Number(p.price).toFixed(2).replace(".", ",")}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteProduct.mutate({ id: p.id, project_id: projectId })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ GOALS TAB ============
function GoalsTab({ projectId }: { projectId: string }) {
  const { data: goals } = useProjectGoals(projectId);
  const createGoal = useCreateProjectGoal();
  const deleteGoal = useDeleteProjectGoal();
  const updateGoal = useUpdateProjectGoal();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("revenue");
  const [targetValue, setTargetValue] = useState("");
  const [period, setPeriod] = useState<string>("total");

  const goalLabels: Record<string, string> = {
    revenue: "Receita",
    sales: "Vendas",
    roi: "ROI",
    leads: "Leads",
    margin: "Margem",
  };

  const periodLabels: Record<string, string> = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
    total: "Total",
  };

  const handleCreate = async () => {
    try {
      await createGoal.mutateAsync({
        project_id: projectId,
        type,
        target_value: parseFloat(targetValue.replace(",", ".")) || 0,
        period,
      });
      toast({ title: "Meta adicionada!" });
      setOpen(false);
      setTargetValue("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Metas</CardTitle>
            <CardDescription>Defina metas para acompanhar o progresso do lançamento</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar Meta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(goalLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Valor Alvo</Label><Input placeholder="30.000,00" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} /></div>
                <div className="space-y-1">
                  <Label>Período</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(periodLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!targetValue || createGoal.isPending}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!goals?.length ? (
          <p className="py-8 text-center text-muted-foreground">Nenhuma meta cadastrada</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor Alvo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{goalLabels[g.type]}</TableCell>
                  <TableCell>{g.type === "roi" || g.type === "margin" ? `${Number(g.target_value).toFixed(1)}%` : `R$ ${Number(g.target_value).toFixed(2).replace(".", ",")}`}</TableCell>
                  <TableCell>{periodLabels[g.period]}</TableCell>
                  <TableCell>
                    <Switch
                      checked={g.is_active}
                      onCheckedChange={(checked) =>
                        updateGoal.mutate({ id: g.id, project_id: projectId, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteGoal.mutate({ id: g.id, project_id: projectId })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ============ INVESTMENTS TAB ============
function InvestmentsTab({ projectId }: { projectId: string }) {
  const { data: investments } = useManualInvestments(projectId);
  const createInvestment = useCreateManualInvestment();
  const deleteInvestment = useDeleteManualInvestment();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const handleCreate = async () => {
    try {
      await createInvestment.mutateAsync({
        project_id: projectId,
        amount: parseFloat(amount.replace(",", ".")) || 0,
        description: description || null,
        date,
      });
      toast({ title: "Investimento adicionado!" });
      setOpen(false);
      setAmount(""); setDescription(""); setDate("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const total = investments?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Investimentos Manuais</CardTitle>
            <CardDescription>
              Total: R$ {total.toFixed(2).replace(".", ",")}
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Investimento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Valor (R$)</Label><Input placeholder="1.000,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div className="space-y-1"><Label>Descrição</Label><Input placeholder="Ex: Equipe de copywriting" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="space-y-1"><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!amount || !date || createInvestment.isPending}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!investments?.length ? (
          <p className="py-8 text-center text-muted-foreground">Nenhum investimento cadastrado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{new Date(inv.date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{inv.description || "—"}</TableCell>
                  <TableCell className="font-medium">R$ {Number(inv.amount).toFixed(2).replace(".", ",")}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteInvestment.mutate({ id: inv.id, project_id: projectId })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
