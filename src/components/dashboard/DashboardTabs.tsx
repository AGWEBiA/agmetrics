import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedTabContent } from "@/components/AnimatedTabContent";
import { AcquisitionTab } from "./AcquisitionTab";
import { SalesTab } from "./SalesTab";
import { TimelineTab } from "./TimelineTab";
import { TrackingTab } from "@/components/TrackingTab";
import { AdsVendasCrossTab } from "@/components/AdsVendasCrossTab";
import { SalesTrackingAnalysis } from "@/components/SalesTrackingAnalysis";
import { BuyerDemographicProfile } from "@/components/BuyerDemographicProfile";
import { RefundsSection } from "./RefundsSection";

interface DashboardTabsProps {
  m: any;
  project: any;
  overviewContent: React.ReactNode;
}

export function DashboardTabs({ m, project, overviewContent }: DashboardTabsProps) {
  const hasMeta = m.metaInvestment > 0 || m.metaImpressions > 0;
  const hasGoogle = m.googleInvestment > 0 || m.gImpressions > 0;

  return (
    <Tabs defaultValue="overview">
      <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        <TabsList className="inline-flex w-max min-w-full sm:w-auto sm:min-w-0 gap-0.5">
          <TabsTrigger value="overview" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Visão Geral</TabsTrigger>
          {(m.totalLeads > 0 || m.totalInvestment > 0) && (
            <TabsTrigger value="acquisition" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Captação</TabsTrigger>
          )}
          {m.totalSalesCount > 0 && (
            <TabsTrigger value="sales" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Vendas</TabsTrigger>
          )}
          {m.salesCount > 0 && (
            <TabsTrigger value="timeline" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Temporal</TabsTrigger>
          )}
          {(hasMeta || hasGoogle) && (
            <TabsTrigger value="tracking" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Rastreamento</TabsTrigger>
          )}
          {(m.totalInvestment > 0 && m.salesCount > 0) && (
            <TabsTrigger value="ads-vendas" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Ads × Vendas</TabsTrigger>
          )}
          {m.salesCount > 0 && (
            <TabsTrigger value="sales-tracking" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Vendas × Track</TabsTrigger>
          )}
          {m.salesCount > 0 && (
            <TabsTrigger value="buyer-profile" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Perfil</TabsTrigger>
          )}
          {m.refundedSalesCount > 0 && (
            <TabsTrigger value="refunds" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">Reembolsos</TabsTrigger>
          )}
        </TabsList>
      </div>

      <AnimatedTabContent value="overview" className="space-y-6 pt-4">
        {overviewContent}
        {m.salesCount === 0 && m.totalInvestment === 0 && (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              Nenhum dado registrado ainda.
            </CardContent>
          </Card>
        )}
      </AnimatedTabContent>

      <AnimatedTabContent value="acquisition" className="space-y-6 pt-4">
        <AcquisitionTab m={m} />
      </AnimatedTabContent>

      <AnimatedTabContent value="sales" className="space-y-6 pt-4">
        <SalesTab m={m} />
      </AnimatedTabContent>

      <AnimatedTabContent value="timeline" className="space-y-6 pt-4">
        <TimelineTab salesChartData={m.salesChartData} />
      </AnimatedTabContent>

      <AnimatedTabContent value="tracking" className="space-y-6 pt-4">
        <TrackingTab m={m} project={project} />
      </AnimatedTabContent>

      <AnimatedTabContent value="ads-vendas" className="space-y-6 pt-4">
        <AdsVendasCrossTab m={m} strategy={project?.strategy} />
      </AnimatedTabContent>

      <AnimatedTabContent value="sales-tracking" className="space-y-6 pt-4">
        <SalesTrackingAnalysis
          sales={[...(m.kiwifySales || []), ...(m.hotmartSales || [])]}
          totalInvestment={m.totalInvestment}
        />
      </AnimatedTabContent>

      <AnimatedTabContent value="buyer-profile" className="space-y-6 pt-4">
        <BuyerDemographicProfile
          sales={[...(m.kiwifySales || []), ...(m.hotmartSales || [])]}
          adDemographics={[...(m.metaDemographics || []), ...(m.googleDemographics || [])]}
        />
      </AnimatedTabContent>

      <AnimatedTabContent value="refunds" className="space-y-6 pt-4">
        <RefundsSection
          projectId={project?.id}
          totalRevenue={m.totalRevenue}
          totalSalesCount={m.totalSalesCount}
        />
      </AnimatedTabContent>
    </Tabs>
  );
}
