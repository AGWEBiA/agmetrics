import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useSalesRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!projectId) return;

    const invalidateAllSalesQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["sales_events", projectId] });
      queryClient.invalidateQueries({ queryKey: ["recent_sales", projectId] });
      queryClient.invalidateQueries({ queryKey: ["sales_events_paginated", projectId] });
      queryClient.invalidateQueries({ queryKey: ["public_sales", projectId] });
      queryClient.invalidateQueries({ queryKey: ["compare_sales"] });
    };

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
          // Invalidate all sales-related queries so dashboards refresh
          invalidateAllSalesQueries();

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
        (payload) => {
          const oldSale = payload.old as any;
          const newSale = payload.new as any;
          // Invalidate all sales-related queries on any update (status change, etc.)
          invalidateAllSalesQueries();

          // Notify on status changes (e.g. approved → refunded)
          if (oldSale.status && newSale.status && oldSale.status !== newSale.status) {
            const statusLabels: Record<string, string> = {
              approved: "Aprovada",
              pending: "Pendente",
              cancelled: "Cancelada",
              refunded: "Reembolsada",
            };
            toast({
              title: "🔄 Status de venda atualizado",
              description: `${newSale.buyer_name || "Cliente"} — ${statusLabels[oldSale.status] || oldSale.status} → ${statusLabels[newSale.status] || newSale.status}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, toast]);
}
