CREATE TABLE public.partner_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  month TEXT NOT NULL CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
  net_amount NUMERIC NOT NULL CHECK (net_amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  replaces_salary_payment_id UUID UNIQUE REFERENCES public.salary_payments(id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cpf, month)
);

ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read partner_payments" ON public.partner_payments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert partner_payments" ON public.partner_payments FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update partner_payments" ON public.partner_payments FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete partner_payments" ON public.partner_payments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
