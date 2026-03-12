ALTER TABLE public.project_documents
  ADD COLUMN value numeric NOT NULL DEFAULT 0,
  ADD COLUMN payment_date date,
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN doc_notes text NOT NULL DEFAULT '';