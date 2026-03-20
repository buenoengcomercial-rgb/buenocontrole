
-- Contract items table (stores the Energisa contract line items)
CREATE TABLE public.energisa_contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text NOT NULL,
  category text NOT NULL DEFAULT '',
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'UN',
  material_unit_value numeric NOT NULL DEFAULT 0,
  labor_unit_value numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.energisa_contract_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read energisa_contract_items" ON public.energisa_contract_items FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert energisa_contract_items" ON public.energisa_contract_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update energisa_contract_items" ON public.energisa_contract_items FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete energisa_contract_items" ON public.energisa_contract_items FOR DELETE TO public USING (true);

-- Service records table (tracks executed services per unit)
CREATE TABLE public.energisa_service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_item_id uuid NOT NULL REFERENCES public.energisa_contract_items(id) ON DELETE CASCADE,
  laudo_id uuid NOT NULL REFERENCES public.laudos(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  date date NOT NULL,
  month text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.energisa_service_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read energisa_service_records" ON public.energisa_service_records FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert energisa_service_records" ON public.energisa_service_records FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update energisa_service_records" ON public.energisa_service_records FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete energisa_service_records" ON public.energisa_service_records FOR DELETE TO public USING (true);
