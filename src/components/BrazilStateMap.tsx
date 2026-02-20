import { useMemo, useState } from "react";
import { formatBRL, formatPercent } from "@/lib/formatters";
import { STATE_PATHS, NAME_TO_CODE } from "@/data/brazilStatePaths";

function normalizeToCode(name: string): string | null {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (STATE_PATHS[upper]) return upper;
  const cleaned = trimmed.replace(/\s*\(state\)\s*/gi, "").replace(/\s*\(region\)\s*/gi, "").trim().toLowerCase();
  return NAME_TO_CODE[cleaned] || NAME_TO_CODE[trimmed.toLowerCase()] || null;
}

interface StateData {
  name: string;
  value: number;
  secondaryValue?: number;
  pct?: number;
}

interface BrazilStateMapProps {
  data: StateData[];
  valueLabel?: string;
  secondaryLabel?: string;
  formatValue?: (v: number) => string;
  formatSecondary?: (v: number) => string;
  colorScheme?: "blue" | "green" | "purple";
}

export function BrazilStateMap({
  data,
  valueLabel = "Gasto",
  secondaryLabel,
  formatValue = formatBRL,
  formatSecondary,
  colorScheme = "blue",
}: BrazilStateMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const { stateValues, maxValue } = useMemo(() => {
    const sv = new Map<string, StateData>();
    data.forEach((d) => {
      const code = normalizeToCode(d.name);
      if (code) {
        const existing = sv.get(code);
        if (existing) {
          sv.set(code, {
            name: d.name,
            value: existing.value + d.value,
            secondaryValue: (existing.secondaryValue || 0) + (d.secondaryValue || 0),
            pct: (existing.pct || 0) + (d.pct || 0),
          });
        } else {
          sv.set(code, { ...d });
        }
      }
    });
    const mx = Math.max(...Array.from(sv.values()).map((v) => v.value), 1);
    return { stateValues: sv, maxValue: mx };
  }, [data]);

  const hue = colorScheme === "green" ? 152 : colorScheme === "purple" ? 265 : 220;
  const sat = colorScheme === "green" ? 60 : colorScheme === "purple" ? 80 : 90;

  function getStateColor(value: number): string {
    if (value === 0) return "hsl(var(--muted))";
    const intensity = Math.max(0.15, value / maxValue);
    const lightness = 70 - intensity * 35;
    return `hsl(${hue}, ${sat}%, ${lightness}%)`;
  }

  const hoveredData = hoveredState ? stateValues.get(hoveredState) : null;
  const hoveredInfo = hoveredState ? STATE_PATHS[hoveredState] : null;

  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      <svg
        viewBox="-10 -10 630 660"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Object.entries(STATE_PATHS).map(([code, state]) => {
          const sd = stateValues.get(code);
          const value = sd?.value || 0;
          const isHovered = hoveredState === code;

          return (
            <path
              key={code}
              d={state.d}
              fill={getStateColor(value)}
              stroke="hsl(var(--border))"
              strokeWidth={isHovered ? 1.5 : 0.5}
              opacity={isHovered ? 1 : 0.85}
              className="cursor-pointer transition-all duration-150"
              style={{
                filter: isHovered ? `drop-shadow(0 0 6px ${getStateColor(value)})` : "none",
              }}
              onMouseEnter={() => setHoveredState(code)}
              onMouseLeave={() => setHoveredState(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredState && hoveredInfo && (
        <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3 text-xs z-30 min-w-[170px] animate-in fade-in-0 zoom-in-95 duration-150">
          <p className="font-semibold text-foreground mb-1.5">{hoveredInfo.name} ({hoveredState})</p>
          {hoveredData && hoveredData.value > 0 ? (
            <div className="space-y-0.5">
              <p className="text-muted-foreground">
                {valueLabel}: <span className="text-foreground font-medium">{formatValue(hoveredData.value)}</span>
              </p>
              {secondaryLabel && hoveredData.secondaryValue != null && (
                <p className="text-muted-foreground">
                  {secondaryLabel}: <span className="text-foreground font-medium">{(formatSecondary || formatValue)(hoveredData.secondaryValue)}</span>
                </p>
              )}
              {hoveredData.pct != null && (
                <p className="text-muted-foreground">{formatPercent(hoveredData.pct)} do total</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">Sem dados</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-[10px] text-muted-foreground">Menor</span>
        <div className="flex items-end gap-1">
          {[0.15, 0.35, 0.55, 0.75, 1.0].map((intensity) => (
            <div
              key={intensity}
              className="rounded-full"
              style={{
                width: `${10 + intensity * 14}px`,
                height: `${10 + intensity * 14}px`,
                backgroundColor: `hsl(${hue}, ${sat}%, ${70 - intensity * 35}%)`,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Maior</span>
      </div>
    </div>
  );
}
