ALTER TABLE public.project_purchases ADD COLUMN freight_value NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.project_purchases ADD COLUMN icms_value NUMERIC NOT NULL DEFAULT 0;