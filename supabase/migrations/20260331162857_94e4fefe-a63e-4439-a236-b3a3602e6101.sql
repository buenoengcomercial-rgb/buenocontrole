
CREATE TABLE public.outsourced_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outsourced_service_id UUID NOT NULL REFERENCES public.outsourced_services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outsourced_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read outsourced_payments" ON public.outsourced_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert outsourced_payments" ON public.outsourced_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update outsourced_payments" ON public.outsourced_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete outsourced_payments" ON public.outsourced_payments FOR DELETE USING (true);
