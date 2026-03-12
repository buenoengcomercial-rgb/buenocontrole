
CREATE TABLE public.project_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  invoice_number TEXT NOT NULL DEFAULT '',
  total_value NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read project_purchases" ON public.project_purchases FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project_purchases" ON public.project_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project_purchases" ON public.project_purchases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete project_purchases" ON public.project_purchases FOR DELETE USING (true);

CREATE TRIGGER update_project_purchases_updated_at
  BEFORE UPDATE ON public.project_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
