import { isValidElement, createElement } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode | React.ComponentType<any>;
  change?: number | null;
  loading?: boolean;
}

export function MetricCard({ title, value, subtitle, color, icon: Icon, change, loading }: MetricCardProps) {
  const renderedIcon = Icon
    ? isValidElement(Icon)
      ? Icon
      : createElement(Icon as React.ComponentType<any>, { className: "h-4 w-4" })
    : null;

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 glass-card border-border/40">
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        color?.includes("success") ? "bg-success" : 
        color?.includes("destructive") ? "bg-destructive" : 
        "bg-primary"
      )} />
      
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 leading-tight">
            {title}
          </p>
          {renderedIcon && (
            <div className={cn(
              "p-2 rounded-xl bg-muted/50 group-hover:scale-110 transition-transform duration-300",
              color
            )}>
              {renderedIcon}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <p className={cn(
            "text-2xl sm:text-3xl font-bold tracking-tight text-gradient",
            color
          )}>
            {loading ? "..." : value}
          </p>
          {change !== null && change !== undefined && (
            <div className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold modern-shadow animate-in fade-in slide-in-from-bottom-1",
              change >= 0 ? "bg-success/10 text-success border border-success/20" : "bg-destructive/10 text-destructive border border-destructive/20"
            )}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        
        {subtitle && (
          <p className="mt-1 text-[11px] text-muted-foreground font-medium flex items-center gap-1 opacity-80">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <p className={cn("font-bold text-sm sm:text-base tracking-tight", color)}>{value}</p>
    </div>
  );
}
