-- Bank receipts supplied on 20/11/2026 for CNPJ 39.973.085/0001-20.
-- Payment dates below are transaction dates, not receipt export dates.
DO $migration$
DECLARE
  item record;
  matched_employee uuid;
  employee_count integer;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('%RAIMUNDO%LEONEL%', '2026-11-08'::date, 210.00::numeric, 'Adiantamento salarial; comprovante BB 110901 (ADIANTA 1.jpeg)', '110901'),
      ('%RAIMUNDO%LEONEL%', '2026-11-20'::date, 1000.00::numeric, 'Adiantamento salarial; comprovante BB 112302 (ADIANTA 2.jpeg)', '112302'),
      ('%RAIMUNDO%LEONEL%', '2026-11-05'::date, 44.00::numeric, 'Alimentação: comprovante BB 110508 (ALIMENTA 1.jpeg)', '110508'),
      ('%RAIMUNDO%LEONEL%', '2026-11-14'::date, 110.00::numeric, 'Alimentação: comprovante BB 111602 (ALIMENTA 3.jpeg)', '111602'),
      ('%RAIMUNDO%LEONEL%', '2026-11-20'::date, 88.00::numeric, 'Alimentação: comprovante BB 112303 (ALIMENTA 6.jpeg)', '112303'),
      ('%FAGNER%COSTA%FERREIRA%', '2026-11-05'::date, 44.00::numeric, 'Alimentação: comprovante BB 110509 (ALIMENTA 4.jpeg)', '110509'),
      ('%FAGNER%COSTA%FERREIRA%', '2026-11-17'::date, 88.00::numeric, 'Alimentação: comprovante BB 111706 (ALIMENTA 5.jpeg)', '111706')
    ) AS receipts(employee_pattern, paid_on, amount, description, bank_document)
  LOOP
    SELECT count(*), min(id) INTO employee_count, matched_employee
    FROM public.employees WHERE name ILIKE item.employee_pattern;
    IF employee_count <> 1 THEN
      RAISE EXCEPTION 'Expected one employee matching %, found %', item.employee_pattern, employee_count;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.salary_advances
      WHERE employee_id = matched_employee
        AND payment_date = item.paid_on
        AND value = item.amount
        AND notes LIKE '%' || item.bank_document || '%'
    ) THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.salary_advances
      WHERE employee_id = matched_employee
        AND payment_date = item.paid_on
        AND value = item.amount
    ) THEN
      RAISE EXCEPTION 'Possible duplicate for employee %, date %, amount %; check BB document %',
        matched_employee, item.paid_on, item.amount, item.bank_document;
    END IF;

    INSERT INTO public.salary_advances (employee_id, month, value, payment_date, notes)
    VALUES (matched_employee, '2026-11', item.amount, item.paid_on, item.description);
  END LOOP;
END
$migration$;
