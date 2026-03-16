import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Code, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PixelInstallPanelProps {
  projectId: string;
}

export function PixelInstallPanel({ projectId }: PixelInstallPanelProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const pixelUrl = `${supabaseUrl}/functions/v1/tracking-pixel?pid=${projectId}`;

  const scriptSnippet = `<script src="${pixelUrl}"></script>`;

  const advancedSnippet = `<!-- AGMetrics Tracking Pixel -->
<script src="${pixelUrl}"></script>
<script>
  // Rastrear eventos customizados:
  // AGMetrics.track("button_click", { button: "comprar" });
  // AGMetrics.track("form_submit", { form: "lead" });
</script>`;

  // Real-time pixel status
  const { data: pixelStatus } = useQuery({
    queryKey: ["pixel_status", projectId],
    refetchInterval: 30000, // poll every 30s
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("tracking_events")
        .select("created_at", { count: "exact" })
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const lastEvent = data?.[0]?.created_at || null;
      const total = count || 0;
      // Consider "active" if received event in last 24h
      const isActive = lastEvent
        ? Date.now() - new Date(lastEvent).getTime() < 24 * 60 * 60 * 1000
        : false;
      return { lastEvent, total, isActive };
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: "Copiado!", description: "Snippet copiado para a área de transferência." });
    setTimeout(() => setCopied(null), 2000);
  };

  const statusBadge = pixelStatus ? (
    pixelStatus.isActive ? (
      <Badge variant="outline" className="text-xs border-success/30 text-success gap-1">
        <Activity className="h-3 w-3" /> Ativo
      </Badge>
    ) : pixelStatus.total > 0 ? (
      <Badge variant="outline" className="text-xs border-warning/30 text-warning gap-1">
        <AlertCircle className="h-3 w-3" /> Inativo
      </Badge>
    ) : (
      <Badge variant="outline" className="text-xs gap-1">
        Aguardando dados
      </Badge>
    )
  ) : null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Code className="h-4 w-4 text-primary" />
          Pixel de Rastreamento
          {statusBadge}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        {pixelStatus && pixelStatus.total > 0 && (
          <div className={`rounded-lg border p-3 text-sm flex items-center gap-3 ${
            pixelStatus.isActive
              ? "border-success/20 bg-success/5"
              : "border-warning/20 bg-warning/5"
          }`}>
            {pixelStatus.isActive ? (
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {pixelStatus.isActive ? "Pixel recebendo dados" : "Pixel sem atividade recente"}
              </p>
              <p className="text-xs text-muted-foreground">
                {pixelStatus.total} evento{pixelStatus.total !== 1 ? "s" : ""} registrado{pixelStatus.total !== 1 ? "s" : ""}
                {pixelStatus.lastEvent && (
                  <> · Último há {formatDistanceToNow(new Date(pixelStatus.lastEvent), { locale: ptBR })}</>
                )}
              </p>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Instale o pixel no seu site para rastrear visitantes, page views e UTMs automaticamente.
          Os dados alimentam a Jornada do Lead e o funil de conversão.
        </p>

        {/* Basic snippet */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Instalação básica</p>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto font-mono border">
              {scriptSnippet}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1.5 right-1.5 h-7 w-7 p-0"
              onClick={() => handleCopy(scriptSnippet, "basic")}
            >
              {copied === "basic" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Advanced snippet */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Com eventos customizados</p>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto font-mono border whitespace-pre-wrap">
              {advancedSnippet}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1.5 right-1.5 h-7 w-7 p-0"
              onClick={() => handleCopy(advancedSnippet, "advanced")}
            >
              {copied === "advanced" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📌 Instruções:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Cole o snippet antes do <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> do seu site</li>
            <li>O pixel rastreia automaticamente page views e navegação SPA</li>
            <li>Use <code className="bg-muted px-1 rounded">AGMetrics.track()</code> para eventos customizados</li>
            <li>Os dados aparecem em <strong>Analytics do Pixel</strong> em até 1 minuto</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
