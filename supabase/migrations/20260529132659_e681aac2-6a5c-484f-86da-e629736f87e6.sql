DROP POLICY IF EXISTS "Allow all for authenticated" ON public.obra_materials;
CREATE POLICY "Authenticated can manage obra_materials" ON public.obra_materials FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
REVOKE ALL ON public.obra_materials FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_materials TO authenticated;
GRANT ALL ON public.obra_materials TO service_role;