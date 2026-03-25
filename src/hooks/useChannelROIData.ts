import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GroupBy = "utm_source" | "utm_campaign" | "tracking_src" | "tracking_sck";

export interface ClientDetail {
  email: string;
  name: string;
  firstAmount: number;
  subsequentAmount: number;
  totalPurchases: number;
  firstDate: string;
  productNames: string[];
}

export interface ChannelData {
  channel: string;
  totalClients: number;
  totalSales: number;
  avgFirstOrder: number;
  totalFirstOrderRevenue: number;
  totalSubsequentRevenue: number;
  totalRevenue: number;
  retentionRate: number;
  repeatBuyers: number;
  avgLTV: number;
  adSpend: number;
  roi: number;
  revenuePercent: number;
  salesPercent: number;
  clients: ClientDetail[];
}

async function fetchAllSales(projectId: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("sales_events")
      .select("buyer_email, buyer_name, amount, sale_date, utm_source, utm_campaign, utm_medium, tracking_src, tracking_sck, status, product_name, is_ignored")
      .eq("project_id", projectId)
      .eq("is_ignored", false)
      .order("sale_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (data) allData = allData.concat(data);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allData;
}

async function fetchAllLeadEvents(projectId: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("lead_events")
      .select("buyer_email, event_date, event_type, utm_source, utm_campaign, utm_medium, tracking_src, tracking_sck")
      .eq("project_id", projectId)
      .order("event_date", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (data) allData = allData.concat(data);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return allData;
}

export function useChannelROIData(projectId: string | undefined) {
  const [groupBy, setGroupBy] = useState<GroupBy>("utm_source");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("all");

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["channel_roi_all_sales", projectId],
    enabled: !!projectId,
    queryFn: () => fetchAllSales(projectId!),
    refetchInterval: 300000,
  });

  const { data: leadEvents } = useQuery({
    queryKey: ["channel_roi_lead_events", projectId],
    enabled: !!projectId,
    queryFn: () => fetchAllLeadEvents(projectId!),
  });

  const { data: metaSpend } = useQuery({
    queryKey: ["channel_roi_meta_spend", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_metrics")
        .select("date, investment")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + Number(r.investment || 0), 0);
    },
  });

  const { data: googleSpend } = useQuery({
    queryKey: ["channel_roi_google_spend", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_metrics")
        .select("date, investment")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + Number(r.investment || 0), 0);
    },
  });

  const productNames = useMemo(() => {
    if (!salesData) return [];
    const names = new Set<string>();
    salesData.forEach((s) => {
      if (s.product_name) names.add(s.product_name);
    });
    return Array.from(names).sort();
  }, [salesData]);

  const channelReport = useMemo((): ChannelData[] => {
    if (!salesData || salesData.length === 0) return [];

    // Apply date & product filters
    let filtered = salesData;
    if (dateFrom) {
      filtered = filtered.filter((s) => s.sale_date && s.sale_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((s) => s.sale_date && s.sale_date <= dateTo + "T23:59:59");
    }
    if (productFilter !== "all") {
      filtered = filtered.filter((s) => s.product_name === productFilter);
    }

    const getFieldValue = (record: any): string => {
      const val = record[groupBy] || "";
      return val.trim() || "direto";
    };

    // Build first-touch map from lead_events (earliest touch per email)
    const leadFirstTouch = new Map<string, string>();
    if (leadEvents && leadEvents.length > 0) {
      const sortedLeads = [...leadEvents].sort(
        (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );
      sortedLeads.forEach((le) => {
        if (!le.buyer_email) return;
        const email = le.buyer_email.toLowerCase().trim();
        if (leadFirstTouch.has(email)) return; // keep first
        const val = le[groupBy] || "";
        const channel = val.trim();
        if (channel) leadFirstTouch.set(email, channel);
      });
    }

    // Group ALL filtered sales by buyer email
    const buyerMap = new Map<string, any[]>();
    // Also track ALL sales (unfiltered) to determine true first-touch
    const buyerAllSales = new Map<string, any[]>();
    salesData.forEach((s) => {
      if (!s.buyer_email) return;
      const key = s.buyer_email.toLowerCase().trim();
      if (!buyerAllSales.has(key)) buyerAllSales.set(key, []);
      buyerAllSales.get(key)!.push(s);
    });

    filtered.forEach((s) => {
      if (!s.buyer_email) return;
      const key = s.buyer_email.toLowerCase().trim();
      if (!buyerMap.has(key)) buyerMap.set(key, []);
      buyerMap.get(key)!.push(s);
    });

    // Determine first-touch channel for each buyer (lead_events > first sale)
    const buyerChannel = new Map<string, string>();
    buyerAllSales.forEach((sales, email) => {
      // Priority 1: lead_events first touch
      if (leadFirstTouch.has(email)) {
        buyerChannel.set(email, leadFirstTouch.get(email)!);
        return;
      }
      // Priority 2: first sale's channel
      sales.sort((a: any, b: any) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
      const firstSale = sales[0];
      buyerChannel.set(email, getFieldValue(firstSale));
    });

    // Build channel aggregation from filtered sales
    const channelMap = new Map<string, ChannelData>();
    let grandTotalRevenue = 0;
    let grandTotalSales = 0;

    buyerMap.forEach((filteredSales, email) => {
      const channel = buyerChannel.get(email) || "direto";
      filteredSales.sort((a: any, b: any) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());

      // Get all sales (unfiltered) for this buyer to determine first purchase
      const allSales = buyerAllSales.get(email) || [];
      allSales.sort((a: any, b: any) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
      const firstSaleDate = allSales[0]?.sale_date;

      if (!channelMap.has(channel)) {
        channelMap.set(channel, {
          channel,
          totalClients: 0,
          totalSales: 0,
          avgFirstOrder: 0,
          totalFirstOrderRevenue: 0,
          totalSubsequentRevenue: 0,
          totalRevenue: 0,
          retentionRate: 0,
          repeatBuyers: 0,
          avgLTV: 0,
          adSpend: 0,
          roi: 0,
          revenuePercent: 0,
          salesPercent: 0,
          clients: [],
        });
      }

      const ch = channelMap.get(channel)!;
      ch.totalClients++;

      let firstAmount = 0;
      let subsequentAmount = 0;
      const productNamesSet = new Set<string>();

      filteredSales.forEach((s) => {
        const amt = Number(s.amount || 0);
        if (s.sale_date === firstSaleDate) {
          firstAmount += amt;
        } else {
          subsequentAmount += amt;
        }
        if (s.product_name) productNamesSet.add(s.product_name);
      });

      ch.totalSales += filteredSales.length;
      ch.totalFirstOrderRevenue += firstAmount;
      ch.totalSubsequentRevenue += subsequentAmount;
      ch.totalRevenue += firstAmount + subsequentAmount;
      grandTotalRevenue += firstAmount + subsequentAmount;
      grandTotalSales += filteredSales.length;

      if (allSales.length > 1) ch.repeatBuyers++;

      ch.clients.push({
        email,
        name: filteredSales[0].buyer_name || email,
        firstAmount,
        subsequentAmount,
        totalPurchases: filteredSales.length,
        firstDate: filteredSales[0].sale_date,
        productNames: Array.from(productNamesSet),
      });
    });

    // Calculate derived metrics
    const totalAdSpend = (metaSpend || 0) + (googleSpend || 0);
    const totalBuyers = buyerMap.size;

    return Array.from(channelMap.values())
      .map((ch) => {
        ch.avgFirstOrder = ch.totalClients > 0 ? ch.totalFirstOrderRevenue / ch.totalClients : 0;
        ch.retentionRate = ch.totalClients > 0 ? (ch.repeatBuyers / ch.totalClients) * 100 : 0;
        ch.avgLTV = ch.totalClients > 0 ? ch.totalRevenue / ch.totalClients : 0;
        ch.revenuePercent = grandTotalRevenue > 0 ? (ch.totalRevenue / grandTotalRevenue) * 100 : 0;
        ch.salesPercent = grandTotalSales > 0 ? (ch.totalSales / grandTotalSales) * 100 : 0;
        const isAdChannel = ch.channel !== "direto";
        ch.adSpend = isAdChannel ? (totalAdSpend * ch.totalClients) / Math.max(totalBuyers, 1) : 0;
        ch.roi = ch.adSpend > 0 ? ((ch.totalRevenue - ch.adSpend) / ch.adSpend) * 100 : 0;
        ch.clients.sort((a, b) => b.subsequentAmount - a.subsequentAmount);
        return ch;
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [salesData, leadEvents, groupBy, metaSpend, googleSpend, dateFrom, dateTo, productFilter]);

  const totals = useMemo(() => {
    if (channelReport.length === 0) return null;
    return {
      clients: channelReport.reduce((s, c) => s + c.totalClients, 0),
      sales: channelReport.reduce((s, c) => s + c.totalSales, 0),
      revenue: channelReport.reduce((s, c) => s + c.totalRevenue, 0),
      subsequent: channelReport.reduce((s, c) => s + c.totalSubsequentRevenue, 0),
      repeat: channelReport.reduce((s, c) => s + c.repeatBuyers, 0),
      adSpend: (metaSpend || 0) + (googleSpend || 0),
    };
  }, [channelReport, metaSpend, googleSpend]);

  return {
    channelReport,
    totals,
    isLoading: salesLoading,
    groupBy,
    setGroupBy,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    productFilter,
    setProductFilter,
    productNames,
  };
}
