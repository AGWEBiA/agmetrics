import { useState, useEffect, lazy, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedTabContent } from "@/components/AnimatedTabContent";
import { AcquisitionTab } from "./AcquisitionTab";
import { SalesTab } from "./SalesTab";
import { TimelineTab } from "./TimelineTab";
import { RefundsSection } from "./RefundsSection";

// Lazy-loaded heavy tab components
const TrackingTab = lazy(() => import("@/components/TrackingTab").then(m => ({ default: m.TrackingTab })));
const AdsVendasCrossTab = lazy(() => import("@/components/AdsVendasCrossTab").then(m => ({ default: m.AdsVendasCrossTab })));
const SalesTrackingAnalysis = lazy(() => import("@/components/SalesTrackingAnalysis").then(m => ({ default: m.SalesTrackingAnalysis })));
const AdvancedTrackingAnalysis = lazy(() => import("@/components/AdvancedTrackingAnalysis").then(m => ({ default: m.AdvancedTrackingAnalysis })));
const BuyerDemographicProfile = lazy(() => import("@/components/BuyerDemographicProfile").then(m => ({ default: m.BuyerDemographicProfile })));

function TabSkeleton() {
  return (
    <div className="space-y-4 pt-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

interface DashboardTabsProps {
  m: any;
  project: any;
  overviewContent: React.ReactNode;
}

// Tabs that need secondary data to be loaded
const TABS_NEEDING_DEMOGRAPHICS = ["buyer-profile"];
const TABS_NEEDING_META_ADS = ["tracking", "ads-vendas"];

export function DashboardTabs({ m, project, overviewContent }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const hasMeta = m.metaInvestment > 0 || m.metaImpressions > 0;
  const hasGoogle = m.googleInvestment > 0 || m.gImpressions > 0;

  // Trigger deferred queries when relevant tabs are activated
  useEffect(() => {
    if (TABS_NEEDING_DEMOGRAPHICS.includes(activeTab) && !m.demographicsLoaded) {
      m.loadDemographics();
    }
    if (TABS_NEEDING_META_ADS.includes(activeTab) && !m.metaAdsLoaded) {
      m.loadMetaAds();
    }
  }, [activeTab, m.demographicsLoaded, m.metaAdsLoaded]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 styled-scrollbar">
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
            <TabsTrigger value="advanced-tracking" className="text-[11px] sm:text-sm whitespace-nowrap px-2.5 sm:px-3">LTV × Origem</TabsTrigger>
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

      {activeTab === "tracking" && (
        <AnimatedTabContent value="tracking" className="space-y-6 pt-4">
          <Suspense fallback={<TabSkeleton />}>
            <TrackingTab m={m} project={project} />
          </Suspense>
        </AnimatedTabContent>
      )}

      {activeTab === "ads-vendas" && (
        <AnimatedTabContent value="ads-vendas" className="space-y-6 pt-4">
          <Suspense fallback={<TabSkeleton />}>
            <AdsVendasCrossTab m={m} strategy={project?.strategy} />
          </Suspense>
        </AnimatedTabContent>
      )}

      {activeTab === "sales-tracking" && (
        <AnimatedTabContent value="sales-tracking" className="space-y-6 pt-4">
          <Suspense fallback={<TabSkeleton />}>
            <SalesTrackingAnalysis
              sales={[...(m.kiwifySales || []), ...(m.hotmartSales || [])]}
              totalInvestment={m.totalInvestment}
            />
          </Suspense>
        </AnimatedTabContent>
      )}

      {activeTab === "advanced-tracking" && (
        <AnimatedTabContent value="advanced-tracking" className="space-y-6 pt-4">
          <Suspense fallback={<TabSkeleton />}>
            <AdvancedTrackingAnalysis
              sales={[...(m.kiwifySales || []), ...(m.hotmartSales || []), ...(m.pendingSales || []), ...(m.refundedSales || [])]}
              totalInvestment={m.totalInvestment}
              metaMetrics={m.metaMetrics}
              googleMetrics={m.googleMetrics}
            />
          </Suspense>
        </AnimatedTabContent>
      )}

      {activeTab === "buyer-profile" && (
        <AnimatedTabContent value="buyer-profile" className="space-y-6 pt-4">
          <Suspense fallback={<TabSkeleton />}>
            <BuyerDemographicProfile
              sales={[...(m.kiwifySales || []), ...(m.hotmartSales || [])]}
              adDemographics={[...(m.metaDemographics || []), ...(m.googleDemographics || [])]}
            />
          </Suspense>
        </AnimatedTabContent>
      )}

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
