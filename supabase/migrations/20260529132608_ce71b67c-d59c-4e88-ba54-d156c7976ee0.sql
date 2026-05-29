DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'asos','attachments','bid_items','company_charges','comparison_item_prices',
    'comparison_items','comparison_suppliers','das_expenses','employee_documents',
    'employee_warnings','employees','energisa_contract_items','energisa_service_records',
    'epi_deliveries','equipment_rentals','laudos','materials','measurements',
    'outsourced_payments','outsourced_services','payroll_charges','price_history',
    'price_quotes','project_documents','project_purchases','projects',
    'purchase_comparisons','purchases','registered_suppliers','salary_advances',
    'salary_payments','suppliers','terminations','trainings','vacations',
    'work_allocations','work_days'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can read %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can delete %1$s" ON public.%1$I', t);

    EXECUTE format($p$CREATE POLICY "Authenticated can read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)$p$, t);
    EXECUTE format($p$CREATE POLICY "Authenticated can insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)$p$, t);
    EXECUTE format($p$CREATE POLICY "Authenticated can update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)$p$, t);
    EXECUTE format($p$CREATE POLICY "Authenticated can delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)$p$, t);

    EXECUTE format('REVOKE ALL ON public.%1$I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%1$I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%1$I TO service_role', t);
  END LOOP;
END$$;

ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;