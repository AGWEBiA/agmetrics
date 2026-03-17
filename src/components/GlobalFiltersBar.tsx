import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function GlobalFiltersBar() {
  const { filters, setFilters, resetFilters, hasActiveFilters } = useGlobalFilters();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros Globais</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">Ativos</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter
          dateRange={filters.dateRange}
          onDateRangeChange={(dateRange) => setFilters({ dateRange })}
        />
        <Select value={filters.platform} onValueChange={(v: any) => setFilters({ platform: v })}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="kiwify">Kiwify</SelectItem>
            <SelectItem value="hotmart">Hotmart</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v: any) => setFilters({ status: v })}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Input
            placeholder="UTM Source"
            className="w-[140px] h-8 text-xs"
            value={filters.utmSource}
            onChange={(e) => setFilters({ utmSource: e.target.value })}
          />
          <Input
            placeholder="UTM Medium"
            className="w-[140px] h-8 text-xs"
            value={filters.utmMedium}
            onChange={(e) => setFilters({ utmMedium: e.target.value })}
          />
          <Input
            placeholder="UTM Campaign"
            className="w-[140px] h-8 text-xs"
            value={filters.utmCampaign}
            onChange={(e) => setFilters({ utmCampaign: e.target.value })}
          />
          <Input
            placeholder="Produto"
            className="w-[140px] h-8 text-xs"
            value={filters.productName}
            onChange={(e) => setFilters({ productName: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
