
ALTER TABLE public.energisa_billings
  ADD COLUMN IF NOT EXISTS sent_date date,
  ADD COLUMN IF NOT EXISTS verification_deadline date,
  ADD COLUMN IF NOT EXISTS return_received boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_date date,
  ADD COLUMN IF NOT EXISTS invoice_issued boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_date date;
