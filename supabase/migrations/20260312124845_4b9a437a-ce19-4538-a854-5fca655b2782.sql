
-- First remove the unique constraint on month
ALTER TABLE public.company_charges DROP CONSTRAINT IF EXISTS company_charges_month_key;

-- Add charge_type and value columns
ALTER TABLE public.company_charges ADD COLUMN charge_type TEXT NOT NULL DEFAULT 'INSS';
ALTER TABLE public.company_charges ADD COLUMN value NUMERIC NOT NULL DEFAULT 0;

-- Set value = inss_value for existing INSS records
UPDATE public.company_charges SET value = inss_value WHERE charge_type = 'INSS';

-- Migrate existing data: create FGTS records from existing rows that have fgts_value > 0
INSERT INTO public.company_charges (month, charge_type, value, due_date, payment_date, paid, notes)
SELECT month, 'FGTS', fgts_value, due_date, payment_date, paid, notes
FROM public.company_charges
WHERE fgts_value > 0;

-- Drop old columns
ALTER TABLE public.company_charges DROP COLUMN inss_value;
ALTER TABLE public.company_charges DROP COLUMN fgts_value;
