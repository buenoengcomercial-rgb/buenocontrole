
-- Table for bid/contract items (from the licitação spreadsheet)
CREATE TABLE public.bid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NOT NULL,
  unit text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  bid_unit_price numeric NOT NULL DEFAULT 0,
  bid_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bid_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bid_items" ON public.bid_items FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert bid_items" ON public.bid_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update bid_items" ON public.bid_items FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete bid_items" ON public.bid_items FOR DELETE TO public USING (true);

-- Table for price quotes from suppliers per project
CREATE TABLE public.price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bid_item_id uuid NOT NULL REFERENCES public.bid_items(id) ON DELETE CASCADE,
  supplier_name text NOT NULL DEFAULT '',
  quoted_price numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price_quotes" ON public.price_quotes FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert price_quotes" ON public.price_quotes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update price_quotes" ON public.price_quotes FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete price_quotes" ON public.price_quotes FOR DELETE TO public USING (true);
