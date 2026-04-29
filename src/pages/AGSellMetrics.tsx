import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Mail,
  MousePointerClick,
  Eye,
  Send,
  Users,
  MessageSquare,
  RefreshCw,
  Workflow,
  FileText,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { AGSellLogo } from "@/components/agsell/AGSellLogo";

type MetricRow = {
  metric_type: string;
  data: Record<string, any> | null;
  synced_at: string | null;
};

const formatNumber = (n: unknown) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR").format(v);
};

const formatPercent = (n: unknown) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  // accept 0-1 or 0-100
  const pct = v <= 1 ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d;
  }
};

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function AGSellMetrics() {
  const { projectId } = useParams();
  const [syncing, setSyncing] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project-agsell-meta", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("agsell_api_key, name")
        .eq("id", projectId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: rows, isLoading, refetch } = useQuery({
    queryKey: ["agsell-metrics", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_api_metrics")
        .select("metric_type, data, synced_at")
        .eq("project_id", projectId!)
        .like("metric_type", "agsell_%");
      if (error) throw error;
      return (data || []) as MetricRow[];
    },
    refetchInterval: 60000,
  });

  const byType = useMemo(() => {
    const map: Record<string, MetricRow["data"]> = {};
    let latestSync: string | null = null;
    for (const r of rows || []) {
      const key = r.metric_type.replace(/^agsell_/, "");
      map[key] = r.data;
      if (r.synced_at && (!latestSync || r.synced_at > latestSync)) latestSync = r.synced_at;
    }
    return { map, latestSync };
  }, [rows]);

  const handleSync = async () => {
    if (!projectId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-agsell", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      toast({ title: "Sincronizado", description: `${data?.synced || 0} blocos de métricas atualizados.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync on first visit if there's no data yet
  useEffect(() => {
    if (!isLoading && rows && rows.length === 0 && project?.agsell_api_key && !syncing) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, rows, project?.agsell_api_key]);

  if (!project?.agsell_api_key) {
    return (
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AGSellLogo className="h-7 w-7" /> Métricas AG Sell
        </h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Integração não configurada</AlertTitle>
          <AlertDescription>
            Acesse <strong>AG Sell</strong> no menu lateral e cadastre sua API Key para começar a sincronizar métricas
            de e-mail, WhatsApp, automações e formulários.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const email = byType.map.email || {};
  const overview = byType.map.overview || {};
  const leads = byType.map.leads || {};
  const automations = byType.map.automations || {};
  const forms = byType.map.forms || {};
  const whatsapp = byType.map.whatsapp || {};

  // Email engagement: try common field names
  const emailSent = email.sent ?? email.delivered ?? email.total_sent;
  const emailOpens = email.opens ?? email.opened ?? email.unique_opens;
  const emailClicks = email.clicks ?? email.clicked ?? email.unique_clicks;
  const emailOpenRate = email.open_rate ?? (emailSent && emailOpens ? Number(emailOpens) / Number(emailSent) : undefined);
  const emailClickRate =
    email.click_rate ?? (emailSent && emailClicks ? Number(emailClicks) / Number(emailSent) : undefined);
  const emailCtor =
    email.ctor ?? email.click_to_open_rate ?? (emailOpens && emailClicks ? Number(emailClicks) / Number(emailOpens) : undefined);
  const emailBounces = email.bounces ?? email.bounced;
  const emailUnsub = email.unsubscribes ?? email.unsubscribed;

  const topLinks: Array<{ url: string; clicks: number }> = Array.isArray(email.top_links)
    ? email.top_links
    : Array.isArray(email.links)
      ? email.links
      : [];

  const campaigns: Array<Record<string, any>> = Array.isArray(email.campaigns)
    ? email.campaigns
    : Array.isArray(email.recent_campaigns)
      ? email.recent_campaigns
      : [];

  const groups: Array<{ id: string; name: string; messages: number; lastMessageAt: string | null }> =
    Array.isArray((whatsapp as any).groups) ? (whatsapp as any).groups : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AGSellLogo className="h-7 w-7" /> Métricas AG Sell
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Engajamento de e-mails, WhatsApp, automações e formulários sincronizados da sua conta AG Sell.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Última sincronização: <strong>{formatDate(byType.latestSync)}</strong>
          </span>
          <Button onClick={handleSync} disabled={syncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="email" className="space-y-4">
          <TabsList>
            <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1" /> E-mail</TabsTrigger>
            <TabsTrigger value="whatsapp"><MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp</TabsTrigger>
            <TabsTrigger value="leads"><Users className="h-3.5 w-3.5 mr-1" /> Leads</TabsTrigger>
            <TabsTrigger value="automations"><Workflow className="h-3.5 w-3.5 mr-1" /> Automações</TabsTrigger>
            <TabsTrigger value="forms"><FileText className="h-3.5 w-3.5 mr-1" /> Formulários</TabsTrigger>
          </TabsList>

          {/* EMAIL */}
          <TabsContent value="email" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard icon={Send} label="Enviados" value={formatNumber(emailSent)} />
              <MetricCard
                icon={Eye}
                label="Taxa de abertura"
                value={formatPercent(emailOpenRate)}
                hint={emailOpens != null ? `${formatNumber(emailOpens)} aberturas` : undefined}
              />
              <MetricCard
                icon={MousePointerClick}
                label="Taxa de clique"
                value={formatPercent(emailClickRate)}
                hint={emailClicks != null ? `${formatNumber(emailClicks)} cliques` : undefined}
              />
              <MetricCard
                icon={TrendingUp}
                label="CTOR"
                value={formatPercent(emailCtor)}
                hint="Cliques sobre aberturas"
              />
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard icon={AlertCircle} label="Bounces" value={formatNumber(emailBounces)} />
              <MetricCard icon={AlertCircle} label="Descadastros" value={formatNumber(emailUnsub)} />
              <MetricCard icon={Mail} label="Entregues" value={formatNumber(email.delivered)} />
              <MetricCard icon={MousePointerClick} label="Cliques únicos" value={formatNumber(email.unique_clicks)} />
            </div>

            {topLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Links mais clicados</CardTitle>
                  <CardDescription>Top URLs nos e-mails recentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topLinks.slice(0, 10).map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs truncate max-w-md">{l.url}</TableCell>
                          <TableCell className="text-right">{formatNumber(l.clicks)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {campaigns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Campanhas recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-right">Enviados</TableHead>
                        <TableHead className="text-right">Abertura</TableHead>
                        <TableHead className="text-right">Clique</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.slice(0, 10).map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.name || c.subject || `Campanha ${i + 1}`}</TableCell>
                          <TableCell className="text-right">{formatNumber(c.sent ?? c.delivered)}</TableCell>
                          <TableCell className="text-right">{formatPercent(c.open_rate)}</TableCell>
                          <TableCell className="text-right">{formatPercent(c.click_rate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {!emailSent && topLinks.length === 0 && campaigns.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma métrica de e-mail recebida ainda. Verifique se há campanhas enviadas no AG Sell nos últimos 30
                  dias e clique em <strong>Sincronizar</strong>.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* WHATSAPP */}
          <TabsContent value="whatsapp" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard
                icon={MessageSquare}
                label="Conversas totais"
                value={formatNumber((whatsapp as any).total_conversations)}
              />
              <MetricCard
                icon={Users}
                label="Conversas abertas"
                value={formatNumber((whatsapp as any).open_conversations)}
              />
              <MetricCard
                icon={AlertCircle}
                label="Mensagens não lidas"
                value={formatNumber((whatsapp as any).unread_messages)}
              />
              <MetricCard
                icon={Users}
                label="Grupos detectados"
                value={formatNumber((whatsapp as any).groups_count)}
                hint={(whatsapp as any).last_message_at ? `Última: ${formatDate((whatsapp as any).last_message_at)}` : undefined}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grupos de WhatsApp</CardTitle>
                <CardDescription>
                  Grupos identificados a partir das conversas — quantidade de mensagens e última atividade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum grupo identificado. A API do AG Sell expõe grupos somente quando há conversas marcadas como
                    "group" no inbox.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grupo</TableHead>
                        <TableHead className="text-right">Mensagens</TableHead>
                        <TableHead className="text-right">Última atividade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.slice(0, 30).map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell className="text-right">{formatNumber(g.messages)}</TableCell>
                          <TableCell className="text-right text-xs">{formatDate(g.lastMessageAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {(whatsapp as any).by_assignee && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por atendente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries((whatsapp as any).by_assignee || {}).map(([k, v]) => (
                      <Badge key={k} variant="secondary">
                        {k}: {formatNumber(v as number)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* LEADS */}
          <TabsContent value="leads" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard icon={Users} label="Total de leads" value={formatNumber(leads.total ?? leads.contacts)} />
              <MetricCard icon={Users} label="Novos (período)" value={formatNumber(leads.new ?? leads.created)} />
              <MetricCard icon={TrendingUp} label="Qualificados" value={formatNumber(leads.qualified)} />
              <MetricCard icon={TrendingUp} label="Conversão" value={formatPercent(leads.conversion_rate)} />
            </div>
            {leads.by_source && (
              <Card>
                <CardHeader><CardTitle className="text-base">Por fonte</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(leads.by_source).map(([k, v]) => (
                      <Badge key={k} variant="outline">{k}: {formatNumber(v as number)}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AUTOMATIONS */}
          <TabsContent value="automations" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard icon={Workflow} label="Ativas" value={formatNumber(automations.active ?? automations.total)} />
              <MetricCard icon={Send} label="Execuções" value={formatNumber(automations.executions ?? automations.runs)} />
              <MetricCard icon={TrendingUp} label="Sucesso" value={formatPercent(automations.success_rate)} />
              <MetricCard icon={AlertCircle} label="Falhas" value={formatNumber(automations.failures)} />
            </div>
          </TabsContent>

          {/* FORMS */}
          <TabsContent value="forms" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard icon={FileText} label="Formulários" value={formatNumber(forms.total ?? forms.count)} />
              <MetricCard icon={Send} label="Submissões" value={formatNumber(forms.submissions)} />
              <MetricCard icon={Eye} label="Visualizações" value={formatNumber(forms.views)} />
              <MetricCard icon={TrendingUp} label="Conversão" value={formatPercent(forms.conversion_rate)} />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Overview footer */}
      {Object.keys(overview).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visão geral (raw)</CardTitle>
            <CardDescription>Resposta crua do endpoint /metrics/overview — útil para depuração</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/40 rounded p-3 overflow-auto max-h-64">
{JSON.stringify(overview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
