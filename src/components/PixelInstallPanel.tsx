import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Code, CheckCircle2, AlertCircle, Activity, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportPixelPDF } from "@/lib/exportPixelPDF";

interface PixelInstallPanelProps {
  projectId: string;
  projectName?: string;
}

export function PixelInstallPanel({ projectId, projectName = "Projeto" }: PixelInstallPanelProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const pixelUrl = `${supabaseUrl}/functions/v1/tracking-pixel?pid=${projectId}`;

  const basicSnippet = `<!-- AGMetrics Pixel - Cole antes do </body> -->
<script src="${pixelUrl}"></script>`;

  const fullSnippet = `<!-- AGMetrics Pixel Completo -->
<script src="${pixelUrl}&track=all"></script>
<script>
  // O pixel rastreia automaticamente:
  // ✓ Page views e navegação SPA
  // ✓ Cliques em botões e links
  // ✓ Profundidade de scroll (25%, 50%, 75%, 100%)
  // ✓ Movimentos do mouse (mapa de calor)
  //
  // Eventos customizados (use dentro de addEventListener):
  // document.getElementById("meuBotao").addEventListener("click", function() {
  //   window.AGMetrics?.track("button_click", { button: "comprar" });
  // });
  //
  // Ou via atributo onclick no HTML:
  // <button onclick="window.AGMetrics?.track('lead', { form: 'newsletter' })">Enviar</button>
</script>`;

  const checkoutSnippet = `<!-- AGMetrics - Checkout Kiwify / Hotmart -->
<!-- Cole no campo de "Scripts personalizados" ou "Pixel/Tracking" -->
<!-- da sua plataforma de vendas (Kiwify ou Hotmart). -->

<script src="${pixelUrl}&track=all"></script>
<script>
  // Rastreia automaticamente a visita ao checkout.
  // Eventos customizados opcionais:
  //
  // Quando o usuário iniciar o preenchimento do formulário:
  // window.AGMetrics?.track("checkout_start", {
  //   product: "Nome do Produto"
  // });
  //
  // ─── Kiwify ───
  // No painel Kiwify: Produto → Configurações → Checkout → Scripts
  // Cole este snippet inteiro no campo de scripts do checkout.
  //
  // ─── Hotmart ───
  // No painel Hotmart: Produto → Editar → Checkout → Pixel de rastreamento
  // Cole este snippet inteiro no campo de scripts personalizados.
</script>`;

  const thankYouSnippet = `<!-- AGMetrics - Página de Obrigado -->
<script src="${pixelUrl}&track=all"></script>
<script>
  // Dispara o evento de conversão quando a página carregar
  // (seguro mesmo se o pixel falhar ao carregar)
  window.AGMetrics?.track("thank_you_page", {
    page: window.location.pathname,
    referrer: document.referrer
  });
</script>`;

  // Real-time pixel status
  const { data: pixelStatus } = useQuery({
    queryKey: ["pixel_status", projectId],
    refetchInterval: 30000,
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
      <Badge variant="outline" className="text-xs gap-1">Aguardando dados</Badge>
    )
  ) : null;

  const SnippetBlock = ({ code, id, label }: { code: string; id: string; label: string }) => (
    <div className="space-y-2">
      <div className="relative">
        <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto font-mono border whitespace-pre-wrap">
          {code}
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-1.5 right-1.5 h-7 w-7 p-0"
          onClick={() => handleCopy(code, id)}
        >
          {copied === id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );

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
            pixelStatus.isActive ? "border-success/20 bg-success/5" : "border-warning/20 bg-warning/5"
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
          Instale o pixel no seu site para rastrear visitantes, cliques, scroll e mapa de calor automaticamente.
        </p>

        <Tabs defaultValue="full" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="text-xs flex-1">Básico</TabsTrigger>
            <TabsTrigger value="full" className="text-xs flex-1">Completo</TabsTrigger>
            <TabsTrigger value="thankyou" className="text-xs flex-1">Obrigado</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Rastreia apenas page views e UTMs.</p>
            <SnippetBlock code={basicSnippet} id="basic" label="Básico" />
          </TabsContent>

          <TabsContent value="full" className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              Rastreia page views, cliques, scroll depth e mapa de calor. <strong>Recomendado.</strong>
            </p>
            <SnippetBlock code={fullSnippet} id="full" label="Completo" />
          </TabsContent>

          <TabsContent value="thankyou" className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              Use <strong>apenas</strong> na página de obrigado/confirmação. Já inclui o rastreamento completo.
            </p>
            <SnippetBlock code={thankYouSnippet} id="thankyou" label="Obrigado" />
          </TabsContent>
        </Tabs>

        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📌 Como instalar:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Cole o snippet <strong>Completo</strong> em todas as páginas antes do <code className="bg-muted px-1 rounded">&lt;/body&gt;</code></li>
            <li>Na página de obrigado, use o snippet <strong>Obrigado</strong> no lugar</li>
            <li>Os dados aparecem em <strong>Analytics do Pixel</strong> e <strong>Mapa de Calor</strong> em até 1 minuto</li>
          </ul>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() =>
            exportPixelPDF({
              projectName,
              projectId,
              pixelUrl,
              basicSnippet,
              fullSnippet,
              thankYouSnippet,
            })
          }
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF com instruções para o webdesigner
        </Button>
      </CardContent>
    </Card>
  );
}
