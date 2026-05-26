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
      dealer_memberships: {
        Row: {
          created_at: string
          dealer_id: string
          is_active: boolean
          role: Database["public"]["Enums"]["dealer_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["dealer_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["dealer_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_memberships_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dealers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      estimate_items: {
        Row: {
          created_at: string
          dealer_id: string
          description: string
          hours: number
          id: string
          labor_rate: number
          operation_id: string
          part_number: string | null
          qty: number
          sort_order: number
          status: Database["public"]["Enums"]["approval_status"]
          taxable: boolean
          type: Database["public"]["Enums"]["estimate_item_type"]
          unit_cost: number
          unit_price: number
          updated_at: string
          vendor: string | null
        }
        Insert: {
          created_at?: string
          dealer_id: string
          description?: string
          hours?: number
          id?: string
          labor_rate?: number
          operation_id: string
          part_number?: string | null
          qty?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["approval_status"]
          taxable?: boolean
          type?: Database["public"]["Enums"]["estimate_item_type"]
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          created_at?: string
          dealer_id?: string
          description?: string
          hours?: number
          id?: string
          labor_rate?: number
          operation_id?: string
          part_number?: string | null
          qty?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["approval_status"]
          taxable?: boolean
          type?: Database["public"]["Enums"]["estimate_item_type"]
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "estimate_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_operations: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["operation_category"]
          created_at: string
          dealer_id: string
          estimate_id: string
          id: string
          name: string
          priority: Database["public"]["Enums"]["operation_priority"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["operation_category"]
          created_at?: string
          dealer_id: string
          estimate_id: string
          id?: string
          name: string
          priority?: Database["public"]["Enums"]["operation_priority"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["operation_category"]
          created_at?: string
          dealer_id?: string
          estimate_id?: string
          id?: string
          name?: string
          priority?: Database["public"]["Enums"]["operation_priority"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_operations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_operations_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string
          created_by: string | null
          dealer_id: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          labor_rate_default: number
          notes_customer: string | null
          notes_internal: string | null
          shop_supplies_percent: number
          status: Database["public"]["Enums"]["estimate_status"]
          tax_rate_default: number
          unit_id: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dealer_id: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          labor_rate_default?: number
          notes_customer?: string | null
          notes_internal?: string | null
          shop_supplies_percent?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          tax_rate_default?: number
          unit_id: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dealer_id?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          labor_rate_default?: number
          notes_customer?: string | null
          notes_internal?: string | null
          shop_supplies_percent?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          tax_rate_default?: number
          unit_id?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          dealer_id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          dealer_id: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          dealer_id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dealer_id: string
          id: string
          metadata: Json
          severity: string
          title: string
          type: string
          unit_id: string | null
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          dealer_id: string
          id?: string
          metadata?: Json
          severity?: string
          title: string
          type: string
          unit_id?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          dealer_id?: string
          id?: string
          metadata?: Json
          severity?: string
          title?: string
          type?: string
          unit_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_platform_admin: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      stage_history: {
        Row: {
          created_at: string
          dealer_id: string
          duration_hours: number | null
          entered_at: string
          exited_at: string | null
          id: string
          stage: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          duration_hours?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          stage: string
          unit_id: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          duration_hours?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          stage?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          dealer_id: string
          description: string
          id: string
          metadata: Json | null
          stage: string
          unit_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          dealer_id: string
          description?: string
          id?: string
          metadata?: Json | null
          stage: string
          unit_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          dealer_id?: string
          description?: string
          id?: string
          metadata?: Json | null
          stage?: string
          unit_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_activity_logs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_activity_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_comments: {
        Row: {
          comment: string
          created_at: string
          dealer_id: string
          id: string
          unit_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          dealer_id: string
          id?: string
          unit_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          dealer_id?: string
          id?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_comments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_comments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_inspection_items: {
        Row: {
          category: string
          created_at: string
          dealer_id: string
          id: string
          inspected_by: string | null
          item_name: string
          notes: string | null
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          dealer_id: string
          id?: string
          inspected_by?: string | null
          item_name: string
          notes?: string | null
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          dealer_id?: string
          id?: string
          inspected_by?: string | null
          item_name?: string
          notes?: string | null
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_inspection_items_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_inspection_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_photos: {
        Row: {
          caption: string | null
          category: string
          created_at: string
          dealer_id: string
          file_name: string
          file_path: string
          id: string
          qc_approved: boolean
          unit_id: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          category?: string
          created_at?: string
          dealer_id: string
          file_name: string
          file_path: string
          id?: string
          qc_approved?: boolean
          unit_id: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          category?: string
          created_at?: string
          dealer_id?: string
          file_name?: string
          file_path?: string
          id?: string
          qc_approved?: boolean
          unit_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_photos_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_photos_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_tire_inspections: {
        Row: {
          condition_flags: Json
          created_at: string
          dealer_id: string
          id: string
          recommendations: string[]
          tire_pressure: Json
          tread_depth: Json
          unit_id: string
          updated_at: string
          wheel_checks: Json
        }
        Insert: {
          condition_flags?: Json
          created_at?: string
          dealer_id: string
          id?: string
          recommendations?: string[]
          tire_pressure?: Json
          tread_depth?: Json
          unit_id: string
          updated_at?: string
          wheel_checks?: Json
        }
        Update: {
          condition_flags?: Json
          created_at?: string
          dealer_id?: string
          id?: string
          recommendations?: string[]
          tire_pressure?: Json
          tread_depth?: Json
          unit_id?: string
          updated_at?: string
          wheel_checks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "unit_tire_inspections_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_tire_inspections_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          body: string | null
          color: string | null
          created_at: string
          dealer_id: string
          deleted_at: string | null
          drive_type: string | null
          engine: string | null
          id: string
          intake_meta: Json | null
          is_deleted: boolean
          make: string | null
          model: string | null
          notes: string | null
          promise_date: string | null
          stage_entered_at: string
          status: Database["public"]["Enums"]["unit_status"]
          stock_number: string | null
          transmission: string | null
          trim: string | null
          updated_at: string
          vin: string | null
          vin_decode_raw: Json | null
          year: number | null
        }
        Insert: {
          body?: string | null
          color?: string | null
          created_at?: string
          dealer_id: string
          deleted_at?: string | null
          drive_type?: string | null
          engine?: string | null
          id?: string
          intake_meta?: Json | null
          is_deleted?: boolean
          make?: string | null
          model?: string | null
          notes?: string | null
          promise_date?: string | null
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["unit_status"]
          stock_number?: string | null
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          vin?: string | null
          vin_decode_raw?: Json | null
          year?: number | null
        }
        Update: {
          body?: string | null
          color?: string | null
          created_at?: string
          dealer_id?: string
          deleted_at?: string | null
          drive_type?: string | null
          engine?: string | null
          id?: string
          intake_meta?: Json | null
          is_deleted?: boolean
          make?: string | null
          model?: string | null
          notes?: string | null
          promise_date?: string | null
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["unit_status"]
          stock_number?: string | null
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          vin?: string | null
          vin_decode_raw?: Json | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "units_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_items: {
        Row: {
          created_at: string
          dealer_id: string
          description: string
          hours: number
          id: string
          labor_rate: number
          qty: number
          source_estimate_item_id: string | null
          status: Database["public"]["Enums"]["work_order_item_status"]
          type: Database["public"]["Enums"]["estimate_item_type"]
          unit_cost: number
          unit_price: number
          updated_at: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          description?: string
          hours?: number
          id?: string
          labor_rate?: number
          qty?: number
          source_estimate_item_id?: string | null
          status?: Database["public"]["Enums"]["work_order_item_status"]
          type?: Database["public"]["Enums"]["estimate_item_type"]
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          description?: string
          hours?: number
          id?: string
          labor_rate?: number
          qty?: number
          source_estimate_item_id?: string | null
          status?: Database["public"]["Enums"]["work_order_item_status"]
          type?: Database["public"]["Enums"]["estimate_item_type"]
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_items_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_items_source_estimate_item_id_fkey"
            columns: ["source_estimate_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          created_at: string
          dealer_id: string
          id: string
          source_estimate_id: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          id?: string
          source_estimate_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          id?: string
          source_estimate_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_dealer_roles: {
        Args: never
        Returns: {
          created_at: string
          dealer_id: string
          is_active: boolean
          role: Database["public"]["Enums"]["dealer_role"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "dealer_memberships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_dealer_admin: { Args: { _dealer_id: string }; Returns: boolean }
      is_dealer_member: { Args: { _dealer_id: string }; Returns: boolean }
      is_dealer_owner_or_admin: {
        Args: { _dealer_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_staff_only: { Args: { _dealer_id: string }; Returns: boolean }
    }
    Enums: {
      approval_status: "pending" | "approved" | "declined"
      dealer_role:
        | "dealer_admin"
        | "dealer_staff"
        | "dealer_owner"
        | "manager"
        | "staff"
      discount_type: "none" | "percent" | "amount"
      estimate_item_type: "labor" | "part" | "misc" | "sublet"
      estimate_status:
        | "draft"
        | "submitted"
        | "approved"
        | "partial_approved"
        | "declined"
        | "void"
      operation_category: "mechanical" | "body" | "detail" | "diag" | "other"
      operation_priority: "safety" | "recommended" | "cosmetic"
      unit_status:
        | "inspection"
        | "estimate"
        | "approval"
        | "repair"
        | "qc"
        | "ready"
        | "sold"
      work_order_item_status: "open" | "done"
      work_order_status: "open" | "in_progress" | "done"
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
      approval_status: ["pending", "approved", "declined"],
      dealer_role: [
        "dealer_admin",
        "dealer_staff",
        "dealer_owner",
        "manager",
        "staff",
      ],
      discount_type: ["none", "percent", "amount"],
      estimate_item_type: ["labor", "part", "misc", "sublet"],
      estimate_status: [
        "draft",
        "submitted",
        "approved",
        "partial_approved",
        "declined",
        "void",
      ],
      operation_category: ["mechanical", "body", "detail", "diag", "other"],
      operation_priority: ["safety", "recommended", "cosmetic"],
      unit_status: [
        "inspection",
        "estimate",
        "approval",
        "repair",
        "qc",
        "ready",
        "sold",
      ],
      work_order_item_status: ["open", "done"],
      work_order_status: ["open", "in_progress", "done"],
    },
  },
} as const
