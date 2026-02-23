import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTimeBR } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ExternalLink } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "Aprovada", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  refunded: { label: "Reembolsada", variant: "outline" },
};

interface RecentSalesCardProps {
  projectId: string | undefined;
}

export function RecentSalesCard({ projectId }: RecentSalesCardProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  const { data: sales = [] } = useQuery({
    queryKey: ["recent_sales", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events")
        .select("id, buyer_name, buyer_email, product_name, status, amount, gross_amount, platform, sale_date")
        .eq("project_id", projectId!)
        .order("sale_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60000,
  });

  const filtered = statusFilter === "all"
    ? sales
    : sales.filter((s) => s.status === statusFilter);

  const displayed = filtered.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Últimas Vendas</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="refunded">Reembolsadas</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => navigate(`/admin/projects/${projectId}/sales`)}
            >
              Ver todas
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma venda encontrada</p>
        ) : (
          <div className="space-y-2">
            {displayed.map((s) => {
              const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{s.buyer_name || "—"}</p>
                      <Badge variant={st.variant} className="text-[10px] shrink-0">{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{s.product_name || "—"}</span>
                      <span>•</span>
                      <Badge variant="outline" className="capitalize text-[10px]">{s.platform}</Badge>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {formatDateTimeBR(s.sale_date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold">{formatBRL(Number(s.amount || 0))}</p>
                    {Number(s.gross_amount || 0) !== Number(s.amount || 0) && (
                      <p className="text-[10px] text-muted-foreground line-through">
                        {formatBRL(Number(s.gross_amount || 0))}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
