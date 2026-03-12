
ALTER TABLE public.work_days
  ADD COLUMN absence_type text NOT NULL DEFAULT '',
  ADD COLUMN absence_reason text NOT NULL DEFAULT '',
  ADD COLUMN absence_notes text NOT NULL DEFAULT '';
