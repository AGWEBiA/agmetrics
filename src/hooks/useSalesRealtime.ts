import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useSalesRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`sales-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales_events",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const sale = payload.new as any;
          queryClient.invalidateQueries({ queryKey: ["sales_events", projectId] });

          toast({
            title: "🎉 Nova venda!",
            description: `${sale.buyer_name || sale.buyer_email || "Cliente"} — R$ ${Number(sale.amount || 0).toFixed(2)}`,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sales_events",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sales_events", projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, toast]);
}
