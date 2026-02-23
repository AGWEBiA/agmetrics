import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AcquisitionTab } from "./AcquisitionTab";
import { SalesTab } from "./SalesTab";
import { TimelineTab } from "./TimelineTab";
import { TrackingTab } from "@/components/TrackingTab";
import { AdsVendasCrossTab } from "@/components/AdsVendasCrossTab";
import { SalesTrackingAnalysis } from "@/components/SalesTrackingAnalysis";
import { BuyerDemographicProfile } from "@/components/BuyerDemographicProfile";

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
      <TabsList className="w-full sm:w-auto flex overflow-x-auto no-scrollbar">
        <TabsTrigger value="overview" className="text-xs sm:text-sm whitespace-nowrap">Visão Geral</TabsTrigger>
        {(m.totalLeads > 0 || m.totalInvestment > 0) && (
          <TabsTrigger value="acquisition" className="text-xs sm:text-sm whitespace-nowrap">Captação</TabsTrigger>
        )}
        {m.totalSalesCount > 0 && (
          <TabsTrigger value="sales" className="text-xs sm:text-sm whitespace-nowrap">Vendas</TabsTrigger>
        )}
        {m.salesCount > 0 && (
          <TabsTrigger value="timeline" className="text-xs sm:text-sm whitespace-nowrap">Temporal</TabsTrigger>
        )}
        {(hasMeta || hasGoogle) && (
          <TabsTrigger value="tracking" className="text-xs sm:text-sm whitespace-nowrap">Rastreamento</TabsTrigger>
        )}
        {(m.totalInvestment > 0 && m.salesCount > 0) && (
          <TabsTrigger value="ads-vendas" className="text-xs sm:text-sm whitespace-nowrap">Ads × Vendas</TabsTrigger>
        )}
        {m.salesCount > 0 && (
          <TabsTrigger value="sales-tracking" className="text-xs sm:text-sm whitespace-nowrap">Vendas × Tracking</TabsTrigger>
        )}
        {m.salesCount > 0 && (
          <TabsTrigger value="buyer-profile" className="text-xs sm:text-sm whitespace-nowrap">Perfil Comprador</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="space-y-6 pt-4">
        {overviewContent}
        {m.salesCount === 0 && m.totalInvestment === 0 && (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              Nenhum dado registrado ainda.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="acquisition" className="space-y-6 pt-4">
        <AcquisitionTab m={m} />
      </TabsContent>

      <TabsContent value="sales" className="space-y-6 pt-4">
        <SalesTab m={m} />
      </TabsContent>

      <TabsContent value="timeline" className="space-y-6 pt-4">
        <TimelineTab salesChartData={m.salesChartData} />
      </TabsContent>

      <TabsContent value="tracking" className="space-y-6 pt-4">
        <TrackingTab m={m} project={project} />
      </TabsContent>

      <TabsContent value="ads-vendas" className="space-y-6 pt-4">
        <AdsVendasCrossTab m={m} strategy={project?.strategy} />
      </TabsContent>

      <TabsContent value="sales-tracking" className="space-y-6 pt-4">
        <SalesTrackingAnalysis
          sales={[...(m.kiwifySales || []), ...(m.hotmartSales || [])]}
          totalInvestment={m.totalInvestment}
        />
      </TabsContent>

      <TabsContent value="buyer-profile" className="space-y-6 pt-4">
        <BuyerDemographicProfile
          sales={[...(m.kiwifySales || []), ...(m.hotmartSales || [])]}
          adDemographics={[...(m.metaDemographics || []), ...(m.googleDemographics || [])]}
        />
      </TabsContent>
    </Tabs>
  );
}
