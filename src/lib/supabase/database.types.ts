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
    PostgrestVersion: "14.17"
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
            foreignKeyName: "access_recertifications_membership_org_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id", "organization_id"]
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
      ai_agent_usage: {
        Row: {
          organization_id: string
          period: string
          updated_at: string
          used: number
        }
        Insert: {
          organization_id: string
          period: string
          updated_at?: string
          used?: number
        }
        Update: {
          organization_id?: string
          period?: string
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_idempotency: {
        Row: {
          created_at: string
          idem_key: string
          organization_id: string
          response: Json
        }
        Insert: {
          created_at?: string
          idem_key: string
          organization_id: string
          response: Json
        }
        Update: {
          created_at?: string
          idem_key?: string
          organization_id?: string
          response?: Json
        }
        Relationships: [
          {
            foreignKeyName: "api_idempotency_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          revoked_at?: string | null
          scopes: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_flows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_request_steps: {
        Row: {
          approver_position_id: string
          comment: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string
          id: string
          name: string
          organization_id: string
          request_id: string
          step_no: number
        }
        Insert: {
          approver_position_id: string
          comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          id?: string
          name: string
          organization_id: string
          request_id: string
          step_no: number
        }
        Update: {
          approver_position_id?: string
          comment?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          id?: string
          name?: string
          organization_id?: string
          request_id?: string
          step_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_steps_approver_position_id_organization_i_fkey"
            columns: ["approver_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "approval_request_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_request_steps_request_id_organization_id_fkey"
            columns: ["request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          closed_at: string | null
          code: string
          created_at: string
          current_step: number
          description: string | null
          flow_id: string
          id: string
          organization_id: string
          requested_by: string
          status: string
          title: string
        }
        Insert: {
          closed_at?: string | null
          code: string
          created_at?: string
          current_step?: number
          description?: string | null
          flow_id: string
          id?: string
          organization_id: string
          requested_by?: string
          status?: string
          title: string
        }
        Update: {
          closed_at?: string | null
          code?: string
          created_at?: string
          current_step?: number
          description?: string | null
          flow_id?: string
          id?: string
          organization_id?: string
          requested_by?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_flow_id_organization_id_fkey"
            columns: ["flow_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "approval_flows"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          audit_id: string
          created_at: string
          created_by: string
          criteria_ref: string | null
          description: string
          id: string
          nonconformity_id: string | null
          organization_id: string
          process_id: string | null
          severity: string | null
          type: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          created_by?: string
          criteria_ref?: string | null
          description: string
          id?: string
          nonconformity_id?: string | null
          organization_id: string
          process_id?: string | null
          severity?: string | null
          type: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          created_by?: string
          criteria_ref?: string | null
          description?: string
          id?: string
          nonconformity_id?: string | null
          organization_id?: string
          process_id?: string | null
          severity?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_organization_id_fkey"
            columns: ["audit_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "audit_findings_nonconformity_id_organization_id_fkey"
            columns: ["nonconformity_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "audit_findings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
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
      audit_processes: {
        Row: {
          audit_id: string
          organization_id: string
          process_id: string
        }
        Insert: {
          audit_id: string
          organization_id: string
          process_id: string
        }
        Update: {
          audit_id?: string
          organization_id?: string
          process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_processes_audit_id_organization_id_fkey"
            columns: ["audit_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "audit_processes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_processes_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      audits: {
        Row: {
          cancel_reason: string | null
          closed_at: string | null
          code: string
          conclusions: string | null
          created_at: string
          created_by: string
          criteria: string | null
          id: string
          lead_auditor_position_id: string | null
          objective: string | null
          organization_id: string
          planned_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          closed_at?: string | null
          code: string
          conclusions?: string | null
          created_at?: string
          created_by?: string
          criteria?: string | null
          id?: string
          lead_auditor_position_id?: string | null
          objective?: string | null
          organization_id: string
          planned_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          closed_at?: string | null
          code?: string
          conclusions?: string | null
          created_at?: string
          created_by?: string
          criteria?: string | null
          id?: string
          lead_auditor_position_id?: string | null
          objective?: string | null
          organization_id?: string
          planned_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_lead_auditor_position_id_organization_id_fkey"
            columns: ["lead_auditor_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "audits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_events: {
        Row: {
          certificate_ref: string | null
          created_at: string
          created_by: string
          date: string
          equipment_id: string
          id: string
          kind: string
          next_due_date: string | null
          note: string | null
          organization_id: string
          provider: string | null
          result: string
          standard_used: string | null
        }
        Insert: {
          certificate_ref?: string | null
          created_at?: string
          created_by?: string
          date: string
          equipment_id: string
          id?: string
          kind?: string
          next_due_date?: string | null
          note?: string | null
          organization_id: string
          provider?: string | null
          result: string
          standard_used?: string | null
        }
        Update: {
          certificate_ref?: string | null
          created_at?: string
          created_by?: string
          date?: string
          equipment_id?: string
          id?: string
          kind?: string
          next_due_date?: string | null
          note?: string | null
          organization_id?: string
          provider?: string | null
          result?: string
          standard_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calibration_events_equipment_id_organization_id_fkey"
            columns: ["equipment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "measurement_equipment"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "calibration_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_control: {
        Row: {
          approver_position_id: string | null
          change_type: string
          closed_at: string | null
          code: string
          created_at: string
          created_by: string
          decision_date: string | null
          description: string | null
          id: string
          impact_assessment: string | null
          implementation_notes: string | null
          organization_id: string
          process_id: string | null
          request_date: string
          requested_by_position_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approver_position_id?: string | null
          change_type: string
          closed_at?: string | null
          code: string
          created_at?: string
          created_by?: string
          decision_date?: string | null
          description?: string | null
          id?: string
          impact_assessment?: string | null
          implementation_notes?: string | null
          organization_id: string
          process_id?: string | null
          request_date?: string
          requested_by_position_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approver_position_id?: string | null
          change_type?: string
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string
          decision_date?: string | null
          description?: string | null
          id?: string
          impact_assessment?: string | null
          implementation_notes?: string | null
          organization_id?: string
          process_id?: string | null
          request_date?: string
          requested_by_position_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_control_approver_position_id_organization_id_fkey"
            columns: ["approver_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "change_control_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_control_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "change_control_requested_by_position_id_organization_id_fkey"
            columns: ["requested_by_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      change_control_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "change_control_counters_organization_id_fkey"
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
      competencies: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_assessments: {
        Row: {
          assessed_at: string
          assessed_by: string
          assessed_level: number
          competency_id: string
          gap_plan: string | null
          gap_task_id: string | null
          id: string
          membership_id: string
          next_review_date: string | null
          note: string | null
          organization_id: string
          position_id: string
          status: string
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string
          assessed_level: number
          competency_id: string
          gap_plan?: string | null
          gap_task_id?: string | null
          id?: string
          membership_id: string
          next_review_date?: string | null
          note?: string | null
          organization_id: string
          position_id: string
          status: string
        }
        Update: {
          assessed_at?: string
          assessed_by?: string
          assessed_level?: number
          competency_id?: string
          gap_plan?: string | null
          gap_task_id?: string | null
          id?: string
          membership_id?: string
          next_review_date?: string | null
          note?: string | null
          organization_id?: string
          position_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_assessments_competency_id_organization_id_fkey"
            columns: ["competency_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "competency_assessments_gap_task_id_fkey"
            columns: ["gap_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_assessments_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "competency_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_assessments_position_id_organization_id_fkey"
            columns: ["position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      content_translations: {
        Row: {
          entity_id: string
          entity_type: string
          field: string
          id: string
          locale: string
          organization_id: string
          updated_at: string
          updated_by: string
          value: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          field: string
          id?: string
          locale: string
          organization_id: string
          updated_at?: string
          updated_by?: string
          value: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          field?: string
          id?: string
          locale?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      context_issues: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          implication: string | null
          objective_id: string | null
          organization_id: string
          pestel: string | null
          process_id: string | null
          risk_id: string | null
          status: string
          swot: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description: string
          id?: string
          implication?: string | null
          objective_id?: string | null
          organization_id: string
          pestel?: string | null
          process_id?: string | null
          risk_id?: string | null
          status?: string
          swot: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          implication?: string | null
          objective_id?: string | null
          organization_id?: string
          pestel?: string | null
          process_id?: string | null
          risk_id?: string | null
          status?: string
          swot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_issues_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "quality_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_issues_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "context_issues_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
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
      course_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          answers: Json | null
          completed_at: string
          course_id: string
          id: string
          organization_id: string
          score: number
          status: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string
          course_id: string
          id?: string
          organization_id: string
          score: number
          status: string
          user_id?: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string
          course_id?: string
          id?: string
          organization_id?: string
          score?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_organization_id_fkey"
            columns: ["course_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "course_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_questions: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          options: Json
          order_index: number
          organization_id: string
          text: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          options: Json
          order_index?: number
          organization_id: string
          text: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          options?: Json
          order_index?: number
          organization_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_questions_course_id_organization_id_fkey"
            columns: ["course_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "course_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          content: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string
          passing_score: number
          process_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          content?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organization_id: string
          passing_score?: number
          process_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          content?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organization_id?: string
          passing_score?: number
          process_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          layout: Json
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          layout?: Json
          organization_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          layout?: Json
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      entity_norms: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          is_active: boolean
          norm_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          entity_id: string
          entity_type: string
          id?: string
          is_active?: boolean
          norm_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          norm_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_norms_norm_id_organization_id_fkey"
            columns: ["norm_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "norms"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "entity_norms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      env_aspects: {
        Row: {
          activity: string
          aspect: string
          code: string
          condition: string
          controls: string | null
          created_at: string
          created_by: string
          freq: number
          id: string
          impact: string
          legal_crit: number
          legal_requirement_id: string | null
          next_review_date: string | null
          organization_id: string
          process_id: string | null
          reach: number
          responsible_position_id: string | null
          score: number
          sev: number
          significance: string
          status: string
          updated_at: string
        }
        Insert: {
          activity: string
          aspect: string
          code: string
          condition: string
          controls?: string | null
          created_at?: string
          created_by?: string
          freq: number
          id?: string
          impact: string
          legal_crit: number
          legal_requirement_id?: string | null
          next_review_date?: string | null
          organization_id: string
          process_id?: string | null
          reach: number
          responsible_position_id?: string | null
          score: number
          sev: number
          significance: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity?: string
          aspect?: string
          code?: string
          condition?: string
          controls?: string | null
          created_at?: string
          created_by?: string
          freq?: number
          id?: string
          impact?: string
          legal_crit?: number
          legal_requirement_id?: string | null
          next_review_date?: string | null
          organization_id?: string
          process_id?: string | null
          reach?: number
          responsible_position_id?: string | null
          score?: number
          sev?: number
          significance?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "env_aspects_legal_requirement_id_organization_id_fkey"
            columns: ["legal_requirement_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "legal_requirements"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "env_aspects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "env_aspects_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "env_aspects_responsible_position_id_organization_id_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      env_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "env_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          config: Json | null
          created_at: string
          help: string | null
          id: string
          is_active: boolean
          label: string
          options: Json | null
          order_index: number
          organization_id: string
          required: boolean
          template_id: string
          type: string
          version: number
        }
        Insert: {
          config?: Json | null
          created_at?: string
          help?: string | null
          id?: string
          is_active?: boolean
          label: string
          options?: Json | null
          order_index?: number
          organization_id: string
          required?: boolean
          template_id: string
          type: string
          version: number
        }
        Update: {
          config?: Json | null
          created_at?: string
          help?: string | null
          id?: string
          is_active?: boolean
          label?: string
          options?: Json | null
          order_index?: number
          organization_id?: string
          required?: boolean
          template_id?: string
          type?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_fields_template_id_organization_id_fkey"
            columns: ["template_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          status: string
          submitted_at: string | null
          submitted_by: string
          template_id: string
          template_version: number
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          template_id: string
          template_version: number
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          template_id?: string
          template_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_organization_id_fkey"
            columns: ["template_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      form_templates: {
        Row: {
          category: string
          code: string
          created_at: string
          created_by: string
          description: string | null
          draft_version: number
          id: string
          organization_id: string
          process_id: string | null
          published_at: string | null
          published_version: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          created_by?: string
          description?: string | null
          draft_version?: number
          id?: string
          organization_id: string
          process_id?: string | null
          published_at?: string | null
          published_version?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          draft_version?: number
          id?: string
          organization_id?: string
          process_id?: string | null
          published_at?: string | null
          published_version?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      hazard_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hazard_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hazards: {
        Row: {
          area: string | null
          classification: string
          code: string
          created_at: string
          created_by: string
          existing_controls: string | null
          hazard: string
          id: string
          intervention: string | null
          nc: number
          nd: number
          ne: number
          next_review_date: string | null
          np: number
          nr: number
          organization_id: string
          process_id: string | null
          responsible_position_id: string | null
          risk_level: string
          status: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          classification: string
          code: string
          created_at?: string
          created_by?: string
          existing_controls?: string | null
          hazard: string
          id?: string
          intervention?: string | null
          nc: number
          nd: number
          ne: number
          next_review_date?: string | null
          np: number
          nr: number
          organization_id: string
          process_id?: string | null
          responsible_position_id?: string | null
          risk_level: string
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          classification?: string
          code?: string
          created_at?: string
          created_by?: string
          existing_controls?: string | null
          hazard?: string
          id?: string
          intervention?: string | null
          nc?: number
          nd?: number
          ne?: number
          next_review_date?: string | null
          np?: number
          nr?: number
          organization_id?: string
          process_id?: string | null
          responsible_position_id?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hazards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hazards_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "hazards_responsible_position_id_organization_id_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      indicator_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_measurements: {
        Row: {
          captured_at: string
          captured_by: string
          compliance: string
          denominator: number | null
          id: string
          indicator_id: string
          nonconformity_id: string | null
          note: string | null
          numerator: number | null
          organization_id: string
          period: string
          value: number
        }
        Insert: {
          captured_at?: string
          captured_by?: string
          compliance: string
          denominator?: number | null
          id?: string
          indicator_id: string
          nonconformity_id?: string | null
          note?: string | null
          numerator?: number | null
          organization_id: string
          period: string
          value: number
        }
        Update: {
          captured_at?: string
          captured_by?: string
          compliance?: string
          denominator?: number | null
          id?: string
          indicator_id?: string
          nonconformity_id?: string | null
          note?: string | null
          numerator?: number | null
          organization_id?: string
          period?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_measurements_indicator_id_organization_id_fkey"
            columns: ["indicator_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "indicator_measurements_nonconformity_id_organization_id_fkey"
            columns: ["nonconformity_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "indicator_measurements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          code: string
          created_at: string
          created_by: string
          description: string | null
          direction: string
          frequency: string
          id: string
          is_rate: boolean
          name: string
          organization_id: string
          owner_position_id: string | null
          process_id: string
          status: string
          target: number
          target_max: number | null
          tolerance_pct: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string
          description?: string | null
          direction: string
          frequency: string
          id?: string
          is_rate?: boolean
          name: string
          organization_id: string
          owner_position_id?: string | null
          process_id: string
          status?: string
          target: number
          target_max?: number | null
          tolerance_pct?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          direction?: string
          frequency?: string
          id?: string
          is_rate?: boolean
          name?: string
          organization_id?: string
          owner_position_id?: string | null
          process_id?: string
          status?: string
          target?: number
          target_max?: number | null
          tolerance_pct?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_owner_position_id_organization_id_fkey"
            columns: ["owner_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "indicators_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      interested_parties: {
        Row: {
          created_at: string
          created_by: string
          id: string
          legal_requirement_id: string | null
          monitoring: string | null
          name: string
          needs_expectations: string | null
          organization_id: string
          party_type: string
          process_id: string | null
          requirements: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          legal_requirement_id?: string | null
          monitoring?: string | null
          name: string
          needs_expectations?: string | null
          organization_id: string
          party_type: string
          process_id?: string | null
          requirements?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          legal_requirement_id?: string | null
          monitoring?: string | null
          name?: string
          needs_expectations?: string | null
          organization_id?: string
          party_type?: string
          process_id?: string | null
          requirements?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interested_parties_legal_requirement_id_fkey"
            columns: ["legal_requirement_id"]
            isOneToOne: false
            referencedRelation: "legal_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interested_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interested_parties_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
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
      kn_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kn_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          category: string
          code: string
          content: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          process_id: string | null
          source: string | null
          source_audit_id: string | null
          source_nc_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          content: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id: string
          process_id?: string | null
          source?: string | null
          source_audit_id?: string | null
          source_nc_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          process_id?: string | null
          source?: string | null
          source_audit_id?: string | null
          source_nc_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "knowledge_articles_source_audit_id_fkey"
            columns: ["source_audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_source_nc_id_fkey"
            columns: ["source_nc_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_evaluations: {
        Row: {
          compliance: string
          created_at: string
          created_by: string
          evaluated_at: string
          evidence: string
          id: string
          note: string | null
          organization_id: string
          requirement_id: string
        }
        Insert: {
          compliance: string
          created_at?: string
          created_by?: string
          evaluated_at: string
          evidence: string
          id?: string
          note?: string | null
          organization_id: string
          requirement_id: string
        }
        Update: {
          compliance?: string
          created_at?: string
          created_by?: string
          evaluated_at?: string
          evidence?: string
          id?: string
          note?: string | null
          organization_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_evaluations_requirement_id_organization_id_fkey"
            columns: ["requirement_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "legal_requirements"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      legal_requirements: {
        Row: {
          code: string
          created_at: string
          created_by: string
          description: string
          eval_frequency: string
          id: string
          issuer: string | null
          next_eval_date: string | null
          organization_id: string
          process_id: string | null
          reference: string
          source_type: string
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string
          description: string
          eval_frequency?: string
          id?: string
          issuer?: string | null
          next_eval_date?: string | null
          organization_id: string
          process_id?: string | null
          reference: string
          source_type: string
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          description?: string
          eval_frequency?: string
          id?: string
          issuer?: string | null
          next_eval_date?: string | null
          organization_id?: string
          process_id?: string | null
          reference?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_requirements_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      management_review_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "management_review_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      management_reviews: {
        Row: {
          approval_hash: string | null
          approved_at: string | null
          approved_by: string | null
          attendees: string | null
          cancel_reason: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          inputs: Json
          ip: unknown
          meeting_date: string
          organization_id: string
          period_end: string
          period_start: string
          reauth_at: string | null
          scope: string | null
          snapshot: Json
          status: string
          title: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          approval_hash?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendees?: string | null
          cancel_reason?: string | null
          code: string
          created_at?: string
          created_by?: string
          id?: string
          inputs?: Json
          ip?: unknown
          meeting_date: string
          organization_id: string
          period_end: string
          period_start: string
          reauth_at?: string | null
          scope?: string | null
          snapshot?: Json
          status?: string
          title: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          approval_hash?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendees?: string | null
          cancel_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          inputs?: Json
          ip?: unknown
          meeting_date?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          reauth_at?: string | null
          scope?: string | null
          snapshot?: Json
          status?: string
          title?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "management_reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_equipment: {
        Row: {
          calibration_frequency: string
          code: string
          created_at: string
          created_by: string
          id: string
          last_calibration_date: string | null
          location: string | null
          measurement_range: string | null
          name: string
          next_due_date: string | null
          organization_id: string
          process_id: string | null
          responsible_position_id: string | null
          status: string
          type: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          calibration_frequency: string
          code: string
          created_at?: string
          created_by?: string
          id?: string
          last_calibration_date?: string | null
          location?: string | null
          measurement_range?: string | null
          name: string
          next_due_date?: string | null
          organization_id: string
          process_id?: string | null
          responsible_position_id?: string | null
          status?: string
          type?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          calibration_frequency?: string
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          last_calibration_date?: string | null
          location?: string | null
          measurement_range?: string | null
          name?: string
          next_due_date?: string | null
          organization_id?: string
          process_id?: string | null
          responsible_position_id?: string | null
          status?: string
          type?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_equipment_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "measurement_equipment_responsible_position_id_organization_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      meeting_commitments: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          minute_id: string
          organization_id: string
          responsible_position_id: string | null
          status: string
          task_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          description: string
          due_date?: string | null
          id?: string
          minute_id: string
          organization_id: string
          responsible_position_id?: string | null
          status?: string
          task_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          minute_id?: string
          organization_id?: string
          responsible_position_id?: string | null
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_commitments_minute_id_organization_id_fkey"
            columns: ["minute_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_commitments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_commitments_responsible_position_id_organization_i_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_commitments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          agenda: string | null
          attendees: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          meeting_type: string
          organization_id: string
          process_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          attendees?: string | null
          code: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_date: string
          meeting_type: string
          organization_id: string
          process_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          attendees?: string | null
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          meeting_type?: string
          organization_id?: string
          process_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
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
      metrology_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrology_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_actions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string
          id: string
          nonconformity_id: string
          organization_id: string
          responsible_position_id: string
          status: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description: string
          due_date: string
          id?: string
          nonconformity_id: string
          organization_id: string
          responsible_position_id: string
          status?: string
          type: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          id?: string
          nonconformity_id?: string
          organization_id?: string
          responsible_position_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nc_actions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_actions_nonconformity_id_organization_id_fkey"
            columns: ["nonconformity_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nc_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_actions_responsible_position_id_organization_id_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      nc_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "nc_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_evidences: {
        Row: {
          action_id: string | null
          file_name: string
          file_path: string
          file_sha256: string | null
          file_size: number | null
          id: string
          nonconformity_id: string
          note: string | null
          organization_id: string
          registered_at: string
          registered_by: string
        }
        Insert: {
          action_id?: string | null
          file_name: string
          file_path: string
          file_sha256?: string | null
          file_size?: number | null
          id?: string
          nonconformity_id: string
          note?: string | null
          organization_id: string
          registered_at?: string
          registered_by?: string
        }
        Update: {
          action_id?: string | null
          file_name?: string
          file_path?: string
          file_sha256?: string | null
          file_size?: number | null
          id?: string
          nonconformity_id?: string
          note?: string | null
          organization_id?: string
          registered_at?: string
          registered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "nc_evidences_action_id_organization_id_fkey"
            columns: ["action_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nc_actions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nc_evidences_nonconformity_id_organization_id_fkey"
            columns: ["nonconformity_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nc_evidences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nonconforming_outputs: {
        Row: {
          code: string
          created_at: string
          created_by: string
          customer_informed: boolean
          description: string
          detected_date: string
          disposition: string | null
          disposition_detail: string | null
          id: string
          identification: string | null
          nonconformity_id: string | null
          organization_id: string
          process_id: string | null
          responsible_position_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string
          customer_informed?: boolean
          description: string
          detected_date?: string
          disposition?: string | null
          disposition_detail?: string | null
          id?: string
          identification?: string | null
          nonconformity_id?: string | null
          organization_id: string
          process_id?: string | null
          responsible_position_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          customer_informed?: boolean
          description?: string
          detected_date?: string
          disposition?: string | null
          disposition_detail?: string | null
          id?: string
          identification?: string | null
          nonconformity_id?: string | null
          organization_id?: string
          process_id?: string | null
          responsible_position_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nonconforming_outputs_nonconformity_id_organization_id_fkey"
            columns: ["nonconformity_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nonconforming_outputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonconforming_outputs_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nonconforming_outputs_responsible_position_id_organization_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      nonconformities: {
        Row: {
          cancel_reason: string | null
          closed_at: string | null
          code: string
          created_at: string
          created_by: string
          description: string
          detected_at: string
          effective: boolean | null
          id: string
          organization_id: string
          owner_position_id: string | null
          process_id: string | null
          reopened_count: number
          reported_by: string
          root_cause: string | null
          severity: string
          source: string
          source_risk_id: string | null
          status: string
          title: string
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          cancel_reason?: string | null
          closed_at?: string | null
          code: string
          created_at?: string
          created_by?: string
          description: string
          detected_at: string
          effective?: boolean | null
          id?: string
          organization_id: string
          owner_position_id?: string | null
          process_id?: string | null
          reopened_count?: number
          reported_by: string
          root_cause?: string | null
          severity: string
          source: string
          source_risk_id?: string | null
          status?: string
          title: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          cancel_reason?: string | null
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string
          description?: string
          detected_at?: string
          effective?: boolean | null
          id?: string
          organization_id?: string
          owner_position_id?: string | null
          process_id?: string | null
          reopened_count?: number
          reported_by?: string
          root_cause?: string | null
          severity?: string
          source?: string
          source_risk_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nonconformities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonconformities_owner_position_id_organization_id_fkey"
            columns: ["owner_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nonconformities_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nonconformities_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nonconformities_source_risk_id_organization_id_fkey"
            columns: ["source_risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "nonconformities_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      norms: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "norms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "objective_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_indicators: {
        Row: {
          created_at: string
          id: string
          indicator_id: string
          is_active: boolean
          objective_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id: string
          is_active?: boolean
          objective_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string
          is_active?: boolean
          objective_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_indicators_indicator_id_organization_id_fkey"
            columns: ["indicator_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "objective_indicators_objective_id_organization_id_fkey"
            columns: ["objective_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "quality_objectives"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "objective_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_agent_enabled: boolean
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
          ai_agent_enabled?: boolean
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
          ai_agent_enabled?: boolean
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
      position_competencies: {
        Row: {
          competency_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          note: string | null
          organization_id: string
          position_id: string
          required_level: number
        }
        Insert: {
          competency_id: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          note?: string | null
          organization_id: string
          position_id: string
          required_level: number
        }
        Update: {
          competency_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          note?: string | null
          organization_id?: string
          position_id?: string
          required_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "position_competencies_competency_id_organization_id_fkey"
            columns: ["competency_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "position_competencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_competencies_position_id_organization_id_fkey"
            columns: ["position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
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
      pqrs_cases: {
        Row: {
          channel: string
          code: string
          created_at: string
          created_by: string
          customer_contact: string | null
          customer_name: string | null
          description: string
          due_date: string
          id: string
          nonconformity_id: string | null
          organization_id: string
          process_id: string | null
          received_date: string
          response: string | null
          responsible_position_id: string | null
          satisfied: boolean | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          channel: string
          code: string
          created_at?: string
          created_by?: string
          customer_contact?: string | null
          customer_name?: string | null
          description: string
          due_date: string
          id?: string
          nonconformity_id?: string | null
          organization_id: string
          process_id?: string | null
          received_date: string
          response?: string | null
          responsible_position_id?: string | null
          satisfied?: boolean | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string
          created_by?: string
          customer_contact?: string | null
          customer_name?: string | null
          description?: string
          due_date?: string
          id?: string
          nonconformity_id?: string | null
          organization_id?: string
          process_id?: string | null
          received_date?: string
          response?: string | null
          responsible_position_id?: string | null
          satisfied?: boolean | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pqrs_cases_nonconformity_id_organization_id_fkey"
            columns: ["nonconformity_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pqrs_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pqrs_cases_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "pqrs_cases_responsible_position_id_organization_id_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      pqrs_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pqrs_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          characterized_at: string | null
          clients: string | null
          code: string
          created_at: string
          id: string
          inputs: string | null
          leader_position_id: string | null
          name: string
          objective: string | null
          organization_id: string
          outputs: string | null
          phva_act: string | null
          phva_check: string | null
          phva_do: string | null
          phva_plan: string | null
          resources: string | null
          scope: string | null
          suppliers: string | null
          type: string
          updated_at: string
        }
        Insert: {
          characterized_at?: string | null
          clients?: string | null
          code: string
          created_at?: string
          id?: string
          inputs?: string | null
          leader_position_id?: string | null
          name: string
          objective?: string | null
          organization_id: string
          outputs?: string | null
          phva_act?: string | null
          phva_check?: string | null
          phva_do?: string | null
          phva_plan?: string | null
          resources?: string | null
          scope?: string | null
          suppliers?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          characterized_at?: string | null
          clients?: string | null
          code?: string
          created_at?: string
          id?: string
          inputs?: string | null
          leader_position_id?: string | null
          name?: string
          objective?: string | null
          organization_id?: string
          outputs?: string | null
          phva_act?: string | null
          phva_check?: string | null
          phva_do?: string | null
          phva_plan?: string | null
          resources?: string | null
          scope?: string | null
          suppliers?: string | null
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
          locale: string
          updated_at: string
        }
        Insert: {
          active_org?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          active_org?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          locale?: string
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
      public_pqrs_portals: {
        Row: {
          created_at: string
          created_by: string
          enabled: boolean
          organization_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          organization_id: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          organization_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_pqrs_portals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_objectives: {
        Row: {
          code: string
          created_at: string
          created_by: string
          description: string
          horizon_year: number | null
          id: string
          organization_id: string
          perspective: string
          process_id: string | null
          status: string
          target_text: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string
          description: string
          horizon_year?: number | null
          id?: string
          organization_id: string
          perspective: string
          process_id?: string | null
          status?: string
          target_text?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          description?: string
          horizon_year?: number | null
          id?: string
          organization_id?: string
          perspective?: string
          process_id?: string | null
          status?: string
          target_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_objectives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_objectives_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
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
      review_outputs: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          kind: string
          nonconformity_id: string | null
          organization_id: string
          responsible_position_id: string | null
          review_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description: string
          due_date?: string | null
          id?: string
          kind: string
          nonconformity_id?: string | null
          organization_id: string
          responsible_position_id?: string | null
          review_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          kind?: string
          nonconformity_id?: string | null
          organization_id?: string
          responsible_position_id?: string | null
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_outputs_nonconformity_id_organization_id_fkey"
            columns: ["nonconformity_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "nonconformities"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "review_outputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_outputs_responsible_position_id_organization_id_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "review_outputs_review_id_organization_id_fkey"
            columns: ["review_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "management_reviews"
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
      satisfaction_measurements: {
        Row: {
          created_at: string
          id: string
          measured_by: string
          method: string
          note: string | null
          organization_id: string
          period: string
          responses: number | null
          score: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_by?: string
          method: string
          note?: string | null
          organization_id: string
          period: string
          responses?: number | null
          score: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_by?: string
          method?: string
          note?: string | null
          organization_id?: string
          period?: string
          responses?: number | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_measurements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_surveys: {
        Row: {
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          method: string
          organization_id: string
          period: string
          process_id: string | null
          scale: string
          status: string
          title: string
          token: string
        }
        Insert: {
          closed_at?: string | null
          closes_at?: string | null
          code: string
          created_at?: string
          created_by?: string
          id?: string
          method: string
          organization_id: string
          period: string
          process_id?: string | null
          scale?: string
          status?: string
          title: string
          token: string
        }
        Update: {
          closed_at?: string | null
          closes_at?: string | null
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          method?: string
          organization_id?: string
          period?: string
          process_id?: string | null
          scale?: string
          status?: string
          title?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_process_id_organization_id_fkey"
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
      snc_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "snc_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sol_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sol_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_actions: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          evaluation_id: string
          id: string
          organization_id: string
          responsible_position_id: string | null
          standard_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description: string
          due_date?: string | null
          evaluation_id: string
          id?: string
          organization_id: string
          responsible_position_id?: string | null
          standard_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          evaluation_id?: string
          id?: string
          organization_id?: string
          responsible_position_id?: string | null
          standard_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sst_actions_evaluation_id_organization_id_fkey"
            columns: ["evaluation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sst_evaluations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sst_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_actions_responsible_position_id_organization_id_fkey"
            columns: ["responsible_position_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sst_actions_standard_id_fkey"
            columns: ["standard_id"]
            isOneToOne: false
            referencedRelation: "sst_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sst_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_evaluation_items: {
        Row: {
          evaluation_id: string
          id: string
          justification: string | null
          organization_id: string
          standard_id: string
          status: string
          updated_at: string
        }
        Insert: {
          evaluation_id: string
          id?: string
          justification?: string | null
          organization_id: string
          standard_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          evaluation_id?: string
          id?: string
          justification?: string | null
          organization_id?: string
          standard_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sst_evaluation_items_evaluation_id_organization_id_fkey"
            columns: ["evaluation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sst_evaluations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sst_evaluation_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sst_evaluation_items_standard_id_fkey"
            columns: ["standard_id"]
            isOneToOne: false
            referencedRelation: "sst_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_evaluations: {
        Row: {
          closed_at: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          period: number
          rating: string | null
          risk_class: number
          score: number | null
          status: string
          tier: number
          updated_at: string
          worker_count: number
        }
        Insert: {
          closed_at?: string | null
          code: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id: string
          period: number
          rating?: string | null
          risk_class: number
          score?: number | null
          status?: string
          tier: number
          updated_at?: string
          worker_count: number
        }
        Update: {
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          period?: number
          rating?: string | null
          risk_class?: number
          score?: number | null
          status?: string
          tier?: number
          updated_at?: string
          worker_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sst_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sst_standards: {
        Row: {
          applies_21: boolean
          applies_7: boolean
          code: string
          component: string
          cycle: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          weight_21: number | null
          weight_60: number | null
          weight_7: number | null
        }
        Insert: {
          applies_21?: boolean
          applies_7?: boolean
          code: string
          component: string
          cycle: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          weight_21?: number | null
          weight_60?: number | null
          weight_7?: number | null
        }
        Update: {
          applies_21?: boolean
          applies_7?: boolean
          code?: string
          component?: string
          cycle?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          weight_21?: number | null
          weight_60?: number | null
          weight_7?: number | null
        }
        Relationships: []
      }
      submission_values: {
        Row: {
          field_id: string
          id: string
          organization_id: string
          submission_id: string
          value: Json | null
        }
        Insert: {
          field_id: string
          id?: string
          organization_id: string
          submission_id: string
          value?: Json | null
        }
        Update: {
          field_id?: string
          id?: string
          organization_id?: string
          submission_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_values_field_id_organization_id_fkey"
            columns: ["field_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "submission_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_values_submission_id_organization_id_fkey"
            columns: ["submission_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      supplier_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_evaluations: {
        Row: {
          created_at: string
          eval_date: string
          evaluated_by: string
          id: string
          kind: string
          next_eval_date: string | null
          note: string | null
          organization_id: string
          result: string
          score_delivery: number
          score_quality: number
          score_service: number
          supplier_id: string
          total_score: number
          weight_delivery: number
          weight_quality: number
          weight_service: number
        }
        Insert: {
          created_at?: string
          eval_date: string
          evaluated_by?: string
          id?: string
          kind: string
          next_eval_date?: string | null
          note?: string | null
          organization_id: string
          result: string
          score_delivery: number
          score_quality: number
          score_service: number
          supplier_id: string
          total_score: number
          weight_delivery: number
          weight_quality: number
          weight_service: number
        }
        Update: {
          created_at?: string
          eval_date?: string
          evaluated_by?: string
          id?: string
          kind?: string
          next_eval_date?: string | null
          note?: string | null
          organization_id?: string
          result?: string
          score_delivery?: number
          score_quality?: number
          score_service?: number
          supplier_id?: string
          total_score?: number
          weight_delivery?: number
          weight_quality?: number
          weight_service?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluations_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      supplier_self_assessments: {
        Row: {
          comment: string | null
          id: string
          ip_hash: string | null
          organization_id: string
          score: number
          status: string
          submitted_at: string
          supplier_id: string
        }
        Insert: {
          comment?: string | null
          id?: string
          ip_hash?: string | null
          organization_id: string
          score: number
          status?: string
          submitted_at?: string
          supplier_id: string
        }
        Update: {
          comment?: string | null
          id?: string
          ip_hash?: string | null
          organization_id?: string
          score?: number
          status?: string
          submitted_at?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_self_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_self_assessments_supplier_id_organization_id_fkey"
            columns: ["supplier_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          criticality: string
          id: string
          is_active: boolean
          kind: string
          name: string
          next_eval_date: string | null
          nit: string | null
          organization_id: string
          process_id: string | null
          self_assessment_token: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          criticality: string
          id?: string
          is_active?: boolean
          kind: string
          name: string
          next_eval_date?: string | null
          nit?: string | null
          organization_id: string
          process_id?: string | null
          self_assessment_token?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          criticality?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          next_eval_date?: string | null
          nit?: string | null
          organization_id?: string
          process_id?: string | null
          self_assessment_token?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      survey_counters: {
        Row: {
          last_seq: number
          organization_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          organization_id: string
          year: number
        }
        Update: {
          last_seq?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          ip_hash: string | null
          organization_id: string
          score: number
          survey_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          organization_id: string
          score: number
          survey_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          organization_id?: string
          score?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_organization_id_fkey"
            columns: ["survey_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_surveys"
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
      training_attendees: {
        Row: {
          certificate_name: string | null
          certificate_path: string | null
          certificate_sha256: string | null
          created_at: string
          created_by: string
          id: string
          membership_id: string
          organization_id: string
          result: string
          training_id: string
          valid_until: string | null
        }
        Insert: {
          certificate_name?: string | null
          certificate_path?: string | null
          certificate_sha256?: string | null
          created_at?: string
          created_by?: string
          id?: string
          membership_id: string
          organization_id: string
          result?: string
          training_id: string
          valid_until?: string | null
        }
        Update: {
          certificate_name?: string | null
          certificate_path?: string | null
          certificate_sha256?: string | null
          created_at?: string
          created_by?: string
          id?: string
          membership_id?: string
          organization_id?: string
          result?: string
          training_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_attendees_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "training_attendees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendees_training_id_organization_id_fkey"
            columns: ["training_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          created_by: string
          hours: number | null
          id: string
          kind: string
          note: string | null
          organization_id: string
          process_id: string | null
          provider: string | null
          title: string
          training_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          hours?: number | null
          id?: string
          kind: string
          note?: string | null
          organization_id: string
          process_id?: string | null
          provider?: string | null
          title: string
          training_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          hours?: number | null
          id?: string
          kind?: string
          note?: string | null
          organization_id?: string
          process_id?: string | null
          provider?: string | null
          title?: string
          training_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_process_id_organization_id_fkey"
            columns: ["process_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          endpoint_id: string
          event: string
          id: string
          last_error: string | null
          next_attempt_at: string
          organization_id: string
          payload: Json
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          endpoint_id: string
          event: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          organization_id: string
          payload: Json
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint_id?: string
          event?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          organization_id?: string
          payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_organization_id_fkey"
            columns: ["endpoint_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "webhook_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          created_by: string
          events: string[]
          id: string
          organization_id: string
          revoked_at: string | null
          secret: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          events: string[]
          id?: string
          organization_id: string
          revoked_at?: string | null
          secret: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          events?: string[]
          id?: string
          organization_id?: string
          revoked_at?: string | null
          secret?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_full_name?: string; p_token_hash: string; p_user: string }
        Returns: string
      }
      add_assessment: {
        Args: {
          p_impact: number
          p_kind: string
          p_probability: number
          p_risk: string
        }
        Returns: undefined
      }
      add_audit_finding: {
        Args: {
          p_audit: string
          p_criteria_ref: string
          p_description: string
          p_process: string
          p_severity?: string
          p_type: string
        }
        Returns: string
      }
      add_comment: {
        Args: { p_body: string; p_version: string }
        Returns: string
      }
      add_commitment: {
        Args: {
          p_description: string
          p_due: string
          p_minute: string
          p_responsible: string
        }
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
      add_course_question: {
        Args: { p_course: string; p_options: Json; p_text: string }
        Returns: string
      }
      add_field: {
        Args: { p_label: string; p_template: string; p_type: string }
        Returns: string
      }
      add_nc_action: {
        Args: {
          p_description: string
          p_due: string
          p_nc: string
          p_responsible: string
          p_type: string
        }
        Returns: string
      }
      add_nc_evidence: {
        Args: {
          p_action: string
          p_name: string
          p_nc: string
          p_note?: string
          p_path: string
          p_sha256: string
          p_size: number
        }
        Returns: string
      }
      add_review_output: {
        Args: {
          p_description: string
          p_due: string
          p_kind: string
          p_responsible: string
          p_review: string
        }
        Returns: string
      }
      add_sst_action: {
        Args: {
          p_description: string
          p_due: string
          p_eval: string
          p_responsible: string
          p_standard: string
        }
        Returns: string
      }
      add_training_attendee: {
        Args: {
          p_membership: string
          p_result: string
          p_training: string
          p_valid_until: string
        }
        Returns: string
      }
      ai_agent_consume: {
        Args: { p_limit: number; p_org: string; p_period: string }
        Returns: number
      }
      ai_agent_consume_record: {
        Args: { p_limit: number; p_org: string; p_period: string }
        Returns: number
      }
      api_create_nc_output: {
        Args: {
          p_actor: string
          p_description: string
          p_detected: string
          p_identification: string
          p_org: string
          p_process: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      api_create_pqrs: {
        Args: {
          p_actor: string
          p_channel: string
          p_customer_contact: string
          p_customer_name: string
          p_description: string
          p_due_days: number
          p_org: string
          p_process: string
          p_received: string
          p_type: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      api_record_measurement: {
        Args: {
          p_actor: string
          p_denominator: number
          p_indicator: string
          p_note: string
          p_numerator: number
          p_org: string
          p_period: string
          p_value: number
        }
        Returns: string
      }
      api_report_nonconformity: {
        Args: {
          p_actor: string
          p_description: string
          p_detected: string
          p_org: string
          p_process: string
          p_severity: string
          p_source: string
          p_title: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      archive_competency: {
        Args: { p_archive: boolean; p_competency: string }
        Returns: undefined
      }
      archive_indicator: { Args: { p_indicator: string }; Returns: undefined }
      article_or_fail: {
        Args: { p_article: string }
        Returns: {
          category: string
          code: string
          content: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          process_id: string | null
          source: string | null
          source_audit_id: string | null
          source_nc_id: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "knowledge_articles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assess_change: {
        Args: { p_change: string; p_impact: string }
        Returns: undefined
      }
      assess_competency: {
        Args: {
          p_assessed: number
          p_competency: string
          p_create_task: boolean
          p_membership: string
          p_next_review: string
          p_note: string
          p_position: string
        }
        Returns: {
          id: string
          status: string
        }[]
      }
      assess_status: {
        Args: { p_assessed: number; p_has_plan: boolean; p_required: number }
        Returns: string
      }
      audit_or_fail: {
        Args: { p_audit: string }
        Returns: {
          cancel_reason: string | null
          closed_at: string | null
          code: string
          conclusions: string | null
          created_at: string
          created_by: string
          criteria: string | null
          id: string
          lead_auditor_position_id: string | null
          objective: string | null
          organization_id: string
          planned_date: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "audits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_edit_draft: {
        Args: {
          d: Database["public"]["Tables"]["documents"]["Row"]
          v: Database["public"]["Tables"]["document_versions"]["Row"]
        }
        Returns: boolean
      }
      can_manage_audits: { Args: { org: string }; Returns: boolean }
      can_manage_changes: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_competencies: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_context: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_courses: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_flows: { Args: { org: string }; Returns: boolean }
      can_manage_forms: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_indicators: { Args: { org: string }; Returns: boolean }
      can_manage_knowledge: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_legal: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_metrology: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_minutes: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_nc: {
        Args: { org: string; process: string }
        Returns: boolean
      }
      can_manage_nc_outputs: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_objectives: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_org: { Args: { org: string }; Returns: boolean }
      can_manage_org_as: {
        Args: { org: string; p_user: string }
        Returns: boolean
      }
      can_manage_pqrs: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_process: {
        Args: { org: string; process: string }
        Returns: boolean
      }
      can_manage_reviews: { Args: { org: string }; Returns: boolean }
      can_manage_risk: {
        Args: { org: string; process: string }
        Returns: boolean
      }
      can_manage_sig: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_manage_sst: { Args: { org: string }; Returns: boolean }
      can_manage_suppliers: {
        Args: { org: string; process?: string }
        Returns: boolean
      }
      can_see_audits: { Args: { org: string }; Returns: boolean }
      can_see_changes: { Args: { org: string }; Returns: boolean }
      can_see_competencies: { Args: { org: string }; Returns: boolean }
      can_see_context: { Args: { org: string }; Returns: boolean }
      can_see_courses: { Args: { org: string }; Returns: boolean }
      can_see_document: { Args: { p_doc: string }; Returns: boolean }
      can_see_forms: { Args: { org: string }; Returns: boolean }
      can_see_indicators: { Args: { org: string }; Returns: boolean }
      can_see_legal: { Args: { org: string }; Returns: boolean }
      can_see_metrology: { Args: { org: string }; Returns: boolean }
      can_see_minutes: { Args: { org: string }; Returns: boolean }
      can_see_nc_outputs: { Args: { org: string }; Returns: boolean }
      can_see_nonconformities: { Args: { org: string }; Returns: boolean }
      can_see_objectives: { Args: { org: string }; Returns: boolean }
      can_see_person_competency: {
        Args: { p_membership: string; p_org: string }
        Returns: boolean
      }
      can_see_pqrs: { Args: { org: string }; Returns: boolean }
      can_see_reviews: { Args: { org: string }; Returns: boolean }
      can_see_risks: { Args: { org: string }; Returns: boolean }
      can_see_sig: { Args: { org: string }; Returns: boolean }
      can_see_sst: { Args: { org: string }; Returns: boolean }
      can_see_suppliers: { Args: { org: string }; Returns: boolean }
      can_see_version: { Args: { p_version: string }; Returns: boolean }
      can_view_content: { Args: { org: string }; Returns: boolean }
      cancel_approval_request: {
        Args: { p_reason: string; p_request: string }
        Returns: undefined
      }
      cancel_audit: {
        Args: { p_audit: string; p_reason: string }
        Returns: undefined
      }
      cancel_nc: {
        Args: { p_nc: string; p_reason: string }
        Returns: undefined
      }
      cancel_nc_action: { Args: { p_action: string }; Returns: undefined }
      cancel_output: {
        Args: { p_output: string; p_reason: string }
        Returns: undefined
      }
      cancel_pqrs: {
        Args: { p_case: string; p_reason: string }
        Returns: undefined
      }
      cancel_review: {
        Args: { p_reason: string; p_review: string }
        Returns: undefined
      }
      change_or_fail: {
        Args: { p_change: string }
        Returns: {
          approver_position_id: string | null
          change_type: string
          closed_at: string | null
          code: string
          created_at: string
          created_by: string
          decision_date: string | null
          description: string | null
          id: string
          impact_assessment: string | null
          implementation_notes: string | null
          organization_id: string
          process_id: string | null
          request_date: string
          requested_by_position_id: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "change_control"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_audit: {
        Args: { p_audit: string; p_conclusions: string }
        Returns: undefined
      }
      close_evaluation: { Args: { p_eval: string }; Returns: undefined }
      close_minute: { Args: { p_minute: string }; Returns: undefined }
      close_output: { Args: { p_output: string }; Returns: undefined }
      close_pqrs: {
        Args: { p_case: string; p_satisfied: boolean }
        Returns: undefined
      }
      close_review:
        | {
            Args: {
              p_approver: string
              p_hash: string
              p_ip: unknown
              p_reauth_at: string
              p_review: string
              p_ua: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_hash: string
              p_ip: unknown
              p_reauth_at: string
              p_review: string
              p_ua: string
            }
            Returns: undefined
          }
      close_survey: { Args: { p_survey: string }; Returns: undefined }
      complete_commitment: {
        Args: { p_commitment: string }
        Returns: undefined
      }
      complete_nc_action: { Args: { p_action: string }; Returns: undefined }
      complete_tasks: {
        Args: {
          p_actor?: string
          p_entity_id: string
          p_position?: string
          p_type: string
        }
        Returns: undefined
      }
      compute_review_snapshot: {
        Args: { p_end: string; p_org: string; p_start: string }
        Returns: Json
      }
      confirm_read: { Args: { p_version: string }; Returns: undefined }
      content_translation_authorize: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: string
      }
      course_or_fail: {
        Args: { p_course: string }
        Returns: {
          code: string
          content: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string
          passing_score: number
          process_id: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_api_key: {
        Args: {
          p_hash: string
          p_name: string
          p_org: string
          p_prefix: string
          p_scopes: string[]
        }
        Returns: string
      }
      create_approval_flow: {
        Args: { p_description: string; p_name: string; p_org: string }
        Returns: {
          id: string
        }[]
      }
      create_approval_request: {
        Args: {
          p_description: string
          p_flow: string
          p_org: string
          p_title: string
        }
        Returns: {
          code: string
        }[]
      }
      create_article_from_audit: {
        Args: { p_audit: string }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_article_from_nc: {
        Args: { p_nc: string }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_aspect: {
        Args: {
          p_activity: string
          p_aspect: string
          p_condition: string
          p_controls: string
          p_freq: number
          p_impact: string
          p_legal: string
          p_legal_crit: number
          p_next_review: string
          p_org: string
          p_process: string
          p_reach: number
          p_responsible: string
          p_sev: number
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_change: {
        Args: {
          p_description: string
          p_org: string
          p_process: string
          p_requested_by: string
          p_title: string
          p_type: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_competency: {
        Args: {
          p_description: string
          p_kind: string
          p_name: string
          p_org: string
        }
        Returns: string
      }
      create_context_issue: {
        Args: {
          p_description: string
          p_implication: string
          p_objective: string
          p_org: string
          p_pestel: string
          p_process: string
          p_swot: string
        }
        Returns: string
      }
      create_course: {
        Args: {
          p_description: string
          p_org: string
          p_passing: number
          p_process: string
          p_title: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
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
      create_equipment: {
        Args: {
          p_frequency: string
          p_location: string
          p_name: string
          p_org: string
          p_process: string
          p_range: string
          p_responsible: string
          p_type: string
          p_unit: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_evaluation: {
        Args: {
          p_org: string
          p_period: number
          p_risk: number
          p_workers: number
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_hazard: {
        Args: {
          p_area: string
          p_classification: string
          p_controls: string
          p_hazard: string
          p_intervention: string
          p_nc: number
          p_nd: number
          p_ne: number
          p_next_review: string
          p_org: string
          p_process: string
          p_responsible: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_indicator: {
        Args: {
          p_description: string
          p_direction: string
          p_frequency: string
          p_is_rate: boolean
          p_name: string
          p_org: string
          p_owner: string
          p_process: string
          p_target: number
          p_target_max: number
          p_tolerance: number
          p_unit: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_interested_party: {
        Args: {
          p_legal: string
          p_monitoring: string
          p_name: string
          p_needs: string
          p_org: string
          p_process: string
          p_requirements: string
          p_type: string
        }
        Returns: string
      }
      create_invitation: {
        Args: {
          p_actor: string
          p_email: string
          p_is_external: boolean
          p_is_org_admin: boolean
          p_org: string
          p_position: string
          p_token_hash: string
          p_valid_until: string
        }
        Returns: {
          expires_at: string
          id: string
        }[]
      }
      create_knowledge_article: {
        Args: {
          p_category: string
          p_content: string
          p_org: string
          p_process: string
          p_source: string
          p_title: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_minute: {
        Args: {
          p_agenda: string
          p_attendees: string
          p_date: string
          p_org: string
          p_process: string
          p_title: string
          p_type: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_nc_output: {
        Args: {
          p_description: string
          p_detected: string
          p_identification: string
          p_org: string
          p_process: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_objective: {
        Args: {
          p_description: string
          p_horizon: number
          p_indicator_ids: string[]
          p_org: string
          p_perspective: string
          p_process: string
          p_target: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_organization: {
        Args: {
          p_actor: string
          p_admin_email: string
          p_name: string
          p_nit: string
          p_token_hash: string
        }
        Returns: {
          expires_at: string
          organization_id: string
          position_id: string
        }[]
      }
      create_pqrs: {
        Args: {
          p_channel: string
          p_customer_contact: string
          p_customer_name: string
          p_description: string
          p_due_days: number
          p_org: string
          p_process: string
          p_received: string
          p_type: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_requirement: {
        Args: {
          p_description: string
          p_frequency: string
          p_issuer: string
          p_org: string
          p_process: string
          p_reference: string
          p_source: string
          p_title: string
          p_url: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_review: {
        Args: {
          p_end: string
          p_meeting: string
          p_org: string
          p_scope: string
          p_start: string
          p_title: string
        }
        Returns: {
          code: string
          id: string
        }[]
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
      create_supplier: {
        Args: {
          p_category: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_criticality: string
          p_kind: string
          p_name: string
          p_nit: string
          p_org: string
          p_process: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_survey: {
        Args: {
          p_method: string
          p_org: string
          p_period: string
          p_process: string
          p_scale: string
          p_title: string
        }
        Returns: {
          code: string
          id: string
          token: string
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
      create_template: {
        Args: {
          p_category: string
          p_description: string
          p_org: string
          p_process: string
          p_title: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      create_training: {
        Args: {
          p_date: string
          p_hours: number
          p_kind: string
          p_note: string
          p_org: string
          p_process: string
          p_provider: string
          p_title: string
        }
        Returns: string
      }
      create_webhook_endpoint: {
        Args: {
          p_events: string[]
          p_org: string
          p_secret: string
          p_url: string
        }
        Returns: string
      }
      current_actor: { Args: never; Returns: string }
      current_org: { Args: never; Returns: string }
      decide_approval_step: {
        Args: { p_approve: boolean; p_comment: string; p_request: string }
        Returns: undefined
      }
      decide_change: {
        Args: { p_approve: boolean; p_approver: string; p_change: string }
        Returns: undefined
      }
      derogate_requirement: { Args: { p_req: string }; Returns: undefined }
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
      enqueue_webhook: {
        Args: { p_event: string; p_org: string; p_payload: Json }
        Returns: undefined
      }
      env_aspect_or_fail: {
        Args: { p_aspect: string }
        Returns: {
          activity: string
          aspect: string
          code: string
          condition: string
          controls: string | null
          created_at: string
          created_by: string
          freq: number
          id: string
          impact: string
          legal_crit: number
          legal_requirement_id: string | null
          next_review_date: string | null
          organization_id: string
          process_id: string | null
          reach: number
          responsible_position_id: string | null
          score: number
          sev: number
          significance: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "env_aspects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      env_significance: {
        Args: { p_condition: string; p_legal: string; p_score: number }
        Returns: string
      }
      equipment_or_fail: {
        Args: { p_equipment: string }
        Returns: {
          calibration_frequency: string
          code: string
          created_at: string
          created_by: string
          id: string
          last_calibration_date: string | null
          location: string | null
          measurement_range: string | null
          name: string
          next_due_date: string | null
          organization_id: string
          process_id: string | null
          responsible_position_id: string | null
          status: string
          type: string | null
          unit: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "measurement_equipment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evaluate_requirement: {
        Args: {
          p_compliance: string
          p_evaluated: string
          p_evidence: string
          p_note: string
          p_req: string
        }
        Returns: undefined
      }
      evaluate_supplier: {
        Args: {
          p_delivery: number
          p_eval_date: string
          p_kind: string
          p_next_eval: string
          p_note: string
          p_quality: number
          p_service: number
          p_supplier: string
        }
        Returns: {
          id: string
          result: string
          total: number
        }[]
      }
      field_template: {
        Args: { p_field: string }
        Returns: {
          category: string
          code: string
          created_at: string
          created_by: string
          description: string | null
          draft_version: number
          id: string
          organization_id: string
          process_id: string | null
          published_at: string | null
          published_version: number | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "form_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      frequency_interval: { Args: { f: string }; Returns: string }
      generate_nc_from_finding: {
        Args: { p_finding: string }
        Returns: {
          code: string
        }[]
      }
      generate_nc_from_measurement: {
        Args: { p_measurement: string }
        Returns: {
          code: string
        }[]
      }
      generate_nc_from_output: {
        Args: { p_output: string }
        Returns: {
          code: string
        }[]
      }
      generate_nc_from_pqrs: {
        Args: { p_case: string }
        Returns: {
          code: string
        }[]
      }
      generate_nc_from_snc: {
        Args: { p_output: string }
        Returns: {
          code: string
          id: string
        }[]
      }
      generate_risk_from_issue: {
        Args: {
          p_impact: number
          p_issue: string
          p_owner: string
          p_probability: number
          p_process: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      get_course_by_code: {
        Args: { p_code: string; p_org: string }
        Returns: string
      }
      get_course_to_take: {
        Args: { p_code: string; p_org: string }
        Returns: Json
      }
      get_public_pqrs_portal: {
        Args: { p_token: string }
        Returns: {
          enabled: boolean
          organization: string
        }[]
      }
      get_published_form: { Args: { p_template: string }; Returns: Json }
      get_published_form_by_code: {
        Args: { p_code: string; p_org: string }
        Returns: Json
      }
      get_supplier_self_assessment: {
        Args: { p_token: string }
        Returns: {
          organization: string
          supplier: string
        }[]
      }
      get_survey_public: {
        Args: { p_token: string }
        Returns: {
          is_open: boolean
          method: string
          scale: string
          title: string
        }[]
      }
      gtc45_level: { Args: { p_nr: number }; Returns: string }
      has_role: {
        Args: { org: string; process?: string; r: string }
        Returns: boolean
      }
      hazard_or_fail: {
        Args: { p_hazard: string }
        Returns: {
          area: string | null
          classification: string
          code: string
          created_at: string
          created_by: string
          existing_controls: string | null
          hazard: string
          id: string
          intervention: string | null
          nc: number
          nd: number
          ne: number
          next_review_date: string | null
          np: number
          nr: number
          organization_id: string
          process_id: string | null
          responsible_position_id: string | null
          risk_level: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "hazards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      implement_change: {
        Args: { p_change: string; p_notes: string }
        Returns: undefined
      }
      indicator_compliance: {
        Args: {
          p_direction: string
          p_target: number
          p_target_max: number
          p_tolerance: number
          p_value: number
        }
        Returns: string
      }
      indicator_or_fail: {
        Args: { p_indicator: string }
        Returns: {
          code: string
          created_at: string
          created_by: string
          description: string | null
          direction: string
          frequency: string
          id: string
          is_rate: boolean
          name: string
          organization_id: string
          owner_position_id: string | null
          process_id: string
          status: string
          target: number
          target_max: number | null
          tolerance_pct: number | null
          unit: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "indicators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_active_member: { Args: { org: string }; Returns: boolean }
      is_document_participant: { Args: { p_doc: string }; Returns: boolean }
      is_member_of: { Args: { org: string; p_user: string }; Returns: boolean }
      is_org_admin: { Args: { org: string }; Returns: boolean }
      is_org_admin_as: {
        Args: { org: string; p_user: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_platform_admin_account: { Args: never; Returns: boolean }
      is_platform_admin_user: { Args: { p_user: string }; Returns: boolean }
      is_safe_object_path: {
        Args: { p_path: string; p_prefix: string }
        Returns: boolean
      }
      issue_or_fail: {
        Args: { p_issue: string }
        Returns: {
          created_at: string
          created_by: string
          description: string
          id: string
          implication: string | null
          objective_id: string | null
          organization_id: string
          pestel: string | null
          process_id: string | null
          risk_id: string | null
          status: string
          swot: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "context_issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      issue_supplier_self_assessment: {
        Args: { p_supplier: string; p_token: string }
        Returns: undefined
      }
      legal_or_fail: {
        Args: { p_req: string }
        Returns: {
          code: string
          created_at: string
          created_by: string
          description: string
          eval_frequency: string
          id: string
          issuer: string | null
          next_eval_date: string | null
          organization_id: string
          process_id: string | null
          reference: string
          source_type: string
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "legal_requirements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      manage_pqrs: {
        Args: {
          p_case: string
          p_process: string
          p_responsible: string
          p_status: string
        }
        Returns: undefined
      }
      mark_self_assessment_reviewed: {
        Args: { p_assessment: string }
        Returns: undefined
      }
      mask_email: { Args: { p_email: string }; Returns: string }
      member_contacts: {
        Args: { org: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      metrology_next_due: {
        Args: { p_date: string; p_freq: string }
        Returns: string
      }
      minute_or_fail: {
        Args: { p_minute: string }
        Returns: {
          agenda: string | null
          attendees: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          meeting_type: string
          organization_id: string
          process_id: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "meeting_minutes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_position: { Args: { org: string }; Returns: string }
      nc_add_evidence: {
        Args: {
          p_action: string
          p_actor: string
          p_name: string
          p_nc: string
          p_note?: string
          p_path: string
          p_sha256: string
          p_size: number
        }
        Returns: string
      }
      nc_advance_if_actions_done: { Args: { p_nc: string }; Returns: undefined }
      nc_or_fail: {
        Args: { p_nc: string }
        Returns: {
          cancel_reason: string | null
          closed_at: string | null
          code: string
          created_at: string
          created_by: string
          description: string
          detected_at: string
          effective: boolean | null
          id: string
          organization_id: string
          owner_position_id: string | null
          process_id: string | null
          reopened_count: number
          reported_by: string
          root_cause: string | null
          severity: string
          source: string
          source_risk_id: string | null
          status: string
          title: string
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "nonconformities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      new_template_version: { Args: { p_template: string }; Returns: undefined }
      next_kn_code: { Args: { p_org: string }; Returns: string }
      notify_position: {
        Args: {
          org: string
          p_payload: Json
          p_position: string
          p_template: string
        }
        Returns: undefined
      }
      objective_or_fail: {
        Args: { p_objective: string }
        Returns: {
          code: string
          created_at: string
          created_by: string
          description: string
          horizon_year: number | null
          id: string
          organization_id: string
          perspective: string
          process_id: string | null
          status: string
          target_text: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "quality_objectives"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      objectives_with_progress: {
        Args: { p_org: string }
        Returns: {
          code: string
          description: string
          horizon_year: number
          id: string
          indicator_count: number
          indicator_ids: string[]
          perspective: string
          process_id: string
          progress_pct: number
          status: string
          target_text: string
        }[]
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
      output_or_fail: {
        Args: { p_output: string }
        Returns: {
          code: string
          created_at: string
          created_by: string
          customer_informed: boolean
          description: string
          detected_date: string
          disposition: string | null
          disposition_detail: string | null
          id: string
          identification: string | null
          nonconformity_id: string | null
          organization_id: string
          process_id: string | null
          responsible_position_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "nonconforming_outputs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      party_or_fail: {
        Args: { p_party: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          legal_requirement_id: string | null
          monitoring: string | null
          name: string
          needs_expectations: string | null
          organization_id: string
          party_type: string
          process_id: string | null
          requirements: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "interested_parties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      plan_audit: {
        Args: {
          p_criteria: string
          p_lead: string
          p_objective: string
          p_org: string
          p_planned_date: string
          p_process_ids: string[]
          p_title: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      platform_organizations: {
        Args: never
        Returns: {
          created_at: string
          id: string
          name: string
          nit: string
          pending_admin_invitation: string
          status: string
          user_count: number
        }[]
      }
      position_of: { Args: { org: string; p_user: string }; Returns: string }
      pqrs_or_fail: {
        Args: { p_case: string }
        Returns: {
          channel: string
          code: string
          created_at: string
          created_by: string
          customer_contact: string | null
          customer_name: string | null
          description: string
          due_date: string
          id: string
          nonconformity_id: string | null
          organization_id: string
          process_id: string | null
          received_date: string
          response: string | null
          responsible_position_id: string | null
          satisfied: boolean | null
          status: string
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pqrs_cases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_course: { Args: { p_course: string }; Returns: undefined }
      publish_template: { Args: { p_template: string }; Returns: undefined }
      question_course: {
        Args: { p_question: string }
        Returns: {
          code: string
          content: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string
          passing_score: number
          process_id: string | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_measurement: {
        Args: {
          p_denominator: number
          p_indicator: string
          p_note: string
          p_numerator: number
          p_period: string
          p_value: number
        }
        Returns: string
      }
      record_satisfaction: {
        Args: {
          p_method: string
          p_note: string
          p_org: string
          p_period: string
          p_responses: number
          p_score: number
        }
        Returns: string
      }
      refresh_review_snapshot: {
        Args: { p_review: string }
        Returns: undefined
      }
      register_calibration: {
        Args: {
          p_certificate: string
          p_date: string
          p_equipment: string
          p_kind: string
          p_note: string
          p_provider: string
          p_result: string
          p_standard: string
        }
        Returns: string
      }
      register_evidence: {
        Args: {
          p_actor: string
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
      reissue_invitation: {
        Args: { p_actor: string; p_invitation: string; p_token_hash: string }
        Returns: string
      }
      remove_course_question: {
        Args: { p_question: string }
        Returns: undefined
      }
      remove_field: { Args: { p_field: string }; Returns: undefined }
      remove_position_requirement: {
        Args: { p_req: string }
        Returns: undefined
      }
      report_nonconformity: {
        Args: {
          p_description: string
          p_detected_at?: string
          p_org: string
          p_process: string
          p_severity: string
          p_source: string
          p_source_risk?: string
          p_title: string
        }
        Returns: {
          code: string
          id: string
        }[]
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
      respond_pqrs: {
        Args: { p_case: string; p_response: string }
        Returns: undefined
      }
      return_version: {
        Args: { p_reason: string; p_version: string }
        Returns: undefined
      }
      review_or_fail: {
        Args: { p_review: string }
        Returns: {
          approval_hash: string | null
          approved_at: string | null
          approved_by: string | null
          attendees: string | null
          cancel_reason: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          inputs: Json
          ip: unknown
          meeting_date: string
          organization_id: string
          period_end: string
          period_start: string
          reauth_at: string | null
          scope: string | null
          snapshot: Json
          status: string
          title: string
          updated_at: string
          user_agent: string | null
        }
        SetofOptions: {
          from: "*"
          to: "management_reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_api_key: { Args: { p_key: string }; Returns: undefined }
      revoke_webhook_endpoint: {
        Args: { p_endpoint: string }
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
      save_submission_draft: {
        Args: { p_submission: string; p_template: string; p_values: Json }
        Returns: string
      }
      set_active_org: { Args: { org: string }; Returns: undefined }
      set_article_archived: {
        Args: { p_archived: boolean; p_article: string }
        Returns: undefined
      }
      set_aspect_active: {
        Args: { p_active: boolean; p_aspect: string }
        Returns: undefined
      }
      set_content_translation: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_field: string
          p_locale: string
          p_value: string
        }
        Returns: undefined
      }
      set_course_archived: {
        Args: { p_archived: boolean; p_course: string }
        Returns: undefined
      }
      set_dashboard_layout: {
        Args: { p_layout: Json; p_org: string }
        Returns: undefined
      }
      set_entity_norms: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_norm_ids: string[]
          p_org: string
        }
        Returns: undefined
      }
      set_equipment_service: {
        Args: { p_equipment: string; p_in_service: boolean }
        Returns: undefined
      }
      set_field_order: {
        Args: { p_field_ids: string[]; p_template: string }
        Returns: undefined
      }
      set_flow_steps: {
        Args: { p_flow: string; p_steps: Json }
        Returns: undefined
      }
      set_hazard_active: {
        Args: { p_active: boolean; p_hazard: string }
        Returns: undefined
      }
      set_issue_archived: {
        Args: { p_archived: boolean; p_issue: string }
        Returns: undefined
      }
      set_item_status: {
        Args: { p_item: string; p_justification?: string; p_status: string }
        Returns: undefined
      }
      set_nc_cause: {
        Args: { p_cause: string; p_nc: string; p_owner?: string }
        Returns: undefined
      }
      set_norm_active: {
        Args: { p_active: boolean; p_norm: string }
        Returns: undefined
      }
      set_objective_status: {
        Args: { p_objective: string; p_status: string }
        Returns: undefined
      }
      set_output_disposition: {
        Args: {
          p_customer_informed: boolean
          p_detail: string
          p_disposition: string
          p_output: string
          p_responsible: string
        }
        Returns: undefined
      }
      set_party_archived: {
        Args: { p_archived: boolean; p_party: string }
        Returns: undefined
      }
      set_position_requirement: {
        Args: {
          p_competency: string
          p_level: number
          p_mandatory: boolean
          p_note: string
          p_position: string
        }
        Returns: string
      }
      set_public_pqrs_portal: {
        Args: { p_enabled: boolean; p_org: string; p_token: string }
        Returns: string
      }
      set_sst_action_status: {
        Args: { p_action: string; p_status: string }
        Returns: undefined
      }
      set_supplier_active: {
        Args: { p_active: boolean; p_supplier: string }
        Returns: undefined
      }
      set_template_archived: {
        Args: { p_archived: boolean; p_template: string }
        Returns: undefined
      }
      set_user_locale: { Args: { p_locale: string }; Returns: undefined }
      set_version_files: {
        Args: {
          p_actor: string
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
      sign_version_checked: {
        Args: {
          p_action: string
          p_expected_sha256: string
          p_ip: unknown
          p_meaning: string
          p_signer: string
          p_user_agent: string
          p_version: string
        }
        Returns: string
      }
      sst_evaluation_or_fail: {
        Args: { p_eval: string }
        Returns: {
          closed_at: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          period: number
          rating: string | null
          risk_class: number
          score: number | null
          status: string
          tier: number
          updated_at: string
          worker_count: number
        }
        SetofOptions: {
          from: "*"
          to: "sst_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sst_item_weight: {
        Args: {
          p_tier: number
          s: Database["public"]["Tables"]["sst_standards"]["Row"]
        }
        Returns: number
      }
      sst_recompute: { Args: { p_eval: string }; Returns: undefined }
      sst_tier: { Args: { p_risk: number; p_workers: number }; Returns: number }
      start_audit: { Args: { p_audit: string }; Returns: undefined }
      storage_can_read_document: { Args: { p_name: string }; Returns: boolean }
      storage_can_read_evidence: { Args: { p_name: string }; Returns: boolean }
      storage_can_read_form_photo: {
        Args: { p_name: string }
        Returns: boolean
      }
      storage_can_read_nc_evidence: {
        Args: { p_name: string }
        Returns: boolean
      }
      submit_course_attempt: {
        Args: { p_answers: Json; p_course: string }
        Returns: Json
      }
      submit_new_submission: {
        Args: { p_template: string; p_values: Json }
        Returns: string
      }
      submit_public_pqrs: {
        Args: {
          p_customer_contact: string
          p_customer_name: string
          p_description: string
          p_token: string
          p_type: string
        }
        Returns: undefined
      }
      submit_submission: {
        Args: { p_submission: string; p_values: Json }
        Returns: undefined
      }
      submit_supplier_self_assessment: {
        Args: {
          p_comment: string
          p_ip_hash: string
          p_score: number
          p_token: string
        }
        Returns: undefined
      }
      submit_survey_response: {
        Args: {
          p_comment: string
          p_ip_hash: string
          p_raw: number
          p_token: string
        }
        Returns: undefined
      }
      submit_version: { Args: { p_version: string }; Returns: undefined }
      supplier_or_fail: {
        Args: { p_supplier: string }
        Returns: {
          category: string | null
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          criticality: string
          id: string
          is_active: boolean
          kind: string
          name: string
          next_eval_date: string | null
          nit: string | null
          organization_id: string
          process_id: string | null
          self_assessment_token: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_objective_indicators: {
        Args: { p_ids: string[]; p_objective: string; p_org: string }
        Returns: undefined
      }
      template_has_open_draft: {
        Args: { t: Database["public"]["Tables"]["form_templates"]["Row"] }
        Returns: boolean
      }
      template_or_fail: {
        Args: { p_template: string }
        Returns: {
          category: string
          code: string
          created_at: string
          created_by: string
          description: string | null
          draft_version: number
          id: string
          organization_id: string
          process_id: string | null
          published_at: string | null
          published_version: number | null
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "form_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unarchive_indicator: { Args: { p_indicator: string }; Returns: undefined }
      update_approval_flow: {
        Args: {
          p_active: boolean
          p_description: string
          p_flow: string
          p_name: string
        }
        Returns: undefined
      }
      update_aspect: {
        Args: {
          p_activity: string
          p_aspect: string
          p_aspect_text: string
          p_condition: string
          p_controls: string
          p_freq: number
          p_impact: string
          p_legal: string
          p_legal_crit: number
          p_next_review: string
          p_process: string
          p_reach: number
          p_responsible: string
          p_sev: number
        }
        Returns: undefined
      }
      update_change: {
        Args: {
          p_change: string
          p_description: string
          p_process: string
          p_requested_by: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      update_competency: {
        Args: {
          p_competency: string
          p_description: string
          p_kind: string
          p_name: string
        }
        Returns: undefined
      }
      update_context_issue: {
        Args: {
          p_description: string
          p_implication: string
          p_issue: string
          p_objective: string
          p_pestel: string
          p_process: string
          p_swot: string
        }
        Returns: undefined
      }
      update_course_data: {
        Args: {
          p_content: string
          p_course: string
          p_description: string
          p_passing: number
          p_process: string
          p_title: string
        }
        Returns: undefined
      }
      update_course_question: {
        Args: { p_options: Json; p_question: string; p_text: string }
        Returns: undefined
      }
      update_equipment: {
        Args: {
          p_equipment: string
          p_frequency: string
          p_location: string
          p_name: string
          p_process: string
          p_range: string
          p_responsible: string
          p_type: string
          p_unit: string
        }
        Returns: undefined
      }
      update_field: {
        Args: {
          p_config: Json
          p_field: string
          p_help: string
          p_label: string
          p_options: Json
          p_required: boolean
        }
        Returns: undefined
      }
      update_hazard: {
        Args: {
          p_area: string
          p_classification: string
          p_controls: string
          p_hazard: string
          p_hazard_text: string
          p_intervention: string
          p_nc: number
          p_nd: number
          p_ne: number
          p_next_review: string
          p_process: string
          p_responsible: string
        }
        Returns: undefined
      }
      update_indicator: {
        Args: {
          p_description: string
          p_direction: string
          p_frequency: string
          p_indicator: string
          p_is_rate: boolean
          p_name: string
          p_owner: string
          p_target: number
          p_target_max: number
          p_tolerance: number
          p_unit: string
        }
        Returns: undefined
      }
      update_interested_party: {
        Args: {
          p_legal: string
          p_monitoring: string
          p_name: string
          p_needs: string
          p_party: string
          p_process: string
          p_requirements: string
          p_type: string
        }
        Returns: undefined
      }
      update_knowledge_article: {
        Args: {
          p_article: string
          p_category: string
          p_content: string
          p_process: string
          p_source: string
          p_title: string
        }
        Returns: undefined
      }
      update_minute: {
        Args: {
          p_agenda: string
          p_attendees: string
          p_date: string
          p_minute: string
          p_process: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      update_nc_output: {
        Args: {
          p_description: string
          p_detected: string
          p_identification: string
          p_output: string
          p_process: string
        }
        Returns: undefined
      }
      update_objective: {
        Args: {
          p_description: string
          p_horizon: number
          p_indicator_ids: string[]
          p_objective: string
          p_perspective: string
          p_process: string
          p_status: string
          p_target: string
        }
        Returns: undefined
      }
      update_pqrs: {
        Args: {
          p_case: string
          p_channel: string
          p_customer_contact: string
          p_customer_name: string
          p_description: string
          p_due: string
          p_process: string
          p_received: string
          p_type: string
        }
        Returns: undefined
      }
      update_process_characterization: {
        Args: {
          p_clients: string
          p_inputs: string
          p_objective: string
          p_outputs: string
          p_phva_act: string
          p_phva_check: string
          p_phva_do: string
          p_phva_plan: string
          p_process: string
          p_resources: string
          p_scope: string
          p_suppliers: string
        }
        Returns: undefined
      }
      update_requirement: {
        Args: {
          p_description: string
          p_frequency: string
          p_issuer: string
          p_process: string
          p_reference: string
          p_req: string
          p_source: string
          p_title: string
          p_url: string
        }
        Returns: undefined
      }
      update_review: {
        Args: {
          p_attendees: string
          p_inputs: Json
          p_review: string
          p_scope: string
        }
        Returns: undefined
      }
      update_supplier: {
        Args: {
          p_category: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_criticality: string
          p_kind: string
          p_name: string
          p_nit: string
          p_supplier: string
        }
        Returns: undefined
      }
      update_template_data: {
        Args: {
          p_category: string
          p_description: string
          p_process: string
          p_template: string
          p_title: string
        }
        Returns: undefined
      }
      upsert_norm: {
        Args: { p_code: string; p_name: string; p_org: string }
        Returns: string
      }
      valid_question_options: { Args: { p_options: Json }; Returns: boolean }
      validate_submission_values: {
        Args: {
          p_require: boolean
          p_template: string
          p_values: Json
          p_version: number
        }
        Returns: undefined
      }
      verify_nc: {
        Args: { p_effective: boolean; p_nc: string; p_notes?: string }
        Returns: undefined
      }
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
