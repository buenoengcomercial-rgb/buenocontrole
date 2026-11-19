-- Limit attachment metadata and private files to the app roles that use them.
DROP POLICY IF EXISTS "Authenticated can read attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated can insert attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated can update attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated can delete attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated users can insert attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated users can update attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON public.attachments;

CREATE POLICY "Role scoped attachment read" ON public.attachments
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  (public.has_role(auth.uid(), 'seguranca_docs') AND entity_type IN ('employee_doc', 'epi', 'aso', 'training'))
);

CREATE POLICY "Role scoped attachment insert" ON public.attachments
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR
  (public.has_role(auth.uid(), 'seguranca_docs') AND entity_type IN ('employee_doc', 'epi', 'aso', 'training'))
);

CREATE POLICY "Role scoped attachment update" ON public.attachments
FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  (public.has_role(auth.uid(), 'seguranca_docs') AND entity_type IN ('employee_doc', 'epi', 'aso', 'training'))
)
WITH CHECK (
  public.is_admin(auth.uid()) OR
  (public.has_role(auth.uid(), 'seguranca_docs') AND entity_type IN ('employee_doc', 'epi', 'aso', 'training'))
);

CREATE POLICY "Role scoped attachment delete" ON public.attachments
FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  (public.has_role(auth.uid(), 'seguranca_docs') AND entity_type IN ('employee_doc', 'epi', 'aso', 'training'))
);

DROP POLICY IF EXISTS "Authenticated users can read private attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert private attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update private attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete private attachments" ON storage.objects;

CREATE POLICY "Role scoped private attachment read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments-private' AND
  EXISTS (
    SELECT 1 FROM public.attachments a
    WHERE a.storage_bucket = bucket_id AND a.storage_path = name
  )
);

CREATE POLICY "Role scoped private attachment insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments-private' AND
  (
    public.is_admin(auth.uid()) OR
    (public.has_role(auth.uid(), 'seguranca_docs') AND
     (storage.foldername(name))[1] IN ('employee_doc', 'epi', 'aso', 'training'))
  )
);

CREATE POLICY "Role scoped private attachment delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments-private' AND
  (
    public.is_admin(auth.uid()) OR
    (public.has_role(auth.uid(), 'seguranca_docs') AND
     (storage.foldername(name))[1] IN ('employee_doc', 'epi', 'aso', 'training') AND
     EXISTS (
       SELECT 1 FROM public.attachments a
       WHERE a.storage_bucket = bucket_id AND a.storage_path = name
     ))
  )
);
