import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBRL, formatPercent } from "@/lib/formatters";

// Simplified world map SVG paths (major regions as simplified polygons)
// Using a Robinson-like projection in a 1000x500 viewBox
const COUNTRY_POSITIONS: Record<string, { cx: number; cy: number; label: string }> = {
  "BR": { cx: 350, cy: 340, label: "Brasil" },
  "US": { cx: 220, cy: 180, label: "Estados Unidos" },
  "MX": { cx: 180, cy: 230, label: "México" },
  "AR": { cx: 330, cy: 400, label: "Argentina" },
  "CO": { cx: 290, cy: 280, label: "Colômbia" },
  "CL": { cx: 310, cy: 390, label: "Chile" },
  "PE": { cx: 290, cy: 320, label: "Peru" },
  "VE": { cx: 310, cy: 260, label: "Venezuela" },
  "EC": { cx: 270, cy: 300, label: "Equador" },
  "BO": { cx: 320, cy: 350, label: "Bolívia" },
  "PY": { cx: 340, cy: 370, label: "Paraguai" },
  "UY": { cx: 350, cy: 385, label: "Uruguai" },
  "CR": { cx: 230, cy: 260, label: "Costa Rica" },
  "PA": { cx: 250, cy: 265, label: "Panamá" },
  "GT": { cx: 200, cy: 245, label: "Guatemala" },
  "HN": { cx: 215, cy: 250, label: "Honduras" },
  "SV": { cx: 205, cy: 252, label: "El Salvador" },
  "NI": { cx: 225, cy: 255, label: "Nicarágua" },
  "DO": { cx: 290, cy: 230, label: "República Dominicana" },
  "CU": { cx: 260, cy: 220, label: "Cuba" },
  "PT": { cx: 460, cy: 185, label: "Portugal" },
  "ES": { cx: 470, cy: 185, label: "Espanha" },
  "FR": { cx: 490, cy: 165, label: "França" },
  "DE": { cx: 510, cy: 155, label: "Alemanha" },
  "IT": { cx: 515, cy: 175, label: "Itália" },
  "GB": { cx: 480, cy: 145, label: "Reino Unido" },
  "CA": { cx: 230, cy: 130, label: "Canadá" },
  "JP": { cx: 850, cy: 185, label: "Japão" },
  "CN": { cx: 780, cy: 200, label: "China" },
  "IN": { cx: 720, cy: 250, label: "Índia" },
  "AU": { cx: 840, cy: 380, label: "Austrália" },
  "ZA": { cx: 560, cy: 390, label: "África do Sul" },
  "NG": { cx: 515, cy: 280, label: "Nigéria" },
  "EG": { cx: 560, cy: 225, label: "Egito" },
  "AO": { cx: 530, cy: 330, label: "Angola" },
  "MZ": { cx: 580, cy: 360, label: "Moçambique" },
};

// Simplified continent outlines for background
const CONTINENT_PATHS = [
  // North America
  "M130,80 L280,80 L300,120 L320,180 L260,210 L230,250 L200,240 L170,200 L130,150 Z",
  // South America
  "M260,250 L320,250 L350,280 L370,320 L360,380 L340,420 L310,440 L290,400 L270,350 L260,300 Z",
  // Europe
  "M450,100 L550,100 L560,130 L540,170 L500,190 L460,180 L450,140 Z",
  // Africa
  "M460,200 L560,200 L590,260 L600,330 L570,400 L530,410 L490,370 L470,300 L460,250 Z",
  // Asia
  "M560,80 L880,80 L900,150 L870,220 L800,260 L730,280 L680,260 L620,230 L580,200 L560,150 Z",
  // Oceania
  "M800,330 L880,330 L890,380 L860,410 L810,400 L800,360 Z",
];

interface CountryData {
  name: string;
  value: number;
  secondaryValue?: number;
  pct?: number;
}

interface WorldMapProps {
  data: CountryData[];
  valueLabel?: string;
  formatValue?: (v: number) => string;
}

export function WorldMap({
  data,
  valueLabel = "Gasto",
  formatValue = formatBRL,
}: WorldMapProps) {
  const { countryValues, maxValue } = useMemo(() => {
    const countryValues = new Map<string, CountryData & { pos: typeof COUNTRY_POSITIONS[string] }>();
    const totalValue = data.reduce((s, d) => s + d.value, 0);

    data.forEach((d) => {
      const code = d.name.trim().toUpperCase();
      const pos = COUNTRY_POSITIONS[code];
      if (pos) {
        countryValues.set(code, {
          ...d,
          pct: totalValue > 0 ? (d.value / totalValue) * 100 : 0,
          pos,
        });
      }
    });
    const maxValue = Math.max(...Array.from(countryValues.values()).map((v) => v.value), 1);
    return { countryValues, maxValue };
  }, [data]);

  function getRadius(value: number): number {
    const minR = 6;
    const maxR = 28;
    const ratio = Math.sqrt(value / maxValue);
    return minR + ratio * (maxR - minR);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex justify-center">
        <svg viewBox="0 0 1000 500" className="w-full max-w-2xl" role="img" aria-label="Mapa-múndi">
          {/* Continent outlines */}
          {CONTINENT_PATHS.map((path, i) => (
            <path
              key={i}
              d={path}
              fill="hsl(var(--muted))"
              stroke="hsl(var(--border))"
              strokeWidth={1}
              opacity={0.5}
            />
          ))}

          {/* Data bubbles */}
          {Array.from(countryValues.entries())
            .sort((a, b) => b[1].value - a[1].value)
            .map(([code, d]) => {
              const r = getRadius(d.value);
              const intensity = Math.max(0.3, d.value / maxValue);
              return (
                <Tooltip key={code}>
                  <TooltipTrigger asChild>
                    <g className="cursor-pointer transition-opacity hover:opacity-70">
                      <circle
                        cx={d.pos.cx}
                        cy={d.pos.cy}
                        r={r}
                        fill={`hsl(220, 90%, ${70 - intensity * 35}%)`}
                        stroke="hsl(var(--background))"
                        strokeWidth={1.5}
                        opacity={0.85}
                      />
                      {r >= 12 && (
                        <text
                          x={d.pos.cx}
                          y={d.pos.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={r >= 18 ? 10 : 8}
                          fontWeight="bold"
                        >
                          {code}
                        </text>
                      )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p className="font-semibold">{d.pos.label} ({code})</p>
                    <p>{valueLabel}: {formatValue(d.value)}</p>
                    {d.pct != null && <p>{formatPercent(d.pct)} do total</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
        </svg>
      </div>
    </TooltipProvider>
  );
}
