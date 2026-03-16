
CREATE TABLE public.employee_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'advertência',
  reason TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read employee_warnings" ON public.employee_warnings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert employee_warnings" ON public.employee_warnings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update employee_warnings" ON public.employee_warnings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete employee_warnings" ON public.employee_warnings FOR DELETE USING (true);
