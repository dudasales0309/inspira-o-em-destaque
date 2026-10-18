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
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          interests: string
          origin: string
          phone: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          interests?: string
          origin?: string
          phone?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          interests?: string
          origin?: string
          phone?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          action_id: string | null
          contact_date: string
          contact_type: string
          created_at: string
          created_by: string | null
          id: string
          notes: string
          opportunity_id: string
          result: Database["public"]["Enums"]["contact_result"]
          user_id: string
        }
        Insert: {
          action_id?: string | null
          contact_date?: string
          contact_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          opportunity_id: string
          result: Database["public"]["Enums"]["contact_result"]
          user_id: string
        }
        Update: {
          action_id?: string | null
          contact_date?: string
          contact_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          opportunity_id?: string
          result?: Database["public"]["Enums"]["contact_result"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      losses: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string
          opportunity_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          opportunity_id: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          opportunity_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "losses_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      next_actions: {
        Row: {
          completed_interaction_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_at: string | null
          id: string
          notes: string
          opportunity_id: string
          owner_id: string | null
          status: Database["public"]["Enums"]["action_status"]
          updated_at: string
        }
        Insert: {
          completed_interaction_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_at?: string | null
          id?: string
          notes?: string
          opportunity_id: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Update: {
          completed_interaction_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_at?: string | null
          id?: string
          notes?: string
          opportunity_id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_actions_completed_interaction_id_fkey"
            columns: ["completed_interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_actions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_actions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
          client_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          origin: string
          owner_id: string | null
          products: string
          stage: Database["public"]["Enums"]["opp_stage"]
          store_id: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          origin?: string
          owner_id?: string | null
          products?: string
          stage?: Database["public"]["Enums"]["opp_stage"]
          store_id: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          origin?: string
          owner_id?: string | null
          products?: string
          stage?: Database["public"]["Enums"]["opp_stage"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          from_user: string | null
          id: string
          kind: string
          opportunity_id: string
          to_user: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          from_user?: string | null
          id?: string
          kind: string
          opportunity_id: string
          to_user?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          from_user?: string | null
          id?: string
          kind?: string
          opportunity_id?: string
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          product: string
          quantity: number
          sale_id: string
          subtotal: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          product: string
          quantity: number
          sale_id: string
          subtotal?: number | null
          unit_price: number
        }
        Update: {
          id?: string
          product?: string
          quantity?: number
          sale_id?: string
          subtotal?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          opportunity_id: string
          sale_date: string
          store_id: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          opportunity_id: string
          sale_date: string
          store_id: string
          total: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          opportunity_id?: string
          sale_date?: string
          store_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_opportunity: {
        Args: { _note: string; _opp: string; _owner: string }
        Returns: undefined
      }
      can_manage_store: { Args: { _store: string }; Returns: boolean }
      can_view_opp: { Args: { _opp: string }; Returns: boolean }
      can_work_opp: { Args: { _opp: string }; Returns: boolean }
      cancel_action: { Args: { _action: string }; Returns: undefined }
      create_opportunity: {
        Args: {
          _action_desc: string
          _action_due: string
          _client: string
          _origin: string
          _owner: string
          _products: string
          _store: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_global_manager: { Args: never; Returns: boolean }
      is_operational: { Args: never; Returns: boolean }
      my_store: { Args: never; Returns: string }
      plan_action: {
        Args: {
          _desc: string
          _due: string
          _notes: string
          _opp: string
          _owner: string
        }
        Returns: string
      }
      register_interaction: {
        Args: {
          _action: string
          _date: string
          _notes: string
          _opp: string
          _result: Database["public"]["Enums"]["contact_result"]
          _type: string
        }
        Returns: string
      }
      register_loss: {
        Args: { _notes: string; _opp: string; _reason: string }
        Returns: undefined
      }
      register_sale: {
        Args: { _date: string; _items: Json; _opp: string }
        Returns: string
      }
      reopen_opportunity: {
        Args: { _note: string; _opp: string }
        Returns: undefined
      }
      report_summary: {
        Args: { _from: string; _store: string; _to: string }
        Returns: Json
      }
      save_client: {
        Args: {
          _full_name: string
          _id: string
          _interests: string
          _origin: string
          _phone: string
        }
        Returns: string
      }
      set_archived: {
        Args: { _archived: boolean; _opp: string; _reason: string }
        Returns: undefined
      }
    }
    Enums: {
      action_status: "pendente" | "concluida" | "cancelada" | "substituida"
      app_role: "vendedor" | "gerente" | "supervisor" | "diretor" | "marketing"
      contact_result: "sem_resposta" | "efetivo"
      opp_stage: "novo" | "distribuido" | "negociacao" | "ganho" | "perdido"
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
    Enums: {
      action_status: ["pendente", "concluida", "cancelada", "substituida"],
      app_role: ["vendedor", "gerente", "supervisor", "diretor", "marketing"],
      contact_result: ["sem_resposta", "efetivo"],
      opp_stage: ["novo", "distribuido", "negociacao", "ganho", "perdido"],
    },
  },
} as const
