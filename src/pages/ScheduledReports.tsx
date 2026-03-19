import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useProject } from "@/hooks/useProjects";
import { exportDashboardPDF } from "@/lib/exportPDF";
import { FileDown, Clock, Plus, Trash2, Send, Calendar } from "lucide-react";

const AVAILABLE_METRICS = [
  { id: "investment", label: "Investimento" },
  { id: "revenue", label: "Receita" },
  { id: "sales", label: "Vendas" },
  { id: "roi", label: "ROI" },
  { id: "leads", label: "Leads" },
  { id: "cpl", label: "CPL" },
  { id: "cpc", label: "CPC" },
  { id: "ctr", label: "CTR" },
];

export default function ScheduledReports() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId);
  const metrics = useDashboardMetrics(projectId, {}, project?.strategy);

  const [newReport, setNewReport] = useState({
    name: "",
    phone_number: "",
    frequency: "daily" as "daily" | "weekly" | "monthly",
    send_hour: 8,
    metrics: ["investment", "revenue", "sales", "roi"] as string[],
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["whatsapp_report_configs", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_report_configs")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("whatsapp_report_configs").insert({
        project_id: projectId!,
        name: newReport.name || "Relatório agendado",
        phone_number: newReport.phone_number,
        frequency: newReport.frequency,
        send_hour: newReport.send_hour,
        metrics: newReport.metrics as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_report_configs", projectId] });
      toast({ title: "Relatório agendado criado!" });
      setNewReport({ name: "", phone_number: "", frequency: "daily", send_hour: 8, metrics: ["investment", "revenue", "sales", "roi"] });
    },
    onError: () => toast({ title: "Erro ao criar relatório", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("whatsapp_report_configs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp_report_configs", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_report_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_report_configs", projectId] });
      toast({ title: "Relatório removido" });
    },
  });

  const handleExportPDF = () => {
    if (!project || metrics.isLoading) return;
    exportDashboardPDF({
      projectName: project.name,
      totalRevenue: metrics.totalRevenue,
      grossRevenue: metrics.grossRevenue,
      producerRevenue: metrics.producerRevenue,
      salesCount: metrics.salesCount,
      avgTicket: metrics.avgTicket,
      roi: metrics.roi,
      roas: metrics.roas,
      margin: metrics.margin,
      netProfit: metrics.netProfit,
      netProfitProject: metrics.netProfitProject,
      netProfitProducer: metrics.netProfitProducer,
      totalInvestment: metrics.totalInvestment,
      totalLeads: metrics.totalLeads,
      conversionRate: metrics.conversionRate,
      productData: metrics.productData,
    });
    toast({ title: "PDF exportado com sucesso!" });
  };

  const toggleMetric = (metricId: string) => {
    setNewReport((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter((m) => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  const freqLabel: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatórios Agendados</h1>
          <p className="text-sm text-muted-foreground">Configure envios automáticos e exporte PDFs</p>
        </div>
        <Button onClick={handleExportPDF} disabled={metrics.isLoading} className="gap-2 w-full sm:w-auto">
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar PDF Agora</span>
          <span className="sm:hidden">Exportar PDF</span>
        </Button>
      </div>

      {/* Create new report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Relatório Agendado
          </CardTitle>
          <CardDescription>Configure um envio automático via WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do relatório</Label>
              <Input
                placeholder="Ex: Relatório diário"
                value={newReport.name}
                onChange={(e) => setNewReport((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Número WhatsApp</Label>
              <Input
                placeholder="5511999999999"
                value={newReport.phone_number}
                onChange={(e) => setNewReport((p) => ({ ...p, phone_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={newReport.frequency} onValueChange={(v: any) => setNewReport((p) => ({ ...p, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horário de envio</Label>
              <Select value={String(newReport.send_hour)} onValueChange={(v) => setNewReport((p) => ({ ...p, send_hour: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>{`${String(i).padStart(2, "0")}:00`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Métricas incluídas</Label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_METRICS.map((m) => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={newReport.metrics.includes(m.id)}
                    onCheckedChange={() => toggleMetric(m.id)}
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={!newReport.phone_number || createMutation.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Criar Relatório
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Existing reports */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Relatórios Configurados
        </h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !reports?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum relatório agendado configurado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((r) => (
              <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline">{freqLabel[r.frequency] || r.frequency}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      📱 {r.phone_number} • ⏰ {String(r.send_hour).padStart(2, "0")}:00
                      {r.last_sent_at && ` • Último envio: ${new Date(r.last_sent_at).toLocaleDateString("pt-BR")}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Métricas: {(r.metrics as string[]).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: r.id, is_active: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
