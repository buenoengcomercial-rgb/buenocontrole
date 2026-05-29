DROP POLICY IF EXISTS "Authenticated can insert billings" ON public.energisa_billings;
DROP POLICY IF EXISTS "Authenticated can update billings" ON public.energisa_billings;
DROP POLICY IF EXISTS "Authenticated can delete billings" ON public.energisa_billings;
DROP POLICY IF EXISTS "Authenticated can view billings" ON public.energisa_billings;

CREATE POLICY "Authenticated can view billings" ON public.energisa_billings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert billings" ON public.energisa_billings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update billings" ON public.energisa_billings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete billings" ON public.energisa_billings FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.energisa_billings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energisa_billings TO authenticated;
GRANT ALL ON public.energisa_billings TO service_role;

DROP POLICY IF EXISTS "Authenticated can insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);