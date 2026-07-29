ALTER TABLE public.outsourced_services
  ADD COLUMN IF NOT EXISTS service_category TEXT NOT NULL DEFAULT 'obra';

UPDATE public.outsourced_services
SET service_category = 'obra'
WHERE service_category IS NULL OR service_category = '';

ALTER TABLE public.outsourced_services
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.outsourced_services
  DROP CONSTRAINT IF EXISTS outsourced_services_service_category_check;

ALTER TABLE public.outsourced_services
  ADD CONSTRAINT outsourced_services_service_category_check
  CHECK (service_category IN ('obra', 'avulso', 'projetos', 'emprestimo'));
