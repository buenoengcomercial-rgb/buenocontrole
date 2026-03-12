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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      asos: {
        Row: {
          created_at: string
          employee_id: string
          exam_date: string
          expiry_date: string
          file_name: string
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          exam_date: string
          expiry_date: string
          file_name?: string
          id?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          exam_date?: string
          expiry_date?: string
          file_name?: string
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asos_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_data: string
          file_name: string
          file_size: number
          file_type: string
          id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_data?: string
          file_name: string
          file_size?: number
          file_type?: string
          id?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_data?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
        }
        Relationships: []
      }
      company_charges: {
        Row: {
          charge_type: string
          created_at: string
          due_date: string
          id: string
          month: string
          notes: string
          paid: boolean
          payment_date: string | null
          updated_at: string
          value: number
        }
        Insert: {
          charge_type?: string
          created_at?: string
          due_date: string
          id?: string
          month: string
          notes?: string
          paid?: boolean
          payment_date?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          charge_type?: string
          created_at?: string
          due_date?: string
          id?: string
          month?: string
          notes?: string
          paid?: boolean
          payment_date?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      das_expenses: {
        Row: {
          created_at: string
          due_date: string
          id: string
          month: string
          paid: boolean
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          month: string
          paid?: boolean
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          month?: string
          paid?: boolean
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          employee_id: string
          file_name: string
          id: string
          type: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          employee_id: string
          file_name?: string
          id?: string
          type: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          employee_id?: string
          file_name?: string
          id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          admission_date: string
          cpf: string
          created_at: string
          gross_salary: number
          id: string
          name: string
          phone: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          admission_date: string
          cpf?: string
          created_at?: string
          gross_salary?: number
          id?: string
          name: string
          phone?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admission_date?: string
          cpf?: string
          created_at?: string
          gross_salary?: number
          id?: string
          name?: string
          phone?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      epi_deliveries: {
        Row: {
          created_at: string
          delivery_date: string
          employee_id: string
          epi_type: string
          file_name: string
          id: string
          notes: string
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string
          delivery_date: string
          employee_id: string
          epi_type: string
          file_name?: string
          id?: string
          notes?: string
          quantity?: number
          unit?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          employee_id?: string
          epi_type?: string
          file_name?: string
          id?: string
          notes?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_deliveries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          notes: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          notes?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          notes?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          number: number
          percent_executed: number
          project_id: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          description?: string
          id?: string
          number: number
          percent_executed?: number
          project_id: string
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          number?: number
          percent_executed?: number
          project_id?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      outsourced_services: {
        Row: {
          cnpj: string
          company: string
          created_at: string
          date: string
          description: string
          file_name: string
          id: string
          invoice_number: string
          project_id: string
          value: number
        }
        Insert: {
          cnpj?: string
          company: string
          created_at?: string
          date: string
          description?: string
          file_name?: string
          id?: string
          invoice_number?: string
          project_id: string
          value?: number
        }
        Update: {
          cnpj?: string
          company?: string
          created_at?: string
          date?: string
          description?: string
          file_name?: string
          id?: string
          invoice_number?: string
          project_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "outsourced_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_charges: {
        Row: {
          created_at: string
          due_date: string | null
          employee_id: string
          fgts_value: number
          id: string
          inss_value: number
          month: string
          paid: boolean
          paid_value: number
          payment_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          employee_id: string
          fgts_value?: number
          id?: string
          inss_value?: number
          month: string
          paid?: boolean
          paid_value?: number
          payment_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          employee_id?: string
          fgts_value?: number
          id?: string
          inss_value?: number
          month?: string
          paid?: boolean
          paid_value?: number
          payment_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_charges_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          description: string
          doc_notes: string
          document_date: string
          expiry_date: string | null
          file_name: string
          id: string
          payment_date: string | null
          payment_status: string
          project_id: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string
          doc_notes?: string
          document_date: string
          expiry_date?: string | null
          file_name?: string
          id?: string
          payment_date?: string | null
          payment_status?: string
          project_id: string
          type: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string
          doc_notes?: string
          document_date?: string
          expiry_date?: string | null
          file_name?: string
          id?: string
          payment_date?: string | null
          payment_status?: string
          project_id?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_purchases: {
        Row: {
          created_at: string
          date: string
          description: string
          freight_value: number
          icms_value: number
          id: string
          invoice_number: string
          material_id: string | null
          notes: string
          project_id: string
          supplier_id: string | null
          total_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string
          freight_value?: number
          icms_value?: number
          id?: string
          invoice_number?: string
          material_id?: string | null
          notes?: string
          project_id: string
          supplier_id?: string | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          freight_value?: number
          icms_value?: number
          id?: string
          invoice_number?: string
          material_id?: string | null
          notes?: string
          project_id?: string
          supplier_id?: string | null
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_purchases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          city: string
          client: string
          contract_value: number
          created_at: string
          expected_end_date: string
          id: string
          name: string
          notes: string
          responsible: string
          start_date: string
          updated_at: string
        }
        Insert: {
          address?: string
          city?: string
          client?: string
          contract_value?: number
          created_at?: string
          expected_end_date: string
          id?: string
          name: string
          notes?: string
          responsible?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          client?: string
          contract_value?: number
          created_at?: string
          expected_end_date?: string
          id?: string
          name?: string
          notes?: string
          responsible?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          city: string
          created_at: string
          date: string
          final_price: number
          id: string
          invoice_number: string
          material_id: string | null
          quantity: number
          supplier_id: string | null
          tax_type: string
          tax_value: number
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          date: string
          final_price?: number
          id?: string
          invoice_number?: string
          material_id?: string | null
          quantity?: number
          supplier_id?: string | null
          tax_type?: string
          tax_value?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          date?: string
          final_price?: number
          id?: string
          invoice_number?: string
          material_id?: string | null
          quantity?: number
          supplier_id?: string | null
          tax_type?: string
          tax_value?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
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
      salary_advances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          month: string
          payment_date: string
          value: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          month: string
          payment_date: string
          value?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          month?: string
          payment_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          advance_discount: number
          created_at: string
          employee_id: string
          gross_salary: number
          id: string
          month: string
          net_salary: number
          other_additions: number
          other_discounts: number
          payment_date: string
        }
        Insert: {
          advance_discount?: number
          created_at?: string
          employee_id: string
          gross_salary?: number
          id?: string
          month: string
          net_salary?: number
          other_additions?: number
          other_discounts?: number
          payment_date: string
        }
        Update: {
          advance_discount?: number
          created_at?: string
          employee_id?: string
          gross_salary?: number
          id?: string
          month?: string
          net_salary?: number
          other_additions?: number
          other_discounts?: number
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string
          cnpj: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          cnpj?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          cnpj?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      trainings: {
        Row: {
          created_at: string
          employee_id: string
          expiry_date: string
          file_name: string
          id: string
          training_date: string
          training_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          expiry_date: string
          file_name?: string
          id?: string
          training_date: string
          training_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          expiry_date?: string
          file_name?: string
          id?: string
          training_date?: string
          training_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      vacations: {
        Row: {
          bonus_value: number
          created_at: string
          employee_id: string
          end_date: string
          id: string
          notes: string
          payment_date: string | null
          start_date: string
          status: string
          total_paid: number
          updated_at: string
          vacation_value: number
        }
        Insert: {
          bonus_value?: number
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          notes?: string
          payment_date?: string | null
          start_date: string
          status?: string
          total_paid?: number
          updated_at?: string
          vacation_value?: number
        }
        Update: {
          bonus_value?: number
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string
          payment_date?: string | null
          start_date?: string
          status?: string
          total_paid?: number
          updated_at?: string
          vacation_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_allocations: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          id: string
          interior: boolean
          project_id: string
          worked: boolean
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          id?: string
          interior?: boolean
          project_id: string
          worked?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          interior?: boolean
          project_id?: string
          worked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "work_allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      work_days: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          id: string
          interior: boolean
          meal_voucher_value: number
          worked: boolean
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          id?: string
          interior?: boolean
          meal_voucher_value?: number
          worked?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          interior?: boolean
          meal_voucher_value?: number
          worked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "work_days_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
    Enums: {},
  },
} as const
