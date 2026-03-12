ALTER TABLE public.salary_payments ADD COLUMN payment_method text NOT NULL DEFAULT '';
ALTER TABLE public.salary_payments ADD COLUMN notes text NOT NULL DEFAULT '';