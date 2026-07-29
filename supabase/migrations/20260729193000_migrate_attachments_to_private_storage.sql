ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_checksum TEXT,
  ADD COLUMN IF NOT EXISTS storage_migrated_at TIMESTAMPTZ;

ALTER TABLE public.attachments
  ALTER COLUMN file_data DROP NOT NULL,
  ALTER COLUMN file_data DROP DEFAULT;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments-private', 'attachments-private', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments-backups-private', 'attachments-backups-private', false, 262144000)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Anyone can read attachments" ON public.attachments;
DROP POLICY IF EXISTS "Anyone can insert attachments" ON public.attachments;
DROP POLICY IF EXISTS "Anyone can update attachments" ON public.attachments;
DROP POLICY IF EXISTS "Anyone can delete attachments" ON public.attachments;

CREATE POLICY "Authenticated users can read attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert attachments"
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update attachments"
ON public.attachments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attachments"
ON public.attachments
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can read private attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert private attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update private attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete private attachments" ON storage.objects;

CREATE POLICY "Authenticated users can read private attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments-private');

CREATE POLICY "Authenticated users can insert private attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments-private');

CREATE POLICY "Authenticated users can update private attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments-private')
WITH CHECK (bucket_id = 'attachments-private');

CREATE POLICY "Authenticated users can delete private attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'attachments-private');

DROP POLICY IF EXISTS "Authenticated users can read attachment backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert attachment backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update attachment backups" ON storage.objects;

CREATE POLICY "Authenticated users can read attachment backups"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments-backups-private');

CREATE POLICY "Authenticated users can insert attachment backups"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments-backups-private');

CREATE POLICY "Authenticated users can update attachment backups"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments-backups-private')
WITH CHECK (bucket_id = 'attachments-backups-private');

DROP POLICY IF EXISTS "Authenticated users can read database export" ON storage.objects;

CREATE POLICY "Authenticated users can read database export"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'database_export_29_07_26');

CREATE INDEX IF NOT EXISTS idx_attachments_storage_path
ON public.attachments (storage_path)
WHERE storage_path IS NOT NULL;
