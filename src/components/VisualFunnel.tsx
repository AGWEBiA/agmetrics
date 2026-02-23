import { formatNumber, formatPercent } from "@/lib/formatters";
import { motion } from "framer-motion";

const FUNNEL_COLORS = [
  { bg: "hsl(220, 90%, 56%)", light: "hsl(220, 90%, 96%)", dark: "hsl(220, 90%, 18%)" },
  { bg: "hsl(265, 80%, 60%)", light: "hsl(265, 80%, 96%)", dark: "hsl(265, 80%, 20%)" },
  { bg: "hsl(38, 92%, 50%)",  light: "hsl(38, 92%, 95%)",  dark: "hsl(38, 92%, 18%)" },
  { bg: "hsl(152, 60%, 42%)", light: "hsl(152, 60%, 95%)", dark: "hsl(152, 60%, 16%)" },
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
    <div className="relative flex flex-col items-center w-full max-w-lg mx-auto py-2">
      {data.map((step, i) => {
        const prevValue = i > 0 ? data[i - 1].value : 0;
        const convRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;

        const topPct = i === 0 ? 100 : Math.max(28, (data[i - 1].value / maxValue) * 100);
        const bottomPct = Math.max(24, (step.value / maxValue) * 100);
        const palette = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        const isFirst = i === 0;
        const isLast = i === data.length - 1;

        const svgHeight = 64;
        const pad = 2;
        const viewW = 200;

        const tl = (viewW - (topPct / 100) * (viewW - pad * 2)) / 2;
        const tr = viewW - tl;
        const bl = (viewW - (bottomPct / 100) * (viewW - pad * 2)) / 2;
        const br = viewW - bl;
        const r = 8;

        let path: string;
        if (isFirst && isLast) {
          path = `M${tl + r},0 L${tr - r},0 Q${tr},0 ${tr},${r} L${br},${svgHeight - r} Q${br},${svgHeight} ${br - r},${svgHeight} L${bl + r},${svgHeight} Q${bl},${svgHeight} ${bl},${svgHeight - r} L${tl},${r} Q${tl},0 ${tl + r},0Z`;
        } else if (isFirst) {
          path = `M${tl + r},0 L${tr - r},0 Q${tr},0 ${tr},${r} L${br},${svgHeight} L${bl},${svgHeight} L${tl},${r} Q${tl},0 ${tl + r},0Z`;
        } else if (isLast) {
          path = `M${tl},0 L${tr},0 L${br},${svgHeight - r} Q${br},${svgHeight} ${br - r},${svgHeight} L${bl + r},${svgHeight} Q${bl},${svgHeight} ${bl},${svgHeight - r} L${tl},0Z`;
        } else {
          path = `M${tl},0 L${tr},0 L${br},${svgHeight} L${bl},${svgHeight}Z`;
        }

        const delay = i * 0.18;

        return (
          <div key={step.name} className="flex flex-col items-center w-full">
            {/* Conversion rate connector */}
            {i > 0 && prevValue > 0 && (
              <motion.div
                className="flex items-center justify-center h-7 relative"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.3, delay: delay - 0.06, ease: "easeOut" }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-px h-full bg-border" />
                </div>
                <span className="relative z-10 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  ↓ {formatPercent(convRate)}
                </span>
              </motion.div>
            )}

            {/* Trapezoid segment */}
            <motion.div
              className="relative w-full"
              style={{ height: `${svgHeight}px` }}
              initial={{ opacity: 0, scaleX: 0.5, scaleY: 0.7 }}
              animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
              transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
            >
              <svg
                viewBox={`0 0 ${viewW} ${svgHeight}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
              >
                <defs>
                  <linearGradient id={`funnel-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={palette.bg} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={palette.bg} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <path
                  d={path}
                  fill={`url(#funnel-grad-${i})`}
                  stroke={palette.bg}
                  strokeWidth="2"
                  strokeOpacity={0.6}
                />
              </svg>

              {/* Content overlay */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center gap-3 px-4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: delay + 0.15, ease: "easeOut" }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: palette.bg }}
                />
                <span
                  className="text-xs sm:text-sm font-bold uppercase tracking-wider"
                  style={{ color: palette.bg }}
                >
                  {step.name}
                </span>
                <span className="text-lg sm:text-2xl font-extrabold text-foreground tabular-nums">
                  {formatNumber(step.value)}
                </span>
              </motion.div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
