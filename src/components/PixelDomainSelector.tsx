import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixelDomainSelectorProps {
  projectId: string;
}

export function PixelDomainSelector({ projectId }: PixelDomainSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if pixel has received any data
  const { data: pixelValidated, isLoading: checkingPixel } = useQuery({
    queryKey: ["pixel_validated", projectId],
    queryFn: async () => {
      const { count } = await supabase
        .from("tracking_events")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);
      return (count || 0) > 0;
    },
  });

  // Get distinct domains detected from tracking events
  const { data: detectedDomains, isLoading: loadingDomains, refetch: refetchDomains } = useQuery({
    queryKey: ["detected_domains", projectId],
    enabled: !!pixelValidated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_events")
        .select("page_url")
        .eq("project_id", projectId)
        .not("page_url", "is", null);
      if (error) throw error;

      const domainSet = new Set<string>();
      (data || []).forEach((row) => {
        try {
          const url = new URL(row.page_url!);
          domainSet.add(url.origin);
        } catch { /* skip invalid urls */ }
      });
      return Array.from(domainSet).sort();
    },
  });

  // Get saved domains
  const { data: savedDomains } = useQuery({
    queryKey: ["project_domains", projectId],
    enabled: !!pixelValidated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_domains")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  // Toggle domain
  const toggleMutation = useMutation({
    mutationFn: async ({ domain, active }: { domain: string; active: boolean }) => {
      const existing = savedDomains?.find((d) => d.domain === domain);
      if (existing) {
        const { error } = await supabase
          .from("project_domains")
          .update({ is_active: active })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_domains")
          .insert({ project_id: projectId, domain, is_active: active });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_domains", projectId] });
      toast({ title: "Domínio atualizado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (checkingPixel || !pixelValidated) return null;

  const isDomainActive = (domain: string) => {
    const saved = savedDomains?.find((d) => d.domain === domain);
    // If no saved domains yet, all are considered active by default
    if (!saved && (!savedDomains || savedDomains.length === 0)) return true;
    return saved?.is_active ?? false;
  };

  const activeCount = detectedDomains?.filter((d) => isDomainActive(d)).length || 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Domínios Detectados
          <Badge variant="outline" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
            Pixel Validado
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O pixel detectou os seguintes domínios/páginas. Selecione quais deseja monitorar neste projeto.
        </p>

        {loadingDomains ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando domínios...
          </div>
        ) : detectedDomains && detectedDomains.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{activeCount} de {detectedDomains.length} domínios ativos</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => refetchDomains()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar
              </Button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {detectedDomains.map((domain) => {
                const active = isDomainActive(domain);
                return (
                  <label
                    key={domain}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      active ? "border-primary/30 bg-primary/5" : "border-border opacity-60"
                    }`}
                  >
                    <Checkbox
                      checked={active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ domain, active: !!checked })
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{domain}</p>
                    </div>
                    {active && (
                      <Badge variant="secondary" className="text-xs shrink-0">Ativo</Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-3">
            <AlertCircle className="h-4 w-4" />
            Nenhum domínio detectado ainda. Aguarde o pixel registrar page views.
          </div>
        )}

        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-muted-foreground">
          <p>💡 Apenas os domínios ativos serão considerados nos relatórios e analytics do projeto.</p>
        </div>
      </CardContent>
    </Card>
  );
}
