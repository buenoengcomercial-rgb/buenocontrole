
-- Utility: update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update suppliers" ON public.suppliers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete suppliers" ON public.suppliers FOR DELETE USING (true);
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Materials
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Anyone can insert materials" ON public.materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update materials" ON public.materials FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete materials" ON public.materials FOR DELETE USING (true);
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Purchases
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  invoice_number TEXT NOT NULL DEFAULT '',
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  tax_type TEXT NOT NULL DEFAULT '',
  tax_value NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  city TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read purchases" ON public.purchases FOR SELECT USING (true);
CREATE POLICY "Anyone can insert purchases" ON public.purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update purchases" ON public.purchases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete purchases" ON public.purchases FOR DELETE USING (true);
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Employees
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  admission_date DATE NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'desligado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Anyone can insert employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update employees" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete employees" ON public.employees FOR DELETE USING (true);
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Work Days
CREATE TABLE public.work_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  worked BOOLEAN NOT NULL DEFAULT true,
  interior BOOLEAN NOT NULL DEFAULT false,
  meal_voucher_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read work_days" ON public.work_days FOR SELECT USING (true);
CREATE POLICY "Anyone can insert work_days" ON public.work_days FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update work_days" ON public.work_days FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete work_days" ON public.work_days FOR DELETE USING (true);

-- 6. Salary Advances
CREATE TABLE public.salary_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salary_advances" ON public.salary_advances FOR SELECT USING (true);
CREATE POLICY "Anyone can insert salary_advances" ON public.salary_advances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update salary_advances" ON public.salary_advances FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete salary_advances" ON public.salary_advances FOR DELETE USING (true);

-- 7. Salary Payments
CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  advance_discount NUMERIC NOT NULL DEFAULT 0,
  other_discounts NUMERIC NOT NULL DEFAULT 0,
  other_additions NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salary_payments" ON public.salary_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert salary_payments" ON public.salary_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update salary_payments" ON public.salary_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete salary_payments" ON public.salary_payments FOR DELETE USING (true);

-- 8. Payroll Charges
CREATE TABLE public.payroll_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  inss_value NUMERIC NOT NULL DEFAULT 0,
  fgts_value NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_value NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read payroll_charges" ON public.payroll_charges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payroll_charges" ON public.payroll_charges FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payroll_charges" ON public.payroll_charges FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete payroll_charges" ON public.payroll_charges FOR DELETE USING (true);
CREATE TRIGGER update_payroll_charges_updated_at BEFORE UPDATE ON public.payroll_charges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Vacations
CREATE TABLE public.vacations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_ferias' CHECK (status IN ('em_ferias', 'concluidas')),
  vacation_value NUMERIC NOT NULL DEFAULT 0,
  bonus_value NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vacations" ON public.vacations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert vacations" ON public.vacations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update vacations" ON public.vacations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete vacations" ON public.vacations FOR DELETE USING (true);
CREATE TRIGGER update_vacations_updated_at BEFORE UPDATE ON public.vacations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Employee Documents
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('integracao', 'contratacao', 'ficha_epi')),
  completed BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read employee_documents" ON public.employee_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert employee_documents" ON public.employee_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update employee_documents" ON public.employee_documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete employee_documents" ON public.employee_documents FOR DELETE USING (true);
CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON public.employee_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. EPI Deliveries
CREATE TABLE public.epi_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  epi_type TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  delivery_date DATE NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.epi_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read epi_deliveries" ON public.epi_deliveries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert epi_deliveries" ON public.epi_deliveries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete epi_deliveries" ON public.epi_deliveries FOR DELETE USING (true);

-- 12. ASOs
CREATE TABLE public.asos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('admissional', 'periodico', 'retorno', 'demissional')),
  exam_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read asos" ON public.asos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert asos" ON public.asos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update asos" ON public.asos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete asos" ON public.asos FOR DELETE USING (true);
CREATE TRIGGER update_asos_updated_at BEFORE UPDATE ON public.asos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Trainings
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  training_type TEXT NOT NULL,
  training_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trainings" ON public.trainings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trainings" ON public.trainings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update trainings" ON public.trainings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete trainings" ON public.trainings FOR DELETE USING (true);
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  responsible TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  expected_end_date DATE NOT NULL,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete projects" ON public.projects FOR DELETE USING (true);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Work Allocations
CREATE TABLE public.work_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  worked BOOLEAN NOT NULL DEFAULT true,
  interior BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read work_allocations" ON public.work_allocations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert work_allocations" ON public.work_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete work_allocations" ON public.work_allocations FOR DELETE USING (true);

-- 16. Outsourced Services
CREATE TABLE public.outsourced_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  company TEXT NOT NULL,
  cnpj TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  value NUMERIC NOT NULL DEFAULT 0,
  invoice_number TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outsourced_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read outsourced_services" ON public.outsourced_services FOR SELECT USING (true);
CREATE POLICY "Anyone can insert outsourced_services" ON public.outsourced_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete outsourced_services" ON public.outsourced_services FOR DELETE USING (true);

-- 17. Project Documents
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  document_date DATE NOT NULL,
  expiry_date DATE,
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read project_documents" ON public.project_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project_documents" ON public.project_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project_documents" ON public.project_documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete project_documents" ON public.project_documents FOR DELETE USING (true);
CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON public.project_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. Measurements
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  value NUMERIC NOT NULL DEFAULT 0,
  percent_executed NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'aprovada', 'paga')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read measurements" ON public.measurements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert measurements" ON public.measurements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update measurements" ON public.measurements FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete measurements" ON public.measurements FOR DELETE USING (true);
CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON public.measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. DAS Expenses
CREATE TABLE public.das_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  due_date DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.das_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read das_expenses" ON public.das_expenses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert das_expenses" ON public.das_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update das_expenses" ON public.das_expenses FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete das_expenses" ON public.das_expenses FOR DELETE USING (true);
CREATE TRIGGER update_das_expenses_updated_at BEFORE UPDATE ON public.das_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20. Attachments
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  file_data TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read attachments" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attachments" ON public.attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete attachments" ON public.attachments FOR DELETE USING (true);
CREATE INDEX idx_attachments_entity ON public.attachments (entity_type, entity_id);

-- Enable pg_cron and pg_net for scheduled reminders
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
