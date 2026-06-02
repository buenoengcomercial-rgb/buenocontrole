
-- 1. Restrict payroll/HR sensitive tables to admins only
DROP POLICY IF EXISTS "Authenticated can read payroll_charges" ON public.payroll_charges;
DROP POLICY IF EXISTS "Authenticated can insert payroll_charges" ON public.payroll_charges;
DROP POLICY IF EXISTS "Authenticated can update payroll_charges" ON public.payroll_charges;
DROP POLICY IF EXISTS "Authenticated can delete payroll_charges" ON public.payroll_charges;
CREATE POLICY "Admins can read payroll_charges" ON public.payroll_charges FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert payroll_charges" ON public.payroll_charges FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update payroll_charges" ON public.payroll_charges FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete payroll_charges" ON public.payroll_charges FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read salary_advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Authenticated can insert salary_advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Authenticated can update salary_advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Authenticated can delete salary_advances" ON public.salary_advances;
CREATE POLICY "Admins can read salary_advances" ON public.salary_advances FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert salary_advances" ON public.salary_advances FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update salary_advances" ON public.salary_advances FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete salary_advances" ON public.salary_advances FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Authenticated can insert salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Authenticated can update salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Authenticated can delete salary_payments" ON public.salary_payments;
CREATE POLICY "Admins can read salary_payments" ON public.salary_payments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert salary_payments" ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update salary_payments" ON public.salary_payments FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete salary_payments" ON public.salary_payments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read terminations" ON public.terminations;
DROP POLICY IF EXISTS "Authenticated can insert terminations" ON public.terminations;
DROP POLICY IF EXISTS "Authenticated can update terminations" ON public.terminations;
DROP POLICY IF EXISTS "Authenticated can delete terminations" ON public.terminations;
CREATE POLICY "Admins can read terminations" ON public.terminations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert terminations" ON public.terminations FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update terminations" ON public.terminations FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete terminations" ON public.terminations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 2. Restrict sensitive PII columns: only admins write employees; reads remain for safety/docs flows
DROP POLICY IF EXISTS "Authenticated can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated can update employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated can delete employees" ON public.employees;
CREATE POLICY "Admins can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update employees" ON public.employees FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete employees" ON public.employees FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 3. Lock down audit_log inserts: enforce user_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated can insert audit_log" ON public.audit_log;
CREATE POLICY "Users can insert own audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4. Restrict user_roles SELECT: users can read their own; admins can read all
DROP POLICY IF EXISTS "Authenticated can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read user_roles" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 5. Revoke EXECUTE on email-queue SECURITY DEFINER helpers from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
