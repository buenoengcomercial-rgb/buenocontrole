
-- Purchase comparisons
CREATE TABLE public.purchase_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read purchase_comparisons" ON public.purchase_comparisons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert purchase_comparisons" ON public.purchase_comparisons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update purchase_comparisons" ON public.purchase_comparisons FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete purchase_comparisons" ON public.purchase_comparisons FOR DELETE USING (true);

-- Comparison suppliers
CREATE TABLE public.comparison_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id uuid NOT NULL REFERENCES public.purchase_comparisons(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  delivery_days integer NOT NULL DEFAULT 0,
  rating integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comparison_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comparison_suppliers" ON public.comparison_suppliers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comparison_suppliers" ON public.comparison_suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comparison_suppliers" ON public.comparison_suppliers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete comparison_suppliers" ON public.comparison_suppliers FOR DELETE USING (true);

-- Comparison items
CREATE TABLE public.comparison_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id uuid NOT NULL REFERENCES public.purchase_comparisons(id) ON DELETE CASCADE,
  code text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'UN',
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comparison_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comparison_items" ON public.comparison_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comparison_items" ON public.comparison_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comparison_items" ON public.comparison_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete comparison_items" ON public.comparison_items FOR DELETE USING (true);

-- Item prices per supplier
CREATE TABLE public.comparison_item_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.comparison_items(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.comparison_suppliers(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, supplier_id)
);
ALTER TABLE public.comparison_item_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comparison_item_prices" ON public.comparison_item_prices FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comparison_item_prices" ON public.comparison_item_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comparison_item_prices" ON public.comparison_item_prices FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete comparison_item_prices" ON public.comparison_item_prices FOR DELETE USING (true);

-- Price history
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text NOT NULL DEFAULT '',
  item_description text NOT NULL DEFAULT '',
  supplier_name text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  comparison_id uuid REFERENCES public.purchase_comparisons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read price_history" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert price_history" ON public.price_history FOR INSERT WITH CHECK (true);
