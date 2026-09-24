// Generado desde el proyecto Supabase (no editar a mano).
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
      access_recertifications: {
        Row: {
          at: string
          decision: string
          id: string
          membership_id: string
          organization_id: string
          reviewed_by: string
        }
        Insert: {
          at?: string
          decision: string
          id?: string
          membership_id: string
          organization_id: string
          reviewed_by: string
        }
        Update: {
          at?: string
          decision?: string
          id?: string
          membership_id?: string
          organization_id?: string
          reviewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_recertifications_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_recertifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_recertifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          diff: Json
          entity_id: string | null
          entity_label: string
          entity_type: string
          id: number
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          diff?: Json
          entity_id?: string | null
          entity_label?: string
          entity_type: string
          id?: never
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          diff?: Json
          entity_id?: string | null
          entity_label?: string
          entity_type?: string
          id?: never
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          created_at: string
          document_id: string
          id: string
          new_version_id: string | null
          organization_id: string
          reason: string
          requested_by: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          new_version_id?: string | null
          organization_id: string
          reason: string
          requested_by: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          new_version_id?: string | null
          organization_id?: string
          reason?: string
          requested_by?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_document_id_organization_id_fkey"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "change_requests_new_version_id_organization_id_fkey"
            columns: ["new_version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "change_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      control_evidences: {
        Row: {
          control_id: string
          created_at: string
          executed_at: string
          file_name: string | null
          file_path: string | null
          file_sha256: string | null
          id: string
          notes: string
          organization_id: string
          registered_by: string
          result: string
        }
        Insert: {
          control_id: string
          created_at?: string
          executed_at: string
          file_name?: string | null
          file_path?: string | null
          file_sha256?: string | null
          id?: string
          notes?: string
          organization_id: string
          registered_by: string
          result: string
        }
        Update: {
          control_id?: string
          created_at?: string
          executed_at?: string
          file_name?: string | null
          file_path?: string | null
          file_sha256?: string | null
          id?: string
          notes?: string
          organization_id?: string
          registered_by?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_evidences_control_id_organization_id_fkey"
            columns: ["control_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "control_evidences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_evidences_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          created_at: string
          description: string
          frequency: string
          id: string
          next_due_date: string
          organization_id: string
          responsible_position_id: string
          risk_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          frequency: string
          id?: string
          next_due_date: string
          organization_id: string
          responsible_position_id: string
          risk_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          frequency?: string
          id?: string
          next_due_date?: string
          organization_id?: string
          responsible_position_id?: string
          risk_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controls_responsible_position_id_organization_id_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "controls_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      document_distribution: {
        Row: {
          document_id: string
          organization_id: string
          position_id: string
        }
        Insert: {
          document_id: string
          organization_id: string
          position_id: string
        }
        Update: {
          document_id?: string
          organization_id?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_distribution_document_id_organization_id_fkey"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "document_distribution_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_distribution_position_id_organization_id_fkey"
            columns: ["position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      document_types: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_summary: string
          created_at: string
          document_id: string
          effective_date: string | null
          elaborated_by: string
          id: string
          organization_id: string
          pdf_path: string | null
          pdf_sha256: string | null
          pdf_size: number | null
          reviewed_by: string | null
          source_file_name: string | null
          source_path: string | null
          source_sha256: string | null
          source_size: number | null
          status: string
          updated_at: string
          version_no: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_summary?: string
          created_at?: string
          document_id: string
          effective_date?: string | null
          elaborated_by: string
          id?: string
          organization_id: string
          pdf_path?: string | null
          pdf_sha256?: string | null
          pdf_size?: number | null
          reviewed_by?: string | null
          source_file_name?: string | null
          source_path?: string | null
          source_sha256?: string | null
          source_size?: number | null
          status?: string
          updated_at?: string
          version_no: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_summary?: string
          created_at?: string
          document_id?: string
          effective_date?: string | null
          elaborated_by?: string
          id?: string
          organization_id?: string
          pdf_path?: string | null
          pdf_sha256?: string | null
          pdf_size?: number | null
          reviewed_by?: string | null
          source_file_name?: string | null
          source_path?: string | null
          source_sha256?: string | null
          source_size?: number | null
          status?: string
          updated_at?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_organization_id_fkey"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "document_versions_elaborated_by_fkey"
            columns: ["elaborated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          aprobador_position_id: string
          code: string
          created_at: string
          created_by: string | null
          current_version_id: string | null
          elaborador_position_id: string
          id: string
          next_review_date: string | null
          organization_id: string
          process_id: string
          read_required: boolean
          review_every_months: number
          revisor_position_id: string
          status: string
          title: string
          type_id: string
          updated_at: string
        }
        Insert: {
          aprobador_position_id: string
          code: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          elaborador_position_id: string
          id?: string
          next_review_date?: string | null
          organization_id: string
          process_id: string
          read_required?: boolean
          review_every_months?: number
          revisor_position_id: string
          status?: string
          title: string
          type_id: string
          updated_at?: string
        }
        Update: {
          aprobador_position_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          elaborador_position_id?: string
          id?: string
          next_review_date?: string | null
          organization_id?: string
          process_id?: string
          read_required?: boolean
          review_every_months?: number
          revisor_position_id?: string
          status?: string
          title?: string
          type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_aprobador_position_id_organization_id_fkey"
            columns: ["aprobador_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_version_id_organization_id_fkey"
            columns: ["current_version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_elaborador_position_id_organization_id_fkey"
            columns: ["elaborador_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_revisor_position_id_organization_id_fkey"
            columns: ["revisor_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_type_id_organization_id_fkey"
            columns: ["type_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          organization_id: string | null
          payload: Json
          sent_at: string | null
          status: string
          template: string
          to_email: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          organization_id?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          template: string
          to_email: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          organization_id?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          template?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          is_external: boolean
          is_org_admin: boolean
          organization_id: string
          position_id: string
          token_hash: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          is_external?: boolean
          is_org_admin?: boolean
          organization_id: string
          position_id: string
          token_hash: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          is_external?: boolean
          is_org_admin?: boolean
          organization_id?: string
          position_id?: string
          token_hash?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_position_id_organization_id_fkey"
            columns: ["position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          is_external: boolean
          is_org_admin: boolean
          last_recertified_at: string | null
          organization_id: string
          position_id: string | null
          status: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_external?: boolean
          is_org_admin?: boolean
          last_recertified_at?: string | null
          organization_id: string
          position_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_external?: boolean
          is_org_admin?: boolean
          last_recertified_at?: string | null
          organization_id?: string
          position_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_position_id_organization_id_fkey"
            columns: ["position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          nit: string
          recert_period_days: number
          risk_scale: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          nit: string
          recert_period_days?: number
          risk_scale?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          nit?: string
          recert_period_days?: number
          risk_scale?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      position_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          position_id: string
          process_id: string | null
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          position_id: string
          process_id?: string | null
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          position_id?: string
          process_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_roles_position_id_organization_id_fkey"
            columns: ["position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "position_roles_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          process_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          process_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          process_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      processes: {
        Row: {
          code: string
          created_at: string
          id: string
          leader_position_id: string | null
          name: string
          organization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          leader_position_id?: string | null
          name: string
          organization_id: string
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          leader_position_id?: string | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_leader_position_id_organization_id_fkey"
            columns: ["leader_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "processes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_org: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          active_org?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          active_org?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_org_fkey"
            columns: ["active_org"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      read_acknowledgements: {
        Row: {
          acknowledged_at: string
          id: string
          organization_id: string
          user_id: string
          version_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          organization_id: string
          user_id: string
          version_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          organization_id?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "read_acknowledgements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "read_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "read_acknowledgements_version_id_organization_id_fkey"
            columns: ["version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      review_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          version_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          version_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_version_id_organization_id_fkey"
            columns: ["version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          assessed_at: string
          assessed_by: string
          id: string
          impact: number
          kind: string
          level: string
          organization_id: string
          probability: number
          risk_id: string
          score: number | null
        }
        Insert: {
          assessed_at?: string
          assessed_by: string
          id?: string
          impact: number
          kind: string
          level: string
          organization_id: string
          probability: number
          risk_id: string
          score?: number | null
        }
        Update: {
          assessed_at?: string
          assessed_by?: string
          id?: string
          impact?: number
          kind?: string
          level?: string
          organization_id?: string
          probability?: number
          risk_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string
          cause: string
          code: string
          consequence: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          organization_id: string
          owner_position_id: string
          process_id: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          cause?: string
          code: string
          consequence?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          organization_id: string
          owner_position_id: string
          process_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          cause?: string
          code?: string
          consequence?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          organization_id?: string
          owner_position_id?: string
          process_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_owner_position_id_organization_id_fkey"
            columns: ["owner_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risks_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      signatures: {
        Row: {
          action: string
          file_sha256: string
          id: string
          ip: unknown
          meaning: string
          organization_id: string
          reauth_at: string
          signature_hash: string
          signed_at: string
          signer_id: string
          user_agent: string | null
          version_id: string
        }
        Insert: {
          action: string
          file_sha256: string
          id?: string
          ip?: unknown
          meaning: string
          organization_id: string
          reauth_at: string
          signature_hash: string
          signed_at?: string
          signer_id: string
          user_agent?: string | null
          version_id: string
        }
        Update: {
          action?: string
          file_sha256?: string
          id?: string
          ip?: unknown
          meaning?: string
          organization_id?: string
          reauth_at?: string
          signature_hash?: string
          signed_at?: string
          signer_id?: string
          user_agent?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_version_id_organization_id_fkey"
            columns: ["version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_position_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          detail: string | null
          due_date: string
          entity_code: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          origin_user_id: string | null
          status: string
          title: string
          type: string
          version_no: number | null
        }
        Insert: {
          assignee_position_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          detail?: string | null
          due_date: string
          entity_code?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          origin_user_id?: string | null
          status?: string
          title: string
          type: string
          version_no?: number | null
        }
        Update: {
          assignee_position_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string
          entity_code?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          origin_user_id?: string | null
          status?: string
          title?: string
          type?: string
          version_no?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_position_id_organization_id_fkey"
            columns: ["assignee_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_origin_user_id_fkey"
            columns: ["origin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_assessment: {
        Args: {
          p_impact: number
          p_kind: string
          p_probability: number
          p_risk: string
        }
        Returns: undefined
      }
      add_comment: {
        Args: { p_body: string; p_version: string }
        Returns: string
      }
      add_control: {
        Args: {
          p_description: string
          p_frequency: string
          p_responsible: string
          p_risk: string
          p_type: string
        }
        Returns: string
      }
      can_edit_draft: {
        Args: {
          d: Database["public"]["Tables"]["documents"]["Row"]
          v: Database["public"]["Tables"]["document_versions"]["Row"]
        }
        Returns: boolean
      }
      can_manage_org: { Args: { org: string }; Returns: boolean }
      can_manage_risk: {
        Args: { org: string; process: string }
        Returns: boolean
      }
      can_see_document: { Args: { p_doc: string }; Returns: boolean }
      can_see_risks: { Args: { org: string }; Returns: boolean }
      can_see_version: { Args: { p_version: string }; Returns: boolean }
      can_view_content: { Args: { org: string }; Returns: boolean }
      complete_tasks: {
        Args: {
          p_actor?: string
          p_entity_id: string
          p_position?: string
          p_type: string
        }
        Returns: undefined
      }
      confirm_read: { Args: { p_version: string }; Returns: undefined }
      create_document: {
        Args: {
          p_aprobador: string
          p_change_summary: string
          p_code: string
          p_distribution: string[]
          p_elaborador: string
          p_id: string
          p_org: string
          p_process: string
          p_read_required: boolean
          p_review_months: number
          p_revisor: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_risk: {
        Args: {
          p_category: string
          p_cause: string
          p_consequence: string
          p_controls?: Json
          p_description: string
          p_impact: number
          p_org: string
          p_owner: string
          p_probability: number
          p_process: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_task: {
        Args: {
          org: string
          p_actor?: string
          p_code: string
          p_detail: string
          p_due: string
          p_entity_id: string
          p_entity_type: string
          p_position: string
          p_title: string
          p_type: string
          p_version_no: number
        }
        Returns: undefined
      }
      current_org: { Args: never; Returns: string }
      doc_or_fail: {
        Args: { p_doc: string }
        Returns: {
          aprobador_position_id: string
          code: string
          created_at: string
          created_by: string | null
          current_version_id: string | null
          elaborador_position_id: string
          id: string
          next_review_date: string | null
          organization_id: string
          process_id: string
          read_required: boolean
          review_every_months: number
          revisor_position_id: string
          status: string
          title: string
          type_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      frequency_interval: { Args: { f: string }; Returns: string }
      has_role: {
        Args: { org: string; process?: string; r: string }
        Returns: boolean
      }
      is_active_member: { Args: { org: string }; Returns: boolean }
      is_document_participant: { Args: { p_doc: string }; Returns: boolean }
      is_org_admin: { Args: { org: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      log_event: {
        Args: {
          org: string
          p_action: string
          p_actor?: string
          p_diff?: Json
          p_entity_id: string
          p_entity_type: string
          p_label: string
        }
        Returns: undefined
      }
      my_position: { Args: { org: string }; Returns: string }
      notify_position: {
        Args: {
          org: string
          p_payload: Json
          p_position: string
          p_template: string
        }
        Returns: undefined
      }
      org_directory: {
        Args: { org: string }
        Returns: {
          full_name: string
          position_id: string
          position_name: string
          user_id: string
        }[]
      }
      register_evidence: {
        Args: {
          p_control: string
          p_executed_at: string
          p_file_name?: string
          p_file_path?: string
          p_file_sha256?: string
          p_notes: string
          p_result: string
        }
        Returns: string
      }
      request_update: {
        Args: { p_doc: string; p_reason: string }
        Returns: string
      }
      resolve_change_request: {
        Args: { p_accept: boolean; p_request: string; p_resolution: string }
        Returns: string
      }
      resolve_comment: { Args: { p_comment: string }; Returns: undefined }
      return_version: {
        Args: { p_reason: string; p_version: string }
        Returns: undefined
      }
      risk_or_fail: {
        Args: { p_risk: string }
        Returns: {
          category: string
          cause: string
          code: string
          consequence: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          organization_id: string
          owner_position_id: string
          process_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "risks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_daily_jobs: { Args: never; Returns: Json }
      set_active_org: { Args: { org: string }; Returns: undefined }
      set_version_files: {
        Args: {
          p_pdf_path: string
          p_pdf_sha256: string
          p_pdf_size: number
          p_source_name: string
          p_source_path: string
          p_source_sha256: string
          p_source_size: number
          p_version: string
        }
        Returns: undefined
      }
      shares_org_with: { Args: { other: string }; Returns: boolean }
      sign_version: {
        Args: {
          p_action: string
          p_ip: unknown
          p_meaning: string
          p_signer: string
          p_user_agent: string
          p_version: string
        }
        Returns: string
      }
      storage_can_read_document: { Args: { p_name: string }; Returns: boolean }
      storage_can_read_evidence: { Args: { p_name: string }; Returns: boolean }
      submit_version: { Args: { p_version: string }; Returns: undefined }
      version_or_fail: {
        Args: { p_version: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          change_summary: string
          created_at: string
          document_id: string
          effective_date: string | null
          elaborated_by: string
          id: string
          organization_id: string
          pdf_path: string | null
          pdf_sha256: string | null
          pdf_size: number | null
          reviewed_by: string | null
          source_file_name: string | null
          source_path: string | null
          source_sha256: string | null
          source_size: number | null
          status: string
          updated_at: string
          version_no: number
        }
        SetofOptions: {
          from: "*"
          to: "document_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
