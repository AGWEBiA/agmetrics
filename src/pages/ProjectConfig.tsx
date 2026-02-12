import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Check, Upload, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProjectStrategy } from "@/types/database";

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

  const [strategy, setStrategy] = useState<ProjectStrategy>("perpetuo");
  const [manualInvestment, setManualInvestment] = useState("0,00");
  const [isActive, setIsActive] = useState(true);
  const [budget, setBudget] = useState("0,00");
  const [metaLeads, setMetaLeads] = useState(false);
  const [googleLeads, setGoogleLeads] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cartOpenDate, setCartOpenDate] = useState("");

  useEffect(() => {
    if (project) {
      setStrategy((project.strategy as ProjectStrategy) || "perpetuo");
      setManualInvestment(Number(project.manual_investment || 0).toFixed(2).replace(".", ","));
      setIsActive(project.is_active ?? true);
      setBudget(Number(project.budget || 0).toFixed(2).replace(".", ","));
      setMetaLeads(project.meta_leads_enabled ?? false);
      setGoogleLeads(project.google_leads_enabled ?? false);
      setStartDate(project.start_date || "");
      setEndDate(project.end_date || "");
      setCartOpenDate(project.cart_open_date || "");
    }
  }, [project]);

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        strategy,
        manual_investment: parseFloat(manualInvestment.replace(",", ".")) || 0,
        is_active: isActive,
        budget: parseFloat(budget.replace(",", ".")) || 0,
        meta_leads_enabled: metaLeads,
        google_leads_enabled: googleLeads,
        start_date: startDate || null,
        end_date: endDate || null,
        cart_open_date: cartOpenDate || null,
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
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>Estratégia</Label>
              <span className="text-xs text-muted-foreground" title="Define como as métricas de conversão são calculadas">ⓘ</span>
            </div>
            <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as ProjectStrategy)} className="space-y-3">
              <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                <RadioGroupItem value="perpetuo" id="cfg-perpetuo" className="mt-0.5" />
                <div>
                  <Label htmlFor="cfg-perpetuo" className="cursor-pointer font-semibold">Perpétuo</Label>
                  <p className="text-sm text-muted-foreground">Ideal para produtos evergreen com vendas contínuas. Taxa de conversão = vendas / visitas.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                <RadioGroupItem value="lancamento" id="cfg-lancamento" className="mt-0.5" />
                <div>
                  <Label htmlFor="cfg-lancamento" className="cursor-pointer font-semibold">Lançamento</Label>
                  <p className="text-sm text-muted-foreground">Para lançamentos com período definido e captação de leads. Taxa de conversão = vendas / leads.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                <RadioGroupItem value="lancamento_pago" id="cfg-lancamento-pago" className="mt-0.5" />
                <div>
                  <Label htmlFor="cfg-lancamento-pago" className="cursor-pointer font-semibold">Lançamento Pago</Label>
                  <p className="text-sm text-muted-foreground">Lançamento com investimento intensivo em tráfego pago. Taxa de conversão = vendas / leads.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                <RadioGroupItem value="funis" id="cfg-funis" className="mt-0.5" />
                <div>
                  <Label htmlFor="cfg-funis" className="cursor-pointer font-semibold">Funis (Webinar/WhatsApp/Chatbot)</Label>
                  <p className="text-sm text-muted-foreground">Para vendas via funis automatizados ou semi-automatizados. Taxa de conversão = vendas / leads.</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {(strategy === "lancamento" || strategy === "lancamento_pago") && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Abertura Carrinho</Label>
                <Input type="date" value={cartOpenDate} onChange={(e) => setCartOpenDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Investimento Manual Adicional (R$)</Label>
            <Input
              placeholder="0,00"
              value={manualInvestment}
              onChange={(e) => setManualInvestment(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Valor adicional de investimento que não vem das APIs (Meta/Google)</p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Status</Label>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm">{isActive ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Orçamento e Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Orçamento Total Provisionado (R$)</Label>
            <Input
              placeholder="10000,00"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Orçamento total previsto para este projeto (Meta + Google + Manual)</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Captação de Leads (Meta Ads)</Label>
              <p className="text-xs text-muted-foreground">Desative se este projeto não utiliza Meta Ads para captar leads</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={metaLeads} onCheckedChange={setMetaLeads} />
              <span className="text-sm">{metaLeads ? "Sim" : "Não"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Contabilizar Leads do Google Ads</Label>
              <p className="text-xs text-muted-foreground">Desative se não deseja incluir leads do Google Ads nas métricas</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={googleLeads} onCheckedChange={setGoogleLeads} />
              <span className="text-sm">{googleLeads ? "Sim" : "Não"}</span>
            </div>
          </div>
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
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = `${supabaseUrl}/functions/v1/webhook-${platform}/${projectId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <CardTitle className="capitalize">{platform}</CardTitle>
        <CardDescription>Configure o webhook para receber vendas em tempo real</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>URL do Webhook</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copie esta URL e cole no painel da {platform === "kiwify" ? "Kiwify" : "Hotmart"} como webhook.
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? "Importando..." : "Importar Vendas CSV"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Colunas aceitas: transaction_id/order_id, product_name/produto, gross_amount/valor_bruto, net_amount/valor_liquido, buyer_email/email, buyer_name/nome, status, sale_date/data
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
