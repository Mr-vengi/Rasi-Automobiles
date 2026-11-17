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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          business_id: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          state: string
          state_code: string
        }
        Insert: {
          address?: string
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          state?: string
          state_code?: string
        }
        Update: {
          address?: string
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          state?: string
          state_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      brands: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_settings: {
        Row: {
          address: string
          business_id: string
          business_name: string
          currency_code: string
          email: string
          gstin: string
          invoice_footer: string
          invoice_prefix: string
          logo_url: string | null
          mobile: string
          owner_name: string
          state: string
          state_code: string
          tax_inclusive: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string
          business_id?: string
          business_name?: string
          currency_code?: string
          email?: string
          gstin?: string
          invoice_footer?: string
          invoice_prefix?: string
          logo_url?: string | null
          mobile?: string
          owner_name?: string
          state?: string
          state_code?: string
          tax_inclusive?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          business_id?: string
          business_name?: string
          currency_code?: string
          email?: string
          gstin?: string
          invoice_footer?: string
          invoice_prefix?: string
          logo_url?: string | null
          mobile?: string
          owner_name?: string
          state?: string
          state_code?: string
          tax_inclusive?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          business_id: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string
          id?: string
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          billing_address: string
          business_id: string
          created_at: string
          credit_limit: number
          customer_name: string
          customer_type: string
          email: string
          gstin: string
          id: string
          notes: string
          phone: string
          state: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          billing_address?: string
          business_id: string
          created_at?: string
          credit_limit?: number
          customer_name: string
          customer_type?: string
          email?: string
          gstin?: string
          id?: string
          notes?: string
          phone?: string
          state?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          billing_address?: string
          business_id?: string
          created_at?: string
          credit_limit?: number
          customer_name?: string
          customer_type?: string
          email?: string
          gstin?: string
          id?: string
          notes?: string
          phone?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          payment_method: string
          reference_number: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          payment_method: string
          reference_number?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          payment_method?: string
          reference_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          business_id: string
          current_number: number
          financial_year: string
        }
        Insert: {
          business_id: string
          current_number?: number
          financial_year: string
        }
        Update: {
          business_id?: string
          current_number?: number
          financial_year?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_id: string
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
        }
        Insert: {
          business_id: string
          category: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string
          id: string
          name: string
        }
        Insert: {
          description?: string
          id: string
          name: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          archived_at: string | null
          barcode: string
          brand_id: string | null
          brand_name: string
          business_id: string
          category_id: string | null
          category_name: string
          created_at: string
          current_stock: number
          description: string
          gst_rate: number
          hsn_code: string
          id: string
          is_active: boolean
          maximum_stock: number | null
          minimum_stock: number
          mrp: number
          oem_number: string
          part_number: string
          product_name: string
          purchase_price: number
          selling_price: number
          shelf_location: string
          sku: string
          supplier_id: string | null
          unit: string
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          archived_at?: string | null
          barcode?: string
          brand_id?: string | null
          brand_name?: string
          business_id: string
          category_id?: string | null
          category_name?: string
          created_at?: string
          current_stock?: number
          description?: string
          gst_rate?: number
          hsn_code?: string
          id?: string
          is_active?: boolean
          maximum_stock?: number | null
          minimum_stock?: number
          mrp?: number
          oem_number?: string
          part_number?: string
          product_name: string
          purchase_price?: number
          selling_price?: number
          shelf_location?: string
          sku: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          archived_at?: string | null
          barcode?: string
          brand_id?: string | null
          brand_name?: string
          business_id?: string
          category_id?: string | null
          category_name?: string
          created_at?: string
          current_stock?: number
          description?: string
          gst_rate?: number
          hsn_code?: string
          id?: string
          is_active?: boolean
          maximum_stock?: number | null
          minimum_stock?: number
          mrp?: number
          oem_number?: string
          part_number?: string
          product_name?: string
          purchase_price?: number
          selling_price?: number
          shelf_location?: string
          sku?: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          discount_rate: number
          gst_rate: number
          id: string
          line_total: number
          product_id: string
          product_name: string
          purchase_id: string
          quantity: number
          sku: string
          tax_amount: number
          taxable_amount: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          discount_rate?: number
          gst_rate?: number
          id?: string
          line_total: number
          product_id: string
          product_name: string
          purchase_id: string
          quantity: number
          sku: string
          tax_amount: number
          taxable_amount: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          discount_rate?: number
          gst_rate?: number
          id?: string
          line_total?: number
          product_id?: string
          product_name?: string
          purchase_id?: string
          quantity?: number
          sku?: string
          tax_amount?: number
          taxable_amount?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          payment_method: string
          purchase_id: string
          reference_number: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_method: string
          purchase_id: string
          reference_number?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_method?: string
          purchase_id?: string
          reference_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchase_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          balance_due: number
          business_id: string
          created_at: string
          created_by: string | null
          discount_amount: number
          id: string
          idempotency_key: string
          paid_amount: number
          purchase_date: string
          status: string
          subtotal: number
          supplier_id: string
          supplier_reference: string | null
          tax_amount: number
          taxable_amount: number
          total_amount: number
        }
        Insert: {
          balance_due?: number
          business_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          idempotency_key: string
          paid_amount?: number
          purchase_date?: string
          status?: string
          subtotal?: number
          supplier_id: string
          supplier_reference?: string | null
          tax_amount?: number
          taxable_amount?: number
          total_amount?: number
        }
        Update: {
          balance_due?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          id?: string
          idempotency_key?: string
          paid_amount?: number
          purchase_date?: string
          status?: string
          subtotal?: number
          supplier_id?: string
          supplier_reference?: string | null
          tax_amount?: number
          taxable_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          description?: string
          id: string
          is_system?: boolean
          name: string
        }
        Update: {
          description?: string
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          cgst_amount: number
          created_at: string
          discount_rate: number
          gst_rate: number
          hsn_code: string
          id: string
          igst_amount: number
          line_total: number
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          sgst_amount: number
          sku: string
          taxable_amount: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          cgst_amount?: number
          created_at?: string
          discount_rate?: number
          gst_rate?: number
          hsn_code?: string
          id?: string
          igst_amount?: number
          line_total: number
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          sgst_amount?: number
          sku: string
          taxable_amount: number
          unit_cost?: number
          unit_price: number
        }
        Update: {
          cgst_amount?: number
          created_at?: string
          discount_rate?: number
          gst_rate?: number
          hsn_code?: string
          id?: string
          igst_amount?: number
          line_total?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          sgst_amount?: number
          sku?: string
          taxable_amount?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          payment_method: string
          received_by: string | null
          reference_number: string
          sale_id: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          id?: string
          payment_method: string
          received_by?: string | null
          reference_number?: string
          sale_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          payment_method?: string
          received_by?: string | null
          reference_number?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          balance_due: number
          business_id: string
          cgst_amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          id: string
          idempotency_key: string
          igst_amount: number
          invoice_number: string
          is_interstate: boolean
          paid_amount: number
          sale_date: string
          sgst_amount: number
          status: string
          subtotal: number
          taxable_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance_due?: number
          business_id: string
          cgst_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          idempotency_key: string
          igst_amount?: number
          invoice_number: string
          is_interstate?: boolean
          paid_amount?: number
          sale_date?: string
          sgst_amount?: number
          status: string
          subtotal?: number
          taxable_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          balance_due?: number
          business_id?: string
          cgst_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          idempotency_key?: string
          igst_amount?: number
          invoice_number?: string
          is_interstate?: boolean
          paid_amount?: number
          sale_date?: string
          sgst_amount?: number
          status?: string
          subtotal?: number
          taxable_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          product_id: string
          quantity_delta: number
          reason: string
          reference_id: string | null
          reference_type: string
          stock_after: number
          unit_cost: number
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          product_id: string
          quantity_delta: number
          reason?: string
          reference_id?: string | null
          reference_type?: string
          stock_after: number
          unit_cost?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          product_id?: string
          quantity_delta?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string
          stock_after?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string
          archived_at: string | null
          business_id: string
          contact_person: string
          created_at: string
          credit_terms_days: number
          email: string
          gstin: string
          id: string
          notes: string
          phone: string
          state: string
          supplier_name: string
          updated_at: string
        }
        Insert: {
          address?: string
          archived_at?: string | null
          business_id: string
          contact_person?: string
          created_at?: string
          credit_terms_days?: number
          email?: string
          gstin?: string
          id?: string
          notes?: string
          phone?: string
          state?: string
          supplier_name: string
          updated_at?: string
        }
        Update: {
          address?: string
          archived_at?: string | null
          business_id?: string
          contact_person?: string
          created_at?: string
          credit_terms_days?: number
          email?: string
          gstin?: string
          id?: string
          notes?: string
          phone?: string
          state?: string
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["business_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_inventory: {
        Args: {
          p_product_id: string
          p_quantity_delta: number
          p_reason: string
          p_reference?: string
        }
        Returns: string
      }
      create_sale: {
        Args: {
          p_customer_id?: string
          p_idempotency_key?: string
          p_is_interstate?: boolean
          p_items: Json
          p_payments?: Json
          p_status?: string
        }
        Returns: string
      }
      has_permission: {
        Args: { p_permission: string; p_user_id?: string }
        Returns: boolean
      }
      has_role: {
        Args: { p_role: string; p_user_id?: string }
        Returns: boolean
      }
      receive_purchase: {
        Args: {
          p_idempotency_key?: string
          p_items: Json
          p_payments?: Json
          p_purchase_date: string
          p_supplier_id: string
          p_supplier_reference: string
        }
        Returns: string
      }
      user_business_id: { Args: { p_user_id?: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
