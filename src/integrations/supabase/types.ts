export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_demographics: {
        Row: {
          breakdown_type: string
          clicks: number | null
          conversions: number | null
          created_at: string
          date_end: string | null
          date_start: string
          dimension_1: string
          dimension_2: string
          id: string
          impressions: number | null
          last_updated: string | null
          leads: number | null
          platform: string
          project_id: string
          purchases: number | null
          spend: number | null
        }
        Insert: {
          breakdown_type: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          date_end?: string | null
          date_start?: string
          dimension_1: string
          dimension_2?: string
          id?: string
          impressions?: number | null
          last_updated?: string | null
          leads?: number | null
          platform: string
          project_id: string
          purchases?: number | null
          spend?: number | null
        }
        Update: {
          breakdown_type?: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          date_end?: string | null
          date_start?: string
          dimension_1?: string
          dimension_2?: string
          id?: string
          impressions?: number | null
          last_updated?: string | null
          leads?: number | null
          platform?: string
          project_id?: string
          purchases?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_demographics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_demographics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_history: {
        Row: {
          created_at: string
          health_score: number
          id: string
          insights: Json
          project_id: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          health_score?: number
          id?: string
          insights?: Json
          project_id: string
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string
          health_score?: number
          id?: string
          insights?: Json
          project_id?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_api_metrics: {
        Row: {
          created_at: string
          data: Json
          id: string
          metric_type: string
          period: string | null
          project_id: string
          synced_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          metric_type: string
          period?: string | null
          project_id: string
          synced_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          metric_type?: string
          period?: string | null
          project_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_api_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_api_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          project_id: string
          tab_name: string
          tab_order: number
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          tab_name?: string
          tab_order?: number
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          tab_name?: string
          tab_order?: number
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_layouts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      google_credentials: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          customer_id: string
          id: string
          project_id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          customer_id: string
          id?: string
          project_id: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          customer_id?: string
          id?: string
          project_id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      google_metrics: {
        Row: {
          cache_expiry: number | null
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          cost_per_conversion: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          investment: number | null
          last_updated: string | null
          project_id: string
        }
        Insert: {
          cache_expiry?: number | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          investment?: number | null
          last_updated?: string | null
          project_id: string
        }
        Update: {
          cache_expiry?: number | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          investment?: number | null
          last_updated?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          accounts_synced: number | null
          ads_synced: number | null
          created_at: string
          demographics_synced: number | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metrics_synced: number | null
          platform: string
          project_id: string
          status: string
        }
        Insert: {
          accounts_synced?: number | null
          ads_synced?: number | null
          created_at?: string
          demographics_synced?: number | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metrics_synced?: number | null
          platform?: string
          project_id: string
          status?: string
        }
        Update: {
          accounts_synced?: number | null
          ads_synced?: number | null
          created_at?: string
          demographics_synced?: number | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metrics_synced?: number | null
          platform?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          amount: number | null
          buyer_email: string | null
          buyer_name: string | null
          created_at: string
          event_date: string
          event_detail: string | null
          event_source: string | null
          event_type: string
          id: string
          metadata: Json | null
          project_id: string
          sale_id: string | null
          tracking_sck: string | null
          tracking_src: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          amount?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          event_date?: string
          event_detail?: string | null
          event_source?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          project_id: string
          sale_id?: string | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          amount?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          event_date?: string
          event_detail?: string | null
          event_source?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          sale_id?: string | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_investments: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          id: string
          project_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description?: string | null
          id?: string
          project_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_investments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_investments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          ad_id: string
          ad_name: string | null
          checkouts_initiated: number | null
          clicks: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date_end: string | null
          date_start: string | null
          hold_rate: number | null
          hook_rate: number | null
          id: string
          impressions: number | null
          landing_page_views: number | null
          last_updated: string | null
          leads: number | null
          link_clicks: number | null
          preview_link: string | null
          project_id: string
          purchases: number | null
          results: number | null
          spend: number | null
          status: string | null
          thumbnail_url: string | null
        }
        Insert: {
          ad_id: string
          ad_name?: string | null
          checkouts_initiated?: number | null
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date_end?: string | null
          date_start?: string | null
          hold_rate?: number | null
          hook_rate?: number | null
          id?: string
          impressions?: number | null
          landing_page_views?: number | null
          last_updated?: string | null
          leads?: number | null
          link_clicks?: number | null
          preview_link?: string | null
          project_id: string
          purchases?: number | null
          results?: number | null
          spend?: number | null
          status?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          ad_id?: string
          ad_name?: string | null
          checkouts_initiated?: number | null
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date_end?: string | null
          date_start?: string | null
          hold_rate?: number | null
          hook_rate?: number | null
          id?: string
          impressions?: number | null
          landing_page_views?: number | null
          last_updated?: string | null
          leads?: number | null
          link_clicks?: number | null
          preview_link?: string | null
          project_id?: string
          purchases?: number | null
          results?: number | null
          spend?: number | null
          status?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          campaign_id: string
          campaign_name: string
          created_at: string
          credential_id: string | null
          id: string
          is_selected: boolean
          project_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          campaign_name: string
          created_at?: string
          credential_id?: string | null
          id?: string
          is_selected?: boolean
          project_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          campaign_name?: string
          created_at?: string
          credential_id?: string | null
          id?: string
          is_selected?: boolean
          project_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "meta_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_credentials: {
        Row: {
          access_token: string
          ad_account_id: string
          created_at: string
          id: string
          label: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          ad_account_id: string
          created_at?: string
          id?: string
          label?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          ad_account_id?: string
          created_at?: string
          id?: string
          label?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_metrics: {
        Row: {
          cache_expiry: number | null
          checkout_conversion_rate: number | null
          checkouts_initiated: number | null
          clicks: number | null
          connect_rate: number | null
          cost_per_lead: number | null
          cost_per_purchase: number | null
          cost_per_result: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          investment: number | null
          landing_page_views: number | null
          last_updated: string | null
          lead_event_type: string | null
          leads: number | null
          link_clicks: number | null
          link_cpc: number | null
          link_ctr: number | null
          page_conversion_rate: number | null
          page_views: number | null
          project_id: string
          purchases: number | null
          results: number | null
          top_ads: Json | null
        }
        Insert: {
          cache_expiry?: number | null
          checkout_conversion_rate?: number | null
          checkouts_initiated?: number | null
          clicks?: number | null
          connect_rate?: number | null
          cost_per_lead?: number | null
          cost_per_purchase?: number | null
          cost_per_result?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          investment?: number | null
          landing_page_views?: number | null
          last_updated?: string | null
          lead_event_type?: string | null
          leads?: number | null
          link_clicks?: number | null
          link_cpc?: number | null
          link_ctr?: number | null
          page_conversion_rate?: number | null
          page_views?: number | null
          project_id: string
          purchases?: number | null
          results?: number | null
          top_ads?: Json | null
        }
        Update: {
          cache_expiry?: number | null
          checkout_conversion_rate?: number | null
          checkouts_initiated?: number | null
          clicks?: number | null
          connect_rate?: number | null
          cost_per_lead?: number | null
          cost_per_purchase?: number | null
          cost_per_result?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          investment?: number | null
          landing_page_views?: number | null
          last_updated?: string | null
          lead_event_type?: string | null
          leads?: number | null
          link_clicks?: number | null
          link_cpc?: number | null
          link_ctr?: number | null
          page_conversion_rate?: number | null
          page_views?: number | null
          project_id?: string
          purchases?: number | null
          results?: number | null
          top_ads?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          metadata: Json | null
          project_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          project_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          metadata?: Json | null
          project_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          platform: Database["public"]["Enums"]["product_platform"]
          price: number | null
          project_id: string
          type: Database["public"]["Enums"]["product_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          platform?: Database["public"]["Enums"]["product_platform"]
          price?: number | null
          project_id: string
          type?: Database["public"]["Enums"]["product_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          platform?: Database["public"]["Enums"]["product_platform"]
          price?: number | null
          project_id?: string
          type?: Database["public"]["Enums"]["product_type"]
        }
        Relationships: [
          {
            foreignKeyName: "products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_organization_id: string | null
          email: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_organization_id?: string | null
          email?: string | null
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_organization_id?: string | null
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_active: boolean
          project_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          project_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_domains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_domains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      project_goals: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          period: Database["public"]["Enums"]["goal_period"]
          project_id: string
          target_value: number
          type: Database["public"]["Enums"]["goal_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          period?: Database["public"]["Enums"]["goal_period"]
          project_id: string
          target_value: number
          type: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          period?: Database["public"]["Enums"]["goal_period"]
          project_id?: string
          target_value?: number
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_simulations: {
        Row: {
          ai_recommendation: string | null
          created_at: string
          demand_variation: number
          id: string
          price_variation: number
          project_ids: string[]
          project_names: string[]
          projection_days: number
          scenarios: Json
          sensitivity_matrix: Json
          summary: Json
          user_id: string
        }
        Insert: {
          ai_recommendation?: string | null
          created_at?: string
          demand_variation?: number
          id?: string
          price_variation?: number
          project_ids: string[]
          project_names: string[]
          projection_days?: number
          scenarios?: Json
          sensitivity_matrix?: Json
          summary?: Json
          user_id: string
        }
        Update: {
          ai_recommendation?: string | null
          created_at?: string
          demand_variation?: number
          id?: string
          price_variation?: number
          project_ids?: string[]
          project_names?: string[]
          projection_days?: number
          scenarios?: Json
          sensitivity_matrix?: Json
          summary?: Json
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          agsell_api_key: string | null
          agsell_base_url: string | null
          agsell_form_field_mapping: Json | null
          budget: number | null
          cart_open_date: string | null
          created_at: string
          custom_api_endpoints: Json | null
          custom_api_key: string | null
          custom_api_name: string | null
          custom_api_url: string | null
          description: string | null
          end_date: string | null
          evolution_api_key: string | null
          evolution_api_url: string | null
          evolution_instance_name: string | null
          google_leads_enabled: boolean
          hotmart_basic_auth: string | null
          hotmart_client_id: string | null
          hotmart_client_secret: string | null
          hotmart_webhook_token: string | null
          id: string
          is_active: boolean
          kiwify_account_id: string | null
          kiwify_client_id: string | null
          kiwify_client_secret: string | null
          kiwify_webhook_token: string | null
          manual_investment: number | null
          meta_leads_enabled: boolean
          name: string
          organization_id: string | null
          owner_id: string | null
          slug: string | null
          start_date: string | null
          strategy: Database["public"]["Enums"]["project_strategy"]
          updated_at: string
          view_token: string
        }
        Insert: {
          agsell_api_key?: string | null
          agsell_base_url?: string | null
          agsell_form_field_mapping?: Json | null
          budget?: number | null
          cart_open_date?: string | null
          created_at?: string
          custom_api_endpoints?: Json | null
          custom_api_key?: string | null
          custom_api_name?: string | null
          custom_api_url?: string | null
          description?: string | null
          end_date?: string | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          google_leads_enabled?: boolean
          hotmart_basic_auth?: string | null
          hotmart_client_id?: string | null
          hotmart_client_secret?: string | null
          hotmart_webhook_token?: string | null
          id?: string
          is_active?: boolean
          kiwify_account_id?: string | null
          kiwify_client_id?: string | null
          kiwify_client_secret?: string | null
          kiwify_webhook_token?: string | null
          manual_investment?: number | null
          meta_leads_enabled?: boolean
          name: string
          organization_id?: string | null
          owner_id?: string | null
          slug?: string | null
          start_date?: string | null
          strategy?: Database["public"]["Enums"]["project_strategy"]
          updated_at?: string
          view_token?: string
        }
        Update: {
          agsell_api_key?: string | null
          agsell_base_url?: string | null
          agsell_form_field_mapping?: Json | null
          budget?: number | null
          cart_open_date?: string | null
          created_at?: string
          custom_api_endpoints?: Json | null
          custom_api_key?: string | null
          custom_api_name?: string | null
          custom_api_url?: string | null
          description?: string | null
          end_date?: string | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          google_leads_enabled?: boolean
          hotmart_basic_auth?: string | null
          hotmart_client_id?: string | null
          hotmart_client_secret?: string | null
          hotmart_webhook_token?: string | null
          id?: string
          is_active?: boolean
          kiwify_account_id?: string | null
          kiwify_client_id?: string | null
          kiwify_client_secret?: string | null
          kiwify_webhook_token?: string | null
          manual_investment?: number | null
          meta_leads_enabled?: boolean
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          slug?: string | null
          start_date?: string | null
          strategy?: Database["public"]["Enums"]["project_strategy"]
          updated_at?: string
          view_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_events: {
        Row: {
          amount: number | null
          base_price: number | null
          buyer_city: string | null
          buyer_country: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_state: string | null
          coproducer_commission: number | null
          created_at: string
          external_id: string
          gross_amount: number | null
          id: string
          is_ignored: boolean
          payload: Json | null
          payment_method: string | null
          platform: Database["public"]["Enums"]["sales_platform"]
          platform_fee: number | null
          product_name: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          project_id: string
          refund_reason: string | null
          sale_date: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          taxes: number | null
          tracking_sck: string | null
          tracking_src: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          amount?: number | null
          base_price?: number | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_state?: string | null
          coproducer_commission?: number | null
          created_at?: string
          external_id: string
          gross_amount?: number | null
          id?: string
          is_ignored?: boolean
          payload?: Json | null
          payment_method?: string | null
          platform: Database["public"]["Enums"]["sales_platform"]
          platform_fee?: number | null
          product_name?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          project_id: string
          refund_reason?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          taxes?: number | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          amount?: number | null
          base_price?: number | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_state?: string | null
          coproducer_commission?: number | null
          created_at?: string
          external_id?: string
          gross_amount?: number | null
          id?: string
          is_ignored?: boolean
          payload?: Json | null
          payment_method?: string | null
          platform?: Database["public"]["Enums"]["sales_platform"]
          platform_fee?: number | null
          product_name?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          project_id?: string
          refund_reason?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          taxes?: number | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          page_url: string | null
          project_id: string
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          page_url?: string | null
          project_id: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          page_url?: string | null
          project_id?: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_preferences: {
        Row: {
          created_at: string
          dashboard_type: Database["public"]["Enums"]["dashboard_type"]
          id: string
          project_id: string
          section_order: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_type: Database["public"]["Enums"]["dashboard_type"]
          id?: string
          project_id: string
          section_order?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_type?: Database["public"]["Enums"]["dashboard_type"]
          id?: string
          project_id?: string
          section_order?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dashboard_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_groups: {
        Row: {
          created_at: string
          engagement_rate: number | null
          group_jid: string | null
          id: string
          last_synced_at: string | null
          member_count: number | null
          members_left: number | null
          name: string
          notes: string | null
          peak_members: number | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_rate?: number | null
          group_jid?: string | null
          id?: string
          last_synced_at?: string | null
          member_count?: number | null
          members_left?: number | null
          name: string
          notes?: string | null
          peak_members?: number | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_rate?: number | null
          group_jid?: string | null
          id?: string
          last_synced_at?: string | null
          member_count?: number | null
          members_left?: number | null
          name?: string
          notes?: string | null
          peak_members?: number | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_member_history: {
        Row: {
          created_at: string
          group_id: string
          id: string
          member_count: number
          members_joined: number
          members_left: number
          project_id: string
          recorded_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          member_count?: number
          members_joined?: number
          members_left?: number
          project_id: string
          recorded_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          member_count?: number
          members_joined?: number
          members_left?: number
          project_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_member_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_member_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_member_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_report_configs: {
        Row: {
          created_at: string
          frequency: Database["public"]["Enums"]["report_frequency"]
          id: string
          is_active: boolean
          last_sent_at: string | null
          metrics: Json
          name: string
          phone_number: string
          project_id: string
          send_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          frequency?: Database["public"]["Enums"]["report_frequency"]
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          metrics?: Json
          name?: string
          phone_number: string
          project_id: string
          send_hour?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          frequency?: Database["public"]["Enums"]["report_frequency"]
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          metrics?: Json
          name?: string
          phone_number?: string
          project_id?: string
          send_hour?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_report_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_report_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      projects_public: {
        Row: {
          budget: number | null
          cart_open_date: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          google_leads_enabled: boolean | null
          id: string | null
          is_active: boolean | null
          manual_investment: number | null
          meta_leads_enabled: boolean | null
          name: string | null
          organization_id: string | null
          owner_id: string | null
          slug: string | null
          start_date: string | null
          strategy: Database["public"]["Enums"]["project_strategy"] | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          cart_open_date?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          google_leads_enabled?: boolean | null
          id?: string | null
          is_active?: boolean | null
          manual_investment?: number | null
          meta_leads_enabled?: boolean | null
          name?: string | null
          organization_id?: string | null
          owner_id?: string | null
          slug?: string | null
          start_date?: string | null
          strategy?: Database["public"]["Enums"]["project_strategy"] | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          cart_open_date?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          google_leads_enabled?: boolean | null
          id?: string | null
          is_active?: boolean | null
          manual_investment?: number | null
          meta_leads_enabled?: boolean | null
          name?: string | null
          organization_id?: string | null
          owner_id?: string | null
          slug?: string | null
          start_date?: string | null
          strategy?: Database["public"]["Enums"]["project_strategy"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_lead_events_view: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          amount: number | null
          created_at: string | null
          event_date: string | null
          event_detail: string | null
          event_source: string | null
          event_type: string | null
          id: string | null
          metadata: Json | null
          project_id: string | null
          sale_id: string | null
          tracking_sck: string | null
          tracking_src: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          amount?: number | null
          created_at?: string | null
          event_date?: string | null
          event_detail?: string | null
          event_source?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          project_id?: string | null
          sale_id?: string | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          amount?: number | null
          created_at?: string | null
          event_date?: string | null
          event_detail?: string | null
          event_source?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          project_id?: string | null
          sale_id?: string | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      public_sales_summary: {
        Row: {
          amount: number | null
          created_at: string | null
          gross_amount: number | null
          id: string | null
          platform: Database["public"]["Enums"]["sales_platform"] | null
          platform_fee: number | null
          product_name: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          project_id: string | null
          sale_date: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          gross_amount?: number | null
          id?: string | null
          platform?: Database["public"]["Enums"]["sales_platform"] | null
          platform_fee?: number | null
          product_name?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          project_id?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          gross_amount?: number | null
          id?: string | null
          platform?: Database["public"]["Enums"]["sales_platform"] | null
          platform_fee?: number | null
          product_name?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          project_id?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      public_sales_view: {
        Row: {
          amount: number | null
          base_price: number | null
          coproducer_commission: number | null
          created_at: string | null
          external_id: string | null
          gross_amount: number | null
          id: string | null
          is_ignored: boolean | null
          platform: Database["public"]["Enums"]["sales_platform"] | null
          platform_fee: number | null
          product_name: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          project_id: string | null
          sale_date: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          taxes: number | null
          tracking_sck: string | null
          tracking_src: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          amount?: number | null
          base_price?: number | null
          coproducer_commission?: number | null
          created_at?: string | null
          external_id?: string | null
          gross_amount?: number | null
          id?: string | null
          is_ignored?: boolean | null
          platform?: Database["public"]["Enums"]["sales_platform"] | null
          platform_fee?: number | null
          product_name?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          project_id?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          taxes?: number | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          amount?: number | null
          base_price?: number | null
          coproducer_commission?: number | null
          created_at?: string | null
          external_id?: string | null
          gross_amount?: number | null
          id?: string | null
          is_ignored?: boolean | null
          platform?: Database["public"]["Enums"]["sales_platform"] | null
          platform_fee?: number | null
          product_name?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          project_id?: string | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          taxes?: number | null
          tracking_sck?: string | null
          tracking_src?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_project_by_view_token: {
        Args: { _token: string }
        Returns: {
          budget: number
          cart_open_date: string
          created_at: string
          description: string
          end_date: string
          google_leads_enabled: boolean
          id: string
          is_active: boolean
          manual_investment: number
          meta_leads_enabled: boolean
          name: string
          organization_id: string
          owner_id: string
          slug: string
          start_date: string
          strategy: Database["public"]["Enums"]["project_strategy"]
          updated_at: string
          view_token: string
        }[]
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_view_token: { Args: { _project_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      owns_project: { Args: { _project_id: string }; Returns: boolean }
      user_org_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_permission:
        | "projects.view"
        | "projects.edit"
        | "sales.view"
        | "integrations.manage"
        | "data.export"
      app_role: "admin" | "user"
      dashboard_type: "public" | "admin"
      goal_period: "daily" | "weekly" | "monthly" | "total"
      goal_type: "revenue" | "sales" | "roi" | "leads" | "margin"
      org_role: "owner" | "admin" | "member" | "viewer"
      product_platform: "kiwify" | "hotmart" | "both"
      product_type: "main" | "order_bump"
      project_strategy:
        | "perpetuo"
        | "lancamento"
        | "lancamento_pago"
        | "funis"
        | "evento_presencial"
      report_frequency: "daily" | "weekly" | "monthly"
      sale_status: "approved" | "pending" | "cancelled" | "refunded"
      sales_platform: "kiwify" | "hotmart"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_permission: [
        "projects.view",
        "projects.edit",
        "sales.view",
        "integrations.manage",
        "data.export",
      ],
      app_role: ["admin", "user"],
      dashboard_type: ["public", "admin"],
      goal_period: ["daily", "weekly", "monthly", "total"],
      goal_type: ["revenue", "sales", "roi", "leads", "margin"],
      org_role: ["owner", "admin", "member", "viewer"],
      product_platform: ["kiwify", "hotmart", "both"],
      product_type: ["main", "order_bump"],
      project_strategy: [
        "perpetuo",
        "lancamento",
        "lancamento_pago",
        "funis",
        "evento_presencial",
      ],
      report_frequency: ["daily", "weekly", "monthly"],
      sale_status: ["approved", "pending", "cancelled", "refunded"],
      sales_platform: ["kiwify", "hotmart"],
    },
  },
} as const
