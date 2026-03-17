import { createContext, useContext, useState, ReactNode } from "react";

export interface GlobalFilters {
  dateRange: { from?: Date; to?: Date };
  platform: "all" | "kiwify" | "hotmart";
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  productName: string;
  status: "all" | "approved" | "pending" | "cancelled" | "refunded";
}

const DEFAULT_FILTERS: GlobalFilters = {
  dateRange: {},
  platform: "all",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  productName: "",
  status: "all",
};

interface GlobalFiltersContextType {
  filters: GlobalFilters;
  setFilters: (filters: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const GlobalFiltersContext = createContext<GlobalFiltersContextType | null>(null);

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<GlobalFilters>(DEFAULT_FILTERS);

  const setFilters = (partial: Partial<GlobalFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  const resetFilters = () => setFiltersState(DEFAULT_FILTERS);

  const hasActiveFilters =
    !!filters.dateRange.from ||
    filters.platform !== "all" ||
    !!filters.utmSource ||
    !!filters.utmMedium ||
    !!filters.utmCampaign ||
    !!filters.productName ||
    filters.status !== "all";

  return (
    <GlobalFiltersContext.Provider value={{ filters, setFilters, resetFilters, hasActiveFilters }}>
      {children}
    </GlobalFiltersContext.Provider>
  );
}

export function useGlobalFilters() {
  const ctx = useContext(GlobalFiltersContext);
  if (!ctx) throw new Error("useGlobalFilters must be inside GlobalFiltersProvider");
  return ctx;
}
