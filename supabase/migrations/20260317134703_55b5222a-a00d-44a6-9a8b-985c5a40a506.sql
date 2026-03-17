ALTER TABLE public.project_purchases 
ADD COLUMN payment_method text NOT NULL DEFAULT '',
ADD COLUMN installments integer NOT NULL DEFAULT 1;