
CREATE TABLE public.energisa_billings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_number INT NOT NULL,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_value NUMERIC NOT NULL DEFAULT 0,
  material_value NUMERIC NOT NULL DEFAULT 0,
  labor_value NUMERIC NOT NULL DEFAULT 0,
  records_count INT NOT NULL DEFAULT 0,
  snapshot JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.energisa_service_records ADD COLUMN billing_id UUID REFERENCES public.energisa_billings(id) ON DELETE SET NULL;

ALTER TABLE public.energisa_billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view billings" ON public.energisa_billings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert billings" ON public.energisa_billings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update billings" ON public.energisa_billings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete billings" ON public.energisa_billings FOR DELETE TO authenticated USING (true);
