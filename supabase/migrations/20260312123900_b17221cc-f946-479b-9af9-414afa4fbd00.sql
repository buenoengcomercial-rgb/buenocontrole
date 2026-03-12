
CREATE TABLE public.company_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  inss_value NUMERIC NOT NULL DEFAULT 0,
  fgts_value NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month)
);

ALTER TABLE public.company_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company_charges" ON public.company_charges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert company_charges" ON public.company_charges FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update company_charges" ON public.company_charges FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete company_charges" ON public.company_charges FOR DELETE USING (true);

CREATE TRIGGER update_company_charges_updated_at
  BEFORE UPDATE ON public.company_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
