
CREATE TABLE public.laudos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente TEXT NOT NULL,
  responsavel TEXT NOT NULL DEFAULT '',
  municipio TEXT NOT NULL DEFAULT '',
  cnpj TEXT NOT NULL DEFAULT '',
  sat TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  numero_projetos TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  distrito TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  utilizacao TEXT NOT NULL DEFAULT '',
  setor_atendimento TEXT NOT NULL DEFAULT '',
  data_vencimento DATE,
  observacoes TEXT NOT NULL DEFAULT '',
  status_cbm TEXT NOT NULL DEFAULT '',
  status_bueno TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read laudos" ON public.laudos FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert laudos" ON public.laudos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update laudos" ON public.laudos FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete laudos" ON public.laudos FOR DELETE TO public USING (true);
