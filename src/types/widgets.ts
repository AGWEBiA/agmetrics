export type WidgetType =
  | "kpi_revenue"
  | "kpi_sales"
  | "kpi_roi"
  | "kpi_roas"
  | "kpi_investment"
  | "kpi_leads"
  | "kpi_cpl"
  | "kpi_ticket"
  | "kpi_margin"
  | "kpi_profit"
  | "chart_sales_line"
  | "chart_revenue_line"
  | "chart_platform_pie"
  | "chart_payment_pie"
  | "chart_investment_bar"
  | "chart_funnel"
  | "table_recent_sales"
  | "table_top_products"
  | "table_top_ads";

export interface WidgetConfig {
  i: string; // unique id
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardTab {
  id: string;
  tab_name: string;
  tab_order: number;
  widgets: WidgetConfig[];
}

export interface WidgetCatalogItem {
  type: WidgetType;
  label: string;
  category: "kpi" | "chart" | "table";
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  icon: string;
}

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  // KPIs
  { type: "kpi_revenue", label: "Receita", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "💰" },
  { type: "kpi_sales", label: "Vendas", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "🛒" },
  { type: "kpi_roi", label: "ROI", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "📈" },
  { type: "kpi_roas", label: "ROAS", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "🎯" },
  { type: "kpi_investment", label: "Investimento", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "💸" },
  { type: "kpi_leads", label: "Leads", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "👥" },
  { type: "kpi_cpl", label: "CPL", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "📊" },
  { type: "kpi_ticket", label: "Ticket Médio", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "🎫" },
  { type: "kpi_margin", label: "Margem", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "📐" },
  { type: "kpi_profit", label: "Lucro Líquido", category: "kpi", defaultW: 3, defaultH: 2, minW: 2, minH: 2, icon: "✅" },
  // Charts
  { type: "chart_sales_line", label: "Vendas por Dia", category: "chart", defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "📉" },
  { type: "chart_revenue_line", label: "Receita por Dia", category: "chart", defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "📈" },
  { type: "chart_platform_pie", label: "Receita por Plataforma", category: "chart", defaultW: 4, defaultH: 4, minW: 3, minH: 3, icon: "🍩" },
  { type: "chart_payment_pie", label: "Forma de Pagamento", category: "chart", defaultW: 4, defaultH: 4, minW: 3, minH: 3, icon: "💳" },
  { type: "chart_investment_bar", label: "Investimento Meta vs Google", category: "chart", defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "📊" },
  { type: "chart_funnel", label: "Funil de Conversão", category: "chart", defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "🔻" },
  // Tables
  { type: "table_recent_sales", label: "Vendas Recentes", category: "table", defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "📋" },
  { type: "table_top_products", label: "Top Produtos", category: "table", defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "🏆" },
  { type: "table_top_ads", label: "Top Anúncios", category: "table", defaultW: 6, defaultH: 4, minW: 4, minH: 3, icon: "📢" },
];
