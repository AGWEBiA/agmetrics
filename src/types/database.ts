export type ProjectStrategy = "perpetuo" | "lancamento" | "lancamento_pago" | "funis" | "evento_presencial";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  organization_id: string | null;
  client_id: string | null;
  view_token: string;
  slug: string | null;
  start_date: string | null;
  end_date: string | null;
  cart_open_date: string | null;
  strategy: ProjectStrategy;
  is_active: boolean;
  budget: number | null;
  manual_investment: number | null;
  meta_leads_enabled: boolean;
  google_leads_enabled: boolean;
  kiwify_webhook_token: string | null;
  hotmart_webhook_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesEvent {
  id: string;
  project_id: string;
  platform: "kiwify" | "hotmart";
  external_id: string;
  product_name: string | null;
  product_type: "main" | "order_bump" | null;
  amount: number;
  gross_amount: number;
  platform_fee: number;
  coproducer_commission?: number;
  taxes?: number;
  status: "approved" | "pending" | "cancelled" | "refunded";
  buyer_email: string | null;
  buyer_name: string | null;
  buyer_state: string | null;
  buyer_city: string | null;
  buyer_country: string | null;
  payment_method: string | null;
  sale_date: string | null;
  created_at: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  tracking_src?: string;
  tracking_sck?: string;
  payload?: Record<string, any>;
}

export interface AdDemographic {
  id: string;
  project_id: string;
  platform: string;
  breakdown_type: string;
  dimension_1: string;
  dimension_2: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  purchases: number;
  date_start: string;
  date_end: string | null;
}

export interface DateFilter {
  from?: Date;
  to?: Date;
}
