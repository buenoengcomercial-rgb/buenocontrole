CREATE TABLE public.terminations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  termination_date date NOT NULL,
  payment_date date,
  value numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.terminations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read terminations" ON public.terminations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert terminations" ON public.terminations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update terminations" ON public.terminations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete terminations" ON public.terminations FOR DELETE USING (true);