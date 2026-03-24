ALTER TABLE public.project_purchases ADD COLUMN quantity numeric NOT NULL DEFAULT 1;
ALTER TABLE public.project_purchases ADD COLUMN unit_price numeric NOT NULL DEFAULT 0;