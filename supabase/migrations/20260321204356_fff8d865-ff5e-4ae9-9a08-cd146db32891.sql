
ALTER TABLE public.purchase_comparisons 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberta',
  ADD COLUMN IF NOT EXISTS observations text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.obra_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'UN',
  quantity numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  purchase_group text NOT NULL DEFAULT '',
  linked_group_id uuid REFERENCES public.purchase_comparisons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.obra_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
