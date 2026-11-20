ALTER TABLE public.company_charges
  ADD COLUMN IF NOT EXISTS payer_cnpj text NOT NULL DEFAULT '39973085000120',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS source_document_id text,
  ADD COLUMN IF NOT EXISTS document_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS document_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS document_hash text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'A confirmar';

CREATE UNIQUE INDEX IF NOT EXISTS company_charges_nibo_document_id_key
  ON public.company_charges (source_document_id)
  WHERE source = 'Nibo Empresa' AND source_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS company_charges_payer_month_idx
  ON public.company_charges (payer_cnpj, month);
