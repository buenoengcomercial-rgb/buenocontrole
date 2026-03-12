
CREATE TABLE public.equipment_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL DEFAULT 'máquina',
  supplier TEXT NOT NULL DEFAULT '',
  billing_type TEXT NOT NULL DEFAULT 'diária',
  unit_value NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  invoice_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read equipment_rentals" ON public.equipment_rentals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert equipment_rentals" ON public.equipment_rentals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update equipment_rentals" ON public.equipment_rentals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete equipment_rentals" ON public.equipment_rentals FOR DELETE USING (true);
