import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const PRESETS = [
  { label: "Últimos 7 dias", value: "7d" },
  { label: "Últimos 14 dias", value: "14d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Este mês", value: "this_month" },
  { label: "Mês passado", value: "last_month" },
  { label: "Tudo", value: "all" },
] as const;

function getPresetRange(preset: string): DateRange {
  const today = new Date();
  switch (preset) {
    case "7d": return { from: subDays(today, 7), to: today };
    case "14d": return { from: subDays(today, 14), to: today };
    case "30d": return { from: subDays(today, 30), to: today };
    case "this_month": return { from: startOfMonth(today), to: today };
    case "last_month": {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    default: return { from: undefined, to: undefined };
  }
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const [preset, setPreset] = useState("all");

  const handlePreset = (value: string) => {
    setPreset(value);
    onDateRangeChange(getPresetRange(value));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={handlePreset}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", !dateRange.from && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {dateRange.from ? (
              dateRange.to ? (
                `${format(dateRange.from, "dd/MM", { locale: ptBR })} – ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
              ) : format(dateRange.from, "dd/MM/yy", { locale: ptBR })
            ) : "Personalizado"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={dateRange.from ? { from: dateRange.from, to: dateRange.to } : undefined}
            onSelect={(range) => {
              setPreset("all");
              onDateRangeChange({ from: range?.from, to: range?.to });
            }}
            numberOfMonths={2}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
