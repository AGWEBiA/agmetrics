import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useMetaCredentialsList, useGoogleCredentials } from "@/hooks/useProjectData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedCard, AnimatedPage } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowLeft, Info, CheckCircle2, XCircle, Clock, AlertTriangle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function IntegrationStatus() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: project } = useProject(projectId);

  // Connection status
  const { data: metaCreds } = useMetaCredentialsList(projectId);
  const { data: googleCreds } = useGoogleCredentials(projectId);
  const metaConnected = (metaCreds || []).length > 0;
  const googleConnected = !!googleCreds;
  const kiwifyConnected = !!project?.kiwify_webhook_token || !!((project as any)?.kiwify_client_id && (project as any)?.kiwify_client_secret && (project as any)?.kiwify_account_id);
  const hotmartConnected = !!project?.hotmart_webhook_token;
  const whatsappConnected = !!(project as any)?.evolution_api_url && !!(project as any)?.evolution_api_key && !!(project as any)?.evolution_instance_name;

  // Last sync times
  const { data: metaLastSync } = useQuery({
    queryKey: ["meta_last_sync", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("meta_metrics")
        .select("last_updated")
        .eq("project_id", projectId!)
        .order("last_updated", { ascending: false })
        .limit(1);
      return data?.[0]?.last_updated || null;
    },
  });

  const { data: googleLastSync } = useQuery({
    queryKey: ["google_last_sync", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("google_metrics")
        .select("last_updated")
        .eq("project_id", projectId!)
        .order("last_updated", { ascending: false })
        .limit(1);
      return data?.[0]?.last_updated || null;
    },
  });

  const { data: kiwifyLastSync } = useQuery({
    queryKey: ["kiwify_last_sync", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales_events")
        .select("created_at")
        .eq("project_id", projectId!)
        .eq("platform", "kiwify")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0]?.created_at || null;
    },
  });

  const { data: hotmartLastSync } = useQuery({
    queryKey: ["hotmart_last_sync", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales_events")
        .select("created_at")
        .eq("project_id", projectId!)
        .eq("platform", "hotmart")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0]?.created_at || null;
    },
  });

  const { data: whatsappLastSync } = useQuery({
    queryKey: ["whatsapp_last_sync", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_groups")
        .select("last_synced_at")
        .eq("project_id", projectId!)
        .not("last_synced_at", "is", null)
        .order("last_synced_at", { ascending: false })
        .limit(1);
      return (data as any)?.[0]?.last_synced_at || null;
    },
  });

  // Sync logs for Meta
  const { data: syncLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["sync_logs", projectId, "meta"],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_sync_logs" as any)
        .select("*")
        .eq("project_id", projectId!)
        .eq("platform", "meta")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
  });

  const lastSuccess = syncLogs?.find((l: any) => l.status === "success");
  const lastError = syncLogs?.find((l: any) => l.status === "error");

  // Sync actions
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const handleSync = async (platform: "meta" | "google" | "whatsapp" | "kiwify" | "hotmart") => {
    setSyncing((p) => ({ ...p, [platform]: true }));
    try {
      const fnMap: Record<string, string> = { meta: "sync-meta", google: "sync-google", whatsapp: "sync-whatsapp", kiwify: "sync-kiwify", hotmart: "sync-hotmart" };
      const fn = fnMap[platform];
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke(fn, {
        body: { project_id: projectId },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.error) throw res.error;
      const labels: Record<string, string> = { meta: "Meta Ads", google: "Google Ads", whatsapp: "WhatsApp", kiwify: "Kiwify", hotmart: "Hotmart" };
      toast({ title: "Sincronização concluída", description: `${labels[platform]} sincronizado com sucesso.` });
      if (platform === "meta") refetchLogs();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
      if (platform === "meta") refetchLogs();
    } finally {
      setSyncing((p) => ({ ...p, [platform]: false }));
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return "Nunca sincronizado";
    try {
      return "Há " + formatDistanceToNow(new Date(dateStr), { locale: ptBR });
    } catch {
      return "Desconhecido";
    }
  };

  const integrations = [
    {
      key: "meta",
      name: "Meta Ads",
      description: "Métricas de campanhas do Facebook e Instagram",
      connected: metaConnected,
      lastSync: metaLastSync,
      canSync: true,
      onSync: () => handleSync("meta"),
    },
    {
      key: "google",
      name: "Google Ads",
      description: "Métricas de campanhas do Google Ads",
      connected: googleConnected,
      lastSync: googleLastSync,
      canSync: true,
      onSync: () => handleSync("google"),
    },
    {
      key: "kiwify",
      name: "Kiwify",
      description: "Vendas e transações da plataforma Kiwify",
      connected: kiwifyConnected,
      lastSync: kiwifyLastSync,
      canSync: true,
      onSync: () => handleSync("kiwify"),
    },
    {
      key: "hotmart",
      name: "Hotmart",
      description: "Vendas e transações da plataforma Hotmart",
      connected: hotmartConnected,
      lastSync: hotmartLastSync,
      canSync: true,
      onSync: () => handleSync("hotmart"),
    },
    {
      key: "whatsapp",
      name: "WhatsApp (Evolution API)",
      description: "Dados de grupos do WhatsApp via Evolution API",
      connected: whatsappConnected,
      lastSync: whatsappLastSync,
      canSync: true,
      onSync: () => handleSync("whatsapp"),
    },
  ];

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Status das Integrações</h1>
          <p className="text-sm text-muted-foreground">Monitore o status e última sincronização de cada plataforma</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/projects/${projectId}/dashboard`)}>
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {integrations.map((int, i) => (
          <AnimatedCard key={int.key} index={i}>
            <Card className={`transition-all ${int.connected ? "border-primary/20" : "border-border"}`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  {int.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg">{int.name}</h3>
                    <p className="text-xs text-muted-foreground">{int.description}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {int.connected ? (
                      <Badge variant="outline" className="text-success border-success/30">Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive border-destructive/30">Desconectado</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Última sincronização:
                    </span>
                    <span className="text-sm font-medium">{formatLastSync(int.lastSync)}</span>
                  </div>
                </div>

                {int.canSync && (
                  <Button
                    className="w-full"
                    variant={int.connected ? "default" : "outline"}
                    disabled={!int.connected || syncing[int.key]}
                    onClick={int.onSync}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing[int.key] ? "animate-spin" : ""}`} />
                    Sincronizar Agora
                  </Button>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      {/* Meta Sync Health Panel */}
      {metaConnected && (
        <AnimatedCard index={5}>
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Log de Saúde — Meta Ads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary cards */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-lg border border-border/40 p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último Sucesso</p>
                  {lastSuccess ? (
                    <>
                      <p className="text-sm font-medium text-success">
                        {format(new Date(lastSuccess.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {lastSuccess.ads_synced} anúncios · {lastSuccess.metrics_synced} métricas · {lastSuccess.duration_ms ? `${(lastSuccess.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum registro</p>
                  )}
                </div>

                <div className="rounded-lg border border-border/40 p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último Erro</p>
                  {lastError ? (
                    <>
                      <p className="text-sm font-medium text-destructive">
                        {format(new Date(lastError.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-[10px] text-destructive/70 line-clamp-2">
                        {lastError.error_message || "Erro desconhecido"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-success">Nenhum erro registrado ✓</p>
                  )}
                </div>

                <div className="rounded-lg border border-border/40 p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Últimas 10 Syncs</p>
                  <div className="flex items-center gap-1 mt-1">
                    {(syncLogs || []).slice(0, 10).reverse().map((log: any, i: number) => (
                      <div
                        key={i}
                        className={`w-3 h-6 rounded-sm ${log.status === "success" ? "bg-success" : "bg-destructive"}`}
                        title={`${log.status === "success" ? "✓" : "✗"} ${format(new Date(log.created_at), "dd/MM HH:mm")}`}
                      />
                    ))}
                    {(!syncLogs || syncLogs.length === 0) && (
                      <p className="text-xs text-muted-foreground">Sem registros</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent log table */}
              {syncLogs && syncLogs.length > 0 && (
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground">
                        <th className="text-left p-2 font-medium">Data</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-right p-2 font-medium">Anúncios</th>
                        <th className="text-right p-2 font-medium">Métricas</th>
                        <th className="text-right p-2 font-medium">Duração</th>
                        <th className="text-left p-2 font-medium">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs.map((log: any) => (
                        <tr key={log.id} className="border-t border-border/20">
                          <td className="p-2 whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM HH:mm:ss")}
                          </td>
                          <td className="p-2">
                            {log.status === "success" ? (
                              <Badge variant="outline" className="text-success border-success/30 text-[10px]">OK</Badge>
                            ) : (
                              <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">Erro</Badge>
                            )}
                          </td>
                          <td className="p-2 text-right font-medium">{log.ads_synced || 0}</td>
                          <td className="p-2 text-right font-medium">{log.metrics_synced || 0}</td>
                          <td className="p-2 text-right text-muted-foreground">
                            {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                          </td>
                          <td className="p-2 text-muted-foreground max-w-[200px] truncate">
                            {log.status === "error" ? log.error_message : `${log.accounts_synced || 0} contas`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      <AnimatedCard index={6}>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold">Sobre o Cache Inteligente</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  As métricas do Meta Ads e Google Ads são armazenadas em cache por 1 hora para melhorar a performance. 
                  Quando o cache expira, os dados são automaticamente atualizados na próxima sincronização.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você pode forçar uma sincronização manual a qualquer momento clicando no botão "Sincronizar Agora".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>
    </AnimatedPage>
  );
}
