export type ProjectStrategy = "perpetuo" | "lancamento" | "lancamento_pago" | "funis" | "evento_presencial";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  view_token: string;
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
