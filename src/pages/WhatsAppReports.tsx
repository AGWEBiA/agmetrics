import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Send, Loader2, MessageSquare, Clock, Phone } from "lucide-react";

const AVAILABLE_METRICS = [
  { key: "investment", label: "Investimento", emoji: "💰" },
  { key: "revenue", label: "Faturamento", emoji: "💵" },
  { key: "sales", label: "Vendas", emoji: "🛒" },
  { key: "roi", label: "ROI", emoji: "📈" },
  { key: "leads", label: "Leads", emoji: "👥" },
  { key: "cpl", label: "CPL", emoji: "💲" },
  { key: "cpc", label: "CPC", emoji: "🖱️" },
  { key: "ctr", label: "CTR", emoji: "📊" },
  { key: "impressions", label: "Impressões", emoji: "👁️" },
  { key: "clicks", label: "Cliques", emoji: "🔗" },
  { key: "purchases", label: "Compras (Meta)", emoji: "🎯" },
  { key: "cost_per_purchase", label: "Custo por Compra", emoji: "💸" },
  { key: "avg_ticket", label: "Ticket Médio", emoji: "🎫" },
  { key: "refunds", label: "Reembolsos", emoji: "↩️" },
];

export default function WhatsAppReports() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("Relatório diário");
  const [phone, setPhone] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [sendHour, setSendHour] = useState("8");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["investment", "revenue", "sales", "roi", "leads", "cpl"]);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["whatsapp_report_configs", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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
      const { error } = await (supabase as any)
        .from("whatsapp_report_configs")
        .insert({
          project_id: projectId!,
          name,
          phone_number: phone,
          frequency: frequency as any,
          send_hour: parseInt(sendHour),
          metrics: selectedMetrics,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_report_configs", projectId] });
      toast({ title: "Relatório criado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("whatsapp_report_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_report_configs", projectId] });
      toast({ title: "Relatório removido" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("whatsapp_report_configs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp_report_configs", projectId] }),
  });

  const sendNow = async (configId: string) => {
    setSending(configId);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-report", {
        body: { config_id: configId },
      });
      if (error) throw error;
      toast({ title: "Relatório enviado!", description: `${data.sent} mensagem(ns) enviada(s)` });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_report_configs", projectId] });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const resetForm = () => {
    setName("Relatório diário");
    setPhone("");
    setFrequency("daily");
    setSendHour("8");
    setSelectedMetrics(["investment", "revenue", "sales", "roi", "leads", "cpl"]);
  };

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const freqLabel = (f: string) =>
    f === "daily" ? "Diário" : f === "weekly" ? "Semanal" : "Mensal";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Relatórios WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure envios automáticos de métricas via WhatsApp
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo Relatório
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Relatório WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do relatório</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Relatório diário" />
              </div>

              <div className="space-y-2">
                <Label>Número WhatsApp (com DDD)</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="5511999999999" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
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
                  <Select value={sendHour} onValueChange={setSendHour}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {String(i).padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Métricas selecionadas</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {AVAILABLE_METRICS.map(m => (
                    <label
                      key={m.key}
                      className="flex items-center gap-2 p-2 rounded-md border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedMetrics.includes(m.key)}
                        onCheckedChange={() => toggleMetric(m.key)}
                      />
                      <span className="text-xs">
                        {m.emoji} {m.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!phone || selectedMetrics.length === 0 || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Criar Relatório
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !configs || configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum relatório configurado. Crie um para receber métricas automaticamente via WhatsApp.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((config: any) => {
            const metrics = (config.metrics || []) as string[];
            return (
              <Card key={config.id} className={!config.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{config.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Phone className="h-3 w-3" />
                        {config.phone_number}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={is_active => toggleMutation.mutate({ id: config.id, is_active })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {freqLabel(config.frequency)} às {String(config.send_hour).padStart(2, "0")}:00
                    {config.last_sent_at && (
                      <span className="ml-auto">
                        Último: {new Date(config.last_sent_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {metrics.slice(0, 6).map(key => {
                      const m = AVAILABLE_METRICS.find(a => a.key === key);
                      return (
                        <Badge key={key} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {m?.emoji} {m?.label || key}
                        </Badge>
                      );
                    })}
                    {metrics.length > 6 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        +{metrics.length - 6}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => sendNow(config.id)}
                      disabled={sending === config.id || !config.is_active}
                    >
                      {sending === config.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      Enviar agora
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs"
                      onClick={() => deleteMutation.mutate(config.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
