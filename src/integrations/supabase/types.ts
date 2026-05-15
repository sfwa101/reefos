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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment_no: string | null
          building: string | null
          building_type: string | null
          city: string
          created_at: string
          delivery_instructions: string | null
          district: string | null
          floor: string | null
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          lat: number | null
          lng: number | null
          location: unknown
          notes: string | null
          recipient_name: string | null
          recipient_phone: string | null
          street: string | null
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          apartment_no?: string | null
          building?: string | null
          building_type?: string | null
          city: string
          created_at?: string
          delivery_instructions?: string | null
          district?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          lat?: number | null
          lng?: number | null
          location?: unknown
          notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          apartment_no?: string | null
          building?: string | null
          building_type?: string | null
          city?: string
          created_at?: string
          delivery_instructions?: string | null
          district?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          location?: unknown
          notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          args_schema_jsonb: Json
          confirmation_required: boolean
          confirmation_text_i18n: Json
          created_at: string
          entity_id: string
          icon: string | null
          id: string
          is_destructive: boolean
          key: string
          label_i18n: Json
          role_required: string
          rpc_name: string
          scope: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          args_schema_jsonb?: Json
          confirmation_required?: boolean
          confirmation_text_i18n?: Json
          created_at?: string
          entity_id: string
          icon?: string | null
          id?: string
          is_destructive?: boolean
          key: string
          label_i18n?: Json
          role_required?: string
          rpc_name: string
          scope?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          args_schema_jsonb?: Json
          confirmation_required?: boolean
          confirmation_text_i18n?: Json
          created_at?: string
          entity_id?: string
          icon?: string | null
          id?: string
          is_destructive?: boolean
          key?: string
          label_i18n?: Json
          role_required?: string
          rpc_name?: string
          scope?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_form_schemas: {
        Row: {
          active: boolean
          created_at: string
          entity_id: string
          id: string
          mode: string
          notes: string | null
          schema_jsonb: Json
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          entity_id: string
          id?: string
          mode: string
          notes?: string | null
          schema_jsonb?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          entity_id?: string
          id?: string
          mode?: string
          notes?: string | null
          schema_jsonb?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_form_schemas_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_idempotency_keys: {
        Row: {
          created_at: string
          entity_key: string
          key: string
          record_id: string | null
          result: Json
        }
        Insert: {
          created_at?: string
          entity_key: string
          key: string
          record_id?: string | null
          result: Json
        }
        Update: {
          created_at?: string
          entity_key?: string
          key?: string
          record_id?: string | null
          result?: Json
        }
        Relationships: []
      }
      admin_navigation: {
        Row: {
          created_at: string
          entity_id: string | null
          icon: string | null
          id: string
          is_visible: boolean
          label_i18n: Json
          parent_id: string | null
          role_required: string
          route_override: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          label_i18n?: Json
          parent_id?: string | null
          role_required?: string
          route_override?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          icon?: string | null
          id?: string
          is_visible?: boolean
          label_i18n?: Json
          parent_id?: string | null
          role_required?: string
          route_override?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_navigation_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_navigation_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_navigation"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_override_logs: {
        Row: {
          admin_user_id: string
          cart_id: string | null
          created_at: string
          id: string
          loss_prevention_reason: string | null
          metadata: Json
          order_id: string | null
          original_grand_total: number | null
          overridden_grand_total: number | null
          product_id: string | null
          reason: string
        }
        Insert: {
          admin_user_id: string
          cart_id?: string | null
          created_at?: string
          id?: string
          loss_prevention_reason?: string | null
          metadata?: Json
          order_id?: string | null
          original_grand_total?: number | null
          overridden_grand_total?: number | null
          product_id?: string | null
          reason: string
        }
        Update: {
          admin_user_id?: string
          cart_id?: string | null
          created_at?: string
          id?: string
          loss_prevention_reason?: string | null
          metadata?: Json
          order_id?: string | null
          original_grand_total?: number | null
          overridden_grand_total?: number | null
          product_id?: string | null
          reason?: string
        }
        Relationships: []
      }
      affiliate_settings: {
        Row: {
          category: string
          created_at: string
          default_commission_pct: number
          id: string
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          default_commission_pct?: number
          id?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          default_commission_pct?: number
          id?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      affiliate_tiers: {
        Row: {
          badge_emoji: string | null
          commission_fixed: number
          created_at: string
          id: string
          min_successful_invites: number
          name: string
          rank: number
          unlocks_wholesale: boolean
          updated_at: string
        }
        Insert: {
          badge_emoji?: string | null
          commission_fixed?: number
          created_at?: string
          id?: string
          min_successful_invites?: number
          name: string
          rank: number
          unlocks_wholesale?: boolean
          updated_at?: string
        }
        Update: {
          badge_emoji?: string | null
          commission_fixed?: number
          created_at?: string
          id?: string
          min_successful_invites?: number
          name?: string
          rank?: number
          unlocks_wholesale?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      asset_tag_links: {
        Row: {
          asset_id: string
          assigned_at: string
          assigned_by: string | null
          tag_id: string
          weight: number
        }
        Insert: {
          asset_id: string
          assigned_at?: string
          assigned_by?: string | null
          tag_id: string
          weight?: number
        }
        Update: {
          asset_id?: string
          assigned_at?: string
          assigned_by?: string | null
          tag_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_tag_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "salsabil_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "asset_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_tags: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label_i18n: Json
          metadata: Json
          parent_tag_id: string | null
          sort_order: number
          tag_key: string
          tag_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_i18n?: Json
          metadata?: Json
          parent_tag_id?: string | null
          sort_order?: number
          tag_key: string
          tag_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label_i18n?: Json
          metadata?: Json
          parent_tag_id?: string | null
          sort_order?: number
          tag_key?: string
          tag_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_tags_parent_tag_id_fkey"
            columns: ["parent_tag_id"]
            isOneToOne: false
            referencedRelation: "asset_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transfers: {
        Row: {
          created_at: string
          from_amount: number
          from_asset: string
          id: string
          metadata: Json
          rate: number | null
          reason: string | null
          to_amount: number
          to_asset: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_amount: number
          from_asset: string
          id?: string
          metadata?: Json
          rate?: number | null
          reason?: string | null
          to_amount: number
          to_asset: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_amount?: number
          from_asset?: string
          id?: string
          metadata?: Json
          rate?: number | null
          reason?: string | null
          to_amount?: number
          to_asset?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          category_slug: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          placement: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bogo_rules: {
        Row: {
          active: boolean
          buy_qty: number
          created_at: string
          ends_at: string | null
          get_discount_pct: number
          get_qty: number
          id: string
          name: string
          product_id: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          buy_qty: number
          created_at?: string
          ends_at?: string | null
          get_discount_pct?: number
          get_qty: number
          id?: string
          name: string
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          buy_qty?: number
          created_at?: string
          ends_at?: string | null
          get_discount_pct?: number
          get_qty?: number
          id?: string
          name?: string
          product_id?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bom_components: {
        Row: {
          child_product_id: string
          created_at: string
          id: string
          parent_product_id: string
          quantity: number
          uom: string
          waste_pct: number
        }
        Insert: {
          child_product_id: string
          created_at?: string
          id?: string
          parent_product_id: string
          quantity: number
          uom: string
          waste_pct?: number
        }
        Update: {
          child_product_id?: string
          created_at?: string
          id?: string
          parent_product_id?: string
          quantity?: number
          uom?: string
          waste_pct?: number
        }
        Relationships: []
      }
      branches: {
        Row: {
          code: string
          country: string
          country_code: string
          created_at: string
          currency: string
          default_locale: string
          geo_zone_id: string | null
          id: string
          is_active: boolean
          location: unknown
          name: string
          supported_locales: string[]
          timezone: string
          updated_at: string
        }
        Insert: {
          code: string
          country: string
          country_code: string
          created_at?: string
          currency?: string
          default_locale?: string
          geo_zone_id?: string | null
          id?: string
          is_active?: boolean
          location?: unknown
          name: string
          supported_locales?: string[]
          timezone?: string
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string
          country_code?: string
          created_at?: string
          currency?: string
          default_locale?: string
          geo_zone_id?: string | null
          id?: string
          is_active?: boolean
          location?: unknown
          name?: string
          supported_locales?: string[]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_geo_zone_id_fkey"
            columns: ["geo_zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry: {
        Row: {
          created_at: string
          description_i18n: Json
          domain: string
          is_active: boolean
          key: string
          name_i18n: Json
          schema: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_i18n?: Json
          domain?: string
          is_active?: boolean
          key: string
          name_i18n?: Json
          schema?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_i18n?: Json
          domain?: string
          is_active?: boolean
          key?: string
          name_i18n?: Json
          schema?: Json
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          line_key: string
          meta: Json
          product_id: string
          qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_key?: string
          meta?: Json
          product_id: string
          qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          line_key?: string
          meta?: Json
          product_id?: string
          qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cashier_sessions: {
        Row: {
          branch_id: string | null
          cashier_id: string
          closed_at: string | null
          closing_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_float: number
          total_orders: number
          total_sales: number
        }
        Insert: {
          branch_id?: string | null
          cashier_id: string
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_float?: number
          total_orders?: number
          total_sales?: number
        }
        Update: {
          branch_id?: string | null
          cashier_id?: string
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_float?: number
          total_orders?: number
          total_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashier_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_snapshots: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          input_payload: Json
          output_payload: Json
          snapshot_hash: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          input_payload: Json
          output_payload: Json
          snapshot_hash: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          input_payload?: Json
          output_payload?: Json
          snapshot_hash?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          mini_program_id: string | null
          name: string
          name_i18n: Json | null
          node_type: string | null
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          mini_program_id?: string | null
          name: string
          name_i18n?: Json | null
          node_type?: string | null
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          mini_program_id?: string | null
          name?: string
          name_i18n?: Json | null
          node_type?: string | null
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_mini_program_id_fkey"
            columns: ["mini_program_id"]
            isOneToOne: false
            referencedRelation: "mini_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      charity_campaigns: {
        Row: {
          auditor_id: string
          cover_url: string | null
          created_at: string
          current_amount: number
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          restricted_categories: string[]
          starts_at: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          auditor_id: string
          cover_url?: string | null
          created_at?: string
          current_amount?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          restricted_categories?: string[]
          starts_at?: string
          target_amount?: number
          title: string
          updated_at?: string
        }
        Update: {
          auditor_id?: string
          cover_url?: string | null
          created_at?: string
          current_amount?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          restricted_categories?: string[]
          starts_at?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charity_campaigns_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charity_donations: {
        Row: {
          amount: number
          campaign_id: string | null
          created_at: string
          donor_user_id: string | null
          id: string
          note: string | null
          source: string
          status: string
          wallet_tx_id: string | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          created_at?: string
          donor_user_id?: string | null
          id?: string
          note?: string | null
          source?: string
          status?: string
          wallet_tx_id?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          donor_user_id?: string | null
          id?: string
          note?: string | null
          source?: string
          status?: string
          wallet_tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charity_donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "charity_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charity_donations_donor_user_id_fkey"
            columns: ["donor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      charity_ledger: {
        Row: {
          base_amount: number
          created_at: string
          due_amount: number
          id: string
          notes: string | null
          paid_at: string | null
          paid_to: string | null
          period_end: string
          period_start: string
          rule_id: string | null
          rule_name: string
          status: string
        }
        Insert: {
          base_amount?: number
          created_at?: string
          due_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_to?: string | null
          period_end: string
          period_start: string
          rule_id?: string | null
          rule_name: string
          status?: string
        }
        Update: {
          base_amount?: number
          created_at?: string
          due_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_to?: string | null
          period_end?: string
          period_start?: string
          rule_id?: string | null
          rule_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "charity_ledger_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "charity_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      charity_rules: {
        Row: {
          base: string
          created_at: string
          fixed_amount: number | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          percentage: number | null
          updated_at: string
        }
        Insert: {
          base: string
          created_at?: string
          fixed_amount?: number | null
          frequency: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          percentage?: number | null
          updated_at?: string
        }
        Update: {
          base?: string
          created_at?: string
          fixed_amount?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_ledger: {
        Row: {
          affiliate_user_id: string
          base_amount: number
          category: string | null
          clawed_back_at: string | null
          commission_amount: number
          commission_pct: number
          created_at: string
          customer_user_id: string | null
          delivered_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          product_id: string | null
          product_name: string | null
          status: string
          vest_release_at: string | null
        }
        Insert: {
          affiliate_user_id: string
          base_amount?: number
          category?: string | null
          clawed_back_at?: string | null
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          customer_user_id?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          vest_release_at?: string | null
        }
        Update: {
          affiliate_user_id?: string
          base_amount?: number
          category?: string | null
          clawed_back_at?: string | null
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          customer_user_id?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          vest_release_at?: string | null
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          category: string
          channel: string
          created_at: string
          fixed_fee: number
          id: string
          rate_pct: number
          updated_at: string
        }
        Insert: {
          category: string
          channel: string
          created_at?: string
          fixed_fee?: number
          id?: string
          rate_pct?: number
          updated_at?: string
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          fixed_fee?: number
          id?: string
          rate_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_credit_lines: {
        Row: {
          approved_limit: number
          company_id: string
          created_at: string
          id: string
          net_terms_days: number
          updated_at: string
          used_amount: number
        }
        Insert: {
          approved_limit?: number
          company_id: string
          created_at?: string
          id?: string
          net_terms_days?: number
          updated_at?: string
          used_amount?: number
        }
        Update: {
          approved_limit?: number
          company_id?: string
          created_at?: string
          id?: string
          net_terms_days?: number
          updated_at?: string
          used_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_credit_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_id: string | null
          created_at: string
          created_by: string | null
          id: string
          status: string
          title: string | null
          type: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title?: string | null
          type: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title?: string | null
          type?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          order_id: string | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id?: string | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string | null
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_pct: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_total: number | null
          min_user_level: Database["public"]["Enums"]["app_user_level"]
          per_user_limit: number
          starts_at: string | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_pct?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_total?: number | null
          min_user_level?: Database["public"]["Enums"]["app_user_level"]
          per_user_limit?: number
          starts_at?: string | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_pct?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_total?: number | null
          min_user_level?: Database["public"]["Enums"]["app_user_level"]
          per_user_limit?: number
          starts_at?: string | null
          uses_count?: number
        }
        Relationships: []
      }
      cross_branch_transfers: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          product_id: string
          quantity_pieces: number
          shipping_cost: number | null
          source_branch_id: string | null
          source_warehouse_id: string | null
          status: string
          target_branch_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          quantity_pieces: number
          shipping_cost?: number | null
          source_branch_id?: string | null
          source_warehouse_id?: string | null
          status?: string
          target_branch_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          quantity_pieces?: number
          shipping_cost?: number | null
          source_branch_id?: string | null
          source_warehouse_id?: string | null
          status?: string
          target_branch_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_branch_transfers_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_branch_transfers_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_branch_transfers_target_branch_id_fkey"
            columns: ["target_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          notes: string | null
          paid_to: string | null
          payment_method: string | null
          receipt_url: string | null
          reference: string | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          paid_to?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference?: string | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          paid_to?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          reference?: string | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_events: {
        Row: {
          created_at: string
          driver_id: string | null
          event_type: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          proof_data: string | null
          proof_type: string | null
          task_id: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          event_type: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          proof_data?: string | null
          proof_type?: string | null
          task_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          event_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          proof_data?: string | null
          proof_type?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "delivery_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_methods: {
        Row: {
          base_eta_mins: number
          code: string
          created_at: string
          eta_label_ar: string
          fee_multiplier: number
          flat_surcharge: number
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          requires_scheduling: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_eta_mins?: number
          code: string
          created_at?: string
          eta_label_ar?: string
          fee_multiplier?: number
          flat_surcharge?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          requires_scheduling?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_eta_mins?: number
          code?: string
          created_at?: string
          eta_label_ar?: string
          fee_multiplier?: number
          flat_surcharge?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          requires_scheduling?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_polygons: {
        Row: {
          area: unknown
          created_at: string
          id: string
          is_active: boolean
          surge_x: number
          updated_at: string
          zone_name: string
        }
        Insert: {
          area: unknown
          created_at?: string
          id?: string
          is_active?: boolean
          surge_x?: number
          updated_at?: string
          zone_name: string
        }
        Update: {
          area?: unknown
          created_at?: string
          id?: string
          is_active?: boolean
          surge_x?: number
          updated_at?: string
          zone_name?: string
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          disable_barcode_for_express: boolean
          disable_barcode_zones: string[]
          gps_proof_required_when_disabled: boolean
          id: string
          require_barcode_default: boolean
          updated_at: string
        }
        Insert: {
          disable_barcode_for_express?: boolean
          disable_barcode_zones?: string[]
          gps_proof_required_when_disabled?: boolean
          id?: string
          require_barcode_default?: boolean
          updated_at?: string
        }
        Update: {
          disable_barcode_for_express?: boolean
          disable_barcode_zones?: string[]
          gps_proof_required_when_disabled?: boolean
          id?: string
          require_barcode_default?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      delivery_tasks: {
        Row: {
          cod_amount: number
          cod_collected: boolean
          commission_amount: number
          commission_paid: boolean
          created_at: string
          customer_barcode: string | null
          delivered_at: string | null
          delivery_photo_url: string | null
          delivery_zone: string | null
          driver_id: string | null
          driver_lat: number | null
          driver_lng: number | null
          driver_location: unknown
          estimated_minutes: number | null
          id: string
          order_id: string
          proof_lat: number | null
          proof_lng: number | null
          proof_type: string | null
          service_type: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cod_amount?: number
          cod_collected?: boolean
          commission_amount?: number
          commission_paid?: boolean
          created_at?: string
          customer_barcode?: string | null
          delivered_at?: string | null
          delivery_photo_url?: string | null
          delivery_zone?: string | null
          driver_id?: string | null
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location?: unknown
          estimated_minutes?: number | null
          id?: string
          order_id: string
          proof_lat?: number | null
          proof_lng?: number | null
          proof_type?: string | null
          service_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cod_amount?: number
          cod_collected?: boolean
          commission_amount?: number
          commission_paid?: boolean
          created_at?: string
          customer_barcode?: string | null
          delivered_at?: string | null
          delivery_photo_url?: string | null
          delivery_zone?: string | null
          driver_id?: string | null
          driver_lat?: number | null
          driver_lng?: number | null
          driver_location?: unknown
          estimated_minutes?: number | null
          id?: string
          order_id?: string
          proof_lat?: number | null
          proof_lng?: number | null
          proof_type?: string | null
          service_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      discount_overrides: {
        Row: {
          attempted_discount: number
          cost_price: number | null
          created_at: string
          id: string
          margin_amount: number
          override_by: string
          override_by_name: string | null
          product_id: string
          product_name: string
          reason: string
          sale_price: number
        }
        Insert: {
          attempted_discount: number
          cost_price?: number | null
          created_at?: string
          id?: string
          margin_amount: number
          override_by: string
          override_by_name?: string | null
          product_id: string
          product_name: string
          reason: string
          sale_price: number
        }
        Update: {
          attempted_discount?: number
          cost_price?: number | null
          created_at?: string
          id?: string
          margin_amount?: number
          override_by?: string
          override_by_name?: string | null
          product_id?: string
          product_name?: string
          reason?: string
          sale_price?: number
        }
        Relationships: []
      }
      discounts: {
        Row: {
          created_at: string
          discount_amount: number | null
          discount_pct: number
          ends_at: string | null
          id: string
          is_active: boolean
          min_order_total: number | null
          min_user_level: Database["public"]["Enums"]["app_user_level"]
          name: string
          scope: string
          scope_value: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          discount_pct?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_order_total?: number | null
          min_user_level?: Database["public"]["Enums"]["app_user_level"]
          name: string
          scope: string
          scope_value?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          discount_pct?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_order_total?: number | null
          min_user_level?: Database["public"]["Enums"]["app_user_level"]
          name?: string
          scope?: string
          scope_value?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_cash_settlements: {
        Row: {
          amount: number
          bank_reference: string | null
          created_at: string
          driver_id: string
          id: string
          kind: string
          notes: string | null
          received_by: string
          received_by_name: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          created_at?: string
          driver_id: string
          id?: string
          kind?: string
          notes?: string | null
          received_by: string
          received_by_name?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          kind?: string
          notes?: string | null
          received_by?: string
          received_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_cash_settlements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_commission_rules: {
        Row: {
          commission_flat: number
          commission_pct: number
          driver_type: string
          id: string
          max_per_order: number | null
          min_per_order: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          commission_flat?: number
          commission_pct?: number
          driver_type: string
          id?: string
          max_per_order?: number | null
          min_per_order?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          commission_flat?: number
          commission_pct?: number
          driver_type?: string
          id?: string
          max_per_order?: number | null
          min_per_order?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_positions: {
        Row: {
          battery_pct: number | null
          driver_id: string
          heading_deg: number | null
          position: unknown
          speed_kmh: number | null
          status: string
          updated_at: string
        }
        Insert: {
          battery_pct?: number | null
          driver_id: string
          heading_deg?: number | null
          position: unknown
          speed_kmh?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          battery_pct?: number | null
          driver_id?: string
          heading_deg?: number | null
          position?: unknown
          speed_kmh?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_wallets: {
        Row: {
          cash_in_hand: number
          driver_id: string
          earned_balance: number
          lifetime_earned: number
          lifetime_settled: number
          updated_at: string
        }
        Insert: {
          cash_in_hand?: number
          driver_id: string
          earned_balance?: number
          lifetime_earned?: number
          lifetime_settled?: number
          updated_at?: string
        }
        Update: {
          cash_in_hand?: number
          driver_id?: string
          earned_balance?: number
          lifetime_earned?: number
          lifetime_settled?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_wallets_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          base_salary: number
          branch_id: string | null
          capabilities: Json
          commission_flat: number | null
          commission_pct: number | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          current_location: unknown
          current_zone: string | null
          driver_type: string
          full_name: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          location: unknown
          national_id: string | null
          phone: string
          third_party_company: string | null
          updated_at: string
          user_id: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          base_salary?: number
          branch_id?: string | null
          capabilities?: Json
          commission_flat?: number | null
          commission_pct?: number | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_location?: unknown
          current_zone?: string | null
          driver_type?: string
          full_name: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location?: unknown
          national_id?: string | null
          phone: string
          third_party_company?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          base_salary?: number
          branch_id?: string | null
          capabilities?: Json
          commission_flat?: number | null
          commission_pct?: number | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_location?: unknown
          current_zone?: string | null
          driver_type?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location?: unknown
          national_id?: string | null
          phone?: string
          third_party_company?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_attributes: {
        Row: {
          created_at: string
          data_type: string
          entity_id: string
          help_i18n: Json
          id: string
          is_filterable: boolean
          is_listable: boolean
          is_required: boolean
          is_searchable: boolean
          key: string
          label_i18n: Json
          options_jsonb: Json
          role_visibility: string[]
          sort_order: number
          ui_widget: string
          updated_at: string
          validation_jsonb: Json
        }
        Insert: {
          created_at?: string
          data_type: string
          entity_id: string
          help_i18n?: Json
          id?: string
          is_filterable?: boolean
          is_listable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          key: string
          label_i18n?: Json
          options_jsonb?: Json
          role_visibility?: string[]
          sort_order?: number
          ui_widget: string
          updated_at?: string
          validation_jsonb?: Json
        }
        Update: {
          created_at?: string
          data_type?: string
          entity_id?: string
          help_i18n?: Json
          id?: string
          is_filterable?: boolean
          is_listable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          key?: string
          label_i18n?: Json
          options_jsonb?: Json
          role_visibility?: string[]
          sort_order?: number
          ui_widget?: string
          updated_at?: string
          validation_jsonb?: Json
        }
        Relationships: [
          {
            foreignKeyName: "entity_attributes_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_definitions: {
        Row: {
          capabilities: Json
          created_at: string
          description: string | null
          dna_kind: string | null
          icon: string | null
          id: string
          is_system: boolean
          key: string
          label_i18n: Json
          parent_entity_id: string | null
          primary_key_col: string
          sort_order: number
          table_name: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          description?: string | null
          dna_kind?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          key: string
          label_i18n?: Json
          parent_entity_id?: string | null
          primary_key_col?: string
          sort_order?: number
          table_name: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          description?: string | null
          dna_kind?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          key?: string
          label_i18n?: Json
          parent_entity_id?: string | null
          primary_key_col?: string
          sort_order?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_definitions_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "entity_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_disputes: {
        Row: {
          created_at: string
          escrow_id: string
          id: string
          initiator_id: string
          reason_text: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          escrow_id: string
          id?: string
          initiator_id: string
          reason_text: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          escrow_id?: string
          id?: string
          initiator_id?: string
          reason_text?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          release_date: string
          released_at: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          release_date: string
          released_at?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          release_date?: string
          released_at?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      flash_deals: {
        Row: {
          category: string | null
          created_at: string
          discount_pct: number
          end_time: string
          id: string
          is_active: boolean
          original_price: number
          product_id: string
          product_name: string | null
          reason: string | null
          start_time: string
          target_segment: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          discount_pct: number
          end_time: string
          id?: string
          is_active?: boolean
          original_price: number
          product_id: string
          product_name?: string | null
          reason?: string | null
          start_time?: string
          target_segment?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          discount_pct?: number
          end_time?: string
          id?: string
          is_active?: boolean
          original_price?: number
          product_id?: string
          product_name?: string | null
          reason?: string | null
          start_time?: string
          target_segment?: string | null
        }
        Relationships: []
      }
      flash_sale_products: {
        Row: {
          category: string | null
          created_at: string
          discount_pct: number
          flash_sale_id: string
          id: string
          original_price: number
          product_id: string
          product_name: string | null
          rank: number
          reason: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          discount_pct: number
          flash_sale_id: string
          id?: string
          original_price: number
          product_id: string
          product_name?: string | null
          rank?: number
          reason?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          discount_pct?: number
          flash_sale_id?: string
          id?: string
          original_price?: number
          product_id?: string
          product_name?: string | null
          rank?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sale_products_flash_sale_id_fkey"
            columns: ["flash_sale_id"]
            isOneToOne: false
            referencedRelation: "flash_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          created_at: string
          cycle_label: string | null
          ends_at: string
          id: string
          is_active: boolean
          starts_at: string
        }
        Insert: {
          created_at?: string
          cycle_label?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          starts_at?: string
        }
        Update: {
          created_at?: string
          cycle_label?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          starts_at?: string
        }
        Relationships: []
      }
      fulfillments: {
        Row: {
          created_at: string
          delivery_fee: number
          delivery_method_id: string | null
          driver_id: string | null
          eta_minutes: number | null
          id: string
          notes: string | null
          order_id: string
          scheduled_for: string | null
          sequence: number
          status: Database["public"]["Enums"]["fulfillment_status"]
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          delivery_method_id?: string | null
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          order_id: string
          scheduled_for?: string | null
          sequence?: number
          status?: Database["public"]["Enums"]["fulfillment_status"]
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          delivery_method_id?: string | null
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          scheduled_for?: string | null
          sequence?: number
          status?: Database["public"]["Enums"]["fulfillment_status"]
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillments_delivery_method_id_fkey"
            columns: ["delivery_method_id"]
            isOneToOne: false
            referencedRelation: "delivery_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      gam_eya_installments: {
        Row: {
          amount_due: number
          amount_paid: number
          covered_by_guarantor: boolean
          created_at: string
          cycle_index: number
          due_date: string
          gam_eya_id: string
          grace_until: string | null
          id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["gam_eya_installment_status"]
          user_id: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          covered_by_guarantor?: boolean
          created_at?: string
          cycle_index: number
          due_date: string
          gam_eya_id: string
          grace_until?: string | null
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["gam_eya_installment_status"]
          user_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          covered_by_guarantor?: boolean
          created_at?: string
          cycle_index?: number
          due_date?: string
          gam_eya_id?: string
          grace_until?: string | null
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["gam_eya_installment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gam_eya_installments_gam_eya_id_fkey"
            columns: ["gam_eya_id"]
            isOneToOne: false
            referencedRelation: "gam_eyas"
            referencedColumns: ["id"]
          },
        ]
      }
      gam_eya_members: {
        Row: {
          e_signature_blob: string | null
          gam_eya_id: string
          guarantor_id: string | null
          guarantor_signed_at: string | null
          id: string
          is_trusted: boolean
          joined_at: string
          kyc_tier_at_join: number | null
          turn_number: number
          user_id: string
        }
        Insert: {
          e_signature_blob?: string | null
          gam_eya_id: string
          guarantor_id?: string | null
          guarantor_signed_at?: string | null
          id?: string
          is_trusted?: boolean
          joined_at?: string
          kyc_tier_at_join?: number | null
          turn_number: number
          user_id: string
        }
        Update: {
          e_signature_blob?: string | null
          gam_eya_id?: string
          guarantor_id?: string | null
          guarantor_signed_at?: string | null
          id?: string
          is_trusted?: boolean
          joined_at?: string
          kyc_tier_at_join?: number | null
          turn_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gam_eya_members_gam_eya_id_fkey"
            columns: ["gam_eya_id"]
            isOneToOne: false
            referencedRelation: "gam_eyas"
            referencedColumns: ["id"]
          },
        ]
      }
      gam_eyas: {
        Row: {
          created_at: string
          created_by: string
          created_by_role: string | null
          current_cycle_index: number
          cycle_amount: number
          cycle_duration_months: number | null
          e_contract_url: string | null
          id: string
          late_grace_days: number
          max_amount_for_tier: number | null
          max_members: number
          min_kyc_tier: number | null
          name: string
          payout_frequency: string | null
          reward_pool: number
          starts_at: string | null
          status: Database["public"]["Enums"]["gam_eya_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_role?: string | null
          current_cycle_index?: number
          cycle_amount: number
          cycle_duration_months?: number | null
          e_contract_url?: string | null
          id?: string
          late_grace_days?: number
          max_amount_for_tier?: number | null
          max_members: number
          min_kyc_tier?: number | null
          name: string
          payout_frequency?: string | null
          reward_pool?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["gam_eya_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_role?: string | null
          current_cycle_index?: number
          cycle_amount?: number
          cycle_duration_months?: number | null
          e_contract_url?: string | null
          id?: string
          late_grace_days?: number
          max_amount_for_tier?: number | null
          max_members?: number
          min_kyc_tier?: number | null
          name?: string
          payout_frequency?: string | null
          reward_pool?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["gam_eya_status"]
          updated_at?: string
        }
        Relationships: []
      }
      geo_zones: {
        Row: {
          accent: string | null
          accepts_perishables: boolean
          base_eta_minutes: number | null
          cod_allowed: boolean
          created_at: string
          current_load_factor: number
          delivery_fee: number
          dispatch_strategy: string
          districts: string[]
          eta_label: string
          eta_minutes: number | null
          free_delivery_threshold: number | null
          id: string
          is_active: boolean
          location: unknown
          min_order_total: number
          name: string
          polygon: Json | null
          short_name: string
          sort_order: number
          surge_active: boolean
          updated_at: string
          zone_code: string
        }
        Insert: {
          accent?: string | null
          accepts_perishables?: boolean
          base_eta_minutes?: number | null
          cod_allowed?: boolean
          created_at?: string
          current_load_factor?: number
          delivery_fee?: number
          dispatch_strategy?: string
          districts?: string[]
          eta_label?: string
          eta_minutes?: number | null
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          location?: unknown
          min_order_total?: number
          name: string
          polygon?: Json | null
          short_name: string
          sort_order?: number
          surge_active?: boolean
          updated_at?: string
          zone_code: string
        }
        Update: {
          accent?: string | null
          accepts_perishables?: boolean
          base_eta_minutes?: number | null
          cod_allowed?: boolean
          created_at?: string
          current_load_factor?: number
          delivery_fee?: number
          dispatch_strategy?: string
          districts?: string[]
          eta_label?: string
          eta_minutes?: number | null
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          location?: unknown
          min_order_total?: number
          name?: string
          polygon?: Json | null
          short_name?: string
          sort_order?: number
          surge_active?: boolean
          updated_at?: string
          zone_code?: string
        }
        Relationships: []
      }
      global_catalog: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          fixed_price: number
          id: string
          metadata: Json
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          deleted_at?: string | null
          fixed_price: number
          id?: string
          metadata?: Json
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          fixed_price?: number
          id?: string
          metadata?: Json
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      gold_price_snapshots: {
        Row: {
          captured_at: string
          id: string
          price_egp_per_gram: number
          source: string
        }
        Insert: {
          captured_at?: string
          id?: string
          price_egp_per_gram: number
          source?: string
        }
        Update: {
          captured_at?: string
          id?: string
          price_egp_per_gram?: number
          source?: string
        }
        Relationships: []
      }
      group_buy_campaigns: {
        Row: {
          base_price: number
          created_at: string
          created_by: string | null
          current_quantity: number
          description: string | null
          expires_at: string
          geo_zone_id: string
          id: string
          image_url: string | null
          product_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["group_buy_status"]
          target_quantity: number
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          base_price: number
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          description?: string | null
          expires_at: string
          geo_zone_id: string
          id?: string
          image_url?: string | null
          product_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["group_buy_status"]
          target_quantity: number
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          description?: string | null
          expires_at?: string
          geo_zone_id?: string
          id?: string
          image_url?: string | null
          product_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["group_buy_status"]
          target_quantity?: number
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      group_buy_pledges: {
        Row: {
          campaign_id: string
          created_at: string
          escrow_amount: number
          escrow_wallet_tx_id: string | null
          id: string
          pledged_quantity: number
          settled_at: string | null
          status: Database["public"]["Enums"]["group_buy_pledge_status"]
          unit_price_locked: number
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          escrow_amount: number
          escrow_wallet_tx_id?: string | null
          id?: string
          pledged_quantity: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["group_buy_pledge_status"]
          unit_price_locked: number
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          escrow_amount?: number
          escrow_wallet_tx_id?: string | null
          id?: string
          pledged_quantity?: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["group_buy_pledge_status"]
          unit_price_locked?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_buy_pledges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "group_buy_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buy_tiers: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          price_per_unit: number
          quantity_threshold: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          price_per_unit: number
          quantity_threshold: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          price_per_unit?: number
          quantity_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_buy_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "group_buy_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      hakim_anomalies: {
        Row: {
          created_at: string
          description: string
          fingerprint: string | null
          id: string
          occurrences: number
          payload: Json
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          fingerprint?: string | null
          id?: string
          occurrences?: number
          payload?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          fingerprint?: string | null
          id?: string
          occurrences?: number
          payload?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hakim_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hakim_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hakim_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hakim_chat_sessions: {
        Row: {
          context_period_days: number | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_period_days?: number | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_period_days?: number | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hakim_insights: {
        Row: {
          created_at: string
          generated_for_date: string
          id: string
          is_read: boolean
          kind: string
          raw_snapshot: Json | null
          recommendations: Json | null
          severity: string
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          generated_for_date?: string
          id?: string
          is_read?: boolean
          kind: string
          raw_snapshot?: Json | null
          recommendations?: Json | null
          severity?: string
          summary: string
          title: string
        }
        Update: {
          created_at?: string
          generated_for_date?: string
          id?: string
          is_read?: boolean
          kind?: string
          raw_snapshot?: Json | null
          recommendations?: Json | null
          severity?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      hakim_pulse_cache: {
        Row: {
          created_at: string
          hour_bucket: string
          id: string
          insights: Json
          metrics_hash: string
          page: string
        }
        Insert: {
          created_at?: string
          hour_bucket: string
          id?: string
          insights: Json
          metrics_hash: string
          page: string
        }
        Update: {
          created_at?: string
          hour_bucket?: string
          id?: string
          insights?: Json
          metrics_hash?: string
          page?: string
        }
        Relationships: []
      }
      hakim_user_insights: {
        Row: {
          created_at: string
          id: string
          kind: string
          read_at: string | null
          severity: string
          suggestions: Json
          summary: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          severity?: string
          suggestions?: Json
          summary?: string | null
          title: string
          user_id: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          severity?: string
          suggestions?: Json
          summary?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      incentive_milestones: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          key: string
          reward: string
          sort_order: number
          threshold: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          reward: string
          sort_order?: number
          threshold: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          reward?: string
          sort_order?: number
          threshold?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_ledger_events: {
        Row: {
          actor_id: string | null
          context: Json
          created_at: string
          delta: number
          entity_id: string
          event_type: string
          id: string
          idempotency_key: string
          location_id: string
          occurred_at: string
        }
        Insert: {
          actor_id?: string | null
          context?: Json
          created_at?: string
          delta: number
          entity_id: string
          event_type: string
          id?: string
          idempotency_key: string
          location_id: string
          occurred_at?: string
        }
        Update: {
          actor_id?: string | null
          context?: Json
          created_at?: string
          delta?: number
          entity_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          location_id?: string
          occurred_at?: string
        }
        Relationships: []
      }
      inventory_locations: {
        Row: {
          created_at: string
          id: string
          last_restocked_at: string | null
          product_id: string
          reorder_point: number | null
          reserved: number
          stock: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          product_id: string
          reorder_point?: number | null
          reserved?: number
          stock?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          product_id?: string
          reorder_point?: number | null
          reserved?: number
          stock?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          items: Json
          order_ref: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          items?: Json
          order_ref: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          items?: Json
          order_ref?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_hash: string
          document_type: string
          id: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_hash: string
          document_type: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_hash?: string
          document_type?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      kyc_limits: {
        Row: {
          created_at: string
          daily_transfer_limit: number
          id: string
          max_balance: number
          monthly_transfer_limit: number
          tier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_transfer_limit?: number
          id?: string
          max_balance?: number
          monthly_transfer_limit?: number
          tier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_transfer_limit?: number
          id?: string
          max_balance?: number
          monthly_transfer_limit?: number
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_limits_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: true
            referencedRelation: "kyc_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_tiers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          back_image_path: string | null
          created_at: string
          front_image_path: string | null
          id: string
          kyc_level: number
          national_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back_image_path?: string | null
          created_at?: string
          front_image_path?: string | null
          id?: string
          kyc_level?: number
          national_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back_image_path?: string | null
          created_at?: string
          front_image_path?: string | null
          id?: string
          kyc_level?: number
          national_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          category: string | null
          counterparty_wallet_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          idempotency_key: string
          merchant_name: string | null
          tags: string[] | null
          transaction_group_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          counterparty_wallet_id?: string | null
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          idempotency_key: string
          merchant_name?: string | null
          tags?: string[] | null
          transaction_group_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          counterparty_wallet_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          idempotency_key?: string
          merchant_name?: string | null
          tags?: string[] | null
          transaction_group_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_counterparty_wallet_id_fkey"
            columns: ["counterparty_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tier_rules: {
        Row: {
          created_at: string
          discount_pct: number
          id: string
          is_active: boolean
          min_lifetime_spend: number
          points_multiplier: number
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_pct?: number
          id?: string
          is_active?: boolean
          min_lifetime_spend?: number
          points_multiplier?: number
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_pct?: number
          id?: string
          is_active?: boolean
          min_lifetime_spend?: number
          points_multiplier?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      manufacturing_orders: {
        Row: {
          created_at: string
          id: string
          product_id: string
          scheduled_date: string
          status: string
          target_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          scheduled_date: string
          status?: string
          target_quantity: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          scheduled_date?: string
          status?: string
          target_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          blurhash_base64: string | null
          bucket_path: string
          created_at: string
          entity_id: string
          entity_type: string
          file_size_bytes: number | null
          id: string
        }
        Insert: {
          blurhash_base64?: string | null
          bucket_path: string
          created_at?: string
          entity_id: string
          entity_type: string
          file_size_bytes?: number | null
          id?: string
        }
        Update: {
          blurhash_base64?: string | null
          bucket_path?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_size_bytes?: number | null
          id?: string
        }
        Relationships: []
      }
      mega_events: {
        Row: {
          active_date: string | null
          banner_color_hex: string
          banner_subtitle: string | null
          banner_title: string
          category_discounts: Json
          created_at: string
          global_discount_pct: number
          id: string
          is_active: boolean
          name: string
          trigger_kind: string
          updated_at: string
        }
        Insert: {
          active_date?: string | null
          banner_color_hex?: string
          banner_subtitle?: string | null
          banner_title: string
          category_discounts?: Json
          created_at?: string
          global_discount_pct?: number
          id?: string
          is_active?: boolean
          name: string
          trigger_kind: string
          updated_at?: string
        }
        Update: {
          active_date?: string | null
          banner_color_hex?: string
          banner_subtitle?: string | null
          banner_title?: string
          category_discounts?: Json
          created_at?: string
          global_discount_pct?: number
          id?: string
          is_active?: boolean
          name?: string
          trigger_kind?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          content_type: string
          conversation_id: string
          created_at: string
          id: string
          payload: Json | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          content_type?: string
          conversation_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          sender_id: string
        }
        Update: {
          content?: string | null
          content_type?: string
          conversation_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_app_installations: {
        Row: {
          installed_at: string
          mini_app_id: string
          preferences: Json
          user_id: string
        }
        Insert: {
          installed_at?: string
          mini_app_id: string
          preferences?: Json
          user_id: string
        }
        Update: {
          installed_at?: string
          mini_app_id?: string
          preferences?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_app_installations_mini_app_id_fkey"
            columns: ["mini_app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_apps: {
        Row: {
          app_key: string
          capabilities: Json
          created_at: string
          developer_id: string
          id: string
          manifest_url: string
          name_i18n: Json
          status: string
          updated_at: string
          version: string | null
        }
        Insert: {
          app_key: string
          capabilities?: Json
          created_at?: string
          developer_id: string
          id?: string
          manifest_url: string
          name_i18n?: Json
          status?: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          app_key?: string
          capabilities?: Json
          created_at?: string
          developer_id?: string
          id?: string
          manifest_url?: string
          name_i18n?: Json
          status?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      mini_programs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          manifest_url: string
          name: string
          required_permissions: Json
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          manifest_url: string
          name: string
          required_permissions?: Json
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          manifest_url?: string
          name?: string
          required_permissions?: Json
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          icon: string | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers_matrix: {
        Row: {
          allow_fakka_roundup: boolean
          block_type: string
          created_at: string
          geo_context: Json
          honest_margin_pct: number | null
          id: string
          is_active: boolean
          logic_weaver_rules: Json
          persona_context: Json
          priority: number
          subtitle: string | null
          target_id: string | null
          temporal_context: Json
          title: string
          updated_at: string
        }
        Insert: {
          allow_fakka_roundup?: boolean
          block_type?: string
          created_at?: string
          geo_context?: Json
          honest_margin_pct?: number | null
          id?: string
          is_active?: boolean
          logic_weaver_rules?: Json
          persona_context?: Json
          priority?: number
          subtitle?: string | null
          target_id?: string | null
          temporal_context?: Json
          title: string
          updated_at?: string
        }
        Update: {
          allow_fakka_roundup?: boolean
          block_type?: string
          created_at?: string
          geo_context?: Json
          honest_margin_pct?: number | null
          id?: string
          is_active?: boolean
          logic_weaver_rules?: Json
          persona_context?: Json
          priority?: number
          subtitle?: string | null
          target_id?: string | null
          temporal_context?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      oracle_price_history: {
        Row: {
          id: string
          price_usd: number
          recorded_at: string
          symbol: string
        }
        Insert: {
          id?: string
          price_usd: number
          recorded_at?: string
          symbol: string
        }
        Update: {
          id?: string
          price_usd?: number
          recorded_at?: string
          symbol?: string
        }
        Relationships: []
      }
      order_book: {
        Row: {
          amount: number
          created_at: string
          filled_amount: number
          id: string
          price: number
          security_id: string
          side: string
          status: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          filled_amount?: number
          id?: string
          price: number
          security_id: string
          side: string
          status?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          filled_amount?: number
          id?: string
          price?: number
          security_id?: string
          side?: string
          status?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_book_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_book_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_outbox: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          order_id: string
          payload: Json
          recipient: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          id?: string
          last_error?: string | null
          order_id: string
          payload?: Json
          recipient?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          order_id?: string
          payload?: Json
          recipient?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      partner_ledgers: {
        Row: {
          amount_due: number
          cost: number
          created_at: string
          gross_profit: number
          id: string
          net_profit: number
          order_id: string | null
          order_item_id: string | null
          paid_at: string | null
          partner_id: string
          partner_name: string
          partner_user_id: string | null
          percentage: number
          product_id: string | null
          product_name: string | null
          quantity: number
          revenue: number
          split_type: string
          status: string
        }
        Insert: {
          amount_due?: number
          cost?: number
          created_at?: string
          gross_profit?: number
          id?: string
          net_profit?: number
          order_id?: string | null
          order_item_id?: string | null
          paid_at?: string | null
          partner_id: string
          partner_name: string
          partner_user_id?: string | null
          percentage: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          revenue?: number
          split_type: string
          status?: string
        }
        Update: {
          amount_due?: number
          cost?: number
          created_at?: string
          gross_profit?: number
          id?: string
          net_profit?: number
          order_id?: string | null
          order_item_id?: string | null
          paid_at?: string | null
          partner_id?: string
          partner_name?: string
          partner_user_id?: string | null
          percentage?: number
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          revenue?: number
          split_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_ledgers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "product_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_tiers: {
        Row: {
          b2c_first_order_pct: number
          b2c_recurring_pct: number
          created_at: string
          duration_months: number
          id: string
          name: string
        }
        Insert: {
          b2c_first_order_pct?: number
          b2c_recurring_pct?: number
          created_at?: string
          duration_months?: number
          id?: string
          name: string
        }
        Update: {
          b2c_first_order_pct?: number
          b2c_recurring_pct?: number
          created_at?: string
          duration_months?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          kind: Database["public"]["Enums"]["payment_method_kind"]
          label: string | null
          last4: string | null
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind: Database["public"]["Enums"]["payment_method_kind"]
          label?: string | null
          last4?: string | null
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind?: Database["public"]["Enums"]["payment_method_kind"]
          label?: string | null
          last4?: string | null
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          group_name: string
          id: string
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_name: string
          id?: string
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_name?: string
          id?: string
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      personalized_offers: {
        Row: {
          created_at: string
          discount_pct: number
          expires_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_pct: number
          expires_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_pct?: number
          expires_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      pos_shifts: {
        Row: {
          branch_id: string | null
          cashier_id: string
          closed_at: string | null
          closing_balance: number | null
          created_at: string
          discrepancy: number | null
          expected_balance: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number
          status: string
          total_orders: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cashier_id: string
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          discrepancy?: number | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          status?: string
          total_orders?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cashier_id?: string
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          discrepancy?: number | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          status?: string
          total_orders?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      price_oracles: {
        Row: {
          price_usd: number
          symbol: string
          updated_at: string
        }
        Insert: {
          price_usd: number
          symbol: string
          updated_at?: string
        }
        Update: {
          price_usd?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          id: string
          min_quantity: number
          price: number
          product_id: string
          tier_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity: number
          price: number
          product_id: string
          tier_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          min_quantity?: number
          price?: number
          product_id?: string
          tier_name?: string | null
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          binding: string
          color_mode: string
          copies: number
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          notes: string | null
          pages: number
          ready_at: string | null
          sided: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          binding?: string
          color_mode?: string
          copies?: number
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          pages?: number
          ready_at?: string | null
          sided?: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          binding?: string
          color_mode?: string
          copies?: number
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          pages?: number
          ready_at?: string | null
          sided?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_addons: {
        Row: {
          created_at: string
          group_key: string
          group_name_i18n: Json
          id: string
          is_active: boolean
          is_required: boolean
          kind: string
          max_qty: number
          metadata: Json
          name_i18n: Json
          price_delta: number
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_key: string
          group_name_i18n?: Json
          id?: string
          is_active?: boolean
          is_required?: boolean
          kind?: string
          max_qty?: number
          metadata?: Json
          name_i18n?: Json
          price_delta?: number
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_key?: string
          group_name_i18n?: Json
          id?: string
          is_active?: boolean
          is_required?: boolean
          kind?: string
          max_qty?: number
          metadata?: Json
          name_i18n?: Json
          price_delta?: number
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "usa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_product_financial_dna"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batches: {
        Row: {
          batch_code: string | null
          cost_per_unit: number | null
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          received_at: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          batch_code?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          received_at?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          batch_code?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          received_at?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          price_label: string | null
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          price_label?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          price_label?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_media: {
        Row: {
          alt_i18n: Json
          created_at: string
          height: number | null
          id: string
          kind: string
          metadata: Json
          product_id: string
          sort_order: number
          url: string
          width: number | null
        }
        Insert: {
          alt_i18n?: Json
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          metadata?: Json
          product_id: string
          sort_order?: number
          url: string
          width?: number | null
        }
        Update: {
          alt_i18n?: Json
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          metadata?: Json
          product_id?: string
          sort_order?: number
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "usa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_product_financial_dna"
            referencedColumns: ["id"]
          },
        ]
      }
      product_nutrition: {
        Row: {
          allergens: string[]
          created_at: string
          diet_flags: Json
          ingredients_i18n: Json
          per_100g: Json
          per_serving: Json
          product_id: string
          serving_size_g: number | null
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          created_at?: string
          diet_flags?: Json
          ingredients_i18n?: Json
          per_100g?: Json
          per_serving?: Json
          product_id: string
          serving_size_g?: number | null
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          created_at?: string
          diet_flags?: Json
          ingredients_i18n?: Json
          per_100g?: Json
          per_serving?: Json
          product_id?: string
          serving_size_g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_nutrition_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "usa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_nutrition_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "view_product_financial_dna"
            referencedColumns: ["id"]
          },
        ]
      }
      product_partners: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          partner_name: string
          partner_phone: string | null
          partner_user_id: string | null
          percentage: number
          product_id: string
          profile_id: string | null
          split_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          partner_name: string
          partner_phone?: string | null
          partner_user_id?: string | null
          percentage: number
          product_id: string
          profile_id?: string | null
          split_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          partner_name?: string
          partner_phone?: string | null
          partner_user_id?: string | null
          percentage?: number
          product_id?: string
          profile_id?: string | null
          split_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_partners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_relations: {
        Row: {
          created_at: string
          metadata: Json
          product_id: string
          related_id: string
          relation_type: string
          strength: number
        }
        Insert: {
          created_at?: string
          metadata?: Json
          product_id: string
          related_id: string
          relation_type: string
          strength?: number
        }
        Update: {
          created_at?: string
          metadata?: Json
          product_id?: string
          related_id?: string
          relation_type?: string
          strength?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "usa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_product_financial_dna"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_related_id_fkey"
            columns: ["related_id"]
            isOneToOne: false
            referencedRelation: "usa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_related_id_fkey"
            columns: ["related_id"]
            isOneToOne: false
            referencedRelation: "view_product_financial_dna"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          barcode: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          product_name: string
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          product_name: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          product_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      product_units: {
        Row: {
          conversion_factor: number
          cost_price_per_unit: number | null
          created_at: string
          id: string
          is_active: boolean
          is_default_buy: boolean
          is_default_sell: boolean
          product_id: string
          selling_price: number | null
          unit_code: string
          updated_at: string
        }
        Insert: {
          conversion_factor: number
          cost_price_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default_buy?: boolean
          is_default_sell?: boolean
          product_id: string
          selling_price?: number | null
          unit_code: string
          updated_at?: string
        }
        Update: {
          conversion_factor?: number
          cost_price_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default_buy?: boolean
          is_default_sell?: boolean
          product_id?: string
          selling_price?: number | null
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_units_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["code"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          metadata: Json
          price_delta: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          metadata?: Json
          price_delta?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          metadata?: Json
          price_delta?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_variants_v2: {
        Row: {
          axis_key: string
          axis_value: string
          axis_value_i18n: Json
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_default: boolean
          metadata: Json
          price_delta: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          axis_key: string
          axis_value: string
          axis_value_i18n?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          metadata?: Json
          price_delta?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          axis_key?: string
          axis_value?: string
          axis_value_i18n?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          metadata?: Json
          price_delta?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_v2_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "usa_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_v2_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_product_financial_dna"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_key: string | null
          avatar_kind: string | null
          avatar_url: string | null
          birth_date: string | null
          branch_id: string | null
          budget_range: string | null
          city: string | null
          created_at: string
          dislikes: string[] | null
          full_name: string | null
          gender: string | null
          governorate: string | null
          hide_balance: boolean
          household_size: number | null
          id: string
          is_b2b_commissioner: boolean
          is_kyc_verified: boolean
          kyc_verified_at: string | null
          lifestyle_tags: string[] | null
          likes: string[] | null
          loyalty_lifetime_spend: number
          loyalty_points: number
          loyalty_tier: Database["public"]["Enums"]["loyalty_tier"]
          national_id: string | null
          occupation: string | null
          partner_tier_id: string | null
          phone: string | null
          preferred_locale: string | null
          referral_code: string | null
          referred_by: string | null
          short_id: string | null
          theme_preference: string | null
          updated_at: string
          vehicle_dna: Json
        }
        Insert: {
          avatar_key?: string | null
          avatar_kind?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          branch_id?: string | null
          budget_range?: string | null
          city?: string | null
          created_at?: string
          dislikes?: string[] | null
          full_name?: string | null
          gender?: string | null
          governorate?: string | null
          hide_balance?: boolean
          household_size?: number | null
          id: string
          is_b2b_commissioner?: boolean
          is_kyc_verified?: boolean
          kyc_verified_at?: string | null
          lifestyle_tags?: string[] | null
          likes?: string[] | null
          loyalty_lifetime_spend?: number
          loyalty_points?: number
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"]
          national_id?: string | null
          occupation?: string | null
          partner_tier_id?: string | null
          phone?: string | null
          preferred_locale?: string | null
          referral_code?: string | null
          referred_by?: string | null
          short_id?: string | null
          theme_preference?: string | null
          updated_at?: string
          vehicle_dna?: Json
        }
        Update: {
          avatar_key?: string | null
          avatar_kind?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          branch_id?: string | null
          budget_range?: string | null
          city?: string | null
          created_at?: string
          dislikes?: string[] | null
          full_name?: string | null
          gender?: string | null
          governorate?: string | null
          hide_balance?: boolean
          household_size?: number | null
          id?: string
          is_b2b_commissioner?: boolean
          is_kyc_verified?: boolean
          kyc_verified_at?: string | null
          lifestyle_tags?: string[] | null
          likes?: string[] | null
          loyalty_lifetime_spend?: number
          loyalty_points?: number
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"]
          national_id?: string | null
          occupation?: string | null
          partner_tier_id?: string | null
          phone?: string | null
          preferred_locale?: string | null
          referral_code?: string | null
          referred_by?: string | null
          short_id?: string | null
          theme_preference?: string | null
          updated_at?: string
          vehicle_dna?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_partner_tier_id_fkey"
            columns: ["partner_tier_id"]
            isOneToOne: false
            referencedRelation: "partner_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          paid_amount: number
          remaining: number | null
          status: string
          subtotal: number
          supplier_id: string
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number
          remaining?: number | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number
          remaining?: number | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          line_total: number | null
          product_id: string | null
          product_name: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          line_total?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          id: string
          po_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          po_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission: number
          created_at: string
          first_order_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          commission?: number
          created_at?: string
          first_order_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          commission?: number
          created_at?: string
          first_order_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          product_id: string
          rating: number | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      riba_audit_log: {
        Row: {
          amount: number | null
          category: string
          created_at: string
          description: string
          id: string
          recommendation: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          source_id: string
          source_table: string
          status: string
        }
        Insert: {
          amount?: number | null
          category: string
          created_at?: string
          description: string
          id?: string
          recommendation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_id: string
          source_table: string
          status?: string
        }
        Update: {
          amount?: number | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          recommendation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_id?: string
          source_table?: string
          status?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      routing_round_robin: {
        Row: {
          bucket_key: string
          last_vendor_id: string | null
          updated_at: string
        }
        Insert: {
          bucket_key: string
          last_vendor_id?: string | null
          updated_at?: string
        }
        Update: {
          bucket_key?: string
          last_vendor_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salsabil_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["salsabil_asset_type"]
          category_path: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          media: Json
          name: string
          semantic_embedding: string | null
          traits: Json
          updated_at: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["salsabil_asset_type"]
          category_path?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          media?: Json
          name: string
          semantic_embedding?: string | null
          traits?: Json
          updated_at?: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["salsabil_asset_type"]
          category_path?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          media?: Json
          name?: string
          semantic_embedding?: string | null
          traits?: Json
          updated_at?: string
        }
        Relationships: []
      }
      salsabil_delivery_legs: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          node_id: string
          route_geometry: Json | null
          sequence_index: number
          status: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          node_id: string
          route_geometry?: Json | null
          sequence_index?: number
          status?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          node_id?: string
          route_geometry?: Json | null
          sequence_index?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_delivery_legs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_delivery_legs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "salsabil_fulfillment_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_dispatch_offers: {
        Row: {
          created_at: string
          driver_id: string
          expires_at: string
          id: string
          node_id: string
          status: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          expires_at?: string
          id?: string
          node_id: string
          status?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          expires_at?: string
          id?: string
          node_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_dispatch_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_dispatch_offers_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "salsabil_fulfillment_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_driver_shifts: {
        Row: {
          driver_id: string
          ended_at: string | null
          gross_earnings: number
          id: string
          start_lat: number | null
          start_lng: number | null
          started_at: string
        }
        Insert: {
          driver_id: string
          ended_at?: string | null
          gross_earnings?: number
          id?: string
          start_lat?: number | null
          start_lng?: number | null
          started_at?: string
        }
        Update: {
          driver_id?: string
          ended_at?: string | null
          gross_earnings?: number
          id?: string
          start_lat?: number | null
          start_lng?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_driver_shifts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_event_timeline: {
        Row: {
          actor_id: string | null
          created_at: string
          event_domain: string
          event_type: string
          id: string
          payload: Json
          trace_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_domain: string
          event_type: string
          id?: string
          payload?: Json
          trace_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_domain?: string
          event_type?: string
          id?: string
          payload?: Json
          trace_id?: string
        }
        Relationships: []
      }
      salsabil_financial_contracts: {
        Row: {
          base_price: number
          contract_rules: Json
          created_at: string
          currency: string
          id: string
          is_active: boolean
          packaging_tier_id: string | null
          pricing_model: Database["public"]["Enums"]["salsabil_pricing_model"]
          sku_id: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          base_price?: number
          contract_rules?: Json
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          packaging_tier_id?: string | null
          pricing_model?: Database["public"]["Enums"]["salsabil_pricing_model"]
          sku_id: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          base_price?: number
          contract_rules?: Json
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          packaging_tier_id?: string | null
          pricing_model?: Database["public"]["Enums"]["salsabil_pricing_model"]
          sku_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_financial_contracts_packaging_tier_id_fkey"
            columns: ["packaging_tier_id"]
            isOneToOne: false
            referencedRelation: "salsabil_packaging_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_financial_contracts_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "salsabil_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_fulfillment_items: {
        Row: {
          created_at: string
          id: string
          node_id: string
          price_at_time: number
          quantity: number
          sku_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          node_id: string
          price_at_time?: number
          quantity: number
          sku_id: string
        }
        Update: {
          created_at?: string
          id?: string
          node_id?: string
          price_at_time?: number
          quantity?: number
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_fulfillment_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "salsabil_fulfillment_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_fulfillment_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "salsabil_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_fulfillment_nodes: {
        Row: {
          arrived_vendor_at: string | null
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_snapshot: Json
          driver_id: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          master_order_id: string | null
          notes: string | null
          picked_up_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          status: string
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          arrived_vendor_at?: string | null
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_snapshot?: Json
          driver_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          master_order_id?: string | null
          notes?: string | null
          picked_up_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          arrived_vendor_at?: string | null
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_snapshot?: Json
          driver_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          master_order_id?: string | null
          notes?: string | null
          picked_up_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_fulfillment_nodes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_fulfillment_nodes_master_fk"
            columns: ["master_order_id"]
            isOneToOne: false
            referencedRelation: "salsabil_master_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_fulfillment_nodes_master_order_id_fkey"
            columns: ["master_order_id"]
            isOneToOne: false
            referencedRelation: "salsabil_master_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_fulfillment_nodes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "salsabil_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_inventory_matrix: {
        Row: {
          availability_data: Json
          id: string
          inventory_type: Database["public"]["Enums"]["salsabil_inventory_type"]
          location_code: string | null
          packaging_tier_id: string | null
          sku_id: string
          updated_at: string
        }
        Insert: {
          availability_data?: Json
          id?: string
          inventory_type?: Database["public"]["Enums"]["salsabil_inventory_type"]
          location_code?: string | null
          packaging_tier_id?: string | null
          sku_id: string
          updated_at?: string
        }
        Update: {
          availability_data?: Json
          id?: string
          inventory_type?: Database["public"]["Enums"]["salsabil_inventory_type"]
          location_code?: string | null
          packaging_tier_id?: string | null
          sku_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_inventory_matrix_packaging_tier_id_fkey"
            columns: ["packaging_tier_id"]
            isOneToOne: false
            referencedRelation: "salsabil_packaging_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_inventory_matrix_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "salsabil_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_logistics_config: {
        Row: {
          base_fee: number
          created_at: string
          free_delivery_threshold: number
          id: string
          per_km_fee: number
          speed_tiers: Json
          surge_multiplier: number
          zone_id: string | null
        }
        Insert: {
          base_fee?: number
          created_at?: string
          free_delivery_threshold?: number
          id?: string
          per_km_fee?: number
          speed_tiers?: Json
          surge_multiplier?: number
          zone_id?: string | null
        }
        Update: {
          base_fee?: number
          created_at?: string
          free_delivery_threshold?: number
          id?: string
          per_km_fee?: number
          speed_tiers?: Json
          surge_multiplier?: number
          zone_id?: string | null
        }
        Relationships: []
      }
      salsabil_master_orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_info: Json
          id: string
          idempotency_key: string | null
          paid_at: string | null
          payment_status: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_info?: Json
          id?: string
          idempotency_key?: string | null
          paid_at?: string | null
          payment_status?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_info?: Json
          id?: string
          idempotency_key?: string | null
          paid_at?: string | null
          payment_status?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      salsabil_packaging_tiers: {
        Row: {
          asset_id: string
          attributes: Json
          barcode: string | null
          conversion_to_base: number
          conversion_to_parent: number
          created_at: string
          id: string
          is_active: boolean
          is_default_buy: boolean
          is_default_sell: boolean
          is_stock_keeping: boolean
          parent_tier_id: string | null
          price_override: number | null
          sort_order: number
          tier_label: string
          uom_code: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          attributes?: Json
          barcode?: string | null
          conversion_to_base?: number
          conversion_to_parent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default_buy?: boolean
          is_default_sell?: boolean
          is_stock_keeping?: boolean
          parent_tier_id?: string | null
          price_override?: number | null
          sort_order?: number
          tier_label: string
          uom_code?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          attributes?: Json
          barcode?: string | null
          conversion_to_base?: number
          conversion_to_parent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default_buy?: boolean
          is_default_sell?: boolean
          is_stock_keeping?: boolean
          parent_tier_id?: string | null
          price_override?: number | null
          sort_order?: number
          tier_label?: string
          uom_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_packaging_tiers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "salsabil_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_packaging_tiers_parent_tier_id_fkey"
            columns: ["parent_tier_id"]
            isOneToOne: false
            referencedRelation: "salsabil_packaging_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_packaging_tiers_uom_code_fkey"
            columns: ["uom_code"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["code"]
          },
        ]
      }
      salsabil_persona_matrix: {
        Row: {
          capabilities: Json
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          label_ar: string
          persona_key: string
          role_predicates: Json
          sort_order: number
          theme_overlay: Json
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label_ar: string
          persona_key: string
          role_predicates?: Json
          sort_order?: number
          theme_overlay?: Json
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string
          persona_key?: string
          role_predicates?: Json
          sort_order?: number
          theme_overlay?: Json
          updated_at?: string
        }
        Relationships: []
      }
      salsabil_rideshare_pool: {
        Row: {
          available_seats: number
          created_at: string
          departure_at: string | null
          dest_lat: number | null
          dest_lng: number | null
          id: string
          origin_lat: number | null
          origin_lng: number | null
          owner_id: string
          status: string
          trunk_capacity_liters: number
        }
        Insert: {
          available_seats?: number
          created_at?: string
          departure_at?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          owner_id: string
          status?: string
          trunk_capacity_liters?: number
        }
        Update: {
          available_seats?: number
          created_at?: string
          departure_at?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          owner_id?: string
          status?: string
          trunk_capacity_liters?: number
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_rideshare_pool_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_skus: {
        Row: {
          asset_id: string
          attributes: Json
          barcode: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          sku_code: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          asset_id: string
          attributes?: Json
          barcode?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          sku_code: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          asset_id?: string
          attributes?: Json
          barcode?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          sku_code?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_skus_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "salsabil_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_theme_matrix: {
        Row: {
          created_at: string
          dna_payload: Json
          id: string
          is_active: boolean
          tenant_id: string
          theme_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dna_payload?: Json
          id?: string
          is_active?: boolean
          tenant_id?: string
          theme_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dna_payload?: Json
          id?: string
          is_active?: boolean
          tenant_id?: string
          theme_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      salsabil_vendor_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_vendor_members_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "salsabil_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_vendor_settlements: {
        Row: {
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          node_id: string
          platform_fee: number
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          node_id: string
          platform_fee?: number
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          node_id?: string
          platform_fee?: number
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salsabil_vendor_settlements_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: true
            referencedRelation: "salsabil_fulfillment_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salsabil_vendor_settlements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "salsabil_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      salsabil_vendors: {
        Row: {
          business_name: string
          commission_rate: number
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
        }
        Insert: {
          business_name: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
        }
        Update: {
          business_name?: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
        }
        Relationships: []
      }
      saved_baskets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          items: Json
          name: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_jar: {
        Row: {
          auto_save_enabled: boolean
          balance: number
          created_at: string
          goal: number | null
          goal_label: string | null
          id: string
          round_to: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_save_enabled?: boolean
          balance?: number
          created_at?: string
          goal?: number | null
          goal_label?: string | null
          id?: string
          round_to?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_save_enabled?: boolean
          balance?: number
          created_at?: string
          goal?: number | null
          goal_label?: string | null
          id?: string
          round_to?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          idempotency_key: string | null
          kind: string
          label: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          label: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_transfers: {
        Row: {
          amount: number
          created_at: string
          frequency: Database["public"]["Enums"]["scheduled_transfer_frequency"]
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string
          purpose: Database["public"]["Enums"]["scheduled_transfer_purpose"]
          recipient_id: string | null
          reference_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          frequency: Database["public"]["Enums"]["scheduled_transfer_frequency"]
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at: string
          purpose?: Database["public"]["Enums"]["scheduled_transfer_purpose"]
          recipient_id?: string | null
          reference_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          frequency?: Database["public"]["Enums"]["scheduled_transfer_frequency"]
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string
          purpose?: Database["public"]["Enums"]["scheduled_transfer_purpose"]
          recipient_id?: string | null
          reference_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sdui_layout_versions: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string | null
          id: string
          layout_id: string
          notes: string | null
          status: string
          version_number: number
        }
        Insert: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          layout_id: string
          notes?: string | null
          status?: string
          version_number?: number
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          layout_id?: string
          notes?: string | null
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sdui_layout_versions_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "sdui_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      sdui_layouts: {
        Row: {
          active_version_id: string | null
          created_at: string
          description: string | null
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdui_layouts_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "sdui_layout_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      section_capabilities: {
        Row: {
          capability_key: string
          config: Json
          created_at: string
          section_id: string
        }
        Insert: {
          capability_key: string
          config?: Json
          created_at?: string
          section_id: string
        }
        Update: {
          capability_key?: string
          config?: Json
          created_at?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_capabilities_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "capability_registry"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "section_capabilities_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          cover_image: string | null
          created_at: string
          description_i18n: Json
          icon: string | null
          id: string
          is_active: boolean
          metadata: Json
          name_i18n: Json
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description_i18n?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name_i18n?: Json
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description_i18n?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name_i18n?: Json
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      securities: {
        Row: {
          company_name: string
          created_at: string
          id: string
          status: string
          symbol: string
          total_supply: number
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          status?: string
          symbol: string
          total_supply: number
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          status?: string
          symbol?: string
          total_supply?: number
          updated_at?: string
        }
        Relationships: []
      }
      security_holdings: {
        Row: {
          amount: number
          id: string
          security_id: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount?: number
          id?: string
          security_id: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          id?: string
          security_id?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_holdings_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_holdings_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_cart_items: {
        Row: {
          added_by: string
          cart_id: string
          created_at: string
          id: string
          meta: Json
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          added_by: string
          cart_id: string
          created_at?: string
          id?: string
          meta?: Json
          product_id: string
          product_name: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          added_by?: string
          cart_id?: string
          created_at?: string
          id?: string
          meta?: Json
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_cart_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shared_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_cart_participants: {
        Row: {
          approval_status: Database["public"]["Enums"]["shared_cart_approval"]
          approved_at: string | null
          cart_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["shared_cart_role"]
          split_type: Database["public"]["Enums"]["shared_cart_split_type"]
          split_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["shared_cart_approval"]
          approved_at?: string | null
          cart_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["shared_cart_role"]
          split_type?: Database["public"]["Enums"]["shared_cart_split_type"]
          split_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["shared_cart_approval"]
          approved_at?: string | null
          cart_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["shared_cart_role"]
          split_type?: Database["public"]["Enums"]["shared_cart_split_type"]
          split_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_cart_participants_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shared_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_cart_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_carts: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          status: Database["public"]["Enums"]["shared_cart_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["shared_cart_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["shared_cart_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_carts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      staff_advance_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          id: string
          kind: string
          reason: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          kind: string
          reason: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          reason?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_advance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          branch_id: string | null
          check_in_at: string
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          check_in_at?: string
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          check_in_at?: string
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settlements: {
        Row: {
          commission_amount: number
          commission_pct: number
          created_at: string
          gross_sales: number
          id: string
          net_payout: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          store_id: string
        }
        Insert: {
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          gross_sales?: number
          id?: string
          net_payout?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          store_id: string
        }
        Update: {
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          gross_sales?: number
          id?: string
          net_payout?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_settlements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_rails: {
        Row: {
          created_at: string
          ends_at: string | null
          frequency_tag: Database["public"]["Enums"]["rail_frequency_tag"]
          id: string
          is_active: boolean
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          target_id: string | null
          title: string
          type: Database["public"]["Enums"]["storefront_rail_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          frequency_tag?: Database["public"]["Enums"]["rail_frequency_tag"]
          id?: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          target_id?: string | null
          title: string
          type: Database["public"]["Enums"]["storefront_rail_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          frequency_tag?: Database["public"]["Enums"]["rail_frequency_tag"]
          id?: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          target_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["storefront_rail_type"]
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          branch_id: string | null
          commission_pct: number
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          slug: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_billing_runs: {
        Row: {
          amount: number
          billed_at: string
          id: string
          next_due_at: string | null
          notes: string | null
          previous_due_at: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          amount?: number
          billed_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          previous_due_at?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          amount?: number
          billed_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          previous_due_at?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_billing_runs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          base_price: number
          created_at: string
          frequency: string
          id: string
          name_i18n: Json
          status: string
          updated_at: string
        }
        Insert: {
          base_price: number
          created_at?: string
          frequency: string
          id?: string
          name_i18n?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          frequency?: string
          id?: string
          name_i18n?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          delivery_address_id: string
          id: string
          next_billing_date: string
          plan_id: string
          status: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          delivery_address_id: string
          id?: string
          next_billing_date: string
          plan_id: string
          status?: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          delivery_address_id?: string
          id?: string
          next_billing_date?: string
          plan_id?: string
          status?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          branch_id: string | null
          closing_day: number | null
          collection_days: number[] | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          outstanding_balance: number
          payment_terms_days: number | null
          total_paid: number
          total_purchased: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          closing_day?: number | null
          collection_days?: number[] | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          outstanding_balance?: number
          payment_terms_days?: number | null
          total_paid?: number
          total_purchased?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          closing_day?: number | null
          collection_days?: number[] | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          outstanding_balance?: number
          payment_terms_days?: number | null
          total_paid?: number
          total_purchased?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          message: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tayseer_family_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tayseer_family_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tayseer_family_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tayseer_family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tayseer_shared_vault_members: {
        Row: {
          joined_at: string
          role: string
          user_id: string
          vault_id: string
        }
        Insert: {
          joined_at?: string
          role: string
          user_id: string
          vault_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          user_id?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tayseer_shared_vault_members_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "tayseer_shared_vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      tayseer_shared_vaults: {
        Row: {
          created_at: string
          created_by: string
          current_balance: number
          group_id: string | null
          id: string
          name: string
          status: string
          target_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_balance?: number
          group_id?: string | null
          id?: string
          name: string
          status?: string
          target_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_balance?: number
          group_id?: string | null
          id?: string
          name?: string
          status?: string
          target_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tayseer_shared_vaults_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tayseer_family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tayseer_wallet_limits: {
        Row: {
          active: boolean
          created_at: string
          id: string
          max_amount: number
          period: string
          set_by: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          max_amount: number
          period: string
          set_by: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          max_amount?: number
          period?: string
          set_by?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tayseer_wallet_limits_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          execute_amount: number
          execute_price: number
          executed_at: string
          id: string
          maker_order_id: string
          security_id: string
          taker_order_id: string
        }
        Insert: {
          execute_amount: number
          execute_price: number
          executed_at?: string
          id?: string
          maker_order_id: string
          security_id: string
          taker_order_id: string
        }
        Update: {
          execute_amount?: number
          execute_price?: number
          executed_at?: string
          id?: string
          maker_order_id?: string
          security_id?: string
          taker_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_maker_order_id_fkey"
            columns: ["maker_order_id"]
            isOneToOne: false
            referencedRelation: "order_book"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_taker_order_id_fkey"
            columns: ["taker_order_id"]
            isOneToOne: false
            referencedRelation: "order_book"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_layout_history: {
        Row: {
          id: string
          note: string | null
          page_key: string
          published_at: string
          published_by: string | null
          section_config: Json
          section_order: Json
          section_titles: Json
          title: string | null
          version: number
        }
        Insert: {
          id?: string
          note?: string | null
          page_key: string
          published_at?: string
          published_by?: string | null
          section_config: Json
          section_order: Json
          section_titles?: Json
          title?: string | null
          version: number
        }
        Update: {
          id?: string
          note?: string | null
          page_key?: string
          published_at?: string
          published_by?: string | null
          section_config?: Json
          section_order?: Json
          section_titles?: Json
          title?: string | null
          version?: number
        }
        Relationships: []
      }
      ui_layouts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          page_key: string
          published_at: string | null
          published_by: string | null
          section_config: Json
          section_order: Json
          section_titles: Json
          status: string
          title: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_key: string
          published_at?: string | null
          published_by?: string | null
          section_config?: Json
          section_order?: Json
          section_titles?: Json
          status?: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_key?: string
          published_at?: string | null
          published_by?: string | null
          section_config?: Json
          section_order?: Json
          section_titles?: Json
          status?: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      units_of_measure: {
        Row: {
          code: string
          created_at: string
          id: string
          is_base: boolean
          name_ar: string
          name_en: string | null
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_base?: boolean
          name_ar: string
          name_en?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_base?: boolean
          name_ar?: string
          name_en?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      usa_products: {
        Row: {
          attributes: Json
          badges: string[]
          base_price: number
          compare_at_price: number | null
          created_at: string
          currency: string
          deleted_at: string | null
          description_i18n: Json
          id: string
          is_active: boolean
          is_featured: boolean
          is_perishable: boolean
          low_stock_threshold: number
          member_price: number | null
          name_i18n: Json
          popularity_score: number
          rating_avg: number
          rating_count: number
          sale_unit: string
          seasonal_window: Json | null
          section_id: string
          shelf_life_days: number | null
          short_description_i18n: Json
          sku: string | null
          slug: string
          stock_qty: number
          storage_conditions_i18n: Json
          story_i18n: Json
          tags: string[]
          tax_class: string | null
          updated_at: string
          wholesale_price: number | null
        }
        Insert: {
          attributes?: Json
          badges?: string[]
          base_price: number
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description_i18n?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_perishable?: boolean
          low_stock_threshold?: number
          member_price?: number | null
          name_i18n?: Json
          popularity_score?: number
          rating_avg?: number
          rating_count?: number
          sale_unit?: string
          seasonal_window?: Json | null
          section_id: string
          shelf_life_days?: number | null
          short_description_i18n?: Json
          sku?: string | null
          slug: string
          stock_qty?: number
          storage_conditions_i18n?: Json
          story_i18n?: Json
          tags?: string[]
          tax_class?: string | null
          updated_at?: string
          wholesale_price?: number | null
        }
        Update: {
          attributes?: Json
          badges?: string[]
          base_price?: number
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description_i18n?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_perishable?: boolean
          low_stock_threshold?: number
          member_price?: number | null
          name_i18n?: Json
          popularity_score?: number
          rating_avg?: number
          rating_count?: number
          sale_unit?: string
          seasonal_window?: Json | null
          section_id?: string
          shelf_life_days?: number | null
          short_description_i18n?: Json
          sku?: string | null
          slug?: string
          stock_qty?: number
          storage_conditions_i18n?: Json
          story_i18n?: Json
          tags?: string[]
          tax_class?: string | null
          updated_at?: string
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usa_products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_affiliate_state: {
        Row: {
          current_tier_id: string | null
          successful_invites: number
          total_commission_earned: number
          unlocks_wholesale: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          current_tier_id?: string | null
          successful_invites?: number
          total_commission_earned?: number
          unlocks_wholesale?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          current_tier_id?: string | null
          successful_invites?: number
          total_commission_earned?: number
          unlocks_wholesale?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_affiliate_state_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "affiliate_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavior_events: {
        Row: {
          app_id: Database["public"]["Enums"]["salsabil_app_id"]
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          app_id?: Database["public"]["Enums"]["salsabil_app_id"]
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          user_id: string
        }
        Update: {
          app_id?: Database["public"]["Enums"]["salsabil_app_id"]
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_behavior_logs: {
        Row: {
          category: string | null
          created_at: string
          dwell_ms: number | null
          event_type: string
          id: string
          product_id: string | null
          query: string | null
          session_id: string | null
          user_id: string | null
          weight: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          dwell_ms?: number | null
          event_type: string
          id?: string
          product_id?: string | null
          query?: string | null
          session_id?: string | null
          user_id?: string | null
          weight?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          dwell_ms?: number | null
          event_type?: string
          id?: string
          product_id?: string | null
          query?: string | null
          session_id?: string | null
          user_id?: string | null
          weight?: number
        }
        Relationships: []
      }
      user_capabilities: {
        Row: {
          capability: string
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          capability: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          capability?: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_capabilities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mini_programs: {
        Row: {
          installed_at: string
          mini_program_id: string
          user_id: string
        }
        Insert: {
          installed_at?: string
          mini_program_id: string
          user_id: string
        }
        Update: {
          installed_at?: string
          mini_program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mini_programs_mini_program_id_fkey"
            columns: ["mini_program_id"]
            isOneToOne: false
            referencedRelation: "mini_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payout_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_details: Json
          created_at: string
          id: string
          ledger_tx_id: string | null
          method: string
          notes: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json
          created_at?: string
          id?: string
          ledger_tx_id?: string | null
          method: string
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json
          created_at?: string
          id?: string
          ledger_tx_id?: string | null
          method?: string
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          avg_order_value: number | null
          created_at: string
          frequent_products: Json
          last_refreshed_at: string
          price_sensitivity: string
          top_categories: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_order_value?: number | null
          created_at?: string
          frequent_products?: Json
          last_refreshed_at?: string
          price_sensitivity?: string
          top_categories?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_order_value?: number | null
          created_at?: string
          frequent_products?: Json
          last_refreshed_at?: string
          price_sensitivity?: string
          top_categories?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trust_score: {
        Row: {
          created_at: string
          is_trusted: boolean
          score: number
          tier: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_trusted?: boolean
          score?: number
          tier?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_trusted?: boolean
          score?: number
          tier?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_inventory: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          product_id: string
          stock_level: number
          updated_at: string
          vendor_id: string
          vendor_price: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          stock_level?: number
          updated_at?: string
          vendor_id: string
          vendor_price?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          stock_level?: number
          updated_at?: string
          vendor_id?: string
          vendor_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "global_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payout_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_details: Json
          created_at: string
          id: string
          method: string
          notes: string | null
          payout_id: string | null
          rejection_reason: string | null
          requester_user_id: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payout_id?: string | null
          rejection_reason?: string | null
          requester_user_id?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_details?: Json
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          payout_id?: string | null
          rejection_reason?: string | null
          requester_user_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payout_requests_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "vendor_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payout_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          performed_by: string
          performed_by_name: string | null
          period_end: string | null
          period_start: string | null
          reference: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          performed_by: string
          performed_by_name?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          performed_by?: string
          performed_by_name?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_trust_settings: {
        Row: {
          created_at: string
          freeze_duration_days: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          freeze_duration_days?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          freeze_duration_days?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_wallet_transactions: {
        Row: {
          amount: number
          commission_pct: number | null
          created_at: string
          gross_amount: number | null
          id: string
          kind: string
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          payout_request_id: string | null
          product_id: string | null
          product_name: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          amount: number
          commission_pct?: number | null
          created_at?: string
          gross_amount?: number | null
          id?: string
          kind: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payout_request_id?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          commission_pct?: number | null
          created_at?: string
          gross_amount?: number | null
          id?: string
          kind?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payout_request_id?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_wallet_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_wallets: {
        Row: {
          available_balance: number
          lifetime_earned: number
          lifetime_paid_out: number
          pending_balance: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          available_balance?: number
          lifetime_earned?: number
          lifetime_paid_out?: number
          pending_balance?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          available_balance?: number
          lifetime_earned?: number
          lifetime_paid_out?: number
          pending_balance?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_wallets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          account_manager_id: string | null
          address: string | null
          branch_id: string | null
          commission_pct: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          current_location: unknown
          id: string
          is_active: boolean
          name: string
          owner_user_id: string | null
          payout_details: Json | null
          payout_method: string | null
          slug: string
          updated_at: string
          vendor_type: string
        }
        Insert: {
          account_manager_id?: string | null
          address?: string | null
          branch_id?: string | null
          commission_pct?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_location?: unknown
          id?: string
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          payout_details?: Json | null
          payout_method?: string | null
          slug: string
          updated_at?: string
          vendor_type?: string
        }
        Update: {
          account_manager_id?: string | null
          address?: string | null
          branch_id?: string | null
          commission_pct?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_location?: unknown
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          payout_details?: Json | null
          payout_method?: string | null
          slug?: string
          updated_at?: string
          vendor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_inferences: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          draft_payload: Json
          id: string
          input_hash: string
          model: string
          prompt_version: string
          raw_output: Json
          state: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          draft_payload: Json
          id?: string
          input_hash: string
          model: string
          prompt_version: string
          raw_output: Json
          state?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          draft_payload?: Json
          id?: string
          input_hash?: string
          model?: string
          prompt_version?: string
          raw_output?: Json
          state?: string
        }
        Relationships: []
      }
      wallet_assets: {
        Row: {
          asset_type: string
          balance: number
          created_at: string
          currency_code: string
          id: string
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: string
          balance?: number
          created_at?: string
          currency_code?: string
          id?: string
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          balance?: number
          created_at?: string
          currency_code?: string
          id?: string
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          balance: number
          cashback: number
          coupons: number
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          cashback?: number
          coupons?: number
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          cashback?: number
          coupons?: number
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_sub_accounts: {
        Row: {
          balance: number
          beneficiary_phone: string | null
          beneficiary_user_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string
          monthly_limit: number | null
          owner_user_id: string
          restricted_to_categories: string[] | null
          updated_at: string
        }
        Insert: {
          balance?: number
          beneficiary_phone?: string | null
          beneficiary_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label: string
          monthly_limit?: number | null
          owner_user_id: string
          restricted_to_categories?: string[] | null
          updated_at?: string
        }
        Update: {
          balance?: number
          beneficiary_phone?: string | null
          beneficiary_user_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          monthly_limit?: number | null
          owner_user_id?: string
          restricted_to_categories?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      wallet_topup_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          method: string
          note: string | null
          performed_by: string
          performed_by_name: string | null
          rejection_reason: string | null
          status: string
          transfer_reference: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          method: string
          note?: string | null
          performed_by: string
          performed_by_name?: string | null
          rejection_reason?: string | null
          status?: string
          transfer_reference: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          performed_by?: string
          performed_by_name?: string | null
          rejection_reason?: string | null
          status?: string
          transfer_reference?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by_admin: string | null
          expires_at: string | null
          id: string
          kind: string
          label: string
          reference_order_id: string | null
          restricted_to_categories: string[] | null
          source: string | null
          status: string
          sub_account_id: string | null
          user_id: string
          vest_release_at: string | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_admin?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          label: string
          reference_order_id?: string | null
          restricted_to_categories?: string[] | null
          source?: string | null
          status?: string
          sub_account_id?: string | null
          user_id: string
          vest_release_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_admin?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          label?: string
          reference_order_id?: string | null
          restricted_to_categories?: string[] | null
          source?: string | null
          status?: string
          sub_account_id?: string | null
          user_id?: string
          vest_release_at?: string | null
        }
        Relationships: []
      }
      wallet_transfer_idempotency: {
        Row: {
          amount: number
          created_at: string
          idempotency_key: string
          recipient_id: string
          result: Json | null
          sender_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          idempotency_key: string
          recipient_id: string
          result?: Json | null
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          idempotency_key?: string
          recipient_id?: string
          result?: Json | null
          sender_id?: string
        }
        Relationships: []
      }
      wallet_vaults: {
        Row: {
          created_at: string
          current_balance: number
          icon: string | null
          id: string
          locked_until: string | null
          name: string
          target_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          icon?: string | null
          id?: string
          locked_until?: string | null
          name: string
          target_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          icon?: string | null
          id?: string
          locked_until?: string | null
          name?: string
          target_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          credit_limit: number
          currency: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          credit_limit?: number
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          credit_limit?: number
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          branch_id: string | null
          city: string | null
          code: string
          created_at: string
          district: string | null
          id: string
          is_active: boolean
          location: unknown
          name: string
          notes: string | null
          priority: number
          served_zones: string[]
          updated_at: string
          vendor_id: string | null
          warehouse_type: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          city?: string | null
          code: string
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          location?: unknown
          name: string
          notes?: string | null
          priority?: number
          served_zones?: string[]
          updated_at?: string
          vendor_id?: string | null
          warehouse_type?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          city?: string | null
          code?: string
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          location?: unknown
          name?: string
          notes?: string | null
          priority?: number
          served_zones?: string[]
          updated_at?: string
          vendor_id?: string | null
          warehouse_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_contexts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["workspace_kind"]
          label: string
          owner_id: string
          theme_overlay: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["workspace_kind"]
          label: string
          owner_id: string
          theme_overlay?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["workspace_kind"]
          label?: string
          owner_id?: string
          theme_overlay?: Json
          updated_at?: string
        }
        Relationships: []
      }
      zakat_assessments: {
        Row: {
          cash_balances: number
          computed_by: string | null
          created_at: string
          id: string
          inventory_market_value: number
          is_above_nisab: boolean
          liabilities: number
          nisab_value: number
          notes: string | null
          period_end: string
          period_start: string
          receivables: number
          status: string
          zakat_base: number
          zakat_due: number
        }
        Insert: {
          cash_balances?: number
          computed_by?: string | null
          created_at?: string
          id?: string
          inventory_market_value?: number
          is_above_nisab?: boolean
          liabilities?: number
          nisab_value?: number
          notes?: string | null
          period_end: string
          period_start: string
          receivables?: number
          status?: string
          zakat_base?: number
          zakat_due?: number
        }
        Update: {
          cash_balances?: number
          computed_by?: string | null
          created_at?: string
          id?: string
          inventory_market_value?: number
          is_above_nisab?: boolean
          liabilities?: number
          nisab_value?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          receivables?: number
          status?: string
          zakat_base?: number
          zakat_due?: number
        }
        Relationships: []
      }
      zone_availability: {
        Row: {
          branch_id: string | null
          category_id: string | null
          created_at: string
          id: string
          is_available: boolean
          product_id: string | null
          zone_id: string
        }
        Insert: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          product_id?: string | null
          zone_id: string
        }
        Update: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          product_id?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_availability_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_kpi_snapshots: {
        Row: {
          refreshed_at: string | null
          snapshot_id: number | null
          total_disputed_escrow_funds: number | null
          total_users: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      human_relationships: {
        Row: {
          kind: string | null
          profile_id: string | null
          ref_id: string | null
          started_at: string | null
        }
        Relationships: []
      }
      view_product_financial_dna: {
        Row: {
          base_price: number | null
          currency: string | null
          id: string | null
          pricing_rules: Json | null
          tax_class: string | null
        }
        Insert: {
          base_price?: number | null
          currency?: never
          id?: string | null
          pricing_rules?: never
          tax_class?: string | null
        }
        Update: {
          base_price?: number | null
          currency?: never
          id?: string | null
          pricing_rules?: never
          tax_class?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _gen_unique_6digit_code: { Args: never; Returns: string }
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _resolve_wallet: {
        Args: { p_currency: string; p_user_id: string }
        Returns: string
      }
      _sdui_attr: {
        Args: {
          p_data_type: string
          p_entity: string
          p_key: string
          p_label_ar: string
          p_label_en: string
          p_listable?: boolean
          p_required?: boolean
          p_searchable?: boolean
          p_sort: number
          p_widget: string
        }
        Returns: undefined
      }
      _sdui_register_entity: {
        Args: {
          p_icon: string
          p_key: string
          p_label_ar: string
          p_label_en: string
          p_sort: number
          p_table: string
        }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_dispatch_offer: {
        Args: { p_driver_id: string; p_offer_id: string }
        Returns: boolean
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_entity_upsert: {
        Args: {
          p_entity_key: string
          p_idempotency_key?: string
          p_payload?: Json
          p_record_id?: string
        }
        Returns: Json
      }
      admin_manage_staff_role: {
        Args: {
          p_action: string
          p_is_active?: boolean
          p_role: Database["public"]["Enums"]["app_role"]
          p_role_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_schema_rollback: {
        Args: { p_entity_id: string; p_mode: string }
        Returns: Json
      }
      admin_set_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: Json
      }
      admin_topup_wallet: {
        Args: {
          _amount: number
          _method: string
          _note?: string
          _transfer_reference: string
          _user_id: string
        }
        Returns: Json
      }
      admin_trigger_circuit_breaker: {
        Args: { p_reason: string; p_setting_key: string }
        Returns: Json
      }
      admin_update_partner_ledger: {
        Args: { p_ledger_id: string; p_mark_paid?: boolean; p_status?: string }
        Returns: Json
      }
      apply_referral_code: { Args: { p_code: string }; Returns: Json }
      approve_advance_request: { Args: { _request_id: string }; Returns: Json }
      approve_wallet_topup: { Args: { _topup_id: string }; Returns: Json }
      broadcast_smart_dispatch: { Args: { p_node_id: string }; Returns: number }
      can_access_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: boolean
      }
      can_set_wallet_limit: {
        Args: { p_setter: string; p_wallet_id: string }
        Returns: boolean
      }
      category_affinity: {
        Args: { _user_id: string }
        Returns: {
          category: string
          score: number
        }[]
      }
      check_kyc_status: { Args: { p_user_id: string }; Returns: boolean }
      check_phone_exists: { Args: { p_phone: string }; Returns: boolean }
      check_wallet_limit: {
        Args: { p_amount: number; p_wallet_id: string }
        Returns: undefined
      }
      clear_sovereign_settlements: {
        Args: { p_vendor_id: string }
        Returns: number
      }
      close_pos_shift: {
        Args: { _actual_balance: number; _shift_id: string }
        Returns: {
          branch_id: string | null
          cashier_id: string
          closed_at: string | null
          closing_balance: number | null
          created_at: string
          discrepancy: number | null
          expected_balance: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number
          status: string
          total_orders: number
          total_sales: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pos_shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_driver_commission: {
        Args: { _driver_id: string; _order_total: number }
        Returns: number
      }
      confirm_handover: {
        Args: { p_channel: string; p_node_id: string; p_otp: string }
        Returns: Json
      }
      convert_to_pieces: {
        Args: { _product_id: string; _qty: number; _unit_code: string }
        Returns: number
      }
      create_gam_eya: {
        Args: {
          _cycle_amount: number
          _max_members: number
          _name: string
          _starts_at?: string
        }
        Returns: string
      }
      current_driver_id: { Args: never; Returns: string }
      current_mega_event: { Args: never; Returns: Json }
      current_user_branch_id: { Args: never; Returns: string }
      current_user_is_vendor_member: {
        Args: { _vendor_id: string }
        Returns: boolean
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      dispatch_nearest_drivers: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_meters?: number
        }
        Returns: Json
      }
      donate_to_campaign: {
        Args: {
          _amount: number
          _campaign_id: string
          _note?: string
          _source?: string
        }
        Returns: Json
      }
      driver_portal_stats: { Args: never; Returns: Json }
      driver_settle_cash: {
        Args: {
          _amount: number
          _bank_reference?: string
          _driver_id: string
          _kind?: string
          _notes?: string
        }
        Returns: Json
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      emit_sovereign_event: {
        Args: {
          p_domain: string
          p_payload?: Json
          p_trace_id?: string
          p_type: string
        }
        Returns: string
      }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_referral_code: { Args: { _user_id?: string }; Returns: string }
      ensure_workspace: {
        Args: {
          p_kind: Database["public"]["Enums"]["workspace_kind"]
          p_label?: string
          p_owner: string
        }
        Returns: string
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      explode_bom: {
        Args: { p_product_id: string; p_target_qty: number }
        Returns: Json
      }
      find_allocation_warehouse: {
        Args: { _product_id: string; _qty: number; _zone: string }
        Returns: {
          available_stock: number
          priority: number
          vendor_id: string
          warehouse_id: string
          warehouse_type: string
        }[]
      }
      find_nearest_drivers:
        | {
            Args: { p_lat: number; p_lon: number; p_radius_meters: number }
            Returns: {
              current_location: unknown
              distance_meters: number
              driver_id: string
            }[]
          }
        | {
            Args: {
              p_lat: number
              p_limit?: number
              p_lng: number
              p_radius_m?: number
            }
            Returns: {
              distance_m: number
              driver_id: string
              updated_at: string
            }[]
          }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_handover_otp: { Args: { p_node_id: string }; Returns: string }
      get_human_360: { Args: { p_profile_id: string }; Returns: Json }
      get_sovereign_logistics_quote: {
        Args: {
          p_cart_total: number
          p_distance_km: number
          p_speed_tier?: string
          p_zone_id: string
        }
        Returns: Json
      }
      get_user_companies: { Args: { p_user_id: string }; Returns: Json }
      get_user_daily_transfer_limit: {
        Args: { _user_id?: string }
        Returns: number
      }
      get_user_kyc_level: { Args: { _user_id?: string }; Returns: number }
      gettransactionid: { Args: never; Returns: unknown }
      group_buy_current_price: {
        Args: { _campaign_id: string }
        Returns: number
      }
      hakim_pulse_stats: { Args: { _minutes?: number }; Returns: Json }
      hakim_user_financial_snapshot: {
        Args: { p_days?: number; p_user_id: string }
        Returns: Json
      }
      has_capability: {
        Args: { p_cap: string; p_uid: string; p_wid: string }
        Returns: boolean
      }
      has_family_role: {
        Args: { p_group_id: string; p_roles: string[]; p_user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_shared_vault_role: {
        Args: { p_roles: string[]; p_user_id: string; p_vault_id: string }
        Returns: boolean
      }
      home_layout: { Args: { _user_id?: string }; Returns: Json }
      i18n_text: {
        Args: { _fallback: string; _i18n: Json; _locale?: string }
        Returns: string
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_role: {
        Args: { _company_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_driver: { Args: { _user_id: string }; Returns: boolean }
      is_family_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_gam_eya_member: {
        Args: { _circle: string; _user: string }
        Returns: boolean
      }
      is_shared_cart_owner: {
        Args: { _cart_id: string; _user_id: string }
        Returns: boolean
      }
      is_shared_cart_participant: {
        Args: { _cart_id: string; _user_id: string }
        Returns: boolean
      }
      is_shared_vault_member: {
        Args: { p_user_id: string; p_vault_id: string }
        Returns: boolean
      }
      is_sovereign: { Args: { _uid: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_vendor_member: {
        Args: { _role?: string; _user_id: string; _vendor_id: string }
        Returns: boolean
      }
      issue_handover_otp: { Args: { p_node_id: string }; Returns: string }
      join_gam_eya: {
        Args: {
          _circle_id: string
          _guarantor_id?: string
          _turn_number: number
        }
        Returns: string
      }
      list_open_gam_eyas: {
        Args: never
        Returns: {
          cycle_amount: number
          cycle_duration_months: number
          id: string
          is_member: boolean
          max_members: number
          members_count: number
          min_kyc_tier: number
          name: string
          reward_pool: number
          starts_at: string
          status: string
        }[]
      }
      log_behavior: {
        Args: {
          _category?: string
          _dwell_ms?: number
          _event: string
          _product_id?: string
          _query?: string
        }
        Returns: string
      }
      log_sovereign_event: {
        Args: {
          p_event_domain: string
          p_event_type: string
          p_payload?: Json
          p_trace_id: string
        }
        Returns: string
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      match_universal_asset: {
        Args: { p_embedding: string; p_threshold?: number }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
      }
      mint_universal_asset: { Args: { payload: Json }; Returns: string }
      my_workspaces: {
        Args: never
        Returns: {
          id: string
          kind: Database["public"]["Enums"]["workspace_kind"]
          label: string
          theme_overlay: Json
        }[]
      }
      nested_stock_breakdown: { Args: { _product_id: string }; Returns: Json }
      open_escrow_for_order: {
        Args: {
          p_amount: number
          p_currency?: string
          p_order_id: string
          p_vendor_id: string
        }
        Returns: string
      }
      pay_commission_from_treasury: {
        Args: { p_commission_id: string }
        Returns: Json
      }
      pay_gam_eya_installment: {
        Args: { _installment_id: string }
        Returns: Json
      }
      payments_schedule: { Args: { _days_ahead?: number }; Returns: Json }
      pledge_group_buy: {
        Args: { _campaign_id: string; _quantity: number }
        Returns: Json
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_checkout_sovereign: {
        Args: {
          p_cart_items: Json
          p_customer_id: string
          p_delivery_info: Json
          p_expected_snapshot_hash: string
          p_idempotency_key: string
          p_payment_method: string
        }
        Returns: string
      }
      process_commission_vesting: { Args: never; Returns: Json }
      process_due_subscriptions: {
        Args: never
        Returns: {
          processed_count: number
          run_at: string
        }[]
      }
      process_escrow_release: { Args: never; Returns: number }
      process_group_buy_campaign: {
        Args: { _campaign_id: string }
        Returns: Json
      }
      process_pos_cash_payment: {
        Args: { p_amount: number; p_order_id: string }
        Returns: Json
      }
      process_savings_jar_op: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_kind: string
          p_label: string
          p_settings?: Json
        }
        Returns: Json
      }
      process_successful_referral: {
        Args: { _referral_id: string }
        Returns: Json
      }
      process_tayseer_payment: {
        Args: { p_amount: number; p_order_id: string }
        Returns: Json
      }
      pull_catalog_sync: { Args: { p_last_sync?: string }; Returns: Json }
      pull_wallet_sync: { Args: { p_last_sync?: string }; Returns: Json }
      push_notification: {
        Args: {
          p_body?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      recompute_vendor_wallet: { Args: { _vendor_id: string }; Returns: Json }
      recompute_wallet_balance: { Args: { _user: string }; Returns: number }
      record_driver_cod_collection: {
        Args: { _confirmed_amount: number; _node_id: string }
        Returns: Json
      }
      redeem_coupon: {
        Args: { _code: string; _order_id: string; _order_total: number }
        Returns: Json
      }
      reject_advance_request: {
        Args: { _reason: string; _request_id: string }
        Returns: Json
      }
      reject_wallet_topup: {
        Args: { _reason: string; _topup_id: string }
        Returns: Json
      }
      report_anomaly: {
        Args: {
          _description: string
          _fingerprint?: string
          _payload?: Json
          _severity: string
          _source?: string
          _type: string
        }
        Returns: Json
      }
      request_user_payout: {
        Args: { _amount: number; _bank_details: Json; _method: string }
        Returns: Json
      }
      request_vendor_payout: {
        Args: {
          _amount: number
          _bank_details: Json
          _method: string
          _vendor_id: string
        }
        Returns: Json
      }
      resolve_anomaly: { Args: { _id: string }; Returns: Json }
      resolve_fulfillment: {
        Args: { _branch_id: string; _product_id: string; _zone?: string }
        Returns: Json
      }
      route_order_intelligent: {
        Args: {
          p_customer_lat: number
          p_customer_lon: number
          p_product_list: Json
          p_radius_m?: number
        }
        Returns: {
          is_full_match: boolean
          product_id: string
          qty: number
          vendor_id: string
        }[]
      }
      same_branch: { Args: { _branch_id: string }; Returns: boolean }
      scan_riba_suspicions: { Args: never; Returns: Json }
      settle_vendor_payout: {
        Args: {
          _amount: number
          _method: string
          _notes?: string
          _reference: string
          _vendor_id: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      sync_user_capabilities_from_roles: {
        Args: { p_uid: string }
        Returns: number
      }
      tayseer_place_limit_order: {
        Args: {
          p_amount: number
          p_price: number
          p_security_id: string
          p_side: string
          p_wallet_id: string
        }
        Returns: {
          amount: number
          created_at: string
          filled_amount: number
          id: string
          price: number
          security_id: string
          side: string
          status: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "order_book"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tayseer_transfer_funds: {
        Args: {
          idempotency_key: string
          receiver_wallet_id: string
          sender_wallet_id: string
          transfer_amount: number
          transfer_currency: string
          transfer_description?: string
        }
        Returns: string
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_driver_location: {
        Args: { p_lat: number; p_lon: number }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_inventory_matrix: {
        Args: {
          p_availability: Json
          p_inventory_type: string
          p_location_id: string
          p_sku_id: string
        }
        Returns: string
      }
      user_branch_ids: { Args: { _user_id: string }; Returns: string[] }
      user_store_ids: { Args: { _user_id: string }; Returns: string[] }
      user_trust_limit: { Args: { _user_id: string }; Returns: number }
      user_vendor_ids: { Args: { _user_id: string }; Returns: string[] }
      validate_coupon: {
        Args: { _code: string; _order_total: number }
        Returns: Json
      }
      validate_discount: {
        Args: { _cost_price: number; _new_price: number; _sale_price: number }
        Returns: Json
      }
      wallet_transfer: {
        Args: { _amount: number; _note?: string; _recipient_phone: string }
        Returns: Json
      }
      wallet_transfer_v2: {
        Args: {
          _amount: number
          _idempotency_key: string
          _note?: string
          _recipient_phone: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "cashier"
        | "store_manager"
        | "collector"
        | "delivery"
        | "finance"
        | "vendor"
        | "branch_manager"
        | "inventory_clerk"
        | "charity_auditor"
        | "kitchen_staff"
      app_user_level: "bronze" | "silver" | "gold" | "platinum"
      fulfillment_status:
        | "pending"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      gam_eya_installment_status: "pending" | "paid" | "late" | "waived"
      gam_eya_status: "pending" | "active" | "completed" | "cancelled"
      group_buy_pledge_status: "locked" | "committed" | "refunded"
      group_buy_status: "gathering" | "succeeded" | "failed" | "fulfilled"
      loyalty_tier: "bronze" | "silver" | "gold" | "platinum" | "vip"
      payment_method_kind:
        | "card"
        | "wallet"
        | "bank"
        | "vodafone_cash"
        | "instapay"
      rail_frequency_tag:
        | "NONE"
        | "DAILY_FLASH"
        | "SEMI_WEEKLY_FRESH"
        | "WEEKLY_BIG"
        | "MONTHLY_PANTRY"
      salsabil_app_id: "reef" | "khalil" | "asrab" | "nabd"
      salsabil_asset_type:
        | "physical"
        | "digital"
        | "service"
        | "rental"
        | "milestone_project"
      salsabil_inventory_type: "count" | "time_slots" | "capacity"
      salsabil_pricing_model:
        | "flat"
        | "tiered_wholesale"
        | "subscription"
        | "deposit_and_rental"
        | "milestone_installments"
      scheduled_transfer_frequency: "weekly" | "monthly"
      scheduled_transfer_purpose: "gam_eya" | "savings" | "p2p" | "vault"
      shared_cart_approval: "pending" | "approved" | "rejected"
      shared_cart_role: "owner" | "contributor"
      shared_cart_split_type: "percentage" | "fixed" | "itemized"
      shared_cart_status:
        | "active"
        | "pending_approvals"
        | "frozen"
        | "completed"
        | "cancelled"
      storefront_rail_type:
        | "flash_sale"
        | "bundle"
        | "personalized"
        | "category"
        | "restaurant"
        | "sponsored"
      workspace_kind: "reef" | "tayseer" | "noor_eldin" | "family" | "global"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      app_role: [
        "admin",
        "staff",
        "cashier",
        "store_manager",
        "collector",
        "delivery",
        "finance",
        "vendor",
        "branch_manager",
        "inventory_clerk",
        "charity_auditor",
        "kitchen_staff",
      ],
      app_user_level: ["bronze", "silver", "gold", "platinum"],
      fulfillment_status: [
        "pending",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      gam_eya_installment_status: ["pending", "paid", "late", "waived"],
      gam_eya_status: ["pending", "active", "completed", "cancelled"],
      group_buy_pledge_status: ["locked", "committed", "refunded"],
      group_buy_status: ["gathering", "succeeded", "failed", "fulfilled"],
      loyalty_tier: ["bronze", "silver", "gold", "platinum", "vip"],
      payment_method_kind: [
        "card",
        "wallet",
        "bank",
        "vodafone_cash",
        "instapay",
      ],
      rail_frequency_tag: [
        "NONE",
        "DAILY_FLASH",
        "SEMI_WEEKLY_FRESH",
        "WEEKLY_BIG",
        "MONTHLY_PANTRY",
      ],
      salsabil_app_id: ["reef", "khalil", "asrab", "nabd"],
      salsabil_asset_type: [
        "physical",
        "digital",
        "service",
        "rental",
        "milestone_project",
      ],
      salsabil_inventory_type: ["count", "time_slots", "capacity"],
      salsabil_pricing_model: [
        "flat",
        "tiered_wholesale",
        "subscription",
        "deposit_and_rental",
        "milestone_installments",
      ],
      scheduled_transfer_frequency: ["weekly", "monthly"],
      scheduled_transfer_purpose: ["gam_eya", "savings", "p2p", "vault"],
      shared_cart_approval: ["pending", "approved", "rejected"],
      shared_cart_role: ["owner", "contributor"],
      shared_cart_split_type: ["percentage", "fixed", "itemized"],
      shared_cart_status: [
        "active",
        "pending_approvals",
        "frozen",
        "completed",
        "cancelled",
      ],
      storefront_rail_type: [
        "flash_sale",
        "bundle",
        "personalized",
        "category",
        "restaurant",
        "sponsored",
      ],
      workspace_kind: ["reef", "tayseer", "noor_eldin", "family", "global"],
    },
  },
} as const
