import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Polls for new sales every 30s and invalidates caches.
 * We removed sales_events from Realtime publication to prevent PII leakage,
 * so we use polling as a secure alternative.
 */
export function useSalesRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const lastCheckRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!projectId) return;

    const invalidateAllSalesQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["sales_events", projectId] });
      queryClient.invalidateQueries({ queryKey: ["recent_sales", projectId] });
      queryClient.invalidateQueries({ queryKey: ["sales_events_paginated", projectId] });
      queryClient.invalidateQueries({ queryKey: ["public_sales", projectId] });
      queryClient.invalidateQueries({ queryKey: ["compare_sales"] });
    };

    const interval = setInterval(async () => {
      try {
        const { count } = await supabase
          .from("sales_events")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .gt("created_at", lastCheckRef.current);

        if (count && count > 0) {
          lastCheckRef.current = new Date().toISOString();
          invalidateAllSalesQueries();
        }
      } catch {
        // Silent fail — polling is best-effort
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId, queryClient]);
}
