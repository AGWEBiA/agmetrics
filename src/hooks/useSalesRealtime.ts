import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Polls for new sales periodically and invalidates caches.
 * Optimized for low server consumption.
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

    // Refetch every 15 minutes as a fallback
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
    }, 900000); // 15 minutes

    return () => clearInterval(interval);
  }, [projectId, queryClient]);
}
