import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/formatters";
import { exportCSV } from "@/lib/exportCSV";
import { AnimatedPage } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "Aprovada", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  refunded: { label: "Reembolsada", variant: "outline" },
};

export default function SalesTable() {
  const { projectId } = useParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["sales_events_full", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_events" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60000,
  });

  const filtered = allSales.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (platformFilter !== "all" && s.platform !== platformFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        (s.buyer_name || "").toLowerCase().includes(q) ||
        (s.buyer_email || "").toLowerCase().includes(q) ||
        (s.product_name || "").toLowerCase().includes(q) ||
        (s.external_id || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleCSVExport = () => {
    const csvData = filtered.map((s) => ({
      Data: s.sale_date ? new Date(s.sale_date).toLocaleDateString("pt-BR") : "",
      Cliente: s.buyer_name || "",
      Email: s.buyer_email || "",
      Produto: s.product_name || "",
      Plataforma: s.platform,
      Status: s.status,
      Valor_Bruto: Number(s.gross_amount || 0),
      Valor_Liquido: Number(s.amount || 0),
    }));
    exportCSV(csvData, "vendas");
  };

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} registros</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCSVExport}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Todas as Vendas</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-8 w-full sm:w-[220px]"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="approved">Aprovadas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                    <SelectItem value="refunded">Reembolsadas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="kiwify">Kiwify</SelectItem>
                    <SelectItem value="hotmart">Hotmart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : paginated.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma venda encontrada</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((s) => {
                      const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {s.sale_date ? new Date(s.sale_date).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{s.buyer_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{s.buyer_email || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{s.product_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">{s.platform}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatBRL(Number(s.gross_amount || 0))}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatBRL(Number(s.amount || 0))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {paginated.map((s) => {
                  const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
                  return (
                    <div key={s.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{s.buyer_name || "—"}</p>
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.buyer_email || ""}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{s.product_name || "—"}</span>
                        <span className="font-bold">{formatBRL(Number(s.amount || 0))}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{s.sale_date ? new Date(s.sale_date).toLocaleDateString("pt-BR") : "—"}</span>
                        <Badge variant="outline" className="capitalize text-[10px]">{s.platform}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AnimatedPage>
  );
}
