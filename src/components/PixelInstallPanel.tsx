import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Code, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: "Copiado!", description: "Snippet copiado para a área de transferência." });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Code className="h-4 w-4 text-primary" />
          Pixel de Rastreamento
          <Badge variant="outline" className="text-xs">Novo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
