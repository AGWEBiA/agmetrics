import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
  change?: number | null;
}

export function MetricCard({ title, value, subtitle, color, icon, change }: MetricCardProps) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          {icon && <span className={color}>{icon}</span>}
          <p className={`text-xl sm:text-2xl font-bold tracking-tight ${color || ""}`}>{value}</p>
          {change !== null && change !== undefined && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] sm:text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm sm:text-base">{value}</p>
    </div>
  );
}
