import { AnimatedCard } from "@/components/AnimatedCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard, Stat } from "./MetricCard";
import { formatBRL, formatPercent, formatDecimal, formatNumber } from "@/lib/formatters";

interface AcquisitionTabProps {
  m: any;
}

export function AcquisitionTab({ m }: AcquisitionTabProps) {
  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedCard index={0}><MetricCard title="Investimento Total" value={formatBRL(m.totalInvestment)} subtitle="Meta + Google + Manual" /></AnimatedCard>
        <AnimatedCard index={1}><MetricCard title="ROI" value={formatPercent(m.roi)} color={m.roi >= 0 ? "text-success" : "text-destructive"} /></AnimatedCard>
        <AnimatedCard index={2}><MetricCard title="ROAS" value={`${formatDecimal(m.roas)}x`} subtitle="Retorno sobre ads" /></AnimatedCard>
        <AnimatedCard index={3}><MetricCard title="Taxa de Conversão" value={formatPercent(m.conversionRate)} subtitle={m.conversionLabel} /></AnimatedCard>
      </div>
      {(m.metaInvestment > 0 || m.metaLeads > 0) && (
        <AnimatedCard index={4}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Meta Ads — Captação</CardTitle>
                <Badge variant="outline">{formatBRL(m.metaInvestment)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                <Stat label="Leads" value={formatNumber(m.metaLeads)} />
                <Stat label="CPL" value={formatBRL(m.metaCostPerLead)} />
                <Stat label="Resultados" value={formatNumber(m.metaResults)} />
                <Stat label="CPR" value={formatBRL(m.metaCostPerResult)} />
                <Stat label="Cliques no Link" value={formatNumber(m.metaLinkClicks)} />
                <Stat label="Views LP" value={formatNumber(m.metaLpViews)} />
                <Stat label="Connect Rate" value={formatPercent(m.metaConnectRate)} />
                <Stat label="Conv. Checkout" value={formatPercent(m.metaCheckoutConversion)} />
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}
      {(m.googleInvestment > 0 || m.googleLeads > 0) && (
        <AnimatedCard index={5}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Google Ads — Captação</CardTitle>
                <Badge variant="outline">{formatBRL(m.googleInvestment)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                <Stat label="Conversões" value={formatNumber(m.gConversions)} />
                <Stat label="Custo/Conv." value={formatBRL(m.gCostPerConversion)} />
                <Stat label="Cliques" value={formatNumber(m.gClicks)} />
                <Stat label="CTR" value={formatPercent(m.gCtr)} />
                <Stat label="CPC" value={formatBRL(m.gCpc)} />
                <Stat label="Impressões" value={formatNumber(m.gImpressions)} />
                <Stat label="Taxa de Conv." value={formatPercent(m.gConversionRate)} />
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}
    </>
  );
}
