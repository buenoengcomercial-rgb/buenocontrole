CREATE TABLE public.registered_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.registered_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read registered_suppliers" ON public.registered_suppliers FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert registered_suppliers" ON public.registered_suppliers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete registered_suppliers" ON public.registered_suppliers FOR DELETE TO public USING (true);
