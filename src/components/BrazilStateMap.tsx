import { useMemo, useState } from "react";
import { formatBRL, formatPercent } from "@/lib/formatters";
import brazilMapImg from "@/assets/brazil-map.png";

// Approximate percentage positions (x%, y%) of each state center on the map image
const STATE_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
  "RR": { x: 24, y: 8, label: "Roraima" },
  "AP": { x: 46, y: 9, label: "Amapá" },
  "AM": { x: 18, y: 22, label: "Amazonas" },
  "PA": { x: 42, y: 22, label: "Pará" },
  "MA": { x: 57, y: 22, label: "Maranhão" },
  "CE": { x: 70, y: 18, label: "Ceará" },
  "RN": { x: 79, y: 17, label: "Rio Grande do Norte" },
  "PB": { x: 80, y: 22, label: "Paraíba" },
  "PE": { x: 78, y: 26, label: "Pernambuco" },
  "AL": { x: 82, y: 30, label: "Alagoas" },
  "SE": { x: 79, y: 33, label: "Sergipe" },
  "PI": { x: 63, y: 30, label: "Piauí" },
  "TO": { x: 50, y: 36, label: "Tocantins" },
  "AC": { x: 6, y: 32, label: "Acre" },
  "RO": { x: 17, y: 36, label: "Rondônia" },
  "MT": { x: 30, y: 42, label: "Mato Grosso" },
  "GO": { x: 48, y: 52, label: "Goiás" },
  "DF": { x: 53, y: 54, label: "Distrito Federal" },
  "BA": { x: 67, y: 44, label: "Bahia" },
  "MG": { x: 62, y: 58, label: "Minas Gerais" },
  "ES": { x: 74, y: 58, label: "Espírito Santo" },
  "MS": { x: 32, y: 58, label: "Mato Grosso do Sul" },
  "SP": { x: 48, y: 66, label: "São Paulo" },
  "RJ": { x: 65, y: 66, label: "Rio de Janeiro" },
  "PR": { x: 40, y: 74, label: "Paraná" },
  "SC": { x: 42, y: 81, label: "Santa Catarina" },
  "RS": { x: 38, y: 89, label: "Rio Grande do Sul" },
};

const NAME_TO_CODE: Record<string, string> = {
  "roraima": "RR", "amapá": "AP", "amapa": "AP", "amazonas": "AM", "pará": "PA", "para": "PA",
  "maranhão": "MA", "maranhao": "MA", "ceará": "CE", "ceara": "CE",
  "rio grande do norte": "RN", "acre": "AC", "rondônia": "RO", "rondonia": "RO",
  "tocantins": "TO", "piauí": "PI", "piaui": "PI", "paraíba": "PB", "paraiba": "PB",
  "pernambuco": "PE", "mato grosso": "MT", "bahia": "BA", "alagoas": "AL", "sergipe": "SE",
  "mato grosso do sul": "MS", "goiás": "GO", "goias": "GO", "distrito federal": "DF",
  "minas gerais": "MG", "espírito santo": "ES", "espirito santo": "ES",
  "são paulo": "SP", "sao paulo": "SP", "rio de janeiro": "RJ",
  "paraná": "PR", "parana": "PR", "santa catarina": "SC", "rio grande do sul": "RS",
};

function normalizeToCode(name: string): string | null {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (STATE_POSITIONS[upper]) return upper;
  return NAME_TO_CODE[trimmed.toLowerCase()] || null;
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
    return 8 + ratio * 16; // 8px to 24px
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
    <div className="relative w-full max-w-md mx-auto">
      {/* Map image */}
      <img
        src={brazilMapImg}
        alt="Mapa do Brasil"
        className="w-full h-auto rounded-lg opacity-80"
        draggable={false}
      />

      {/* State markers overlay */}
      {Object.entries(STATE_POSITIONS).map(([code, pos]) => {
        const sd = stateValues.get(code);
        const value = sd?.value || 0;
        const size = getBubbleSize(value);
        const isHovered = hoveredState === code;

        return (
          <div
            key={code}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-150"
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
                className="rounded-full flex items-center justify-center border border-white/20 shadow-lg transition-transform duration-150"
                style={{
                  width: `${isHovered ? size + 6 : size}px`,
                  height: `${isHovered ? size + 6 : size}px`,
                  backgroundColor: getBubbleColor(value),
                  boxShadow: isHovered
                    ? `0 0 12px ${getBubbleColor(value)}`
                    : `0 0 4px ${getBubbleColor(value)}50`,
                }}
              >
                <span
                  className="text-white font-bold select-none"
                  style={{ fontSize: size >= 18 ? "9px" : "7px" }}
                >
                  {code}
                </span>
              </div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                <span className="text-[5px] text-muted-foreground font-medium select-none">{code}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Tooltip */}
      {hoveredState && hoveredInfo && (
        <div className="absolute top-2 right-2 bg-card border border-border rounded-lg shadow-lg p-3 text-xs z-30 min-w-[160px]">
          <p className="font-semibold text-foreground mb-1">{hoveredInfo.label} ({hoveredState})</p>
          {hoveredData && hoveredData.value > 0 ? (
            <>
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
            </>
          ) : (
            <p className="text-muted-foreground">Sem dados</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-[10px] text-muted-foreground">Menor</span>
        <div className="flex items-center gap-1">
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((intensity) => (
            <div
              key={intensity}
              className="rounded-full"
              style={{
                width: `${8 + intensity * 14}px`,
                height: `${8 + intensity * 14}px`,
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
