import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export function RefreshButton() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (projectId) {
        await queryClient.invalidateQueries({ queryKey: [projectId] });
        // Also invalidate common keys that don't start with projectId but are related
        await queryClient.invalidateQueries({ queryKey: ["sales_events"] });
        await queryClient.invalidateQueries({ queryKey: ["meta_metrics"] });
        await queryClient.invalidateQueries({ queryKey: ["google_metrics"] });
      } else {
        await queryClient.invalidateQueries();
      }
      toast.success("Dados atualizados com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors"
      title="Atualizar dados manualmente"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  );
}
