-- Apuracoes informadas pelo usuario para a semana de 23 a 27/11/2026.
-- Os totais diarios ja refletem a marmita; nao somar alimentacao novamente.
WITH entries(worker_name, period_start, period_end, work_days, labor_amount, notes, source_key) AS (
  VALUES
    (
      'Cauã', '2026-11-24'::date, '2026-11-26'::date,
      '[{"date":"2026-11-24","hours":9,"amount":112.50,"mealTaken":true,"note":"Pegou marmita"},{"date":"2026-11-25","hours":9,"amount":134.50,"mealTaken":false,"note":"Não pegou marmita"},{"date":"2026-11-26","hours":8,"amount":122.00,"mealTaken":false,"note":"Não pegou marmita"}]'::jsonb,
      369.00, 'Total pago informado pelo usuário. Data da transferência e comprovante pendentes.',
      'diarista-202611-caua-24-26'
    ),
    (
      'Gustavo', '2026-11-23'::date, '2026-11-27'::date,
      '[{"date":"2026-11-23","hours":9,"amount":132.50,"mealTaken":false,"note":"Não pegou marmita"},{"date":"2026-11-25","hours":9,"amount":132.50,"mealTaken":false,"note":"Não pegou marmita"},{"date":"2026-11-26","hours":9,"amount":112.50,"mealTaken":true,"note":"Pegou marmita"},{"date":"2026-11-27","hours":8,"amount":120.00,"mealTaken":false,"note":"Não pegou marmita"}]'::jsonb,
      497.50, 'Total pago informado pelo usuário. Data da transferência e comprovante pendentes.',
      'diarista-202611-gustavo-23-27'
    ),
    (
      'Antônio', '2026-11-23'::date, '2026-11-26'::date,
      '[{"date":"2026-11-23","hours":8,"mealTaken":false,"note":"Não pegou marmita"},{"date":"2026-11-24","hours":8,"mealTaken":false,"note":"Não pegou marmita"},{"date":"2026-11-25","hours":8,"mealTaken":false,"note":"Não pegou marmita"},{"date":"2026-11-26","hours":8,"mealTaken":false,"note":"Não pegou marmita"}]'::jsonb,
      480.00, 'Total da semana pago conforme informado pelo usuário; valores diários não informados. Data da transferência e comprovante pendentes.',
      'diarista-202611-antonio-23-26'
    )
)
INSERT INTO public.daily_worker_settlements
  (worker_name, period_start, period_end, work_days, labor_amount, meal_amount, carry_advance, payments, notes, source_key)
SELECT worker_name, period_start, period_end, work_days, labor_amount, 0, 0,
  jsonb_build_array(jsonb_build_object('date', null, 'amount', labor_amount, 'kind', 'Saldo', 'note', 'Pago conforme informado pelo usuário; data e comprovante pendentes')),
  notes, source_key
FROM entries AS entry
WHERE NOT EXISTS (
  SELECT 1 FROM public.daily_worker_settlements AS existing
  WHERE lower(existing.worker_name) = lower(entry.worker_name)
    AND existing.period_start = entry.period_start
    AND existing.period_end = entry.period_end
)
ON CONFLICT (source_key) DO NOTHING;
