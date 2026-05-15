ALTER TABLE public.project_purchases 
  ADD COLUMN IF NOT EXISTS freight_payment_date date,
  ADD COLUMN IF NOT EXISTS icms_payment_date date;