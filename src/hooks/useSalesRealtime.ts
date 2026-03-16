import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/hooks/useNotifications";

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
        async (payload) => {
          const sale = payload.new as any;
          invalidateAllSalesQueries();

          const saleMsg = `${sale.buyer_name || sale.buyer_email || "Cliente"} — R$ ${Number(sale.amount || 0).toFixed(2)}`;

          toast({
            title: "🎉 Nova venda!",
            description: saleMsg,
          });

          // Create in-app notification
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            createNotification({
              userId: user.id,
              projectId,
              type: "sale",
              title: "Nova venda!",
              message: saleMsg,
              metadata: { sale_id: sale.id, amount: sale.amount },
            });
          }
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
        async (payload) => {
          const oldSale = payload.old as any;
          const newSale = payload.new as any;
          invalidateAllSalesQueries();

          if (oldSale.status && newSale.status && oldSale.status !== newSale.status) {
            const statusLabels: Record<string, string> = {
              approved: "Aprovada",
              pending: "Pendente",
              cancelled: "Cancelada",
              refunded: "Reembolsada",
            };
            const msg = `${newSale.buyer_name || "Cliente"} — ${statusLabels[oldSale.status] || oldSale.status} → ${statusLabels[newSale.status] || newSale.status}`;

            toast({
              title: "🔄 Status de venda atualizado",
              description: msg,
            });

            // Create notification for refunds
            if (newSale.status === "refunded") {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                createNotification({
                  userId: user.id,
                  projectId,
                  type: "refund",
                  title: "Reembolso registrado",
                  message: `${newSale.buyer_name || "Cliente"} — R$ ${Number(newSale.amount || 0).toFixed(2)}`,
                  metadata: { sale_id: newSale.id },
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, toast]);
}
