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
      agents: {
        Row: {
          brokerage: string | null
          created_at: string
          id: string
          name: string
          settings: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          brokerage?: string | null
          created_at?: string
          id: string
          name: string
          settings?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          brokerage?: string | null
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_links: {
        Row: {
          agent_id: string
          contact_id: string
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          related_contact_id: string
          relation: Database["public"]["Enums"]["contact_relation"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          contact_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          related_contact_id: string
          relation?: Database["public"]["Enums"]["contact_relation"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          contact_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          related_contact_id?: string
          relation?: Database["public"]["Enums"]["contact_relation"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_links_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_photos: {
        Row: {
          agent_id: string
          contact_id: string
          created_at: string
          deleted_at: string | null
          file_name: string | null
          height: number | null
          id: string
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          agent_id: string
          contact_id: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string | null
          height?: number | null
          id?: string
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          agent_id?: string
          contact_id?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string | null
          height?: number | null
          id?: string
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_photos_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_photos_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agent_id: string
          avatar_crop: Json | null
          avatar_path: string | null
          avatar_photo_id: string | null
          birthday: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_name: string
          id: string
          job_title: string | null
          kind: Database["public"]["Enums"]["contact_kind"]
          last_contacted_at: string | null
          last_name: string
          license_no: string | null
          license_type: Database["public"]["Enums"]["license_type"]
          name_zh: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          preferred_channel:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          preferred_language: Database["public"]["Enums"]["contact_language"]
          referred_by_contact_id: string | null
          source: string | null
          state: string | null
          tags: string[]
          updated_at: string
          wechat: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agent_id: string
          avatar_crop?: Json | null
          avatar_path?: string | null
          avatar_photo_id?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          kind?: Database["public"]["Enums"]["contact_kind"]
          last_contacted_at?: string | null
          last_name?: string
          license_no?: string | null
          license_type?: Database["public"]["Enums"]["license_type"]
          name_zh?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          preferred_language?: Database["public"]["Enums"]["contact_language"]
          referred_by_contact_id?: string | null
          source?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string
          wechat?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agent_id?: string
          avatar_crop?: Json | null
          avatar_path?: string | null
          avatar_photo_id?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          kind?: Database["public"]["Enums"]["contact_kind"]
          last_contacted_at?: string | null
          last_name?: string
          license_no?: string | null
          license_type?: Database["public"]["Enums"]["license_type"]
          name_zh?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          preferred_channel?:
            | Database["public"]["Enums"]["contact_channel"]
            | null
          preferred_language?: Database["public"]["Enums"]["contact_language"]
          referred_by_contact_id?: string | null
          source?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string
          wechat?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_avatar_photo_id_fkey"
            columns: ["avatar_photo_id"]
            isOneToOne: false
            referencedRelation: "contact_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_referred_by_contact_id_fkey"
            columns: ["referred_by_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_fields: {
        Row: {
          agent_id: string
          confidence: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          deal_id: string
          id: string
          key: string
          source_doc_id: string | null
          source_page: number | null
          source_quote: string | null
          superseded_at: string | null
          updated_at: string
          value_date: string | null
          value_num: number | null
          value_text: string | null
          version: number
        }
        Insert: {
          agent_id: string
          confidence?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deal_id: string
          id?: string
          key: string
          source_doc_id?: string | null
          source_page?: number | null
          source_quote?: string | null
          superseded_at?: string | null
          updated_at?: string
          value_date?: string | null
          value_num?: number | null
          value_text?: string | null
          version?: number
        }
        Update: {
          agent_id?: string
          confidence?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          key?: string
          source_doc_id?: string | null
          source_page?: number | null
          source_quote?: string | null
          superseded_at?: string | null
          updated_at?: string
          value_date?: string | null
          value_num?: number | null
          value_text?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_fields_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_fields_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_fields_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_parties: {
        Row: {
          agent_id: string
          contact_id: string | null
          created_at: string
          deal_id: string
          deleted_at: string | null
          id: string
          is_primary: boolean
          notes: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["party_role"]
          side: Database["public"]["Enums"]["party_side"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          contact_id?: string | null
          created_at?: string
          deal_id: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          organization_id?: string | null
          role: Database["public"]["Enums"]["party_role"]
          side?: Database["public"]["Enums"]["party_side"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["party_role"]
          side?: Database["public"]["Enums"]["party_side"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_parties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_parties_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_parties_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          addenda: string[]
          agent_id: string
          closed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          pinned: boolean
          playbook_id: string | null
          playbook_version: number | null
          primary_contact_id: string | null
          priority: number
          property_id: string | null
          sort_at: string
          stage: Database["public"]["Enums"]["deal_stage"]
          terminated_at: string | null
          title: string
          type: Database["public"]["Enums"]["deal_type"]
          updated_at: string
        }
        Insert: {
          addenda?: string[]
          agent_id: string
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          pinned?: boolean
          playbook_id?: string | null
          playbook_version?: number | null
          primary_contact_id?: string | null
          priority?: number
          property_id?: string | null
          sort_at?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          terminated_at?: string | null
          title: string
          type: Database["public"]["Enums"]["deal_type"]
          updated_at?: string
        }
        Update: {
          addenda?: string[]
          agent_id?: string
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          pinned?: boolean
          playbook_id?: string | null
          playbook_version?: number | null
          primary_contact_id?: string | null
          priority?: number
          property_id?: string | null
          sort_at?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          terminated_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["deal_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_contact_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agent_id: string
          confirmed_at: string | null
          created_at: string
          deal_id: string
          deleted_at: string | null
          doc_type: string | null
          error: string | null
          extraction: Json | null
          file_name: string | null
          id: string
          page_count: number | null
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          agent_id: string
          confirmed_at?: string | null
          created_at?: string
          deal_id: string
          deleted_at?: string | null
          doc_type?: string | null
          error?: string | null
          extraction?: Json | null
          file_name?: string | null
          id?: string
          page_count?: number | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          agent_id?: string
          confirmed_at?: string | null
          created_at?: string
          deal_id?: string
          deleted_at?: string | null
          doc_type?: string | null
          error?: string | null
          extraction?: Json | null
          file_name?: string | null
          id?: string
          page_count?: number | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          agent_id: string
          calendar_event_id: string | null
          client_visible: boolean
          created_at: string
          deal_id: string
          derived_from: Json | null
          due_date: string | null
          due_time: string | null
          id: string
          key: string
          label: string
          manual_override: boolean
          status: Database["public"]["Enums"]["ms_status"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          calendar_event_id?: string | null
          client_visible?: boolean
          created_at?: string
          deal_id: string
          derived_from?: Json | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          key: string
          label: string
          manual_override?: boolean
          status?: Database["public"]["Enums"]["ms_status"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          calendar_event_id?: string | null
          client_visible?: boolean
          created_at?: string
          deal_id?: string
          derived_from?: Json | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          key?: string
          label?: string
          manual_override?: boolean
          status?: Database["public"]["Enums"]["ms_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agent_id: string
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["org_kind"]
          license_no: string | null
          name: string
          notes: string | null
          phone: string | null
          primary_contact_id: string | null
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agent_id: string
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["org_kind"]
          license_no?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          primary_contact_id?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agent_id?: string
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["org_kind"]
          license_no?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          primary_contact_id?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_primary_contact_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agent_id: string
          anchor_milestone_key: string | null
          assignee: string | null
          client_visible: boolean
          created_at: string
          deal_id: string | null
          deleted_at: string | null
          done_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          offset_days: number | null
          playbook_rule_id: string | null
          priority: number
          stage: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          anchor_milestone_key?: string | null
          assignee?: string | null
          client_visible?: boolean
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          offset_days?: number | null
          playbook_rule_id?: string | null
          priority?: number
          stage?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          anchor_milestone_key?: string | null
          assignee?: string | null
          client_visible?: boolean
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          offset_days?: number | null
          playbook_rule_id?: string | null
          priority?: number
          stage?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_strings: {
        Row: {
          agent_id: string
          created_at: string
          deleted_at: string | null
          en: string | null
          id: string
          key: string
          updated_at: string
          zh: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          deleted_at?: string | null
          en?: string | null
          id?: string
          key: string
          updated_at?: string
          zh?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          deleted_at?: string | null
          en?: string | null
          id?: string
          key?: string
          updated_at?: string
          zh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ui_strings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      deal_fields_current: {
        Row: {
          agent_id: string | null
          confidence: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          deal_id: string | null
          id: string | null
          key: string | null
          source_doc_id: string | null
          source_page: number | null
          source_quote: string | null
          superseded_at: string | null
          updated_at: string | null
          value_date: string | null
          value_num: number | null
          value_text: string | null
          version: number | null
        }
        Insert: {
          agent_id?: string | null
          confidence?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string | null
          key?: string | null
          source_doc_id?: string | null
          source_page?: number | null
          source_quote?: string | null
          superseded_at?: string | null
          updated_at?: string | null
          value_date?: string | null
          value_num?: number | null
          value_text?: string | null
          version?: number | null
        }
        Update: {
          agent_id?: string | null
          confidence?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string | null
          key?: string | null
          source_doc_id?: string | null
          source_page?: number | null
          source_quote?: string | null
          superseded_at?: string | null
          updated_at?: string | null
          value_date?: string | null
          value_num?: number | null
          value_text?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_fields_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_fields_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_fields_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      contact_channel: "phone" | "sms" | "email" | "wechat" | "whatsapp"
      contact_kind:
        | "client"
        | "agent"
        | "title_lending"
        | "vendor"
        | "tc"
        | "attorney"
        | "other"
      contact_language: "zh" | "en"
      contact_relation:
        | "spouse"
        | "partner"
        | "parent"
        | "child"
        | "sibling"
        | "relative"
        | "friend"
        | "assistant"
        | "colleague"
        | "other"
      deal_stage:
        | "lead"
        | "pre"
        | "active"
        | "offer"
        | "under_contract"
        | "closing"
        | "closed"
        | "terminated"
      deal_type:
        | "seller"
        | "buyer"
        | "lease_listing"
        | "lease_tenant"
        | "property_mgmt"
      doc_status: "uploaded" | "extracting" | "review" | "confirmed" | "failed"
      license_type: "sales_agent" | "broker" | "broker_associate"
      ms_status: "pending" | "done" | "overdue" | "na"
      org_kind:
        | "brokerage"
        | "title_company"
        | "lender"
        | "law_firm"
        | "vendor"
        | "hoa"
        | "property_management"
        | "other"
      party_role:
        | "buyer"
        | "seller"
        | "tenant"
        | "landlord"
        | "listing_agent"
        | "buyer_agent"
        | "listing_broker"
        | "buyer_broker"
        | "tc"
        | "buyer_attorney"
        | "seller_attorney"
        | "escrow_officer"
        | "title_company"
        | "lender"
        | "loan_officer"
        | "inspector"
        | "appraiser"
        | "surveyor"
        | "photographer"
        | "stager"
        | "contractor"
        | "hoa"
        | "property_manager"
        | "referral"
        | "other"
      party_side: "ours" | "theirs" | "neutral"
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
      contact_channel: ["phone", "sms", "email", "wechat", "whatsapp"],
      contact_kind: [
        "client",
        "agent",
        "title_lending",
        "vendor",
        "tc",
        "attorney",
        "other",
      ],
      contact_language: ["zh", "en"],
      contact_relation: [
        "spouse",
        "partner",
        "parent",
        "child",
        "sibling",
        "relative",
        "friend",
        "assistant",
        "colleague",
        "other",
      ],
      deal_stage: [
        "lead",
        "pre",
        "active",
        "offer",
        "under_contract",
        "closing",
        "closed",
        "terminated",
      ],
      deal_type: [
        "seller",
        "buyer",
        "lease_listing",
        "lease_tenant",
        "property_mgmt",
      ],
      doc_status: ["uploaded", "extracting", "review", "confirmed", "failed"],
      license_type: ["sales_agent", "broker", "broker_associate"],
      ms_status: ["pending", "done", "overdue", "na"],
      org_kind: [
        "brokerage",
        "title_company",
        "lender",
        "law_firm",
        "vendor",
        "hoa",
        "property_management",
        "other",
      ],
      party_role: [
        "buyer",
        "seller",
        "tenant",
        "landlord",
        "listing_agent",
        "buyer_agent",
        "listing_broker",
        "buyer_broker",
        "tc",
        "buyer_attorney",
        "seller_attorney",
        "escrow_officer",
        "title_company",
        "lender",
        "loan_officer",
        "inspector",
        "appraiser",
        "surveyor",
        "photographer",
        "stager",
        "contractor",
        "hoa",
        "property_manager",
        "referral",
        "other",
      ],
      party_side: ["ours", "theirs", "neutral"],
    },
  },
} as const
