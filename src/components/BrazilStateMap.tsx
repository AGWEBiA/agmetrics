import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBRL, formatPercent } from "@/lib/formatters";

// Tile grid positions for Brazilian states (row, col) - approximates Brazil's geography
const STATE_GRID: Record<string, { row: number; col: number; label: string }> = {
  "RR": { row: 0, col: 2, label: "Roraima" },
  "AP": { row: 0, col: 4, label: "Amapá" },
  "AM": { row: 1, col: 1, label: "Amazonas" },
  "PA": { row: 1, col: 3, label: "Pará" },
  "MA": { row: 1, col: 5, label: "Maranhão" },
  "CE": { row: 1, col: 6, label: "Ceará" },
  "RN": { row: 1, col: 7, label: "Rio Grande do Norte" },
  "AC": { row: 2, col: 0, label: "Acre" },
  "RO": { row: 2, col: 1, label: "Rondônia" },
  "TO": { row: 2, col: 3, label: "Tocantins" },
  "PI": { row: 2, col: 5, label: "Piauí" },
  "PB": { row: 2, col: 7, label: "Paraíba" },
  "PE": { row: 2, col: 8, label: "Pernambuco" },
  "MT": { row: 3, col: 2, label: "Mato Grosso" },
  "BA": { row: 3, col: 5, label: "Bahia" },
  "AL": { row: 3, col: 8, label: "Alagoas" },
  "SE": { row: 3, col: 7, label: "Sergipe" },
  "MS": { row: 4, col: 2, label: "Mato Grosso do Sul" },
  "GO": { row: 4, col: 3, label: "Goiás" },
  "DF": { row: 4, col: 4, label: "Distrito Federal" },
  "MG": { row: 4, col: 5, label: "Minas Gerais" },
  "ES": { row: 4, col: 6, label: "Espírito Santo" },
  "SP": { row: 5, col: 3, label: "São Paulo" },
  "RJ": { row: 5, col: 5, label: "Rio de Janeiro" },
  "PR": { row: 5, col: 2, label: "Paraná" },
  "SC": { row: 6, col: 2, label: "Santa Catarina" },
  "RS": { row: 6, col: 3, label: "Rio Grande do Sul" },
};

// Map common region names to state codes
function normalizeToStateCode(name: string): string | null {
  const upper = name.trim().toUpperCase();
  if (STATE_GRID[upper]) return upper;

  const nameMap: Record<string, string> = {
    "RORAIMA": "RR", "AMAPÁ": "AP", "AMAPA": "AP", "AMAZONAS": "AM", "PARÁ": "PA", "PARA": "PA",
    "MARANHÃO": "MA", "MARANHAO": "MA", "CEARÁ": "CE", "CEARA": "CE",
    "RIO GRANDE DO NORTE": "RN", "ACRE": "AC", "RONDÔNIA": "RO", "RONDONIA": "RO",
    "TOCANTINS": "TO", "PIAUÍ": "PI", "PIAUI": "PI", "PARAÍBA": "PB", "PARAIBA": "PB",
    "PERNAMBUCO": "PE", "MATO GROSSO": "MT", "BAHIA": "BA", "ALAGOAS": "AL", "SERGIPE": "SE",
    "MATO GROSSO DO SUL": "MS", "GOIÁS": "GO", "GOIAS": "GO", "DISTRITO FEDERAL": "DF",
    "MINAS GERAIS": "MG", "ESPÍRITO SANTO": "ES", "ESPIRITO SANTO": "ES",
    "SÃO PAULO": "SP", "SAO PAULO": "SP", "RIO DE JANEIRO": "RJ",
    "PARANÁ": "PR", "PARANA": "PR", "SANTA CATARINA": "SC", "RIO GRANDE DO SUL": "RS",
  };
  return nameMap[upper] || null;
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
  const { stateValues, maxValue } = useMemo(() => {
    const stateValues = new Map<string, StateData>();
    data.forEach((d) => {
      const code = normalizeToStateCode(d.name);
      if (code) {
        const existing = stateValues.get(code);
        if (existing) {
          stateValues.set(code, {
            name: d.name,
            value: existing.value + d.value,
            secondaryValue: (existing.secondaryValue || 0) + (d.secondaryValue || 0),
            pct: (existing.pct || 0) + (d.pct || 0),
          });
        } else {
          stateValues.set(code, d);
        }
      }
    });
    const maxValue = Math.max(...Array.from(stateValues.values()).map((v) => v.value), 1);
    return { stateValues, maxValue };
  }, [data]);

  const colorBase = colorScheme === "green" ? [152, 60] : colorScheme === "purple" ? [265, 80] : [220, 90];

  function getColor(value: number): string {
    if (value === 0) return "hsl(var(--muted))";
    const intensity = Math.max(0.15, value / maxValue);
    const lightness = 80 - intensity * 45;
    return `hsl(${colorBase[0]}, ${colorBase[1]}%, ${lightness}%)`;
  }

  const cellSize = 40;
  const gap = 3;
  const maxRow = Math.max(...Object.values(STATE_GRID).map((s) => s.row));
  const maxCol = Math.max(...Object.values(STATE_GRID).map((s) => s.col));
  const width = (maxCol + 1) * (cellSize + gap) + gap;
  const height = (maxRow + 1) * (cellSize + gap) + gap;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md" role="img" aria-label="Mapa do Brasil por estado">
          {Object.entries(STATE_GRID).map(([code, pos]) => {
            const stateData = stateValues.get(code);
            const value = stateData?.value || 0;
            const x = gap + pos.col * (cellSize + gap);
            const y = gap + pos.row * (cellSize + gap);

            return (
              <Tooltip key={code}>
                <TooltipTrigger asChild>
                  <g className="cursor-pointer transition-opacity hover:opacity-80">
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={6}
                      fill={getColor(value)}
                      stroke="hsl(var(--border))"
                      strokeWidth={1}
                    />
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 - 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={value > maxValue * 0.5 ? "white" : "hsl(var(--foreground))"}
                      fontSize={11}
                      fontWeight="bold"
                    >
                      {code}
                    </text>
                    {value > 0 && (
                      <text
                        x={x + cellSize / 2}
                        y={y + cellSize / 2 + 11}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={value > maxValue * 0.5 ? "rgba(255,255,255,0.8)" : "hsl(var(--muted-foreground))"}
                        fontSize={7}
                      >
                        {stateData?.pct != null ? `${stateData.pct.toFixed(0)}%` : ""}
                      </text>
                    )}
                  </g>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <p className="font-semibold">{pos.label} ({code})</p>
                  {value > 0 ? (
                    <>
                      <p>{valueLabel}: {formatValue(value)}</p>
                      {secondaryLabel && stateData?.secondaryValue != null && (
                        <p>{secondaryLabel}: {(formatSecondary || formatValue)(stateData.secondaryValue)}</p>
                      )}
                      {stateData?.pct != null && <p>{formatPercent(stateData.pct)} do total</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Sem dados</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </svg>
      </div>
    </TooltipProvider>
  );
}
