DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated can read user_roles" ON public.user_roles;

CREATE POLICY "Users read own profile or admins read all" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users read own role or admins read all" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Role scoped private attachment read" ON storage.objects;
CREATE POLICY "Role scoped private attachment read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments-private' AND
  (public.is_admin(auth.uid()) OR
   (public.has_role(auth.uid(), 'seguranca_docs') AND
    (storage.foldername(name))[1] IN ('employee_doc', 'epi', 'aso', 'training'))) AND
  EXISTS (SELECT 1 FROM public.attachments a
          WHERE a.storage_bucket = bucket_id AND a.storage_path = name)
);
