import { useMemo, useState } from "react";
import { formatBRL, formatPercent } from "@/lib/formatters";

// Simplified but recognizable SVG paths for Brazilian states
// Based on a 600x600 viewBox with approximate geographic positions
const STATES: Record<string, { path: string; label: string; labelX: number; labelY: number }> = {
  "AM": {
    path: "M40,120 L60,100 L120,90 L180,95 L200,110 L210,140 L200,180 L180,200 L140,210 L100,200 L60,190 L35,160 Z",
    label: "Amazonas", labelX: 120, labelY: 150,
  },
  "RR": {
    path: "M100,30 L140,25 L165,40 L170,70 L150,90 L120,90 L95,75 L90,50 Z",
    label: "Roraima", labelX: 130, labelY: 60,
  },
  "AP": {
    path: "M235,30 L260,25 L275,45 L270,80 L250,95 L230,90 L220,65 L225,40 Z",
    label: "Amapá", labelX: 250, labelY: 60,
  },
  "PA": {
    path: "M180,95 L250,95 L280,100 L330,105 L340,130 L335,170 L310,190 L280,195 L240,200 L210,210 L200,180 L210,140 Z",
    label: "Pará", labelX: 270, labelY: 150,
  },
  "MA": {
    path: "M330,105 L370,100 L395,115 L400,150 L390,180 L365,195 L335,190 L310,190 L335,170 L340,130 Z",
    label: "Maranhão", labelX: 360, labelY: 150,
  },
  "TO": {
    path: "M310,190 L335,190 L365,195 L370,230 L365,270 L345,290 L320,285 L305,260 L300,230 L305,210 Z",
    label: "Tocantins", labelX: 335, labelY: 240,
  },
  "PI": {
    path: "M365,195 L390,180 L410,175 L425,195 L430,230 L420,260 L400,270 L380,265 L370,230 Z",
    label: "Piauí", labelX: 400, labelY: 225,
  },
  "CE": {
    path: "M410,115 L440,105 L465,115 L470,140 L460,165 L435,175 L410,175 L400,150 L395,115 Z",
    label: "Ceará", labelX: 435, labelY: 142,
  },
  "RN": {
    path: "M465,115 L490,112 L505,125 L500,145 L480,155 L460,165 L470,140 Z",
    label: "RN", labelX: 485, labelY: 135,
  },
  "PB": {
    path: "M460,165 L480,155 L505,158 L510,172 L490,180 L465,178 L450,175 Z",
    label: "PB", labelX: 485, labelY: 170,
  },
  "PE": {
    path: "M425,195 L450,175 L465,178 L490,180 L510,185 L515,198 L495,205 L460,208 L435,205 Z",
    label: "PE", labelX: 475, labelY: 195,
  },
  "AL": {
    path: "M495,205 L515,198 L525,210 L520,225 L505,228 L490,220 Z",
    label: "AL", labelX: 510, labelY: 215,
  },
  "SE": {
    path: "M490,220 L505,228 L510,242 L498,248 L485,240 L483,228 Z",
    label: "SE", labelX: 498, labelY: 236,
  },
  "BA": {
    path: "M380,265 L400,270 L420,260 L430,230 L435,205 L460,208 L495,205 L490,220 L483,228 L498,248 L490,290 L470,330 L440,350 L400,355 L370,340 L355,310 L345,290 L365,270 Z",
    label: "Bahia", labelX: 430, labelY: 300,
  },
  "MT": {
    path: "M180,200 L240,200 L280,195 L310,190 L305,210 L300,230 L305,260 L300,290 L285,320 L260,330 L220,325 L190,310 L175,280 L170,240 Z",
    label: "Mato Grosso", labelX: 240, labelY: 265,
  },
  "GO": {
    path: "M300,290 L320,285 L345,290 L355,310 L370,340 L365,365 L340,380 L315,375 L295,355 L285,330 L285,320 Z",
    label: "Goiás", labelX: 330, labelY: 335,
  },
  "DF": {
    path: "M350,345 L365,340 L370,352 L360,360 L348,355 Z",
    label: "DF", labelX: 358, labelY: 350,
  },
  "MS": {
    path: "M220,325 L260,330 L285,320 L285,330 L295,355 L290,385 L275,410 L250,420 L225,410 L210,385 L205,355 Z",
    label: "Mato Grosso do Sul", labelX: 250, labelY: 375,
  },
  "MG": {
    path: "M340,380 L365,365 L370,340 L400,355 L440,350 L470,330 L485,345 L490,375 L475,400 L445,415 L410,420 L380,415 L355,400 Z",
    label: "Minas Gerais", labelX: 420, labelY: 380,
  },
  "ES": {
    path: "M485,345 L500,340 L510,360 L505,385 L490,390 L490,375 Z",
    label: "ES", labelX: 500, labelY: 365,
  },
  "RJ": {
    path: "M445,415 L475,400 L490,410 L500,425 L485,435 L460,432 Z",
    label: "RJ", labelX: 475, labelY: 422,
  },
  "SP": {
    path: "M295,355 L315,375 L340,380 L355,400 L380,415 L410,420 L445,415 L460,432 L440,445 L400,450 L360,445 L325,435 L300,420 L285,400 L290,385 Z",
    label: "São Paulo", labelX: 370, labelY: 425,
  },
  "PR": {
    path: "M275,410 L290,385 L300,420 L325,435 L360,445 L355,460 L330,475 L300,478 L275,465 L260,445 Z",
    label: "Paraná", labelX: 310, labelY: 450,
  },
  "SC": {
    path: "M300,478 L330,475 L355,480 L350,500 L330,510 L305,510 L290,500 Z",
    label: "SC", labelX: 322, labelY: 495,
  },
  "RS": {
    path: "M290,500 L305,510 L330,510 L345,520 L340,545 L320,565 L290,570 L265,555 L250,530 L255,510 L270,500 Z",
    label: "Rio Grande do Sul", labelX: 300, labelY: 535,
  },
  "AC": {
    path: "M20,185 L40,180 L60,190 L100,200 L105,220 L80,235 L50,230 L25,215 L15,200 Z",
    label: "Acre", labelX: 60, labelY: 210,
  },
  "RO": {
    path: "M100,200 L140,210 L170,215 L180,200 L170,240 L160,260 L140,270 L120,265 L105,245 L105,220 Z",
    label: "Rondônia", labelX: 140, labelY: 235,
  },
};

// Map common names to state codes
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
  if (STATES[upper]) return upper;
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
    const stateValues = new Map<string, StateData>();
    data.forEach((d) => {
      const code = normalizeToCode(d.name);
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
    if (value === 0) return "hsl(var(--muted) / 0.4)";
    const intensity = Math.max(0.15, value / maxValue);
    const lightness = 78 - intensity * 42;
    return `hsl(${colorBase[0]}, ${colorBase[1]}%, ${lightness}%)`;
  }

  const hoveredData = hoveredState ? stateValues.get(hoveredState) : null;
  const hoveredInfo = hoveredState ? STATES[hoveredState] : null;

  return (
    <div className="relative">
      <svg viewBox="0 15 540 580" className="w-full max-w-lg mx-auto" role="img" aria-label="Mapa do Brasil">
        {Object.entries(STATES).map(([code, state]) => {
          const sd = stateValues.get(code);
          const value = sd?.value || 0;
          const isHovered = hoveredState === code;

          return (
            <g
              key={code}
              onMouseEnter={() => setHoveredState(code)}
              onMouseLeave={() => setHoveredState(null)}
              className="cursor-pointer"
            >
              <path
                d={state.path}
                fill={getColor(value)}
                stroke={isHovered ? "hsl(var(--foreground))" : "hsl(var(--border))"}
                strokeWidth={isHovered ? 2 : 0.8}
                className="transition-all duration-150"
                opacity={hoveredState && !isHovered ? 0.6 : 1}
              />
              <text
                x={state.labelX}
                y={state.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={value > maxValue * 0.45 ? "rgba(255,255,255,0.9)" : "hsl(var(--muted-foreground))"}
                fontSize={code.length <= 2 ? 10 : 8}
                fontWeight="600"
                pointerEvents="none"
                className="select-none"
              >
                {code}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredState && hoveredInfo && (
        <div className="absolute top-2 right-2 bg-card border border-border rounded-lg shadow-lg p-3 text-xs z-10 min-w-[160px]">
          <p className="font-semibold text-foreground mb-1">{hoveredInfo.label} ({hoveredState})</p>
          {hoveredData && hoveredData.value > 0 ? (
            <>
              <p className="text-muted-foreground">{valueLabel}: <span className="text-foreground font-medium">{formatValue(hoveredData.value)}</span></p>
              {secondaryLabel && hoveredData.secondaryValue != null && (
                <p className="text-muted-foreground">{secondaryLabel}: <span className="text-foreground font-medium">{(formatSecondary || formatValue)(hoveredData.secondaryValue)}</span></p>
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
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-[10px] text-muted-foreground">Menor</span>
        <div className="flex gap-0.5">
          {[0.15, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
            <div
              key={intensity}
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: `hsl(${colorBase[0]}, ${colorBase[1]}%, ${78 - intensity * 42}%)` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Maior</span>
      </div>
    </div>
  );
}
