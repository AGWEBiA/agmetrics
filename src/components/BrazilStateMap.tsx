import { useMemo, useState } from "react";
import { formatBRL, formatPercent } from "@/lib/formatters";
import brazilMapImg from "@/assets/brazil-map.png";

// Positions calibrated for the Wikimedia Brazil_State_Map.svg PNG (960x845 rendered)
// Each position is a percentage (x%, y%) of the image dimensions
const STATE_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
  "RR": { x: 25, y: 8, label: "Roraima" },
  "AP": { x: 44, y: 8, label: "Amapá" },
  "AM": { x: 17, y: 22, label: "Amazonas" },
  "PA": { x: 41, y: 24, label: "Pará" },
  "MA": { x: 58, y: 22, label: "Maranhão" },
  "CE": { x: 72, y: 20, label: "Ceará" },
  "RN": { x: 81, y: 19, label: "Rio Grande do Norte" },
  "PB": { x: 82, y: 24, label: "Paraíba" },
  "PE": { x: 80, y: 28, label: "Pernambuco" },
  "AL": { x: 84, y: 33, label: "Alagoas" },
  "SE": { x: 81, y: 36, label: "Sergipe" },
  "PI": { x: 63, y: 30, label: "Piauí" },
  "TO": { x: 51, y: 36, label: "Tocantins" },
  "AC": { x: 5, y: 34, label: "Acre" },
  "RO": { x: 18, y: 37, label: "Rondônia" },
  "MT": { x: 31, y: 44, label: "Mato Grosso" },
  "GO": { x: 50, y: 54, label: "Goiás" },
  "DF": { x: 55, y: 52, label: "Distrito Federal" },
  "BA": { x: 68, y: 44, label: "Bahia" },
  "MG": { x: 63, y: 60, label: "Minas Gerais" },
  "ES": { x: 76, y: 60, label: "Espírito Santo" },
  "MS": { x: 35, y: 60, label: "Mato Grosso do Sul" },
  "SP": { x: 51, y: 68, label: "São Paulo" },
  "RJ": { x: 68, y: 68, label: "Rio de Janeiro" },
  "PR": { x: 44, y: 76, label: "Paraná" },
  "SC": { x: 46, y: 83, label: "Santa Catarina" },
  "RS": { x: 41, y: 91, label: "Rio Grande do Sul" },
};

const NAME_TO_CODE: Record<string, string> = {
  "roraima": "RR", "amapá": "AP", "amapa": "AP", "amazonas": "AM", "pará": "PA", "para": "PA",
  "maranhão": "MA", "maranhao": "MA", "ceará": "CE", "ceara": "CE",
  "rio grande do norte": "RN", "acre": "AC", "rondônia": "RO", "rondonia": "RO",
  "tocantins": "TO", "piauí": "PI", "piaui": "PI", "paraíba": "PB", "paraiba": "PB",
  "pernambuco": "PE", "mato grosso": "MT", "bahia": "BA", "alagoas": "AL", "sergipe": "SE",
  "mato grosso do sul": "MS", "goiás": "GO", "goias": "GO", "distrito federal": "DF",
  "federal district": "DF",
  "minas gerais": "MG", "espírito santo": "ES", "espirito santo": "ES",
  "são paulo": "SP", "sao paulo": "SP", "rio de janeiro": "RJ",
  "paraná": "PR", "parana": "PR", "santa catarina": "SC", "rio grande do sul": "RS",
};

function normalizeToCode(name: string): string | null {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (STATE_POSITIONS[upper]) return upper;
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

  function getBubbleSize(value: number): number {
    if (value === 0) return 0;
    const ratio = Math.sqrt(value / maxValue);
    return 10 + ratio * 18;
  }

  function getBubbleColor(value: number): string {
    if (value === 0) return "transparent";
    const intensity = Math.max(0.2, value / maxValue);
    const lightness = 65 - intensity * 25;
    return `hsl(${hue}, ${sat}%, ${lightness}%)`;
  }

  const hoveredData = hoveredState ? stateValues.get(hoveredState) : null;
  const hoveredInfo = hoveredState ? STATE_POSITIONS[hoveredState] : null;

  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      {/* Real Brazil map image */}
      <img
        src={brazilMapImg}
        alt="Mapa do Brasil"
        className="w-full h-auto rounded-lg"
        style={{ filter: "brightness(0.85) saturate(0.3) opacity(0.7)" }}
        draggable={false}
      />

      {/* Interactive state markers */}
      {Object.entries(STATE_POSITIONS).map(([code, pos]) => {
        const sd = stateValues.get(code);
        const value = sd?.value || 0;
        const size = getBubbleSize(value);
        const isHovered = hoveredState === code;

        return (
          <div
            key={code}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              zIndex: isHovered ? 20 : value > 0 ? 10 : 5,
            }}
            onMouseEnter={() => setHoveredState(code)}
            onMouseLeave={() => setHoveredState(null)}
          >
            {value > 0 ? (
              <div
                className="rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 border-2 border-white/30"
                style={{
                  width: `${isHovered ? size + 8 : size}px`,
                  height: `${isHovered ? size + 8 : size}px`,
                  backgroundColor: getBubbleColor(value),
                  boxShadow: isHovered
                    ? `0 0 16px 4px ${getBubbleColor(value)}80`
                    : `0 2px 6px ${getBubbleColor(value)}40`,
                }}
              >
                <span
                  className="text-white font-bold"
                  style={{ fontSize: size >= 20 ? "10px" : "7px" }}
                >
                  {code}
                </span>
              </div>
            ) : (
              <div
                className="rounded-full bg-muted/40 border border-border/40 flex items-center justify-center cursor-pointer hover:bg-muted/60 transition-colors"
                style={{ width: "14px", height: "14px" }}
              >
                <span className="text-[6px] text-muted-foreground/70 font-medium">{code}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Tooltip card */}
      {hoveredState && hoveredInfo && (
        <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3 text-xs z-30 min-w-[170px] animate-in fade-in-0 zoom-in-95 duration-150">
          <p className="font-semibold text-foreground mb-1.5">{hoveredInfo.label} ({hoveredState})</p>
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
          {[0.1, 0.3, 0.5, 0.7, 1.0].map((intensity) => (
            <div
              key={intensity}
              className="rounded-full"
              style={{
                width: `${10 + intensity * 14}px`,
                height: `${10 + intensity * 14}px`,
                backgroundColor: `hsl(${hue}, ${sat}%, ${65 - intensity * 25}%)`,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Maior</span>
      </div>
    </div>
  );
}
