import { formatNumber, formatPercent } from "@/lib/formatters";

const FUNNEL_COLORS = [
  "hsl(220, 90%, 56%)",   // Impressões - blue
  "hsl(265, 80%, 60%)",   // Cliques - purple
  "hsl(38, 92%, 50%)",    // Leads - amber
  "hsl(152, 60%, 42%)",   // Vendas - green
];

interface FunnelStep {
  name: string;
  value: number;
}

interface VisualFunnelProps {
  data: FunnelStep[];
}

export function VisualFunnel({ data }: VisualFunnelProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col items-center w-full gap-0">
      {data.map((step, i) => {
        const prevValue = i > 0 ? data[i - 1].value : 0;
        const convRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;
        // Width: from 100% (top) down to minimum ~30%
        const widthPct = Math.max(30, (step.value / maxValue) * 100);
        const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        const isLast = i === data.length - 1;

        return (
          <div key={step.name} className="flex flex-col items-center w-full">
            {/* Conversion arrow between steps */}
            {i > 0 && prevValue > 0 && (
              <div className="flex items-center justify-center py-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground">
                    <path d="M6 2L6 10M6 10L3 7M6 10L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {formatPercent(convRate)}
                </div>
              </div>
            )}

            {/* Funnel segment */}
            <div
              className="relative flex items-center justify-center transition-all duration-500 ease-out"
              style={{
                width: `${widthPct}%`,
                minHeight: "56px",
                background: `linear-gradient(135deg, ${color}22, ${color}38)`,
                borderLeft: `3px solid ${color}`,
                borderRight: `3px solid ${color}`,
                borderTop: i === 0 ? `3px solid ${color}` : `1px solid ${color}44`,
                borderBottom: isLast ? `3px solid ${color}` : `1px solid ${color}44`,
                borderRadius: i === 0
                  ? "12px 12px 0 0"
                  : isLast
                    ? "0 0 12px 12px"
                    : "0",
                clipPath: isLast
                  ? undefined
                  : undefined,
              }}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 py-2 px-3">
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color }}>
                  {step.name}
                </span>
                <span className="text-lg sm:text-2xl font-bold text-foreground">
                  {formatNumber(step.value)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
